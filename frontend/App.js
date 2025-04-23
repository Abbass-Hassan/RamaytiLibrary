import React, { useState, useEffect } from "react";
import { StatusBar, View, ActivityIndicator } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { I18nextProvider } from "react-i18next";

import i18n from "./src/i18n";
import MainTabs from "./src/navigation/MainTabs";
import colors from "./src/config/colors";

const RootStack = createStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure native modules are fully initialized
    const timer = setTimeout(() => {
      setIsAppReady(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Show a loading indicator until the app is ready
  if (!isAppReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <NavigationContainer theme={navTheme}>
        <StatusBar
          backgroundColor={colors.primary}
          barStyle="light-content"
          translucent={false}
        />
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="MainTabs" component={MainTabs} />
        </RootStack.Navigator>
      </NavigationContainer>
    </I18nextProvider>
  );
}
