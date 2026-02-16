require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const Scheme = require('../models/Scheme');
const Groq = require("groq-sdk");

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

const FEATURED_SCHEMES = [
    'Pradhan_Mantri_Kisan_Samman_Nidhi',
    'Pradhan_Mantri_Fasal_Bima_Yojana',
    'Pradhan_Mantri_Krishi_Sinchayee_Yojana',
    'Soil_Health_Card_Scheme',
    'Paramparagat_Krishi_Vikas_Yojana'
];

const fetchAndSaveScheme = async (slug) => {
    try {
        console.log(`\n=== Fetching: ${slug} ===`);

        // Check if already exists
        const existing = await Scheme.findOne({ slug });
        if (existing) {
            console.log(`✓ Already in DB, skipping`);
            return existing;
        }

        // Fetch from Wikipedia API
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`;
        const htmlUrl = `https://en.wikipedia.org/api/rest_v1/page/html/${slug}`;

        const headers = {
            'User-Agent': 'TechFiesta-Hackathon/1.0 (contact@techfiesta.com)'
        };

        console.log('Fetching from Wikipedia API...');
        const [summaryRes, htmlRes] = await Promise.all([
            axios.get(summaryUrl, { headers }),
            axios.get(htmlUrl, { headers })
        ]);

        const summaryData = summaryRes.data;
        const htmlContent = htmlRes.data;

        // Parse HTML to text
        const $ = cheerio.load(htmlContent);
        const paragraphs = [];
        $('p').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 50 && paragraphs.length < 10) {
                paragraphs.push(text);
            }
        });
        const rawText = paragraphs.join('\n\n');

        console.log(`Title: ${summaryData.title}`);
        console.log(`Description: ${summaryData.extract?.substring(0, 100)}...`);

        let schemeData = {
            slug: slug,
            title: summaryData.title,
            description: summaryData.extract || summaryData.description || "Government scheme for farmers",
            benefits: [],
            financial_aid: "Contact local office",
            duration: "Ongoing",
            how_to_apply: "Visit nearest CSC center or Panchayat office",
            official_link: "",
            applicationProcess: [],
            source: `https://en.wikipedia.org/wiki/${slug}`,
            tags: ['Agriculture', 'Government Scheme']
        };

        // Use AI to extract structured data
        if (groq && rawText.length > 100) {
            try {
                console.log('Processing with AI...');
                const prompt = `Analyze this government scheme and extract information in simple language for farmers.

Text:
${rawText.substring(0, 5000)}

Return ONLY valid JSON with these fields:
{
  "summary": "2-sentence simple summary",
  "benefits": ["benefit 1", "benefit 2", "benefit 3"],
  "financial_aid": "Amount or subsidy details",
  "duration": "Time period",
  "how_to_apply": "Simple instruction where to apply",
  "official_link": "Government website URL if mentioned",
  "applicationProcess": ["step 1", "step 2", "step 3"]
}`;

                const completion = await groq.chat.completions.create({
                    messages: [{ role: "user", content: prompt }],
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.1,
                    response_format: { type: "json_object" }
                });

                let aiContent = completion.choices[0]?.message?.content || "{}";
                aiContent = aiContent.replace(/```json/g, '').replace(/```/g, '').trim();

                const firstBrace = aiContent.indexOf('{');
                const lastBrace = aiContent.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    aiContent = aiContent.substring(firstBrace, lastBrace + 1);
                }

                const aiData = JSON.parse(aiContent);

                const clean = (val) => (val && val !== 'Undefined' && val !== 'undefined' && val !== 'null') ? val : null;

                schemeData = {
                    ...schemeData,
                    description: clean(aiData.summary) || schemeData.description,
                    benefits: Array.isArray(aiData.benefits) ? aiData.benefits.filter(b => clean(b)).slice(0, 5) : [],
                    financial_aid: clean(aiData.financial_aid) || schemeData.financial_aid,
                    duration: clean(aiData.duration) || schemeData.duration,
                    how_to_apply: clean(aiData.how_to_apply) || schemeData.how_to_apply,
                    official_link: clean(aiData.official_link) || "",
                    applicationProcess: Array.isArray(aiData.applicationProcess) ? aiData.applicationProcess.filter(s => clean(s)).slice(0, 4) : []
                };

                console.log('✓ AI processing complete');
            } catch (aiError) {
                console.log('⚠ AI processing failed, using basic data:', aiError.message);
            }
        }

        // Save to database
        const newScheme = new Scheme(schemeData);
        await newScheme.save();

        console.log(`✓ Saved to database`);
        console.log(`  Benefits: ${schemeData.benefits.length}`);
        console.log(`  Financial Aid: ${schemeData.financial_aid}`);

        return newScheme;

    } catch (error) {
        console.error(`✗ Error processing ${slug}:`, error.message);
        return null;
    }
};

const populateSchemes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB\n');

        console.log(`Processing ${FEATURED_SCHEMES.length} featured schemes...\n`);

        for (const slug of FEATURED_SCHEMES) {
            await fetchAndSaveScheme(slug);
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const count = await Scheme.countDocuments();
        console.log(`\n=== COMPLETE ===`);
        console.log(`Total schemes in database: ${count}`);

        await mongoose.connection.close();
        console.log('✓ Database connection closed');

    } catch (error) {
        console.error('Fatal error:', error.message);
        process.exit(1);
    }
};

populateSchemes();
