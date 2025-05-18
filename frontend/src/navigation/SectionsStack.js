// frontend/src/navigation/SectionsStack.js

import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

// Screens
import BooksListScreen from "../screens/BooksListScreen";
import SectionsScreen from "../screens/SectionsScreen";
import CustomPdfReaderScreen from "../screens/CustomPdfReaderScreen";
import PdfReaderScreen from "../screens/PdfReaderScreen";
import BookVolumesScreen from "../screens/BookVolumesScreen";

const Stack = createStackNavigator();

const SectionsStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="SectionsBooksListScreen"
        component={BooksListScreen}
      />
      <Stack.Screen name="SectionsScreen" component={SectionsScreen} />
      <Stack.Screen name="BookVolumesScreen" component={BookVolumesScreen} />
      <Stack.Screen name="PdfHighlightScreen" component={PdfReaderScreen} />
      <Stack.Screen name="CustomPdfReader" component={CustomPdfReaderScreen} />
    </Stack.Navigator>
  );
};

export default SectionsStack;
