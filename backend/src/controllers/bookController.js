// Update bookController.js - only changing the getBookContent function
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

    // Check if we already have extracted content
    if (
      bookData.extractionStatus === "completed" &&
      bookData.extractedContent &&
      bookData.extractedContent.length > 0
    ) {
      console.log(
        `Using pre-extracted content (${bookData.extractedContent.length} pages)`
      );

      // Return the pre-extracted content
      return res.json({
        bookId: docSnap.id,
        title: bookData.title,
        totalPages: bookData.totalPages || bookData.extractedContent.length,
        content: bookData.extractedContent,
      });
    }

    // If extraction is in progress, inform the client
    if (bookData.extractionStatus === "pending") {
      console.log(`Text extraction is still in progress for book ${bookId}`);
      // Return a limited set of pages with a message
      const pendingMessage = [
        `Text extraction is in progress for "${bookData.title}".`,
        "This process may take a few minutes for large books.",
        "Please try again shortly.",
      ];

      return res.json({
        bookId: docSnap.id,
        title: bookData.title,
        totalPages: 1,
        content: pendingMessage,
        isProcessing: true,
      });
    }

    // If extraction failed or not yet started, extract on demand
    // Find the PDF path
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

    // Clean and properly encode the URL (handles Arabic filenames)
    pdfPath = cleanAndEncodeUrl(pdfPath);

    console.log(`Cleaned PDF path: ${pdfPath}`);
    console.log(`Starting on-demand PDF text extraction...`);

    // Extract text content from the PDF
    try {
      const textContent = await extractTextFromPdfUrlWithPdfJs(pdfPath);
      console.log(`Text extraction complete, processing pages...`);

      // Split text by form feed character to get pages
      const pages = textContent
        .split("\f")
        .filter((page) => page.trim() !== "");
      console.log(`Extracted ${pages.length} pages of content`);

      // Store the extracted content for future use
      await docRef.update({
        extractedContent: pages,
        totalPages: pages.length,
        extractionStatus: "completed",
        extractionCompleted: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({
        bookId: docSnap.id,
        title: bookData.title,
        totalPages: pages.length,
        content: pages,
      });
    } catch (pdfError) {
      console.error("PDF processing error:", pdfError);

      // Update the extraction status
      await docRef.update({
        extractionStatus: "failed",
        extractionError: pdfError.message,
      });

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
