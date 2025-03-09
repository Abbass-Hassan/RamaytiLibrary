import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import GlobalMultiSearchScreen from '../screens/GlobalMultiSearchScreen';
import DirectPdfScreen from '../screens/DirectPdfScreen';

const Stack = createStackNavigator();

const GlobalMultiStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="GlobalMultiSearchScreen"
        component={GlobalMultiSearchScreen}
        options={{ title: 'Global Search' }}
      />
      {/* 
        We include DirectPdfScreen so we can navigate to it from results.
        If you also want DummyPdfScreen or others, add them as needed.
      */}
      <Stack.Screen
        name="DirectPdfScreen"
        component={DirectPdfScreen}
        options={{ title: 'PDF Viewer' }}
      />
    </Stack.Navigator>
  );
};

export default GlobalMultiStack;