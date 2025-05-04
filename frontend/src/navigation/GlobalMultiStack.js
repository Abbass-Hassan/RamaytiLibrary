import React from "react";
import { Text } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import GlobalMultiSearchScreen from "../screens/GlobalMultiSearchScreen";
import DirectPdfScreen from "../screens/DirectPdfScreen";
import SearchResultsScreen from "../screens/SearchResultsScreen";
import AboutAppScreen from "../screens/AboutAppScreen";
import colors from "../config/colors";

const Stack = createStackNavigator();

const GlobalMultiStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="GlobalMultiSearchScreen"
        component={GlobalMultiSearchScreen}
      />
      <Stack.Screen name="DirectPdfScreen" component={DirectPdfScreen} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
    </Stack.Navigator>
  );
};

export default GlobalMultiStack;
