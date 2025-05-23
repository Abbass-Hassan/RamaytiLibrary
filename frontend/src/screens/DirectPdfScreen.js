import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import Pdf from "react-native-pdf";
import Icon from "../components/Icon";
import {
  getBookmarks,
  saveBookmark,
  removeBookmark,
} from "../services/bookmarkService";
import {
  hasBundledPdf,
  getBundledPdfPath,
  initializeBundledPdfs,
} from "../services/bundledPdfService";
import { getFilenameFromPath } from "../services/pdfStorageService";
import i18n from "../i18n";
import colors from "../config/colors";
import HighlightedText from "./HighlightedText";
import RNFS from "react-native-fs";
import NetInfo from "@react-native-community/netinfo";

// Base directory for storing PDFs
const PDF_BASE_DIR = RNFS.DocumentDirectoryPath + "/pdfs/";

// Cache for storing PDF paths
const pdfPathCache = {};

// Ensure the PDF directory exists
const ensurePdfDirectory = async () => {
  try {
    const exists = await RNFS.exists(PDF_BASE_DIR);
    if (!exists) {
      await RNFS.mkdir(PDF_BASE_DIR);
    }
    return true;
  } catch (error) {
    console.error("Error creating PDF directory:", error);
    return false;
  }
};

// Get path for a PDF file
const getPdfPath = async (bookId) => {
  try {
    // Check cache first
    if (pdfPathCache[bookId]) {
      const exists = await RNFS.exists(pdfPathCache[bookId]);
      if (exists) {
        return pdfPathCache[bookId];
      }
    }

    // Define local path
    const localPath = `${PDF_BASE_DIR}book_${bookId}.pdf`;

    // Check if file exists locally
    const exists = await RNFS.exists(localPath);
    if (exists) {
      pdfPathCache[bookId] = localPath;
      return localPath;
    }

    // If file doesn't exist locally, return null
    return null;
  } catch (error) {
    console.error("Error getting PDF path:", error);
    return null;
  }
};

// Copy a bundled PDF to local storage
const copyBundledPdfToLocal = async (bookId, bundledPath) => {
  try {
    await ensurePdfDirectory();
    const destPath = `${PDF_BASE_DIR}book_${bookId}.pdf`;

    // Check if file already exists
    const exists = await RNFS.exists(destPath);
    if (exists) {
      pdfPathCache[bookId] = destPath;
      return destPath;
    }

    // Platform-specific copy process
    if (Platform.OS === "android") {
      // For Android, copy from assets
      await RNFS.copyFileAssets(bundledPath, destPath);
    } else {
      // For iOS, standard file copy
      await RNFS.copyFile(bundledPath, destPath);
    }

    console.log(`Copied bundled PDF to ${destPath}`);
    pdfPathCache[bookId] = destPath;
    return destPath;
  } catch (error) {
    console.error(`Error copying bundled PDF: ${error}`);
    return null;
  }
};

// Download a PDF to local storage
const downloadPdfToLocal = async (bookId, url) => {
  try {
    await ensurePdfDirectory();
    const destPath = `${PDF_BASE_DIR}book_${bookId}.pdf`;

    // Properly format and encode the URL
    let formattedUrl = url.trim();
    console.log("Original URL:", formattedUrl);

    // Handle GitHub URLs
    if (
      formattedUrl.includes("github.com") &&
      formattedUrl.includes("/blob/")
    ) {
      formattedUrl = formattedUrl
        .replace("github.com", "raw.githubusercontent.com")
        .replace("/blob/", "/");
      console.log("Converted GitHub URL to raw URL:", formattedUrl);
    }

    // Handle GitHub Pages URLs
    if (formattedUrl.includes("abbass-hassan.github.io")) {
      // Make sure to properly encode the filename part
      const baseUrl = "https://abbass-hassan.github.io/pdf-hosting/";
      const filename = formattedUrl.split("/").pop(); // Get the last part of the URL (the filename)

      // Ensure the filename is properly encoded
      formattedUrl = `${baseUrl}${encodeURIComponent(
        decodeURIComponent(filename)
      )}`;
      console.log("Formatted GitHub Pages URL:", formattedUrl);
    }

    // Check if file already exists
    const exists = await RNFS.exists(destPath);
    if (exists) {
      const stats = await RNFS.stat(destPath);
      if (parseInt(stats.size, 10) > 1000) {
        pdfPathCache[bookId] = destPath;
        return destPath;
      }
      // If file exists but is too small (possibly corrupted), delete it
      await RNFS.unlink(destPath);
    }

    console.log("Downloading PDF from URL:", formattedUrl);
    console.log("Saving to:", destPath);

    // Download file with proper options for special characters
    const result = await RNFS.downloadFile({
      fromUrl: formattedUrl,
      toFile: destPath,
      background: true,
      discretionary: true,
      progressInterval: 500,
      headers: {
        Accept: "*/*",
        "User-Agent": "RamaytilibraryApp",
      },
    }).promise;

    // Check status code
    if (result.statusCode === 200) {
      pdfPathCache[bookId] = destPath;
      return destPath;
    } else if (result.statusCode === 404) {
      console.error(`PDF not found (404) at URL: ${formattedUrl}`);
      throw new Error(
        `PDF file not found (404). The file might have been moved or deleted.`
      );
    } else {
      throw new Error(`Download failed with status ${result.statusCode}`);
    }
  } catch (error) {
    console.error(`Error downloading PDF: ${error}`);
    return null;
  }
};

const DirectPdfScreen = ({ route }) => {
  const { bookId, bookTitle, page, pdfFilename, isOffline } =
    route.params || {};
  const pdfRef = useRef(null);

  // PDF loading states
  const [pdfUrl, setPdfUrl] = useState(null);
  const [localPdfPath, setLocalPdfPath] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [pdfError, setPdfError] = useState(null);
  const [networkConnected, setNetworkConnected] = useState(true);

  // Page tracking
  const [currentPage, setCurrentPage] = useState(page || 1);

  // Bookmark state
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Search states
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Font size adjustment states
  const [scale, setScale] = useState(1.0);
  const [showZoomControls, setShowZoomControls] = useState(false);

  // Min and max scale values
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 2.5;
  const SCALE_STEP = 0.1;

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetworkConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  // Fetch book data and prepare PDF
  useEffect(() => {
    const fetchBookData = async () => {
      try {
        setLoading(true);
        setLoadingProgress(10);

        console.log("Fetching book data for ID:", bookId);
        console.log("PDF filename:", pdfFilename);

        // Initialize bundled PDFs list
        await initializeBundledPdfs();
        setLoadingProgress(20);

        // First check if we already have the PDF locally
        let localPath = await getPdfPath(bookId);

        if (localPath) {
          console.log("PDF found locally:", localPath);
          setLocalPdfPath(localPath);
          setLoadingProgress(90);
        } else {
          // Check if this PDF is bundled with the app
          if (pdfFilename && hasBundledPdf(pdfFilename)) {
            console.log("PDF found in app bundle:", pdfFilename);
            const bundledPath = getBundledPdfPath(pdfFilename);

            if (bundledPath) {
              setLoadingProgress(50);
              // Copy the bundled PDF to local storage
              localPath = await copyBundledPdfToLocal(bookId, bundledPath);

              if (localPath) {
                console.log("Copied bundled PDF to local storage:", localPath);
                setLocalPdfPath(localPath);
                setLoadingProgress(90);
              } else {
                throw new Error("Failed to copy bundled PDF to local storage");
              }
            }
          } else {
            // Check network connection
            const networkState = await NetInfo.fetch();
            if (!networkState.isConnected) {
              throw new Error(
                "No internet connection and PDF not available offline"
              );
            }

            // If not found locally or in bundle, fetch book metadata from API
            setLoadingProgress(30);
            const response = await fetch(
              `http://ramaytilibrary-production.up.railway.app/api/books/${bookId}`
            );

            if (!response.ok) {
              throw new Error(
                `API request failed with status ${response.status}`
              );
            }

            const data = await response.json();
            console.log("Book data received:", data);

            // Check if pdfPath exists in the response
            if (!data.pdfPath) {
              // Some Firestore implementations might use lowercase field names
              console.log(
                "pdfPath not found, checking for alternative field names"
              );
              if (data.pdfpath) {
                data.pdfPath = data.pdfpath;
              } else if (data.pdf_path) {
                data.pdfPath = data.pdf_path;
              } else {
                throw new Error("PDF path not found in book data");
              }
            }

            console.log("PDF URL from API:", data.pdfPath);
            setPdfUrl(data.pdfPath);
            setLoadingProgress(50);

            // Download the PDF to local storage
            localPath = await downloadPdfToLocal(bookId, data.pdfPath);
            if (localPath) {
              setLocalPdfPath(localPath);
              setLoadingProgress(90);
            } else {
              throw new Error("Failed to download PDF");
            }
          }
        }

        // Check bookmarks in parallel
        checkBookmark();
        setLoading(false);
      } catch (error) {
        console.error("Error fetching book data:", error);
        setPdfError(error.toString());
        setLoading(false);
      }
    };

    fetchBookData();

    return () => {
      // Cleanup code if needed
    };
  }, [bookId, pdfFilename]);

  // Check bookmark whenever page changes (optimized to avoid unnecessary checks)
  const checkBookmark = useCallback(async () => {
    try {
      const bookmarks = await getBookmarks();
      const exists = bookmarks.some(
        (b) => b.bookId === bookId && b.page === currentPage
      );
      setIsBookmarked(exists);
    } catch (error) {
      console.error("Error checking bookmark:", error);
    }
  }, [bookId, currentPage]);

  useEffect(() => {
    checkBookmark();
  }, [currentPage, checkBookmark]);

  // Optimized search function
  const handleSearch = async () => {
    if (!searchText.trim()) return;

    // Don't attempt search if offline
    if (!networkConnected) {
      Alert.alert(i18n.t("offlineMode"), i18n.t("searchRequiresInternet"));
      return;
    }

    try {
      const response = await fetch(
        `http://ramaytilibrary-production.up.railway.app/api/search/pdf?bookId=${bookId}&q=${encodeURIComponent(
          searchText
        )}`
      );
      const data = await response.json();
      const results = data.results || [];
      setSearchResults(results);
      setCurrentMatchIndex(0);

      if (results.length > 0) {
        jumpToMatch(0, results);
      } else {
        Alert.alert(i18n.t("search"), i18n.t("noResultsFound"));
      }
    } catch (error) {
      console.error("Error searching PDF:", error);
      Alert.alert(i18n.t("errorTitle"), "Failed to search in PDF.");
    }
  };

  const jumpToMatch = (matchIndex, resultsArray = searchResults) => {
    const match = resultsArray[matchIndex];
    if (!match) return;

    console.log(`Jumping to match on page ${match.page}`);
    setCurrentPage(match.page);
  };

  const handlePrevMatch = () => {
    if (currentMatchIndex <= 0) return;
    const newIndex = currentMatchIndex - 1;
    setCurrentMatchIndex(newIndex);
    jumpToMatch(newIndex);
  };

  const handleNextMatch = () => {
    if (currentMatchIndex >= searchResults.length - 1) return;
    const newIndex = currentMatchIndex + 1;
    setCurrentMatchIndex(newIndex);
    jumpToMatch(newIndex);
  };

  const handleToggleBookmark = async () => {
    try {
      const bookmarks = await getBookmarks();
      const existing = bookmarks.find(
        (b) => b.bookId === bookId && b.page === currentPage
      );

      if (existing) {
        await removeBookmark(existing.id);
        setIsBookmarked(false);
        Alert.alert(
          i18n.t("bookmarkRemoved"),
          `${i18n.t("page")} ${currentPage}`
        );
      } else {
        const bookmark = {
          id: Date.now().toString(),
          bookId,
          bookTitle: bookTitle || "",
          page: currentPage,
          note: "",
        };
        await saveBookmark(bookmark);
        setIsBookmarked(true);
        Alert.alert(
          i18n.t("bookmarkAdded"),
          `${bookTitle ? bookTitle + ", " : ""}${i18n.t("page")} ${currentPage}`
        );
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      Alert.alert(i18n.t("errorTitle"), "Failed to toggle bookmark.");
    }
  };

  // Font size adjustment functions
  const zoomIn = () => {
    if (scale < MAX_SCALE) {
      setScale((prevScale) => Math.min(prevScale + SCALE_STEP, MAX_SCALE));
    }
  };

  const zoomOut = () => {
    if (scale > MIN_SCALE) {
      setScale((prevScale) => Math.max(prevScale - SCALE_STEP, MIN_SCALE));
    }
  };

  const toggleZoomControls = () => {
    setShowZoomControls(!showZoomControls);
  };

  // Loading indicator with progress
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{i18n.t("loadingBook")}...</Text>
        <ActivityIndicator size="large" color={colors.primary} />
        <View style={styles.progressBarContainer}>
          <View
            style={[styles.progressBar, { width: `${loadingProgress}%` }]}
          />
        </View>
      </View>
    );
  }

  // If there was an error loading the PDF
  if (pdfError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Error loading PDF: {pdfError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setPdfError(null);
            setLoading(true);
            // Re-trigger the fetch book effect
            setPdfUrl(null);
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // If we failed to get the PDF path
  if (!localPdfPath) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Unable to load PDF.</Text>
      </View>
    );
  }

  const currentMatch = searchResults[currentMatchIndex];

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={i18n.t("enterSearchText")}
          placeholderTextColor={colors.textSecondary || "#999"}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
        />
        {searchResults.length > 0 ? (
          <View style={styles.arrowsContainer}>
            <Text style={styles.matchCount}>
              {currentMatchIndex + 1}/{searchResults.length}
            </Text>
            <TouchableOpacity
              onPress={handlePrevMatch}
              disabled={currentMatchIndex === 0}
              style={[
                styles.arrowButton,
                currentMatchIndex === 0 && styles.arrowDisabled,
              ]}
            >
              <Icon name="chevron-up" size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNextMatch}
              disabled={currentMatchIndex === searchResults.length - 1}
              style={[
                styles.arrowButton,
                currentMatchIndex === searchResults.length - 1 &&
                  styles.arrowDisabled,
              ]}
            >
              <Icon name="chevron-down" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.searchButton,
              !networkConnected && styles.disabledButton,
            ]}
            onPress={handleSearch}
            disabled={!networkConnected}
          >
            <Icon name="search" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Offline Banner */}
      {!networkConnected && (
        <View style={styles.offlineBanner}>
          <Icon name="cloud-offline" size={16} color="#FFF" />
          <Text style={styles.offlineBannerText}>{i18n.t("offlineMode")}</Text>
        </View>
      )}

      {/* Highlighted Search Result Panel (under the search bar) */}
      {currentMatch && (
        <View style={styles.snippetContainer}>
          <Text style={styles.snippetPageText}>
            {i18n.t("page")} {currentMatch.page}
          </Text>
          <HighlightedText text={currentMatch.snippet} highlight={searchText} />
        </View>
      )}

      {/* Font Size Control Toggle Button */}
      <TouchableOpacity
        style={styles.fontSizeButton}
        onPress={toggleZoomControls}
      >
        <Icon name="text" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Font Size Controls - conditionally rendered */}
      {showZoomControls && (
        <View style={styles.zoomControlsContainer}>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={zoomOut}
            disabled={scale <= MIN_SCALE}
          >
            <Icon name="remove" size={24} color="#FFF" />
          </TouchableOpacity>

          <Text style={styles.scaleText}>{Math.round(scale * 100)}%</Text>

          <TouchableOpacity
            style={styles.zoomButton}
            onPress={zoomIn}
            disabled={scale >= MAX_SCALE}
          >
            <Icon name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* PDF Viewer with optimized settings */}
      <Pdf
        ref={pdfRef}
        source={{
          uri: `file://${localPdfPath}`,
          cache: true,
        }}
        trustAllCerts={true}
        enablePaging={true}
        fitPolicy={0} // Width fit
        spacing={0}
        page={currentPage}
        scale={scale}
        activityIndicator={null}
        renderActivityIndicator={() => null}
        enableRTL={i18n.language === "ar"}
        enableAnnotationRendering={false}
        maxSingleZoom={3.0}
        onPageChanged={(newPage) => {
          setCurrentPage(newPage);
        }}
        onError={(error) => {
          console.error("PDF Error:", error);
          setPdfError(error.toString());
        }}
        style={styles.pdf}
      />

      {/* Floating Bookmark Toggle Button */}
      <TouchableOpacity
        style={styles.bookmarkButton}
        onPress={handleToggleBookmark}
      >
        <Icon
          name={isBookmarked ? "bookmark" : "bookmark-outline"}
          size={24}
          color="#FFF"
        />
      </TouchableOpacity>
    </View>
  );
};

export default DirectPdfScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background || "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  progressBarContainer: {
    height: 6,
    width: "70%",
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    marginTop: 16,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  searchBarContainer: {
    flexDirection: "row",
    backgroundColor: colors.background || "#F5F5F5",
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.card || "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CCC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: colors.text || "#333",
    textAlign: "right",
  },
  arrowsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    backgroundColor: colors.primary || "#2196F3",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  matchCount: {
    color: "#FFF",
    marginRight: 8,
    fontSize: 14,
    textAlign: "right",
  },
  arrowButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginHorizontal: 2,
    backgroundColor: colors.primary || "#2196F3",
  },
  arrowDisabled: {
    backgroundColor: "#999",
  },
  searchButton: {
    marginLeft: 8,
    backgroundColor: colors.primary || "#2196F3",
    borderRadius: 8,
    padding: 8,
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
  },
  snippetContainer: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    marginHorizontal: 10,
    marginVertical: 6,
    borderRadius: 8,
    elevation: 2,
    alignItems: "flex-end",
  },
  snippetPageText: {
    fontWeight: "bold",
    marginBottom: 4,
    color: colors.text || "#333",
    textAlign: "right",
  },
  bookmarkButton: {
    position: "absolute",
    top: 70,
    right: 20,
    backgroundColor: colors.primary || "#2196F3",
    padding: 10,
    borderRadius: 30,
    zIndex: 10,
    elevation: 4,
  },
  fontSizeButton: {
    position: "absolute",
    top: 70,
    right: 80, // Positioned to the left of bookmark button
    backgroundColor: colors.primary || "#2196F3",
    padding: 10,
    borderRadius: 30,
    zIndex: 10,
    elevation: 4,
  },
  zoomControlsContainer: {
    position: "absolute",
    top: 130,
    right: 20,
    backgroundColor: colors.primary || "#2196F3",
    padding: 10,
    borderRadius: 15,
    zIndex: 10,
    elevation: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  zoomButton: {
    padding: 8,
  },
  scaleText: {
    color: "#FFF",
    fontWeight: "bold",
    marginHorizontal: 8,
  },
  pdf: {
    flex: 1,
  },
  errorText: {
    color: "red",
    textAlign: "center",
    margin: 20,
  },
  retryButton: {
    backgroundColor: colors.primary || "#2196F3",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  retryText: {
    color: "white",
    fontWeight: "bold",
  },
  offlineBanner: {
    flexDirection: "row",
    backgroundColor: "#FF9800",
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  offlineBannerText: {
    color: "white",
    marginLeft: 5,
    fontWeight: "bold",
    fontSize: 12,
  },
});
