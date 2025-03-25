// frontend/src/screens/GlobalMultiSearchScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { I18nManager } from 'react-native';
import HighlightedText from './HighlightedText';

// 1) Import colors
import colors from '../config/colors';

const GlobalMultiSearchScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const [books, setBooks] = useState([]);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const response = await fetch('http://ramaytilibrary-production.up.railway.app/api/books');
        const data = await response.json();
        const booksWithSelection = data.map((book) => ({
          ...book,
          selected: false,
        }));
        setBooks(booksWithSelection);
      } catch (error) {
        console.error('Error fetching books:', error);
      } finally {
        setLoadingBooks(false);
      }
    };
    fetchBooks();
  }, []);

  const toggleBookSelection = (bookId) => {
    const updatedBooks = books.map((book) =>
      book.id === bookId ? { ...book, selected: !book.selected } : book
    );
    setBooks(updatedBooks);

    const newlySelected = updatedBooks
      .filter((b) => b.selected)
      .map((b) => b.id);
    setSelectedBooks(newlySelected);
  };

  const handleSearch = async () => {
    if (!searchText.trim() || selectedBooks.length === 0) {
      Alert.alert(t('errorTitle'), t('emptySearchMessage'));
      return;
    }
    setLoadingResults(true);
    try {
      const bookIdsParam = selectedBooks.join(',');
      const response = await fetch(
        `http://ramaytilibrary-production.up.railway.app/api/search/global-multi?q=${encodeURIComponent(
          searchText
        )}&bookIds=${bookIdsParam}`
      );
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Error during global multi search:', error);
      Alert.alert(t('errorTitle'), t('searchFailed') || 'Search failed');
    } finally {
      setLoadingResults(false);
    }
  };

  const handleResultPress = (result) => {
    navigation.navigate('DirectPdfScreen', {
      bookId: result.bookId,
      page: result.page,
    });
  };

  if (loadingBooks) {
    return (
      <View style={styles.loadingContainer}>
        {/* 2) Use primary color */}
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Card: Search + Select Books */}
      <View style={styles.headerCard}>
        <View style={styles.searchSection}>
          <TextInput
            style={styles.searchInput}
            placeholder={t('enterSearchText')}
            placeholderTextColor={colors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>{t('searchButton')}</Text>
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.selectTitle,
            I18nManager.isRTL && { textAlign: 'right' },
          ]}
        >
          {t('selectBooks')}
        </Text>

        <FlatList
          data={books}
          keyExtractor={(item) => item.id}
          style={styles.booksList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.bookRow}>
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle}>{item.title}</Text>
              </View>
              <Switch
                trackColor={{ false: '#DDD', true: colors.primary }}
                thumbColor={item.selected ? '#FFF' : '#f4f3f4'}
                onValueChange={() => toggleBookSelection(item.id)}
                value={item.selected}
              />
            </View>
          )}
        />
      </View>

      {/* Results Card */}
      <View style={styles.resultsCard}>
        <Text
          style={[
            styles.resultsHeader,
            I18nManager.isRTL && { textAlign: 'right' },
          ]}
        >
          {t('searchResults')}
        </Text>

        {loadingResults ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.resultsLoader}
          />
        ) : results.length > 0 ? (
          <FlatList
            data={results}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleResultPress(item)}
                style={styles.resultCard}
              >
                <Text style={styles.resultTitle}>
                  {item.bookTitle} - {t('page')} {item.page}
                </Text>
                <HighlightedText text={item.snippet} highlight={searchText} />
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.resultsList}
          />
        ) : (
          <Text
            style={[
              styles.noResultsText,
              I18nManager.isRTL && { textAlign: 'right' },
            ]}
          >
            {t('noResultsFound')}
          </Text>
        )}
      </View>
    </View>
  );
};

export default GlobalMultiSearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 15,
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
  },
  searchButton: {
    marginLeft: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  searchButtonText: {
    color: '#FFF',
    fontSize: 16,
  },
  selectTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  booksList: {
    maxHeight: 200,
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  bookInfo: {
    flex: 1,
    marginRight: 10,
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  resultsCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  resultsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  resultsLoader: {
    marginTop: 20,
  },
  resultsList: {
    paddingBottom: 10,
  },
  resultCard: {
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  noResultsText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 20,
  },
});
