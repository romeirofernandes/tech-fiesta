const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function generateVaccinationEvents(animalData, questionsAnswers) {
  const prompt = `You are a veterinary vaccination expert. Based on the following animal information and farmer's answers, generate a vaccination schedule.

Animal Information:
- Species: ${animalData.species}
- Breed: ${animalData.breed}
- Gender: ${animalData.gender}
- Age: ${animalData.age} ${animalData.ageUnit}

Farmer's Answers:
${questionsAnswers.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')}

Generate a JSON array of vaccination events. For each vaccination, determine:
1. If it's already administered (past), scheduled (future), or missed (should have been done)
2. The vaccine name and disease it prevents
3. The date (calculate based on animal's current age)
4. Notes about the vaccination
5. If it repeats, specify the repeat interval

Return ONLY a valid JSON array in this exact format:
[
  {
    "vaccineName": "Vaccine name",
    "eventType": "administered" or "scheduled" or "missed",
    "date": "YYYY-MM-DD",
    "notes": "Any relevant notes",
    "repeatsEvery": null or { "value": number, "unit": "days/months/years" }
  }
]

Consider standard vaccination schedules for the species. Be practical and realistic.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a veterinary expert specializing in livestock vaccination schedules. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 2000
    });

    const responseText = completion.choices[0].message.content.trim();
    console.log("Raw LLM response:", responseText); // Add this for debugging

    // Try to sanitize single quotes to double quotes (basic fix)
    let sanitized = responseText
      .replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3') // property names
      .replace(/'([^']*)'/g, '"$1"'); // string values

    // Extract JSON array
    const jsonMatch = sanitized.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON array found in response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error generating vaccination events:', error);
    throw error;
  }
}

module.exports = { generateVaccinationEvents };