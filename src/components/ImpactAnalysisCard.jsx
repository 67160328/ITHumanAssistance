import React from 'react';
import { 
  GitBranch, 
  Database, 
  Clock, 
  ShieldCheck, 
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
    Low: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
    Medium: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
    High: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
    Critical: { bg: '#FFF1F2', text: '#9F1239', border: '#FECDD3' }
  };

  const currentSev = severityColors[severity] || severityColors.Medium;

  return (
    <div style={{
      border: '1px solid var(--border-light)',
      background: 'var(--bg-subtle)',
      borderRadius: '12px',
      padding: '1.1rem',
      marginBottom: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <div style={{
            background: 'var(--primary-gradient)',
            padding: '5px',
            borderRadius: '7px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <GitBranch size={16} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)' }}>
              วิเคราะห์ผลกระทบต่อระบบเดิม (Impact & Architecture Analysis)
            </h4>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              ตรวจสอบผลกระทบต่อโมดูล สถาปัตยกรรม และฐานข้อมูลองค์กร
            </span>
          </div>
        </div>

        {impactAnalysis && (
          <span style={{
            fontSize: '0.72rem',
            padding: '3px 9px',
            borderRadius: '9999px',
            backgroundColor: currentSev.bg,
            color: currentSev.text,
            border: `1px solid ${currentSev.border}`,
            fontWeight: 600
          }}>
            ระดับผลกระทบ: {severity}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem', marginBottom: '0.85rem' }}>
        {/* Affected Modules */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '8px',
          padding: '0.75rem',
          border: '1px solid var(--border-light)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem' }}>
            <Layers size={13} color="var(--primary)" />
            <span>โมดูลเดิมที่กระทบ</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {impactAnalysis?.affectedModules && impactAnalysis.affectedModules.length > 0 ? (
              impactAnalysis.affectedModules.map((mod, i) => (
                <span key={i} style={{
                  fontSize: '0.72rem',
                  fontFamily: 'monospace',
                  padding: '2px 6px',
                  backgroundColor: 'var(--bg-accent-soft)',
                  color: 'var(--primary)',
                  borderRadius: '4px',
                  border: '1px solid var(--border-light)'
                }}>
                  {mod}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>ไม่มีผลกระทบต่อโมดูลเดิม</span>
            )}
          </div>
        </div>

        {/* Affected Tables */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '8px',
          padding: '0.75rem',
          border: '1px solid var(--border-light)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem' }}>
            <Database size={13} color="var(--accent-sky)" />
            <span>ตารางฐานข้อมูลที่กระทบ</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {impactAnalysis?.affectedTables && impactAnalysis.affectedTables.length > 0 ? (
              impactAnalysis.affectedTables.map((tab, i) => (
                <span key={i} style={{
                  fontSize: '0.72rem',
                  fontFamily: 'monospace',
                  padding: '2px 6px',
                  backgroundColor: 'var(--bg-accent-soft)',
                  color: 'var(--accent-sky)',
                  borderRadius: '4px',
                  border: '1px solid var(--border-light)'
                }}>
                  {tab}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>ไม่มีผลกระทบต่อตารางเดิม</span>
            )}
          </div>
        </div>

        {/* Refactoring Effort */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '8px',
          padding: '0.75rem',
          border: '1px solid var(--border-light)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem' }}>
            <Clock size={13} color="var(--accent-emerald)" />
            <span>เวลาปรับแก้โค้ดเดิม</span>
          </div>
          <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-main)' }}>
            {impactAnalysis?.refactoringEffortDays || '1 - 2 วันทำการ'}
          </div>
        </div>
      </div>

      {/* Risk Mitigation */}
      {impactAnalysis?.riskMitigation && (
        <div style={{
          padding: '0.55rem 0.75rem',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '6px',
          border: '1px solid var(--border-light)',
          fontSize: '0.76rem',
          color: 'var(--text-body)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          marginBottom: '0.65rem'
        }}>
          <ShieldCheck size={15} color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
          <span><strong>แนวทางป้องกันความเสี่ยง:</strong> {impactAnalysis.riskMitigation}</span>
        </div>
      )}

      {/* RAG Context */}
      {ragSources && ragSources.length > 0 && (
        <div style={{
          padding: '0.55rem 0.75rem',
          backgroundColor: 'var(--bg-accent-soft)',
          borderRadius: '6px',
          border: '1px dashed var(--brand-pill-border)',
          fontSize: '0.74rem',
          color: 'var(--primary)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.4rem'
        }}>
          <Zap size={13} />
          <span><strong>RAG Matched Context:</strong> ดึงข้อมูลจาก</span>
          {ragSources.map((src, idx) => (
            <span key={idx} style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              padding: '1px 6px',
              borderRadius: '4px',
              color: 'var(--text-main)',
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
          marginTop: '0.55rem',
          padding: '0.55rem 0.75rem',
          backgroundColor: '#FEF2F2',
          borderRadius: '6px',
          border: '1px solid #FECACA',
          fontSize: '0.74rem',
          color: '#991B1B',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.35rem'
        }}>
          <Lock size={13} color="#DC2626" />
          <span><strong>PII Guardrail:</strong> ทำการ Mask ข้อมูล {maskedItems.length} จุด</span>
          {maskedItems.map((m, idx) => (
            <span key={idx} style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #FECACA',
              padding: '1px 5px',
              borderRadius: '4px',
              color: '#B91C1C',
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
