import React, { useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute } from "@react-navigation/native";

import DirectStack from "./DirectStack";
import SectionsStack from "./SectionsStack";
import GlobalMultiStack from "./GlobalMultiStack";
import BookmarksStack from "./BookmarksStack";

import Icon from "../components/Icon";
import colors from "../config/colors";

const Tab = createBottomTabNavigator();

const MainTabs = ({ route }) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const initialRouteName = route.params?.initialRouteName || "DirectTab";

  const navigateToAboutApp = () => {
    navigation.navigate("AboutApp");
  };

  return (
    <Tab.Navigator
      initialRouteName={initialRouteName}
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.card,
        headerTitleAlign: "center",
        headerRight: () => (
          <TouchableOpacity
            onPress={navigateToAboutApp}
            style={{ paddingRight: 16 }}
          >
            <Icon name="information-circle" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;

          switch (route.name) {
            case "BookmarksTab":
              iconName = "bookmark";
              break;
            case "SectionsTab":
              iconName = "star-outline";
              break;
            case "DirectTab":
              iconName = "library-outline";
              break;
            case "GlobalMultiTab":
              iconName = "search"; // Changed to search icon for better clarity
              break;
            default:
              iconName = "help-outline";
              break;
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="DirectTab"
        component={DirectStack}
        options={{
          title: t("direct"),
          headerTitle: () => (
            <Text
              style={{
                color: colors.card,
                fontSize: 18,
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              {t("direct")}
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="BookmarksTab"
        component={BookmarksStack}
        options={{
          title: t("bookmarks"),
          headerTitle: () => (
            <Text
              style={{
                color: colors.card,
                fontSize: 18,
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              {t("bookmarks")}
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="SectionsTab"
        component={SectionsStack}
        options={{
          title: t("sections"),
          headerTitle: () => (
            <Text
              style={{
                color: colors.card,
                fontSize: 18,
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              {t("sections")}
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="GlobalMultiTab"
        component={GlobalMultiStack}
        options={{
          title: t("search"),
          headerTitle: () => (
            <Text
              style={{
                color: colors.card,
                fontSize: 18,
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              {t("search")}
            </Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabs;
