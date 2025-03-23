import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

// 1) Import colors
import colors from '../config/colors';

const SectionsScreen = ({ route, navigation }) => {
  const { bookId } = route.params;
  const [sections, setSections] = useState([]);

  const fetchSections = async () => {
    try {
      const response = await fetch(`http://10.0.2.2:3000/api/books/${bookId}/sections`);
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

export default SectionsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContainer: {
    paddingVertical: 10,
  },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 15,
    marginVertical: 7,
    padding: 15,
    borderRadius: 8,
    elevation: 3, // Android shadow
    shadowColor: colors.shadow, // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionName: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '500',
  },
});
