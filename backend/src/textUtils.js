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

module.exports = { normalizeArabicText };
