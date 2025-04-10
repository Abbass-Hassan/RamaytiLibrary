// frontend/src/navigation/DirectStack.js

import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

// Existing screens
import BookDirectScreen from "../screens/BookDirectScreen";
import DirectPdfScreen from "../screens/DirectPdfScreen";
import PdfHighlightScreen from "../screens/PdfReaderScreen";

// New custom PDF reader screen
import CustomPdfReaderScreen from "../screens/CustomPdfReaderScreen";

const Stack = createStackNavigator();

const DirectStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BookDirectScreen" component={BookDirectScreen} />
      <Stack.Screen name="DirectPdf" component={DirectPdfScreen} />
      <Stack.Screen name="PdfHighlightScreen" component={PdfHighlightScreen} />
      {/* New custom PDF reader with text customization */}
      <Stack.Screen name="CustomPdfReader" component={CustomPdfReaderScreen} />
    </Stack.Navigator>
  );
};

export default DirectStack;
