// frontend/src/navigation/DirectStack.js

import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

// Screens
import BooksListScreen from "../screens/BooksListScreen";
import CustomPdfReaderScreen from "../screens/CustomPdfReaderScreen";
import PdfReaderScreen from "../screens/PdfReaderScreen";

const Stack = createStackNavigator();

const DirectStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DirectBooksListScreen" component={BooksListScreen} />
      <Stack.Screen name="PdfHighlightScreen" component={PdfReaderScreen} />
      <Stack.Screen name="CustomPdfReader" component={CustomPdfReaderScreen} />
    </Stack.Navigator>
  );
};

export default DirectStack;
