// backend/src/textUtils.js

/**
 * Normalize Arabic text by:
 * - Decomposing to NFD
 * - Stripping all Arabic diacritics (harakat) and combining marks
 * - Recomposing to NFC
 * - Unifying Alef, Yeh, Ta Marbuta, Waw variants
 * - Removing Tatweel and standalone Hamza
 */
function normalizeArabicText(text) {
  if (!text) return "";

  // 1. Decompose to NFD to separate base letters and combining marks
  let s = text.normalize("NFD");

  // 2. Remove Arabic combining marks (harakat, maddah, etc.)
  s = s.replace(
    /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g,
    ""
  );

  // 3. Recompose to NFC
  s = s.normalize("NFC");

  // 4. Unify letter variants
  s = s
    // Alef variants → ا
    .replace(/[إأآٱٲٳٵ]/g, "ا")
    // Yeh variants → ي
    .replace(/[ىيٸۍێېۑ]/g, "ي")
    // Ta Marbuta → ه
    .replace(/[ة]/g, "ه")
    // Waw variants → و
    .replace(/[ؤۄۅۆۇۈۉۊ]/g, "و")
    // Remove Tatweel
    .replace(/ـ/g, "")
    // Remove standalone Hamza
    .replace(/ء/g, "");

  return s;
}

module.exports = { normalizeArabicText };
