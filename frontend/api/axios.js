// frontend/api/axios.js
/**
 * Configured Axios instance with:
 * - Base URL from app.json extra.API_BASE_URL
 * - JWT Bearer token injection on every request
 * - Automatic token refresh on 401 responses (one refresh at a time)
 * - Keeps the stored token AND the Redux copy in step, so WebSockets that read
 *   the token from Redux never connect with an expired one
 * - Ends the session (storage + Redux) when the refresh token is no longer valid
 *
 * NOTE for physical device testing:
 *   Change API_BASE_URL in app.json to your PC's local IP (e.g. http://192.168.1.x:8000)
 *   Localhost on the device refers to the device itself, not your PC.
 */
import axios from 'axios';
import { storage as SecureStore } from '../utils/storage';
import Constants from 'expo-constants';
import { store } from '../store/store';
import { setAccessToken, logout } from '../store/authSlice';

export const API_BASE_URL =
  Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
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

// ── Token refresh (single flight) ───────────────────────────────────
// If several requests get a 401 at the same moment they all wait for ONE refresh
// instead of each starting their own.
let refreshInFlight = null;

async function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (!refreshToken) throw new Error('No refresh token stored');

      const { data } = await axios.post(
        `${API_BASE_URL}/api/accounts/auth/refresh/`,
        { refresh: refreshToken },
        { timeout: 10000 }
      );

      await SecureStore.setItemAsync('access_token', data.access);
      store.dispatch(setAccessToken(data.access)); // sockets read the token from Redux
      return data.access;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function endSession() {
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
  store.dispatch(logout()); // the route guard sends the user to the login screen
}

// ── Response interceptor ────────────────────────────────────────────
// On 401: refresh the access token once, then retry the original request
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      let newAccess;
      try {
        newAccess = await refreshAccessToken();
      } catch (refreshError) {
        // Only a definite "your session is over" ends the login. A dropped network
        // connection must not log the person out.
        const status = refreshError?.response?.status;
        if (status === 401 || status === 400 || refreshError?.message === 'No refresh token stored') {
          await endSession();
        }
        return Promise.reject(error);
      }

      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
