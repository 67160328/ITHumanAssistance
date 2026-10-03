import React from 'react';
import { Crown, Sparkles, Clock, Zap } from 'lucide-react';

export default function QuotaBadge({ quotaStatus, onOpenSubscription }) {
  if (!quotaStatus) return null;

  const isPro = quotaStatus.tier === 'pro';

  if (isPro) {
    return (
      <div 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2))',
          border: '1px solid rgba(245, 158, 11, 0.45)',
          color: '#fbbf24',
          padding: '4px 10px',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: 'pointer'
        }}
        onClick={onOpenSubscription}
        title="สมาชิก Pro: ใช้งาน Token ไม่จำกัด"
      >
        <Crown size={14} color="#f59e0b" />
        <span>PRO UNLIMITED</span>
      </div>
    );
  }

  const limit = quotaStatus.quota_limit || 5;
  const used = quotaStatus.quota_used || 0;
  const remaining = Math.max(0, limit - used);
  const isExhausted = !quotaStatus.allowed || remaining === 0;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      <div 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: isExhausted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
          border: `1px solid ${isExhausted ? 'rgba(239, 68, 68, 0.4)' : 'rgba(99, 102, 241, 0.3)'}`,
          color: isExhausted ? '#f87171' : '#c7d2fe',
          padding: '4px 10px',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 500
        }}
      >
        {isExhausted ? (
          <>
            <Clock size={13} color="#ef4444" />
            <span>โควต้าหมด (รอ {quotaStatus.formatted_wait_time || 'อีกสักครู่'})</span>
          </>
        ) : (
          <>
            <Zap size={13} color="#a5b4fc" />
            <span>โควต้าฟรี: <strong>{remaining}/{limit} ครั้ง</strong></span>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenSubscription}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          border: 'none',
          color: '#ffffff',
          padding: '3px 8px',
          borderRadius: '6px',
          fontSize: '0.72rem',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
        }}
      >
        <Sparkles size={12} />
        <span>อัปเกรด Pro</span>
      </button>
    </div>
  );
}
