import React, { useState, useRef, useEffect } from 'react';
import { User, ChevronDown, KeyRound, LogOut, Zap, Crown } from 'lucide-react';

export default function UserMenu({ username, onChangePassword, onLogout, isPro, onTogglePro }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (action) => {
    setIsOpen(false);
    action();
  };

  // Generate avatar initials
  const initials = username ? username.charAt(0).toUpperCase() : '?';

  return (
    <div className="user-menu" ref={menuRef}>
      <button className="user-menu-trigger" onClick={() => setIsOpen(!isOpen)}>
        <div className="user-avatar" style={{ background: isPro ? '#F59E0B' : 'var(--primary)' }}>
          {initials}
        </div>
        <span className="user-menu-name">{username}</span>
        <ChevronDown size={14} className={`user-menu-chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="user-menu-info">
            <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.85rem', background: isPro ? '#F59E0B' : 'var(--primary)' }}>
              {initials}
            </div>
            <div>
              <div className="user-menu-info-name">{username}</div>
              <div className="user-menu-info-role" style={{ color: isPro ? '#D97706' : '#2563EB', fontWeight: 600 }}>
                {isPro ? '👑 สมาชิก Pro Unlimited' : '⚡ สมาชิก Free Tier'}
              </div>
            </div>
          </div>
          <div className="user-menu-divider" />
          
          {onTogglePro && (
            <button
              className="user-menu-item"
              onClick={() => handleItemClick(onTogglePro)}
              style={{ color: isPro ? '#2563EB' : '#D97706', fontWeight: 600 }}
            >
              {isPro ? <Zap size={15} color="#2563EB" /> : <Crown size={15} color="#D97706" />}
              <span>{isPro ? 'สลับเป็นโหมด Free' : 'สลับเป็นโหมด Pro'}</span>
            </button>
          )}

          <button
            className="user-menu-item"
            onClick={() => handleItemClick(onChangePassword)}
          >
            <KeyRound size={15} />
            <span>เปลี่ยนรหัสผ่าน</span>
          </button>
          <button
            className="user-menu-item user-menu-item-danger"
            onClick={() => handleItemClick(onLogout)}
          >
            <LogOut size={15} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      )}
    </div>
  );
}
