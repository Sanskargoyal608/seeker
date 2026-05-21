// frontend/store/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  deviceHash: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  // Registration flow state (persisted between screens)
  registrationFlow: {
    email: null,
    role: null,
    otpVerified: false,
  },
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setTokens: (state, action) => {
      state.accessToken = action.payload.access;
      state.refreshToken = action.payload.refresh;
      state.deviceHash = action.payload.device_hash || null;
      state.isAuthenticated = true;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setRegistrationFlow: (state, action) => {
      state.registrationFlow = { ...state.registrationFlow, ...action.payload };
    },
    clearRegistrationFlow: (state) => {
      state.registrationFlow = { email: null, role: null, otpVerified: false };
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.deviceHash = null;
      state.isAuthenticated = false;
      state.error = null;
      state.registrationFlow = { email: null, role: null, otpVerified: false };
    },
  },
});

export const {
  setTokens,
  setUser,
  setLoading,
  setError,
  clearError,
  setRegistrationFlow,
  clearRegistrationFlow,
  logout,
} = authSlice.actions;

// Selectors
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAccessToken = (state) => state.auth.accessToken;
export const selectError = (state) => state.auth.error;
export const selectIsLoading = (state) => state.auth.isLoading;
export const selectRegistrationFlow = (state) => state.auth.registrationFlow;

export default authSlice.reducer;
