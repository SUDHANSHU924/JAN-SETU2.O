import API_BASE_URL, { hasApiBaseUrl, apiBaseUrlError } from '../config/api';

const BASE_URL = API_BASE_URL;
let refreshPromise = null;

const getToken = () =>
  localStorage.getItem("jansetu_token") ||
  localStorage.getItem("jansetu_officer_token") ||
  "";

const isOfficerSession = () => {
  const role = localStorage.getItem("jansetu_role");
  return role === "officer" || role === "admin";
};

async function refreshOfficerTokenIfNeeded() {
  if (!isOfficerSession()) return false;
  const refreshToken = localStorage.getItem("jansetu_officer_refresh_token");
  if (!refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await fetch(`${BASE_URL}/api/v1/officer-auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshToken}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `Refresh failed (${res.status})`);

      localStorage.setItem("jansetu_officer_token", data.access_token);
      localStorage.setItem("jansetu_officer_refresh_token", data.refresh_token);
      localStorage.setItem("jansetu_role", data.role || "officer");
      return true;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  try {
    await refreshPromise;
    return true;
  } catch {
    localStorage.removeItem("jansetu_officer_token");
    localStorage.removeItem("jansetu_officer_refresh_token");
    localStorage.removeItem("jansetu_role");
    return false;
  }
}

async function apiRequest(endpoint, options = {}, retried = false) {
  if (!hasApiBaseUrl) {
    throw new Error(apiBaseUrlError);
  }

  const headers = {
    "Content-Type": "application/json",
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    ...options.headers,
  };
  try {
    const res = await fetch(BASE_URL + endpoint, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (
        res.status === 401 &&
        !retried &&
        endpoint !== "/api/v1/officer-auth/refresh"
      ) {
        const refreshed = await refreshOfficerTokenIfNeeded();
        if (refreshed) {
          return apiRequest(endpoint, options, true);
        }
      }
      throw new Error(data.detail || data.message || `Request failed (${res.status})`);
    }
    return data;
  } catch (err) {
    // Surface consistent errors to UI
    throw new Error(err.message || 'Network request failed');
  }
}

// AUTH
export const registerUser = (data) =>
  apiRequest("/auth/register", { method: "POST", body: JSON.stringify(data) });

export const loginUser = (data) =>
  apiRequest("/auth/login", { method: "POST", body: JSON.stringify(data) });

export const getMe = () => apiRequest("/auth/me");

// LOCATIONS (for officer login dropdowns)
export const getStates = () => apiRequest("/api/v1/locations/states");
export const getDistricts = (state_id) => apiRequest(`/api/v1/locations/districts?state_id=${state_id}`);
export const getAreas = (district_id) => apiRequest(`/api/v1/locations/areas?district_id=${district_id}`);
export const getWards = (area_id) => apiRequest(`/api/v1/locations/wards?area_id=${area_id}`);

// COMPLAINTS / GRIEVANCES
export const submitComplaint = (payload) =>
  apiRequest("/api/v1/complaints", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const submitGrievance = submitComplaint;

export const trackComplaint = (token) =>
  apiRequest(`/api/v1/complaints/${token}`);

export const getMyComplaints = () => apiRequest("/grievances/my");

// OFFICER
export const getAssignedComplaints = () => apiRequest("/officer/assigned");

export const resolveComplaint = (id, resolution) =>
  apiRequest(`/officer/${id}/resolve`, {
    method: "PATCH",
    body: JSON.stringify({ resolution }),
  });

export const getAnalytics = () => apiRequest("/officer/analytics/summary");

export const getOfficerKyc = () => apiRequest("/api/v1/officers/me/kyc");

export const saveOfficerKyc = (payload) =>
  apiRequest("/api/v1/officers/me/kyc", {
    method: "POST",
    body: JSON.stringify(payload),
  });
