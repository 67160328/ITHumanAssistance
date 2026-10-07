import React, { useState, useEffect } from 'react';
import { PRESETS } from './data/presets';
import { TECH_STACK_PRESETS } from './data/techStackPresets';
import { translateText, getStoredApiKey } from './services/translator';
import { getUser, logout } from './services/authService';
import { getDocuments } from './services/documentService';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import ChangePasswordModal from './components/ChangePasswordModal';
import UserMenu from './components/UserMenu';
import KnowledgeBaseModal from './components/KnowledgeBaseModal';
import ImpactAnalysisCard from './components/ImpactAnalysisCard';
import TelegramModal from './components/TelegramModal';
import SubscriptionModal from './components/SubscriptionModal';
import QuotaBadge from './components/QuotaBadge';
import { getQuotaStatus, consumeLocalQuota, isProUser, setLocalTier } from './services/quotaService';
import { 
  downloadMarkdownFile, 
  exportToPDF, 
  generateJiraFormat, 
  downloadOpenAPIJson, 
  generateClientEmailDraft 
} from './utils/exportUtils';
import {
  Sparkles,
  ArrowRightLeft,
  UserCheck,
  Cpu,
  Copy,
  Check,
  HelpCircle,
  AlertTriangle,
  Clock,
  Layers,
  MessageSquareText,
  RotateCcw,
  Settings,
  Bot,
  Loader2,
  FileCode2,
  FileText,
  Printer,
  Mail,
  ShieldCheck,
  Database,
  User,
  Send,
  Zap,
  Palette
} from 'lucide-react';

export default function App() {
  // Theme state: fixed to clean 'blue' (ฟ้า-ขาว)
  const [currentTheme, setCurrentTheme] = useState('blue');

  const [mode, setMode] = useState('human-to-tech'); // 'human-to-tech' | 'tech-to-human'
  const [inputText, setInputText] = useState('');
  const [projectContext, setProjectContext] = useState('');
  const [budgetLevel, setBudgetLevel] = useState('');
  const [timelineConstraint, setTimelineConstraint] = useState('');
  
  // Enterprise Controls
  const [useRag, setUseRag] = useState(true);
  const [sanitizePii, setSanitizePii] = useState(true);
  const [securityMode, setSecurityMode] = useState('cloud'); // 'cloud' | 'private-local'

  // Results & UI states
  const [translationResult, setTranslationResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState('login'); // 'login' | 'register'
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [quotaStatus, setQuotaStatus] = useState(null);
  const [isPro, setIsPro] = useState(() => isProUser());
  
  // Auth & Knowledge state
  const [currentUser, setCurrentUser] = useState(getUser());
  const [docCount, setDocCount] = useState(2);
  const [currentApiKey, setCurrentApiKey] = useState(getStoredApiKey());

  // Apply Theme Attribute to HTML root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('it_translator_theme', currentTheme);
  }, [currentTheme]);

  const refreshQuota = async (user = currentUser) => {
    try {
      const q = await getQuotaStatus(user);
      setQuotaStatus(q);
      setIsPro(isProUser(user));
    } catch (e) {}
  };

  useEffect(() => {
    getDocuments().then(docs => {
      if (docs && docs.length) setDocCount(docs.length);
    }).catch(() => {});
    refreshQuota();
  }, [currentUser]);

  const currentPresets = mode === 'human-to-tech' ? PRESETS.humanToTech : PRESETS.techToHuman;

  // Free Tier input length limit (e.g. 350 chars)
  const FREE_TIER_MAX_CHARS = 350;

  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    // 1. Check Context length limit for Free tier
    if (!isPro && inputText.trim().length > FREE_TIER_MAX_CHARS) {
      showToast(`โหมดฟรีจำกัดข้อความไม่เกิน ${FREE_TIER_MAX_CHARS} ตัวอักษร (ปัจจุบัน ${inputText.trim().length} ตัวอักษร) กรุณาย่อข้อความหรืออัปเกรด Pro`);
      setIsSubscriptionOpen(true);
      return;
    }

    // 2. Check quota before translating
    const currentQ = await getQuotaStatus(currentUser);
    if (!currentQ.allowed) {
      setIsSubscriptionOpen(true);
      showToast(`โควต้าฟรีของคุณหมดแล้ว (รออีก ${currentQ.formatted_wait_time || 'สักครู่'}) หรืออัปเกรดเป็น Pro`);
      return;
    }

    setIsLoading(true);
    try {
      const result = await translateText(
        inputText,
        mode,
        currentApiKey,
        projectContext,
        budgetLevel,
        timelineConstraint,
        useRag,
        sanitizePii,
        securityMode,
        currentUser
      );
      setTranslationResult(result);
      consumeLocalQuota();
      refreshQuota();
    } catch (err) {
      if (err.isQuotaExceeded) {
        setIsSubscriptionOpen(true);
        showToast(err.message);
      } else {
        showToast('การแปลภาษาล้มเหลว: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = async (preset) => {
    setInputText(preset.input);
    const currentQ = await getQuotaStatus(currentUser);
    if (!currentQ.allowed) {
      setIsSubscriptionOpen(true);
      showToast(`โควต้าฟรีหมดแล้ว (รออีก ${currentQ.formatted_wait_time || 'สักครู่'})`);
      return;
    }

    setIsLoading(true);
    try {
      const result = await translateText(
        preset.input,
        mode,
        currentApiKey,
        projectContext,
        budgetLevel,
        timelineConstraint,
        useRag,
        sanitizePii,
        securityMode,
        currentUser
      );
      setTranslationResult(result);
      consumeLocalQuota();
      refreshQuota();
    } catch (err) {
      if (err.isQuotaExceeded) {
        setIsSubscriptionOpen(true);
        showToast(err.message);
      } else {
        showToast('การแปลภาษาล้มเหลว: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchMode = (newMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setInputText('');
    setTranslationResult(null);
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    showToast('ออกจากระบบเรียบร้อยแล้ว');
  };

  const handleCopyOutput = () => {
    if (!translationResult) return;
    let formattedText = '';
    const { data } = translationResult;

    if (mode === 'human-to-tech') {
      formattedText = `📌 [ความต้องการหลัก]\n${data.summary}\n\n⚙️ [ข้อกำหนดทางเทคนิค (Technical Requirements)]\n` +
        data.technicalRequirements.map(req => `• ${req}`).join('\n') +
        `\n\n🛠️ [แนะนำ Tech Stack]\n` +
        data.techStack.map(ts => `• ${ts.name}: ${ts.desc}`).join('\n') +
        `\n\n⚠️ [ข้อควรระวัง / ความเสี่ยง]\n` +
        data.riskAnalysis?.map(r => `• ${r}`).join('\n') +
        `\n\n❓ [คำถามที่ควรถามลูกค้าเพิ่ม]\n` +
        data.suggestedQuestions?.map(q => `• ${q}`).join('\n');

      if (data.effortEstimation) {
        formattedText += `\n\n⏱️ [การประเมินระยะเวลาและงบประมาณ (Effort Estimation)]\n` +
          `• ความซับซ้อน: ${data.effortEstimation.complexity}\n` +
          `• ระยะเวลาทำงาน: ${data.effortEstimation.estimatedManDays}\n` +
          `• งบประมาณโดยประมาณ: ${data.effortEstimation.estimatedCostRange}\n` +
          `• เหตุผล: ${data.effortEstimation.reasoning}`;
      }

      if (data.impactAnalysis) {
        formattedText += `\n\n🏢 [วิเคราะห์ผลกระทบต่อระบบเดิม (Impact Analysis)]\n` +
          `• โมดูลเดิมที่กระทบ: ${data.impactAnalysis.affectedModules?.join(', ') || 'ไม่มี'}\n` +
          `• ตารางเดิมที่กระทบ: ${data.impactAnalysis.affectedTables?.join(', ') || 'ไม่มี'}\n` +
          `• เวลา Refactoring: ${data.impactAnalysis.refactoringEffortDays}`;
      }
    } else {
      formattedText = `✉️ [คำอธิบายสำหรับส่งลูกค้า]\n${data.politeExplanation}\n\n💡 [เปรียบเสมือน]\n${data.analogy?.title || ''}\n${data.analogy?.description || ''}\n\n📌 [ผลกระทบต่อผู้ใช้งาน]\n${data.impact}\n\n⏱️ [ระยะเวลาแก้ไขโดยประมาณ]\n${data.estimatedTime}`;
    }

    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    showToast('คัดลอกข้อความแปลสำเร็จแล้ว!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJira = () => {
    if (!translationResult) return;
    const jiraMarkdown = generateJiraFormat(translationResult);
    navigator.clipboard.writeText(jiraMarkdown);
    showToast('คัดลอกรูปแบบ Jira Format สำเร็จ!');
  };

  const handleExportMarkdown = () => {
    if (!translationResult) return;
    downloadMarkdownFile(translationResult);
    showToast('ดาวน์โหลดไฟล์ Markdown (.md) สำเร็จ!');
  };

  const handleExportPDF = () => {
    if (!translationResult) return;
    exportToPDF(translationResult);
    showToast('เปิดหน้าต่าง พิมพ์ / บันทึก PDF สำเร็จ!');
  };

  const handleExportOpenAPI = () => {
    if (!translationResult) return;
    downloadOpenAPIJson(translationResult);
    showToast('ดาวน์โหลดไฟล์ OpenAPI 3.0 Spec (.json) สำเร็จ!');
  };

  const handleExportClientEmail = () => {
    if (!translationResult) return;
    const emailDraft = generateClientEmailDraft(translationResult);
    navigator.clipboard.writeText(emailDraft);
    showToast('คัดลอกร่างอีเมลส่งลูกค้า สำเร็จ!');
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <div className="app-container">
      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={(newKey) => {
          setCurrentApiKey(newKey);
          showToast('บันทึก Gemini API Key เรียบร้อยแล้ว!');
        }}
      />

      {/* Auth Modal (Login / Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialTab={authInitialTab}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(username) => {
          setCurrentUser(username);
          refreshQuota(username);
          showToast(`ยินดีต้อนรับคุณ ${username} เข้าสู่ระบบ!`);
        }}
      />

      {/* Subscription & Quota Upgrade Modal */}
      <SubscriptionModal
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
        currentUser={currentUser}
        remainingTimeText={quotaStatus?.formatted_wait_time}
        onUpgradeSuccess={(res) => {
          showToast(res.message || 'ยินดีต้อนรับสู่สมาชิก Pro Plan!');
          refreshQuota();
        }}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        username={currentUser}
      />

      {/* Knowledge Base Modal */}
      <KnowledgeBaseModal
        isOpen={isKnowledgeBaseOpen}
        onClose={() => setIsKnowledgeBaseOpen(false)}
        onDocumentsUpdated={(count) => setDocCount(count)}
      />

      {/* Telegram Modal */}
      <TelegramModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        translationResult={translationResult}
        onSentSuccess={(msg) => showToast(msg || 'ส่งเข้า Telegram สำเร็จแล้ว!')}
      />

      {/* TOP EXECUTIVE NAVBAR (สะอาดตา เป็นระเบียบ ไม่รก) */}
      <header className="top-navbar">
        <div className="nav-brand">
          <div className="brand-icon">
            <Sparkles size={20} />
          </div>
          <div className="brand-title-wrap">
            <span className="brand-title">IT-to-Human Translator</span>
            <span className="brand-badge">Enterprise Assistance Platform</span>
          </div>
        </div>

        {/* Right Nav Utilities */}
        <div className="nav-actions">
          {/* Active Palette Badge: ฟ้า-ขาว (Ocean Tech & Crisp White) */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-accent-soft)',
            border: '1px solid var(--brand-pill-border)',
            borderRadius: '9999px',
            padding: '4px 12px',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--primary)',
            fontFamily: 'var(--font-thai)'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#2563EB',
              display: 'inline-block',
              boxShadow: '0 0 6px rgba(37, 99, 235, 0.4)'
            }}></span>
            <span>ธีมฟ้า-ขาว (Ocean Tech)</span>
          </div>

          {/* Quick Demo Switcher & Mode Indicator (สังเกตสถานะปัจจุบันได้ชัดเจน) */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: isPro ? '#FFFBEB' : '#F8FAFC',
            border: `1px solid ${isPro ? '#FDE68A' : 'var(--border-medium)'}`,
            padding: '3px 8px 3px 10px',
            borderRadius: '9999px'
          }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>สถานะ:</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 700,
              fontSize: '0.76rem',
              color: isPro ? '#D97706' : '#2563EB'
            }}>
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: isPro ? '#D97706' : '#2563EB',
                display: 'inline-block'
              }}></span>
              {isPro ? '👑 โหมด PRO' : '⚡ โหมดฟรี'}
            </span>

            {/* ปุ่มกดสลับ */}
            <button
              type="button"
              style={{
                backgroundColor: isPro ? '#F59E0B' : '#2563EB',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                padding: '3px 9px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-thai)',
                marginLeft: '4px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
              onClick={() => {
                const nextPro = !isPro;
                setLocalTier(nextPro ? 'pro' : 'free');
                setIsPro(nextPro);
                if (nextPro) {
                  showToast('👑 สลับเป็นโหมด Pro Unlimited (ไม่จำกัดความยาว)');
                } else {
                  showToast('⚡ สลับเป็นโหมด Free Tier (จำกัด ≤ 350 ตัวอักษร)');
                }
                refreshQuota();
              }}
              title="คลิกเพื่อสลับระหว่างโหมด Free และ Pro"
            >
              {isPro ? 'คลิกเปลี่ยนเป็น Free' : 'คลิกเปลี่ยนเป็น Pro'}
            </button>
          </div>

          {/* Knowledge Base Button */}
          <button
            className="nav-btn"
            onClick={() => setIsKnowledgeBaseOpen(true)}
            title="จัดการคลังความรู้องค์กร"
          >
            <Database size={15} color="var(--primary)" />
            <span>Knowledge Base</span>
            <span style={{
              background: 'var(--bg-accent-soft)',
              color: 'var(--primary)',
              padding: '1px 6px',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 600
            }}>
              {docCount}
            </span>
          </button>

          {/* Settings / API Key */}
          <button 
            className="nav-btn" 
            onClick={() => setIsSettingsOpen(true)}
            title="ตั้งค่า Gemini API Key & Telegram"
          >
            <Bot size={15} color={currentApiKey ? 'var(--accent-emerald)' : 'var(--text-muted)'} />
            <span>{currentApiKey ? 'Gemini AI' : 'ตั้งค่า Key'}</span>
            <Settings size={13} style={{ opacity: 0.6 }} />
          </button>

          {/* User Auth (เข้าสู่ระบบ & สมัครสมาชิก) */}
          {currentUser ? (
            <UserMenu
              username={currentUser}
              isPro={isPro}
              onTogglePro={() => {
                const nextPro = !isPro;
                setLocalTier(nextPro ? 'pro' : 'free');
                setIsPro(nextPro);
                if (nextPro) {
                  showToast('👑 สลับเป็นโหมด Pro Unlimited (ไม่จำกัดความยาว)');
                } else {
                  showToast('⚡ สลับเป็นโหมด Free Tier (จำกัด ≤ 350 ตัวอักษร)');
                }
                refreshQuota();
              }}
              onChangePassword={() => setIsChangePasswordOpen(true)}
              onLogout={handleLogout}
            />
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                className="nav-btn"
                onClick={() => {
                  setAuthInitialTab('register');
                  setIsAuthModalOpen(true);
                }}
                style={{ borderColor: 'var(--border-medium)', color: 'var(--text-main)' }}
              >
                <span>สมัครสมาชิก</span>
              </button>
              <button
                className="nav-btn nav-btn-primary"
                onClick={() => {
                  setAuthInitialTab('login');
                  setIsAuthModalOpen(true);
                }}
              >
                <User size={14} />
                <span>เข้าสู่ระบบ</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* MODE SWITCHER (Segmented Bar) */}
      <div className="mode-container">
        <div className="mode-segmented-control">
          <button
            className={`mode-segment-btn ${mode === 'human-to-tech' ? 'active' : ''}`}
            onClick={() => handleSwitchMode('human-to-tech')}
          >
            <UserCheck size={16} />
            <span>[Human-to-Tech] แปลความต้องการลูกค้า ➔ Technical Specs</span>
          </button>
          <button
            className={`mode-segment-btn ${mode === 'tech-to-human' ? 'active' : ''}`}
            onClick={() => handleSwitchMode('tech-to-human')}
          >
            <Cpu size={16} />
            <span>[Tech-to-Human] แปลศัพท์เทคนิค ➔ ภาษาที่ลูกค้าเข้าใจ</span>
          </button>
        </div>
      </div>

      {/* 2-COLUMN MAIN WORKSPACE GRID */}
      <div className="main-grid">
        {/* LEFT COLUMN: Input & Settings Panel */}
        <div className="white-panel">
          <div className="panel-header">
            <div className="panel-title">
              <MessageSquareText size={18} color="var(--primary)" />
              <span>
                {mode === 'human-to-tech' ? 'ข้อความจากลูกค้า (Client Input)' : 'ปัญหาหรือศัพท์เทคนิค (Technical Input)'}
              </span>
            </div>
            {inputText && (
              <button
                className="btn-tool"
                onClick={() => {
                  setInputText('');
                  setTranslationResult(null);
                }}
              >
                <RotateCcw size={13} />
                <span>ล้างข้อมูล</span>
              </button>
            )}
          </div>

          {/* Quick Preset Scroller */}
          <div style={{ marginBottom: '0.85rem' }}>
            <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
              💡 ตัวอย่างทดสอบด่วน:
            </span>
            <div className="preset-scroller">
              {currentPresets.map((preset) => (
                <button
                  key={preset.id}
                  className="preset-chip-btn"
                  onClick={() => handleSelectPreset(preset)}
                >
                  <span>{preset.title}</span>
                  <Zap size={12} color="var(--primary)" />
                </button>
              ))}
            </div>
          </div>

          {/* Input Textarea */}
          <div className="form-section">
            <textarea
              className="clean-textarea"
              placeholder={
                mode === 'human-to-tech'
                  ? 'พิมพ์ความต้องการของลูกค้า เช่น "อยากได้ระบบแจ้งเตือนเข้า LINE เมื่อมีคนสั่งซื้อสินค้า และออกใบเสร็จรับเงินอัตโนมัติ"...'
                  : 'พิมพ์ปัญหาทางเทคนิค เช่น "ตอนนี้ Redis cache miss บ่อยมาก และพบ Memory leak ใน container ทำให้ API ตอบสนองช้ากว่า 4 วินาที"...'
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <div className="textarea-info-bar">
              <span style={{
                color: (!isPro && inputText.length > FREE_TIER_MAX_CHARS) ? '#DC2626' : undefined,
                fontWeight: (!isPro && inputText.length > FREE_TIER_MAX_CHARS) ? 700 : undefined
              }}>
                {inputText.length} {isPro ? 'ตัวอักษร (Pro ไม่จำกัด)' : `/ ${FREE_TIER_MAX_CHARS} ตัวอักษร (โหมดฟรี)`}
              </span>
              <span>{mode === 'human-to-tech' ? 'Non-Tech ➔ Tech Requirements' : 'Tech ➔ Friendly Explanation'}</span>
            </div>
          </div>

          {/* Project Context & Constraints */}
          <div className="context-panel">
            <div className="form-label">
              <span>🏢 บริบทและเทคโนโลยีเดิม (Tech Stack Context):</span>
            </div>
            <div className="pill-group">
              {TECH_STACK_PRESETS.map((tsPreset) => (
                <button
                  key={tsPreset.id}
                  type="button"
                  className={`selectable-pill ${projectContext === tsPreset.context ? 'active' : ''}`}
                  onClick={() => setProjectContext(projectContext === tsPreset.context ? '' : tsPreset.context)}
                >
                  {tsPreset.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="clean-input"
              placeholder="หรือระบุเอง เช่น React + Python FastAPI, PostgreSQL..."
              value={projectContext}
              onChange={(e) => setProjectContext(e.target.value)}
            />

            {/* Budget & Timeline Selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginTop: '0.65rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>
                  💰 ระดับงบประมาณ:
                </span>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {['งบประหยัด (Low)', 'งบปานกลาง (Medium)', 'องค์กร (Enterprise)'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      className={`selectable-pill ${budgetLevel === lvl ? 'active' : ''}`}
                      onClick={() => setBudgetLevel(budgetLevel === lvl ? '' : lvl)}
                    >
                      {lvl.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>
                  ⏱️ กรอบเวลาทำงาน:
                </span>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {['เร่งด่วน (<1 สัปดาห์)', 'ปกติ (1 เดือน)', 'ระยะยาว (3+ เดือน)'].map((tml) => (
                    <button
                      key={tml}
                      type="button"
                      className={`selectable-pill ${timelineConstraint === tml ? 'active' : ''}`}
                      onClick={() => setTimelineConstraint(timelineConstraint === tml ? '' : tml)}
                    >
                      {tml.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Security & RAG Controls Bar */}
          <div className="security-bar">
            <label className="checkbox-label" title="ดึงข้อมูลจากเอกสารใน Knowledge Base เพื่อใช้เป็นบริบทอ้างอิง">
              <input
                type="checkbox"
                checked={useRag}
                onChange={(e) => setUseRag(e.target.checked)}
              />
              <Database size={14} color="var(--primary)" />
              <span>ดึงความรู้ RAG</span>
            </label>

            <label className="checkbox-label" title="เซนเซอร์ข้อมูลสำคัญ เช่น อีเมล, เลขบัตร, รหัสผ่าน ก่อนส่งประมวลผล">
              <input
                type="checkbox"
                checked={sanitizePii}
                onChange={(e) => setSanitizePii(e.target.checked)}
              />
              <ShieldCheck size={14} color="var(--accent-emerald)" />
              <span>Mask ข้อมูลส่วนบุคคล (PII)</span>
            </label>

            <button
              type="button"
              className="btn-tool"
              onClick={() => setSecurityMode(securityMode === 'cloud' ? 'private-local' : 'cloud')}
              style={{ fontSize: '0.74rem' }}
            >
              {securityMode === 'cloud' ? '☁️ Cloud AI' : '🔒 On-Premise'}
            </button>
          </div>

          {/* Main Action Button */}
          <button 
            className="btn-primary-action" 
            onClick={handleTranslate} 
            disabled={isLoading || !inputText.trim()}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRightLeft size={18} />}
            <span>{isLoading ? 'กำลังประมวลผลการแปล...' : 'เริ่มแปลภาษา'}</span>
          </button>
        </div>

        {/* RIGHT COLUMN: Output Result Panel */}
        <div className="white-panel">
          <div className="panel-header">
            <div className="panel-title">
              <Sparkles size={18} color="var(--primary)" />
              <span>ผลลัพธ์การแปลภาษา</span>
            </div>

            {/* Export Toolbar */}
            {translationResult && (
              <div className="export-toolbar">
                <button className="btn-tool" onClick={handleCopyOutput} title="คัดลอกข้อความสรุป">
                  {copied ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
                  <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                </button>
                <button className="btn-tool" onClick={handleExportMarkdown} title="ดาวน์โหลดไฟล์ .md">
                  <FileText size={13} />
                  <span>Markdown</span>
                </button>
                <button className="btn-tool" onClick={handleExportPDF} title="พิมพ์ / บันทึก PDF">
                  <Printer size={13} />
                  <span>PDF</span>
                </button>
                {translationResult.mode === 'human-to-tech' && (
                  <>
                    <button className="btn-tool" onClick={handleExportJira} title="คัดลอก Jira Format">
                      <FileCode2 size={13} />
                      <span>Jira</span>
                    </button>
                    <button className="btn-tool" onClick={handleExportOpenAPI} title="ดาวน์โหลด OpenAPI JSON">
                      <span>OpenAPI</span>
                    </button>
                  </>
                )}
                {translationResult.mode === 'tech-to-human' && (
                  <button className="btn-tool" onClick={handleExportClientEmail} title="คัดลอกร่างอีเมลส่งลูกค้า">
                    <Mail size={13} />
                    <span>อีเมล</span>
                  </button>
                )}
                <button className="btn-tool" onClick={() => setIsTelegramModalOpen(true)} title="ส่งข้อมูลเข้า Telegram">
                  <Send size={13} />
                  <span>Telegram</span>
                </button>
              </div>
            )}
          </div>

          {/* Results Area */}
          {isLoading ? (
            <div className="output-empty-state">
              <Loader2 className="output-empty-icon animate-spin" color="var(--primary)" />
              <h4 style={{ color: 'var(--text-main)', marginBottom: '0.4rem', fontWeight: 600 }}>กำลังประมวลผล...</h4>
              <p style={{ fontSize: '0.85rem' }}>ระบบกำลังวิเคราะห์ความต้องการ ดึงเอกสาร RAG และสร้างผลลัพธ์มาตรฐาน</p>
            </div>
          ) : !translationResult ? (
            <div className="output-empty-state">
              <Layers className="output-empty-icon" />
              <h4 style={{ color: 'var(--text-main)', marginBottom: '0.4rem', fontWeight: 600 }}>ยังไม่มีผลลัพธ์การแปล</h4>
              <p style={{ fontSize: '0.85rem' }}>เลือกตัวอย่างทดสอบด่วนทางซ้าย หรือพิมพ์ข้อความแล้วกด "เริ่มแปลภาษา"</p>
            </div>
          ) : (
            <div>
              {/* Impact Analysis & RAG Context (Human-to-Tech Mode) */}
              {translationResult.mode === 'human-to-tech' && (
                <ImpactAnalysisCard
                  impactAnalysis={translationResult.data?.impactAnalysis}
                  ragSources={translationResult.ragSources}
                  maskedItems={translationResult.maskedItems}
                />
              )}

              {/* MODE 1: Human-to-Tech Output */}
              {translationResult.mode === 'human-to-tech' && (
                <div>
                  {/* Summary */}
                  <div className="result-section">
                    <div className="result-section-title">📌 สรุปเป้าหมายหลัก (Executive Summary)</div>
                    <p className="result-body-text">{translationResult.data.summary}</p>
                  </div>

                  {/* Technical Requirements */}
                  <div className="result-section">
                    <div className="result-section-title">⚙️ ข้อกำหนดทางเทคนิค (Technical Requirements)</div>
                    <ul className="clean-bullet-list">
                      {translationResult.data.technicalRequirements?.map((req, idx) => (
                        <li key={idx} className="clean-bullet-item">{req}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommended Tech Stack */}
                  <div className="result-section">
                    <div className="result-section-title">🛠️ แนะนำ Tech Stack & สถาปัตยกรรม</div>
                    <div className="tech-grid">
                      {translationResult.data.techStack?.map((ts, idx) => (
                        <div key={idx} className="tech-item-card">
                          <div className="tech-item-name">{ts.name}</div>
                          <div className="tech-item-desc">{ts.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Effort & Cost Estimation */}
                  {translationResult.data.effortEstimation && (
                    <div className="result-section">
                      <div className="result-section-title">
                        <Clock size={15} color="var(--accent-emerald)" />
                        <span>การประเมินระยะเวลาและงบประมาณ (Effort & Cost Estimation)</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', marginTop: '0.4rem' }}>
                        <div style={{ background: 'var(--bg-surface)', padding: '0.6rem', borderRadius: '7px', border: '1px solid var(--border-light)' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ความซับซ้อน:</span>
                          <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>
                            {translationResult.data.effortEstimation.complexity}
                          </div>
                        </div>
                        <div style={{ background: 'var(--bg-surface)', padding: '0.6rem', borderRadius: '7px', border: '1px solid var(--border-light)' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ระยะเวลา (Man-Days):</span>
                          <div style={{ fontWeight: 600, color: 'var(--accent-amber)', fontSize: '0.9rem' }}>
                            {translationResult.data.effortEstimation.estimatedManDays}
                          </div>
                        </div>
                        <div style={{ background: 'var(--bg-surface)', padding: '0.6rem', borderRadius: '7px', border: '1px solid var(--border-light)' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>งบประมาณโดยประมาณ:</span>
                          <div style={{ fontWeight: 600, color: 'var(--accent-emerald)', fontSize: '0.9rem' }}>
                            {translationResult.data.effortEstimation.estimatedCostRange}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Risk Analysis */}
                  {translationResult.data.riskAnalysis && translationResult.data.riskAnalysis.length > 0 && (
                    <div className="result-section" style={{ borderColor: '#FDE68A', background: '#FFFDF5' }}>
                      <div className="result-section-title" style={{ color: '#B45309' }}>
                        <AlertTriangle size={15} color="#D97706" />
                        <span>ข้อควรระวัง & ความเสี่ยงในโครงการ</span>
                      </div>
                      <ul className="clean-bullet-list">
                        {translationResult.data.riskAnalysis.map((r, idx) => (
                          <li key={idx} className="clean-bullet-item">{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggested Questions */}
                  {translationResult.data.suggestedQuestions && translationResult.data.suggestedQuestions.length > 0 && (
                    <div className="result-section">
                      <div className="result-section-title">
                        <HelpCircle size={15} color="var(--primary)" />
                        <span>คำถามที่ควรถามลูกค้าเพิ่มเติม</span>
                      </div>
                      <ul className="clean-bullet-list">
                        {translationResult.data.suggestedQuestions.map((q, idx) => (
                          <li key={idx} className="clean-bullet-item">{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* MODE 2: Tech-to-Human Output */}
              {translationResult.mode === 'tech-to-human' && (
                <div>
                  {/* Polite Explanation Box */}
                  <div className="polite-box">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                        <MessageSquareText size={16} />
                        <span>ข้อความสุภาพพร้อมส่งให้ลูกค้า:</span>
                      </div>
                      <button
                        className="btn-tool"
                        onClick={handleExportClientEmail}
                        style={{ background: '#FFFFFF', borderColor: '#86EFAC', color: '#166534' }}
                      >
                        <Mail size={12} />
                        <span>คัดลอกร่างอีเมล</span>
                      </button>
                    </div>
                    {translationResult.data.politeExplanation}
                  </div>

                  {/* Analogy Card */}
                  {translationResult.data.analogy && (
                    <div className="analogy-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '1.4rem' }}>{translationResult.data.analogy.icon || '💡'}</span>
                        <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>
                          {translationResult.data.analogy.title}
                        </strong>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', lineHeight: 1.6 }}>
                        {translationResult.data.analogy.description}
                      </p>
                    </div>
                  )}

                  {/* User Impact */}
                  <div className="result-section">
                    <div className="result-section-title">📌 ผลกระทบต่อผู้ใช้งาน (User Impact)</div>
                    <p className="result-body-text">{translationResult.data.impact}</p>
                  </div>

                  {/* Estimated Time */}
                  <div className="result-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="result-section-title" style={{ margin: 0 }}>
                      <Clock size={15} color="var(--accent-amber)" />
                      <span>ระยะเวลาแก้ไขโดยประมาณ</span>
                    </div>
                    <span style={{
                      background: 'var(--bg-accent-soft)',
                      color: 'var(--primary)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontWeight: 600,
                      fontSize: '0.85rem'
                    }}>
                      {translationResult.data.estimatedTime}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast">
          <Check size={16} color="var(--accent-emerald)" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
