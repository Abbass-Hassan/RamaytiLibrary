// frontend/src/navigation/DirectStack.js

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Existing screens
import BookDirectScreen from '../screens/BookDirectScreen';
import DirectPdfScreen from '../screens/DirectPdfScreen';

// Add your new PdfHighlightScreen import
import PdfHighlightScreen from '../screens/PdfReaderScreen';

const Stack = createStackNavigator();

const DirectStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="BookDirectScreen"
        component={BookDirectScreen}
      />
      <Stack.Screen
        name="DirectPdfScreen"
        component={DirectPdfScreen}
      />

      {/* New route for highlighting text inside a PDF via PDF.js in a WebView */}
      <Stack.Screen
        name="PdfHighlightScreen"
        component={PdfHighlightScreen}
      />
    </Stack.Navigator>
  );
};

export default DirectStack;
