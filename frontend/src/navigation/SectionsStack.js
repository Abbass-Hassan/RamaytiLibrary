import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import BookSectionsScreen from "../screens/BookSectionsScreen";
import SectionsScreen from "../screens/SectionsScreen";
import CustomPdfReaderScreen from "../screens/CustomPdfReaderScreen";
// Import DummyPdfScreen but we'll be phasing it out
import DummyPdfScreen from "../screens/DummyPdfScreen";

const Stack = createStackNavigator();

const SectionsStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BookSectionsScreen" component={BookSectionsScreen} />
      <Stack.Screen name="SectionsScreen" component={SectionsScreen} />
      <Stack.Screen name="CustomPdfReader" component={CustomPdfReaderScreen} />
      {/* Keep DummyPdfScreen for backward compatibility but we'll stop using it */}
      <Stack.Screen name="DummyPdfScreen" component={DummyPdfScreen} />
    </Stack.Navigator>
  );
};

export default SectionsStack;
