// frontend/api/auth.js
// All authentication API calls — maps to Django backend endpoints
import axios from 'axios';
import apiClient, { API_BASE_URL } from './axios';

const BASE = '/api/accounts';

// ── OTP Registration Flow ────────────────────────────────────────────

/**
 * Step 1: Request OTP sent to email
 * POST /api/accounts/auth/register/request-otp/
 */
export const requestOTP = async (email, role) => {
  const { data } = await apiClient.post(`${BASE}/auth/register/request-otp/`, {
    email,
    role,
  });
  return data;
};

/**
 * Step 2: Verify the OTP code
 * POST /api/accounts/auth/register/verify-otp/
 */
export const verifyOTP = async (email, otp_code) => {
  const { data } = await apiClient.post(`${BASE}/auth/register/verify-otp/`, {
    email,
    otp_code,
  });
  return data;
};

/**
 * Step 3a: Complete registration — General User
 * POST /api/accounts/auth/register/general-user/
 * Body: { email, username, password, first_name, last_name, phone, emergency_contacts: [{name, phone, relationship}] }
 */
export const registerGeneralUser = async (payload) => {
  const { data } = await apiClient.post(
    `${BASE}/auth/register/general-user/`,
    payload
  );
  return data;
};

/**
 * Step 3b: Complete registration — Graduate Counselor
 * POST /api/accounts/auth/register/counselor/
 * Sends as multipart/form-data to support optional file uploads
 */
export const registerCounselor = async (formData) => {
  const { data } = await apiClient.post(
    `${BASE}/auth/register/counselor/`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
};

/**
 * Step 3c: Complete registration — Licensed Therapist
 * POST /api/accounts/auth/register/therapist/
 * Sends as multipart/form-data to support optional file uploads
 */
export const registerTherapist = async (formData) => {
  const { data } = await apiClient.post(
    `${BASE}/auth/register/therapist/`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
};

// ── Auth ─────────────────────────────────────────────────────────────

/**
 * Login with email + password
 * POST /api/accounts/auth/login/
 */
export const login = async (email, password) => {
  const { data } = await apiClient.post(`${BASE}/auth/login/`, {
    email,
    password,
  });
  return data;
};

/**
 * Get current user profile — called with the stored token to validate session
 * GET /api/accounts/auth/me/
 */
export const getMe = async (token) => {
  const { data } = await axios.get(`${API_BASE_URL}${BASE}/auth/me/`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 8000,
  });
  return data;
};

/**
 * Logout current device
 * POST /api/accounts/auth/logout/
 */
export const logoutUser = async () => {
  const { data } = await apiClient.post(`${BASE}/auth/logout/`);
  return data;
};

/**
 * Logout all devices
 * POST /api/accounts/auth/logout-all/
 */
export const logoutAllDevices = async () => {
  const { data } = await apiClient.post(`${BASE}/auth/logout-all/`);
  return data;
};

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Extract a human-readable error message from an Axios error response.
 */
export const getErrorMessage = (error) => {
  if (!error.response) return 'Network error. Please check your connection.';
  const { data, status } = error.response;
  
  if (data?.detail) return data.detail;
  if (data?.non_field_errors) return data.non_field_errors.join(' ');
  
  // Extract field-level errors (e.g. { username: ["This field is required."] })
  if (data && typeof data === 'object') {
    const fieldErrors = [];
    for (const [field, errors] of Object.entries(data)) {
      if (Array.isArray(errors)) {
        fieldErrors.push(`${field}: ${errors[0]}`);
      } else if (typeof errors === 'string') {
        fieldErrors.push(`${field}: ${errors}`);
      }
    }
    if (fieldErrors.length > 0) return fieldErrors.join(' | ');
  }

  if (typeof data === 'string') return data;
  if (status === 500) return 'Server error. Please try again later.';
  if (status === 429) return 'Too many requests. Please wait a moment.';
  return 'Something went wrong. Please try again.';
};
