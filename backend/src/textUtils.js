// backend/src/textUtils.js

/**
 * Normalize Arabic text by:
 * - Converting to NFKC
 * - Replacing different forms of Alef, Yeh, Ta Marbuta, and Waw
 * - Removing all Arabic diacritics (harakat) and combining marks
 * - Removing standalone hamza and Tatweel (ـ)
 */
function normalizeArabicText(text) {
  if (!text) return "";

  // Unicode normalization
  let normalized = text.normalize("NFKC");

  // Replace Alef variants with plain Alef (ا)
  normalized = normalized.replace(/[أإآٱٲٳٵ]/g, "ا");
  // Replace Yeh variants with plain Yeh (ي)
  normalized = normalized.replace(/[ىيٸۍێېۑ]/g, "ي");
  // Replace Ta Marbuta with Heh (ه)
  normalized = normalized.replace(/[ة]/g, "ه");
  // Replace Waw variants with plain Waw (و)
  normalized = normalized.replace(/[ؤۄۅۆۇۈۉۊ]/g, "و");

  // Remove all Arabic diacritics (harakat) and other combining marks
  normalized = normalized.replace(
    /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g,
    ""
  );
  // Remove standalone hamza (ء)
  normalized = normalized.replace(/[\u0621]/g, "");
  // Remove Tatweel (ـ)
  normalized = normalized.replace(/[\u0640]/g, "");

  return normalized;
}

module.exports = { normalizeArabicText };
