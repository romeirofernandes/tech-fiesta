import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Voice input button with visual feedback
 * @param {object} props
 * @param {boolean} props.isListening - Whether currently recording
 * @param {boolean} props.isProcessing - Whether processing with Groq
 * @param {boolean} props.isSupported - Whether speech recognition is supported 
 * @param {string} props.transcript - Current transcript text
 * @param {string} props.error - Error message
 * @param {function} props.onStart - Start listening callback
 * @param {function} props.onStop - Stop listening callback
 * @param {string} props.className - Additional CSS classes
 */
export function VoiceInputButton({
  isListening,
  isProcessing,
  isSupported,
  transcript,
  error,
  onStart,
  onStop,
  className
}) {
  if (!isSupported) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <Button
        type="button"
        variant={isListening ? "destructive" : "outline"}
        size="sm"
        onClick={isListening ? onStop : onStart}
        disabled={isProcessing}
        className={cn(
          "gap-2 transition-all",
          isListening && "animate-pulse"
        )}
      >
        {isProcessing ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
        ) : isListening ? (
          <><MicOff className="h-4 w-4" /> Stop Recording</>
        ) : (
          <><Mic className="h-4 w-4" /> Speak to Fill</>
        )}
      </Button>

      {isListening && (
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="text-xs text-muted-foreground">Listening... speak now</span>
        </div>
      )}

      {transcript && !isListening && !isProcessing && (
        <p className="text-xs text-muted-foreground italic">
          "{transcript}"
        </p>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
