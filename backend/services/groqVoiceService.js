const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Parse natural language text (from speech-to-text) into structured production/finance form data.
 * Supports any language input — the LLM will understand and output structured JSON.
 */
async function parseVoiceInput(transcript, type = 'production', context = {}) {
  const systemPrompts = {
    production: `You are an assistant that extracts structured production record data from farmer's spoken input.
The farmer may speak in Hindi, English, Punjabi, or any Indian language.

Extract the following fields:
- animalId: Leave empty unless they mention a specific animal name/tag (return the name/tag as string)
- productType: One of [cow_milk, buffalo_milk, goat_milk, sheep_milk, eggs, wool, manure, goat_hair, meat_liveweight]
- quantity: A number (e.g., "5 litre" → 5)
- date: In YYYY-MM-DD format. If they say "today", use ${new Date().toISOString().split('T')[0]}. If "yesterday", subtract 1 day. If not mentioned, use today.
- notes: Any additional context they mention

Available animals: ${JSON.stringify(context.animals?.map(a => ({ id: a._id, name: a.name, species: a.species })) || [])}

Return ONLY valid JSON, no markdown, no explanation:
{"animalId": "", "productType": "", "quantity": 0, "date": "", "notes": ""}`,

    expense: `You are an assistant that extracts structured expense record data from farmer's spoken input.
The farmer may speak in Hindi, English, Punjabi, or any Indian language.

Extract the following fields:
- category: One of [feed, veterinary, labour, equipment, transport, utilities, insurance, other]
- amount: A number in INR (e.g., "500 rupees" → 500)
- description: Brief description of the expense
- animalId: Leave empty unless they mention a specific animal name/tag
- date: In YYYY-MM-DD format. If they say "today", use ${new Date().toISOString().split('T')[0]}. If "yesterday", subtract 1 day. If not mentioned, use today.

Available animals: ${JSON.stringify(context.animals?.map(a => ({ id: a._id, name: a.name, species: a.species })) || [])}

Return ONLY valid JSON, no markdown, no explanation:
{"category": "", "amount": 0, "description": "", "animalId": "", "date": ""}`,

    sale: `You are an assistant that extracts structured sale record data from farmer's spoken input.
The farmer may speak in Hindi, English, Punjabi, or any Indian language.

Extract the following fields:
- productType: One of [cow_milk, buffalo_milk, goat_milk, sheep_milk, eggs, wool, manure, goat_hair, meat_liveweight, live_animal]
- quantity: A number
- pricePerUnit: Price per unit in INR
- buyerName: Name of the buyer if mentioned
- animalId: Leave empty unless selling a specific animal (return name/tag)
- date: In YYYY-MM-DD format. If they say "today", use ${new Date().toISOString().split('T')[0]}. If "yesterday", subtract 1 day. If not mentioned, use today.
- notes: Any additional context

Available animals: ${JSON.stringify(context.animals?.map(a => ({ id: a._id, name: a.name, species: a.species })) || [])}

Return ONLY valid JSON, no markdown, no explanation:
{"productType": "", "quantity": 0, "pricePerUnit": 0, "buyerName": "", "animalId": "", "date": "", "notes": ""}`
  };

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompts[type] || systemPrompts.production
        },
        {
          role: 'user',
          content: transcript
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const result = chatCompletion.choices[0]?.message?.content;
    if (!result) throw new Error('No response from Groq');

    const parsed = JSON.parse(result);

    // Try to resolve animal name to ID if we have context
    if (parsed.animalId && context.animals) {
      const match = context.animals.find(a =>
        a.name?.toLowerCase() === parsed.animalId.toLowerCase() ||
        a._id === parsed.animalId
      );
      if (match) {
        parsed.animalId = match._id;
      }
    }

    return { success: true, data: parsed };
  } catch (error) {
    console.error('Groq parse error:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { parseVoiceInput };
