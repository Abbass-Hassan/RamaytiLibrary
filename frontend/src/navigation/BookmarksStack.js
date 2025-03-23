import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BookmarksScreen from '../screens/BookmarksScreen';

const Stack = createStackNavigator();

const BookmarksStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="BookmarksScreen"
        component={BookmarksScreen}
      />
      {/* Add future bookmark screens here if needed */}
    </Stack.Navigator>
  );
};

export default BookmarksStack;
