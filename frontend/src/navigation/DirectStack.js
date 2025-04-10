// frontend/src/navigation/DirectStack.js

import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

// Screens
import BooksListScreen from "../screens/BooksListScreen";
import BookDirectScreen from "../screens/BookDirectScreen";
import DirectPdfScreen from "../screens/DirectPdfScreen";
import PdfHighlightScreen from "../screens/PdfReaderScreen";
import CustomPdfReaderScreen from "../screens/CustomPdfReaderScreen";

const Stack = createStackNavigator();

const DirectStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Make BooksListScreen the initial screen in DirectStack */}
      <Stack.Screen name="DirectBooksListScreen" component={BooksListScreen} />
      <Stack.Screen
        name="BookDirectScreen"
        component={BookDirectScreen}
        // This ensures BookDirectScreen must have parameters
        options={({ route }) => ({
          gestureEnabled: route.params?.bookId !== undefined,
        })}
      />
      <Stack.Screen name="DirectPdf" component={DirectPdfScreen} />
      <Stack.Screen name="PdfHighlightScreen" component={PdfHighlightScreen} />
      {/* New custom PDF reader with text customization */}
      <Stack.Screen name="CustomPdfReader" component={CustomPdfReaderScreen} />
    </Stack.Navigator>
  );
};

export default DirectStack;
