const admin = require("../config/firebase");
const db = admin.firestore();
const { extractTextFromPdfUrlWithPdfJs } = require("../pdfJsService");
const { normalizeArabicText } = require("../textUtils");

// Escape special regex characters
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

exports.searchPdf = async (req, res) => {
  try {
    const { bookId, q } = req.query;
    if (!bookId || !q) {
      return res.status(400).json({ error: "Missing bookId or search query" });
    }

    // Fetch book doc
    const docRef = db.collection("books").doc(bookId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Book not found" });
    }

    const bookData = docSnap.data();

    // Extract text from PDF
    const pdfText = await extractTextFromPdfUrlWithPdfJs(bookData.pdfPath);
    const pages = pdfText.split("\f");

    // Normalize query
    const normalizedQuery = normalizeArabicText(q);

    let matches = [];
    pages.forEach((pageText, index) => {
      const pageNumber = index + 1;

      // Normalize page text
      const normalizedPageText = normalizeArabicText(pageText);

      // Regex for match with context
      const regex = new RegExp(
        `(.{0,30})(${escapeRegExp(normalizedQuery)})(.{0,30})`,
        "giu"
      );

      let match;
      while ((match = regex.exec(normalizedPageText)) !== null) {
        matches.push({
          snippet: match[0],
          page: pageNumber,
        });
      }
    });

    res.json({ results: matches });
  } catch (error) {
    console.error("Error in searchPdf:", error);
    res.status(500).json({ error: "Search failed" });
  }
};

exports.searchGlobalMulti = async (req, res) => {
  try {
    const { q, bookIds } = req.query;
    if (!q) {
      return res.status(400).json({ error: "Missing search query" });
    }

    let books = [];
    if (bookIds) {
      const ids = bookIds.split(",");
      for (const id of ids) {
        const docRef = db.collection("books").doc(id.trim());
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          books.push({ id: docSnap.id, ...docSnap.data() });
        }
      }
    } else {
      const snapshot = await db.collection("books").get();
      books = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    // Normalize query
    const normalizedQuery = normalizeArabicText(q);

    let results = [];
    for (const book of books) {
      const pdfText = await extractTextFromPdfUrlWithPdfJs(book.pdfPath);
      const pages = pdfText.split("\f");

      pages.forEach((pageText, index) => {
        const pageNumber = index + 1;
        const normalizedPageText = normalizeArabicText(pageText);

        const regex = new RegExp(
          `(.{0,30})(${escapeRegExp(normalizedQuery)})(.{0,30})`,
          "giu"
        );

        let match;
        while ((match = regex.exec(normalizedPageText)) !== null) {
          results.push({
            bookId: book.id,
            bookTitle: book.title,
            snippet: match[0],
            page: pageNumber,
          });
        }
      });
    }

    res.json({ results });
  } catch (error) {
    console.error("Error in searchGlobalMulti:", error);
    res.status(500).json({ error: "Search failed" });
  }
};
