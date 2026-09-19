import React, { useState } from 'react';
import {
  X,
  KeyRound,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Sparkles,
  Shield
} from 'lucide-react';
import { changePassword } from '../services/authService';

export default function ChangePasswordModal({ isOpen, onClose, username }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setSavedSuccess(false);
    setShowOldPassword(false);
    setShowNewPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/\d/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strengthScore = getPasswordStrength(newPassword);
  const strengthLabels = ['รหัสผ่านสั้นเกินไป', 'พอใช้ (Weak)', 'ปานกลาง (Medium)', 'แข็งแกร่ง (Strong)', 'ปลอดภัยสูงมาก (Very Strong)'];
  const strengthColors = ['#ef4444', '#f87171', '#fbbf24', '#34d399', '#10b981'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setErrorMsg('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    if (oldPassword === newPassword) {
      setErrorMsg('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม');
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(username, oldPassword, newPassword);
      setSavedSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'การเปลี่ยนรหัสผ่านล้มเหลว');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="auth-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="auth-modal-close-btn" onClick={handleClose} title="ปิดหน้าต่าง">
          <X size={18} />
        </button>

        <div className="auth-container-styled">
          {/* Header */}
          <div className="auth-header-styled">
            <div className="auth-badge-icon" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' }}>
              <KeyRound size={24} color="#fff" />
            </div>
            <h2 className="auth-title-styled">เปลี่ยนรหัสผ่าน</h2>
            <p className="auth-subtitle-styled">
              สำหรับบัญชีผู้ใช้ <strong style={{ color: '#f8fafc' }}>{username || 'ผู้ใช้งาน'}</strong>
            </p>
          </div>

          {/* Alert Notification */}
          {errorMsg && (
            <div className="auth-alert auth-alert-error">
              <AlertCircle size={17} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="auth-alert auth-alert-success">
              <CheckCircle2 size={17} style={{ flexShrink: 0 }} />
              <span>เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว!</span>
            </div>
          )}

          <form className="auth-form-styled" onSubmit={handleSubmit}>
            {/* Old Password */}
            <div className="auth-input-group">
              <label className="auth-field-label">
                <Lock size={14} />
                <span>รหัสผ่านเดิม (Current Password)</span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  type={showOldPassword ? 'text' : 'password'}
                  className="auth-text-input"
                  placeholder="กรอกรหัสผ่านเดิมของคุณ"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  disabled={isLoading || savedSuccess}
                  required
                />
                <button
                  type="button"
                  className="auth-toggle-pwd-btn"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  tabIndex={-1}
                >
                  {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="auth-input-group">
              <label className="auth-field-label">
                <KeyRound size={14} />
                <span>รหัสผ่านใหม่ (New Password)</span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="auth-text-input"
                  placeholder="ตั้งรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading || savedSuccess}
                  required
                />
                <button
                  type="button"
                  className="auth-toggle-pwd-btn"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {newPassword && (
                <div style={{ marginTop: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: strengthColors[strengthScore], marginBottom: '3px' }}>
                    <span>ระดับความปลอดภัย:</span>
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

            {/* Confirm New Password */}
            <div className="auth-input-group">
              <label className="auth-field-label">
                <ShieldCheck size={14} />
                <span>ยืนยันรหัสผ่านใหม่อีกครั้ง</span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="auth-text-input"
                  placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading || savedSuccess}
                  required
                />
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.8rem' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1, padding: '0.8rem', justifyContent: 'center' }}
                onClick={handleClose}
                disabled={isLoading}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="auth-submit-btn"
                style={{ flex: 2, margin: 0 }}
                disabled={isLoading || savedSuccess}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="spinner" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : savedSuccess ? (
                  <>
                    <CheckCircle2 size={18} />
                    <span>สำเร็จเรียบร้อย!</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={18} />
                    <span>บันทึกรหัสผ่านใหม่</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security note badge */}
          <div className="auth-security-badge">
            <Shield size={13} color="#10b981" />
            <span>รหัสผ่านใหม่จะถูกเข้ารหัส SHA-256 ทันที</span>
          </div>
        </div>
      </div>
    </div>
  );
}
