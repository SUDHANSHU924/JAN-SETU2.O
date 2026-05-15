const rawApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.REACT_APP_API_BASE_URL ||
  'http://127.0.0.1:8000';
const API_BASE_URL = rawApiBaseUrl.trim().replace(/\/+$/, '');

export const hasApiBaseUrl = API_BASE_URL.length > 0;
export const apiBaseUrlError = hasApiBaseUrl
  ? ''
  : 'Missing API base URL. Set VITE_API_BASE_URL (or REACT_APP_API_BASE_URL) and redeploy.';

export default API_BASE_URL;
