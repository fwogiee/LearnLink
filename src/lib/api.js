const STORAGE_KEYS = {
  token: 'token',
  role: 'role',
  username: 'username',
};

const DEFAULT_BASE = import.meta.env.DEV ? 'http://localhost:4000' : '';
export const API_BASE = import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE;

export function getSessionAuth() {
  return {
    token: sessionStorage.getItem(STORAGE_KEYS.token) || '',
    role: sessionStorage.getItem(STORAGE_KEYS.role) || '',
    username: sessionStorage.getItem(STORAGE_KEYS.username) || '',
  };
}

export function persistSessionAuth({ token, role, username }) {
  if (token) {
    sessionStorage.setItem(STORAGE_KEYS.token, token);
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.token);
  }
  if (role) {
    sessionStorage.setItem(STORAGE_KEYS.role, role);
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.role);
  }
  if (username) {
    sessionStorage.setItem(STORAGE_KEYS.username, username);
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.username);
  }
}

export function clearSessionAuth() {
  Object.values(STORAGE_KEYS).forEach((key) => sessionStorage.removeItem(key));
}

export function authHeaders(extra = {}) {
  const { token } = getSessionAuth();
  const headers = new Headers({ 'Content-Type': 'application/json', ...extra });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

export async function http(path, options = {}) {
  const { headers, ...rest } = options;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: headers instanceof Headers ? headers : authHeaders(headers),
    ...rest,
  });

  const text = await response.text();
  const data = text ? safeParseJSON(text) : null;

  if (!response.ok) {
    const message = data?.message || response.statusText || 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.body = data;
    if (response.status === 401) {
      clearSessionAuth();
    }
    throw error;
  }

  return data;
}

function safeParseJSON(value) {
  try {
    return JSON.parse(value);
  } catch (err) {
    console.warn('Failed to parse JSON response', err);
    return null;
  }
}

export async function httpJson(path, options = {}) {
  const res = await http(path, options);
  return res ?? {};
}

export function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val === undefined || val === null || val === '') return;
    search.set(key, String(val));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export { STORAGE_KEYS };
