import React, { useState, useEffect } from "react";
import { StatusBar, View, ActivityIndicator, Text } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { I18nextProvider } from "react-i18next";

import i18n from "./src/i18n";
import MainTabs from "./src/navigation/MainTabs";
import AboutAppScreen from "./src/screens/AboutAppScreen";
import colors from "./src/config/colors";
import { initializeBundledPdfs } from "./src/services/bundledPdfService";

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
    // Initialize app with bundled PDFs
    const prepareApp = async () => {
      try {
        // Initialize the bundled PDFs
        await initializeBundledPdfs();

        // Small delay to ensure native modules are fully initialized
        setTimeout(() => {
          setIsAppReady(true);
        }, 300);
      } catch (error) {
        console.error("Error during app initialization:", error);
        setIsAppReady(true); // Continue even if there's an error
      }
    };

    prepareApp();

    return () => {}; // Cleanup function
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
        <RootStack.Navigator>
          <RootStack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
            initialParams={{ initialRouteName: "DirectTab" }}
          />
          <RootStack.Screen
            name="AboutApp"
            component={AboutAppScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: colors.primary },
              headerTintColor: colors.card,
              headerTitleAlign: "center",
              headerTitle: () => (
                <Text
                  style={{
                    color: colors.card,
                    fontSize: 18,
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  حول التطبيق
                </Text>
              ),
            }}
          />
        </RootStack.Navigator>
      </NavigationContainer>
    </I18nextProvider>
  );
}
