// frontend/src/navigation/MainTabs.js

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';

import SectionsStack from './SectionsStack';
import DirectStack from './DirectStack';
import GlobalMultiStack from './GlobalMultiStack';

const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Hide the default header
        headerShown: false,
        // Customize active/inactive icon colors
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#777',
        // Define a single icon function for all routes
        tabBarIcon: ({ color, size }) => {
          let iconName = 'ellipse'; // fallback icon
          switch (route.name) {
            case 'SectionsTab':
              iconName = 'book-outline';
              break;
            case 'DirectTab':
              iconName = 'bookmark-outline';
              break;
            case 'GlobalMultiTab':
              iconName = 'search-outline';
              break;
            default:
              break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="SectionsTab"
        component={SectionsStack}
        options={{
          title: 'Sections',
        }}
      />
      <Tab.Screen
        name="DirectTab"
        component={DirectStack}
        options={{
          title: 'Direct',
        }}
      />
      <Tab.Screen
        name="GlobalMultiTab"
        component={GlobalMultiStack}
        options={{
          title: 'Search',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabs;