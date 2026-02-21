const nodemailer = require('nodemailer');
const Animal = require('../models/Animal');
const Farm = require('../models/Farm');
const Farmer = require('../models/Farmer');

// ─── SMTP Transporter ────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: false, // STARTTLS on port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify SMTP connection on startup
transporter.verify()
  .then(() => console.log('✅ SMTP email service ready'))
  .catch((err) => console.error('❌ SMTP connection failed:', err.message));

// ─── Translations ────────────────────────────────────────────────────
const translations = {
  en: {
    subject: {
      health: '🚨 Health Alert for {animalName}',
      vaccination: '💉 Vaccination Alert for {animalName}',
      inactivity: '😴 Inactivity Alert for {animalName}',
      geofence: '📍 Geofence Alert for {animalName}',
    },
    heading: 'Alert Notification',
    subtitle: 'An alert has been generated for one of your animals.',
    alertType: 'Alert Type',
    severity: 'Severity',
    animal: 'Animal',
    rfid: 'RFID Tag',
    farm: 'Farm',
    message: 'Details',
    time: 'Detected At',
    ctaText: 'View Dashboard',
    footer: 'Protecting your livestock, always.',
    footerSub: 'You received this email because an alert was triggered on your पशु पहचान account.',
    typeLabels: { health: 'Health', vaccination: 'Vaccination', inactivity: 'Inactivity', geofence: 'Geofence Breach' },
    severityLabels: { high: 'Critical', medium: 'Warning', low: 'Info' },
    greeting: 'Hello {farmerName},',
  },
  hi: {
    subject: {
      health: '🚨 {animalName} के लिए स्वास्थ्य चेतावनी',
      vaccination: '💉 {animalName} के लिए टीकाकरण चेतावनी',
      inactivity: '😴 {animalName} के लिए निष्क्रियता चेतावनी',
      geofence: '📍 {animalName} के लिए जियोफेंस चेतावनी',
    },
    heading: 'चेतावनी सूचना',
    subtitle: 'आपके किसी पशु के लिए एक चेतावनी उत्पन्न हुई है।',
    alertType: 'चेतावनी प्रकार',
    severity: 'गंभीरता',
    animal: 'पशु',
    rfid: 'RFID टैग',
    farm: 'फार्म',
    message: 'विवरण',
    time: 'पता चला',
    ctaText: 'डैशबोर्ड देखें',
    footer: 'आपके पशुधन की रक्षा, हमेशा।',
    footerSub: 'आपको यह ईमेल इसलिए मिला क्योंकि आपके पशु पहचान खाते पर एक चेतावनी ट्रिगर हुई।',
    typeLabels: { health: 'स्वास्थ्य', vaccination: 'टीकाकरण', inactivity: 'निष्क्रियता', geofence: 'जियोफेंस उल्लंघन' },
    severityLabels: { high: 'गंभीर', medium: 'चेतावनी', low: 'सूचना' },
    greeting: 'नमस्ते {farmerName},',
  },
  bn: {
    subject: {
      health: '🚨 {animalName}-এর জন্য স্বাস্থ্য সতর্কতা',
      vaccination: '💉 {animalName}-এর জন্য টিকাকরণ সতর্কতা',
      inactivity: '😴 {animalName}-এর জন্য নিষ্ক্রিয়তা সতর্কতা',
      geofence: '📍 {animalName}-এর জন্য জিওফেন্স সতর্কতা',
    },
    heading: 'সতর্কতা বিজ্ঞপ্তি',
    subtitle: 'আপনার একটি পশুর জন্য একটি সতর্কতা তৈরি হয়েছে।',
    alertType: 'সতর্কতার ধরন',
    severity: 'তীব্রতা',
    animal: 'পশু',
    rfid: 'RFID ট্যাগ',
    farm: 'খামার',
    message: 'বিবরণ',
    time: 'সনাক্ত হয়েছে',
    ctaText: 'ড্যাশবোর্ড দেখুন',
    footer: 'আপনার পশুসম্পদ রক্ষা, সর্বদা।',
    footerSub: 'আপনি এই ইমেলটি পেয়েছেন কারণ আপনার পশু পहচান অ্যাকাউন্টে একটি সতর্কতা ট্রিগার হয়েছে।',
    typeLabels: { health: 'স্বাস্থ্য', vaccination: 'টিকাকরণ', inactivity: 'নিষ্ক্রিয়তা', geofence: 'জিওফেন্স লঙ্ঘন' },
    severityLabels: { high: 'গুরুতর', medium: 'সতর্কতা', low: 'তথ্য' },
    greeting: 'হ্যালো {farmerName},',
  },
  te: {
    subject: {
      health: '🚨 {animalName} కోసం ఆరోగ్య హెచ్చరిక',
      vaccination: '💉 {animalName} కోసం టీకాకరణ హెచ్చరిక',
      inactivity: '😴 {animalName} కోసం నిష్క్రియత హెచ్చరిక',
      geofence: '📍 {animalName} కోసం జియోఫెన్స్ హెచ్చరిక',
    },
    heading: 'హెచ్చరిక నోటిఫికేషన్',
    subtitle: 'మీ పశువులలో ఒకదాని కోసం హెచ్చరిక రూపొందించబడింది.',
    alertType: 'హెచ్చరిక రకం',
    severity: 'తీవ్రత',
    animal: 'పశువు',
    rfid: 'RFID ట్యాగ్',
    farm: 'పొలం',
    message: 'వివరాలు',
    time: 'గుర్తించబడింది',
    ctaText: 'డాష్‌బోర్డ్ చూడండి',
    footer: 'మీ పశువులను రక్షించడం, ఎల్లప్పుడూ.',
    footerSub: 'మీ పశు పహచాన్ ఖాతాలో హెచ్చరిక ట్రిగ్గర్ కాబట్టి మీకు ఈ ఇమెయిల్ వచ్చింది.',
    typeLabels: { health: 'ఆరోగ్యం', vaccination: 'టీకాకరణ', inactivity: 'నిష్క్రియత', geofence: 'జియోఫెన్స్ ఉల్లంఘన' },
    severityLabels: { high: 'క్రిటికల్', medium: 'హెచ్చరిక', low: 'సమాచారం' },
    greeting: 'హలో {farmerName},',
  },
  mr: {
    subject: {
      health: '🚨 {animalName} साठी आरोग्य सूचना',
      vaccination: '💉 {animalName} साठी लसीकरण सूचना',
      inactivity: '😴 {animalName} साठी निष्क्रियता सूचना',
      geofence: '📍 {animalName} साठी जिओफेन्स सूचना',
    },
    heading: 'सूचना अधिसूचना',
    subtitle: 'तुमच्या एका प्राण्यासाठी सूचना तयार झाली आहे.',
    alertType: 'सूचना प्रकार',
    severity: 'तीव्रता',
    animal: 'प्राणी',
    rfid: 'RFID टॅग',
    farm: 'शेत',
    message: 'तपशील',
    time: 'आढळले',
    ctaText: 'डॅशबोर्ड पहा',
    footer: 'तुमच्या पशुधनाचे रक्षण, नेहमीच.',
    footerSub: 'तुमच्या पशु पहचान खात्यावर सूचना ट्रिगर झाल्यामुळे तुम्हाला हा ईमेल प्राप्त झाला.',
    typeLabels: { health: 'आरोग्य', vaccination: 'लसीकरण', inactivity: 'निष्क्रियता', geofence: 'जिओफेन्स उल्लंघन' },
    severityLabels: { high: 'गंभीर', medium: 'चेतावणी', low: 'माहिती' },
    greeting: 'नमस्कार {farmerName},',
  },
  ta: {
    subject: {
      health: '🚨 {animalName} க்கான உடல்நல எச்சரிக்கை',
      vaccination: '💉 {animalName} க்கான தடுப்பூசி எச்சரிக்கை',
      inactivity: '😴 {animalName} க்கான செயலற்ற எச்சரிக்கை',
      geofence: '📍 {animalName} க்கான ஜியோஃபென்ஸ் எச்சரிக்கை',
    },
    heading: 'எச்சரிக்கை அறிவிப்பு',
    subtitle: 'உங்கள் கால்நடைகளில் ஒன்றுக்கு எச்சரிக்கை உருவாக்கப்பட்டது.',
    alertType: 'எச்சரிக்கை வகை',
    severity: 'தீவிரம்',
    animal: 'கால்நடை',
    rfid: 'RFID குறிச்சொல்',
    farm: 'பண்ணை',
    message: 'விவரங்கள்',
    time: 'கண்டறியப்பட்டது',
    ctaText: 'டாஷ்போர்டைக் காண்க',
    footer: 'உங்கள் கால்நடைகளைப் பாதுகாத்தல், எப்போதும்.',
    footerSub: 'உங்கள் பசு பஹ்சான் கணக்கில் எச்சரிக்கை தூண்டப்பட்டதால் இந்த மின்னஞ்சலைப் பெற்றீர்கள்.',
    typeLabels: { health: 'உடல்நலம்', vaccination: 'தடுப்பூசி', inactivity: 'செயலற்ற நிலை', geofence: 'ஜியோஃபென்ஸ் மீறல்' },
    severityLabels: { high: 'முக்கியமான', medium: 'எச்சரிக்கை', low: 'தகவல்' },
    greeting: 'வணக்கம் {farmerName},',
  },
  gu: {
    subject: {
      health: '🚨 {animalName} માટે આરોગ્ય ચેતવણી',
      vaccination: '💉 {animalName} માટે રસીકરણ ચેતવણી',
      inactivity: '😴 {animalName} માટે નિષ্ক્રિયતા ચેતવણી',
      geofence: '📍 {animalName} માટે જીયોફેન્સ ચેતવણી',
    },
    heading: 'ચેતવણી સૂચના',
    subtitle: 'તમારા એક પશુ માટે ચેતવણી ઉત્પન્ન થઈ છે.',
    alertType: 'ચેતવણી પ્રકાર',
    severity: 'ગંભીરતા',
    animal: 'પશુ',
    rfid: 'RFID ટેગ',
    farm: 'ફાર્મ',
    message: 'વિગતો',
    time: 'શોધાયેલ',
    ctaText: 'ડેશબોર્ડ જુઓ',
    footer: 'તમારા પશુધનનું રક્ષણ, હંમેશા.',
    footerSub: 'તમારા પશુ પહચાન ખાતા પર ચેતવણી ટ્રિગર થવાથી તમને આ ઈમેલ મળ્યો.',
    typeLabels: { health: 'આરોગ્ય', vaccination: 'રસીકરણ', inactivity: 'નિષ્ક્રિયતા', geofence: 'જીયોફેન્સ ભંગ' },
    severityLabels: { high: 'ગંભીર', medium: 'ચેતવણી', low: 'માહિતી' },
    greeting: 'નમસ્તે {farmerName},',
  },
  kn: {
    subject: {
      health: '🚨 {animalName} ಗಾಗಿ ಆರೋಗ್ಯ ಎಚ್ಚರಿಕೆ',
      vaccination: '💉 {animalName} ಗಾಗಿ ಲಸಿಕೆ ಎಚ್ಚರಿಕೆ',
      inactivity: '😴 {animalName} ಗಾಗಿ ನಿಷ್ಕ್ರಿಯ ಎಚ್ಚರಿಕೆ',
      geofence: '📍 {animalName} ಗಾಗಿ ಜಿಯೋಫೆನ್ಸ್ ಎಚ್ಚರಿಕೆ',
    },
    heading: 'ಎಚ್ಚರಿಕೆ ಅಧಿಸೂಚನೆ',
    subtitle: 'ನಿಮ್ಮ ಒಂದು ಪ್ರಾಣಿಗಾಗಿ ಎಚ್ಚರಿಕೆ ರೂಪಿಸಲಾಗಿದೆ.',
    alertType: 'ಎಚ್ಚರಿಕೆ ಪ್ರಕಾರ',
    severity: 'ತೀವ್ರತೆ',
    animal: 'ಪ್ರಾಣಿ',
    rfid: 'RFID ಟ್ಯಾಗ್',
    farm: 'ಫಾರ್ಮ್',
    message: 'ವಿವರಗಳು',
    time: 'ಪತ್ತೆಯಾಗಿದೆ',
    ctaText: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ವೀಕ್ಷಿಸಿ',
    footer: 'ನಿಮ್ಮ ಜಾನುವಾರುಗಳ ರಕ್ಷಣೆ, ಯಾವಾಗಲೂ.',
    footerSub: 'ನಿಮ್ಮ ಪಶು ಪಹಚಾನ್ ಖಾತೆಯಲ್ಲಿ ಎಚ್ಚರಿಕೆ ಟ್ರಿಗ್ಗರ್ ಆಗಿರುವುದರಿಂದ ನೀವು ಈ ಇಮೇಲ್ ಸ್ವೀಕರಿಸಿದ್ದೀರಿ.',
    typeLabels: { health: 'ಆರೋಗ್ಯ', vaccination: 'ಲಸಿಕೆ', inactivity: 'ನಿಷ್ಕ್ರಿಯತೆ', geofence: 'ಜಿಯೋಫೆನ್ಸ್ ಉಲ್ಲಂಘನೆ' },
    severityLabels: { high: 'ಗಂಭೀರ', medium: 'ಎಚ್ಚರಿಕೆ', low: 'ಮಾಹಿತಿ' },
    greeting: 'ನಮಸ್ಕಾರ {farmerName},',
  },
  ml: {
    subject: {
      health: '🚨 {animalName}-ന്റെ ആരോഗ്യ മുന്നറിയിപ്പ്',
      vaccination: '💉 {animalName}-ന്റെ വാക്സിനേഷൻ മുന്നറിയിപ്പ്',
      inactivity: '😴 {animalName}-ന്റെ നിഷ്ക്രിയ മുന്നറിയിപ്പ്',
      geofence: '📍 {animalName}-ന്റെ ജിയോഫെൻസ് മുന്നറിയിപ്പ്',
    },
    heading: 'മുന്നറിയിപ്പ് അറിയിപ്പ്',
    subtitle: 'നിങ്ങളുടെ ഒരു മൃഗത്തിന് മുന്നറിയിപ്പ് ഉണ്ടാക്കി.',
    alertType: 'മുന്നറിയിപ്പ് തരം',
    severity: 'തീവ്രത',
    animal: 'മൃഗം',
    rfid: 'RFID ടാഗ്',
    farm: 'ഫാം',
    message: 'വിശദാംശങ്ങൾ',
    time: 'കണ്ടെത്തി',
    ctaText: 'ഡാഷ്ബോർഡ് കാണുക',
    footer: 'നിങ്ങളുടെ കന്നുകാലികളെ സംരക്ഷിക്കൽ, എപ്പോഴും.',
    footerSub: 'നിങ്ങളുടെ പശു പഹ്ചാൻ അക്കൗണ്ടിൽ ഒരു മുന്നറിയിപ്പ് ട്രിഗർ ചെയ്തതിനാൽ ഈ ഇമെയിൽ ലഭിച്ചു.',
    typeLabels: { health: 'ആരോഗ്യം', vaccination: 'വാക്സിനേഷൻ', inactivity: 'നിഷ്ക്രിയത', geofence: 'ജിയോഫെൻസ് ലംഘനം' },
    severityLabels: { high: 'ഗുരുതരം', medium: 'മുന്നറിയിപ്പ്', low: 'വിവരം' },
    greeting: 'ഹലോ {farmerName},',
  },
  pa: {
    subject: {
      health: '🚨 {animalName} ਲਈ ਸਿਹਤ ਚੇਤਾਵਨੀ',
      vaccination: '💉 {animalName} ਲਈ ਟੀਕਾਕਰਨ ਚੇਤਾਵਨੀ',
      inactivity: '😴 {animalName} ਲਈ ਨਿਸ਼ਕ੍ਰਿਯਤਾ ਚੇਤਾਵਨੀ',
      geofence: '📍 {animalName} ਲਈ ਜੀਓਫੈਂਸ ਚੇਤਾਵਨੀ',
    },
    heading: 'ਚੇਤਾਵਨੀ ਸੂਚਨਾ',
    subtitle: 'ਤੁਹਾਡੇ ਇੱਕ ਪਸ਼ੂ ਲਈ ਚੇਤਾਵਨੀ ਪੈਦਾ ਹੋਈ ਹੈ।',
    alertType: 'ਚੇਤਾਵਨੀ ਕਿਸਮ',
    severity: 'ਗੰਭੀਰਤਾ',
    animal: 'ਪਸ਼ੂ',
    rfid: 'RFID ਟੈਗ',
    farm: 'ਫਾਰਮ',
    message: 'ਵੇਰਵੇ',
    time: 'ਖੋਜਿਆ ਗਿਆ',
    ctaText: 'ਡੈਸ਼ਬੋਰਡ ਵੇਖੋ',
    footer: 'ਤੁਹਾਡੇ ਪਸ਼ੂਧਨ ਦੀ ਰੱਖਿਆ, ਹਮੇਸ਼ਾ।',
    footerSub: 'ਤੁਹਾਡੇ ਪਸ਼ੂ ਪਹਚਾਨ ਖਾਤੇ ਤੇ ਚੇਤਾਵਨੀ ਟ੍ਰਿਗਰ ਹੋਣ ਕਾਰਨ ਤੁਹਾਨੂੰ ਇਹ ਈਮੇਲ ਮਿਲੀ।',
    typeLabels: { health: 'ਸਿਹਤ', vaccination: 'ਟੀਕਾਕਰਨ', inactivity: 'ਨਿਸ਼ਕ੍ਰਿਯਤਾ', geofence: 'ਜੀਓਫੈਂਸ ਉਲੰਘਣ' },
    severityLabels: { high: 'ਗੰਭੀਰ', medium: 'ਚੇਤਾਵਨੀ', low: 'ਜਾਣਕਾਰੀ' },
    greeting: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ {farmerName},',
  },
  or: {
    subject: {
      health: '🚨 {animalName} ପାଇଁ ସ୍ୱାସ୍ଥ୍ୟ ସତର୍କତା',
      vaccination: '💉 {animalName} ପାଇଁ ଟୀକାକରଣ ସତର୍କତା',
      inactivity: '😴 {animalName} ପାଇଁ ନିଷ୍କ୍ରିୟତା ସତର୍କତା',
      geofence: '📍 {animalName} ପାଇଁ ଜିଓଫେନ୍ସ ସତର୍କତା',
    },
    heading: 'ସତର୍କତା ବିଜ୍ଞପ୍ତି',
    subtitle: 'ଆପଣଙ୍କ ଏକ ପଶୁ ପାଇଁ ସତର୍କତା ସୃଷ୍ଟି ହୋଇଛି।',
    alertType: 'ସତର୍କତା ପ୍ରକାର',
    severity: 'ତୀବ୍ରତା',
    animal: 'ପଶୁ',
    rfid: 'RFID ଟ୍ୟାଗ୍',
    farm: 'ଫାର୍ମ',
    message: 'ବିବରଣୀ',
    time: 'ଚିହ୍ନଟ ହୋଇଛି',
    ctaText: 'ଡ୍ୟାସବୋର୍ଡ ଦେଖନ୍ତୁ',
    footer: 'ଆପଣଙ୍କ ପଶୁଧନ ସୁରକ୍ଷା, ସବୁଦିନ।',
    footerSub: 'ଆପଣଙ୍କ ପଶୁ ପହଚାନ ଆକାଉଣ୍ଟରେ ସତର୍କତା ଟ୍ରିଗର ହୋଇଥିବାରୁ ଆପଣ ଏହି ଇମେଲ ପାଇଲେ।',
    typeLabels: { health: 'ସ୍ୱାସ୍ଥ୍ୟ', vaccination: 'ଟୀକାକରଣ', inactivity: 'ନିଷ୍କ୍ରିୟତା', geofence: 'ଜିଓଫେନ୍ସ ଉଲ୍ଲଂଘନ' },
    severityLabels: { high: 'ଗମ୍ଭୀର', medium: 'ସତର୍କତା', low: 'ସୂଚନା' },
    greeting: 'ନମସ୍କାର {farmerName},',
  },
  as: {
    subject: {
      health: '🚨 {animalName}-ৰ বাবে স্বাস্থ্য সতৰ্কতা',
      vaccination: '💉 {animalName}-ৰ বাবে টীকাকৰণ সতৰ্কতা',
      inactivity: '😴 {animalName}-ৰ বাবে নিষ্ক্ৰিয়তা সতৰ্কতা',
      geofence: "📍 {animalName}-ৰ বাবে জিঅ'ফেন্স সতৰ্কতা",
    },
    heading: 'সতৰ্কতা জাননী',
    subtitle: 'আপোনাৰ এটা পশুৰ বাবে সতৰ্কতা সৃষ্টি হৈছে।',
    alertType: 'সতৰ্কতাৰ প্ৰকাৰ',
    severity: 'তীব্ৰতা',
    animal: 'পশু',
    rfid: 'RFID টেগ',
    farm: 'ফাৰ্ম',
    message: 'বিৱৰণ',
    time: 'ধৰা পৰিছে',
    ctaText: "ডেশ্বব'ৰ্ড চাওক",
    footer: 'আপোনাৰ পশুধনৰ সুৰক্ষা, সদায়।',
    footerSub: 'আপোনাৰ পশু পহচান একাউণ্টত সতৰ্কতা ট্ৰিগাৰ হোৱাৰ বাবে এই ইমেইল পাইছে।',
    typeLabels: { health: 'স্বাস্থ্য', vaccination: 'টীকাকৰণ', inactivity: 'নিষ্ক্ৰিয়তা', geofence: "জিঅ'ফেন্স উলংঘন" },
    severityLabels: { high: 'গুৰুতৰ', medium: 'সতৰ্কতা', low: 'তথ্য' },
    greeting: 'নমস্কাৰ {farmerName},',
  },
  ur: {
    subject: {
      health: '🚨 {animalName} کے لیے صحت کی وارننگ',
      vaccination: '💉 {animalName} کے لیے ویکسینیشن وارننگ',
      inactivity: '😴 {animalName} کے لیے غیر فعالیت وارننگ',
      geofence: '📍 {animalName} کے لیے جیو فینس وارننگ',
    },
    heading: 'وارننگ نوٹیفکیشن',
    subtitle: 'آپ کے ایک جانور کے لیے وارننگ تیار ہوئی ہے۔',
    alertType: 'وارننگ کی قسم',
    severity: 'شدت',
    animal: 'جانور',
    rfid: 'RFID ٹیگ',
    farm: 'فارم',
    message: 'تفصیلات',
    time: 'دریافت ہوا',
    ctaText: 'ڈیش بورڈ دیکھیں',
    footer: 'آپ کے مویشیوں کی حفاظت، ہمیشہ۔',
    footerSub: 'آپ کو یہ ای میل اس لیے ملی کیونکہ آپ کے پشو پہچان اکاؤنٹ پر وارننگ ٹرگر ہوئی۔',
    typeLabels: { health: 'صحت', vaccination: 'ویکسینیشن', inactivity: 'غیر فعالیت', geofence: 'جیو فینس خلاف ورزی' },
    severityLabels: { high: 'سنگین', medium: 'وارننگ', low: 'معلومات' },
    greeting: '{farmerName} کو سلام,',
  },
  sa: {
    subject: {
      health: '🚨 {animalName} कृते आरोग्य सूचना',
      vaccination: '💉 {animalName} कृते वाक्सिनेशन सूचना',
      inactivity: '😴 {animalName} कृते निष्क्रियता सूचना',
      geofence: '📍 {animalName} कृते जियोफेन्स सूचना',
    },
    heading: 'सूचना अधिसूचना',
    subtitle: 'भवतः एकस्य पशोः कृते सूचना उत्पन्ना अस्ति।',
    alertType: 'सूचना प्रकारः',
    severity: 'तीव्रता',
    animal: 'पशुः',
    rfid: 'RFID चिह्नम्',
    farm: 'क्षेत्रम्',
    message: 'विवरणम्',
    time: 'ज्ञातम्',
    ctaText: 'डैशबोर्ड पश्यतु',
    footer: 'भवतः पशूनाम् रक्षणम्, सर्वदा।',
    footerSub: 'भवतः पशु पहचान खाते सूचना प्रेरिता इति कारणात् एषः ईमेल प्राप्तः।',
    typeLabels: { health: 'आरोग्यम्', vaccination: 'वाक्सिनेशन', inactivity: 'निष्क्रियता', geofence: 'जियोफेन्स उल्लंघनम्' },
    severityLabels: { high: 'गम्भीरम्', medium: 'सूचना', low: 'सूचना' },
    greeting: 'नमः {farmerName},',
  },
  ar: {
    subject: {
      health: '🚨 تنبيه صحي لـ {animalName}',
      vaccination: '💉 تنبيه تطعيم لـ {animalName}',
      inactivity: '😴 تنبيه خمول لـ {animalName}',
      geofence: '📍 تنبيه سياج جغرافي لـ {animalName}',
    },
    heading: 'إشعار تنبيه',
    subtitle: 'تم إنشاء تنبيه لأحد حيواناتك.',
    alertType: 'نوع التنبيه',
    severity: 'الخطورة',
    animal: 'الحيوان',
    rfid: 'علامة RFID',
    farm: 'المزرعة',
    message: 'التفاصيل',
    time: 'تم الكشف',
    ctaText: 'عرض لوحة المعلومات',
    footer: 'حماية ماشيتك، دائمًا.',
    footerSub: 'تلقيت هذا البريد الإلكتروني لأنه تم تشغيل تنبيه على حساب पशु पहचان الخاص بك.',
    typeLabels: { health: 'صحة', vaccination: 'تطعيم', inactivity: 'خمول', geofence: 'خرق السياج الجغرافي' },
    severityLabels: { high: 'حرج', medium: 'تحذير', low: 'معلومات' },
    greeting: 'مرحبًا {farmerName}،',
  },
};

function t(lang) {
  return translations[lang] || translations['en'];
}

// ─── Severity Styling ────────────────────────────────────────────────
const severityColors = {
  high: { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA', icon: '🔴', accent: '#DC2626' },
  medium: { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', icon: '🟡', accent: '#D97706' },
  low: { bg: '#DBEAFE', text: '#2563EB', border: '#BFDBFE', icon: '🔵', accent: '#2563EB' },
};

const typeIcons = {
  health: '🩺',
  vaccination: '💉',
  inactivity: '😴',
  geofence: '📍',
};

// ─── HTML Email Template ─────────────────────────────────────────────
function buildAlertEmailHTML({ alert, animal, farm, farmer, lang = 'en' }) {
  const i18n = t(lang);
  const sev = severityColors[alert.severity] || severityColors.medium;
  const typeIcon = typeIcons[alert.type] || '⚠️';
  const typeLabel = i18n.typeLabels[alert.type] || alert.type;
  const sevLabel = i18n.severityLabels[alert.severity] || alert.severity;
  const animalName = animal?.name || 'Unknown';
  const animalRfid = animal?.rfid || '—';
  const animalSpecies = animal?.species || '';
  const farmName = farm?.name || '—';
  const farmerName = farmer?.fullName || 'Farmer';
  const greeting = i18n.greeting.replace('{farmerName}', farmerName);
  const alertTime = new Date(alert.createdAt).toLocaleString(lang === 'en' ? 'en-IN' : `${lang}-IN`, {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  // Direction for RTL languages
  const isRTL = ['ar', 'ur'].includes(lang);
  const dir = isRTL ? 'rtl' : 'ltr';
  const align = isRTL ? 'right' : 'left';

  return `
<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${i18n.heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#F7F6F3;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F6F3;padding:32px 16px;">
    <tr>
      <td align="center">

        <!-- Main container -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

          <!-- ═══ Header ═══ -->
          <tr>
            <td style="background: linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #388E3C 100%); padding:32px 40px; text-align:center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align:center;">
                    <div style="font-size:36px;line-height:1;margin-bottom:8px;">🐄</div>
                    <h1 style="margin:0;font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:0.5px;font-family:'Segoe UI',Roboto,sans-serif;">
                      पशु पहचान
                    </h1>
                    <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.75);letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">
                      Livestock Management System
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══ Severity Banner ═══ -->
          <tr>
            <td style="background-color:${sev.bg};border-bottom:2px solid ${sev.border};padding:16px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align:center;">
                    <span style="font-size:20px;vertical-align:middle;">${sev.icon}</span>
                    <span style="font-size:16px;font-weight:700;color:${sev.text};vertical-align:middle;margin-${isRTL ? 'right' : 'left'}:8px;letter-spacing:0.3px;">
                      ${sevLabel.toUpperCase()}
                    </span>
                    <span style="font-size:14px;color:${sev.text};vertical-align:middle;margin-${isRTL ? 'right' : 'left'}:8px;opacity:0.8;">
                      — ${typeIcon} ${typeLabel}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══ Body ═══ -->
          <tr>
            <td style="padding:32px 40px 16px;text-align:${align};">
              <!-- Greeting -->
              <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#2E2C28;">
                ${greeting}
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#7A7770;line-height:1.5;">
                ${i18n.subtitle}
              </p>

              <!-- Alert Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF8;border:1px solid #EEEDEB;border-radius:12px;overflow:hidden;">

                <!-- Animal Info Row -->
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid #EEEDEB;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align:${align};">
                          <div style="font-size:12px;font-weight:600;color:#7A7770;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">
                            ${i18n.animal}
                          </div>
                          <div style="font-size:20px;font-weight:700;color:#2E2C28;">
                            ${animalName}
                            ${animalSpecies ? `<span style="font-size:13px;font-weight:400;color:#7A7770;margin-${isRTL ? 'right' : 'left'}:6px;">(${animalSpecies})</span>` : ''}
                          </div>
                        </td>
                        <td style="text-align:${isRTL ? 'left' : 'right'};vertical-align:top;">
                          <div style="display:inline-block;background-color:#EEEDEB;border-radius:8px;padding:6px 12px;">
                            <span style="font-size:11px;font-weight:600;color:#7A7770;letter-spacing:0.5px;">${i18n.rfid}</span><br/>
                            <span style="font-size:13px;font-weight:700;color:#2E2C28;font-family:monospace;">${animalRfid}</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Details Grid -->
                <tr>
                  <td style="padding:0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <!-- Farm Row -->
                      <tr>
                        <td style="padding:14px 24px;border-bottom:1px solid #EEEDEB;width:40%;">
                          <div style="font-size:11px;font-weight:600;color:#7A7770;text-transform:uppercase;letter-spacing:1px;">${i18n.farm}</div>
                        </td>
                        <td style="padding:14px 24px;border-bottom:1px solid #EEEDEB;">
                          <div style="font-size:14px;font-weight:500;color:#2E2C28;">🏡 ${farmName}</div>
                        </td>
                      </tr>
                      <!-- Alert Type Row -->
                      <tr>
                        <td style="padding:14px 24px;border-bottom:1px solid #EEEDEB;">
                          <div style="font-size:11px;font-weight:600;color:#7A7770;text-transform:uppercase;letter-spacing:1px;">${i18n.alertType}</div>
                        </td>
                        <td style="padding:14px 24px;border-bottom:1px solid #EEEDEB;">
                          <div style="font-size:14px;font-weight:500;color:#2E2C28;">${typeIcon} ${typeLabel}</div>
                        </td>
                      </tr>
                      <!-- Severity Row -->
                      <tr>
                        <td style="padding:14px 24px;border-bottom:1px solid #EEEDEB;">
                          <div style="font-size:11px;font-weight:600;color:#7A7770;text-transform:uppercase;letter-spacing:1px;">${i18n.severity}</div>
                        </td>
                        <td style="padding:14px 24px;border-bottom:1px solid #EEEDEB;">
                          <span style="display:inline-block;background-color:${sev.bg};color:${sev.text};font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;border:1px solid ${sev.border};">
                            ${sev.icon} ${sevLabel}
                          </span>
                        </td>
                      </tr>
                      <!-- Time Row -->
                      <tr>
                        <td style="padding:14px 24px;border-bottom:1px solid #EEEDEB;">
                          <div style="font-size:11px;font-weight:600;color:#7A7770;text-transform:uppercase;letter-spacing:1px;">${i18n.time}</div>
                        </td>
                        <td style="padding:14px 24px;border-bottom:1px solid #EEEDEB;">
                          <div style="font-size:14px;font-weight:500;color:#2E2C28;">🕐 ${alertTime}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Message Box -->
                <tr>
                  <td style="padding:20px 24px;">
                    <div style="font-size:11px;font-weight:600;color:#7A7770;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
                      ${i18n.message}
                    </div>
                    <div style="background-color:#FFFFFF;border:1px solid #EEEDEB;border-${isRTL ? 'right' : 'left'}:4px solid ${sev.accent};border-radius:8px;padding:16px;font-size:14px;line-height:1.6;color:#2E2C28;">
                      ${alert.message}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══ CTA Button ═══ -->
          <tr>
            <td style="padding:8px 40px 32px;text-align:center;">
              <a href="${process.env.FRONTEND_URL || 'https://your-app.vercel.app'}/alerts"
                 style="display:inline-block;background:linear-gradient(135deg,#1B5E20,#2E7D32);color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:10px;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(27,94,32,0.3);">
                ${i18n.ctaText} →
              </a>
            </td>
          </tr>

          <!-- ═══ Divider ═══ -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background-color:#EEEDEB;"></div>
            </td>
          </tr>

          <!-- ═══ Footer ═══ -->
          <tr>
            <td style="padding:24px 40px 32px;text-align:center;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1B5E20;">
                🐄 पशु पहचान
              </p>
              <p style="margin:0 0 12px;font-size:13px;color:#7A7770;">
                ${i18n.footer}
              </p>
              <p style="margin:0;font-size:11px;color:#A8A49E;line-height:1.5;">
                ${i18n.footerSub}
              </p>
            </td>
          </tr>

        </table>
        <!-- End main container -->

      </td>
    </tr>
  </table>
  <!-- End outer wrapper -->

</body>
</html>`;
}

// ─── Lookup farmer from an alert's animalId ──────────────────────────
async function lookupAlertContext(animalId) {
  try {
    const animal = await Animal.findById(animalId).populate('farmId', 'name location');
    if (!animal) return { animal: null, farm: null, farmer: null };

    const farm = animal.farmId || null;
    let farmer = null;

    if (farm) {
      farmer = await Farmer.findOne({ farms: farm._id });
    }

    return { animal, farm, farmer };
  } catch (err) {
    console.error('Email context lookup failed:', err.message);
    return { animal: null, farm: null, farmer: null };
  }
}

// ─── Send Alert Email ────────────────────────────────────────────────
/**
 * Send an email notification for a newly created alert.
 * @param {Object} alert - The alert document (with animalId, type, severity, message, createdAt)
 * @param {string} [language='en'] - Language code for the email
 */
async function sendAlertEmail(alert, language = 'en') {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('⚠️  SMTP not configured, skipping email');
      return;
    }

    const { animal, farm, farmer } = await lookupAlertContext(alert.animalId);

    if (!farmer || !farmer.email) {
      console.log(`⚠️  No farmer email found for alert ${alert._id}, skipping email`);
      return;
    }

    // Use farmer's preferred language, or the one passed from the frontend
    const lang = farmer.preferredLanguage || language || 'en';
    const i18n = t(lang);
    const animalName = animal?.name || 'Unknown';

    const subject = (i18n.subject[alert.type] || i18n.subject.health)
      .replace('{animalName}', animalName);

    const html = buildAlertEmailHTML({
      alert,
      animal,
      farm,
      farmer,
      lang,
    });

    const info = await transporter.sendMail({
      from: `"पशु पहचान" <${process.env.FROM_EMAIL}>`,
      to: farmer.email,
      subject,
      html,
    });

    console.log(`📧 Alert email sent to ${farmer.email} (${info.messageId})`);
  } catch (err) {
    // Never let email failures break the alert flow
    console.error('📧 Email send failed:', err.message);
  }
}

module.exports = { sendAlertEmail };
