import React from 'react';
import { 
  GitBranch, 
  Database, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2, 
  Layers, 
  Zap,
  Lock
} from 'lucide-react';

export default function ImpactAnalysisCard({ impactAnalysis, ragSources = [], maskedItems = [] }) {
  if (!impactAnalysis && ragSources.length === 0 && maskedItems.length === 0) {
    return null;
  }

  const severity = impactAnalysis?.impactSeverity || 'Low';
  const severityColors = {
    Low: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
    Medium: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
    High: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
    Critical: { bg: 'rgba(225, 29, 72, 0.25)', text: '#fb7185', border: 'rgba(225, 29, 72, 0.5)' }
  };

  const currentSev = severityColors[severity] || severityColors.Medium;

  return (
    <div className="output-card impact-card" style={{
      border: '1px solid rgba(99, 102, 241, 0.3)',
      background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)',
      borderRadius: '16px',
      padding: '1.25rem',
      marginBottom: '1.25rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <GitBranch size={18} color="#fff" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9' }}>
              Corporate Impact & Architecture Analysis (Phase 2 RAG)
            </h4>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              วิเคราะห์ผลกระทบต่อสถาปัตยกรรมและฐานข้อมูลเดิมขององค์กร
            </span>
          </div>
        </div>

        {impactAnalysis && (
          <span style={{
            fontSize: '0.75rem',
            padding: '4px 10px',
            borderRadius: '9999px',
            backgroundColor: currentSev.bg,
            color: currentSev.text,
            border: `1px solid ${currentSev.border}`,
            fontWeight: 600
          }}>
            Impact Severity: {severity}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.8rem', marginBottom: '1rem' }}>
        {/* Affected Modules */}
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '10px',
          padding: '0.85rem',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a5b4fc', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            <Layers size={14} />
            <span>โมดูลเดิมที่ได้รับผลกระทบ (Affected Modules)</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {impactAnalysis?.affectedModules && impactAnalysis.affectedModules.length > 0 ? (
              impactAnalysis.affectedModules.map((mod, i) => (
                <span key={i} style={{
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  color: '#c7d2fe',
                  borderRadius: '6px',
                  border: '1px solid rgba(99, 102, 241, 0.25)'
                }}>
                  {mod}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ไม่มีผลกระทบต่อโมดูลหลักเดิม</span>
            )}
          </div>
        </div>

        {/* Affected Tables */}
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '10px',
          padding: '0.85rem',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            <Database size={14} />
            <span>ตารางฐานข้อมูลที่เกี่ยวข้อง (Database Tables)</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {impactAnalysis?.affectedTables && impactAnalysis.affectedTables.length > 0 ? (
              impactAnalysis.affectedTables.map((tab, i) => (
                <span key={i} style={{
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#bae6fd',
                  borderRadius: '6px',
                  border: '1px solid rgba(56, 189, 248, 0.25)'
                }}>
                  {tab}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ไม่มีผลกระทบต่อ Schema เดิม</span>
            )}
          </div>
        </div>

        {/* Refactoring Effort */}
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '10px',
          padding: '0.85rem',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            <Clock size={14} />
            <span>เวลาปรับปรุงโค้ดเดิม (Refactoring Effort)</span>
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9' }}>
            {impactAnalysis?.refactoringEffortDays || '1 - 2 วันทำการ'}
          </div>
        </div>
      </div>

      {/* Risk Mitigation */}
      {impactAnalysis?.riskMitigation && (
        <div style={{
          padding: '0.65rem 0.85rem',
          backgroundColor: 'rgba(30, 41, 59, 0.5)',
          borderRadius: '8px',
          fontSize: '0.78rem',
          color: '#cbd5e1',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.8rem'
        }}>
          <ShieldCheck size={16} color="#34d399" style={{ flexShrink: 0 }} />
          <span><strong>มาตรการป้องกันความเสี่ยง:</strong> {impactAnalysis.riskMitigation}</span>
        </div>
      )}

      {/* RAG Knowledge Base Sources Badge */}
      {ragSources && ragSources.length > 0 && (
        <div style={{
          padding: '0.6rem 0.85rem',
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
          borderRadius: '8px',
          border: '1px dashed rgba(99, 102, 241, 0.3)',
          fontSize: '0.75rem',
          color: '#a5b4fc',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Zap size={14} color="#818cf8" />
          <span><strong>RAG Matched Context:</strong> ดึงข้อมูลอ้างอิงจาก</span>
          {ragSources.map((src, idx) => (
            <span key={idx} style={{
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              padding: '2px 6px',
              borderRadius: '4px',
              color: '#e0e7ff',
              fontWeight: 500
            }}>
              📄 {src.doc_title} (Score: {src.score})
            </span>
          ))}
        </div>
      )}

      {/* PII Masked Guardrail Badge */}
      {maskedItems && maskedItems.length > 0 && (
        <div style={{
          marginTop: '0.6rem',
          padding: '0.6rem 0.85rem',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          borderRadius: '8px',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          fontSize: '0.75rem',
          color: '#fca5a5',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.4rem'
        }}>
          <Lock size={14} color="#f87171" />
          <span><strong>Enterprise Sanitizer Masked:</strong> ตรวจพบและเซนเซอร์ข้อมูลสำคัญ {maskedItems.length} จุด</span>
          {maskedItems.map((m, idx) => (
            <span key={idx} style={{
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              padding: '1px 6px',
              borderRadius: '4px',
              color: '#fee2e2',
              fontFamily: 'monospace'
            }}>
              {m.masked}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
