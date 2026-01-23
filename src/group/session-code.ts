// Generate human-friendly session codes (e.g., XYZ234)
// Uses only unambiguous characters to avoid confusion

const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ'; // No vowels to avoid accidental words
const DIGITS = '23456789'; // No 0, 1 to avoid confusion with O, I

export function generateSessionCode(): string {
  let code = '';

  // Generate 3 letters followed by 3 digits (e.g., ABC123)
  for (let i = 0; i < 3; i++) {
    code += CONSONANTS.charAt(Math.floor(Math.random() * CONSONANTS.length));
  }
  for (let i = 0; i < 3; i++) {
    code += DIGITS.charAt(Math.floor(Math.random() * DIGITS.length));
  }

  return code;
}

export function validateSessionCode(code: string): boolean {
  if (!code || code.length !== 6) return false;

  const upperCode = code.toUpperCase();
  const letters = upperCode.slice(0, 3);
  const digits = upperCode.slice(3, 6);

  // Check letters are valid consonants
  for (const char of letters) {
    if (!CONSONANTS.includes(char)) return false;
  }

  // Check digits are valid
  for (const char of digits) {
    if (!DIGITS.includes(char)) return false;
  }

  return true;
}

export function normalizeSessionCode(code: string): string {
  return code.toUpperCase().trim();
}
