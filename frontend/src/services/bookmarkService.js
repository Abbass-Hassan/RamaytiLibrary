// frontend/src/services/bookmarkService.js

import AsyncStorage from '@react-native-async-storage/async-storage';

const BOOKMARKS_KEY = 'BOOKMARKS';

export const getBookmarks = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(BOOKMARKS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Error reading bookmarks:', e);
    return [];
  }
};

export const saveBookmark = async (bookmark) => {
  try {
    const bookmarks = await getBookmarks();
    bookmarks.push(bookmark);
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  } catch (e) {
    console.error('Error saving bookmark:', e);
  }
};

export const removeBookmark = async (bookmarkId) => {
  try {
    let bookmarks = await getBookmarks();
    bookmarks = bookmarks.filter(item => item.id !== bookmarkId);
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  } catch (e) {
    console.error('Error removing bookmark:', e);
  }
};
