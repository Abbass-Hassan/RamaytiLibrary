// backend/src/controllers/searchController.js

const admin = require('../config/firebase');
const db = admin.firestore();
const { extractTextFromPdfUrlWithPdfJs } = require('../pdfJsService');
const { normalizeArabicText } = require('../textUtils');

// Escape special regex characters
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Check if query contains Arabic
function isArabicQuery(q) {
  return /[\u0600-\u06FF]/.test(q);
}

exports.searchPdf = async (req, res) => {
  try {
    const { bookId, q } = req.query;
    if (!bookId || !q) {
      return res.status(400).json({ error: 'Missing bookId or search query' });
    }
    
    // Check if book doc exists
    const docRef = db.collection('books').doc(bookId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    const bookData = docSnap.data();
    
    // Extract text with PDF.js
    const pdfText = await extractTextFromPdfUrlWithPdfJs(bookData.pdfPath);
    const pages = pdfText.split('\f');
    console.log('[searchController.js] pages length:', pages.length);

    // Normalize query if Arabic
    const normalizedQuery = isArabicQuery(q)
      ? normalizeArabicText(q)
      : q.normalize('NFKC');
    
    let matches = [];

    pages.forEach((pageText, index) => {
      const pageNumber = index + 1;
      
      // Normalize page text if Arabic
      const normalizedPageText = isArabicQuery(q)
        ? normalizeArabicText(pageText)
        : pageText.normalize('NFKC');
      
      console.log(`[searchController.js] Page ${pageNumber} snippet:`, normalizedPageText.substring(0, 60));
      
      // Build a regex with some context
      const regex = new RegExp(
        `(.{0,30})(${escapeRegExp(normalizedQuery)})(.{0,30})`,
        'giu'
      );
      
      let match;
      let matchCount = 0;
      while ((match = regex.exec(normalizedPageText)) !== null) {
        matches.push({
          snippet: match[0],
          page: pageNumber
        });
        matchCount++;
      }
      console.log(`[searchController.js] Found ${matchCount} matches on page ${pageNumber}`);
    });
    
    console.log('[searchController.js] Total matches:', matches.length);
    res.json({ results: matches });
  } catch (error) {
    console.error('Error in searchPdf:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

exports.searchGlobalMulti = async (req, res) => {
  try {
    const { q, bookIds } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Missing search query' });
    }

    let books = [];
    if (bookIds) {
      const ids = bookIds.split(',');
      for (const id of ids) {
        const docRef = db.collection('books').doc(id.trim());
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          books.push({ id: docSnap.id, ...docSnap.data() });
        }
      }
    } else {
      const snapshot = await db.collection('books').get();
      books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    
    const normalizedQuery = isArabicQuery(q)
      ? normalizeArabicText(q)
      : q.normalize('NFKC');

    let results = [];

    for (const book of books) {
      const pdfText = await extractTextFromPdfUrlWithPdfJs(book.pdfPath);
      const pages = pdfText.split('\f');
      console.log(`[searchController.js] For book ${book.id}, pages:`, pages.length);

      pages.forEach((pageText, index) => {
        const pageNumber = index + 1;
        const normalizedPageText = isArabicQuery(q)
          ? normalizeArabicText(pageText)
          : pageText.normalize('NFKC');
        
        const regex = new RegExp(
          `(.{0,30})(${escapeRegExp(normalizedQuery)})(.{0,30})`,
          'giu'
        );
        
        let match;
        while ((match = regex.exec(normalizedPageText)) !== null) {
          results.push({
            bookId: book.id,
            bookTitle: book.title,
            snippet: match[0],
            page: pageNumber
          });
        }
      });
    }

    res.json({ results });
  } catch (error) {
    console.error('Error in searchGlobalMulti:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};
