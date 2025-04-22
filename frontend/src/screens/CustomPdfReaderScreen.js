import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  TextInput,
  I18nManager,
  Dimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import {
  getBookmarks,
  saveBookmark,
  removeBookmark,
} from "../services/bookmarkService";
import colors from "../config/colors";
import HighlightedText from "./HighlightedText";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import Slider from "@react-native-community/slider";

// Helper function to detect if text contains Arabic characters
const containsArabic = (text) => {
  return /[\u0600-\u06FF]/.test(text);
};

// Cache management functions
const saveBookContent = async (bookId, content) => {
  try {
    const contentKey = `book_content_${bookId}`;
    await AsyncStorage.setItem(
      contentKey,
      JSON.stringify({
        timestamp: Date.now(),
        content: content,
      })
    );
    console.log(`Saved content for book ${bookId} to local storage`);
    return true;
  } catch (error) {
    console.error("Error saving book content to storage:", error);
    return false;
  }
};

const getBookContent = async (bookId) => {
  try {
    const contentKey = `book_content_${bookId}`;
    const storedData = await AsyncStorage.getItem(contentKey);

    if (storedData) {
      const parsedData = JSON.parse(storedData);
      console.log(
        `Retrieved cached content for book ${bookId}, stored at ${new Date(
          parsedData.timestamp
        )}`
      );
      return parsedData.content;
    }
    return null;
  } catch (error) {
    console.error("Error getting book content from storage:", error);
    return null;
  }
};

const CustomPdfReaderScreen = ({ route }) => {
  const { t } = useTranslation();
  // Expecting bookId, bookTitle, and optional initial page
  const { bookId, bookTitle, page } = route.params || {};
  const isRTL = I18nManager.isRTL;

  // Content states
  const [bookContent, setBookContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isArabicContent, setIsArabicContent] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isUsingCache, setIsUsingCache] = useState(false);

  // Page tracking
  const [numberOfPages, setNumberOfPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(page || 1);

  // Bookmark state
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Search states
  const [searchText, setSearchText] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Text customization
  const [fontSize, setFontSize] = useState(16);
  const [textColor, setTextColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  // Set up network connectivity monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      console.log("Network connection state:", state.isConnected);
      setIsOffline(!state.isConnected);
    });

    // Clean up listener on unmount
    return () => unsubscribe();
  }, []);

  const fetchFreshContent = async (effectiveBookId) => {
    try {
      // First check if we're online before attempting fetch
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        console.log("Not fetching fresh content - device is offline");
        return;
      }

      try {
        const url = `http://ramaytilibrary-production.up.railway.app/api/books/${effectiveBookId}/content`;
        console.log("Fetching fresh content from URL:", url);

        // Create a manual timeout with AbortController instead of using AbortSignal.timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(url, {
          signal: controller.signal,
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        });

        // Clear the timeout since the request completed
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `Server responded with status code ${response.status}`
          );
        }

        const data = await response.json();
        console.log("Received data:", data);

        // Save to local storage cache if you're using caching
        if (typeof saveBookContent === "function") {
          await saveBookContent(effectiveBookId, data.content);
        }

        // Only update state if we're not already showing cached content
        // or if we're using cache but now got fresh content
        if (loading || isUsingCache) {
          setBookContent(data.content);
          setNumberOfPages(data.content.length);

          // Check if content is Arabic
          if (data.content && data.content.length > 0) {
            const isArabic = containsArabic(data.content[0]);
            setIsArabicContent(isArabic);
            console.log("Content is Arabic:", isArabic);
          }

          setLoading(false);
          setIsUsingCache(false);
        }
      } catch (error) {
        console.error("Error fetching fresh content:", error);
        // Only show error if we haven't already loaded from cache
        if (loading) {
          setError(error.message);
          setLoading(false);
        }
      }
    } catch (generalError) {
      console.error("General error in fetchFreshContent:", generalError);
    }
  };

  // Fetch the book content from your backend or cache
  useEffect(() => {
    const fetchBookContent = async () => {
      try {
        setLoading(true);

        // Debug information
        console.log("Route params:", route.params);
        console.log("Book ID:", bookId);
        console.log("Book Title:", bookTitle);

        // Use a fallback ID if bookId is undefined
        const effectiveBookId = bookId || "C2qKmMSFbnMRVbdrfAAn"; // Using one of your actual book IDs from the logs
        console.log("Using book ID:", effectiveBookId);

        // Check if we have the content cached locally
        const cachedContent = await getBookContent(effectiveBookId);

        // Check network connection
        const networkState = await NetInfo.fetch();
        const isConnected = networkState.isConnected;
        setIsOffline(!isConnected);

        if (cachedContent && cachedContent.length > 0) {
          // Use the cached content if we have it
          console.log("Using cached book content");
          setBookContent(cachedContent);
          setNumberOfPages(cachedContent.length);
          setIsUsingCache(true);

          // Check if content is Arabic by sampling the first page
          if (cachedContent && cachedContent.length > 0) {
            const isArabic = containsArabic(cachedContent[0]);
            setIsArabicContent(isArabic);
            console.log("Content is Arabic:", isArabic);
          }

          setLoading(false);

          // If we're online, fetch fresh content in background to update cache
          if (isConnected) {
            console.log("Connected to network, checking for updated content");
            // Use setTimeout to allow the UI to render first
            setTimeout(() => {
              fetchFreshContent(effectiveBookId).catch((err) => {
                console.log("Background refresh failed silently:", err.message);
              });
            }, 2000);
          }
          return;
        }

        // If no cached content and offline, show error
        if (!isConnected) {
          throw new Error(
            "No internet connection and no cached content available"
          );
        }

        // Fetch content from server
        await fetchFreshContent(effectiveBookId);
      } catch (error) {
        console.error("Error fetching book content:", error);
        setError(error.message);
        setLoading(false);
        Alert.alert(t("errorTitle"), t("errorLoading") + ": " + error.message);
      }
    };

    fetchBookContent();
  }, [bookId]);

  // Check bookmark whenever page changes
  const checkBookmark = async () => {
    try {
      const bookmarks = await getBookmarks();
      const exists = bookmarks.some(
        (b) => b.bookId === bookId && b.page === currentPage
      );
      setIsBookmarked(exists);
    } catch (error) {
      console.error("Error checking bookmark:", error);
    }
  };

  useEffect(() => {
    checkBookmark();
  }, [currentPage]);

  // Search in content
  const handleSearch = async () => {
    if (!searchText.trim()) return;

    const results = [];

    // Search through all pages
    bookContent.forEach((pageText, pageIndex) => {
      const lowerCasePageText = pageText.toLowerCase();
      const lowerCaseSearchText = searchText.toLowerCase();

      let startIndex = 0;
      while (startIndex < lowerCasePageText.length) {
        const foundIndex = lowerCasePageText.indexOf(
          lowerCaseSearchText,
          startIndex
        );

        if (foundIndex === -1) break;

        // Get surrounding text for the snippet
        const snippetStart = Math.max(0, foundIndex - 40);
        const snippetEnd = Math.min(
          pageText.length,
          foundIndex + searchText.length + 40
        );
        const snippet = pageText.substring(snippetStart, snippetEnd);

        results.push({
          page: pageIndex + 1,
          index: foundIndex,
          snippet,
        });

        // Move to next potential match
        startIndex = foundIndex + lowerCaseSearchText.length;
      }
    });

    setSearchResults(results);
    setCurrentMatchIndex(0);

    if (results.length > 0) {
      jumpToMatch(0, results);
    } else {
      Alert.alert(t("search"), t("noResultsFound"));
    }
  };

  const jumpToMatch = (matchIndex, resultsArray = searchResults) => {
    const match = resultsArray[matchIndex];
    if (!match) return;

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
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      Alert.alert(t("errorTitle"), t("searchFailed"));
    }
  };

  const goToPage = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > numberOfPages) {
      Alert.alert(t("errorTitle"), t("invalidPage") + ` (1-${numberOfPages})`);
      return;
    }
    setCurrentPage(pageNumber);
  };

  const goToNextPage = () => {
    if (currentPage < numberOfPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Loading indicator
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t("loadingBook")}...</Text>
      </View>
    );
  }

  // Error handling
  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>
          {t("errorLoading")}: {error}
        </Text>
        {isOffline && <Text style={styles.offlineText}>{t("noInternet")}</Text>}
      </View>
    );
  }

  // If we failed to get content
  if (!bookContent || bookContent.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text>{t("noContent")}</Text>
      </View>
    );
  }

  const currentPageContent = bookContent[currentPage - 1] || "";
  const currentMatch = searchResults[currentMatchIndex];

  // Get text style based on language direction
  const getTextStyle = () => {
    return {
      fontSize: fontSize,
      color: textColor,
      lineHeight: fontSize * 1.5,
      textAlign: isArabicContent ? "right" : "left",
      writingDirection: isArabicContent ? "rtl" : "ltr",
    };
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={goToPrevPage}
          disabled={currentPage <= 1}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={currentPage <= 1 ? "#999" : "#FFF"}
          />
        </TouchableOpacity>

        <View style={styles.pageInfo}>
          <Text style={styles.pageInfoText}>
            {t("page")} {currentPage} {t("of")} {numberOfPages}
            {isUsingCache ? ` (${t("cached")})` : ""}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.navButton}
          onPress={goToNextPage}
          disabled={currentPage >= numberOfPages}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={currentPage >= numberOfPages ? "#999" : "#FFF"}
          />
        </TouchableOpacity>
      </View>

      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={16} color="#FFF" />
          <Text style={styles.offlineBannerText}>{t("offlineMode")}</Text>
        </View>
      )}

      {/* Controls Toolbar */}
      <View style={styles.toolbar}>
        {/* Search Toggle */}
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => setIsSearchVisible(!isSearchVisible)}
        >
          <Ionicons name="search" size={22} color="#FFF" />
        </TouchableOpacity>

        {/* Bookmark Toggle */}
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={handleToggleBookmark}
        >
          <Ionicons
            name={isBookmarked ? "bookmark" : "bookmark-outline"}
            size={22}
            color="#FFF"
          />
        </TouchableOpacity>

        {/* Font Size Controls */}
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => setFontSize(Math.max(12, fontSize - 2))}
        >
          <Ionicons name="text" size={18} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => setFontSize(Math.min(28, fontSize + 2))}
        >
          <Ionicons name="text" size={24} color="#FFF" />
        </TouchableOpacity>

        {/* Color Schemes */}
        <View style={styles.colorButtonsContainer}>
          <TouchableOpacity
            style={[styles.colorOption, { backgroundColor: "#FFFFFF" }]}
            onPress={() => {
              setBackgroundColor("#FFFFFF");
              setTextColor("#000000");
            }}
          />
          <TouchableOpacity
            style={[styles.colorOption, { backgroundColor: "#F5F5DC" }]}
            onPress={() => {
              setBackgroundColor("#F5F5DC");
              setTextColor("#333333");
            }}
          />
          <TouchableOpacity
            style={[styles.colorOption, { backgroundColor: "#222222" }]}
            onPress={() => {
              setBackgroundColor("#222222");
              setTextColor("#FFFFFF");
            }}
          />
        </View>
      </View>

      {/* Search Bar (conditionally rendered) */}
      {isSearchVisible && (
        <View style={styles.searchBarContainer}>
          <TextInput
            style={[
              styles.searchInput,
              { textAlign: isArabicContent ? "right" : "left" },
            ]}
            placeholder={t("searchInBook")}
            placeholderTextColor={colors.textSecondary || "#999"}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
          />

          {searchText ? (
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearch}
            >
              <Ionicons name="search" size={20} color="#FFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.searchCloseButton}
              onPress={() => setIsSearchVisible(false)}
            >
              <Ionicons name="close" size={20} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Search Results Navigation */}
      {searchResults.length > 0 && (
        <View style={styles.searchResultsNav}>
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
            <Ionicons name="chevron-up" size={18} color="#FFF" />
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
            <Ionicons name="chevron-down" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Content Display */}
      <ScrollView
        style={styles.contentContainer}
        contentContainerStyle={[
          styles.contentInner,
          { alignItems: isArabicContent ? "flex-end" : "flex-start" },
        ]}
      >
        {searchText && currentMatch && currentMatch.page === currentPage ? (
          <HighlightedText
            text={currentPageContent}
            highlight={searchText}
            textStyle={getTextStyle()}
            highlightStyle={{ backgroundColor: "yellow" }}
          />
        ) : (
          <Text style={getTextStyle()}>{currentPageContent}</Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  offlineText: {
    marginTop: 10,
    textAlign: "center",
    color: "#666",
    paddingHorizontal: 20,
  },
  offlineBanner: {
    backgroundColor: "#ff9800",
    padding: 4,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  offlineBannerText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 12,
  },
  navBar: {
    flexDirection: "row",
    backgroundColor: colors.primary || "#2196F3",
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  navButton: {
    padding: 6,
  },
  pageInfo: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pageInfoText: {
    color: "#FFF",
    fontSize: 13,
  },
  toolbar: {
    flexDirection: "row",
    backgroundColor: colors.primary || "#2196F3",
    paddingHorizontal: 10,
    paddingBottom: 8,
    paddingTop: 0,
    justifyContent: "space-between",
    alignItems: "center",
  },
  toolbarButton: {
    padding: 6,
    borderRadius: 4,
  },
  colorButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  colorOption: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: "#FFF",
  },
  searchBarContainer: {
    flexDirection: "row",
    backgroundColor: colors.background || "#F5F5F5",
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#DDD",
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.card || "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CCC",
    paddingHorizontal: 10,
    paddingVertical: 5,
    color: colors.text || "#333",
    fontSize: 14,
  },
  searchButton: {
    marginLeft: 8,
    backgroundColor: colors.primary,
    borderRadius: 6,
    padding: 6,
  },
  searchCloseButton: {
    marginLeft: 8,
    backgroundColor: "#888",
    borderRadius: 6,
    padding: 6,
  },
  searchResultsNav: {
    flexDirection: "row",
    backgroundColor: colors.background || "#F5F5F5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: "#DDD",
  },
  matchCount: {
    color: colors.text,
    marginRight: 12,
    fontSize: 14,
  },
  arrowButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: colors.primary || "#2196F3",
  },
  arrowDisabled: {
    backgroundColor: "#999",
  },
  contentContainer: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    width: "100%",
  },
});

export default CustomPdfReaderScreen;
