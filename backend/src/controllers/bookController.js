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
    console.log(`Getting content for book ID: ${bookId}`);

    // Get the book from Firestore
    const docRef = db.collection("books").doc(bookId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.log(`Book not found: ${bookId}`);
      return res.status(404).json({ error: "Book not found" });
    }

    const bookData = docSnap.data();
    console.log(`Found book: ${bookData.title}`);

    // Find the PDF path with case-insensitive field checking
    let pdfPath = null;

    // Check all the possible field names that might contain the path
    if (bookData.pdfPath) {
      pdfPath = bookData.pdfPath;
    } else if (bookData.pdfpath) {
      pdfPath = bookData.pdfpath;
    } else if (bookData.pdf_path) {
      pdfPath = bookData.pdf_path;
    } else {
      // Look through all fields to find anything that might contain a PDF URL
      for (const key in bookData) {
        if (
          typeof bookData[key] === "string" &&
          (bookData[key].endsWith(".pdf") ||
            bookData[key].includes("pdf-hosting"))
        ) {
          pdfPath = bookData[key];
          console.log(`Found PDF URL in field '${key}': ${pdfPath}`);
          break;
        }
      }
    }

    if (!pdfPath) {
      return res.status(400).json({
        error: "PDF path not found in book data",
        bookData: { title: bookData.title, id: docSnap.id },
      });
    }

    // Format the PDF path
    if (pdfPath.includes("localhost")) {
      pdfPath = pdfPath.replace(
        "localhost",
        "ramaytilibrary-production.up.railway.app"
      );
    }

    // Convert GitHub repository URLs to raw URLs
    if (pdfPath.includes("github.com") && pdfPath.includes("/blob/")) {
      pdfPath = pdfPath
        .replace("github.com", "raw.githubusercontent.com")
        .replace("/blob/", "/");
      console.log("Converted GitHub URL to raw URL:", pdfPath);
    }

    console.log(`PDF path: ${pdfPath}`);

    // Extract text content from the PDF
    try {
      console.log(`Starting PDF text extraction...`);
      const textContent = await extractTextFromPdfUrlWithPdfJs(pdfPath);
      console.log(`Text extraction complete, processing pages...`);

      // Split text by form feed character to get pages
      const pages = textContent
        .split("\f")
        .filter((page) => page.trim() !== "");
      console.log(`Extracted ${pages.length} pages of content`);

      res.json({
        bookId: docSnap.id,
        title: bookData.title,
        totalPages: pages.length,
        content: pages,
      });
    } catch (pdfError) {
      console.error("PDF processing error:", pdfError);

      // Fallback with mock content
      console.log("Using fallback content generation");

      // Create a simple mock content as fallback
      const fallbackPages = [];
      const pageCount = 10; // Mock 10 pages

      for (let i = 1; i <= pageCount; i++) {
        fallbackPages.push(
          `This is page ${i} of ${bookData.title}.\n\n` +
            `PDF text extraction failed. Please use the Standard PDF viewer.\n\n` +
            `Error: ${pdfError.message}`
        );
      }

      res.json({
        bookId: docSnap.id,
        title: bookData.title,
        totalPages: pageCount,
        content: fallbackPages,
        isPreview: true,
        error: pdfError.message,
      });
    }
  } catch (error) {
    console.error("Error getting book content:", error);
    res
      .status(500)
      .json({ message: "Failed to get book content", error: error.message });
  }
};
