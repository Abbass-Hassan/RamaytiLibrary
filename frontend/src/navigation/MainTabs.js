import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import DirectStack from './DirectStack';
import SectionsStack from './SectionsStack';
import GlobalMultiStack from './GlobalMultiStack';
import BookmarksStack from './BookmarksStack';

import colors from '../config/colors';

const Tab = createBottomTabNavigator();

const LanguageToggleButton = () => {
  const { i18n } = useTranslation();
  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  };
  return (
    <TouchableOpacity onPress={toggleLanguage} style={{ marginRight: 15 }}>
      <Text style={{ color: colors.card }}>{i18n.language === 'ar' ? 'EN' : 'AR'}</Text>
    </TouchableOpacity>
  );
};

const MainTabs = () => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerRight: () => <LanguageToggleButton />,
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.card,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ color, size }) => {
          let iconName = 'ellipse';
          switch (route.name) {
            case 'DirectTab':
              iconName = 'bookmark-outline';
              break;
            case 'SectionsTab':
              iconName = 'book-outline';
              break;
            case 'GlobalMultiTab':
              iconName = 'search-outline';
              break;
            case 'BookmarksTab':
              iconName = 'bookmarks-outline';
              break;
            default:
              break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="DirectTab"
        component={DirectStack}
        options={{ title: t('direct') }}
      />
      <Tab.Screen
        name="SectionsTab"
        component={SectionsStack}
        options={{ title: t('sections') }}
      />
      <Tab.Screen
        name="GlobalMultiTab"
        component={GlobalMultiStack}
        options={{ title: t('search') }}
      />
      <Tab.Screen
        name="BookmarksTab"
        component={BookmarksStack}
        options={{ title: t('bookmarks') }}
      />
    </Tab.Navigator>
  );
};

export default MainTabs;