const axios = require('axios');
const cheerio = require('cheerio');
const Scheme = require('../models/Scheme');

let cachedSchemes = null;
let lastFetchTime = 0;
const LIST_CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours
const DETAIL_CACHE_DURATION = 1000 * 60 * 60 * 24 * 7; // 7 days

// Simple in-memory cache for details
const detailCache = {};

const fetchSchemes = async () => {
    try {
        // Fetch all schemes directly from MongoDB
        console.log('Fetching schemes from MongoDB...');
        const schemes = await Scheme.find({}).lean();

        console.log(`Found ${schemes.length} schemes in database`);

        // Return schemes with proper structure for frontend
        return schemes.map(s => ({
            id: s.slug,
            _id: s.slug,
            slug: s.slug,
            title: s.title,
            link: s.source || `https://en.wikipedia.org/wiki/${s.slug}`,
            ministry: 'Ministry of Agriculture & Farmers Welfare',
            description: s.description?.substring(0, 150) + '...' || 'Government scheme for farmers',
            tags: s.tags || ['Agriculture', 'Government Scheme']
        }));

    } catch (error) {
        console.error('Error in schemeService:', error.message);
        throw error;
    }
};

const Groq = require("groq-sdk");
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

if (!groq) {
    console.warn("GROQ_API_KEY not found. AI features disabled.");
}

const fetchSchemeDetails = async (slug) => {
    if (!slug || slug === 'undefined' || slug === 'null') return null;

    try {
        // 1. Check Database first
        let scheme = await Scheme.findOne({ slug });
        if (scheme) {
            console.log(`Serving scheme details from DB: ${slug}`);
            console.log('DB Data:', JSON.stringify(scheme, null, 2));
            return scheme;
        }

        console.log(`Scheme not in DB, fetching from API: ${slug}`);

        // 2. Fetch from Wikipedia REST API
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`;
        const htmlUrl = `https://en.wikipedia.org/api/rest_v1/page/html/${slug}`;

        const headers = {
            'User-Agent': 'TechFiesta-Hackathon/1.0 (some@email.com)'
        };

        const [summaryRes, htmlRes] = await Promise.all([
            axios.get(summaryUrl, { headers }).catch(e => null),
            axios.get(htmlUrl, { headers }).catch(e => null)
        ]);

        if (!summaryRes || !htmlRes) {
            console.warn(`Wikipedia API failed for ${slug}`);
            return null;
        }

        const summaryData = summaryRes.data;
        const htmlContent = htmlRes.data;

        // Parse HTML to text for AI
        const $ = cheerio.load(htmlContent);
        const rawText = $('p').map((i, el) => $(el).text()).get().join('\n\n');
        const title = summaryData.title;

        let simplifiedData = {
            slug: slug,
            title: title,
            description: summaryData.description || summaryData.extract,
            benefits: [],
            financial_aid: "Contact Office",
            duration: "Ongoing",
            how_to_apply: "Visit nearest CSC center or Panchayat office",
            official_link: "",
            applicationProcess: [],
            source: `https://en.wikipedia.org/wiki/${slug}`,
            tags: []
        };

        try {
            if (groq) {
                const prompt = `
                Analyze the following text about the government scheme "${title}" and extract structured information for a farmer with limited literacy. Use extremely simple, clear words.
                
                Text:
                ${rawText.substring(0, 4000)}

                Return ONLY a valid JSON object with these EXACT fields:
                - "summary": A very simple 2-sentence summary of what the scheme is.
                - "benefits": An array of short strings (max 5) listing the key benefits (e.g., "Rs 6000 per year", "Free crop insurance").
                - "financial_aid": A short string describing money/subsidy amount (e.g., "Rs 6,000 / year" or "50% Subsidy"). If none, use "Benefits vary".
                - "duration": A short string for time period (e.g., "5 Years", "Until 60 years old", "Life-long").
                - "how_to_apply": A very simple 1-sentence instruction on where the farmer should go (e.g., "Contact your local Panchayat officer" or "Visit the nearest CSC center").
                - "official_link": The official government website URL for this scheme (look for "Official website" or external links to .gov.in or .nic.in domains).
                - "applicationProcess": An array of 3-4 extremely simple steps.
                `;

                const chatCompletion = await groq.chat.completions.create({
                    messages: [{ role: "user", content: prompt }],
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.1,
                    response_format: { type: "json_object" }
                });

                let rawContent = chatCompletion.choices[0]?.message?.content || "{}";
                console.log(`Groq Raw Response for ${slug}:`, rawContent);

                // Clean up Markdown code blocks if present
                rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();

                // Find first '{' and last '}'
                const firstOpen = rawContent.indexOf('{');
                const lastClose = rawContent.lastIndexOf('}');
                if (firstOpen !== -1 && lastClose !== -1) {
                    rawContent = rawContent.substring(firstOpen, lastClose + 1);
                }

                const aiResponse = JSON.parse(rawContent);

                // Helper to clean "Undefined" strings
                const clean = (val) => (val && val !== 'Undefined' && val !== 'undefined') ? val : null;

                simplifiedData = {
                    ...simplifiedData,
                    description: clean(aiResponse.summary) || simplifiedData.description,
                    benefits: Array.isArray(aiResponse.benefits) ? aiResponse.benefits.filter(b => clean(b)) : [],
                    financial_aid: clean(aiResponse.financial_aid) || "Check locally",
                    duration: clean(aiResponse.duration) || "Ongoing",
                    how_to_apply: clean(aiResponse.how_to_apply) || "Contact Gram Panchayat",
                    official_link: clean(aiResponse.official_link) || "",
                    applicationProcess: Array.isArray(aiResponse.applicationProcess) ? aiResponse.applicationProcess.filter(s => clean(s)) : []
                };
            }
        } catch (aiError) {
            console.error("Groq AI summarization failed:", aiError.message);
            // Fallback to raw extraction if AI fails
        }

        // 3. Save to Database
        const newScheme = new Scheme(simplifiedData);
        await newScheme.save();
        console.log(`Saved new scheme to DB: ${slug}`);
        console.log('Final Data Returning:', JSON.stringify(newScheme, null, 2));

        return newScheme;

    } catch (error) {
        console.error(`Error fetching/saving details for ${slug}:`, error.message);
        return null;
    }
};

module.exports = { fetchSchemes, fetchSchemeDetails };
