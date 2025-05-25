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
import {
  getBundledBooks,
  initializeBundledPdfs,
  getBundledImagePath,
} from "../services/bundledPdfService";

// Ignore network errors in the console
LogBox.ignoreLogs(["Fetch error", "Network request failed", "Server error"]);

// Base URL for the API
const BASE_URL = "https://backend-aged-smoke-3335.fly.dev";
const API_ENDPOINT = `${BASE_URL}/api/books`;

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
  const route = useRoute();

  // Determine if we're in DirectTab by checking the parent route name
  const isDirectTab = route.name === "DirectBooksListScreen";

  // Initialize bundled content on mount
  useEffect(() => {
    initializeBooks();
  }, []);

  // Check network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  const initializeBooks = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, initialize and load bundled books
      await initializeBundledPdfs();
      const bundledBooks = getBundledBooks();

      if (bundledBooks && bundledBooks.length > 0) {
        console.log(`Loaded ${bundledBooks.length} bundled books`);

        // Process bundled books for display
        const processedBooks = bundledBooks.map((book) => ({
          ...book,
          coverImageUrl: book.imagePath
            ? getBundledImagePath(book.imagePath)
            : null,
          isOffline: true, // Mark as offline/bundled book
        }));

        setBooks(processedBooks);
        setLoading(false);
      } else {
        // No bundled books, try to fetch from server
        console.log("No bundled books found, trying server...");
        await fetchBooksFromServer();
      }
    } catch (error) {
      console.error("Error initializing books:", error);
      setError("Failed to load books");
      setLoading(false);
    }
  };

  const fetchBooksFromServer = async () => {
    try {
      // Check if we're online
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        setIsOffline(true);
        setError("No internet connection. Only bundled books are available.");
        return;
      }

      console.log("Fetching books from server...");
      const response = await fetch(API_ENDPOINT, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Fetched ${data.length} books from server`);

      // Process server books
      const processedBooks = data.map((book) => ({
        ...book,
        coverImageUrl: book.imagePath
          ? book.imagePath.startsWith("http")
            ? book.imagePath
            : `${BASE_URL}${book.imagePath}`
          : null,
        isOffline: false, // Mark as online book
      }));

      // Merge with bundled books if needed
      const bundledBooks = getBundledBooks();
      if (bundledBooks.length > 0) {
        // Create a map of bundled books by ID for easy lookup
        const bundledMap = {};
        bundledBooks.forEach((book) => {
          bundledMap[book.id] = book;
        });

        // Update bundled books with any new data from server
        const mergedBooks = processedBooks.map((serverBook) => {
          if (bundledMap[serverBook.id]) {
            // This book is bundled, prefer bundled data
            return {
              ...serverBook,
              ...bundledMap[serverBook.id],
              coverImageUrl: bundledMap[serverBook.id].imagePath
                ? getBundledImagePath(bundledMap[serverBook.id].imagePath)
                : serverBook.coverImageUrl,
              isOffline: true,
            };
          }
          return serverBook;
        });

        setBooks(mergedBooks);
      } else {
        setBooks(processedBooks);
      }
    } catch (error) {
      console.error("Server fetch error:", error);
      // Don't override bundled books if server fails
      if (books.length === 0) {
        setError("Failed to fetch books from server");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Only try to fetch from server on refresh
    fetchBooksFromServer();
  };

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

  const renderBookImage = (item) => {
    if (!item.coverImageUrl) {
      return (
        <Image
          source={DEFAULT_BOOK_COVER}
          style={styles.coverImage}
          resizeMode="cover"
        />
      );
    }

    // For bundled images on Android
    if (
      item.isOffline &&
      Platform.OS === "android" &&
      item.coverImageUrl.startsWith("asset:")
    ) {
      return (
        <Image
          source={{ uri: item.coverImageUrl }}
          style={styles.coverImage}
          resizeMode="cover"
        />
      );
    }

    // For bundled images on iOS
    if (item.isOffline && Platform.OS === "ios") {
      return (
        <Image
          source={{ uri: item.coverImageUrl }}
          style={styles.coverImage}
          resizeMode="cover"
        />
      );
    }

    // For online images
    return (
      <Image
        source={{ uri: item.coverImageUrl }}
        style={styles.coverImage}
        resizeMode="cover"
      />
    );
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity onPress={() => handleBookPress(item)} style={styles.card}>
      <View style={styles.coverContainer}>
        {renderBookImage(item)}
        <View style={styles.titleOverlay}>
          <Text style={styles.bookTitle} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
        {item.isOffline && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>✓</Text>
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
  offlineBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#4caf50",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  offlineBadgeText: {
    color: "white",
    fontSize: 14,
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
