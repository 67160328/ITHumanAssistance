import React, { useState } from 'react';
import { X, Key, Check, Bot, AlertCircle } from 'lucide-react';
import { getStoredApiKey, saveApiKey } from '../services/translator';

export default function SettingsModal({ isOpen, onClose, onSave }) {
  const [apiKey, setApiKey] = useState(getStoredApiKey());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    saveApiKey(apiKey.trim());
    setSavedSuccess(true);
    if (onSave) onSave(apiKey.trim());
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Key size={20} className="text-indigo-400" />
            <span>ตั้งค่า Google AI Studio / Gemini API Key</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            ป้อน API Key ของคุณจาก <strong>Google AI Studio</strong> เพื่อเปิดใช้งานการแปลภาษาไอทีด้วยโมเดล <strong>Gemini 1.5 Flash</strong> แบบเรียลไทม์
          </p>

          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#A5B4FC', fontWeight: '500', marginBottom: '0.4rem' }}>
              Gemini API Key:
            </label>
            <input
              type="password"
              className="custom-input"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '0.8rem 1rem', borderRadius: '10px', fontSize: '0.85rem', color: '#C7D2FE', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <Bot size={18} style={{ flexShrink: 0 }} />
            <span>ระบบจะเชื่อมต่อกับ Google Generative AI API โดยตรง ไม่มีการเก็บคีย์ของคุณบนเซิร์ฟเวอร์ภายนอก</span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>ยกเลิก</button>
          <button className="btn-primary" onClick={handleSave}>
            {savedSuccess ? <Check size={16} /> : <Key size={16} />}
            <span>{savedSuccess ? 'บันทึกเรียบร้อย' : 'บันทึก API Key'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
