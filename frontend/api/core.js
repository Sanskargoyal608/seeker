// frontend/api/core.js
import apiClient from './axios';

export const getDashboardData = async () => {
  const { data } = await apiClient.get('/api/core/user/dashboard/');
  return data;
};

export const getActiveTriage = async () => {
  try {
    const { data } = await apiClient.get('/api/core/triage/active/');
    return data;
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw error;
  }
};

export const startTriage = async () => {
  const { data } = await apiClient.post('/api/core/triage/start/');
  return data;
};

export const respondTriage = async (sessionId, responseText) => {
  const { data } = await apiClient.post('/api/core/triage/respond/', {
    triage_session_id: sessionId,
    response: responseText,
  });
  return data;
};

export const userPanic = async () => {
  const { data } = await apiClient.post('/api/core/panic/');
  return data;
};

// ---------- THERAPISTS & SESSIONS ----------
export const getTherapists = async (q = '*', language = null, modality = null, maxPrice = null) => {
  const params = { q };
  if (language) params.language = language;
  if (modality) params.modality = modality;
  if (maxPrice) params.max_price = maxPrice;
  const response = await apiClient.get('/api/profiles/therapists/search/', { params });
  return response.data.hits?.map(h => h.document) || [];
};

export const getTherapistsForEscalation = async (language = null, modality = null) => {
  const params = {};
  if (language) params.language = language;
  if (modality) params.modality = modality;
  const response = await apiClient.get('/api/profiles/therapists/search/', { params });
  return response.data.hits?.map(h => h.document) || [];
};

export const escalateSession = async (sessionId, therapistId, urgency, reason) => {
  const response = await apiClient.post(`/api/core/sessions/${sessionId}/escalate/`, {
    to_therapist: therapistId,
    urgency,
    reason,
  });
  return response.data;
};

export const requestTherapistSession = async (therapistId) => {
  const { data } = await apiClient.post('/api/core/sessions/request-therapist/', {
    therapist_id: therapistId
  });
  return data;
};

export const endSession = async (sessionId) => {
  const { data } = await apiClient.post(`/api/core/sessions/${sessionId}/end/`);
  return data;
};

export const submitFeedback = async (sessionId, feedbackData) => {
  // Uses the feedback app endpoints mounted at /api/
  const { data } = await apiClient.post(`/api/sessions/${sessionId}/feedback/`, feedbackData);
  return data;
};

// Sprint 3: Escalations & Follow-up
export const createEscalationRequest = async (sessionId, therapistId, urgency, reason) => {
  const { data } = await apiClient.post('/api/core/escalate/', {
    session_id: sessionId,
    therapist_id: therapistId,
    urgency,
    reason,
  });
  return data;
};

export const respondToEscalationRequest = async (escalationId, action) => {
  const { data } = await apiClient.post(`/api/core/escalations/${escalationId}/respond/`, { action });
  return data;
};

export const createTherapistFollowUp = async (userId) => {
  const { data } = await apiClient.post('/api/core/follow-up/', { user_id: userId });
  return data;
};

export const getSessionIntake = async (sessionId) => {
  const { data } = await apiClient.get(`/api/core/sessions/${sessionId}/intake/`);
  return data;
};

// Helpline API
export const getHelplines = async () => {
  const { data } = await apiClient.get('/api/helpline/entries/');
  return data;
};

// Notifications API
export const registerDeviceToken = async (token, deviceType = 'android') => {
  const { data } = await apiClient.post('/api/notifications/device/', {
    token,
    device_type: deviceType,
  });
  return data;
};

export const getSession = async (sessionId) => {
  const { data } = await apiClient.get(`/api/core/sessions/${sessionId}/`);
  return data;
};
