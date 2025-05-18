import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  LogBox,
  Platform,
} from "react-native";
import colors from "../config/colors";
import { useRoute } from "@react-navigation/native";
import NetInfo from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import { I18nManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Ignore network errors in the console
LogBox.ignoreLogs(["Fetch error", "Network request failed", "Server error"]);

// Base URL for the API
const BASE_URL = "https://ramaytilibrary-production.up.railway.app";
const API_ENDPOINT = `${BASE_URL}/api/books`;

// Mock data to use when server is unavailable
const MOCK_BOOKS = [
  {
    id: "book1",
    title: "كتاب ١",
    sections: [
      {
        id: "book1_section1",
        name: "المجلد الأول",
        pdfPath: "/files/174534127-92879.pdf",
        fileName: "174534127-92879.pdf",
      },
      {
        id: "book1_section2",
        name: "المجلد الثاني",
        pdfPath: "/files/174534175-95989.pdf",
        fileName: "174534175-95989.pdf",
      },
    ],
    imagePath: null,
  },
  {
    id: "book2",
    title: "كتاب ٢",
    sections: [
      {
        id: "book2_section1",
        name: "المجلد الأول",
        pdfPath: "/files/174568508-65869.pdf",
        fileName: "174568508-65869.pdf",
      },
    ],
    imagePath: null,
  },
  {
    id: "book3",
    title: "كتاب ٣",
    sections: [
      {
        id: "book3_section1",
        name: "المجلد الأول",
        pdfPath: "/files/arabic_text_test.pdf",
        fileName: "arabic_text_test.pdf",
      },
    ],
    imagePath: null,
  },
];

// Helper function to convert numbers to Arabic numerals
const toArabicNumeral = (num) => {
  const arabicNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return num
    .toString()
    .split("")
    .map((digit) =>
      isNaN(parseInt(digit)) ? digit : arabicNumerals[parseInt(digit)]
    )
    .join("");
};

// Preload default book cover
const DEFAULT_BOOK_COVER = require("../assets/book-cover.png");

const BooksListScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL || i18n.language === "ar";

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [usingMockData, setUsingMockData] = useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const route = useRoute();

  // Determine if we're in DirectTab by checking the parent route name
  const isDirectTab = route.name === "DirectBooksListScreen";

  // Save books to local storage for offline access
  const saveBooks = async (booksData) => {
    try {
      await AsyncStorage.setItem(
        "cachedBooks",
        JSON.stringify({
          timestamp: Date.now(),
          data: booksData,
        })
      );
      console.log(`Saved ${booksData.length} books to local storage`);
    } catch (error) {
      console.error("Error saving books to storage:", error);
    }
  };

  // Get cached books from local storage
  const getCachedBooks = async () => {
    try {
      const storedData = await AsyncStorage.getItem("cachedBooks");
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        console.log(
          `Retrieved ${
            parsedData.data.length
          } cached books, stored at ${new Date(parsedData.timestamp)}`
        );
        return parsedData.data;
      }
      return null;
    } catch (error) {
      console.error("Error getting books from storage:", error);
      return null;
    }
  };

  // Check if server is actually reachable
  const isServerReachable = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/test`, {
        method: "GET",
        timeout: 5000,
      });
      return response.ok;
    } catch (error) {
      console.log("Server connectivity test failed:", error.message);
      return false;
    }
  };

  // Check network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const wasOffline = isOffline;
      setIsOffline(!state.isConnected);

      // Show offline banner when connection is lost
      if (state.isConnected === false && !wasOffline) {
        setShowOfflineBanner(true);
      }

      // If we just came online and have no books, try fetching
      if (state.isConnected && books.length === 0 && !loading) {
        fetchBooks();
      }
    });

    // Clean up
    return () => unsubscribe();
  }, [books.length, loading, isOffline]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get cached books FIRST
      const cachedBooks = await getCachedBooks();

      // Check if we're online
      const networkState = await NetInfo.fetch();
      const isConnected = networkState.isConnected;
      setIsOffline(!isConnected);

      // If we have cached books, show them immediately
      if (cachedBooks && cachedBooks.length > 0) {
        console.log("Using cached books initially");
        setBooks(cachedBooks);
        setUsingMockData(false);
        setLoading(false);
      }

      // If we're offline, only use cached/mock data and don't try API
      if (!isConnected) {
        setLoading(false);

        if (cachedBooks && cachedBooks.length > 0) {
          console.log("Offline: Using cached books");
          setBooks(cachedBooks);
          setUsingMockData(false);
        } else {
          console.log("Offline: Using mock books");
          const processedMockBooks = processMockBooks(MOCK_BOOKS);
          setBooks(processedMockBooks);
          setUsingMockData(true);
          saveBooks(processedMockBooks);
        }
        return; // Important: Return early to avoid any API calls
      }

      // If we're online, try to fetch data from the API endpoint
      try {
        console.log("Fetching books from API:", API_ENDPOINT);
        const response = await fetch(API_ENDPOINT, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          timeout: 10000,
        });

        console.log("API response status:", response.status);

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const responseText = await response.text();
        console.log("Response content length:", responseText.length);
        console.log("First 100 chars:", responseText.substring(0, 100));

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.error("JSON parse error:", jsonError);
          throw new Error("Invalid JSON response");
        }

        console.log(
          "Books data fetched successfully:",
          Array.isArray(data) ? data.length : "Not an array"
        );

        // Process the data
        const processedBooks = Array.isArray(data)
          ? data.map(processBook)
          : data.data && Array.isArray(data.data)
          ? data.data.map(processBook)
          : [];

        console.log(`Processed ${processedBooks.length} books`);

        if (processedBooks.length > 0) {
          setBooks(processedBooks);
          saveBooks(processedBooks);
          setUsingMockData(false);
        } else if (!cachedBooks || cachedBooks.length === 0) {
          // Only use mock if we didn't have cached books
          const processedMockBooks = processMockBooks(MOCK_BOOKS);
          setBooks(processedMockBooks);
          setUsingMockData(true);
          saveBooks(processedMockBooks);
          setError("No books found on server. Using sample books.");
        }
      } catch (apiError) {
        console.error("API fetch error:", apiError.message);

        // We already showed cached books, so just log the error
        if (!cachedBooks || cachedBooks.length === 0) {
          // Only use mock if we didn't have cached books
          const processedMockBooks = processMockBooks(MOCK_BOOKS);
          setBooks(processedMockBooks);
          setUsingMockData(true);
          saveBooks(processedMockBooks);
          setError(`Server error: ${apiError.message}. Using local books.`);
        }
      }
    } catch (error) {
      console.error("General error in fetchBooks:", error.message);
      setError(error.message);

      // Try to use cached books or mock data as fallback
      const cachedBooks = await getCachedBooks();
      if (cachedBooks && cachedBooks.length > 0) {
        setBooks(cachedBooks);
        setUsingMockData(false);
      } else {
        const processedMockBooks = processMockBooks(MOCK_BOOKS);
        setBooks(processedMockBooks);
        setUsingMockData(true);
        saveBooks(processedMockBooks);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Process a book from the API
  const processBook = (book) => {
    return {
      ...book,
      // Make sure sections is always an array
      sections: book.sections || [],
      // Add coverImageUrl
      coverImageUrl: book.imagePath
        ? book.imagePath.startsWith("http")
          ? book.imagePath
          : `${BASE_URL}${book.imagePath}`
        : null,
    };
  };

  // Process mock books to add full URLs and other properties
  const processMockBooks = (mockBooks) => {
    return mockBooks.map((book) => ({
      ...book,
      id: book.id || String(Date.now() + Math.random()),
      // Make sure sections is always an array
      sections: book.sections || [],
      // Add coverImageUrl
      coverImageUrl: book.imagePath
        ? book.imagePath.startsWith("http")
          ? book.imagePath
          : `${BASE_URL}${book.imagePath}`
        : null,
      // Add properties to identify that this is mock data
      isMockData: true,
    }));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBooks();
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleBookPress = (book) => {
    if (book.sections && book.sections.length > 0) {
      // If the book has sections (volumes), navigate to volumes screen
      navigation.navigate("BookVolumesScreen", {
        book: book,
        bookId: book.id,
        bookTitle: book.title,
      });
    } else if (isDirectTab) {
      // Direct PDF view if there are no sections or in DirectTab
      navigation.navigate("CustomPdfReader", {
        bookId: book.id,
        bookTitle: book.title,
        page: 1,
        pdfFilename: book.pdfFilename || getFilenameFromPath(book.pdfPath),
      });
    } else {
      // Fallback to old sections screen if needed
      navigation.navigate("SectionsScreen", { bookId: book.id });
    }
  };

  // Helper to extract filename from path
  const getFilenameFromPath = (path) => {
    if (!path) return null;
    const parts = path.split("/");
    return parts[parts.length - 1];
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity onPress={() => handleBookPress(item)} style={styles.card}>
      <View style={styles.coverContainer}>
        {item.coverImageUrl ? (
          // FIX: Remove defaultSource on Android to prevent the error
          Platform.OS === "ios" ? (
            <Image
              source={{ uri: item.coverImageUrl }}
              style={styles.coverImage}
              resizeMode="cover"
              defaultSource={DEFAULT_BOOK_COVER}
            />
          ) : (
            <Image
              source={{ uri: item.coverImageUrl }}
              style={styles.coverImage}
              resizeMode="cover"
              // No defaultSource on Android
            />
          )
        ) : (
          <Image
            source={DEFAULT_BOOK_COVER}
            style={styles.coverImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.titleOverlay}>
          <Text style={styles.bookTitle} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
        {item.sections && item.sections.length > 0 && (
          <View style={styles.sectionsIndicator}>
            <Text style={styles.sectionsCount}>
              {toArabicNumeral(item.sections.length)} {t("volumes")}
            </Text>
          </View>
        )}
        {(item.isMockData || isOffline) && (
          <View style={styles.mockBadge}>
            <Text style={styles.mockBadgeText}>{t("offline")}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t("loadingBooks")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isOffline && showOfflineBanner && (
        <TouchableOpacity
          style={styles.offlineBanner}
          onPress={() => setShowOfflineBanner(false)} // Allow dismissing
        >
          <Text style={styles.offlineBannerText}>{t("offlineMode")}</Text>
        </TouchableOpacity>
      )}
      {error && (
        <TouchableOpacity
          style={styles.errorBanner}
          onPress={() => setError(null)}
        >
          <Text style={styles.errorBannerText}>{error}</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={books}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={
          <Text style={styles.emptyText}>{t("noBooksFound")}</Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 10,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
    textAlign: "center",
  },
  errorBanner: {
    backgroundColor: "#ffcdd2",
    padding: 5,
    alignItems: "center",
  },
  errorBannerText: {
    color: "#b71c1c",
    fontWeight: "bold",
  },
  offlineBanner: {
    backgroundColor: "rgba(255, 152, 0, 0.7)", // More transparent
    padding: 5,
    alignItems: "center",
  },
  offlineBannerText: {
    color: "white",
    fontWeight: "bold",
  },
  listContainer: {
    paddingBottom: 20,
    paddingHorizontal: 10,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    marginVertical: 8,
    alignItems: "center",
  },
  coverContainer: {
    width: 160,
    height: 220,
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  titleOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 8,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  sectionsIndicator: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  sectionsCount: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  mockBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#ff9800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  mockBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: colors.text,
    marginTop: 40,
  },
});

export default BooksListScreen;
