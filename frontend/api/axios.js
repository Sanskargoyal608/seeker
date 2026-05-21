// frontend/api/axios.js
/**
 * Configured Axios instance with:
 * - Base URL from app.json extra.API_BASE_URL
 * - JWT Bearer token injection on every request
 * - Automatic token refresh on 401 responses
 * - Stores refreshed token back to SecureStore
 *
 * NOTE for physical device testing:
 *   Change API_BASE_URL in app.json to your PC's local IP (e.g. http://192.168.1.x:8000)
 *   Localhost on the device refers to the device itself, not your PC.
 */
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

export const API_BASE_URL =
  Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Request interceptor ─────────────────────────────────────────────
// Attach JWT access token from SecureStore to every request
apiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ────────────────────────────────────────────
// On 401: try to refresh the access token, then retry the original request
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite retry loops
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) throw new Error('No refresh token stored');

        const { data } = await axios.post(
          `${API_BASE_URL}/api/accounts/auth/refresh/`,
          { refresh: refreshToken },
          { timeout: 10000 }
        );

        // Persist new access token
        await SecureStore.setItemAsync('access_token', data.access);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed — clear stored tokens (user must log in again)
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
