const Groq = require('groq-sdk');
const Farmer = require('../models/Farmer');
const Farm = require('../models/Farm');
const Animal = require('../models/Animal');
const ProductionRecord = require('../models/ProductionRecord');
const SaleTransaction = require('../models/SaleTransaction');
const Expense = require('../models/Expense');
const MarketPrice = require('../models/MarketPrice');
const VaccinationEvent = require('../models/VaccinationEvent');
const Alert = require('../models/Alert');

let groq = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

async function generateFarmInsights(farmerId) {
  if (!groq) throw new Error('GROQ_API_KEY is not configured.');

  const farmer = await Farmer.findById(farmerId).lean();
  if (!farmer) throw new Error('Farmer not found');

  const farmIds = farmer.farms || [];
  const farms = await Farm.find({ _id: { $in: farmIds } }).lean();
  const animals = await Animal.find({ farmId: { $in: farmIds } }).lean();
  const animalIds = animals.map(a => a._id);

  const speciesCount = {};
  animals.forEach(a => { speciesCount[a.species] = (speciesCount[a.species] || 0) + 1; });

  const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sales = await SaleTransaction.find({ farmId: { $in: farmIds }, date: { $gte: ninetyDaysAgo } }).lean();
  const expenses = await Expense.find({ farmId: { $in: farmIds }, date: { $gte: ninetyDaysAgo } }).lean();

  const totalRevenue = sales.reduce((s, t) => s + (t.totalAmount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const prompt = `You are a friendly, expert Indian agricultural AI advisor. The farmer needs genuine, actionable ADVICE, not just a bunch of numbers in boxes.
You must speak directly to them in a helpful, educational tone. Keep it concise but explanatory (1-2 sentences max per point).

FARMER DATA:
Name: ${farmer.fullName}
Total Revenue (90d): ₹${totalRevenue}
Total Expenses (90d): ₹${totalExpenses}
Total Animals: ${animals.length}
Species: ${JSON.stringify(speciesCount)}

Return this EXACT JSON structure. Ensure the text is written as direct advice (e.g., "You should...", "Notice that...").

{
  "greeting": "A warm, personalized 1-sentence greeting using their name",
  "executive_summary": "2-3 sentences summarizing their farm's current situation overall.",
  
  "financial_advice": {
    "title": "A catchy title for money advice",
    "observation": "1 sentence on what the numbers show.",
    "action": "1 specific financial action to take."
  },

  "health_advice": {
    "title": "A catchy title for herd health",
    "observation": "1 sentence on their herd size/species.",
    "action": "1 specific care or feeding action."
  },

  "mermaid_flowchart_steps": [
    {"id": "A", "label": "Review Data", "desc": "Look at current numbers"},
    {"id": "B", "label": "Plan Feed", "desc": "Optimize feed costs"},
    {"id": "C", "label": "Check Health", "desc": "Vaccinate & monitor"},
    {"id": "D", "label": "Sell Produce", "desc": "Time market sales"}
  ],

  "actionable_tips": [
    {
      "icon": "growth",
      "heading": "Clear 3-5 word instruction",
      "explanation": "Why they should do this (1 sentence).",
      "step": "Exactly how to start (1 sentence)."
    },
    {
       "icon": "save",
       "heading": "Clear 3-5 word instruction",
       "explanation": "Why they should do this.",
       "step": "Exactly how to start."
    },
    {
       "icon": "alert",
       "heading": "Clear 3-5 word instruction",
       "explanation": "Why they should do this.",
       "step": "Exactly how to start."
    }
  ],

  "market_tip": "One clear, friendly sentence of market or seasonal advice to finish."
}

RULES: 
- 4 mermaid steps max (these will be rendered into a nice visual flowchart, so make the labels concise and the descriptions helpful).
- Exactly 3 actionable_tips.
- NO complicated numbers unless extremely helpful.
- ONLY valid JSON. No markdown wrappers.`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: 'You are an Indian farm advisor AI formatting output securely in JSON.' },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.4,
    max_tokens: 1500,
    response_format: { type: 'json_object' }
  });

  let raw = completion.choices[0]?.message?.content || '{}';
  raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
  const fo = raw.indexOf('{'), lc = raw.lastIndexOf('}');
  if (fo !== -1 && lc !== -1) raw = raw.substring(fo, lc + 1);

  return {
    insights: JSON.parse(raw)
  };
}

module.exports = { generateFarmInsights };
