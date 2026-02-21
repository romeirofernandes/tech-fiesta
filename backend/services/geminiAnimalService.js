/**
 * Gemini Animal Image Analysis Service
 *
 * Analyzes a farm animal photo and returns structured animal data.
 * Used by the WhatsApp bot's image-based add-animal flow.
 *
 * Required .env:
 *   GEMINI_API_KEY  – Google AI Studio API key
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

const SPECIES_MAP = {
  cattle: 'cow', bull: 'cow', calf: 'cow',
  'water buffalo': 'buffalo',
  lamb: 'sheep',
  rooster: 'chicken', hen: 'chicken',
  piglet: 'pig', hog: 'pig', swine: 'pig', boar: 'pig',
  pony: 'horse', equine: 'horse',
};

const ALLOWED_SPECIES = new Set(['cow', 'buffalo', 'goat', 'sheep', 'chicken', 'pig', 'horse', 'other']);

function normalizeSpecies(s) {
  if (!s) return 'other';
  const lower = s.toLowerCase().trim();
  const mapped = SPECIES_MAP[lower] || lower;
  return ALLOWED_SPECIES.has(mapped) ? mapped : 'other';
}

const PROMPT = `You are an expert veterinarian and Indian farm animal specialist. Analyze this image of a farm animal and fill in ALL fields with your best professional estimate.

IMPORTANT INSTRUCTIONS:
- NAME: Suggest a popular Indian domestic animal name (e.g. Ganga, Lakshmi, Nandini for cow; Kali, Bhuri for buffalo; Chameli, Heera for goat). Match the name to the animal type.
- SPECIES: Identify the exact species (cow, buffalo, goat, sheep, chicken, horse, pig, or other)
- BREED: Best estimate based on physical characteristics, color, body structure. Be specific (e.g. Gir, HF, Murrah, Sahiwal, Jamunapari)
- GENDER: Estimate from physical features (horns, body structure, udder, etc.)
- AGE: Best estimate from size, development, teeth. Use days for newborns, months for young, years for adults
- AGE_UNIT: "days", "months", or "years"
- NOTES: Any health observations, distinctive markings, body condition

Return ONLY this JSON, no markdown, no extra text:
{
  "name": "Indian animal name (REQUIRED)",
  "species": "species (REQUIRED)",
  "breed": "specific breed estimate (REQUIRED)",
  "gender": "male or female (REQUIRED)",
  "age": <number>,
  "ageUnit": "days/months/years (REQUIRED)",
  "notes": "brief observations"
}

Never use null. Always make your best professional guess.`;

/**
 * Analyze an animal photo from a Buffer.
 * @param {Buffer} imageBuffer
 * @param {string} mimeType  e.g. 'image/jpeg'
 * @returns {{ name, species, breed, gender, age, ageUnit, notes }}
 */
async function analyzeAnimalImage(imageBuffer, mimeType) {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY is not configured in the backend .env');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const imagePart = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType: mimeType || 'image/jpeg',
    },
  };

  const result = await model.generateContent([PROMPT, imagePart]);
  const text = result.response.text().trim();

  // Strip markdown fences if present
  const jsonStr = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    // Try extracting first JSON object
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      console.error('[GeminiAnimal] Failed to parse:', text);
      throw new Error('Could not parse animal info from the image');
    }
  }

  return {
    name: parsed.name || 'Animal',
    species: normalizeSpecies(parsed.species),
    breed: parsed.breed || 'Mixed',
    gender: (parsed.gender || 'female').toLowerCase().includes('male') ? 'male' : 'female',
    age: parseInt(parsed.age) || 12,
    ageUnit: ['days', 'months', 'years'].includes(parsed.ageUnit) ? parsed.ageUnit : 'months',
    notes: parsed.notes || '',
  };
}

module.exports = { analyzeAnimalImage };
