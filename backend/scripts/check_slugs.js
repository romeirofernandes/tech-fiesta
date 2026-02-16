const axios = require('axios');

const checkSlugs = async () => {
    try {
        console.log('Fetching schemes list...');
        const res = await axios.get('http://localhost:8000/api/schemes');
        const schemes = res.data;
        console.log(`Fetched ${schemes.length} schemes.`);

        const badSlugs = schemes.filter(s => !s.slug || s.slug === 'undefined' || s.slug === 'null');

        if (badSlugs.length > 0) {
            console.log('FOUND BAD SLUGS:');
            badSlugs.forEach(s => {
                console.log(`- Title: ${s.title}, Slug: ${s.slug}, ID: ${s.id}`);
            });
        } else {
            console.log('All slugs look valid (no null/undefined/missing).');
        }

        // Log first 3 to verify structure
        console.log('Sample data:', schemes.slice(0, 3).map(s => ({ title: s.title, slug: s.slug })));

    } catch (err) {
        console.error('Error:', err.message);
    }
};

checkSlugs();
