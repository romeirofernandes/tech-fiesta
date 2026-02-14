
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeSchemeDetails(schemeUrl) {
    try {
        console.log(`Fetching details from ${schemeUrl}...`);
        const { data } = await axios.get(schemeUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);

        // Wikipedia structure:
        // Description: First few paragraphs of #mw-content-text > .mw-parser-output > p (not empty ones)
        // Infobox: table.infobox

        const title = $('h1#firstHeading').text().trim();
        const content = [];

        $('#mw-content-text .mw-parser-output > p').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 50 && content.length < 5) { // Grab first 5 substantial paragraphs
                content.push(text);
            }
        });

        const details = {
            title,
            description: content[0], // First paragraph as summary if needed
            fullDetails: content.join('\n\n'),
            source: schemeUrl
        };

        console.log('Scraped Details Preview:');
        console.log('Title:', details.title);
        console.log('Description Start:', details.description.substring(0, 100));
        console.log('Total Paragraphs:', content.length);

    } catch (error) {
        console.error('Error scraping details:', error.message);
    }
}

// Test with PM-KISAN
scrapeSchemeDetails('https://en.wikipedia.org/wiki/Pradhan_Mantri_Kisan_Samman_Nidhi');
