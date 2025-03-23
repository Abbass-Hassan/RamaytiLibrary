import AsyncStorage from '@react-native-async-storage/async-storage';
import { findBestAvailableLanguage } from 'react-native-localize';

const LANGUAGE_KEY = 'user-language';

const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: (callback) => {
    AsyncStorage.getItem(LANGUAGE_KEY)
      .then((storedLang) => {
        if (storedLang) {
          // If we already have a stored language, use it
          callback(storedLang);
        } else {
          // Otherwise, find the best device language or default to 'ar'
          const bestLang = findBestAvailableLanguage(['en', 'ar']);
          if (bestLang?.languageTag) {
            callback(bestLang.languageTag);
          } else {
            callback('ar');
          }
        }
      })
      .catch((error) => {
        console.error('Error fetching language from AsyncStorage:', error);
        callback('ar');
      });
  },
  init: () => {},
  cacheUserLanguage: (language) => {
    AsyncStorage.setItem(LANGUAGE_KEY, language).catch((err) =>
      console.error('Error saving language to AsyncStorage:', err)
    );
  },
};

export default languageDetector;
