import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "../context/ThemeContext"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className, showLabel = false, variant = "outline", ...props }) {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant={variant}
      size={showLabel ? "default" : "icon"}
      className={cn(
        className,
        "focus:outline-none focus-visible:outline-none focus-visible:ring-0 relative",
        variant === "ghost" && "border-0"
      )}
      aria-label="Toggle theme"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      {...props}
    >
      <Sun
        className={cn(
          "h-[1.2rem] w-[1.2rem] transition-all",
          theme === "dark" ? "opacity-0 scale-0 absolute" : "opacity-100 scale-100"
        )}
      />
      <Moon
        className={cn(
          "h-[1.2rem] w-[1.2rem] transition-all absolute",
          theme === "dark" ? "opacity-100 scale-100" : "opacity-0 scale-0"
        )}
      />
      {showLabel && <span className="ml-2">Toggle Theme</span>}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
