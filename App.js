import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './src/screens/LoginScreen.js';
import MapScreen from './src/screens/MapScreen.js';
import ReportScreen from './src/screens/ReportScreen.js';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Map" component={MapScreen} />
        <Stack.Screen name="Report" component={ReportScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}