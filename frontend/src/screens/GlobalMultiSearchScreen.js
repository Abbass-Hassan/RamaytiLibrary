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
import Icon from '../components/Icon';

// Import colors
import colors from '../config/colors';

// Function to convert Western numbers to Eastern Arabic numerals
const toArabicDigits = (num) => {
  if (!num) return "";
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
};

const GlobalMultiSearchScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const isRTL = i18n.language === 'ar';

  const [books, setBooks] = useState([]);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  
  // New state variables for improved UI with many books
  const [bookFilter, setBookFilter] = useState('');
  const [isBookSectionExpanded, setIsBookSectionExpanded] = useState(false);

  // Format numbers based on language
  const formatNumber = (num) => {
    return isRTL ? toArabicDigits(num) : String(num);
  };
  
  // Filter books based on search text
  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(bookFilter.toLowerCase())
  );

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoadingBooks(true);
        const response = await fetch('http://ramaytilibrary-production.up.railway.app/api/books');
        const data = await response.json();
        
        // Sort books alphabetically
        const sortedBooks = data.sort((a, b) => 
          a.title.localeCompare(b.title)
        );
        
        const booksWithSelection = sortedBooks.map((book) => ({
          ...book,
          selected: false,
        }));
        setBooks(booksWithSelection);
        
        // Auto-expand if there are few books
        setIsBookSectionExpanded(booksWithSelection.length <= 5);
      } catch (error) {
        console.error('Error fetching books:', error);
        Alert.alert(t('errorTitle'), 'Failed to load books');
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

  const handleSelectAll = () => {
    const allSelected = filteredBooks.every(book => book.selected);
    
    const updatedBooks = books.map(book => ({
      ...book,
      selected: bookFilter 
        ? (book.title.toLowerCase().includes(bookFilter.toLowerCase()) ? !allSelected : book.selected)
        : !allSelected
    }));
    
    setBooks(updatedBooks);
    
    const newSelectedIds = updatedBooks
      .filter((b) => b.selected)
      .map((b) => b.id);
    
    setSelectedBooks(newSelectedIds);
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

  const getSelectedBooksCount = () => {
    return books.filter(book => book.selected).length;
  };

  // Format the book selection count
  const formatBookSelectionText = () => {
    const selected = getSelectedBooksCount();
    const total = books.length;
    
    // Use the t function with formatted numbers
    const countText = isRTL 
      ? `(${formatNumber(selected)}/${formatNumber(total)})`
      : `(${selected}/${total})`;
      
    return `${t('selectBooks')}: ${countText}`;
  };

  // Format results count
  const formatResultsText = () => {
    if (results.length === 0) return t('searchResults');
    
    const countText = isRTL 
      ? `(${formatNumber(results.length)})`
      : `(${results.length})`;
      
    return `${t('searchResults')} ${countText}`;
  };

  if (loadingBooks) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Card */}
      <View style={styles.card}>
        <View style={styles.searchSection}>
          <TextInput
            style={styles.searchInput}
            placeholder={t('enterSearchText')}
            placeholderTextColor={colors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          <TouchableOpacity 
            style={[
              styles.searchButton,
              (!searchText.trim() || selectedBooks.length === 0) && styles.disabledButton
            ]} 
            onPress={handleSearch}
            disabled={!searchText.trim() || selectedBooks.length === 0 || loadingResults}
          >
            <Text style={styles.searchButtonText}>{t('searchButton')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Books Selection Card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>
            {formatBookSelectionText()}
          </Text>
          
          <View style={styles.bookControlsRow}>
            <TouchableOpacity 
              style={styles.selectAllButton}
              onPress={handleSelectAll}
            >
              <Text style={styles.selectAllText}>
                {filteredBooks.every(book => book.selected) ? t('deselectAll') : t('selectAll')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.expandButton}
              onPress={() => setIsBookSectionExpanded(!isBookSectionExpanded)}
            >
              <Icon 
                name={isBookSectionExpanded ? "chevron-up" : "chevron-down"} 
                size={16} 
                color={colors.primary} 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        {isBookSectionExpanded && (
          <>
            <View style={styles.searchBookContainer}>
              <TextInput
                style={styles.searchBookInput}
                placeholder={t('filterBooks') || "Filter books..."}
                value={bookFilter}
                onChangeText={setBookFilter}
                placeholderTextColor={colors.textSecondary}
              />
              {bookFilter ? (
                <TouchableOpacity 
                  style={styles.clearFilterButton}
                  onPress={() => setBookFilter('')}
                >
                  <Icon name="x" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>
            
            <FlatList
              data={filteredBooks}
              keyExtractor={(item) => item.id}
              style={[
                styles.booksList, 
                { maxHeight: books.length > 6 ? 250 : undefined }
              ]}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => toggleBookSelection(item.id)}
                  style={[styles.bookRow, item.selected && styles.bookRowSelected]}
                >
                  <Text style={styles.bookTitle}>{item.title}</Text>
                  <Switch
                    trackColor={{ false: '#DDD', true: colors.primary }}
                    thumbColor={item.selected ? '#FFF' : '#f4f3f4'}
                    onValueChange={() => toggleBookSelection(item.id)}
                    value={item.selected}
                  />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.noResultsText}>
                  {t('noBooksFound') || "No books found"}
                </Text>
              }
            />
          </>
        )}
        
        {!isBookSectionExpanded && getSelectedBooksCount() > 0 && (
          <View style={styles.selectedBooksPreview}>
            <Text style={styles.selectedBooksCount}>
              {isRTL 
                ? formatNumber(getSelectedBooksCount()) + " " + (t('booksSelected') || "books selected")
                : getSelectedBooksCount() + " " + (t('booksSelected') || "books selected")}
            </Text>
          </View>
        )}
      </View>

      {/* Results Card */}
      <View style={styles.resultsCard}>
        <Text style={styles.sectionTitle}>
          {formatResultsText()}
        </Text>

        <View style={styles.resultsContainer}>
          {loadingResults ? (
            <View style={styles.loadingResultsContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>{t('searching')}...</Text>
            </View>
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
                    {item.bookTitle} - {t('page')} {isRTL ? formatNumber(item.page) : item.page}
                  </Text>
                  <HighlightedText text={item.snippet} highlight={searchText} />
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.resultsList}
            />
          ) : (
            <Text style={styles.noResultsText}>
              {t('noResultsFound')}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default GlobalMultiSearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
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
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  searchButton: {
    marginLeft: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  disabledButton: {
    backgroundColor: '#AAAAAA',
  },
  searchButtonText: {
    color: '#FFF',
    fontSize: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bookControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandButton: {
    padding: 6,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  selectAllButton: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  selectAllText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  searchBookContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  searchBookInput: {
    flex: 1,
    backgroundColor: '#F2F2F2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: colors.text,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  clearFilterButton: {
    position: 'absolute',
    right: I18nManager.isRTL ? null : 8,
    left: I18nManager.isRTL ? 8 : null,
    padding: 4,
  },
  booksList: {
    maxHeight: 250,
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  bookRowSelected: {
    backgroundColor: '#E6F7FF',
    borderRightWidth: I18nManager.isRTL ? 3 : 0,
    borderLeftWidth: I18nManager.isRTL ? 0 : 3,
    borderRightColor: colors.primary,
    borderLeftColor: colors.primary,
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  selectedBooksPreview: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  selectedBooksCount: {
    color: colors.primary,
    fontWeight: '500',
  },
  resultsCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  resultsContainer: {
    flex: 1,
  },
  loadingResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  resultsList: {
    paddingBottom: 10,
  },
  resultCard: {
    marginBottom: 10,
    padding: 12,
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
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  noResultsText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  }
});