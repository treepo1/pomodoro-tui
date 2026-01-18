// ASCII art digits for retro big timer display
// Each digit is 6 chars wide x 5 lines tall

const DIGITS: Record<string, string[]> = {
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

export function renderBigText(text: string): string[] {
  const lines: string[] = ["", "", "", "", ""];

  for (const char of text) {
    const digit = DIGITS[char];
    if (digit) {
      for (let i = 0; i < 5; i++) {
        lines[i] += digit[i] + "  ";
      }
    }
  }

  // Find max length and pad all lines to same width, then trim end once
  const maxLen = Math.max(...lines.map((l) => l.trimEnd().length));
  return lines.map((line) => line.trimEnd().padEnd(maxLen));
}

export function getBigTextWidth(text: string): number {
  // Each character is 6 wide + 2 spaces
  return text.length * 8;
}
