const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeVikaspedia() {
    try {
        const url = 'https://en.wikipedia.org/wiki/Agriculture_in_India'; // Or a more specific list if found
        // Better list:
        const url2 = 'https://en.wikipedia.org/wiki/List_of_government_schemes_in_India';
        console.log(`Fetching ${url2}...`);

        const { data } = await axios.get(url2, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        const $ = cheerio.load(data);

        console.log('Page title:', $('title').text());

        // Dump part of the HTML to see structure
        // console.log($('body').html().substring(0, 2000));

        const schemes = [];

        // Try a more generic selector to see what links exist
        $('a').each((i, el) => {
            const title = $(el).text().trim();
            const link = $(el).attr('href');
            // Filter for potential scheme links
            if (title && link && (link.includes('schemes') || link.includes('agriculture'))) {
                schemes.push({ title, link: link.startsWith('http') ? link : `https://vikaspedia.in${link}` });
            }
        });

        console.log(`Found ${schemes.length} potential scheme categories/items.`);
        if (schemes.length > 0) {
            console.log("First 5 schemes found:");
            console.log(schemes.slice(0, 5));
        } else {
            console.log("No schemes found with current selector. Dumping body snippet:");
            console.log($('body').html().substring(0, 1000));
        }

    } catch (error) {
        console.error('Error scraping:', error.message);
    }
}

scrapeVikaspedia();
