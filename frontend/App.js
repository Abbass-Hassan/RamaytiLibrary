import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { I18nextProvider } from 'react-i18next';

import i18n from './src/i18n';
import MainTabs from './src/navigation/MainTabs';
import colors from './src/config/colors';

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
  return (
    <I18nextProvider i18n={i18n}>
      <NavigationContainer theme={navTheme}>
        <StatusBar backgroundColor={colors.background} barStyle="light-content" />
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="MainTabs" component={MainTabs} />
        </RootStack.Navigator>
      </NavigationContainer>
    </I18nextProvider>
  );
}
