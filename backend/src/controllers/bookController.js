const admin = require('../config/firebase');
const db = admin.firestore();

exports.getAllBooks = async (req, res) => {
  try {
    const snapshot = await db.collection('books').get();
    const books = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(books);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Failed to get books' });
  }
};

exports.getBookById = async (req, res) => {
    try {
      const { bookId } = req.params;
      const docRef = db.collection('books').doc(bookId);
      const docSnap = await docRef.get();
  
      if (!docSnap.exists) {
        return res.status(404).json({ error: 'Book not found' });
      }
  
      res.json({ id: docSnap.id, ...docSnap.data() });
    } catch (error) {
      console.error('Error fetching book:', error);
      res.status(500).json({ error: 'Failed to get book' });
    }
  };

  exports.getBookSections = async (req, res) => {
    try {
      const { bookId } = req.params;
      const docRef = db.collection('books').doc(bookId);
      const docSnap = await docRef.get();
  
      if (!docSnap.exists) {
        return res.status(404).json({ error: 'Book not found' });
      }
  
      const bookData = docSnap.data();
      const sections = bookData.sections || [];
      res.json(sections);
    } catch (error) {
      console.error('Error fetching sections:', error);
      res.status(500).json({ error: 'Failed to get sections' });
    }
  };

  exports.redirectToPdf = async (req, res) => {
    try {
      const { bookId, sectionIndex } = req.params;
      const docRef = db.collection('books').doc(bookId);
      const docSnap = await docRef.get();
  
      if (!docSnap.exists) {
        return res.status(404).json({ error: 'Book not found' });
      }
  
      const bookData = docSnap.data();
      const sections = bookData.sections || [];
      const index = parseInt(sectionIndex, 10);
  
      if (index < 0 || index >= sections.length) {
        return res.status(404).json({ error: 'Section not found' });
      }
  
      const section = sections[index];
      const page = section.page;
      const pdfPath = bookData.pdfPath;
      res.redirect(`${pdfPath}#page=${page}`);
    } catch (error) {
      console.error('Error redirecting to PDF:', error);
      res.status(500).json({ error: 'Failed to redirect to PDF' });
    }
  };