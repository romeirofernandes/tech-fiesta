
const https = require('https');

const urls = [
    'https://www.myscheme.gov.in/api/v1/schemes',
    'https://www.myscheme.gov.in/search',
];

urls.forEach(url => {
    https.get(url, (res) => {
        console.log(`URL: ${url} - Status: ${res.statusCode}`);
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`URL: ${url} - Length: ${data.length}`);
            if (data.length < 500) console.log(data); // Print if short (likely error)
            else console.log(data.substring(0, 200) + '...'); // Print preview
        });
    }).on('error', err => {
        console.error(`URL: ${url} - Error: ${err.message}`);
    });
});
