const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export function getToken() {
  return localStorage.getItem("jansetu_token") || localStorage.getItem("jansetu_officer_token") || "";
}

export async function apiCall(method: string, endpoint: string, body?: any) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    if (endpoint !== "/api/v1/officer-auth/refresh") {
      // Redirect to appropriate login based on context
      const isOfficerPath = window.location.pathname.startsWith('/officer');
      const role = localStorage.getItem('jansetu_role');
      const isOfficer = role === 'officer' || role === 'admin' || isOfficerPath;
      localStorage.removeItem('jansetu_officer_token');
      localStorage.removeItem('jansetu_token');
      localStorage.removeItem('jansetu_role');
      window.location.href = isOfficer ? '/officer/login' : '/login';
      return;
    }
  }
  
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    throw new Error(`Failed to parse JSON: ${text}`);
  }

  if (!response.ok) {
    throw new Error(data.detail || data.message || `Request failed with status ${response.status}`);
  }
  
  return data;
}
