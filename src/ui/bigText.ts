// ASCII art digits for retro big timer display
// Large: Each digit is 6 chars wide x 5 lines tall
// Medium: Each digit is 3 chars wide x 3 lines tall
// Small: Plain text with formatting

export type TimerDisplayMode = "large" | "medium" | "small";

const DIGITS_LARGE: Record<string, string[]> = {
  "0": ["██████", "██  ██", "██  ██", "██  ██", "██████"],
  "1": ["  ██  ", " ███  ", "  ██  ", "  ██  ", "██████"],
  "2": ["██████", "    ██", "██████", "██    ", "██████"],
  "3": ["██████", "    ██", "██████", "    ██", "██████"],
  "4": ["██  ██", "██  ██", "██████", "    ██", "    ██"],
  "5": ["██████", "██    ", "██████", "    ██", "██████"],
  "6": ["██████", "██    ", "██████", "██  ██", "██████"],
  "7": ["██████", "    ██", "   ██ ", "  ██  ", "  ██  "],
  "8": ["██████", "██  ██", "██████", "██  ██", "██████"],
  "9": ["██████", "██  ██", "██████", "    ██", "██████"],
  ":": ["      ", "  ██  ", "      ", "  ██  ", "      "],
};

// Medium: simpler 3x3 digits
const DIGITS_MEDIUM: Record<string, string[]> = {
  "0": ["█▀█", "█ █", "▀▀▀"],
  "1": [" █ ", " █ ", " ▀ "],
  "2": ["▀▀█", "█▀▀", "▀▀▀"],
  "3": ["▀▀█", " ▀█", "▀▀▀"],
  "4": ["█ █", "▀▀█", "  ▀"],
  "5": ["█▀▀", "▀▀█", "▀▀▀"],
  "6": ["█▀▀", "█▀█", "▀▀▀"],
  "7": ["▀▀█", "  █", "  ▀"],
  "8": ["█▀█", "█▀█", "▀▀▀"],
  "9": ["█▀█", "▀▀█", "▀▀▀"],
  ":": ["   ", " ▪ ", " ▪ "],
};

export function renderBigText(text: string, mode: TimerDisplayMode = "large"): string[] {
  if (mode === "small") {
    // Return formatted time with brackets for visibility
    return [`[ ${text} ]`];
  }

  const digits = mode === "large" ? DIGITS_LARGE : DIGITS_MEDIUM;
  const lineCount = mode === "large" ? 5 : 3;
  const lines: string[] = Array(lineCount).fill("");
  const spacing = mode === "large" ? "  " : " ";

  for (const char of text) {
    const digit = digits[char];
    if (digit) {
      for (let i = 0; i < lineCount; i++) {
        lines[i] += digit[i] + spacing;
      }
    }
  }

  // Find max length and pad all lines to same width, then trim end once
  const maxLen = Math.max(...lines.map((l) => l.trimEnd().length));
  return lines.map((line) => line.trimEnd().padEnd(maxLen));
}

export function getBigTextWidth(text: string, mode: TimerDisplayMode = "large"): number {
  if (mode === "small") {
    return text.length + 4; // "[ " + text + " ]"
  }
  // Large: Each character is 6 wide + 2 spaces = 8
  // Medium: Each character is 3 wide + 1 space = 4
  const charWidth = mode === "large" ? 8 : 4;
  return text.length * charWidth;
}

// Determine optimal display mode based on available width
export function getOptimalTimerMode(availableWidth: number): TimerDisplayMode {
  // "00:00" has 5 characters
  // Large mode needs ~40 chars (5 * 8)
  // Medium mode needs ~20 chars (5 * 4)
  // Small mode needs ~9 chars
  
  if (availableWidth >= 45) {
    return "large";
  } else if (availableWidth >= 22) {
    return "medium";
  }
  return "small";
}
