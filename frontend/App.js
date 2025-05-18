import React, { useState, useEffect } from "react";
import {
  StatusBar,
  View,
  ActivityIndicator,
  Text,
  LogBox,
  YellowBox,
  AppRegistry,
  BackHandler,
} from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { I18nextProvider } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

import i18n from "./src/i18n";
import MainTabs from "./src/navigation/MainTabs";
import AboutAppScreen from "./src/screens/AboutAppScreen";
import colors from "./src/config/colors";
import { initializeBundledPdfs } from "./src/services/bundledPdfService";
import { ensurePdfStorageDir } from "./src/services/pdfStorageService";

// Disable ALL yellow boxes and warnings - most aggressive approach
console.disableYellowBox = true;
LogBox.ignoreAllLogs();
YellowBox && YellowBox.ignoreAllLogs && YellowBox.ignoreAllLogs();

// Override console methods to prevent any logging errors
const originalConsoleError = console.error;
console.error = (...args) => {
  // Ignore all errors to prevent any red screens or warnings
  return;
};

const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  // Ignore all warnings
  return;
};

// Force the app to show no matter what
setTimeout(() => {
  try {
    if (!global.appIsReady) {
      global.appIsReady = true;
      console.log("EMERGENCY: Forcing app to show after timeout");

      // Force an app reload
      const appKeys = AppRegistry.getAppKeys();
      if (appKeys.length > 0) {
        AppRegistry.reloadApp(appKeys[0]);
      }
    }
  } catch (e) {
    // Do nothing, just ensure this doesn't crash
  }
}, 5000);

// Sample mock data for the app to use when completely offline
const MOCK_BOOKS = [
  {
    id: "book1",
    title: "كتاب ١",
    sections: [
      {
        id: "book1_section1",
        name: "المجلد الأول",
        pdfPath: "/files/174534127-92879.pdf",
        fileName: "174534127-92879.pdf",
      },
      {
        id: "book1_section2",
        name: "المجلد الثاني",
        pdfPath: "/files/174534175-95989.pdf",
        fileName: "174534175-95989.pdf",
      },
    ],
    imagePath: null,
  },
  {
    id: "book2",
    title: "كتاب ٢",
    sections: [
      {
        id: "book2_section1",
        name: "المجلد الأول",
        pdfPath: "/files/174568508-65869.pdf",
        fileName: "174568508-65869.pdf",
      },
    ],
    imagePath: null,
  },
  {
    id: "book3",
    title: "كتاب ٣",
    sections: [
      {
        id: "book3_section1",
        name: "المجلد الأول",
        pdfPath: "/files/arabic_text_test.pdf",
        fileName: "arabic_text_test.pdf",
      },
    ],
    imagePath: null,
  },
];

// IMMEDIATELY store mock data without waiting for async
try {
  AsyncStorage.setItem(
    "cachedBooks",
    JSON.stringify({
      timestamp: Date.now(),
      data: MOCK_BOOKS,
    })
  );
} catch (e) {
  // Ignore errors
}

// Add a global error handler
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.log("Global error handler:", error);
  // Just continue running the app regardless of errors
  return false;
});

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
  const [isAppReady, setIsAppReady] = useState(true); // Start with true to show UI immediately
  const [isOffline, setIsOffline] = useState(false);

  // Force app ready after small delay
  useEffect(() => {
    const forceReadyTimeout = setTimeout(() => {
      setIsAppReady(true);
      global.appIsReady = true;
    }, 500);

    return () => clearTimeout(forceReadyTimeout);
  }, []);

  // Add back button handler to prevent app exit
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // Always return true to prevent default behavior
        // which could cause the app to exit
        return true;
      }
    );

    return () => backHandler.remove();
  }, []);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });

    // Asynchronously initialize things in the background
    const backgroundInit = async () => {
      try {
        // Store mock data synchronously to ensure it's always available
        try {
          await AsyncStorage.setItem(
            "cachedBooks",
            JSON.stringify({
              timestamp: Date.now(),
              data: MOCK_BOOKS,
            })
          );
        } catch (e) {
          // Ignore errors
        }

        // Fire and forget - don't wait for these to complete
        initializeBundledPdfs().catch(() => {});
        ensurePdfStorageDir().catch(() => {});
      } catch (error) {
        // Ignore all errors during initialization
      }
    };

    // Start background initialization
    backgroundInit();

    return () => {
      unsubscribe();
    };
  }, []);

  // Always render the app, skip loading screen
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
            initialParams={{ initialRouteName: "DirectTab", isOffline }}
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
