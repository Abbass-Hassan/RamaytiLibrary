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

const GlobalMultiSearchScreen = () => {
  const [books, setBooks] = useState([]);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);

  const navigation = useNavigation();

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/books');
        const data = await response.json();
        const booksWithSelection = data.map((book) => ({ ...book, selected: false }));
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

    const newlySelected = updatedBooks.filter((b) => b.selected).map((b) => b.id);
    setSelectedBooks(newlySelected);
  };

  const handleSearch = async () => {
    if (!searchText.trim() || selectedBooks.length === 0) {
      Alert.alert('Error', 'Enter search text and select at least one book.');
      return;
    }
    setLoadingResults(true);
    try {
      const bookIdsParam = selectedBooks.join(',');
      const response = await fetch(
        `http://localhost:3000/api/search/global-multi?q=${encodeURIComponent(
          searchText
        )}&bookIds=${bookIdsParam}`
      );
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Error during global multi search:', error);
      Alert.alert('Error', 'Failed to perform global search.');
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
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Card: Search + Select Books */}
      <View style={styles.headerCard}>
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <TextInput
            style={styles.searchInput}
            placeholder="Enter search text..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Book Selection */}
        <Text style={styles.selectTitle}>Select Books:</Text>
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
                trackColor={{ false: '#DDD', true: '#2196F3' }}
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
        <Text style={styles.resultsHeader}>Search Results:</Text>
        {loadingResults ? (
          <ActivityIndicator size="large" color="#2196F3" style={styles.resultsLoader} />
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
                  {item.bookTitle} - Page {item.page}
                </Text>
                <Text style={styles.resultSnippet}>{item.snippet}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.resultsList}
          />
        ) : (
          <Text style={styles.noResultsText}>No results found.</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Main container
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 15,
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header Card (Search + Select Books)
  headerCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    // Android elevation
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
    color: '#333',
  },
  searchButton: {
    marginLeft: 10,
    backgroundColor: '#2196F3',
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
    color: '#333',
    marginBottom: 10,
  },
  booksList: {
    maxHeight: 200, // limit height for a comfortable scroll area
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
    color: '#333',
  },

  // Results Card
  resultsCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 15,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    // Android elevation
    elevation: 2,
  },
  resultsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
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
    color: '#2196F3',
    marginBottom: 5,
  },
  resultSnippet: {
    fontSize: 14,
    color: '#333',
  },
  noResultsText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 20,
  },
});

export default GlobalMultiSearchScreen;