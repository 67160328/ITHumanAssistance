/**
 * Telegram Bot API Client Service for Frontend
 */

const TELEGRAM_TOKEN_KEY = 'telegram_bot_token';
const TELEGRAM_CHAT_ID_KEY = 'telegram_chat_id';
export const SYSTEM_DEFAULT_TOKEN = '8893607516:AAE7EvjSy5Vn-wbLAmPcshI0WqEA42mzNmM';

export function getStoredTelegramConfig() {
  const token = localStorage.getItem(TELEGRAM_TOKEN_KEY) || SYSTEM_DEFAULT_TOKEN;
  const chatId = localStorage.getItem(TELEGRAM_CHAT_ID_KEY) || '';
  return { token, chatId };
}

export function saveTelegramConfig(token, chatId) {
  if (token !== undefined && token !== null) {
    localStorage.setItem(TELEGRAM_TOKEN_KEY, token.trim());
  }
  if (chatId !== undefined && chatId !== null) {
    localStorage.setItem(TELEGRAM_CHAT_ID_KEY, chatId.trim());
  }
}

const getBackendBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
  }
  return null;
};

/**
 * Fetch latest config and saved chat IDs from SQLite backend
 */
export async function fetchTelegramBackendConfig() {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) return null;
  try {
    const res = await fetch(`${baseUrl}/api/telegram/config`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.info('Telegram config fetch fallback to local:', e.message);
  }
  return null;
}

/**
 * Send AI translation structure to Telegram
 */
export async function sendToTelegram({
  token,
  chatId,
  mode,
  data,
  includeJsonFile = false
}) {
  const baseUrl = getBackendBaseUrl();
  const activeToken = token !== undefined ? token : getStoredTelegramConfig().token;
  const activeChatId = chatId !== undefined ? chatId : getStoredTelegramConfig().chatId;

  if (!activeChatId) {
    throw new Error('กรุณาระบุ Telegram Chat ID หรือ Username');
  }

  // 1. Try send via FastAPI Backend Endpoint
  if (baseUrl) {
    try {
      const res = await fetch(`${baseUrl}/api/telegram/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: activeToken || null,
          chat_id: activeChatId,
          mode,
          data,
          include_json_file: includeJsonFile
        })
      });

      if (res.ok) {
        return await res.json();
      }
      const errJson = await res.json().catch(() => null);
      if (errJson && errJson.detail) {
        throw new Error(errJson.detail);
      }
    } catch (err) {
      if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
        throw err;
      }
      console.info('FastAPI backend unreachable, fallback to direct Telegram Bot API:', err.message);
    }
  }

  // 2. Direct Client fallback (calls Telegram Bot API directly)
  if (!activeToken) {
    throw new Error('กรุณาระบุ Telegram Bot Token สำหรับส่งตรงจากเบราว์เซอร์');
  }

  const escapeHtml = (text) => {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  let formattedText = '';
  if (mode === 'human-to-tech') {
    formattedText = `🚀 <b>[IT Translator] ข้อกำหนดทางเทคนิค</b>\n\n📌 <b>เป้าหมายหลัก:</b>\n${escapeHtml(data.summary || '')}\n\n`;
    if (data.technicalRequirements) {
      formattedText += `⚙️ <b>Technical Requirements:</b>\n` + data.technicalRequirements.slice(0, 6).map(r => `• ${escapeHtml(r)}`).join('\n') + '\n\n';
    }
    if (data.techStack) {
      formattedText += `🛠️ <b>Tech Stack:</b>\n` + data.techStack.slice(0, 4).map(ts => `• <b>${escapeHtml(ts.name)}</b>: ${escapeHtml(ts.desc)}`).join('\n') + '\n\n';
    }
    if (data.impactAnalysis) {
      const ia = data.impactAnalysis;
      formattedText += `🏢 <b>Impact Analysis:</b>\n• โมดูลเดิม: ${escapeHtml((ia.affectedModules || []).join(', ') || 'ไม่มี')}\n• ตารางเดิม: ${escapeHtml((ia.affectedTables || []).join(', ') || 'ไม่มี')}\n• เวลา: ${escapeHtml(ia.refactoringEffortDays || '-')}\n\n`;
    }
  } else {
    formattedText = `✉️ <b>[IT Translator] อัปเดตสถานะสำหรับลูกค้า</b>\n\n📌 <b>สรุป:</b> ${escapeHtml(data.summary || '')}\n\n💬 <b>คำอธิบาย:</b>\n${escapeHtml(data.politeExplanation || '')}\n\n`;
    if (data.analogy) {
      formattedText += `💡 <b>${escapeHtml(data.analogy.title || 'เปรียบเสมือน')}:</b>\n<i>${escapeHtml(data.analogy.description || '')}</i>\n\n`;
    }
    formattedText += `📌 <b>ผลกระทบ:</b> ${escapeHtml(data.impact || '-')}\n⏱️ <b>ระยะเวลา:</b> ${escapeHtml(data.estimatedTime || '-')}\n\n`;
  }
  formattedText += `<i>ส่งตรงจาก IT-to-Human Translator</i>`;

  const telegramRes = await fetch(`https://api.telegram.org/bot${activeToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: activeChatId,
      text: formattedText,
      parse_mode: 'HTML'
    })
  });

  const teleJson = await telegramRes.json().catch(() => null);
  if (!teleJson || !teleJson.ok) {
    const rawDesc = teleJson?.description || '';
    if (rawDesc.includes('chat not found')) {
      throw new Error('ไม่พบห้องแชต (Chat not found): กรุณาเปิด Telegram แล้วกดปุ่ม START ที่บอท @aiithuman_bot ก่อน 1 ครั้งครับ');
    }
    throw new Error(rawDesc || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Telegram Bot API');
  }

  return { success: true, message: 'ส่งข้อความเข้า Telegram สำเร็จเรียบร้อยแล้ว!' };
}

/**
 * Test Telegram connection with a ping message
 */
export async function testTelegramConnection(token, chatId) {
  const baseUrl = getBackendBaseUrl();
  const activeToken = token !== undefined && token !== '' ? token : getStoredTelegramConfig().token;
  const activeChatId = chatId !== undefined ? chatId : getStoredTelegramConfig().chatId;

  if (!activeChatId) {
    throw new Error('กรุณาระบุ Telegram Chat ID หรือ Username');
  }

  // 1. Try FastAPI Backend Endpoint
  if (baseUrl) {
    try {
      const res = await fetch(`${baseUrl}/api/telegram/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: activeToken || null,
          chat_id: activeChatId
        })
      });

      if (res.ok) {
        return await res.json();
      }
      const errJson = await res.json().catch(() => null);
      if (errJson && errJson.detail) {
        throw new Error(errJson.detail);
      }
    } catch (err) {
      if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
        throw err;
      }
      console.info('FastAPI backend unreachable, fallback to direct Telegram test:', err.message);
    }
  }

  // 2. Direct Telegram API fallback
  if (!activeToken) {
    throw new Error('กรุณาระบุ Telegram Bot Token สำหรับทดสอบ');
  }

  const telegramRes = await fetch(`https://api.telegram.org/bot${activeToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: activeChatId,
      text: '🤖 <b>[IT Translator Test]</b>\nทดสอบการเชื่อมต่อ Telegram Bot สำเร็จ!',
      parse_mode: 'HTML'
    })
  });

  const teleJson = await telegramRes.json().catch(() => null);
  if (!teleJson || !teleJson.ok) {
    const rawDesc = teleJson?.description || '';
    if (rawDesc.includes('chat not found')) {
      throw new Error('ไม่พบห้องแชต (Chat not found): กรุณาเปิด Telegram แล้วกดปุ่ม START ที่บอท @aiithuman_bot ก่อน 1 ครั้งครับ');
    }
    throw new Error(rawDesc || 'การเชื่อมต่อ Telegram Bot ล้มเหลว');
  }

  return { success: true, message: 'เชื่อมต่อ Telegram สำเร็จ! ได้รับข้อความทดสอบแล้ว' };
}

/**
 * Send notification to Telegram when quota has been restored / reset
 */
export async function sendQuotaRestoredNotification(chatId = null, token = null) {
  const activeChatId = chatId || getStoredTelegramConfig().chatId;
  const activeToken = token || getStoredTelegramConfig().token;

  if (!activeChatId) {
    return { success: false, reason: 'no_chat_id' };
  }

  const restoredMsg = `🎉 <b>[IT-to-Human Translator] โควต้าพร้อมใช้งานแล้ว!</b>\n\n` +
    `⚡ โควต้าการแปลภาษาของคุณได้รับการรีเซ็ตแล้ว คุณสามารถกลับมาส่งข้อความแปลความต้องการและประมวลผลคำสั่งได้ตามปกติทันทีครับ\n\n` +
    `🔗 <i>ระบบพร้อมให้บริการแล้วที่ IT-to-Human Translator Platform</i>`;

  const baseUrl = getBackendBaseUrl();
  if (baseUrl) {
    try {
      const res = await fetch(`${baseUrl}/api/telegram/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: activeToken || null,
          chat_id: activeChatId,
          data: {
            summary: 'โควต้าการใช้งานของคุณได้รับการรีเซ็ตแล้ว พร้อมใช้งานได้ทันที',
            politeExplanation: 'ระบบได้รีเซ็ตโควต้าสำหรับการแปลภาษาเรียบร้อยแล้ว ท่านสามารถกลับมาใช้งานระบบได้ตามปกติทันทีค่ะ',
            impact: 'กลับมาใช้งานได้เต็มประสิทธิภาพ',
            estimatedTime: 'พร้อมใช้งานทันที'
          },
          mode: 'tech-to-human',
          include_json_file: false
        })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.info('Backend telegram notification fallback to direct API:', e.message);
    }
  }

  // Fallback direct Telegram Bot API
  if (!activeToken) return { success: false, reason: 'no_token' };

  try {
    const telegramRes = await fetch(`https://api.telegram.org/bot${activeToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: activeChatId,
        text: restoredMsg,
        parse_mode: 'HTML'
      })
    });
    const teleJson = await telegramRes.json().catch(() => null);
    return { success: teleJson?.ok || false, response: teleJson };
  } catch (err) {
    console.error('Failed to send Telegram quota restored notification:', err);
    return { success: false, error: err.message };
  }
}
