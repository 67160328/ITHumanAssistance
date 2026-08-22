const FASTAPI_BASE_URL = 'http://localhost:8000';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

/**
 * Register a new user
 */
export async function register(username, email, password) {
  const response = await fetch(`${FASTAPI_BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'การสมัครสมาชิกล้มเหลว');
  }

  return data;
}

/**
 * Login and store token + username in localStorage
 */
export async function login(username, password) {
  const response = await fetch(`${FASTAPI_BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }

  // Save session
  if (data.token) {
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
  }
  if (data.username) {
    localStorage.setItem(AUTH_USER_KEY, data.username);
  }

  return data;
}

/**
 * Logout — clear local session and notify backend
 */
export async function logout() {
  const token = getToken();

  try {
    await fetch(`${FASTAPI_BASE_URL}/api/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (err) {
    console.warn('Logout API call failed, clearing local session anyway:', err.message);
  }

  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

/**
 * Change password
 */
export async function changePassword(username, oldPassword, newPassword) {
  const response = await fetch(`${FASTAPI_BASE_URL}/api/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      old_password: oldPassword,
      new_password: newPassword,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'การเปลี่ยนรหัสผ่านล้มเหลว');
  }

  return data;
}

/** Get stored token */
export function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || null;
}

/** Get stored username */
export function getUser() {
  return localStorage.getItem(AUTH_USER_KEY) || null;
}

/** Check if user is logged in */
export function isLoggedIn() {
  return !!getToken() && !!getUser();
}
