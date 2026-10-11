import React, { useState, useEffect } from 'react';
import { X, Key, Check, Bot, AlertCircle, Send, ExternalLink, Cpu } from 'lucide-react';
import {
  getStoredApiKey,
  saveApiKey,
  getStoredGroqKey,
  saveGroqKey,
  getStoredOllamaUrl,
  saveOllamaUrl,
  getStoredPreferredProvider,
  savePreferredProvider
} from '../services/translator';
import { getStoredTelegramConfig, saveTelegramConfig, fetchTelegramBackendConfig, SYSTEM_DEFAULT_TOKEN } from '../services/telegramService';

export default function SettingsModal({ isOpen, onClose, onSave }) {
  const [apiKey, setApiKey] = useState(getStoredApiKey());
  const [groqKey, setGroqKey] = useState(getStoredGroqKey());
  const [ollamaUrl, setOllamaUrl] = useState(getStoredOllamaUrl());
  const [preferredProvider, setPreferredProvider] = useState(getStoredPreferredProvider());

  const initialTele = getStoredTelegramConfig();
  const [telegramToken, setTelegramToken] = useState(initialTele.token || SYSTEM_DEFAULT_TOKEN);
  const [telegramChatId, setTelegramChatId] = useState(initialTele.chatId);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredApiKey());
      setGroqKey(getStoredGroqKey());
      setOllamaUrl(getStoredOllamaUrl());
      setPreferredProvider(getStoredPreferredProvider());

      fetchTelegramBackendConfig().then((cfg) => {
        if (cfg) {
          if (cfg.default_token && (!telegramToken || telegramToken === '')) {
            setTelegramToken(cfg.default_token);
          }
          if (cfg.latest_chat_id && !telegramChatId) {
            setTelegramChatId(cfg.latest_chat_id);
          }
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveApiKey(apiKey.trim());
    saveGroqKey(groqKey.trim());
    saveOllamaUrl(ollamaUrl.trim());
    savePreferredProvider(preferredProvider);
    saveTelegramConfig(telegramToken, telegramChatId);
    setSavedSuccess(true);
    if (onSave) onSave({ apiKey: apiKey.trim(), groqKey: groqKey.trim(), ollamaUrl: ollamaUrl.trim(), preferredProvider });
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
            <span>ตั้งค่าระบบ & การเชื่อมต่อภายนอก</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Section 1: Multi-AI Gateway Configuration */}
          <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: '#A5B4FC', fontWeight: 600, fontSize: '0.95rem' }}>
              <Key size={16} />
              <span>Multi-AI Gateway (Gemini, Groq, Ollama)</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.8rem' }}>
              กำหนด AI Provider และ API Key สำหรับระบบ Smart Router (มี Failover สำรองอัตโนมัติ)
            </p>

            {/* Provider Selection */}
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                ลำดับความสำคัญของ AI (Routing Preference):
              </label>
              <select
                className="custom-input"
                value={preferredProvider}
                onChange={(e) => setPreferredProvider(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="auto">🟢 Smart Auto-Router (Gemini ➔ Groq ➔ Ollama ➔ Local)</option>
                <option value="groq">⚡ Speed First: Groq Cloud LPU (Llama 3.3 70B)</option>
                <option value="gemini">🥇 Language First: Google Gemini (Gemini Flash)</option>
              </select>
            </div>

            {/* Google Gemini Key */}
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                1. Google Gemini API Key (ฟรี):
              </label>
              <input
                type="password"
                className="custom-input"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            {/* Groq Cloud Key */}
            <div style={{ marginBottom: '0.8rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                2. Groq Cloud API Key (ฟรี - gsk_... สำหรับ Ultra-Fast Failover):
              </label>
              <input
                type="password"
                className="custom-input"
                placeholder="gsk_..."
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
              />
            </div>

            {/* Local Ollama URL */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                3. Local Ollama URL (สำหรับ On-Premise / Private Local):
              </label>
              <input
                type="text"
                className="custom-input"
                placeholder="http://localhost:11434"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Section 2: Telegram Bot Integration */}
          <div style={{ marginBottom: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontWeight: 600, fontSize: '0.95rem' }}>
                <Send size={16} />
                <span>Telegram Bot Integration</span>
              </div>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.75rem', color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                <span>@BotFather</span>
                <ExternalLink size={11} />
              </a>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.8rem' }}>
              ตั้งค่าเริ่มต้นสำหรับส่งโครงสร้างข้อมูล AI ไปยังกลุ่มหรือแชต Telegram
            </p>

            <div style={{ marginBottom: '0.8rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                Telegram Bot Token:
              </label>
              <input
                type="password"
                className="custom-input"
                placeholder="123456789:ABCdefGh..."
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                Default Chat ID / Channel:
              </label>
              <input
                type="text"
                className="custom-input"
                placeholder="เช่น 123456789 หรือ @channel_name"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>ยกเลิก</button>
          <button className="btn-primary" onClick={handleSave}>
            {savedSuccess ? <Check size={16} /> : <Key size={16} />}
            <span>{savedSuccess ? 'บันทึกเรียบร้อย' : 'บันทึกการตั้งค่าทั้งหมด'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

