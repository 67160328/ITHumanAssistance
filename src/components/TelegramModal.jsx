import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Check, 
  Loader2, 
  HelpCircle, 
  FileCode, 
  Bot, 
  AlertCircle,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  History
} from 'lucide-react';
import { 
  getStoredTelegramConfig, 
  saveTelegramConfig, 
  sendToTelegram, 
  testTelegramConnection,
  fetchTelegramBackendConfig,
  SYSTEM_DEFAULT_TOKEN
} from '../services/telegramService';

export default function TelegramModal({ isOpen, onClose, translationResult, onSentSuccess }) {
  const initialConfig = getStoredTelegramConfig();
  const [botToken, setBotToken] = useState(initialConfig.token || SYSTEM_DEFAULT_TOKEN);
  const [chatId, setChatId] = useState(initialConfig.chatId || '');
  const [recentChatIds, setRecentChatIds] = useState([]);
  const [includeJsonFile, setIncludeJsonFile] = useState(false);
  const [showAdvancedToken, setShowAdvancedToken] = useState(false);

  const [isSending, setIsSending] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  // โหลดค่า Chat ID ล่าสุดจาก SQLite Database เมื่อเปิด Modal
  useEffect(() => {
    if (isOpen) {
      fetchTelegramBackendConfig().then((cfg) => {
        if (cfg) {
          if (cfg.default_token && (!botToken || botToken === '')) {
            setBotToken(cfg.default_token);
          }
          if (cfg.latest_chat_id && !chatId) {
            setChatId(cfg.latest_chat_id);
          }
          if (cfg.recent_chat_ids && cfg.recent_chat_ids.length > 0) {
            setRecentChatIds(cfg.recent_chat_ids);
          }
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!chatId.trim()) {
      setStatusMessage({ text: 'กรุณากรอก Telegram Chat ID หรือ @channel', type: 'error' });
      return;
    }
    setIsTesting(true);
    setStatusMessage({ text: '', type: '' });
    try {
      saveTelegramConfig(botToken, chatId);
      const res = await testTelegramConnection(botToken, chatId);
      setStatusMessage({ text: res.message || 'เชื่อมต่อ Telegram สำเร็จ!', type: 'success' });
      if (!recentChatIds.includes(chatId.trim())) {
        setRecentChatIds([chatId.trim(), ...recentChatIds]);
      }
    } catch (err) {
      setStatusMessage({ text: err.message, type: 'error' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSend = async () => {
    if (!translationResult || !translationResult.data) {
      setStatusMessage({ text: 'ไม่พบข้อมูลผลลัพธ์การแปลที่ต้องการส่ง', type: 'error' });
      return;
    }
    if (!chatId.trim()) {
      setStatusMessage({ text: 'กรุณากรอก Telegram Chat ID หรือ @channel', type: 'error' });
      return;
    }

    setIsSending(true);
    setStatusMessage({ text: '', type: '' });
    try {
      saveTelegramConfig(botToken, chatId);
      const res = await sendToTelegram({
        token: botToken,
        chatId: chatId,
        mode: translationResult.mode,
        data: translationResult.data,
        includeJsonFile
      });

      setStatusMessage({ text: res.message || 'ส่งเข้า Telegram สำเร็จแล้ว!', type: 'success' });
      if (!recentChatIds.includes(chatId.trim())) {
        setRecentChatIds([chatId.trim(), ...recentChatIds]);
      }
      if (onSentSuccess) {
        onSentSuccess(res.message);
      }
      setTimeout(() => {
        onClose();
        setStatusMessage({ text: '', type: '' });
      }, 1500);
    } catch (err) {
      setStatusMessage({ text: err.message, type: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Send size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc' }}>
                ส่งโครงสร้างข้อมูลเข้า Telegram
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                ส่งข้อกำหนด AI และโครงสร้างข้อมูลตรงเข้าห้องแชต/กลุ่ม Telegram
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} title="ปิดหน้าต่าง">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Target Mode Info */}
          <div style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <MessageSquare size={16} color="#38bdf8" />
              <div style={{ fontSize: '0.85rem', color: '#e0f2fe' }}>
                โหมด: <strong>{translationResult?.mode === 'human-to-tech' ? '🛠️ Human-to-Tech' : '✉️ Tech-to-Human'}</strong>
              </div>
            </div>

            {/* Telegram Bot Connected Badge */}
            <a
              href="https://t.me/aiithuman_bot"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                color: '#34d399',
                textDecoration: 'none'
              }}
              title="คลิกเพื่อเปิดบอทใน Telegram และกด START"
            >
              <ShieldCheck size={13} />
              <span>บอท: @aiithuman_bot (กด Start เพื่อเปิดรับข้อความ)</span>
              <ExternalLink size={10} />
            </a>
          </div>

          {/* Telegram Chat ID Input (Required) */}
          <div style={{ marginBottom: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.88rem', color: '#93c5fd', fontWeight: 600 }}>
                Target Chat ID หรือ @Username / Channel: <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <a 
                href="https://t.me/userinfobot" 
                target="_blank" 
                rel="noreferrer"
                style={{ fontSize: '0.75rem', color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                <span>ดู Chat ID ที่ @userinfobot</span>
                <ExternalLink size={11} />
              </a>
            </div>
            <input
              type="text"
              className="custom-input"
              placeholder="เช่น 123456789, -100123456789, หรือ @channel_name"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              style={{ fontSize: '0.95rem', borderColor: chatId ? 'rgba(56, 189, 248, 0.4)' : undefined }}
            />
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem' }}>
              💾 ระบบจะบันทึก Chat ID ลงฐานข้อมูลอัตโนมัติ ไม่ต้องกรอกซ้ำในครั้งถัดไป
            </div>

            {/* Recent Chat IDs list if exists */}
            {recentChatIds.length > 0 && (
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <History size={11} /> ที่เคยใช้:
                </span>
                {recentChatIds.map((cid, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setChatId(cid)}
                    style={{
                      background: chatId === cid ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${chatId === cid ? 'rgba(56, 189, 248, 0.6)' : 'rgba(255, 255, 255, 0.1)'}`,
                      color: chatId === cid ? '#38bdf8' : '#cbd5e1',
                      borderRadius: '4px',
                      padding: '1px 6px',
                      fontSize: '0.72rem',
                      cursor: 'pointer'
                    }}
                  >
                    {cid}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Additional Options */}
          <div style={{ marginBottom: '1rem', padding: '0.8rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem', color: '#cbd5e1' }}>
              <input
                type="checkbox"
                checked={includeJsonFile}
                onChange={(e) => setIncludeJsonFile(e.target.checked)}
                style={{ accentColor: '#38bdf8', width: '16px', height: '16px' }}
              />
              <FileCode size={16} color="#38bdf8" />
              <span>แนบไฟล์โครงสร้าง JSON เต็ม (ai_spec.json) ส่งไปด้วย</span>
            </label>
          </div>

          {/* Advanced Bot Token Settings (Collapsible) */}
          <div style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={() => setShowAdvancedToken(!showAdvancedToken)}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <span>กำหนด Bot Token เอง (สำหรับผู้ดูแลระบบ)</span>
              {showAdvancedToken ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {showAdvancedToken && (
              <div style={{ marginTop: '0.6rem', padding: '0.8rem', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Custom Bot Token:
                  </label>
                  <a 
                    href="https://t.me/BotFather" 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ fontSize: '0.72rem', color: '#38bdf8', textDecoration: 'none' }}
                  >
                    @BotFather
                  </a>
                </div>
                <input
                  type="password"
                  className="custom-input"
                  placeholder="8893607516:AAE7..."
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  style={{ fontSize: '0.82rem' }}
                />
              </div>
            )}
          </div>

          {/* Status Message */}
          {statusMessage.text && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              color: statusMessage.type === 'success' ? '#34d399' : '#f87171'
            }}>
              {statusMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={handleTestConnection} 
            disabled={isTesting || isSending}
            style={{ fontSize: '0.82rem', padding: '0.5rem 0.8rem' }}
          >
            {isTesting ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
            <span>{isTesting ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}</span>
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" onClick={onClose} disabled={isSending}>
              ยกเลิก
            </button>
            <button 
              className="btn-primary" 
              onClick={handleSend} 
              disabled={isSending || isTesting}
              style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}
            >
              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              <span>{isSending ? 'กำลังส่งข้อมูล...' : 'ส่งเข้า Telegram ทันที'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
