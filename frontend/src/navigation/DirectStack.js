// frontend/src/navigation/DirectStack.js

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BookDirectScreen from '../screens/BookDirectScreen';
import DirectPdfScreen from '../screens/DirectPdfScreen';

const Stack = createStackNavigator();

const DirectStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="BookDirectScreen"
        component={BookDirectScreen}
        options={{ title: 'Books (Direct)' }}
      />
      <Stack.Screen
        name="DirectPdfScreen"
        component={DirectPdfScreen}
        options={{ title: 'PDF Viewer' }}
      />
    </Stack.Navigator>
  );
};

export default DirectStack;