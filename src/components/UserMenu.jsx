import React, { useState, useRef, useEffect } from 'react';
import { User, ChevronDown, KeyRound, LogOut } from 'lucide-react';

export default function UserMenu({ username, onChangePassword, onLogout }) {
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
        <div className="user-avatar">{initials}</div>
        <span className="user-menu-name">{username}</span>
        <ChevronDown size={14} className={`user-menu-chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="user-menu-info">
            <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>
              {initials}
            </div>
            <div>
              <div className="user-menu-info-name">{username}</div>
              <div className="user-menu-info-role">ผู้ใช้งานระบบ</div>
            </div>
          </div>
          <div className="user-menu-divider" />
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
