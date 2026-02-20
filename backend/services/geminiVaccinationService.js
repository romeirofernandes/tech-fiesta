/**
 * Gemini Vaccination Certificate Extraction Service
 *
 * Uses Google Gemini 2.5 Flash Lite to extract vaccination info from a photo.
 * Expects a Buffer (image) and returns structured data.
 *
 * Required .env:
 *   GEMINI_API_KEY  – Google AI API key (can reuse VITE_GEMINI_API_KEY from frontend)
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Extract vaccination info from a certificate image.
 * @param {Buffer} imageBuffer – raw image bytes
 * @param {string} mimeType – e.g. 'image/jpeg'
 * @returns {{ vaccineName, date, animalName, animalRfid, veterinarian, notes, batchNumber }}
 */
async function extractVaccinationInfo(imageBuffer, mimeType) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const prompt = `You are an expert veterinary document parser. Analyze this vaccination certificate/record image and extract the following information. Return ONLY a JSON object with these fields (use null if not found):

{
  "vaccineName": "name of the vaccine administered",
  "date": "date of vaccination in YYYY-MM-DD format",
  "animalName": "name of the animal if visible",
  "animalRfid": "RFID tag number if visible",
  "species": "animal species (cow, buffalo, goat, sheep, etc.)",
  "veterinarian": "name of the veterinarian/doctor",
  "batchNumber": "vaccine batch/lot number",
  "notes": "any other relevant details like dosage, route of administration, next due date, etc."
}

Important:
- Parse dates carefully — convert any date format to YYYY-MM-DD
- If the document is in Hindi or another Indian language, still extract and translate the info to English
- If multiple vaccines are listed, use the most recent/primary one
- Return ONLY valid JSON, no markdown, no explanation`;

  const imagePart = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType,
    },
  };

  const result = await model.generateContent([prompt, imagePart]);
  const text = result.response.text().trim();

  // Strip markdown code fences if present
  const jsonStr = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('[Gemini] Failed to parse response:', text);
    throw new Error('Could not parse vaccination info from the certificate image');
  }
}

module.exports = { extractVaccinationInfo };
