const axios = require('axios');
const cheerio = require('cheerio');

let cachedSchemes = null;
let lastFetchTime = 0;
const LIST_CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours
const DETAIL_CACHE_DURATION = 1000 * 60 * 60 * 24 * 7; // 7 days

// Simple in-memory cache for details
const detailCache = {};

const fetchSchemes = async () => {
    try {
        if (cachedSchemes && (Date.now() - lastFetchTime < LIST_CACHE_DURATION)) {
            return cachedSchemes;
        }

        const url = 'https://en.wikipedia.org/wiki/List_of_government_schemes_in_India';
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const schemes = [];

        $('table.wikitable tbody tr').each((i, row) => {
            const cols = $(row).find('td');
            if (cols.length > 1) {
                let nameCol = $(cols[0]);
                let title = nameCol.text().trim();
                let link = nameCol.find('a').attr('href');
                let ministry = $(cols[1]).text().trim();
                let description = $(cols[3] || cols[2]).text().trim();

                if (/^\d+$/.test(title)) {
                    nameCol = $(cols[1]);
                    title = nameCol.text().trim();
                    link = nameCol.find('a').attr('href');
                    ministry = $(cols[2]).text().trim();
                    description = $(cols[4] || cols[3]).text().trim();
                }

                if (title && title.length > 3) {
                    const slug = link ? link.split('/wiki/')[1] : null;

                    if (slug) {
                        schemes.push({
                            id: slug,
                            slug: slug,
                            title: title.replace(/\[\d+\]/g, ''),
                            link: `https://en.wikipedia.org${link}`,
                            ministry: ministry.replace(/\[\d+\]/g, '') || 'Government of India',
                            description: description ? description.substring(0, 150) + '...' : `Detail about ${title}`,
                            tags: ['Scheme', ministry.split(' ')[0]]
                        });
                    }
                }
            }
        });

        // Filter Strict Agriculture
        const agriKeywords = ['kisan', 'krishi', 'agriculture', 'farm', 'crop', 'soil', 'irrigation', 'dairy', 'animal', 'fisheries'];
        const agriSchemes = schemes.filter(s =>
            agriKeywords.some(k => s.title.toLowerCase().includes(k) || s.description.toLowerCase().includes(k))
        );

        // Also look for specific known schemes if missing
        if (!agriSchemes.find(s => s.slug === 'Pradhan_Mantri_Kisan_Samman_Nidhi')) {
            agriSchemes.unshift({
                id: 'Pradhan_Mantri_Kisan_Samman_Nidhi',
                slug: 'Pradhan_Mantri_Kisan_Samman_Nidhi',
                title: 'Pradhan Mantri Kisan Samman Nidhi',
                link: 'https://en.wikipedia.org/wiki/Pradhan_Mantri_Kisan_Samman_Nidhi',
                ministry: 'Ministry of Agriculture & Farmers Welfare',
                description: 'An initiative by the government of India is in which all farmers will get up to ₹6,000 per year as minimum income support.',
                tags: ['Scheme', 'Agriculture']
            });
        }
        if (!agriSchemes.find(s => s.slug === 'Pradhan_Mantri_Fasal_Bima_Yojana')) {
            agriSchemes.push({
                id: 'Pradhan_Mantri_Fasal_Bima_Yojana',
                slug: 'Pradhan_Mantri_Fasal_Bima_Yojana',
                title: 'Pradhan Mantri Fasal Bima Yojana',
                link: 'https://en.wikipedia.org/wiki/Pradhan_Mantri_Fasal_Bima_Yojana',
                ministry: 'Ministry of Agriculture & Farmers Welfare',
                description: 'Government sponsored crop insurance scheme that integrates multiple stakeholders on a single platform.',
                tags: ['Scheme', 'Insurance']
            });
        }

        cachedSchemes = agriSchemes;
        lastFetchTime = Date.now();

        return cachedSchemes;

    } catch (error) {
        console.error('Error in schemeService:', error.message);
        throw error;
    }
};

const Groq = require("groq-sdk");
let groq = null;
try {
    if (process.env.GROQ_API_KEY) {
        groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    } else {
        console.warn("GROQ_API_KEY not found in environment variables. AI features disabled.");
    }
} catch (e) {
    console.error("Failed to initialize Groq SDK:", e.message);
}

const fetchSchemeDetails = async (slug) => {
    // Check Cache
    if (detailCache[slug] && (Date.now() - detailCache[slug].timestamp < DETAIL_CACHE_DURATION)) {
        return detailCache[slug].data;
    }

    try {
        const url = `https://en.wikipedia.org/wiki/${slug}`;
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);

        const title = $('h1#firstHeading').text().trim();
        const content = [];

        // Main Description (first few paragraphs)
        $('#mw-content-text .mw-parser-output > p').each((i, el) => {
            const text = $(el).text().trim().replace(/\[\d+\]/g, ''); // Clean citations
            if (text.length > 50 && content.length < 5) {
                content.push(text);
            }
        });

        // Use AI to simplify content
        const rawText = content.join('\n\n');

        let simplifiedData = {
            id: slug,
            title,
            description: rawText, // Fallback
            benefits: [],
            financial_aid: "Contact Office",
            duration: "Ongoing",
            how_to_apply: "Visit nearest CSC center or Panchayat office",
            official_link: "",
            applicationProcess: [],
            source: url
        };

        try {
            if (!groq) throw new Error("Groq SDK not initialized");

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

            const aiResponse = JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");

            simplifiedData = {
                ...simplifiedData,
                description: aiResponse.summary || simplifiedData.description,
                benefits: aiResponse.benefits || [],
                financial_aid: aiResponse.financial_aid || "Check locally",
                duration: aiResponse.duration || "Ongoing",
                how_to_apply: aiResponse.how_to_apply || "Contact Gram Panchayat",
                official_link: aiResponse.official_link || "",
                applicationProcess: aiResponse.applicationProcess || []
            };

        } catch (aiError) {
            console.error("Groq AI summarization failed:", aiError.message);
            // Fallback to raw extraction if AI fails
        }

        // Cache it
        detailCache[slug] = {
            timestamp: Date.now(),
            data: simplifiedData
        };

        return simplifiedData;
    } catch (error) {
        console.error(`Error scraping details for ${slug}:`, error.message);
        throw new Error('Failed to fetch details');
    }
};

module.exports = { fetchSchemes, fetchSchemeDetails };
