import React, { useState, useEffect } from 'react';
import { PRESETS } from './data/presets';
import { TECH_STACK_PRESETS } from './data/techStackPresets';
import { translateText, getStoredApiKey } from './services/translator';
import { getUser, isLoggedIn, logout } from './services/authService';
import { getDocuments } from './services/documentService';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import ChangePasswordModal from './components/ChangePasswordModal';
import UserMenu from './components/UserMenu';
import KnowledgeBaseModal from './components/KnowledgeBaseModal';
import ImpactAnalysisCard from './components/ImpactAnalysisCard';
import { downloadMarkdownFile, exportToPDF, generateJiraFormat, downloadOpenAPIJson, generateClientEmailDraft } from './utils/exportUtils';
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
  Zap,
  Layers,
  MessageSquareText,
  RotateCcw,
  Settings,
  Bot,
  Loader2,
  FileCode2,
  Server,
  FileText,
  Printer,
  Mail,
  Shield,
  ShieldCheck,
  Database,
  User,
  Lock,
  Radio
} from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState('human-to-tech'); // 'human-to-tech' | 'tech-to-human'
  const [inputText, setInputText] = useState('');
  const [projectContext, setProjectContext] = useState('');
  const [budgetLevel, setBudgetLevel] = useState(''); // '', 'Low Budget', 'Medium Budget', 'Enterprise Budget'
  const [timelineConstraint, setTimelineConstraint] = useState(''); // '', 'Urgent (<1 week)', 'Standard (1 month)', 'Flexible'
  
  // Phase 2 Enterprise Controls
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
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);
  
  // Auth & Knowledge state
  const [currentUser, setCurrentUser] = useState(getUser());
  const [docCount, setDocCount] = useState(2);
  const [currentApiKey, setCurrentApiKey] = useState(getStoredApiKey());

  useEffect(() => {
    // Initial fetch of doc count
    getDocuments().then(docs => {
      if (docs && docs.length) setDocCount(docs.length);
    }).catch(() => {});
  }, []);

  const currentPresets = mode === 'human-to-tech' ? PRESETS.humanToTech : PRESETS.techToHuman;

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
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
        securityMode
      );
      setTranslationResult(result);
    } catch (err) {
      showToast('การแปลภาษาล้มเหลว: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = async (preset) => {
    setInputText(preset.input);
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
        securityMode
      );
      setTranslationResult(result);
    } catch (err) {
      showToast('การแปลภาษาล้มเหลว: ' + err.message);
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
    showToast('คัดลอกรูปแบบ Jira / Confluence Format สำเร็จ!');
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
    showToast('คัดลอกร่างอีเมลส่งลูกค้า (Client Email Draft) สำเร็จ!');
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
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
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(username) => {
          setCurrentUser(username);
          showToast(`ยินดีต้อนรับคุณ ${username} เข้าสู่ระบบ!`);
        }}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        username={currentUser}
      />

      {/* Corporate Knowledge Base Modal (RAG) */}
      <KnowledgeBaseModal
        isOpen={isKnowledgeBaseOpen}
        onClose={() => setIsKnowledgeBaseOpen(false)}
        onDocumentsUpdated={(count) => setDocCount(count)}
      />

      {/* Header */}
      <header className="app-header">
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div className="header-badge" style={{ margin: 0 }}>
            <Sparkles size={16} />
            <span>ระบบแปลภาษาไอทีอัจฉริยะ (Enterprise Edition)</span>
          </div>

          {/* Knowledge Base RAG Button */}
          <button
            className="settings-badge-btn"
            style={{ borderColor: 'rgba(99, 102, 241, 0.4)', background: 'rgba(99, 102, 241, 0.15)', color: '#c7d2fe' }}
            onClick={() => setIsKnowledgeBaseOpen(true)}
          >
            <Database size={14} color="#818cf8" />
            <span>Corporate Knowledge Base</span>
            <span style={{
              fontSize: '0.7rem',
              backgroundColor: '#6366f1',
              color: '#fff',
              padding: '1px 6px',
              borderRadius: '9999px',
              fontWeight: 600
            }}>
              {docCount} Docs (RAG)
            </span>
          </button>

          {/* FastAPI Swagger Link */}
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="settings-badge-btn"
            style={{ textDecoration: 'none' }}
          >
            <Server size={14} className="text-emerald-400" />
            <span>FastAPI Swagger (/docs)</span>
            <FileCode2 size={14} />
          </a>

          {/* Settings / API Key button */}
          <button className="settings-badge-btn" onClick={() => setIsSettingsOpen(true)}>
            {currentApiKey ? (
              <>
                <span className="status-dot online"></span>
                <Bot size={15} />
                <span>Google Gemini AI</span>
              </>
            ) : (
              <>
                <span className="status-dot offline"></span>
                <span>ตั้งค่า API Key</span>
              </>
            )}
            <Settings size={14} style={{ marginLeft: '4px' }} />
          </button>

          {/* User Auth Menu */}
          {currentUser ? (
            <UserMenu
              username={currentUser}
              onChangePassword={() => setIsChangePasswordOpen(true)}
              onLogout={handleLogout}
            />
          ) : (
            <button
              className="settings-badge-btn"
              style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399' }}
              onClick={() => setIsAuthModalOpen(true)}
            >
              <User size={14} />
              <span>เข้าสู่ระบบ / สมัครสมาชิก</span>
            </button>
          )}
        </div>

        <h1 className="header-title">IT-to-Human Translator</h1>
        <p className="header-subtitle">
          Enterprise AI Platform: เชื่อมช่องว่างระหว่าง Non-Tech และ Tech ด้วย RAG Corporate Knowledge Base, PII Sanitizer Guardrails, และ Legacy Impact Analysis
        </p>
      </header>

      {/* Mode Switcher */}
      <div className="mode-switcher-container">
        <div className="mode-switcher">
          <button
            className={`mode-btn ${mode === 'human-to-tech' ? 'active-h2t' : ''}`}
            onClick={() => handleSwitchMode('human-to-tech')}
          >
            <UserCheck size={18} />
            <span>[Human-to-Tech] แปลความต้องการลูกค้า</span>
          </button>
          <button
            className={`mode-btn ${mode === 'tech-to-human' ? 'active-t2h' : ''}`}
            onClick={() => handleSwitchMode('tech-to-human')}
          >
            <Cpu size={18} />
            <span>[Tech-to-Human] แปลศัพท์เทคนิคส่งลูกค้า</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="main-grid">
        {/* Left Column: Input Panel */}
        <div className="glass-panel">
          <div className="panel-title">
            <div className="panel-title-left">
              <MessageSquareText size={20} className="text-indigo-400" />
              <span>
                {mode === 'human-to-tech'
                  ? 'ข้อความจากลูกค้า (Non-Tech Input)'
                  : 'ปัญหา/ศัพท์เทคนิคจากทีมเกอ (Tech Input)'}
              </span>
            </div>
            {inputText && (
              <button
                className="btn-secondary"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                onClick={() => {
                  setInputText('');
                  setTranslationResult(null);
                }}
              >
                <RotateCcw size={14} />
                <span>ล้างข้อมูล</span>
              </button>
            )}
          </div>

          {/* Presets chips */}
          <div className="preset-chip-list">
            <span className="preset-chip-title">💡 ตัวอย่างเคสทดสอบ (Enterprise Context):</span>
            {currentPresets.map((preset) => (
              <div
                key={preset.id}
                className="preset-chip"
                onClick={() => handleSelectPreset(preset)}
              >
                <span>{preset.title}</span>
                <Zap size={14} opacity={0.6} />
              </div>
            ))}
          </div>

          {/* Project Context Field */}
          <div style={{ marginBottom: '0.8rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#94A3B8', marginBottom: '0.4rem', fontWeight: '500' }}>
              🏢 Project Context / Corporate Tech Stack:
            </label>

            {/* Quick Tech Stack Selector Chips */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              {TECH_STACK_PRESETS.map((tsPreset) => (
                <button
                  key={tsPreset.id}
                  type="button"
                  onClick={() => setProjectContext(tsPreset.context)}
                  style={{
                    background: projectContext === tsPreset.context ? 'rgba(99, 102, 241, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                    border: projectContext === tsPreset.context ? '1px solid #6366F1' : '1px solid rgba(255,255,255,0.1)',
                    color: projectContext === tsPreset.context ? '#818CF8' : '#94A3B8',
                    borderRadius: '6px',
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {tsPreset.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              className="custom-textarea"
              style={{ minHeight: '40px', padding: '0.5rem 0.8rem', height: '40px' }}
              placeholder="เลือก Preset ด้านบน หรือพิมพ์ เช่น Python FastAPI + PostgreSQL..."
              value={projectContext}
              onChange={(e) => setProjectContext(e.target.value)}
            />

            {/* Budget & Timeline Selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginTop: '0.6rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.2rem' }}>
                  💰 ระดับงบประมาณ (Budget Level):
                </label>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {['งบประหยัด (Low)', 'งบปานกลาง (Medium)', 'องค์กร (Enterprise)'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setBudgetLevel(budgetLevel === lvl ? '' : lvl)}
                      style={{
                        background: budgetLevel === lvl ? 'rgba(16, 185, 129, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                        border: budgetLevel === lvl ? '1px solid #10B981' : '1px solid rgba(255,255,255,0.08)',
                        color: budgetLevel === lvl ? '#34D399' : '#94A3B8',
                        borderRadius: '4px',
                        padding: '0.15rem 0.4rem',
                        fontSize: '0.7rem',
                        cursor: 'pointer'
                      }}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.2rem' }}>
                  ⏱️ กรอบเวลา (Timeline Constraint):
                </label>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {['เร่งด่วน (< 1 สัปดาห์)', 'ปกติ (1 เดือน)', 'ระยะยาว (3+ เดือน)'].map((tml) => (
                    <button
                      key={tml}
                      type="button"
                      onClick={() => setTimelineConstraint(timelineConstraint === tml ? '' : tml)}
                      style={{
                        background: timelineConstraint === tml ? 'rgba(245, 158, 11, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                        border: timelineConstraint === tml ? '1px solid #F59E0B' : '1px solid rgba(255,255,255,0.08)',
                        color: timelineConstraint === tml ? '#FBBF24' : '#94A3B8',
                        borderRadius: '4px',
                        padding: '0.15rem 0.4rem',
                        fontSize: '0.7rem',
                        cursor: 'pointer'
                      }}
                    >
                      {tml}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Phase 2: Enterprise Security Guardrails & RAG Switches */}
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '0.65rem 0.85rem',
            marginBottom: '0.8rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}>
            {/* RAG Knowledge Switch */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.78rem', color: '#c7d2fe' }}>
              <input
                type="checkbox"
                checked={useRag}
                onChange={(e) => setUseRag(e.target.checked)}
                style={{ accentColor: '#6366f1' }}
              />
              <Database size={14} color="#818cf8" />
              <span>ดึงบริบทจาก Knowledge Base (RAG)</span>
            </label>

            {/* PII Sanitizer Switch */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.78rem', color: '#34d399' }}>
              <input
                type="checkbox"
                checked={sanitizePii}
                onChange={(e) => setSanitizePii(e.target.checked)}
                style={{ accentColor: '#10b981' }}
              />
              <ShieldCheck size={14} color="#34d399" />
              <span>Mask ข้อมูลสำคัญ (PII / API Key)</span>
            </label>

            {/* Security Mode Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#94a3b8' }}>
              <button
                type="button"
                onClick={() => setSecurityMode(securityMode === 'cloud' ? 'private-local' : 'cloud')}
                style={{
                  backgroundColor: securityMode === 'cloud' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                  color: securityMode === 'cloud' ? '#60a5fa' : '#c084fc',
                  border: `1px solid ${securityMode === 'cloud' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(168, 85, 247, 0.4)'}`,
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '0.72rem',
                  cursor: 'pointer'
                }}
              >
                {securityMode === 'cloud' ? '☁️ Cloud AI Mode' : '🔒 On-Premise / Private Mode'}
              </button>
            </div>
          </div>

          {/* Text Area */}
          <div className="input-textarea-wrapper">
            <textarea
              className="custom-textarea"
              placeholder={
                mode === 'human-to-tech'
                  ? 'พิมพ์ความต้องการของลูกค้า เช่น "อยากได้ระบบตัดเงินผ่าน PromptPay และยิงแจ้งเตือนเข้า LINE เมื่อมีคนสั่งซื้อ"...'
                  : 'พิมพ์ปัญหา หรือศัพท์เทคนิคโปรแกรมเมอร์ เช่น "ตอนนี้เจอ CORS error บน staging และ N+1 query ทำให้ API ช้ากว่า 5 วินาที"...'
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <div className="textarea-footer">
              <span>{inputText.length} ตัวอักษร</span>
              <span>{mode === 'human-to-tech' ? 'ภาษาคนทั่วไป ➔ Technical Requirement' : 'ภาษาเทคนิค ➔ สุภาพ & อุปมาอุปไมย'}</span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="action-bar">
            <button className="btn-primary" onClick={handleTranslate} disabled={isLoading}>
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRightLeft size={18} />}
              <span>{isLoading ? 'กำลังประมวลผลด้วย FastAPI & RAG Engine...' : 'เริ่มแปลภาษาตามโหมด'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Output Result Panel */}
        <div className="glass-panel">
          <div className="panel-title">
            <div className="panel-title-left">
              <Sparkles size={20} className="text-purple-400" />
              <span>ผลลัพธ์การแปล (Enterprise JSON Output)</span>
              {translationResult?.isAi && (
                <span className="ai-badge">
                  <Bot size={12} />
                  <span>Gemini AI + RAG</span>
                </span>
              )}
            </div>
            {translationResult && (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {translationResult.mode === 'human-to-tech' && (
                  <button className="btn-secondary" onClick={handleExportOpenAPI} title="Download OpenAPI 3.0 JSON Spec" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34D399', padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}>
                    <Server size={14} />
                    <span>OpenAPI JSON</span>
                  </button>
                )}
                {translationResult.mode === 'tech-to-human' && (
                  <button className="btn-secondary" onClick={handleExportClientEmail} title="Copy Official Client Email Draft" style={{ background: 'rgba(236, 72, 153, 0.15)', borderColor: 'rgba(236, 72, 153, 0.4)', color: '#F472B6', padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}>
                    <Mail size={14} />
                    <span>Email Draft</span>
                  </button>
                )}
                <button className="btn-secondary" onClick={handleExportMarkdown} title="Export to Markdown (.md)" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}>
                  <FileText size={14} className="text-indigo-400" />
                  <span>Markdown</span>
                </button>
                <button className="btn-secondary" onClick={handleExportPDF} title="Export / Print to PDF" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}>
                  <Printer size={14} className="text-emerald-400" />
                  <span>PDF</span>
                </button>
                <button className="btn-secondary" onClick={handleExportJira} title="Copy as Jira Markup" style={{ background: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.4)', color: '#60A5FA', padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}>
                  <FileCode2 size={14} />
                  <span>Jira</span>
                </button>
                <button className="btn-secondary" onClick={handleCopyOutput} title="คัดลอกข้อความธรรมดา" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}>
                  {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                  <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                </button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="output-empty">
              <Loader2 className="empty-icon animate-spin text-indigo-400" />
              <h3 style={{ color: '#A5B4FC' }}>FastAPI Backend กำลังประมวลผล...</h3>
              <p>ระบบกำลังเรียกใช้ RAG Ingestion, PII Sanitizer และ Gemini AI Engine</p>
            </div>
          ) : !translationResult ? (
            <div className="output-empty">
              <Layers className="empty-icon" />
              <h3>ยังไม่มีข้อความแปล</h3>
              <p>เลือกตัวอย่างเคสด้านซ้าย หรือพิมพ์ข้อความแล้วกด "เริ่มแปลภาษา" ได้เลย</p>
            </div>
          ) : (
            <div>
              {/* Phase 2: Corporate Legacy Impact Analysis & RAG Context Card */}
              {translationResult.mode === 'human-to-tech' && (
                <ImpactAnalysisCard
                  impactAnalysis={translationResult.data?.impactAnalysis}
                  ragSources={translationResult.ragSources}
                  maskedItems={translationResult.maskedItems}
                />
              )}

              {/* Mode 1: Human-to-Tech View */}
              {translationResult.mode === 'human-to-tech' && (
                <div>
                  {/* Summary */}
                  <div className="section-card">
                    <div className="section-title">📌 สรุปเป้าหมายหลัก</div>
                    <p style={{ color: '#F8FAFC', fontSize: '0.95rem' }}>
                      {translationResult.data.summary}
                    </p>
                  </div>

                  {/* Technical Requirements */}
                  <div className="section-card">
                    <div className="section-title">⚙️ ข้อกำหนดทางเทคนิค (Technical Requirements)</div>
                    <ul className="bullet-list">
                      {translationResult.data.technicalRequirements?.map((req, idx) => (
                        <li key={idx} className="bullet-item">{req}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Tech Stack */}
                  <div className="section-card">
                    <div className="section-title">🛠️ แนะนำเครื่องมือ & Tech Stack เบื้องต้น</div>
                    <div className="tech-stack-grid">
                      {translationResult.data.techStack?.map((ts, idx) => (
                        <div key={idx} className="tech-badge-card">
                          <div className="tech-name">{ts.name}</div>
                          <div className="tech-desc">{ts.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risk Analysis */}
                  {translationResult.data.riskAnalysis && translationResult.data.riskAnalysis.length > 0 && (
                    <div className="section-card" style={{ borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.05)' }}>
                      <div className="section-title" style={{ color: '#FBBF24' }}>
                        <AlertTriangle size={16} />
                        <span>ข้อควรระวัง & ความเสี่ยงในโปรเจกต์</span>
                      </div>
                      <ul className="bullet-list">
                        {translationResult.data.riskAnalysis.map((r, idx) => (
                          <li key={idx} className="bullet-item" style={{ color: '#FEF3C7' }}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Effort & Cost Estimation */}
                  {translationResult.data.effortEstimation && (
                    <div className="section-card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.05)' }}>
                      <div className="section-title" style={{ color: '#34D399' }}>
                        <Clock size={16} />
                        <span>การประเมินระยะเวลาและงบประมาณ (AI Effort & Cost Estimator)</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem', marginTop: '0.5rem' }}>
                        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>ความซับซ้อน (Complexity)</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#60A5FA' }}>{translationResult.data.effortEstimation.complexity}</div>
                        </div>
                        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>ระยะเวลาทำงาน (Man-Days)</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#FBBF24' }}>{translationResult.data.effortEstimation.estimatedManDays}</div>
                        </div>
                        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>ประเมินงบประมาณ</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#34D399' }}>{translationResult.data.effortEstimation.estimatedCostRange}</div>
                        </div>
                      </div>
                      {translationResult.data.effortEstimation.reasoning && (
                        <p style={{ color: '#94A3B8', fontSize: '0.82rem', marginTop: '0.6rem' }}>
                          💡 <em>เหตุผลประเมิน: {translationResult.data.effortEstimation.reasoning}</em>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Acceptance Criteria */}
                  {translationResult.data.acceptanceCriteria && translationResult.data.acceptanceCriteria.length > 0 && (
                    <div className="section-card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.04)' }}>
                      <div className="section-title" style={{ color: '#34D399' }}>
                        <span>📋 เงื่อนไขการตรวจรับงาน (Acceptance Criteria)</span>
                      </div>
                      <ul className="bullet-list">
                        {translationResult.data.acceptanceCriteria.map((ac, idx) => (
                          <li key={idx} className="bullet-item" style={{ color: '#E2E8F0' }}>{ac}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Non-Functional Requirements */}
                  {translationResult.data.nonFunctionalRequirements && translationResult.data.nonFunctionalRequirements.length > 0 && (
                    <div className="section-card" style={{ borderColor: 'rgba(168, 85, 247, 0.3)', background: 'rgba(168, 85, 247, 0.04)' }}>
                      <div className="section-title" style={{ color: '#C084FC' }}>
                        <span>🛡️ ข้อกำหนดด้านประสิทธิภาพและความปลอดภัย (Non-Functional Requirements)</span>
                      </div>
                      <ul className="bullet-list">
                        {translationResult.data.nonFunctionalRequirements.map((nfr, idx) => (
                          <li key={idx} className="bullet-item" style={{ color: '#F3E8FF' }}>{nfr}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* API Draft Payload */}
                  {translationResult.data.apiDraft && translationResult.data.apiDraft.length > 0 && (
                    <div className="section-card" style={{ borderColor: 'rgba(56, 189, 248, 0.3)', background: 'rgba(15, 23, 42, 0.6)' }}>
                      <div className="section-title" style={{ color: '#38BDF8' }}>
                        <span>🔌 ร่างโครงสร้าง API & Data Payloads (API Specification Draft)</span>
                      </div>
                      <ul className="bullet-list">
                        {translationResult.data.apiDraft.map((api, idx) => (
                          <li key={idx} className="bullet-item" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#7DD3FC' }}>{api}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggested Questions */}
                  {translationResult.data.suggestedQuestions && translationResult.data.suggestedQuestions.length > 0 && (
                    <div className="section-card" style={{ borderColor: 'rgba(14, 165, 233, 0.3)', background: 'rgba(14, 165, 233, 0.05)' }}>
                      <div className="section-title" style={{ color: '#38BDF8' }}>
                        <HelpCircle size={16} />
                        <span>คำถามสำคัญที่ควรสอบถามลูกค้าเพิ่มเติม</span>
                      </div>
                      <ul className="bullet-list">
                        {translationResult.data.suggestedQuestions.map((q, idx) => (
                          <li key={idx} className="bullet-item" style={{ color: '#E0F2FE' }}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: Tech-to-Human View */}
              {translationResult.mode === 'tech-to-human' && (
                <div>
                  {/* Polite Explanation Box */}
                  <div className="polite-text-box" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34D399', fontWeight: '600' }}>
                        <MessageSquareText size={16} />
                        <span>ข้อความสุภาพพร้อมส่งให้ลูกค้าอ่าน:</span>
                      </div>
                      <button
                        className="btn-secondary"
                        onClick={handleExportClientEmail}
                        style={{
                          background: 'rgba(236, 72, 153, 0.2)',
                          borderColor: 'rgba(236, 72, 153, 0.5)',
                          color: '#F472B6',
                          padding: '0.25rem 0.6rem',
                          fontSize: '0.75rem',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Mail size={13} />
                        <span>คัดลอกร่างอีเมล (Client Email Draft)</span>
                      </button>
                    </div>
                    {translationResult.data.politeExplanation}
                  </div>

                  {/* Analogy Banner */}
                  {translationResult.data.analogy && (
                    <div className="analogy-banner">
                      <div className="analogy-header">
                        <span className="analogy-icon">{translationResult.data.analogy.icon || '💡'}</span>
                        <span className="analogy-title">{translationResult.data.analogy.title}</span>
                      </div>
                      <div className="analogy-body">
                        {translationResult.data.analogy.description}
                      </div>
                    </div>
                  )}

                  {/* Impact */}
                  <div className="section-card">
                    <div className="section-title">📌 ผลกระทบต่อผู้ใช้งาน (User Impact)</div>
                    <p style={{ color: '#F8FAFC', fontSize: '0.95rem' }}>
                      {translationResult.data.impact}
                    </p>
                  </div>

                  {/* Estimated Time Badge */}
                  <div className="section-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="section-title" style={{ margin: 0, color: '#FCD34D' }}>
                      <Clock size={16} />
                      <span>ระยะเวลาแก้ไขโดยประมาณ</span>
                    </div>
                    <div className="time-badge">
                      {translationResult.data.estimatedTime}
                    </div>
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
          <Check size={18} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
