// frontend/src/services/textContentCache.js
import AsyncStorage from "@react-native-async-storage/async-storage";

// Store the extracted content in local storage
export const saveBookContent = async (bookId, content) => {
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

// Get content from local storage
export const getBookContent = async (bookId) => {
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

// Check if content exists and is not too old
export const hasValidContent = async (bookId, maxAgeHours = 24) => {
  try {
    const contentKey = `book_content_${bookId}`;
    const storedData = await AsyncStorage.getItem(contentKey);

    if (!storedData) return false;

    const parsedData = JSON.parse(storedData);
    const ageInHours = (Date.now() - parsedData.timestamp) / (1000 * 60 * 60);

    return ageInHours < maxAgeHours;
  } catch (error) {
    console.error("Error checking book content age:", error);
    return false;
  }
};
