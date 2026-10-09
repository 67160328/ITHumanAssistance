import React from 'react';
import { Crown, Sparkles, Clock, Zap } from 'lucide-react';

export default function QuotaBadge({ quotaStatus, onOpenSubscription, onOpenTelegram }) {
  if (!quotaStatus) return null;

  const isPro = quotaStatus.tier === 'pro';

  if (isPro) {
    return (
      <div 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: '#FEF3C7',
          border: '1px solid #FDE68A',
          color: '#B45309',
          padding: '3px 10px',
          borderRadius: '9999px',
          fontSize: '0.74rem',
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'var(--font-thai)'
        }}
        onClick={onOpenSubscription}
        title="สมาชิก Pro: ใช้งานไม่จำกัด"
      >
        <Crown size={13} color="#D97706" />
        <span>PRO UNLIMITED</span>
      </div>
    );
  }

  const limit = quotaStatus.quota_limit || 5;
  const used = quotaStatus.quota_used || 0;
  const remaining = Math.max(0, limit - used);
  const isExhausted = !quotaStatus.allowed || remaining === 0;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
      <div 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: isExhausted ? '#FEF2F2' : 'var(--bg-accent-soft)',
          border: `1px solid ${isExhausted ? '#FECACA' : 'var(--brand-pill-border)'}`,
          color: isExhausted ? '#DC2626' : 'var(--primary)',
          padding: '3px 10px',
          borderRadius: '9999px',
          fontSize: '0.74rem',
          fontWeight: 600,
          fontFamily: 'var(--font-thai)'
        }}
      >
        {isExhausted ? (
          <>
            <Clock size={12} color="#DC2626" />
            <span>โควต้าหมด (รอ {quotaStatus.formatted_wait_time || 'สักครู่'})</span>
          </>
        ) : (
          <>
            <Zap size={12} color="var(--primary)" />
            <span>โควต้าฟรี: <strong>{remaining}/{limit} ครั้ง</strong></span>
          </>
        )}
      </div>

      {isExhausted && onOpenTelegram && (
        <button
          type="button"
          onClick={onOpenTelegram}
          title="รับการแจ้งเตือนทาง Telegram เมื่อโควต้ารีเซ็ตพร้อมใช้งาน"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            background: '#F0F9FF',
            border: '1px solid #BAE6FD',
            color: '#0284C7',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 600,
            fontFamily: 'var(--font-thai)',
            cursor: 'pointer'
          }}
        >
          <span>📲 แจ้งเตือน Telegram</span>
        </button>
      )}

      <button
        type="button"
        onClick={onOpenSubscription}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          background: 'linear-gradient(135deg, #F59E0B, #D97706)',
          border: 'none',
          color: '#ffffff',
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '0.72rem',
          fontWeight: 600,
          fontFamily: 'var(--font-thai)',
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(217, 119, 6, 0.25)'
        }}
      >
        <Sparkles size={12} />
        <span>อัปเกรด Pro</span>
      </button>
    </div>
  );
}
