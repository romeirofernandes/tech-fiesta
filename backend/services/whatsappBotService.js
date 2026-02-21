/**
 * PashuPalak WhatsApp Bot Service
 *
 * Commands: 1-login, 2-add animal (text/image/voice), 3-my animals, 4-logout, help, 0-cancel
 */

const twilio = require('twilio');
const axios = require('axios');
const Groq = require('groq-sdk');
const WhatsappUser = require('../models/WhatsappUser');
const Animal = require('../models/Animal');
const Farm = require('../models/Farm');
const Farmer = require('../models/Farmer');
const cloudinary = require('../config/cloudinary');
const { analyzeAnimalImage } = require('./geminiAnimalService');
const stream = require('stream');

// ─── Clients ─────────────────────────────────────────────

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// ─── In-memory state ──────────────────────────────────────

const conversations = new Map();

function getConvo(chatId) { return conversations.get(chatId) || null; }
function setConvo(chatId, state) { conversations.set(chatId, state); }
function clearConvo(chatId) { conversations.delete(chatId); }

// ─── Text normalization ───────────────────────────────────

/** Lowercase, strip punctuation, collapse whitespace */
function norm(text) {
  return (text || '').toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}
/** Match against known aliases (ignoring spaces) */
function is(text, ...patterns) {
  return patterns.some(p => text === p || text.replace(/\s/g, '') === p.replace(/\s/g, ''));
}

// ─── Constants ────────────────────────────────────────────

const HELP_MENU = `*PashuPalak Bot*

Commands:
*1* or *login* - Login to your account
*2* or *add animal* - Add a new animal
*3* or *my animals* - View your animals
*4* or *logout* - Logout
*help* - Show this menu
*0* or *cancel* - Cancel current operation`;

const LOGIN_REQUIRED = `You need to login first. Send *1* or *login* to get started.`;

const ADD_METHOD_MENU = `*Add Animal* - Choose how to add:

*1* - Step by step (text form)
*2* - Send a photo (AI detects details)
*3* - Voice note (say the details aloud)
*0* - Cancel`;

const VOICE_GUIDE = `Send a voice note saying:

"My animal's name is [name]. It is a [species] of [breed] breed. It is [male/female] aged about [number] [months/years] old."

Example: "My animal's name is Ganga. It is a cow of Gir breed. It is female aged about 24 months old."

Send your voice note now.`;

const SPECIES_VALID = ['cow', 'buffalo', 'goat', 'sheep', 'chicken', 'pig', 'horse', 'other'];

// ─── Messaging ────────────────────────────────────────────

async function sendMessage(to, body) {
  if (!twilioClient) {
    console.log('[WA Bot] Twilio not configured, skipping message to', to);
    return;
  }
  try {
    await twilioClient.messages.create({ body, from: fromNumber, to });
  } catch (err) {
    console.error('[WA Bot] sendMessage error:', err.message);
  }
}

// ─── Helpers ─────────────────────────────────────────────

function generateRfid() {
  return 'WA-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isAudio(ct) { return ct && ct.startsWith('audio/'); }
function isImage(ct) { return ct && ct.startsWith('image/'); }

async function downloadMedia(mediaUrl, contentType) {
  const response = await axios.get(mediaUrl, {
    auth: { username: accountSid, password: authToken },
    responseType: 'arraybuffer',
  });
  return {
    buffer: Buffer.from(response.data),
    mimeType: contentType || response.headers['content-type'] || 'application/octet-stream',
  };
}

async function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const bufStream = new stream.PassThrough();
    bufStream.end(buffer);
    const up = cloudinary.uploader.upload_stream({ folder: 'animals', resource_type: 'image' },
      (err, result) => err ? reject(err) : resolve(result));
    bufStream.pipe(up);
  });
}

async function createAnimalFromData(waUser, data) {
  const farmer = await Farmer.findById(waUser.mongo_id);
  if (!farmer) throw new Error('Farmer account not found');
  let farmId = (farmer.farms && farmer.farms.length > 0)
    ? farmer.farms[0]
    : (await Farm.findOne())?._id;
  if (!farmId) throw new Error('No farms found. Please create a farm on the web app first.');
  const rfid = generateRfid();
  const animal = new Animal({
    name: data.name, rfid, species: data.species, breed: data.breed,
    gender: data.gender, age: data.age, ageUnit: data.ageUnit || 'months',
    farmId, imageUrl: data.imageUrl || null,
  });
  await animal.save();
  const farm = await Farm.findById(farmId);
  return { animal, farmName: farm?.name || 'Your Farm' };
}

function confirmPrompt(data) {
  return `*Confirm Animal Details*\n\n` +
    `Name: *${data.name}*\nSpecies: ${data.species}\nBreed: ${data.breed}\n` +
    `Gender: ${data.gender}\nAge: ${data.age} ${data.ageUnit}\n\n` +
    `Type *ok* to save or *0* to cancel.`;
}

async function saveAnimal(chatId, data, waUser) {
  try {
    const { animal, farmName } = await createAnimalFromData(waUser, data);
    await sendMessage(chatId,
      `*Animal Added*\n\nName: ${data.name}\nRFID: ${animal.rfid}\n` +
      `Species: ${data.species}\nBreed: ${data.breed}\nGender: ${data.gender}\n` +
      `Age: ${data.age} ${data.ageUnit}\nFarm: ${farmName}\n` +
      `Image: ${data.imageUrl ? 'Uploaded' : 'None'}\n\n` + HELP_MENU
    );
    clearConvo(chatId);
  } catch (err) {
    console.error('[WA saveAnimal]', err.message);
    await sendMessage(chatId, `Error saving animal: ${err.message}\n\nPlease try again.`);
    clearConvo(chatId);
  }
}

// ─── Main Handler ─────────────────────────────────────────

async function handleIncomingMessage(from, body, mediaUrl, mediaContentType) {
  const chatId = from;
  const raw = (body || '').trim();
  const text = norm(raw);

  if (is(text, '0', 'cancel')) {
    clearConvo(chatId);
    await sendMessage(chatId, 'Operation cancelled.\n\n' + HELP_MENU);
    return;
  }

  const convo = getConvo(chatId);
  if (convo) {
    switch (convo.flow) {
      case 'login':
        await handleLoginFlow(chatId, raw, text, convo);
        return;
      case 'add_method':
        await handleAddMethodSelect(chatId, text, convo);
        return;
      case 'add_text': {
        const wu = await WhatsappUser.findOne({ chat_id: chatId, verified: true });
        if (!wu) { clearConvo(chatId); await sendMessage(chatId, LOGIN_REQUIRED); return; }
        await handleAddTextFlow(chatId, text, raw, mediaUrl, mediaContentType, convo, wu);
        return;
      }
      case 'add_image': {
        const wu = await WhatsappUser.findOne({ chat_id: chatId, verified: true });
        if (!wu) { clearConvo(chatId); await sendMessage(chatId, LOGIN_REQUIRED); return; }
        await handleAddImageFlow(chatId, text, mediaUrl, mediaContentType, convo, wu);
        return;
      }
      case 'add_voice': {
        const wu = await WhatsappUser.findOne({ chat_id: chatId, verified: true });
        if (!wu) { clearConvo(chatId); await sendMessage(chatId, LOGIN_REQUIRED); return; }
        await handleAddVoiceFlow(chatId, text, mediaUrl, mediaContentType, convo, wu);
        return;
      }
    }
  }

  // ─── Command routing ──────────────────────────────────

  if (is(text, '1', 'login')) {
    const existing = await WhatsappUser.findOne({ chat_id: chatId, verified: true });
    if (existing) {
      const farmer = await Farmer.findById(existing.mongo_id);
      await sendMessage(chatId, `Already logged in as *${farmer?.fullName || 'User'}*.\n\n` + HELP_MENU);
      return;
    }
    setConvo(chatId, { flow: 'login', step: 'email', data: {} });
    await sendMessage(chatId, '*Login*\n\nPlease send your registered email address.');
    return;
  }

  if (is(text, '2', 'add', 'addanimal', 'add animal')) {
    const waUser = await WhatsappUser.findOne({ chat_id: chatId, verified: true });
    if (!waUser) { await sendMessage(chatId, LOGIN_REQUIRED); return; }
    setConvo(chatId, { flow: 'add_method', step: 'select', data: {} });
    await sendMessage(chatId, ADD_METHOD_MENU);
    return;
  }

  if (is(text, '3', 'animals', 'myanimal', 'myanimals', 'my animals', 'list', 'show animals', 'showanimals')) {
    const waUser = await WhatsappUser.findOne({ chat_id: chatId, verified: true });
    if (!waUser) { await sendMessage(chatId, LOGIN_REQUIRED); return; }
    await handleShowAnimals(chatId, waUser);
    return;
  }

  if (is(text, '4', 'logout', 'log out')) {
    const waUser = await WhatsappUser.findOne({ chat_id: chatId, verified: true });
    if (!waUser) { await sendMessage(chatId, 'You are not logged in.\n\n' + HELP_MENU); return; }
    const farmer = await Farmer.findById(waUser.mongo_id);
    await WhatsappUser.findOneAndDelete({ chat_id: chatId });
    clearConvo(chatId);
    await sendMessage(chatId, `Logged out${farmer?.fullName ? ' (' + farmer.fullName + ')' : ''}. Send *1* to login again.`);
    return;
  }

  if (is(text, 'help', 'hi', 'hello', 'menu', 'start')) {
    const waUser = await WhatsappUser.findOne({ chat_id: chatId, verified: true });
    const farmer = waUser ? await Farmer.findById(waUser.mongo_id) : null;
    await sendMessage(chatId, (farmer ? `Hello ${farmer.fullName}!\n\n` : '') + HELP_MENU);
    return;
  }

  await sendMessage(chatId, `Unknown command.\n\n` + HELP_MENU);
}

// ─── Login flow ───────────────────────────────────────────

async function handleLoginFlow(chatId, raw, text, convo) {
  const { step, data } = convo;

  if (step === 'email') {
    const email = raw.trim().toLowerCase();
    if (!email.includes('@') || !email.includes('.')) {
      await sendMessage(chatId, 'That doesn\'t look like a valid email. Please try again.');
      return;
    }
    const farmer = await Farmer.findOne({ email });
    if (!farmer) {
      await sendMessage(chatId, 'No account found with this email. Please register on the web app first.');
      clearConvo(chatId);
      return;
    }
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await WhatsappUser.findOneAndUpdate(
      { mongo_id: farmer._id },
      { firebase_uid: farmer.firebaseUid, mongo_id: farmer._id, chat_id: chatId, otp, otpExpiresAt, verified: false },
      { upsert: true, new: true }
    );
    data.email = email;
    data.farmerId = farmer._id;
    data.farmerName = farmer.fullName;
    setConvo(chatId, { flow: 'login', step: 'otp', data });
    await sendMessage(chatId, `OTP generated for *${farmer.fullName}*.\n\nOpen the PashuPalak website and go to the WhatsApp page to see your 6-digit code, then type it back here.`);
    return;
  }

  if (step === 'otp') {
    if (!/^\d{6}$/.test(raw.trim())) {
      await sendMessage(chatId, 'Please enter the 6-digit OTP.');
      return;
    }
    const waUser = await WhatsappUser.findOne({ mongo_id: data.farmerId });
    if (!waUser) { await sendMessage(chatId, 'Session expired. Send *1* to try again.'); clearConvo(chatId); return; }
    if (waUser.otp !== raw.trim()) { await sendMessage(chatId, 'Incorrect OTP. Try again or send *0* to cancel.'); return; }
    if (new Date() > waUser.otpExpiresAt) { await sendMessage(chatId, 'OTP expired. Send *1* to login again.'); clearConvo(chatId); return; }
    waUser.verified = true;
    waUser.otp = null;
    waUser.otpExpiresAt = null;
    await waUser.save();
    clearConvo(chatId);
    await sendMessage(chatId, `Logged in as *${data.farmerName}*.\n\n` + HELP_MENU);
    return;
  }
}

// ─── Add Animal: Method selection ────────────────────────

async function handleAddMethodSelect(chatId, text, convo) {
  if (is(text, '1', 'text', 'form', 'step by step', 'stepbystep', 'manual')) {
    setConvo(chatId, { flow: 'add_text', step: 'name', data: {} });
    await sendMessage(chatId, '*Add Animal - Text* (1/6)\n\nWhat is the animal\'s name?');
  } else if (is(text, '2', 'image', 'photo', 'picture', 'scan', 'camera')) {
    setConvo(chatId, { flow: 'add_image', step: 'awaiting_photo', data: {} });
    await sendMessage(chatId, '*Add Animal - Photo*\n\nSend a clear photo of the animal. AI will detect the species, breed, gender and estimate the age.');
  } else if (is(text, '3', 'voice', 'audio', 'speak', 'voicenote', 'voice note')) {
    setConvo(chatId, { flow: 'add_voice', step: 'awaiting_voice', data: {} });
    await sendMessage(chatId, '*Add Animal - Voice*\n\n' + VOICE_GUIDE);
  } else {
    await sendMessage(chatId, 'Please choose:\n\n*1* - Text form\n*2* - Photo\n*3* - Voice note\n\n*0* - Cancel');
  }
}

// ─── Add Animal: Text flow ────────────────────────────────

async function handleAddTextFlow(chatId, text, rawBody, mediaUrl, mediaContentType, convo, waUser) {
  const { step, data } = convo;
  switch (step) {
    case 'name': {
      if (!rawBody.trim()) { await sendMessage(chatId, 'Please enter a name.'); return; }
      data.name = rawBody.trim();
      setConvo(chatId, { flow: 'add_text', step: 'species', data });
      await sendMessage(chatId, `Name: *${data.name}*\n\n(2/6) What species?\n${SPECIES_VALID.join(', ')}`);
      break;
    }
    case 'species': {
      if (!SPECIES_VALID.includes(text.trim())) {
        await sendMessage(chatId, `Please choose a valid species:\n${SPECIES_VALID.join(', ')}`);
        return;
      }
      data.species = text.trim();
      setConvo(chatId, { flow: 'add_text', step: 'breed', data });
      await sendMessage(chatId, `Species: *${data.species}*\n\n(3/6) What breed? (e.g. Gir, HF, Murrah, Sahiwal)`);
      break;
    }
    case 'breed': {
      if (!rawBody.trim()) { await sendMessage(chatId, 'Please enter a breed.'); return; }
      data.breed = rawBody.trim();
      setConvo(chatId, { flow: 'add_text', step: 'gender', data });
      await sendMessage(chatId, `Breed: *${data.breed}*\n\n(4/6) Gender? Reply *male* or *female*`);
      break;
    }
    case 'gender': {
      if (!is(text, 'male', 'female')) { await sendMessage(chatId, 'Please type *male* or *female*.'); return; }
      data.gender = text.trim();
      setConvo(chatId, { flow: 'add_text', step: 'age', data });
      await sendMessage(chatId, `Gender: *${data.gender}*\n\n(5/6) Age in months (e.g. 12, 24)`);
      break;
    }
    case 'age': {
      const ageNum = parseInt(rawBody.trim());
      if (isNaN(ageNum) || ageNum < 0) { await sendMessage(chatId, 'Please enter a valid number for age in months.'); return; }
      data.age = ageNum;
      data.ageUnit = 'months';
      setConvo(chatId, { flow: 'add_text', step: 'image', data });
      await sendMessage(chatId, `Age: *${data.age} months*\n\n(6/6) Send a photo of the animal, or type *skip* to continue without one.`);
      break;
    }
    case 'image': {
      let imageUrl = null;
      if (mediaUrl && isImage(mediaContentType)) {
        await sendMessage(chatId, 'Uploading image...');
        try {
          const { buffer } = await downloadMedia(mediaUrl, mediaContentType);
          const result = await uploadToCloudinary(buffer);
          imageUrl = result.secure_url;
        } catch (err) {
          await sendMessage(chatId, 'Image upload failed. Continuing without image.');
        }
      } else if (mediaUrl && !isImage(mediaContentType)) {
        await sendMessage(chatId, 'That media type is not supported as an image. Continuing without image.');
      } else if (text !== 'skip') {
        await sendMessage(chatId, 'Please send a photo or type *skip*.');
        return;
      }
      data.imageUrl = imageUrl;
      await saveAnimal(chatId, data, waUser);
      break;
    }
  }
}

// ─── Add Animal: Image flow ───────────────────────────────

async function handleAddImageFlow(chatId, text, mediaUrl, mediaContentType, convo, waUser) {
  const { step, data } = convo;

  if (step === 'awaiting_photo') {
    if (!mediaUrl || !isImage(mediaContentType)) {
      await sendMessage(chatId, 'Please send a photo image of the animal (JPG, PNG, etc.).');
      return;
    }
    await sendMessage(chatId, 'Analyzing photo with AI... please wait.');
    try {
      const { buffer, mimeType } = await downloadMedia(mediaUrl, mediaContentType);
      const [detected, cloudResult] = await Promise.all([
        analyzeAnimalImage(buffer, mimeType),
        uploadToCloudinary(buffer),
      ]);
      detected.imageUrl = cloudResult.secure_url;
      setConvo(chatId, { flow: 'add_image', step: 'confirm', data: detected });
      await sendMessage(chatId, confirmPrompt(detected));
    } catch (err) {
      console.error('[WA image flow]', err.message);
      await sendMessage(chatId, `AI analysis failed: ${err.message}\n\nTry again or use text form (*2* → *1*).\n\n*0* to cancel.`);
    }
    return;
  }

  if (step === 'confirm') {
    if (is(text, 'ok', 'yes', 'save', 'confirm', 'okay', 'haan', 'ha', 'done')) {
      await saveAnimal(chatId, data, waUser);
    } else {
      await sendMessage(chatId, 'Type *ok* to save or *0* to cancel.');
    }
    return;
  }
}

// ─── Add Animal: Voice flow ───────────────────────────────

async function handleAddVoiceFlow(chatId, text, mediaUrl, mediaContentType, convo, waUser) {
  const { step, data } = convo;

  if (step === 'awaiting_voice') {
    if (!mediaUrl || !isAudio(mediaContentType)) {
      await sendMessage(chatId, 'Please send a WhatsApp voice note.\n\n*0* to cancel.');
      return;
    }
    if (!groq) {
      await sendMessage(chatId, 'Voice transcription is not configured. Use text (*2* → *1*) or image (*2* → *2*) instead.');
      clearConvo(chatId);
      return;
    }
    await sendMessage(chatId, 'Transcribing your voice note... please wait.');
    try {
      const { buffer, mimeType } = await downloadMedia(mediaUrl, mediaContentType);
      const audioFile = new File([buffer], 'audio.ogg', { type: mimeType || 'audio/ogg' });
      const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-large-v3',
        response_format: 'text',
      });
      if (!transcription || !transcription.trim()) {
        await sendMessage(chatId, 'Could not understand the voice note. Please try again or use text entry (*2* → *1*).');
        return;
      }
      await sendMessage(chatId, `Heard: "_${transcription.trim()}_"\n\nParsing animal details...`);
      const parsed = await parseAnimalFromTranscription(transcription);
      setConvo(chatId, { flow: 'add_voice', step: 'confirm', data: parsed });
      await sendMessage(chatId, confirmPrompt(parsed));
    } catch (err) {
      console.error('[WA voice flow]', err.message);
      await sendMessage(chatId, `Error processing voice note: ${err.message}\n\nPlease try again.\n\n*0* to cancel.`);
    }
    return;
  }

  if (step === 'confirm') {
    if (is(text, 'ok', 'yes', 'save', 'confirm', 'okay', 'haan', 'ha', 'done')) {
      await saveAnimal(chatId, data, waUser);
    } else {
      await sendMessage(chatId, 'Type *ok* to save or *0* to cancel.');
    }
    return;
  }
}

async function parseAnimalFromTranscription(transcription) {
  const prompt = `Extract farm animal details from this voice description. Return ONLY JSON:
{
  "name": "animal name mentioned (use an Indian name like Ganga/Nandini/Lakshmi if not mentioned)",
  "species": "one of: cow, buffalo, goat, sheep, chicken, pig, horse, other",
  "breed": "breed mentioned or Mixed",
  "gender": "male or female",
  "age": <number>,
  "ageUnit": "months or years",
  "imageUrl": null
}

Voice: "${transcription}"

Rules: if not mentioned — use Indian name based on species, breed=Mixed, gender=female, age=12 months. Return ONLY valid JSON.`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 256,
  });

  const parsed = JSON.parse(completion.choices[0].message.content);
  const VALID = new Set(['cow', 'buffalo', 'goat', 'sheep', 'chicken', 'pig', 'horse', 'other']);
  return {
    name: parsed.name || 'Animal',
    species: VALID.has(parsed.species) ? parsed.species : 'other',
    breed: parsed.breed || 'Mixed',
    gender: (parsed.gender || 'female').toLowerCase() === 'male' ? 'male' : 'female',
    age: parseInt(parsed.age) || 12,
    ageUnit: ['days', 'months', 'years'].includes(parsed.ageUnit) ? parsed.ageUnit : 'months',
    imageUrl: null,
  };
}

// ─── Show Animals ─────────────────────────────────────────

async function handleShowAnimals(chatId, waUser) {
  try {
    const farmer = await Farmer.findById(waUser.mongo_id);
    if (!farmer || !farmer.farms || farmer.farms.length === 0) {
      await sendMessage(chatId, 'You have no farms yet. Create one on the web app first.');
      return;
    }
    const animals = await Animal.find({ farmId: { $in: farmer.farms } });
    if (animals.length === 0) {
      await sendMessage(chatId, 'No animals found. Send *2* or *add animal* to add one.');
      return;
    }
    let msg = `*Your Animals* (${animals.length})\n\n`;
    animals.forEach((a, i) => {
      msg += `${i + 1}. *${a.name}* — ${a.species} (${a.breed})\n`;
      msg += `   ${a.gender} | ${a.age} ${a.ageUnit} | RFID: ${a.rfid}\n\n`;
    });
    msg += `Send *2* or *add animal* to add another.`;
    await sendMessage(chatId, msg);
  } catch (err) {
    console.error('[WA showAnimals]', err.message);
    await sendMessage(chatId, 'Error fetching animals. Please try again.');
  }
}

module.exports = { handleIncomingMessage, sendMessage, conversations };

