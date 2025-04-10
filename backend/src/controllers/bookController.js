const admin = require("../config/firebase");
const db = admin.firestore();
const { extractTextFromPdfUrlWithPdfJs } = require("../pdfJsService");

exports.getAllBooks = async (req, res) => {
  try {
    const snapshot = await db.collection("books").get();
    const books = snapshot.docs.map((doc) => {
      const data = doc.data();
      if (data.pdfPath && data.pdfPath.includes("localhost")) {
        data.pdfPath = data.pdfPath.replace(
          "localhost",
          "ramaytilibrary-production.up.railway.app"
        );
      }
      return { id: doc.id, ...data };
    });
    res.json(books);
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({ error: "Failed to get books" });
  }
};

exports.getBookById = async (req, res) => {
  try {
    const { bookId } = req.params;
    const docRef = db.collection("books").doc(bookId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Book not found" });
    }

    const data = docSnap.data();
    if (data.pdfPath && data.pdfPath.includes("localhost")) {
      data.pdfPath = data.pdfPath.replace(
        "localhost",
        "ramaytilibrary-production.up.railway.app"
      );
    }
    res.json({ id: docSnap.id, ...data });
  } catch (error) {
    console.error("Error fetching book:", error);
    res.status(500).json({ error: "Failed to get book" });
  }
};

exports.getBookSections = async (req, res) => {
  try {
    const { bookId } = req.params;
    const docRef = db.collection("books").doc(bookId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Book not found" });
    }

    const bookData = docSnap.data();
    const sections = bookData.sections || [];
    res.json(sections);
  } catch (error) {
    console.error("Error fetching sections:", error);
    res.status(500).json({ error: "Failed to get sections" });
  }
};

exports.redirectToPdf = async (req, res) => {
  try {
    const { bookId, sectionIndex } = req.params;
    const docRef = db.collection("books").doc(bookId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Book not found" });
    }

    const bookData = docSnap.data();
    const sections = bookData.sections || [];
    const index = parseInt(sectionIndex, 10);

    if (index < 0 || index >= sections.length) {
      return res.status(404).json({ error: "Section not found" });
    }

    const section = sections[index];
    const page = section.page;
    let pdfPath = bookData.pdfPath;
    if (pdfPath && pdfPath.includes("localhost")) {
      pdfPath = pdfPath.replace(
        "localhost",
        "ramaytilibrary-production.up.railway.app"
      );
    }
    res.redirect(`${pdfPath}#page=${page}`);
  } catch (error) {
    console.error("Error redirecting to PDF:", error);
    res.status(500).json({ error: "Failed to redirect to PDF" });
  }
};

exports.getBookContent = async (req, res) => {
  try {
    const { bookId } = req.params;

    // Get the book from Firestore
    const docRef = db.collection("books").doc(bookId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Book not found" });
    }

    const bookData = docSnap.data();

    // Format the PDF path
    let pdfPath = bookData.pdfPath;
    if (pdfPath && pdfPath.includes("localhost")) {
      pdfPath = pdfPath.replace(
        "localhost",
        "ramaytilibrary-production.up.railway.app"
      );
    }

    // Extract text content from the PDF
    const textContent = await extractTextFromPdfUrlWithPdfJs(pdfPath);

    // Split text by form feed character to get pages
    const pages = textContent.split("\f").filter((page) => page.trim() !== "");

    res.json({
      bookId: docSnap.id,
      title: bookData.title,
      totalPages: pages.length,
      content: pages,
    });
  } catch (error) {
    console.error("Error getting book content:", error);
    res
      .status(500)
      .json({ message: "Failed to get book content", error: error.message });
  }
};
