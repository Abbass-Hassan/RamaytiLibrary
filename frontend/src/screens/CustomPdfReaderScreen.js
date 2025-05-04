import React, { useState, useEffect, useRef } from "react";
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
  findNodeHandle,
  UIManager,
  Clipboard,
  Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import {
  getBookmarks,
  saveBookmark,
  removeBookmark,
} from "../services/bookmarkService";
import {
  getPdfPath,
  downloadPdfToLocal,
  getFilenameFromPath,
} from "../services/pdfStorageService";
import { initializeBundledPdfs } from "../services/bundledPdfService";
import colors from "../config/colors";
import HighlightedText from "./HighlightedText";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

const containsArabic = (text) => {
  return /[\u0600-\u06FF]/.test(text);
};

const toArabicDigits = (num) => {
  if (num === undefined || num === null) return "";
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
};

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

const findAllOccurrences = (text, searchString) => {
  if (!text || !searchString) return [];

  const lowerText = text.toLowerCase();
  const lowerSearch = searchString.toLowerCase();
  const indices = [];
  let pos = lowerText.indexOf(lowerSearch);

  while (pos !== -1) {
    indices.push(pos);
    pos = lowerText.indexOf(lowerSearch, pos + lowerSearch.length);
  }

  return indices;
};

const showCopyToast = (message) => {
  Alert.alert("", message, [{ text: "OK" }], { cancelable: true });
};

const SelectableTextWrapper = ({ children, style, onSelectionChange }) => {
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const textRef = useRef(null);

  const handleLongPress = () => {
    if (textRef.current && typeof onSelectionChange === "function") {
      onSelectionChange(true);
    }
  };

  return (
    <Text
      ref={textRef}
      style={style}
      selectable={true}
      onLongPress={handleLongPress}
    >
      {children}
    </Text>
  );
};

const CustomPdfReaderScreen = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { bookId, bookTitle, page, searchTerm } = route.params || {};
  const isRTL = I18nManager.isRTL;

  const [isFromGlobalSearch, setIsFromGlobalSearch] = useState(!!searchTerm);
  const [bookContent, setBookContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isArabicContent, setIsArabicContent] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [numberOfPages, setNumberOfPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(page || 1);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [searchText, setSearchText] = useState(searchTerm || "");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [occurrencesOnPage, setOccurrencesOnPage] = useState([]);
  const [activeOccurrenceIndex, setActiveOccurrenceIndex] = useState(0);
  const [selectedText, setSelectedText] = useState("");
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);
  const [selectionActive, setSelectionActive] = useState(false);
  const scrollViewRef = useRef(null);
  const textRef = useRef(null);
  const [fontSize, setFontSize] = useState(16);
  const [textColor, setTextColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");

  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const [touchEndY, setTouchEndY] = useState(0);
  const [isVerticalScrolling, setIsVerticalScrolling] = useState(false);

  useEffect(() => {
    if (
      backgroundColor === "#222222" &&
      (textColor === "#000000" || textColor === "#333333")
    ) {
      setTextColor("#FFFFFF");
    } else if (
      (backgroundColor === "#FFFFFF" || backgroundColor === "#F5F5DC") &&
      textColor === "#FFFFFF"
    ) {
      setTextColor(backgroundColor === "#FFFFFF" ? "#000000" : "#333333");
    }
  }, [backgroundColor]);

  useEffect(() => {
    const resetBookState = navigation.addListener("focus", () => {
      if (route.params?.resetState) {
        setCurrentPage(page || 1);
        setSearchText(searchTerm || "");
        setIsSearchVisible(false);
        setSearchResults([]);
        setCurrentMatchIndex(0);
        setOccurrencesOnPage([]);
        setActiveOccurrenceIndex(0);
        setShowSelectionToolbar(false);
        setSelectionActive(false);
      }
    });

    return resetBookState;
  }, [navigation, route.params]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (searchTerm && bookContent.length > 0) {
      setSearchText(searchTerm);

      setTimeout(() => {
        handleSearch(searchTerm);
      }, 100);
    }
  }, [bookContent, searchTerm]);

  useEffect(() => {
    if (occurrencesOnPage.length > 0 && scrollViewRef.current) {
      const index = activeOccurrenceIndex % occurrencesOnPage.length;
      const position = occurrencesOnPage[index];

      const avgCharPerLine = 60;
      const linesPerScreen = 15;
      const charHeight = fontSize * 1.2;

      const pageContent = bookContent[currentPage - 1] || "";
      const textBeforeMatch = pageContent.substring(0, position);
      const lineBreaks = textBeforeMatch.split("\n").length - 1;

      const estimatedLines =
        textBeforeMatch.length / avgCharPerLine + lineBreaks;
      const estimatedPosition = estimatedLines * charHeight;

      const scrollOffset = Math.max(
        0,
        estimatedPosition - (linesPerScreen * charHeight) / 3
      );

      setTimeout(() => {
        scrollViewRef.current.scrollTo({
          y: scrollOffset,
          animated: true,
        });
      }, 100);
    }
  }, [activeOccurrenceIndex, occurrencesOnPage, currentPage]);

  useEffect(() => {
    if (searchText && currentPage > 0 && currentPage <= bookContent.length) {
      const pageContent = bookContent[currentPage - 1] || "";
      const occurrences = findAllOccurrences(pageContent, searchText);
      setOccurrencesOnPage(occurrences);
      setActiveOccurrenceIndex(0);
    } else {
      setOccurrencesOnPage([]);
    }
  }, [searchText, currentPage, bookContent]);

  const fetchFreshContent = async (effectiveBookId) => {
    try {
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        console.log("Not fetching fresh content - device is offline");
        return;
      }

      try {
        const url = `http://ramaytilibrary-production.up.railway.app/api/books/${effectiveBookId}/content`;
        console.log("Fetching fresh content from URL:", url);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(url, {
          signal: controller.signal,
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `Server responded with status code ${response.status}`
          );
        }

        const data = await response.json();

        if (typeof saveBookContent === "function") {
          await saveBookContent(effectiveBookId, data.content);
        }

        if (loading || isUsingCache) {
          setBookContent(data.content);
          setNumberOfPages(data.content.length);

          if (data.content && data.content.length > 0) {
            const isArabic = containsArabic(data.content[0]);
            setIsArabicContent(isArabic);
          }

          setLoading(false);
          setIsUsingCache(false);
        }
      } catch (error) {
        console.error("Error fetching fresh content:", error);
        if (loading) {
          setError(error.message);
          setLoading(false);
        }
      }
    } catch (generalError) {
      console.error("General error in fetchFreshContent:", generalError);
    }
  };

  useEffect(() => {
    const fetchBookContent = async () => {
      try {
        setLoading(true);

        await initializeBundledPdfs();

        const effectiveBookId = bookId || "C2qKmMSFbnMRVbdrfAAn";

        const cachedContent = await getBookContent(effectiveBookId);

        const networkState = await NetInfo.fetch();
        const isConnected = networkState.isConnected;
        setIsOffline(!isConnected);

        if (cachedContent && cachedContent.length > 0) {
          setBookContent(cachedContent);
          setNumberOfPages(cachedContent.length);
          setIsUsingCache(true);

          if (cachedContent && cachedContent.length > 0) {
            const isArabic = containsArabic(cachedContent[0]);
            setIsArabicContent(isArabic);
          }

          setLoading(false);

          if (isConnected) {
            setTimeout(() => {
              fetchFreshContent(effectiveBookId).catch((err) => {
                console.log("Background refresh failed silently:", err.message);
              });
            }, 2000);
          }
          return;
        }

        let bookData = null;
        let pdfFilename = null;

        if (isConnected) {
          try {
            const response = await fetch(
              `http://ramaytilibrary-production.up.railway.app/api/books/${effectiveBookId}`
            );
            if (response.ok) {
              bookData = await response.json();
              pdfFilename =
                bookData.pdfFilename || getFilenameFromPath(bookData.pdfPath);
            }
          } catch (error) {
            console.log("Failed to fetch book details:", error);
          }
        }

        const localPdfPath = await getPdfPath(effectiveBookId, pdfFilename);

        if (localPdfPath) {
          console.log("PDF found locally or in bundle, extracting content...");
          try {
            const contentResponse = await fetch(
              `http://ramaytilibrary-production.up.railway.app/api/books/${effectiveBookId}/content`
            );
            if (contentResponse.ok) {
              const data = await contentResponse.json();
              await saveBookContent(effectiveBookId, data.content);

              setBookContent(data.content);
              setNumberOfPages(data.content.length);

              if (data.content && data.content.length > 0) {
                const isArabic = containsArabic(data.content[0]);
                setIsArabicContent(isArabic);
              }

              setLoading(false);
              return;
            }
          } catch (error) {
            console.log("Failed to extract content from local PDF:", error);
          }
        }

        if (!isConnected) {
          throw new Error(
            "No internet connection and no cached content available"
          );
        }

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

  const handleTextSelection = (hasSelection) => {
    setSelectionActive(hasSelection);
    if (hasSelection) {
      setShowSelectionToolbar(true);
    } else {
      setShowSelectionToolbar(false);
    }
  };

  const copySelectedText = async () => {
    try {
      const selection = await new Promise((resolve) => {
        resolve(getCurrentSelection());
      });

      if (selection) {
        Clipboard.setString(selection);
        showCopyToast(t("textCopied") || "Text copied to clipboard");
        setShowSelectionToolbar(false);
        setSelectionActive(false);
      }
    } catch (error) {
      console.error("Error copying text:", error);
    }
  };

  const getCurrentSelection = () => {
    return currentPageContent.substring(0, 100) + "...";
  };

  const handleSearch = async (term = searchText) => {
    if (!term.trim()) return;

    const results = [];

    bookContent.forEach((pageContent, pageIndex) => {
      const lowerCasePageText = pageContent.toLowerCase();
      const lowerCaseSearchText = term.toLowerCase();

      let startIndex = 0;
      let matchCount = 0;

      while (startIndex < lowerCasePageText.length) {
        const foundIndex = lowerCasePageText.indexOf(
          lowerCaseSearchText,
          startIndex
        );

        if (foundIndex === -1) break;

        matchCount++;

        const snippetStart = Math.max(0, foundIndex - 40);
        const snippetEnd = Math.min(
          pageContent.length,
          foundIndex + term.length + 40
        );
        const snippet = pageContent.substring(snippetStart, snippetEnd);

        results.push({
          page: pageIndex + 1,
          index: foundIndex,
          snippet,
        });

        startIndex = foundIndex + lowerCaseSearchText.length;

        if (matchCount >= 15) break;
      }
    });

    setSearchResults(results);
    setCurrentMatchIndex(0);

    if (results.length > 0) {
      jumpToMatch(0, results);
    } else if (!isFromGlobalSearch) {
      Alert.alert(t("search"), t("noResultsFound"));
    }
  };

  const jumpToMatch = (matchIndex, resultsArray = searchResults) => {
    const match = resultsArray[matchIndex];
    if (!match) return;

    setCurrentPage(match.page);
  };

  const nextOccurrenceOnPage = () => {
    if (occurrencesOnPage.length === 0) return;

    setActiveOccurrenceIndex(
      (prevIndex) => (prevIndex + 1) % occurrencesOnPage.length
    );
  };

  const prevOccurrenceOnPage = () => {
    if (occurrencesOnPage.length === 0) return;

    setActiveOccurrenceIndex(
      (prevIndex) =>
        (prevIndex - 1 + occurrencesOnPage.length) % occurrencesOnPage.length
    );
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

  const handleTouchStart = (e) => {
    setTouchStartX(e.nativeEvent.pageX);
    setTouchStartY(e.nativeEvent.pageY);
    setIsVerticalScrolling(false);
  };

  const handleTouchMove = (e) => {
    const currentY = e.nativeEvent.pageY;
    const verticalDistance = Math.abs(currentY - touchStartY);

    if (verticalDistance > 15) {
      setIsVerticalScrolling(true);
    }
  };

  const handleTouchEnd = (e) => {
    const currentX = e.nativeEvent.pageX;
    setTouchEndX(currentX);

    if (!isVerticalScrolling) {
      const swipeDistance = touchEndX - touchStartX;
      const minSwipeDistance = 80;

      if (Math.abs(swipeDistance) > minSwipeDistance) {
        if (isRTL || isArabicContent) {
          if (swipeDistance < 0) {
            goToPrevPage();
          } else {
            goToNextPage();
          }
        } else {
          if (swipeDistance > 0) {
            goToPrevPage();
          } else {
            goToNextPage();
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t("loadingBook")}...</Text>
      </View>
    );
  }

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

  if (!bookContent || bookContent.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text>{t("noContent")}</Text>
      </View>
    );
  }

  const currentPageContent = bookContent[currentPage - 1] || "";
  const currentMatch = searchResults[currentMatchIndex];

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
    <View
      style={[styles.container, { backgroundColor }]}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
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
            {t("page")} {toArabicDigits(currentPage)} {t("of")}{" "}
            {toArabicDigits(numberOfPages)}
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

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => setIsSearchVisible(!isSearchVisible)}
        >
          <Ionicons
            name={isSearchVisible ? "close-circle-outline" : "search"}
            size={22}
            color="#FFF"
          />
        </TouchableOpacity>

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

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => setFontSize(Math.max(12, fontSize - 2))}
          accessibilityLabel={t("decreaseFontSize")}
        >
          <Ionicons name="text" size={18} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => setFontSize(Math.min(28, fontSize + 2))}
          accessibilityLabel={t("increaseFontSize")}
        >
          <Ionicons name="text" size={24} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.colorButtonsContainer}>
          <TouchableOpacity
            style={[styles.colorOption, { backgroundColor: "#FFFFFF" }]}
            onPress={() => {
              setBackgroundColor("#FFFFFF");
              setTextColor("#000000");
            }}
            accessibilityLabel={t("background") + ": " + t("light")}
          />
          <TouchableOpacity
            style={[styles.colorOption, { backgroundColor: "#F5F5DC" }]}
            onPress={() => {
              setBackgroundColor("#F5F5DC");
              setTextColor("#333333");
            }}
            accessibilityLabel={t("background") + ": " + t("sepia")}
          />
          <TouchableOpacity
            style={[styles.colorOption, { backgroundColor: "#222222" }]}
            onPress={() => {
              setBackgroundColor("#222222");
              setTextColor("#FFFFFF");
            }}
            accessibilityLabel={t("background") + ": " + t("dark")}
          />
        </View>
      </View>

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
            onSubmitEditing={() => handleSearch()}
          />

          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => handleSearch()}
          >
            <Ionicons name="search" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {occurrencesOnPage.length > 0 && (
        <View style={styles.searchResultsNav}>
          <Text style={styles.matchCount}>
            {toArabicDigits(activeOccurrenceIndex + 1)}/
            {toArabicDigits(occurrencesOnPage.length)} {t("on")} {t("page")}
          </Text>
          <TouchableOpacity
            onPress={prevOccurrenceOnPage}
            disabled={occurrencesOnPage.length <= 1}
            style={[
              styles.arrowButton,
              occurrencesOnPage.length <= 1 && styles.arrowDisabled,
            ]}
          >
            <Ionicons name="chevron-up" size={18} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={nextOccurrenceOnPage}
            disabled={occurrencesOnPage.length <= 1}
            style={[
              styles.arrowButton,
              occurrencesOnPage.length <= 1 && styles.arrowDisabled,
            ]}
          >
            <Ionicons name="chevron-down" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {searchResults.length > 1 && isSearchVisible && (
        <View style={styles.globalSearchNav}>
          <Text style={styles.globalMatchCount}>
            {toArabicDigits(currentMatchIndex + 1)}/
            {toArabicDigits(searchResults.length)} {t("total")}
          </Text>
          <TouchableOpacity
            onPress={handlePrevMatch}
            disabled={currentMatchIndex === 0}
            style={[
              styles.globalArrowButton,
              currentMatchIndex === 0 && styles.arrowDisabled,
            ]}
          >
            <Ionicons name="arrow-back" size={18} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNextMatch}
            disabled={currentMatchIndex === searchResults.length - 1}
            style={[
              styles.globalArrowButton,
              currentMatchIndex === searchResults.length - 1 &&
                styles.arrowDisabled,
            ]}
          >
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.contentContainer}
        contentContainerStyle={[
          styles.contentInner,
          { alignItems: isArabicContent ? "flex-end" : "flex-start" },
        ]}
      >
        {searchText &&
        (occurrencesOnPage.length > 0 ||
          (currentMatch && currentMatch.page === currentPage)) ? (
          <View ref={textRef}>
            <SelectableTextWrapper
              style={getTextStyle()}
              onSelectionChange={handleTextSelection}
            >
              <HighlightedText
                text={currentPageContent}
                highlight={searchText}
                textStyle={getTextStyle()}
                highlightStyle={{ backgroundColor: "yellow" }}
                activeHighlightIndex={activeOccurrenceIndex}
                activeHighlightStyle={{
                  backgroundColor: "#4CAF50",
                  color: "#FFFFFF",
                }}
              />
            </SelectableTextWrapper>
          </View>
        ) : (
          <SelectableTextWrapper
            style={getTextStyle()}
            onSelectionChange={handleTextSelection}
          >
            <Text style={getTextStyle()} selectable={true}>
              {currentPageContent}
            </Text>
          </SelectableTextWrapper>
        )}
      </ScrollView>

      <View style={styles.swipeHintContainer}>
        <Text style={styles.swipeHintText}>
          {isArabicContent || isRTL
            ? "← اسحب لليمين أو لليسار للتنقل بين الصفحات →"
            : "← Swipe left or right to navigate pages →"}
        </Text>
      </View>
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
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: "#FFE0B2",
  },
  globalSearchNav: {
    flexDirection: "row",
    backgroundColor: "#E1F5FE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: "#B3E5FC",
  },
  matchCount: {
    color: "#E65100",
    marginRight: 10,
    fontSize: 13,
    fontWeight: "500",
  },
  globalMatchCount: {
    color: "#01579B",
    marginRight: 10,
    fontSize: 13,
    fontWeight: "500",
  },
  arrowButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    marginHorizontal: 3,
    backgroundColor: "#FF9800",
  },
  globalArrowButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    marginHorizontal: 3,
    backgroundColor: "#03A9F4",
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
  selectionToolbar: {
    flexDirection: "row",
    backgroundColor: colors.primary || "#2196F3",
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  selectionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    marginHorizontal: 4,
  },
  selectionButtonText: {
    marginLeft: 6,
    color: "#FFF",
    fontSize: 13,
  },
  swipeHintContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    opacity: 0.8,
  },
  swipeHintText: {
    color: "#FFF",
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default CustomPdfReaderScreen;
