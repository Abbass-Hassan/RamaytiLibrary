import React, { useState, useEffect } from "react";
import { StatusBar, View, ActivityIndicator, Text, LogBox } from "react-native";
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

// Disable yellow warnings and debugger warnings in production
if (!__DEV__) {
  LogBox.ignoreAllLogs();
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

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

// Ensure we have initial mock data available
const ensureInitialData = async () => {
  try {
    // Check if we have cached data
    const cachedBooksData = await AsyncStorage.getItem("cachedBooks");

    if (!cachedBooksData) {
      // Store mock data as initial data
      await AsyncStorage.setItem(
        "cachedBooks",
        JSON.stringify({
          timestamp: Date.now(),
          data: MOCK_BOOKS,
        })
      );
      console.log("Stored initial mock books data");
    } else {
      console.log("Initial cached books data exists");
    }

    return true;
  } catch (error) {
    console.error("Error ensuring initial data:", error);
    return false;
  }
};

// Load initial books data to global state
const loadInitialBooksData = async () => {
  try {
    // Load books from AsyncStorage
    const cachedData = await AsyncStorage.getItem("cachedBooks");

    if (cachedData) {
      // Cache data exists, store it in global state or context if needed
      console.log("Preloaded cached books data on app start");
      return true;
    }

    // No cached data, store mock data
    await AsyncStorage.setItem(
      "cachedBooks",
      JSON.stringify({
        timestamp: Date.now(),
        data: MOCK_BOOKS,
      })
    );
    console.log("Preloaded mock books data on app start");
    return true;
  } catch (error) {
    console.error("Error loading initial books data:", error);
    return false;
  }
};

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
  const [isOffline, setIsOffline] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Monitor network connectivity
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });

    // Initialize app with bundled PDFs and cached data
    const prepareApp = async () => {
      try {
        // Check network status
        const networkState = await NetInfo.fetch();
        setIsOffline(!networkState.isConnected);

        // Ensure PDF storage directory exists
        await ensurePdfStorageDir();

        // Initialize the bundled PDFs
        await initializeBundledPdfs();

        // Ensure we have initial data
        await ensureInitialData();

        // Force load initial data to global state
        await loadInitialBooksData();

        // Small delay to ensure native modules are fully initialized
        setTimeout(() => {
          setIsAppReady(true);
        }, 300);
      } catch (error) {
        console.error("Error during app initialization:", error);

        // Retry a few times if something fails
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(retryCount + 1);
          }, 500);
        } else {
          // If we've tried several times, show the app anyway
          setIsAppReady(true);
        }
      }
    };

    prepareApp();

    return () => {
      unsubscribe(); // Clean up network listener
    };
  }, [retryCount]);

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
        <Text style={{ marginTop: 10, color: colors.text }}>
          جاري التحميل...
        </Text>
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
