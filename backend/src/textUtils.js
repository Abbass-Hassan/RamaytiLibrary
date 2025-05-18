/**
 * Normalize Arabic text by:
 * - Unicode NFKC normalization,
 * - Replacing Alef, Yeh, Ta Marbuta, Waw variants,
 * - Removing ALL diacritics (الحركات) and ALL hamza (الهمزة) chars.
 */
function normalizeArabicText(text) {
  if (!text) return "";

  // Unicode normalization (NFKC)
  let normalized = text.normalize("NFKC");

  // Replace all Alef variants with plain Alef
  normalized = normalized.replace(/[أإآٱٲٳٵ]/g, "ا");

  // Replace Yeh variants with plain Yeh
  normalized = normalized.replace(/[ىيئٸۑۍێېۑ]/g, "ي");

  // Replace Ta Marbuta with Heh
  normalized = normalized.replace(/[ة]/g, "ه");

  // Replace Waw variants with plain Waw
  normalized = normalized.replace(/[ؤۄۅۆۇۈۉۊ]/g, "و");

  // Remove ALL hamza chars (standalone or combined)
  normalized = normalized.replace(/[\u0621\u0624\u0626\u0674]/g, ""); // ء، ؤ، ئ، ٴ

  // Remove ALL Arabic diacritics (vowel marks, shadda, sukun, etc.)
  normalized = normalized.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, ""); // Basic+Extended

  // Remove Tatweel (elongation char)
  normalized = normalized.replace(/[\u0640]/g, "");

  return normalized;
}

module.exports = { normalizeArabicText };
