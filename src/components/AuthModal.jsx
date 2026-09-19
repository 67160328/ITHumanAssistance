import React from 'react';
import { X } from 'lucide-react';
import AuthPage from './AuthPage';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content glass-panel" 
        style={{ maxWidth: '460px', padding: '1.5rem', position: 'relative' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn-icon"
          style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}
          onClick={onClose}
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
