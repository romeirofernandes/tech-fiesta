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

        // Filter Strict Agriculture with expanded keyword set
        const agriKeywords = [
            'kisan', 'krishi', 'agriculture', 'farm', 'crop', 'soil', 'irrigation',
            'dairy', 'animal', 'fisheries', 'livestock', 'poultry', 'horticulture',
            'fertilizer', 'pesticide', 'organic', 'mandis', 'e-nam', 'warehousing',
            'cold storage', 'rural', 'panchayat', 'subsidy', 'insurance', 'matsya',
            'sinchayee', 'sampada', 'vikas', 'nidhi', 'bima', 'horticulture'
        ];

        const agriSchemes = schemes.filter(s =>
            agriKeywords.some(k => s.title.toLowerCase().includes(k) || s.description.toLowerCase().includes(k))
        );

        // Featured Indian Government Schemes (Manual High-Quality Additions)
        const featuredSchemes = [
            {
                id: 'Pradhan_Mantri_Kisan_Samman_Nidhi',
                slug: 'Pradhan_Mantri_Kisan_Samman_Nidhi',
                title: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
                link: 'https://en.wikipedia.org/wiki/Pradhan_Mantri_Kisan_Samman_Nidhi',
                ministry: 'Ministry of Agriculture & Farmers Welfare',
                description: 'Direct income support of ₹6,000 per year to all landholding farmer families in three equal installments.',
                tags: ['Income Support', 'Agriculture']
            },
            {
                id: 'Pradhan_Mantri_Fasal_Bima_Yojana',
                slug: 'Pradhan_Mantri_Fasal_Bima_Yojana',
                title: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
                link: 'https://en.wikipedia.org/wiki/Pradhan_Mantri_Fasal_Bima_Yojana',
                ministry: 'Ministry of Agriculture & Farmers Welfare',
                description: 'Lowest premium for farmers against all non-preventable natural risks from pre-sowing to post-harvest stage.',
                tags: ['Insurance', 'Crop Protection']
            },
            {
                id: 'Pradhan_Mantri_Krishi_Sinchayee_Yojana',
                slug: 'Pradhan_Mantri_Krishi_Sinchayee_Yojana',
                title: 'Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)',
                link: 'https://en.wikipedia.org/wiki/Pradhan_Mantri_Krishi_Sinchayee_Yojana',
                ministry: 'Ministry of Water Resources',
                description: 'Motto of "Har Khet Ko Pani" - focused on expanding cultivable area under assured irrigation and improving water use efficiency.',
                tags: ['Irrigation', 'Water Management']
            },
            {
                id: 'National_Mission_for_Sustainable_Agriculture',
                slug: 'National_Mission_for_Sustainable_Agriculture',
                title: 'National Mission for Sustainable Agriculture (NMSA)',
                link: 'https://en.wikipedia.org/wiki/National_Mission_for_Sustainable_Agriculture',
                ministry: 'Ministry of Agriculture & Farmers Welfare',
                description: 'Promoting sustainable agriculture through climate change adaptation, soil health management, and integrated farming.',
                tags: ['Sustainability', 'Soil Health']
            },
            {
                id: 'Soil_Health_Card_Scheme',
                slug: 'Soil_Health_Card_Scheme',
                title: 'Soil Health Card Scheme',
                link: 'https://en.wikipedia.org/wiki/Soil_Health_Card_Scheme',
                ministry: 'Ministry of Agriculture & Farmers Welfare',
                description: 'Issuance of soil health cards to farmers which will carry crop-wise recommendations of nutrients and fertilizers.',
                tags: ['Soil Health', 'Fertilizer']
            },
            {
                id: 'Paramparagat_Krishi_Vikas_Yojana',
                slug: 'Paramparagat_Krishi_Vikas_Yojana',
                title: 'Paramparagat Krishi Vikas Yojana (PKVY)',
                link: 'https://en.wikipedia.org/wiki/Paramparagat_Krishi_Vikas_Yojana',
                ministry: 'Ministry of Agriculture & Farmers Welfare',
                description: 'Supporting and promoting organic farming through cluster approach and Participatory Guarantee System (PGS) certification.',
                tags: ['Organic Farming', 'Sustainability']
            },
            {
                id: 'National_Agriculture_Market',
                slug: 'National_Agriculture_Market',
                title: 'eNAM (National Agriculture Market)',
                link: 'https://en.wikipedia.org/wiki/National_Agriculture_Market',
                ministry: 'Ministry of Agriculture & Farmers Welfare',
                description: 'Pan-India electronic trading portal which networks the existing APMC mandis to create a unified national market for agricultural commodities.',
                tags: ['Marketing', 'Digitization']
            },
            {
                id: 'Pradhan_Mantri_Matsya_Sampada_Yojana',
                slug: 'Pradhan_Mantri_Matsya_Sampada_Yojana',
                title: 'Pradhan Mantri Matsya Sampada Yojana (PMMSY)',
                link: 'https://en.wikipedia.org/wiki/Pradhan_Mantri_Matsya_Sampada_Yojana',
                ministry: 'Ministry of Fisheries, Animal Husbandry and Dairying',
                description: 'A flagship scheme for focused and sustainable development of fisheries sector in the country.',
                tags: ['Fisheries', 'Blue Revolution']
            },
            {
                id: 'National_Livestock_Mission',
                slug: 'National_Livestock_Mission',
                title: 'National Livestock Mission (NLM)',
                link: 'https://dahd.nic.in/schemes',
                ministry: 'Ministry of Fisheries, Animal Husbandry and Dairying',
                description: 'Sustainable development of livestock sector, focusing on improving availability of quality feed and fodder and risk management.',
                tags: ['Livestock', 'Animal Husbandry']
            },
            {
                id: 'Agriculture_Infrastructure_Fund',
                slug: 'Agriculture_Infrastructure_Fund',
                title: 'Agriculture Infrastructure Fund (AIF)',
                link: 'https://agriinfra.dac.gov.in/',
                ministry: 'Ministry of Agriculture & Farmers Welfare',
                description: 'Financing facility for investment in viable projects for post-harvest management infrastructure and community farming assets.',
                tags: ['Infrastructure', 'Agri-Credit']
            },
            {
                id: 'Kisan_Credit_Card_Scheme',
                slug: 'Kisan_Credit_Card_Scheme',
                title: 'Kisan Credit Card (KCC) Scheme',
                link: 'https://en.wikipedia.org/wiki/Kisan_Credit_Card_scheme',
                ministry: 'RBI / NABARD',
                description: 'Provides farmers with timely access to credit for cultivation and other needs at reasonable interest rates.',
                tags: ['Credit', 'Finance']
            },
            {
                id: 'PM_Kisan_SAMPADA_Yojana',
                slug: 'PM_Kisan_SAMPADA_Yojana',
                title: 'PM Kisan SAMPADA Yojana',
                link: 'https://mofpi.gov.in/Schemes/pradhan-mantri-kisan-sampada-yojana',
                ministry: 'Ministry of Food Processing Industries',
                description: 'Comprehensive package which will result in creation of modern infrastructure with efficient supply chain management.',
                tags: ['Food Processing', 'Supply Chain']
            },
            {
                id: 'National_Food_Security_Mission',
                slug: 'National_Food_Security_Mission',
                title: 'National Food Security Mission (NFSM)',
                link: 'https://www.nfsm.gov.in/',
                ministry: 'Ministry of Agriculture & Farmers Welfare',
                description: 'Increasing production of rice, wheat, pulses, and coarse cereals through area expansion and productivity enhancement.',
                tags: ['Production', 'Food Security']
            },
            {
                id: 'PM_AASHA_Scheme',
                slug: 'PM_AASHA_Scheme',
                title: 'PM-AASHA (Annadata Aay SanraksHan Abhiyan)',
                link: 'https://pib.gov.in/PressReleseDetail.aspx?PRID=1545831',
                ministry: 'Ministry of Agriculture & Farmers Welfare',
                description: 'An umbrella scheme that ensures Minimum Support Price (MSP) to farmers for pulses, oilseeds and copra.',
                tags: ['MSP', 'Income Support']
            },
            {
                id: 'Mission_for_Integrated_Development_of_Horticulture',
                slug: 'Mission_for_Integrated_Development_of_Horticulture',
                title: 'Mission for Integrated Development of Horticulture (MIDH)',
                link: 'https://midh.gov.in/',
                ministry: 'Ministry of Agriculture & Farmers Welfare',
                description: 'A centrally sponsored scheme for the holistic growth of the horticulture sector covering fruits, vegetables, root and tuber crops.',
                tags: ['Horticulture', 'Growth']
            },
            {
                id: 'National_Mission_on_Agricultural_Extension_and_Technology',
                slug: 'National_Mission_on_Agricultural_Extension_and_Technology',
                title: 'National Mission on Agricultural Extension and Technology (NMAET)',
                link: 'https://agricoop.nic.in/en/Schemes',
                ministry: 'Ministry of Agriculture & Farmers Welfare',
                description: 'Objective to make extension system farmer driven and farmer accountable by disseminating technology and improving farm mechanization.',
                tags: ['Extension', 'Technology']
            },
            {
                id: 'National_Mission_on_Oilseeds_and_Oil_Palm',
                slug: 'National_Mission_on_Oilseeds_and_Oil_Palm',
                title: 'National Mission on Oilseeds and Oil Palm (NMOOP)',
                link: 'https://nmoop.gov.in/',
                ministry: 'Ministry of Agriculture & Farmers Welfare',
                description: 'Aimed at augmenting the availability of vegetable oils and reducing the import of edible oils by increasing production.',
                tags: ['Oilseeds', 'Production']
            },
            {
                id: 'Integrated_Scheme_for_Agricultural_Marketing',
                slug: 'Integrated_Scheme_for_Agricultural_Marketing',
                title: 'Integrated Scheme for Agricultural Marketing (ISAM)',
                link: 'https://agricoop.nic.in/en/Schemes',
                ministry: 'Ministry of Agriculture & Farmers Welfare',
                description: 'Promoting creation of agricultural marketing infrastructure and providing marketing information network.',
                tags: ['Marketing', 'Infrastructure']
            },
            {
                id: 'National_Bee_and_Honey_Mission',
                slug: 'National_Bee_and_Honey_Mission',
                title: 'National Bee and Honey Mission (NBHM)',
                link: 'https://nbb.gov.in/',
                ministry: 'Ministry of Agriculture & Farmers Welfare',
                description: 'Keeping in view the importance of beekeeping as part of the Sweet Revolution, this mission aims to improve the beekeeping sector.',
                tags: ['Beekeeping', 'Honey']
            },
            {
                id: 'Rashtriya_Krishi_Vikas_Yojana',
                slug: 'Rashtriya_Krishi_Vikas_Yojana',
                title: 'Rashtriya Krishi Vikas Yojana (RKVY)',
                link: 'https://rkvy.nic.in/',
                ministry: 'Ministry of Agriculture & Farmers Welfare',
                description: 'Ensuring holistic development of agriculture and allied sectors by allowing states to choose their own agriculture and allied sector development activities.',
                tags: ['Development', 'States']
            },
            {
                id: 'Price_Support_Scheme',
                slug: 'Price_Support_Scheme',
                title: 'Price Support Scheme (PSS)',
                link: 'https://nafed-india.com/price-support-scheme',
                ministry: 'Ministry of Agriculture & Farmers Welfare / NAFED',
                description: 'Procurement of oilseeds, pulses and cotton at MSP when prices fall below the support price.',
                tags: ['MSP', 'Procurement']
            }
        ];

        // Merge and deduplicate
        const finalSchemes = [...featuredSchemes];
        agriSchemes.forEach(s => {
            if (!finalSchemes.find(fs => fs.slug === s.slug)) {
                finalSchemes.push(s);
            }
        });

        cachedSchemes = finalSchemes;
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
