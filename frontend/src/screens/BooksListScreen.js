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
} from "react-native";
import colors from "../config/colors";
import { useRoute } from "@react-navigation/native";
import NetInfo from "@react-native-community/netinfo";
import { useTranslation } from "react-i18next";
import { I18nManager } from "react-native";

// Working API endpoint based on our tests
const API_URL = "http://ramaytilibrary-production.up.railway.app/api/books";

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

  // Check network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);

      // If we just came online and have no books, try fetching
      if (state.isConnected && books.length === 0 && !loading) {
        fetchBooks();
      }
    });

    // Clean up
    return () => unsubscribe();
  }, [books.length, loading]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if we're online first
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        setIsOffline(true);
        setLoading(false);
        setError(t("noInternet"));
        return;
      }

      console.log("Fetching books from:", API_URL);

      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        timeout: 10000, // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`${t("serverError")}: ${response.status}`);
      }

      const data = await response.json();
      console.log("Books fetched successfully:", data.length || 0);
      setBooks(data);
    } catch (error) {
      console.error("Error fetching books:", error.message);
      setError(error.message);

      Alert.alert(t("errorTitle"), `${t("errorLoading")}: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBooks();
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleBookPress = (book) => {
    if (isDirectTab) {
      navigation.navigate("CustomPdfReader", {
        bookId: book.id,
        bookTitle: book.title,
        page: 1,
      });
    } else {
      // In other tabs (like SectionsTab), go to SectionsScreen
      navigation.navigate("SectionsScreen", { bookId: book.id });
    }
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity onPress={() => handleBookPress(item)} style={styles.card}>
      <View style={styles.coverContainer}>
        <Image
          source={require("../assets/book-cover.png")}
          style={styles.coverImage}
          resizeMode="cover"
        />
        <Text style={styles.volumeNumber}>{toArabicNumeral(index + 1)}</Text>
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

  if (isOffline) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>{t("offline")}</Text>
        <Text style={styles.errorSubtext}>{t("checkConnection")}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchBooks}>
          <Text style={styles.retryButtonText}>{t("retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (error && books.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>{t("errorLoading")}</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchBooks}>
          <Text style={styles.retryButtonText}>{t("retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
    paddingTop: 20,
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
  },
  errorText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "red",
    marginBottom: 10,
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 16,
    color: colors.text,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
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
  volumeNumber: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    fontSize: 26,
    fontWeight: "bold",
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

export default BooksListScreen;
