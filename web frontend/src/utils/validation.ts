/**
 * Checks if a word is meaningful.
 * Rejects words that:
 * - Contain no alphabetic letters.
 * - Contain only a single repeating letter if the word is longer than 1 character (except single letters 'a' and 'i').
 * - Have no vowels (a, e, i, o, u, y) if the word length is >= 3.
 * - Match common keyboard mash patterns.
 * - Have 4 or more consecutive identical characters.
 */
export const isMeaningfulWord = (word: string): boolean => {
  const letters = word.toLowerCase().replace(/[^a-z]/g, '');
  
  if (letters.length === 0) return false;
  
  if (letters.length === 1) {
    return letters === 'a' || letters === 'i';
  }
  
  const uniqueLetters = new Set(letters);
  if (uniqueLetters.size === 1) return false;
  
  if (letters.length >= 3 && !/[aeiouy]/.test(letters)) {
    return false;
  }
  
  const keyboardMashes = [
    'asdf', 'sdfg', 'dfgh', 'fghj', 'ghjk', 'hjkl',
    'qwer', 'rtyu', 'tyui', 'yuio', 'uiop',
    'zxcv', 'xcvb', 'cvbn', 'vbnm'
  ];
  for (const mash of keyboardMashes) {
    if (letters.includes(mash)) return false;
  }
  
  if (/([a-z])\1\1\1/.test(letters)) return false;
  
  return true;
};

/**
 * Checks if a journal text is meaningful.
 * Rejects text that is:
 * - Empty
 * - Less than 15 characters after trimming
 * - Contains only symbols/numbers (no letters)
 * - Has fewer than 3 meaningful words
 */
export const isMeaningfulText = (text: string): boolean => {
  if (!text) return false;
  const trimmed = text.trim();
  
  if (trimmed.length < 15) return false;
  
  if (!/[a-zA-Z]/.test(trimmed)) return false;
  
  const words = trimmed.split(/\s+/);
  let meaningfulCount = 0;
  for (const word of words) {
    if (isMeaningfulWord(word)) {
      meaningfulCount++;
    }
  }
  
  return meaningfulCount >= 3;
};
