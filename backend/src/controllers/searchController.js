// backend/src/controllers/searchController.js

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

    const docRef = db.collection("books").doc(bookId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Book not found" });
    }

    const bookData = docSnap.data();
    const rawText = await extractTextFromPdfUrlWithPdfJs(bookData.pdfPath);
    // normalize entire document before splitting
    const normalizedDoc = normalizeArabicText(rawText);
    const pages = normalizedDoc.split("\f");

    const qNorm = normalizeArabicText(q);
    const regex = new RegExp(
      `(.{0,30})(${escapeRegExp(qNorm)})(.{0,30})`,
      "gi"
    );

    const matches = [];
    pages.forEach((pageText, idx) => {
      let match;
      while ((match = regex.exec(pageText)) !== null) {
        matches.push({
          page: idx + 1,
          snippet: match[0],
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
      const ids = bookIds.split(",").map((id) => id.trim());
      for (const id of ids) {
        const snap = await db.collection("books").doc(id).get();
        if (snap.exists) {
          books.push({ id: snap.id, ...snap.data() });
        }
      }
    } else {
      const snapshot = await db.collection("books").get();
      books = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    const results = [];
    const qNorm = normalizeArabicText(q);
    const regex = new RegExp(
      `(.{0,30})(${escapeRegExp(qNorm)})(.{0,30})`,
      "gi"
    );

    for (const book of books) {
      const rawText = await extractTextFromPdfUrlWithPdfJs(book.pdfPath);
      const normalizedDoc = normalizeArabicText(rawText);
      const pages = normalizedDoc.split("\f");

      pages.forEach((pageText, idx) => {
        let match;
        while ((match = regex.exec(pageText)) !== null) {
          results.push({
            bookId: book.id,
            bookTitle: book.title,
            page: idx + 1,
            snippet: match[0],
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
