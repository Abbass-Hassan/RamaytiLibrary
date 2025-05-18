// backend/src/textUtils.js

/**
 * Normalize Arabic text by:
 * - Converting to NFKC,
 * - Replacing different forms of Alef, Yeh, etc.,
 * - Removing diacritics & Tatweel.
 */
function normalizeArabicText(text) {
  if (!text) return "";

  // First apply Unicode normalization
  let normalized = text.normalize("NFKC");

  // Replace ALL Alef forms and related characters to plain Alef (ا)
  normalized = normalized.replace(/[أإآءؤئٱٲٳٵ]/g, "ا");

  // Replace Yeh forms to plain Yeh (ي)
  normalized = normalized.replace(/[ىيئٸۑۍێېۑ]/g, "ي");

  // Replace Ta Marbuta with Heh
  normalized = normalized.replace(/[ة]/g, "ه");

  // Replace Waw variants with plain Waw (و)
  normalized = normalized.replace(/[ؤۄۅۆۇۈۉۊ]/g, "و");

  // Remove diacritics (all vowel marks)
  normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, "");

  // Remove standalone hamza if not already covered
  normalized = normalized.replace(/[\u0621]/g, "");

  // Remove Tatweel (elongation character)
  normalized = normalized.replace(/[\u0640]/g, "");

  return normalized;
}

/**
 * Character mapping for search patterns
 * Each key will be replaced with a regex pattern that matches all its variants
 */
const ARABIC_CHAR_VARIANTS = {
  ا: "[اأإآٱٲٳٵ]", // Alef variants
  أ: "[اأإآٱٲٳٵ]", // Alef with hamza variants
  إ: "[اأإآٱٲٳٵ]", // Alef with hamza below variants
  آ: "[اأإآٱٲٳٵ]", // Alef madda variants
  ي: "[يىئٸۑۍێېۑ]", // Yeh variants
  ى: "[يىئٸۑۍێېۑ]", // Alef maksura variants
  ة: "[ةه]", // Ta marbuta and Heh
  ه: "[ةه]", // Heh and Ta marbuta
  و: "[وؤۄۅۆۇۈۉۊ]", // Waw variants
  ؤ: "[وؤۄۅۆۇۈۉۊ]", // Waw with hamza variants
};

/**
 * Converts Arabic text to a regex pattern that will match all character variants
 * @param {string} text - The search text to convert
 * @return {string} - A regex pattern string that will match all variants
 */
function expandArabicCharactersToRegex(text) {
  if (!text) return "";

  // First normalize to clean up any vowel marks
  let normalized = text.normalize("NFKC");

  // Remove diacritics (all vowel marks)
  normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, "");

  // Remove Tatweel (elongation character)
  normalized = normalized.replace(/[\u0640]/g, "");

  // Replace each character with its regex pattern
  let pattern = "";
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];

    // If it's an Arabic character with variants, use the pattern
    if (ARABIC_CHAR_VARIANTS[char]) {
      pattern += ARABIC_CHAR_VARIANTS[char];
    }
    // Otherwise, escape any special regex characters and add the character
    else {
      pattern += escapeRegExp(char);
    }
  }

  return pattern;
}

/**
 * Escape special regex characters
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  normalizeArabicText,
  expandArabicCharactersToRegex,
};
