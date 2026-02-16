require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const Groq = require("groq-sdk");
const fs = require('fs');

const logBuffer = [];
const log = (msg) => {
    console.log(msg);
    logBuffer.push(typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg);
};

const debugScrape = async () => {
    const slug = 'Pradhan_Mantri_Kisan_Samman_Nidhi';
    const url = `https://en.wikipedia.org/wiki/${slug}`;
    log(`Debugging URL: ${url}`);

    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        log(`HTML Length: ${data.length}`);

        const title = $('h1#firstHeading').text().trim();
        log(`Title: ${title}`);

        // Check selectors
        const pTags = $('#mw-content-text .mw-parser-output > p');
        log(`Found ${pTags.length} paragraphs using primarily selector.`);

        const content = [];
        pTags.each((i, el) => {
            const text = $(el).text().trim().replace(/\[\d+\]/g, '');
            if (content.length < 3) {
                // log(`Para ${i} [Len: ${text.length}]: ${text.substring(0, 50)}...`);
            }
            if (text.length > 50 && content.length < 5) {
                content.push(text);
            }
        });

        log(`Extracted ${content.length} valid paragraphs.`);
        log('--- Content Sample ---');
        log(content.join('\n\n').substring(0, 200));

        // Test Groq
        if (process.env.GROQ_API_KEY && content.length > 0) {
            log('\n--- Testing Groq AI ---');
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
            const prompt = `Analyze: ${content.join('\n')}... (Extract benefits)`;

            try {
                const completion = await groq.chat.completions.create({
                    messages: [{ role: "user", content: prompt }],
                    model: "llama-3.3-70b-versatile",
                    max_tokens: 100
                });
                log("Groq Response Sample:");
                log(completion.choices[0]?.message?.content);
            } catch (err) {
                log("Groq Error: " + err.message);
            }
        } else {
            log('Skipping Groq (No Key or No Content)');
        }

    } catch (err) {
        log('Scrape Failed: ' + err.message);
    } finally {
        fs.writeFileSync('debug_file_log.txt', logBuffer.join('\n'), 'utf8');
        console.log('Written log to debug_file_log.txt');
    }
};

debugScrape();
