import { createContext, useContext, useEffect, useState } from "react";

const LanguageContext = createContext({
  language: "en",
  setLanguage: () => null,
});

export function LanguageProvider({
  children,
  defaultLanguage = "en",
  storageKey = "app-language",
  ...props
}) {
  const [language, setLanguage] = useState(() => {
    // Try to get language from storage or default
    return localStorage.getItem(storageKey) || defaultLanguage;
  });

  useEffect(() => {
    // Define the initialization callback globally
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: 'en,hi,bn,te,mr,ta,gu,kn,ml,pa,or,as,ur,sa,ar',
          autoDisplay: false,
        },
        'google_translate_element'
      );
      // Once initialized, trigger language change if requested
      const select = document.querySelector('.goog-te-combo');
      if (select && language !== 'en') {
         select.value = language;
         select.dispatchEvent(new Event('change'));
      }
    };

    // Check if script is already present
    if (!document.querySelector('script[src*="translate.google.com"]')) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Effect to change language when `language` state updates
  useEffect(() => {
    const changeLanguage = () => {
      const select = document.querySelector('.goog-te-combo');
      if (select) {
        select.value = language;
        select.dispatchEvent(new Event('change'));
      }
    };

    const attemptChange = setInterval(() => {
      const select = document.querySelector('.goog-te-combo');
      if (select) {
        changeLanguage();
        clearInterval(attemptChange);
      }
    }, 500);

    // Timeout to stop attempting after 5 seconds to prevent memory leaks
    const timeout = setTimeout(() => clearInterval(attemptChange), 5000);

    return () => {
      clearInterval(attemptChange);
      clearTimeout(timeout);
    };
  }, [language]);

  const value = {
    language,
    setLanguage: (lang) => {
      localStorage.setItem(storageKey, lang);
      setLanguage(lang);
    },
  };

  return (
    <LanguageContext.Provider {...props} value={value}>
      {children}
      {/* Hidden translate element required for script to work */}
      <div id="google_translate_element" style={{ display: 'none' }}></div>
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined)
    throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
};
