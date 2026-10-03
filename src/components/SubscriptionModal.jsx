import React, { useState } from 'react';
import { 
  X, 
  Crown, 
  Check, 
  Zap, 
  Sparkles, 
  ShieldCheck, 
  Send, 
  Loader2, 
  CreditCard, 
  QrCode, 
  Clock,
  ArrowRight
} from 'lucide-react';
import { upgradeToPro } from '../services/quotaService';

export default function SubscriptionModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  remainingTimeText = null,
  onUpgradeSuccess 
}) {
  const [selectedPlan, setSelectedPlan] = useState('pro_monthly'); // 'pro_monthly' | 'pro_annual'
  const [paymentStep, setPaymentStep] = useState('select'); // 'select' | 'payment' | 'success'
  const [paymentMethod, setPaymentMethod] = useState('promptpay'); // 'promptpay' | 'card'
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    try {
      // Simulate payment processing time
      await new Promise(r => setTimeout(r, 1200));
      const res = await upgradeToPro(currentUser, paymentMethod);
      setPaymentStep('success');
      if (onUpgradeSuccess) {
        onUpgradeSuccess(res);
      }
      setTimeout(() => {
        onClose();
        setPaymentStep('select');
      }, 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content glass-panel" 
        style={{ maxWidth: '640px', padding: '1.75rem', position: 'relative' }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          className="btn-icon" 
          onClick={onClose} 
          style={{ position: 'absolute', right: '1rem', top: '1rem' }}
        >
          <X size={18} />
        </button>

        {paymentStep === 'select' && (
          <div>
            {/* Header Banner */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff',
                marginBottom: '0.8rem',
                boxShadow: '0 8px 20px -4px rgba(245, 158, 11, 0.4)'
              }}>
                <Crown size={26} />
              </div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.3rem' }}>
                ปลดล็อกการใช้งานไม่จำกัดด้วย Pro Plan
              </h2>
              {remainingTimeText ? (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#f87171',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  marginTop: '0.3rem'
                }}>
                  <Clock size={14} />
                  <span>โควต้าฟรีหมดแล้ว: ใช้งานได้อีกทีในอีก {remainingTimeText}</span>
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
                  เพิ่มประสิทธิภาพการแปลภาษาไอทีและวิเคราะห์สถาปัตยกรรมระดับองค์กรอย่างไร้ขีดจำกัด
                </p>
              )}
            </div>

            {/* Plans Comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              {/* Free Tier Card */}
              <div style={{
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(15, 23, 42, 0.4)',
                borderRadius: '12px',
                padding: '1.2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                    Free Tier
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', margin: '0.3rem 0' }}>
                    ฿0 <span style={{ fontSize: '0.8rem', color: '#64748b' }}>/ ตลอดชีพ</span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '1rem 0 0 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <Check size={14} color="#94a3b8" />
                      <span>5 ครั้ง ต่อรอบ 4 ชั่วโมง</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <Check size={14} color="#94a3b8" />
                      <span>แปล Human-to-Tech พื้นฐาน</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                      <X size={14} />
                      <span>จำกัดความเร็วเมื่อคนใช้งานเยอะ</span>
                    </li>
                  </ul>
                </div>
                <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
                  (แพ็กเกจปัจจุบัน)
                </div>
              </div>

              {/* Pro Plan Card */}
              <div 
                onClick={() => setSelectedPlan('pro_monthly')}
                style={{
                  border: '2px solid #f59e0b',
                  background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
                  borderRadius: '12px',
                  padding: '1.2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  cursor: 'pointer',
                  boxShadow: '0 0 25px rgba(245, 158, 11, 0.15)'
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '12px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  textTransform: 'uppercase'
                }}>
                  แนะนำ
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Sparkles size={14} /> Pro Unlimited
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', margin: '0.3rem 0' }}>
                    ฿299 <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>/ เดือน</span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '1rem 0 0 0', fontSize: '0.82rem', color: '#f1f5f9' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <Check size={14} color="#10b981" />
                      <strong>ใช้งานไม่จำกัด (Unlimited AI Tokens)</strong>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <Check size={14} color="#10b981" />
                      <span>ความเร็วประมวลผลสูงสุด (High Priority)</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <Check size={14} color="#10b981" />
                      <span>ส่งสรุปและ JSON เข้า Telegram ไม่อั้น</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Check size={14} color="#10b981" />
                      <span>RAG Corporate Knowledge Base เต็มรูปแบบ</span>
                    </li>
                  </ul>
                </div>
                <button 
                  className="btn-primary" 
                  onClick={() => setPaymentStep('payment')}
                  style={{
                    marginTop: '1.2rem',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    width: '100%',
                    justifyContent: 'center',
                    fontWeight: 600
                  }}
                >
                  <span>เลือกแพ็กเกจนี้</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {paymentStep === 'payment' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setPaymentStep('select')}
                style={{ padding: '4px 8px', fontSize: '0.78rem' }}
              >
                ← ย้อนกลับ
              </button>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc' }}>
                ชำระเงินเพื่อเปิดใช้งาน Pro Plan (฿299/เดือน)
              </h3>
            </div>

            {/* Payment Method Switcher */}
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.2rem' }}>
              <button
                type="button"
                onClick={() => setPaymentMethod('promptpay')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem',
                  borderRadius: '8px',
                  border: `1px solid ${paymentMethod === 'promptpay' ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)'}`,
                  background: paymentMethod === 'promptpay' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(15, 23, 42, 0.4)',
                  color: paymentMethod === 'promptpay' ? '#fbbf24' : '#94a3b8',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                <QrCode size={16} />
                <span>PromptPay QR Code</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem',
                  borderRadius: '8px',
                  border: `1px solid ${paymentMethod === 'card' ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)'}`,
                  background: paymentMethod === 'card' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(15, 23, 42, 0.4)',
                  color: paymentMethod === 'card' ? '#fbbf24' : '#94a3b8',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                <CreditCard size={16} />
                <span>บัตรเครดิต / เดบิต</span>
              </button>
            </div>

            {/* PromptPay Mockup */}
            {paymentMethod === 'promptpay' ? (
              <div style={{
                background: '#ffffff',
                padding: '1.2rem',
                borderRadius: '12px',
                textAlign: 'center',
                color: '#1e293b',
                marginBottom: '1.2rem'
              }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: '0.2rem' }}>
                  สแกนชำระเงินผ่านแอปธนาคาร
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.8rem' }}>
                  ยอดชำระ: <strong>299.00 บาท</strong> (อัปเกรดทันทีหลังยืนยัน)
                </div>
                {/* Simulated QR Code Graphic */}
                <div style={{
                  display: 'inline-block',
                  padding: '12px',
                  border: '2px dashed #94a3b8',
                  borderRadius: '8px',
                  background: '#f8fafc'
                }}>
                  <QrCode size={130} color="#0f172a" />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.6rem' }}>
                  ระบบจะตรวจจับการชำระเงินอัตโนมัติภายในไม่กี่วินาที
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '1.2rem' }}>
                <div style={{ marginBottom: '0.8rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                    หมายเลขบัตร:
                  </label>
                  <input type="text" className="custom-input" placeholder="4123 4567 8901 2345" defaultValue="4123 •••• •••• 9876" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                      วันหมดอายุ (MM/YY):
                    </label>
                    <input type="text" className="custom-input" placeholder="12/28" defaultValue="12/28" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                      CVV:
                    </label>
                    <input type="password" className="custom-input" placeholder="123" defaultValue="888" />
                  </div>
                </div>
              </div>
            )}

            <button 
              className="btn-primary" 
              onClick={handleConfirmPayment}
              disabled={isProcessing}
              style={{
                width: '100%',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                padding: '0.75rem',
                fontSize: '0.95rem'
              }}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>กำลังตรวจสอบการชำระเงิน...</span>
                </>
              ) : (
                <>
                  <Check size={18} />
                  <span>ยืนยันการชำระเงินและเปิดใช้งาน Pro ทันที (จำลอง)</span>
                </>
              )}
            </button>
          </div>
        )}

        {paymentStep === 'success' && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              marginBottom: '1rem'
            }}>
              <Check size={32} />
            </div>
            <h3 style={{ fontSize: '1.3rem', color: '#f8fafc', marginBottom: '0.4rem' }}>
              อัปเกรดเป็นสมาชิก Pro สำเร็จ! 🌟
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              ปลดล็อกการใช้งาน Token ไม่จำกัดเรียบร้อยแล้ว คุณสามารถแปลภาษาต่อได้ทันที
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
