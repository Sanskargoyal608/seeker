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
import { StyleSheet, Platform } from 'react-native';
import React, { useEffect } from 'react';
import { registerDeviceToken } from '../api/core';
import { store } from '../store/store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

import { usePushNotifications } from '../hooks/usePushNotifications';
import { selectUser } from '../store/authSlice';

function PushNotificationWrapper({ children }) {
  const user = useSelector(selectUser);
  usePushNotifications(user);
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <PushNotificationWrapper>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false }} />
            </PushNotificationWrapper>
          </SafeAreaProvider>
        </QueryClientProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
