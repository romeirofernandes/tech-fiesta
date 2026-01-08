import { Link } from "react-router-dom";
import { Icons } from "@/components/ui/icons";

export default function Footer() {
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <footer className="py-12 px-4 md:px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center justify-center">
            <div className="w-full flex flex-row items-center justify-center">
                <div className="mb-8 w-full flex flex-col items-start">
                    <Link to="/" className="flex items-center gap-2">
                    <Icons.logo className="w-8 h-8 text-primary" />
                    <h2 className="text-lg font-bold text-foreground">पशु पहचान</h2>
                    </Link>
                    <h1 className="mt-4 text-muted-foreground text-center">
                    Built by <span className="text-primary">Team Pony</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-5 text-center">
                    © {new Date().getFullYear()} पशु पहचान. All rights reserved.
                    </p>
                </div>
                <div className="flex flex-row gap-8 w-full max-w-xl justify-end">
                    <div>
                    <h3 className="font-semibold mb-4 text-foreground text-center">
                        Pages
                    </h3>
                    <ul className="space-y-2 text-center">
                        <li>
                        <button
                            onClick={() => scrollToSection('features')}
                            className="text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors cursor-pointer"
                        >
                            Features
                        </button>
                        </li>
                        <li>
                        <button
                            onClick={() => scrollToSection('about')}
                            className="text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors cursor-pointer"
                        >
                            About
                        </button>
                        </li>
                    </ul>
                    </div>
                    <div>
                    <h3 className="font-semibold mb-4 text-foreground text-center">
                        Legal
                    </h3>
                    <ul className="space-y-2 text-center">
                        <li>
                        <Link
                            to="/privacy-policy"
                            className="text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors"
                        >
                            Privacy Policy
                        </Link>
                        </li>
                        <li>
                        <Link
                            to="/tos"
                            className="text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors"
                        >
                            Terms of Service
                        </Link>
                        </li>
                    </ul>
                    </div>
                </div>
            </div>
          {/* Large gradient brand text */}
          <div className="w-full flex mt-8 items-center justify-center">
            <h1 className="text-center text-3xl md:text-5xl lg:text-[10rem] pb-6 font-bold bg-clip-text text-transparent bg-linear-to-b from-primary to-foreground select-none">
              पशु पहचान
            </h1>
          </div>
        </div>
      </div>
    </footer>
  );
}