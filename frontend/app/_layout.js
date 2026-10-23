// IMPORTANT: react-native-gesture-handler MUST be the first import
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Catch errors
import { ErrorBoundary } from 'expo-router';
export { ErrorBoundary };

// frontend/app/_layout.js
import { Stack } from 'expo-router';
import { Provider, useSelector } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, Platform, View, ActivityIndicator } from 'react-native';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import '../global.css';
import { registerDeviceToken } from '../api/core';
import { store } from '../store/store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

import { usePushNotifications } from '../hooks/usePushNotifications';
import { selectUser, setTokens, setUser } from '../store/authSlice';

function PushNotificationWrapper({ children }) {
  const user = useSelector(selectUser);
  usePushNotifications(user);
  return <>{children}</>;
}

function AuthRehydration({ children }) {
  const [isReady, setIsReady] = React.useState(false);
  const dispatch = useDispatch();

  React.useEffect(() => {
    async function loadToken() {
      try {
        const { storage: SecureStore } = require('../utils/storage');
        const token = await SecureStore.getItemAsync('access_token');
        const refresh = await SecureStore.getItemAsync('refresh_token');
        if (token || refresh) {
          // Ask the server who we are. If the access token has expired the axios
          // client refreshes it (or ends the session) before this resolves.
          const apiClient = require('../api/axios').default;
          const { data } = await apiClient.get('/api/accounts/auth/me/');
          const latestAccess = await SecureStore.getItemAsync('access_token');
          const latestRefresh = await SecureStore.getItemAsync('refresh_token');
          dispatch(setTokens({ access: latestAccess, refresh: latestRefresh }));
          dispatch(setUser(data));
        }
      } catch (error) {
        // Not signed in (or the server could not be reached): show the login screen.
        console.log('Could not restore the session:', error?.response?.status || error?.message);
      } finally {
        setIsReady(true);
      }
    }
    loadToken();
  }, [dispatch]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#104356" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <AuthRehydration>
              <PushNotificationWrapper>
                <StatusBar style="light" />
                <Stack screenOptions={{ headerShown: false }} />
              </PushNotificationWrapper>
            </AuthRehydration>
          </SafeAreaProvider>
        </QueryClientProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
