import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { FamilyProvider } from './src/context/FamilyContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import EventDetailsScreen from './src/screens/EventDetailsScreen';
import PendingScreen from './src/screens/PendingScreen';

const Stack = createNativeStackNavigator();

// Inner component — can call useAuth() because it's inside AuthProvider
function AppNavigator() {
  const { user, authLoading } = useAuth();

  // Still checking AsyncStorage — show a blank spinner
  if (authLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2f2f7' }}>
        <ActivityIndicator size="large" color="#1a8fa8" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // Logged in — Home + EventDetails in the same stack
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
            <Stack.Screen name="Pending" component={PendingScreen} />
          </>
        ) : (
          // Not logged in — show Login
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// AuthProvider wraps everything so useAuth() works anywhere in the tree
export default function App() {
  return (
    <AuthProvider>
      <FamilyProvider>
        <AppNavigator />
      </FamilyProvider>
    </AuthProvider>
  );
}
