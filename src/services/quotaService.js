/**
 * Quota & Subscription Management Service
 * Works seamlessly with FastAPI backend and has full localStorage fallback.
 */

const LOCAL_QUOTA_KEY = 'it_translator_quota_data';
const LOCAL_TIER_KEY = 'it_translator_user_tier';

const DEFAULT_FREE_LIMIT = 5;
const DEFAULT_WINDOW_HOURS = 4;

const getBackendBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
  }
  return null;
};

function getLocalData() {
  try {
    const raw = localStorage.getItem(LOCAL_QUOTA_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    used: 0,
    resetAt: null
  };
}

function saveLocalData(data) {
  try {
    localStorage.setItem(LOCAL_QUOTA_KEY, JSON.stringify(data));
  } catch (e) {}
}

export function isProUser(username) {
  const localTier = localStorage.getItem(LOCAL_TIER_KEY);
  return localTier === 'pro';
}

export function setLocalTier(tier) {
  localStorage.setItem(LOCAL_TIER_KEY, tier);
}

/**
 * Format remaining seconds into a readable Thai string
 */
export function formatWaitTime(seconds) {
  if (!seconds || seconds <= 0) return '0 นาที';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} ชม. ${minutes} นาที`;
  }
  return `${minutes} นาที`;
}

/**
 * Check quota status from FastAPI Backend or Local Storage
 */
export async function getQuotaStatus(username = null) {
  const baseUrl = getBackendBaseUrl();
  const localTier = isProUser(username) ? 'pro' : 'free';

  // 1. Try FastAPI Backend
  if (baseUrl && username) {
    try {
      const res = await fetch(`${baseUrl}/api/user/quota?username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.tier === 'pro') {
          setLocalTier('pro');
        }
        return data;
      }
    } catch (e) {
      console.info('Backend quota fetch fallback to local:', e.message);
    }
  }

  // 2. Local Fallback Evaluation
  if (localTier === 'pro') {
    return {
      allowed: true,
      tier: 'pro',
      quota_used: 0,
      quota_limit: -1,
      quota_reset_at: null,
      remaining_seconds: 0,
      formatted_wait_time: '0 นาที'
    };
  }

  const local = getLocalData();
  const now = new Date();
  let remainingSeconds = 0;
  let used = local.used || 0;
  let resetAt = local.resetAt;

  if (resetAt) {
    const resetTime = new Date(resetAt);
    if (now >= resetTime) {
      // Period expired -> reset
      used = 0;
      resetAt = null;
      saveLocalData({ used: 0, resetAt: null });
    } else {
      remainingSeconds = Math.max(0, Math.floor((resetTime - now) / 1000));
    }
  }

  const allowed = used < DEFAULT_FREE_LIMIT;

  return {
    allowed,
    tier: 'free',
    quota_used: used,
    quota_limit: DEFAULT_FREE_LIMIT,
    quota_reset_at: resetAt,
    remaining_seconds: remainingSeconds,
    formatted_wait_time: formatWaitTime(remainingSeconds)
  };
}

/**
 * Consume 1 quota count locally
 */
export function consumeLocalQuota() {
  if (isProUser()) return;
  const local = getLocalData();
  const now = new Date();
  let used = (local.used || 0) + 1;
  let resetAt = local.resetAt;

  if (!resetAt) {
    const nextReset = new Date(now.getTime() + DEFAULT_WINDOW_HOURS * 3600 * 1000);
    resetAt = nextReset.toISOString();
  }

  saveLocalData({ used, resetAt });
}

/**
 * Upgrade user to Pro Tier (calls backend and persists in localStorage)
 */
export async function upgradeToPro(username = null, paymentMethod = 'promptpay') {
  setLocalTier('pro');
  const baseUrl = getBackendBaseUrl();

  if (baseUrl && username) {
    try {
      const res = await fetch(`${baseUrl}/api/user/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          target_tier: 'pro',
          payment_method: paymentMethod
        })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.info('Upgrade tier backend offline, saved in local:', e.message);
    }
  }

  return {
    success: true,
    message: 'อัปเกรดเป็นสมาชิก Pro เรียบร้อยแล้ว (ใช้งานได้ไม่จำกัด)',
    tier: 'pro',
    username: username || 'User'
  };
}
