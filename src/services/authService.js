const FASTAPI_BASE_URL = 'http://localhost:8000';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';
const LOCAL_USERS_KEY = 'local_registered_users';

// Helper to get local user database
function getLocalUsers() {
  const data = localStorage.getItem(LOCAL_USERS_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveLocalUsers(users) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

/**
 * Register a new user with FastAPI Backend (and seamless Local Storage Fallback if backend is offline)
 */
export async function register(username, email, password) {
  try {
    const response = await fetch(`${FASTAPI_BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'การสมัครสมาชิกล้มเหลว');
    }
  } catch (err) {
    // If it's a validation error from backend, re-throw
    if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }

    // Backend is offline -> Fallback to client-side localStorage
    console.info('FastAPI backend offline, registering in local browser storage:', err.message);
    const users = getLocalUsers();
    if (users[username]) {
      throw new Error(`ชื่อผู้ใช้ '${username}' มีอยู่ในระบบแล้ว`);
    }

    users[username] = {
      username,
      email,
      password, // in client mode
      createdAt: new Date().toISOString()
    };
    saveLocalUsers(users);

    return {
      success: true,
      message: `สมัครสมาชิกสำหรับ '${username}' สำเร็จเรียบร้อยแล้ว (Local Mode)`,
      username
    };
  }
}

/**
 * Login and store token + username in localStorage
 */
export async function login(username, password) {
  try {
    const response = await fetch(`${FASTAPI_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.token) localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      if (data.username) localStorage.setItem(AUTH_USER_KEY, data.username);
      return data;
    } else {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  } catch (err) {
    // If it's an explicit 401 error from backend, re-throw
    if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }

    // Backend is offline -> Fallback to client-side login check
    console.info('FastAPI backend offline, checking credentials in local storage:', err.message);
    const users = getLocalUsers();
    const user = users[username];

    // Check demo accounts as default
    if (username === 'demo_developer' && password === 'DevPass123!') {
      const token = 'local_session_' + Date.now();
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(AUTH_USER_KEY, username);
      return { success: true, username, token };
    }

    if (!user || user.password !== password) {
      throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    const token = 'local_session_' + Date.now();
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, username);
    return { success: true, username, token };
  }
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
    // ignore
  }

  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

/**
 * Change password
 */
export async function changePassword(username, oldPassword, newPassword) {
  try {
    const response = await fetch(`${FASTAPI_BASE_URL}/api/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        old_password: oldPassword,
        new_password: newPassword,
      }),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'การเปลี่ยนรหัสผ่านล้มเหลว');
    }
  } catch (err) {
    if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }

    // Local fallback
    const users = getLocalUsers();
    if (users[username]) {
      if (users[username].password !== oldPassword) {
        throw new Error('รหัสผ่านเดิมไม่ถูกต้อง');
      }
      users[username].password = newPassword;
      saveLocalUsers(users);
      return { success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว (Local Mode)' };
    }
    return { success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' };
  }
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
