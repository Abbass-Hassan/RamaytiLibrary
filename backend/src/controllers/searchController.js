const admin = require('../config/firebase');
const db = admin.firestore();
const { extractTextFromPdfUrl } = require('../pdfService');

exports.searchPdf = async (req, res) => {
    try {
      const { bookId, q } = req.query;
      if (!bookId || !q) {
        return res.status(400).json({ error: 'Missing bookId or search query' });
      }
      // Retrieve the book document
      const docRef = db.collection('books').doc(bookId);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: 'Book not found' });
      }
      const bookData = docSnap.data();
      const pdfUrl = bookData.pdfPath;
      // Extract text from the PDF URL using pdfService
      const pdfText = await extractTextFromPdfUrl(pdfUrl);
      // Split the extracted text into pages (assuming \f as page delimiter)
      const pages = pdfText.split('\f');
      let matches = [];
      pages.forEach((pageText, index) => {
        const pageNumber = index + 1;
        // Create a regex to capture up to 30 characters before and after the query (case-insensitive)
        const regex = new RegExp(`(.{0,30})(${q})(.{0,30})`, 'gi');
        let match;
        while ((match = regex.exec(pageText)) !== null) {
          matches.push({
            snippet: match[0],
            page: pageNumber,
          });
        }
      });
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
      // If bookIds is provided, split into an array; otherwise, search all books.
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
      // For each book, extract PDF text and search for q.
      let results = [];
      for (const book of books) {
        const pdfUrl = book.pdfPath;
        // Extract text from the PDF using your pdfService (make sure it's imported)
        const pdfText = await require('../pdfService').extractTextFromPdfUrl(pdfUrl);
        // Split text into pages based on form feed character.
        const pages = pdfText.split('\f');
        pages.forEach((pageText, index) => {
          const pageNumber = index + 1;
          // Create a regex to capture up to 30 characters before and after the query (case-insensitive)
          const regex = new RegExp(`(.{0,30})(${q})(.{0,30})`, 'gi');
          let match;
          while ((match = regex.exec(pageText)) !== null) {
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
      console.error('Error in searchGlobalMulti:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  };