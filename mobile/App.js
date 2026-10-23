import './src/i18n'; // initialise i18next + device locale detection
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, Linking, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { FamilyProvider } from './src/context/FamilyContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { SSEProvider } from './src/context/SSEContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import EventDetailsScreen from './src/screens/EventDetailsScreen';
import PendingScreen from './src/screens/PendingScreen';
import MemberProfileScreen from './src/screens/MemberProfileScreen';
import EventFormScreen from './src/screens/EventFormScreen';
import TaskFormScreen from './src/screens/TaskFormScreen';
import ScanScreen from './src/screens/ScanScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import DayViewScreen from './src/screens/DayViewScreen';
import FamilyScreen from './src/screens/FamilyScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ChatScreen from './src/screens/ChatScreen';
import LanguageScreen from './src/screens/LanguageScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import JoinFamilyScreen from './src/screens/JoinFamilyScreen';
import PickupPeopleScreen from './src/screens/PickupPeopleScreen';
import storage from './src/utils/storage';
import { tokenFromInviteUrl } from './src/utils/tokenFromInviteUrl';

function inviteTokenFromLink(url) {
  if (!url) return null;
  const fromHttps = tokenFromInviteUrl(url);
  if (fromHttps) return fromHttps;
  const match = String(url).match(/join\/([^/?#]+)/);
  if (!match) return null;
  if (!/^when:/.test(url) && !/its4us\.app/.test(url)) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

const Stack = createNativeStackNavigator();

// Inner component — can call useAuth() because it's inside AuthProvider
function AppNavigator() {
  const { user, token, authLoading } = useAuth();
  const navRef = useRef(null);

  useEffect(() => {
    const handleUrl = async (url) => {
      const invite = inviteTokenFromLink(url);
      if (!invite) return;
      if (user && token && navRef.current) {
        navRef.current.navigate('JoinFamily', { code: invite });
      } else {
        await storage.setItem('pendingJoin', invite);
      }
    };
    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [user, token]);

  useEffect(() => {
    if (!user || !token || !navRef.current) return undefined;
    storage.getItem('pendingJoin').then((pending) => {
      if (pending) navRef.current.navigate('JoinFamily', { code: pending });
    }).catch(() => {});
    return undefined;
  }, [user, token]);

  // Still checking AsyncStorage — show a blank spinner
  if (authLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2f2f7' }}>
        <ActivityIndicator size="large" color="#1a8fa8" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user && token ? (
          // Logged in — Home + EventDetails in the same stack
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
            <Stack.Screen name="Pending" component={PendingScreen} />
            <Stack.Screen name="MemberProfile" component={MemberProfileScreen} />
            <Stack.Screen name="EventForm" component={EventFormScreen} />
            <Stack.Screen name="TaskForm" component={TaskFormScreen} />
            <Stack.Screen name="Scan" component={ScanScreen} />
            <Stack.Screen name="Groups" component={GroupsScreen} />
            <Stack.Screen name="DayView" component={DayViewScreen} />
            <Stack.Screen name="Family" component={FamilyScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Language" component={LanguageScreen} />
            <Stack.Screen name="JoinFamily" component={JoinFamilyScreen} />
            <Stack.Screen name="PickupPeople" component={PickupPeopleScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// AuthProvider wraps everything so useAuth() works anywhere in the tree
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
      <AuthProvider>
        <SSEProvider>
          <FamilyProvider>
            <AppNavigator />
          </FamilyProvider>
        </SSEProvider>
      </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
