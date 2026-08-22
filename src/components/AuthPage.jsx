import React, { useState } from 'react';
import {
  LogIn,
  UserPlus,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  Check,
  Loader2,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { login, register } from '../services/authService';

export default function AuthPage({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'

  // Login form
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  // Shared state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const clearMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSwitchTab = (tab) => {
    setActiveTab(tab);
    clearMessages();
  };

  // ── Login ──
  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!loginUsername.trim() || !loginPassword.trim()) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(loginUsername.trim(), loginPassword);
      onLoginSuccess(result.username, result.token);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Register ──
  const handleRegister = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!regUsername.trim() || !regEmail.trim() || !regPassword || !regConfirm) {
      setErrorMsg('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }
    if (regUsername.trim().length < 3) {
      setErrorMsg('ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(regEmail)) {
      setErrorMsg('รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (regPassword !== regConfirm) {
      setErrorMsg('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsLoading(true);
    try {
      await register(regUsername.trim(), regEmail.trim(), regPassword);
      setSuccessMsg('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
      // Pre-fill login form
      setLoginUsername(regUsername.trim());
      setLoginPassword('');
      setTimeout(() => {
        setActiveTab('login');
        setSuccessMsg('');
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Decorative background orbs */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div className="auth-card">
        {/* Header */}
        <div className="auth-card-header">
          <div className="auth-logo">
            <Sparkles size={28} />
          </div>
          <h1 className="auth-title">IT-to-Human Translator</h1>
          <p className="auth-subtitle">ระบบแปลภาษาไอทีอัจฉริยะ</p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => handleSwitchTab('login')}
          >
            <LogIn size={16} />
            <span>เข้าสู่ระบบ</span>
          </button>
          <button
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => handleSwitchTab('register')}
          >
            <UserPlus size={16} />
            <span>สมัครสมาชิก</span>
          </button>
        </div>

        {/* Messages */}
        {errorMsg && (
          <div className="auth-message auth-error">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-message auth-success">
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ── Login Form ── */}
        {activeTab === 'login' && (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="auth-field">
              <label className="auth-label">
                <User size={14} />
                <span>ชื่อผู้ใช้</span>
              </label>
              <input
                type="text"
                className="custom-input auth-input"
                placeholder="กรอกชื่อผู้ใช้ของคุณ"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                autoComplete="username"
                disabled={isLoading}
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">
                <Lock size={14} />
                <span>รหัสผ่าน</span>
              </label>
              <div className="auth-password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="custom-input auth-input"
                  placeholder="กรอกรหัสผ่าน"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary auth-submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <LogIn size={18} />
              )}
              <span>{isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</span>
            </button>

            <p className="auth-switch-text">
              ยังไม่มีบัญชี?{' '}
              <button type="button" className="auth-switch-link" onClick={() => handleSwitchTab('register')}>
                สมัครสมาชิกเลย
                <ArrowRight size={14} />
              </button>
            </p>
          </form>
        )}

        {/* ── Register Form ── */}
        {activeTab === 'register' && (
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="auth-field">
              <label className="auth-label">
                <User size={14} />
                <span>ชื่อผู้ใช้</span>
              </label>
              <input
                type="text"
                className="custom-input auth-input"
                placeholder="ตั้งชื่อผู้ใช้ (อย่างน้อย 3 ตัวอักษร)"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                autoComplete="username"
                disabled={isLoading}
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">
                <Mail size={14} />
                <span>อีเมล</span>
              </label>
              <input
                type="email"
                className="custom-input auth-input"
                placeholder="example@email.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">
                <Lock size={14} />
                <span>รหัสผ่าน</span>
              </label>
              <div className="auth-password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="custom-input auth-input"
                  placeholder="ตั้งรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">
                <Shield size={14} />
                <span>ยืนยันรหัสผ่าน</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="custom-input auth-input"
                placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                value={regConfirm}
                onChange={(e) => setRegConfirm(e.target.value)}
                autoComplete="new-password"
                disabled={isLoading}
              />
            </div>

            <button type="submit" className="btn-primary auth-submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <UserPlus size={18} />
              )}
              <span>{isLoading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}</span>
            </button>

            <p className="auth-switch-text">
              มีบัญชีอยู่แล้ว?{' '}
              <button type="button" className="auth-switch-link" onClick={() => handleSwitchTab('login')}>
                เข้าสู่ระบบเลย
                <ArrowRight size={14} />
              </button>
            </p>
          </form>
        )}

        {/* Footer */}
        <div className="auth-footer">
          <span>FastAPI + Docker + Gemini AI</span>
        </div>
      </div>
    </div>
  );
}
