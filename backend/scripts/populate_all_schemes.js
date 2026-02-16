require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const Scheme = require('../models/Scheme');
const Groq = require("groq-sdk");

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// Top 15 agricultural schemes
const SCHEME_SLUGS = [
    'Pradhan_Mantri_Kisan_Samman_Nidhi',
    'Pradhan_Mantri_Fasal_Bima_Yojana',
    'Pradhan_Mantri_Krishi_Sinchayee_Yojana',
    'Soil_Health_Card_Scheme',
    'Paramparagat_Krishi_Vikas_Yojana',
    'National_Agriculture_Market',
    'Pradhan_Mantri_Matsya_Sampada_Yojana',
    'Kisan_Credit_Card',
    'National_Food_Security_Mission',
    'Rashtriya_Krishi_Vikas_Yojana'
];

const fetchAndSaveScheme = async (slug) => {
    try {
        console.log(`\n=== Processing: ${slug} ===`);

        // Check if already exists
        const existing = await Scheme.findOne({ slug });
        if (existing) {
            console.log(`✓ Already exists, skipping`);
            return existing;
        }

        // Fetch from Wikipedia API
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`;
        const htmlUrl = `https://en.wikipedia.org/api/rest_v1/page/html/${slug}`;

        const headers = {
            'User-Agent': 'TechFiesta-Hackathon/1.0 (contact@techfiesta.com)'
        };

        console.log('Fetching from Wikipedia...');
        const [summaryRes, htmlRes] = await Promise.all([
            axios.get(summaryUrl, { headers }).catch(e => {
                console.log(`  ⚠ Summary API failed: ${e.message}`);
                return null;
            }),
            axios.get(htmlUrl, { headers }).catch(e => {
                console.log(`  ⚠ HTML API failed: ${e.message}`);
                return null;
            })
        ]);

        if (!summaryRes || !htmlRes) {
            console.log(`✗ Wikipedia API failed for ${slug}`);
            return null;
        }

        const summaryData = summaryRes.data;
        const htmlContent = htmlRes.data;

        // Parse HTML
        const $ = cheerio.load(htmlContent);
        const paragraphs = [];
        $('p').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 50 && paragraphs.length < 15) {
                paragraphs.push(text);
            }
        });
        const rawText = paragraphs.join('\n\n');

        console.log(`  Title: ${summaryData.title}`);

        let schemeData = {
            slug: slug,
            title: summaryData.title,
            description: summaryData.extract || summaryData.description || "Government agricultural scheme",
            benefits: ["Financial support for farmers", "Government subsidy available", "Easy application process"],
            financial_aid: "Contact local agriculture office",
            duration: "Ongoing",
            how_to_apply: "Visit nearest CSC center or Panchayat office",
            official_link: "",
            applicationProcess: [
                "Visit your local Panchayat office",
                "Bring Aadhaar card and land documents",
                "Fill the application form",
                "Submit and get acknowledgment"
            ],
            source: `https://en.wikipedia.org/wiki/${slug}`,
            tags: ['Agriculture', 'Government Scheme']
        };

        // Use AI if available
        if (groq && rawText.length > 100) {
            try {
                console.log('  Processing with AI...');
                const prompt = `You are helping farmers understand government schemes. Analyze this scheme and extract key information in VERY SIMPLE language.

Scheme: ${summaryData.title}

Text:
${rawText.substring(0, 6000)}

Return ONLY valid JSON:
{
  "summary": "2-3 sentence simple explanation of what this scheme does for farmers",
  "benefits": ["benefit 1", "benefit 2", "benefit 3", "benefit 4"],
  "financial_aid": "Exact amount or percentage of subsidy (e.g., Rs 6000/year, 50% subsidy)",
  "duration": "How long the scheme runs (e.g., 5 years, ongoing, until age 60)",
  "how_to_apply": "One simple sentence on where to go",
  "official_link": "Official .gov.in or .nic.in website URL if mentioned",
  "applicationProcess": ["step 1", "step 2", "step 3", "step 4"]
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

                const clean = (val) => (val && val !== 'Undefined' && val !== 'undefined' && val !== 'null' && val !== 'Not specified') ? val : null;

                schemeData = {
                    ...schemeData,
                    description: clean(aiData.summary) || schemeData.description,
                    benefits: Array.isArray(aiData.benefits) ? aiData.benefits.filter(b => clean(b)).slice(0, 6) : schemeData.benefits,
                    financial_aid: clean(aiData.financial_aid) || schemeData.financial_aid,
                    duration: clean(aiData.duration) || schemeData.duration,
                    how_to_apply: clean(aiData.how_to_apply) || schemeData.how_to_apply,
                    official_link: clean(aiData.official_link) || "",
                    applicationProcess: Array.isArray(aiData.applicationProcess) ? aiData.applicationProcess.filter(s => clean(s)).slice(0, 5) : schemeData.applicationProcess
                };

                console.log(`  ✓ AI extracted ${schemeData.benefits.length} benefits`);
            } catch (aiError) {
                console.log(`  ⚠ AI failed: ${aiError.message}`);
            }
        }

        // Save to database
        const newScheme = new Scheme(schemeData);
        await newScheme.save();

        console.log(`  ✓ Saved to database`);
        console.log(`    Benefits: ${schemeData.benefits.length}`);
        console.log(`    Financial Aid: ${schemeData.financial_aid}`);
        console.log(`    Steps: ${schemeData.applicationProcess.length}`);

        return newScheme;

    } catch (error) {
        console.error(`✗ Error: ${error.message}`);
        return null;
    }
};

const populateAllSchemes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to MongoDB\n');

        console.log(`Processing ${SCHEME_SLUGS.length} schemes...\n`);

        let successCount = 0;
        let skipCount = 0;
        let failCount = 0;

        for (const slug of SCHEME_SLUGS) {
            const result = await fetchAndSaveScheme(slug);
            if (result) {
                if (await Scheme.findOne({ slug })) {
                    const existing = await Scheme.findOne({ slug });
                    if (existing.createdAt && (Date.now() - new Date(existing.createdAt).getTime() < 10000)) {
                        successCount++;
                    } else {
                        skipCount++;
                    }
                }
            } else {
                failCount++;
            }

            // Delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        const totalCount = await Scheme.countDocuments();
        console.log(`\n========== SUMMARY ==========`);
        console.log(`✓ Successfully added: ${successCount}`);
        console.log(`⊘ Already existed: ${skipCount}`);
        console.log(`✗ Failed: ${failCount}`);
        console.log(`📊 Total in database: ${totalCount}`);
        console.log(`=============================\n`);

        await mongoose.connection.close();
        console.log('✓ Database connection closed');

    } catch (error) {
        console.error('Fatal error:', error.message);
        process.exit(1);
    }
};

populateAllSchemes();
