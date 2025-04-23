import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import colors from "../config/colors";

const DummyPdfScreen = ({ route, navigation }) => {
  const { bookId, sectionIndex, bookTitle = "" } = route.params;
  const { t } = useTranslation();

  useEffect(() => {
    console.log("Redirecting from DummyPdfScreen to CustomPdfReader");
    console.log("Params:", route.params);

    // Fetch the book data to get the section page if needed
    const fetchBookAndNavigate = async () => {
      try {
        const response = await fetch(
          `http://ramaytilibrary-production.up.railway.app/api/books/${bookId}`
        );
        const data = await response.json();
        const sections = data.sections || [];
        const section = sections[sectionIndex];

        // Navigate to our custom PDF reader with appropriate parameters
        navigation.replace("CustomPdfReader", {
          bookId: bookId,
          bookTitle: bookTitle || data.title,
          page: section?.page || 1, // Use section page if available, otherwise start at page 1
        });
      } catch (error) {
        console.error("Error fetching book data for redirection:", error);
        // Even if there's an error, still redirect to CustomPdfReader with default parameters
        navigation.replace("CustomPdfReader", {
          bookId: bookId,
          bookTitle: bookTitle,
          page: 1,
        });
      }
    };

    fetchBookAndNavigate();
  }, [bookId, sectionIndex, bookTitle, navigation, route.params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>{t("loadingBook")}...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background || "#F5F5F5",
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text || "#333",
  },
});

export default DummyPdfScreen;
