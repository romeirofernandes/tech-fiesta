import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "../context/LanguageContext";

export function LanguageToggle({ children, className }) {
  const { language, setLanguage } = useLanguage();

  const languages = [
    { code: "en", name: "No Translation (Original)" },
    { code: "en", name: "English (English)" },
    { code: "ar", name: "Arabic (العربية)" },
    { code: "hi", name: "Hindi (हिन्दी)" },
    { code: "bn", name: "Bengali (বাংলা)" },
    { code: "te", name: "Telugu (తెలుగు)" },
    { code: "mr", name: "Marathi (मराठी)" },
    { code: "ta", name: "Tamil (தமிழ்)" },
    { code: "gu", name: "Gujarati (ગુજરાતી)" },
    { code: "kn", name: "Kannada (ಕನ್ನಡ)" },
    { code: "ml", name: "Malayalam (മലയാളം)" },
    { code: "pa", name: "Punjabi (ਪੰਜਾਬੀ)" },
    { code: "or", name: "Odia (ଓଡ଼ਿਆ)" },
    { code: "as", name: "Assamese (অসমীয়া)" },
    { code: "ur", name: "Urdu (اردو)" },
    { code: "sa", name: "Sanskrit (संस्कृतम्)" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className={className || "h-9 w-9"}>
            <Globe className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">Change language</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto w-[220px]">
        {languages.map((lang, index) => (
          <DropdownMenuItem
            key={`${lang.code}-${index}`}
            onClick={() => setLanguage(lang.code)}
            className={language === lang.code ? "bg-accent" : ""}
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
