// frontend/hooks/useAuth.js
// Custom hook that combines Redux auth state with SecureStore persistence
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {
  setTokens,
  setUser,
  logout,
  setError,
  clearError,
  selectUser,
  selectIsAuthenticated,
  selectAccessToken,
  selectError,
  selectIsLoading,
} from '../store/authSlice';
import { logoutUser, getErrorMessage } from '../api/auth';

import { Platform } from 'react-native';
import apiClient from '../api/axios';

export const useAuth = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const accessToken = useSelector(selectAccessToken);
  const error = useSelector(selectError);
  const isLoading = useSelector(selectIsLoading);

  /**
   * Persist tokens to SecureStore and update Redux state.
   * Called after login or successful registration.
   */
  const persistSession = useCallback(async (tokenData, userData) => {
    await SecureStore.setItemAsync('access_token', tokenData.access);
    await SecureStore.setItemAsync('refresh_token', tokenData.refresh);
    dispatch(setTokens(tokenData));
    dispatch(setUser(userData));

    // Register device for push notifications
    try {
      await apiClient.post('/api/notifications/devices/register/', {
        fcm_token: 'dummy_expo_token_' + Math.random().toString(36).substring(7), // In a real app, use expo-notifications
        platform: Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'android' ? 'ANDROID' : 'WEB'
      }, {
        headers: { Authorization: `Bearer ${tokenData.access}` }
      });
    } catch (e) {
      console.log('Failed to register device for notifications', e);
    }
  }, [dispatch]);

  /**
   * Clear session from SecureStore, Redux, and navigate to login.
   */
  const handleLogout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // Best-effort: even if API call fails, clear local state
    } finally {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      dispatch(logout());
      router.replace('/(auth)/login');
    }
  }, [dispatch, router]);

  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    user,
    isAuthenticated,
    accessToken,
    error,
    isLoading,
    persistSession,
    handleLogout,
    clearAuthError,
  };
};
