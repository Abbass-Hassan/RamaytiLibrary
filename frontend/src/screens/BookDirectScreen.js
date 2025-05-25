// frontend/src/screens/BookDirectScreen.js
import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import colors from "../config/colors";

const API_BASE_URL = "https://backend-aged-smoke-3335.fly.dev"; // <-- Updated API URL

const BookDirectScreen = ({ route }) => {
  const { bookId, bookTitle } = route.params || {};
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    console.log("BookDirectScreen mounted with params:", route.params);
    console.log("Book ID:", bookId);
    console.log("Book Title:", bookTitle);

    const fetchBookInfoAndNavigate = async () => {
      try {
        if (!bookId) {
          console.error("Cannot fetch book info - bookId is undefined!");
          setLoading(false);
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/books/${bookId}` // <-- Updated line
        );
        const data = await response.json();
        console.log("Book info received:", data);

        // Immediately navigate to the enhanced reader
        navigation.replace("CustomPdfReader", {
          bookId,
          bookTitle: bookTitle || data.title,
          page: 1,
        });
      } catch (error) {
        console.error("Error fetching book info:", error);
        setLoading(false);
      }
    };

    fetchBookInfoAndNavigate();
  }, [bookId, bookTitle, navigation]);

  // Just show a loading indicator while the navigation is happening
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>{t("loadingBook")}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background || "#F5F5F5",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
  },
});

export default BookDirectScreen;
