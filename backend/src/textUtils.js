// backend/src/textUtils.js

/**
 * Normalize Arabic text by:
 * - Converting to NFKC,
 * - Replacing different forms of Alef, Yeh, etc.,
 * - Removing diacritics & Tatweel.
 */
function normalizeArabicText(text) {
  if (!text) return "";

  // Convert to NFKC
  let normalized = text.normalize("NFKC");

  // Replace ALL Alef forms and ALL hamza variants
  normalized = normalized.replace(/[أإآءؤئ]/g, "ا");

  // Replace Yeh forms
  normalized = normalized.replace(/[ىئ]/g, "ي");

  // Replace Ta Marbuta with Teh
  normalized = normalized.replace(/[ة]/g, "ت");

  // Replace Waw variants
  normalized = normalized.replace(/[ؤ]/g, "و");

  // Remove diacritics (expanded to include all vowel marks)
  normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, "");

  // Remove Tatweel
  normalized = normalized.replace(/\u0640/g, "");

  return normalized;
}

module.exports = { normalizeArabicText };
