import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import colors from "../config/colors";

const BookDirectScreen = ({ route }) => {
  const { bookId, bookTitle } = route.params || {};
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [bookInfo, setBookInfo] = useState(null);

  useEffect(() => {
    console.log("BookDirectScreen mounted with params:", route.params);
    console.log("Book ID:", bookId);
    console.log("Book Title:", bookTitle);

    const fetchBookInfo = async () => {
      try {
        setLoading(true);

        if (!bookId) {
          console.error("Cannot fetch book info - bookId is undefined!");
          setLoading(false);
          return;
        }

        const response = await fetch(
          `http://ramaytilibrary-production.up.railway.app/api/books/${bookId}`
        );
        const data = await response.json();
        console.log("Book info received:", data);
        setBookInfo(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching book info:", error);
        Alert.alert("Error", "Failed to load book information.");
        setLoading(false);
      }
    };

    fetchBookInfo();
  }, [bookId]);

  const openCustomReader = () => {
    console.log("Navigating to CustomPdfReader with:", {
      bookId,
      bookTitle,
      page: 1,
    });

    if (!bookId) {
      console.error("ERROR: bookId is undefined!");
      Alert.alert(
        "Navigation Error",
        "Book ID is missing. Please try selecting a different book."
      );
      return;
    }

    navigation.navigate("CustomPdfReader", {
      bookId,
      bookTitle,
      page: 1,
    });
  };

  const openStandardPdfViewer = () => {
    console.log("Navigating to DirectPdf with:", {
      bookId,
      bookTitle,
      page: 1,
    });

    if (!bookId) {
      console.error("ERROR: bookId is undefined!");
      Alert.alert(
        "Navigation Error",
        "Book ID is missing. Please try selecting a different book."
      );
      return;
    }

    navigation.navigate("DirectPdf", {
      bookId,
      bookTitle,
      page: 1,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!bookInfo) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Book information not available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{bookTitle || bookInfo.title}</Text>

      {bookInfo.description && (
        <Text style={styles.description}>{bookInfo.description}</Text>
      )}

      <View style={styles.readerOptions}>
        <Text style={styles.optionsTitle}>Reading Options</Text>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={openCustomReader}
        >
          <Text style={styles.optionButtonText}>Open Enhanced Reader</Text>
          <Text style={styles.optionDescription}>
            Customizable text with font size and color options
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionButton, styles.secondaryButton]}
          onPress={openStandardPdfViewer}
        >
          <Text style={styles.optionButtonText}>Open Standard PDF</Text>
          <Text style={styles.optionDescription}>
            Standard PDF viewer for original document formatting
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background || "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background || "#F5F5F5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text || "#333",
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: colors.text || "#333",
    marginBottom: 30,
    lineHeight: 22,
  },
  readerOptions: {
    backgroundColor: colors.card || "#FFF",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text || "#333",
    marginBottom: 15,
  },
  optionButton: {
    backgroundColor: colors.primary || "#2196F3",
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  secondaryButton: {
    backgroundColor: colors.secondary || "#757575",
  },
  optionButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  optionDescription: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
});

export default BookDirectScreen;
