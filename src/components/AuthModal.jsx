import React from 'react';
import { X } from 'lucide-react';
import AuthPage from './AuthPage';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="auth-modal-dialog" 
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="auth-modal-close-btn"
          onClick={onClose}
          title="ปิดหน้าต่าง"
        >
          <X size={18} />
        </button>

        <AuthPage
          onLoginSuccess={(username, token) => {
            onLoginSuccess(username, token);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
