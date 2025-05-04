import AsyncStorage from "@react-native-async-storage/async-storage";

const LANGUAGE_KEY = "user-language";

const languageDetector = {
  type: "languageDetector",
  async: true,
  detect: (callback) => {
    // Always use Arabic regardless of device settings
    callback("ar");

    // Still save it to AsyncStorage for consistency
    AsyncStorage.setItem(LANGUAGE_KEY, "ar").catch((err) =>
      console.error("Error saving language to AsyncStorage:", err)
    );
  },
  init: () => {},
  cacheUserLanguage: () => {
    // Always force Arabic
    AsyncStorage.setItem(LANGUAGE_KEY, "ar").catch((err) =>
      console.error("Error saving language to AsyncStorage:", err)
    );
  },
};

export default languageDetector;
