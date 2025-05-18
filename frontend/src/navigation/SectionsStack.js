import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

// Screens
import BookSectionsScreen from "../screens/BookSectionsScreen";
import CustomPdfReaderScreen from "../screens/CustomPdfReaderScreen";
import PdfReaderScreen from "../screens/PdfReaderScreen";

const Stack = createStackNavigator();

const SectionsStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BookSectionsScreen" component={BookSectionsScreen} />
      <Stack.Screen name="PdfHighlightScreen" component={PdfReaderScreen} />
      <Stack.Screen name="CustomPdfReader" component={CustomPdfReaderScreen} />
    </Stack.Navigator>
  );
};

export default SectionsStack;
