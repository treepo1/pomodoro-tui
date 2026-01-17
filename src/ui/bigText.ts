// ASCII art digits for retro big timer display
// Each digit is 5 lines tall

const DIGITS: Record<string, string[]> = {
  "0": [
    " ███ ",
    "█   █",
    "█   █",
    "█   █",
    " ███ ",
  ],
  "1": [
    "  █  ",
    " ██  ",
    "  █  ",
    "  █  ",
    " ███ ",
  ],
  "2": [
    " ███ ",
    "█   █",
    "  ██ ",
    " █   ",
    "█████",
  ],
  "3": [
    " ███ ",
    "█   █",
    "  ██ ",
    "█   █",
    " ███ ",
  ],
  "4": [
    "█   █",
    "█   █",
    "█████",
    "    █",
    "    █",
  ],
  "5": [
    "█████",
    "█    ",
    "████ ",
    "    █",
    "████ ",
  ],
  "6": [
    " ███ ",
    "█    ",
    "████ ",
    "█   █",
    " ███ ",
  ],
  "7": [
    "█████",
    "    █",
    "   █ ",
    "  █  ",
    "  █  ",
  ],
  "8": [
    " ███ ",
    "█   █",
    " ███ ",
    "█   █",
    " ███ ",
  ],
  "9": [
    " ███ ",
    "█   █",
    " ████",
    "    █",
    " ███ ",
  ],
  ":": [
    "     ",
    "  █  ",
    "     ",
    "  █  ",
    "     ",
  ],
};

export function renderBigText(text: string): string[] {
  const lines: string[] = ["", "", "", "", ""];

  for (const char of text) {
    const digit = DIGITS[char];
    if (digit) {
      for (let i = 0; i < 5; i++) {
        lines[i] += digit[i] + " ";
      }
    }
  }

  return lines;
}

export function getBigTextWidth(text: string): number {
  // Each character is 5 wide + 1 space
  return text.length * 6;
}
