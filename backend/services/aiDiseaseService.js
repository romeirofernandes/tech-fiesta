const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require("groq-sdk");
const fs = require('fs');
const path = require('path');
const os = require('os');

// Initialize Groq for Whisper (Audio Transcription)
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// Initialize Gemini (Vision + Text Analysis)
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

/**
 * Converts a buffer to the inline data format Gemini expects.
 */
function bufferToGenerativePart(buffer, mimeType) {
    return {
        inlineData: {
            data: buffer.toString("base64"),
            mimeType
        },
    };
}

/**
 * Transcribes audio using Groq Whisper. Supports English, Hindi, Marathi automatically.
 */
async function transcribeAudio(audioBuffer) {
    if (!groq) {
        console.warn("GROQ_API_KEY not set, skipping audio transcription.");
        return null;
    }

    // Groq SDK needs a file stream, so write buffer to a temp file
    const tempPath = path.join(os.tmpdir(), `disease_audio_${Date.now()}.webm`);
    fs.writeFileSync(tempPath, audioBuffer);

    try {
        const result = await groq.audio.transcriptions.create({
            file: fs.createReadStream(tempPath),
            model: "whisper-large-v3",
            response_format: "json",
        });
        console.log("Whisper transcription:", result.text);
        return result.text;
    } catch (err) {
        console.error("Whisper transcription failed:", err.message);
        return null;
    } finally {
        // Cleanup temp file
        try { fs.unlinkSync(tempPath); } catch (e) { /* ignore */ }
    }
}

/**
 * Analyzes disease using Gemini with image and/or text context.
 */
async function analyzeWithGemini(imagePart, symptomText, animalContext) {
    if (!genAI) {
        throw new Error("GEMINI_API_KEY is not configured. Add GEMINI_API_KEY=your_key to your backend .env file.");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are an expert veterinary AI assistant helping a rural farmer diagnose cattle disease.

--- ANIMAL CONTEXT ---
${animalContext ? JSON.stringify(animalContext, null, 2) : "No specific animal selected."}

--- FARMER'S SYMPTOM DESCRIPTION ---
"${symptomText || 'No verbal description provided. Analyze the image only.'}"

${imagePart ? 'Analyze the provided image carefully for any visible signs of disease, injury, or abnormality.' : 'No image was provided. Base your analysis only on the symptom description above.'}

Provide your diagnosis. Respond ONLY with raw valid JSON (no markdown, no code blocks):
{
    "diagnosis": "Name of the suspected condition",
    "confidence": "High | Medium | Low",
    "severity": "Critical | High | Medium | Low",
    "symptoms_identified": ["Symptom 1", "Symptom 2"],
    "immediate_actions": ["Step 1 for the farmer", "Step 2"],
    "vet_needed": true or false,
    "preventative_measures": ["Future prevention tip 1", "Tip 2"]
}
`;

    const parts = [prompt];
    if (imagePart) {
        parts.push(imagePart);
    }

    const result = await model.generateContent(parts);
    const responseText = result.response.text();
    console.log("Gemini raw response:", responseText);

    // Clean JSON
    let cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first !== -1 && last !== -1) {
        cleaned = cleaned.substring(first, last + 1);
    }

    return JSON.parse(cleaned);
}

/**
 * Main entry point: accepts image and/or audio, returns diagnosis.
 * Either image or audio is sufficient — both are optional but at least one is required.
 */
const detectDisease = async (imageFile, audioFile, animalData) => {
    try {
        let transcription = null;
        let imagePart = null;

        // Step 1: Transcribe audio if provided
        if (audioFile && audioFile.buffer) {
            transcription = await transcribeAudio(audioFile.buffer);
        }

        // Step 2: Prepare image if provided
        if (imageFile && imageFile.buffer) {
            imagePart = bufferToGenerativePart(imageFile.buffer, imageFile.mimetype);
        }

        // At least one input is needed
        if (!imagePart && !transcription) {
            throw new Error("Please provide at least an image or a voice description.");
        }

        // Step 3: Run Gemini analysis
        const diagnosisData = await analyzeWithGemini(imagePart, transcription, animalData);

        return {
            success: true,
            transcription: transcription,
            data: diagnosisData
        };

    } catch (error) {
        console.error("Error in detectDisease service:", error.message);
        throw error;
    }
};

module.exports = { detectDisease };
