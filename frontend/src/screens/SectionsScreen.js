import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

const SectionsScreen = ({ route, navigation }) => {
  const { bookId } = route.params;
  const [sections, setSections] = useState([]);

  const fetchSections = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/books/${bookId}/sections`);
      const data = await response.json();
      setSections(data);
    } catch (error) {
      console.log('Error fetching sections:', error);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('DummyPdfScreen', { bookId, sectionIndex: index })
      }
    >
      <Text style={styles.sectionName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sections}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  listContainer: {
    paddingVertical: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginVertical: 7,
    padding: 15,
    borderRadius: 8,
    // Android shadow
    elevation: 3,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionName: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
});

export default SectionsScreen;