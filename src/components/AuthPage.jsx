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
  CheckCircle2,
  Loader2,
  ArrowRight,
  Shield,
  ShieldCheck,
  Zap,
  KeyRound
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
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
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

  // Quick Demo Account Helper
  const handleQuickDemo = () => {
    setLoginUsername('demo_developer');
    setLoginPassword('DevPass123!');
    clearMessages();
  };

  // Calculate Password Strength (0 to 4)
  const getPasswordStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/\d/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strengthScore = getPasswordStrength(regPassword);
  const strengthLabels = ['รหัสผ่านสั้นเกินไป', 'พอใช้ (Weak)', 'ปานกลาง (Medium)', 'แข็งแกร่ง (Strong)', 'ปลอดภัยสูงมาก (Very Strong)'];
  const strengthColors = ['#ef4444', '#f87171', '#fbbf24', '#34d399', '#10b981'];

  // ── Login Handler ──
  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!loginUsername.trim() || !loginPassword.trim()) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(loginUsername.trim(), loginPassword);
      if (onLoginSuccess) {
        onLoginSuccess(result.username, result.token);
      }
    } catch (err) {
      setErrorMsg(err.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Register Handler ──
  const handleRegister = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!regUsername.trim() || !regEmail.trim() || !regPassword || !regConfirm) {
      setErrorMsg('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }
    if (regUsername.trim().length < 3) {
      setErrorMsg('ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(regEmail)) {
      setErrorMsg('รูปแบบอีเมลไม่ถูกต้อง (เช่น user@company.com)');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (regPassword !== regConfirm) {
      setErrorMsg('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsLoading(true);
    try {
      await register(regUsername.trim(), regEmail.trim(), regPassword);
      setSuccessMsg('สมัครสมาชิกสำเร็จเรียบร้อย! กำลังสลับไปยังหน้าเข้าสู่ระบบ...');
      setLoginUsername(regUsername.trim());
      setLoginPassword('');
      setTimeout(() => {
        setActiveTab('login');
        setSuccessMsg('');
      }, 1400);
    } catch (err) {
      setErrorMsg(err.message || 'การสมัครสมาชิกล้มเหลว กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container-styled">
      {/* Brand Header */}
      <div className="auth-header-styled">
        <div className="auth-badge-icon">
          <Sparkles size={24} color="#fff" />
        </div>
        <h2 className="auth-title-styled">
          {activeTab === 'login' ? 'เข้าสู่ระบบองค์กร' : 'สร้างบัญชีผู้ใช้งานใหม่'}
        </h2>
        <p className="auth-subtitle-styled">
          {activeTab === 'login'
            ? 'เข้าสู่ระบบ IT-to-Human Translator เพื่อเข้าถึง Knowledge Base & API'
            : 'ลงทะเบียนเพื่อเริ่มต้นใช้งานระบบแปลภาษาไอทีและ Enterprise RAG'}
        </p>
      </div>

      {/* Pill Tab Switcher */}
      <div className="auth-pill-tabs">
        <button
          type="button"
          className={`auth-pill-tab ${activeTab === 'login' ? 'active' : ''}`}
          onClick={() => handleSwitchTab('login')}
        >
          <LogIn size={15} />
          <span>เข้าสู่ระบบ (Login)</span>
        </button>
        <button
          type="button"
          className={`auth-pill-tab ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => handleSwitchTab('register')}
        >
          <UserPlus size={15} />
          <span>สมัครสมาชิก (Register)</span>
        </button>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="auth-alert auth-alert-error">
          <AlertCircle size={17} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="auth-alert auth-alert-success">
          <CheckCircle2 size={17} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ─── TAB 1: LOGIN FORM ─── */}
      {activeTab === 'login' && (
        <form className="auth-form-styled" onSubmit={handleLogin}>
          {/* Quick Demo Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.2rem' }}>
            <button
              type="button"
              className="quick-demo-btn"
              onClick={handleQuickDemo}
              title="กรอกบัญชีทดสอบอัตโนมัติ"
            >
              <Zap size={13} />
              <span>กรอกข้อมูลบัญชีทดสอบด่วน</span>
            </button>
          </div>

          {/* Username Field */}
          <div className="auth-input-group">
            <label className="auth-field-label">
              <User size={14} />
              <span>ชื่อผู้ใช้ (Username)</span>
            </label>
            <div className="auth-input-wrapper">
              <input
                type="text"
                className="auth-text-input"
                placeholder="กรอกชื่อผู้ใช้ของคุณ"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                autoComplete="username"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="auth-input-group">
            <label className="auth-field-label">
              <Lock size={14} />
              <span>รหัสผ่าน (Password)</span>
            </label>
            <div className="auth-input-wrapper">
              <input
                type={showLoginPassword ? 'text' : 'password'}
                className="auth-text-input"
                placeholder="กรอกรหัสผ่านของคุณ"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                autoComplete="current-password"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="auth-toggle-pwd-btn"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                tabIndex={-1}
              >
                {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>กำลังเข้าสู่ระบบ...</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>เข้าสู่ระบบ</span>
              </>
            )}
          </button>

          {/* Footer Switch */}
          <div className="auth-footer-styled">
            <span>ยังไม่มีบัญชีใช้งาน?</span>
            <button
              type="button"
              className="auth-link-btn"
              onClick={() => handleSwitchTab('register')}
            >
              สมัครสมาชิกใหม่
              <ArrowRight size={13} />
            </button>
          </div>
        </form>
      )}

      {/* ─── TAB 2: REGISTER FORM ─── */}
      {activeTab === 'register' && (
        <form className="auth-form-styled" onSubmit={handleRegister}>
          {/* Username */}
          <div className="auth-input-group">
            <label className="auth-field-label">
              <User size={14} />
              <span>ชื่อผู้ใช้ที่ต้องการ (Username)</span>
            </label>
            <div className="auth-input-wrapper">
              <input
                type="text"
                className="auth-text-input"
                placeholder="อย่างน้อย 3 ตัวอักษร เช่น dev_somchai"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                autoComplete="username"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="auth-input-group">
            <label className="auth-field-label">
              <Mail size={14} />
              <span>อีเมลองค์กร / อีเมลส่วนตัว (Email)</span>
            </label>
            <div className="auth-input-wrapper">
              <input
                type="email"
                className="auth-text-input"
                placeholder="example@company.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                autoComplete="email"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="auth-input-group">
            <label className="auth-field-label">
              <Lock size={14} />
              <span>รหัสผ่าน (Password)</span>
            </label>
            <div className="auth-input-wrapper">
              <input
                type={showRegPassword ? 'text' : 'password'}
                className="auth-text-input"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                autoComplete="new-password"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="auth-toggle-pwd-btn"
                onClick={() => setShowRegPassword(!showRegPassword)}
                tabIndex={-1}
              >
                {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Password Strength Meter */}
            {regPassword && (
              <div style={{ marginTop: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: strengthColors[strengthScore], marginBottom: '3px' }}>
                  <span>ความปลอดภัยของรหัสผ่าน:</span>
                  <span style={{ fontWeight: 600 }}>{strengthLabels[strengthScore]}</span>
                </div>
                <div style={{
                  height: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  display: 'flex'
                }}>
                  <div style={{
                    width: `${(strengthScore / 4) * 100}%`,
                    backgroundColor: strengthColors[strengthScore],
                    transition: 'all 0.3s ease'
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="auth-input-group">
            <label className="auth-field-label">
              <ShieldCheck size={14} />
              <span>ยืนยันรหัสผ่านอีกครั้ง (Confirm Password)</span>
            </label>
            <div className="auth-input-wrapper">
              <input
                type={showRegPassword ? 'text' : 'password'}
                className="auth-text-input"
                placeholder="พิมพ์รหัสผ่านเดิมซ้ำอีกครั้ง"
                value={regConfirm}
                onChange={(e) => setRegConfirm(e.target.value)}
                autoComplete="new-password"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>กำลังสร้างบัญชีผู้ใช้...</span>
              </>
            ) : (
              <>
                <UserPlus size={18} />
                <span>สมัครสมาชิก</span>
              </>
            )}
          </button>

          {/* Footer Switch */}
          <div className="auth-footer-styled">
            <span>มีบัญชีผู้ใช้งานอยู่แล้ว?</span>
            <button
              type="button"
              className="auth-link-btn"
              onClick={() => handleSwitchTab('login')}
            >
              เข้าสู่ระบบเลย
              <ArrowRight size={13} />
            </button>
          </div>
        </form>
      )}

      {/* Security note badge */}
      <div className="auth-security-badge">
        <Shield size={13} color="#10b981" />
        <span>ระบบใช้ SHA-256 Password Hashing & Secure Token Session</span>
      </div>
    </div>
  );
}
