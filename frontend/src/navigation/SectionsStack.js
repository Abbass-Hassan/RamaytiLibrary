// frontend/src/navigation/SectionsStack.js

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BooksListScreen from '../screens/BooksListScreen';
import SectionsScreen from '../screens/SectionsScreen';
import DummyPdfScreen from '../screens/DummyPdfScreen';

const Stack = createStackNavigator();

const SectionsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="BooksListScreen"
        component={BooksListScreen}
        options={{ title: 'Books (Sections)' }}
      />
      <Stack.Screen
        name="SectionsScreen"
        component={SectionsScreen}
        options={{ title: 'Sections' }}
      />
      <Stack.Screen
        name="DummyPdfScreen"
        component={DummyPdfScreen}
        options={{ title: 'PDF Viewer' }}
      />
    </Stack.Navigator>
  );
};

export default SectionsStack;