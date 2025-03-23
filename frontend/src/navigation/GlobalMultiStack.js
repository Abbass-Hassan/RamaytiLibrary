import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import GlobalMultiSearchScreen from '../screens/GlobalMultiSearchScreen';
import DirectPdfScreen from '../screens/DirectPdfScreen';

const Stack = createStackNavigator();

const GlobalMultiStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="GlobalMultiSearchScreen"
        component={GlobalMultiSearchScreen}
      />
      <Stack.Screen
        name="DirectPdfScreen"
        component={DirectPdfScreen}
      />
    </Stack.Navigator>
  );
};

export default GlobalMultiStack;
