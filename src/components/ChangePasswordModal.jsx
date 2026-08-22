import React, { useState } from 'react';
import { X, KeyRound, Check, Lock, Shield, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { changePassword } from '../services/authService';

export default function ChangePasswordModal({ isOpen, onClose, username }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    setShowPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

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
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <KeyRound size={20} className="text-indigo-400" />
            <span>เปลี่ยนรหัสผ่าน</span>
          </div>
          <button className="btn-icon" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Error */}
          {errorMsg && (
            <div className="auth-message auth-error" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success */}
          {savedSuccess && (
            <div className="auth-message auth-success" style={{ marginBottom: '1rem' }}>
              <Check size={16} />
              <span>เปลี่ยนรหัสผ่านสำเร็จแล้ว!</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label">
                <Lock size={14} />
                <span>รหัสผ่านเดิม</span>
              </label>
              <div className="auth-password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="custom-input auth-input"
                  placeholder="กรอกรหัสผ่านเดิม"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  disabled={isLoading || savedSuccess}
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
                <KeyRound size={14} />
                <span>รหัสผ่านใหม่</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="custom-input auth-input"
                placeholder="ตั้งรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading || savedSuccess}
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">
                <Shield size={14} />
                <span>ยืนยันรหัสผ่านใหม่</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="custom-input auth-input"
                placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading || savedSuccess}
              />
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={handleClose} disabled={isLoading}>
                ยกเลิก
              </button>
              <button type="submit" className="btn-primary" disabled={isLoading || savedSuccess}>
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : savedSuccess ? (
                  <Check size={16} />
                ) : (
                  <KeyRound size={16} />
                )}
                <span>
                  {isLoading ? 'กำลังบันทึก...' : savedSuccess ? 'สำเร็จแล้ว!' : 'เปลี่ยนรหัสผ่าน'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
