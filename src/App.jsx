import React, { useState } from 'react';
import { PRESETS } from './data/presets';
import { translateText, getStoredApiKey } from './services/translator';
import SettingsModal from './components/SettingsModal';
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
  Server
} from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState('human-to-tech'); // 'human-to-tech' | 'tech-to-human'
  const [inputText, setInputText] = useState('');
  const [projectContext, setProjectContext] = useState('');
  const [translationResult, setTranslationResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentApiKey, setCurrentApiKey] = useState(getStoredApiKey());

  const currentPresets = mode === 'human-to-tech' ? PRESETS.humanToTech : PRESETS.techToHuman;

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    try {
      const result = await translateText(inputText, mode, currentApiKey, projectContext);
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
      const result = await translateText(preset.input, mode, currentApiKey, projectContext);
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
        data.riskAnalysis.map(r => `• ${r}`).join('\n') +
        `\n\n❓ [คำถามที่ควรถามลูกค้าเพิ่ม]\n` +
        data.suggestedQuestions.map(q => `• ${q}`).join('\n');

      if (data.effortEstimation) {
        formattedText += `\n\n⏱️ [การประเมินระยะเวลาและงบประมาณ (Effort Estimation)]\n` +
          `• ความซับซ้อน: ${data.effortEstimation.complexity}\n` +
          `• ระยะเวลาทำงาน: ${data.effortEstimation.estimatedManDays}\n` +
          `• งบประมาณโดยประมาณ: ${data.effortEstimation.estimatedCostRange}\n` +
          `• เหตุผล: ${data.effortEstimation.reasoning}`;
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
    if (!translationResult || mode !== 'human-to-tech') return;
    const { data } = translationResult;
    const jiraMarkdown = `h1. User Story / Feature Requirement

*Summary:* ${data.summary}

h2. Technical Requirements
${data.technicalRequirements.map(req => `* ${req}`).join('\n')}

h2. Recommended Tech Stack
${data.techStack.map(ts => `* *${ts.name}*: ${ts.desc}`).join('\n')}

h2. Risk Analysis
${data.riskAnalysis ? data.riskAnalysis.map(r => `* ${r}`).join('\n') : 'N/A'}

${data.effortEstimation ? `h2. Effort & Cost Estimation
* *Complexity:* ${data.effortEstimation.complexity}
* *Estimated Man-Days:* ${data.effortEstimation.estimatedManDays}
* *Estimated Cost Range:* ${data.effortEstimation.estimatedCostRange}
* *Reasoning:* ${data.effortEstimation.reasoning}` : ''}
`;
    navigator.clipboard.writeText(jiraMarkdown);
    showToast('คัดลอกรูปแบบ Jira / Confluence Format สำเร็จ!');
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

      {/* Header */}
      <header className="app-header">
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div className="header-badge" style={{ margin: 0 }}>
            <Sparkles size={16} />
            <span>ระบบแปลภาษาไอทีอัจฉริยะ</span>
          </div>

          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="settings-badge-btn"
            style={{ textDecoration: 'none' }}
          >
            <Server size={14} className="text-emerald-400" />
            <span>FastAPI Swagger Docs (/docs)</span>
            <FileCode2 size={14} />
          </a>

          <button className="settings-badge-btn" onClick={() => setIsSettingsOpen(true)}>
            {currentApiKey ? (
              <>
                <span className="status-dot online"></span>
                <Bot size={15} />
                <span>Google Gemini AI Active</span>
              </>
            ) : (
              <>
                <span className="status-dot offline"></span>
                <span>ตั้งค่า API Key</span>
              </>
            )}
            <Settings size={14} style={{ marginLeft: '4px' }} />
          </button>
        </div>

        <h1 className="header-title">IT-to-Human Translator</h1>
        <p className="header-subtitle">
          โครงงานวิชา Web Application: แปลงภาษาคนทั่วไปให้เป็น Technical Requirements และแปลงศัพท์เทคนิคให้เป็นข้อความสุภาพด้วย FastAPI, Docker & Gemini AI
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
            <span className="preset-chip-title">💡 ตัวอย่างเคสทดสอบ (FastAPI REST Endpoint):</span>
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
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#94A3B8', marginBottom: '0.4rem', fontWeight: '500' }}>
              🏢 Project Context / Corporate Tech Stack (ระบุบริบทโปรเจกต์ เช่น "องค์กรใช้ Python FastAPI + PostgreSQL บน AWS"):
            </label>
            <input
              type="text"
              className="custom-textarea"
              style={{ minHeight: '42px', padding: '0.5rem 0.8rem', height: '42px' }}
              placeholder="เช่น ใช้ Node.js + React, งบประมาณปานกลาง, ต้องการเน้นความปลอดภัยสูงสุด..."
              value={projectContext}
              onChange={(e) => setProjectContext(e.target.value)}
            />
          </div>

          {/* Text Area */}
          <div className="input-textarea-wrapper">
            <textarea
              className="custom-textarea"
              placeholder={
                mode === 'human-to-tech'
                  ? 'พิมพ์ความต้องการของลูกค้าที่นี่ เช่น "อยากได้ปุ่มวิบวับสวยๆ", "อยากได้เว็บแบบ Shopee ทำเสร็จใน 3 วัน"...'
                  : 'พิมพ์ปัญหา หรือศัพท์เทคนิคโปรแกรมเมอร์ที่นี่ เช่น "ตอนนี้เจอ CORS error บน staging และ N+1 query ทำให้ API ช้ากว่า 5 วินาที"...'
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
              <span>{isLoading ? 'กำลังประมวลผลด้วย FastAPI & Gemini AI...' : 'เริ่มแปลภาษาตามโหมด'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Output Result Panel */}
        <div className="glass-panel">
          <div className="panel-title">
            <div className="panel-title-left">
              <Sparkles size={20} className="text-purple-400" />
              <span>ผลลัพธ์การแปล (FastAPI JSON Output)</span>
              {translationResult?.isAi && (
                <span className="ai-badge">
                  <Bot size={12} />
                  <span>Gemini AI + FastAPI</span>
                </span>
              )}
            </div>
            {translationResult && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {translationResult.mode === 'human-to-tech' && (
                  <button className="btn-secondary" onClick={handleExportJira} style={{ background: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.4)', color: '#60A5FA' }}>
                    <FileCode2 size={15} />
                    <span>Jira Format</span>
                  </button>
                )}
                <button className="btn-secondary" onClick={handleCopyOutput}>
                  {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
                  <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ'}</span>
                </button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="output-empty">
              <Loader2 className="empty-icon animate-spin text-indigo-400" />
              <h3 style={{ color: '#A5B4FC' }}>FastAPI Backend กำลังประมวลผล...</h3>
              <p>ระบบกำลังเรียกใช้ Pydantic Validation และ Gemini AI Service</p>
            </div>
          ) : !translationResult ? (
            <div className="output-empty">
              <Layers className="empty-icon" />
              <h3>ยังไม่มีข้อความแปล</h3>
              <p>เลือกตัวอย่างเคสด้านซ้าย หรือพิมพ์ข้อความแล้วกด "เริ่มแปลภาษา" ได้เลย</p>
            </div>
          ) : (
            <div>
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
                  <div className="polite-text-box">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34D399', fontWeight: '600', marginBottom: '0.5rem' }}>
                      <MessageSquareText size={16} />
                      <span>ข้อความสุภาพพร้อมส่งให้ลูกค้าอ่าน:</span>
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
