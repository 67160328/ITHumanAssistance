import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  UploadCloud,
  FileText,
  Trash2,
  Search,
  CheckCircle,
  AlertCircle,
  Plus,
  Loader2,
  Sparkles,
  Layers,
  BookOpen,
  Tag
} from 'lucide-react';
import { getDocuments, uploadDocument, deleteDocument, searchRAG } from '../services/documentService';

export default function KnowledgeBaseModal({ isOpen, onClose, onDocumentsUpdated }) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'upload' | 'rag-test'

  // Upload Form State
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('prd');
  const [docTags, setDocTags] = useState('Architecture, Payment, Core');
  const [docContent, setDocContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // RAG Search Test State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDocs();
    }
  }, [isOpen]);

  const loadDocs = async () => {
    setIsLoading(true);
    try {
      const docs = await getDocuments();
      setDocuments(docs);
      if (onDocumentsUpdated) onDocumentsUpdated(docs.length);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim()) {
      setUploadStatus('กรุณากรอกชื่อและเนื้อหาเอกสารให้ครบถ้วน');
      return;
    }

    setIsUploading(true);
    setUploadStatus('');

    const tags = docTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    try {
      await uploadDocument(docTitle.trim(), docContent.trim(), docType, tags);
      setUploadStatus('อัปโหลดและสร้าง Text Chunks สำหรับ RAG สำเร็จแล้ว!');
      setDocTitle('');
      setDocContent('');
      await loadDocs();
      setTimeout(() => {
        setActiveTab('list');
        setUploadStatus('');
      }, 1200);
    } catch (err) {
      setUploadStatus('การอัปโหลดล้มเหลว: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (window.confirm('คุณต้องการลบเอกสารนี้ออกจาก Knowledge Base หรือไม่?')) {
      await deleteDocument(docId);
      await loadDocs();
    }
  };

  const handleRAGSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchRAG(searchQuery.trim());
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (!file) return;

    setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
    const reader = new FileReader();
    reader.onload = (event) => {
      setDocContent(event.target.result);
      if (file.name.endsWith('.json')) setDocType('openapi');
      else if (file.name.endsWith('.md')) setDocType('markdown');
      else setDocType('prd');
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-panel"
        style={{ maxWidth: '800px', width: '92%', maxHeight: '88vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Database size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc' }}>
                Corporate Knowledge Base & RAG Engine
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                จัดเก็บเอกสารสถาปัตยกรรมและ PRD ขององค์กรเพื่อป้อนเป็นบริบทให้ AI
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '0.75rem',
          marginBottom: '1rem'
        }}>
          <button
            className={`btn-secondary ${activeTab === 'list' ? 'btn-primary' : ''}`}
            style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
            onClick={() => setActiveTab('list')}
          >
            <BookOpen size={15} />
            <span>คลังเอกสาร ({documents.length})</span>
          </button>
          <button
            className={`btn-secondary ${activeTab === 'upload' ? 'btn-primary' : ''}`}
            style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
            onClick={() => setActiveTab('upload')}
          >
            <UploadCloud size={15} />
            <span>อัปโหลดเอกสารใหม่</span>
          </button>
          <button
            className={`btn-secondary ${activeTab === 'rag-test' ? 'btn-primary' : ''}`}
            style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
            onClick={() => setActiveTab('rag-test')}
          >
            <Search size={15} />
            <span>ทดสอบ RAG Retrieval</span>
          </button>
        </div>

        {/* TAB 1: Document List */}
        {activeTab === 'list' && (
          <div>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                <Loader2 className="spinner" size={28} />
                <p>กำลังโหลดเอกสารใน Knowledge Base...</p>
              </div>
            ) : documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                <Database size={40} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                <p>ยังไม่มีเอกสารใน Corporate Knowledge Base</p>
                <button
                  className="btn-primary"
                  style={{ marginTop: '0.8rem', padding: '0.5rem 1rem' }}
                  onClick={() => setActiveTab('upload')}
                >
                  <Plus size={16} />
                  <span>เพิ่มเอกสารฉบับแรก</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      padding: '1rem',
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={18} color="#818cf8" />
                        <span style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.95rem' }}>
                          {doc.title}
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          backgroundColor: 'rgba(99, 102, 241, 0.2)',
                          color: '#a5b4fc',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase'
                        }}>
                          {doc.doc_type || 'markdown'}
                        </span>
                      </div>

                      <button
                        className="btn-icon"
                        style={{ color: '#f87171', padding: '4px' }}
                        title="ลบเอกสาร"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <p style={{
                      fontSize: '0.8rem',
                      color: '#94a3b8',
                      margin: 0,
                      lineHeight: '1.4',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {doc.preview}
                    </p>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.75rem',
                      color: '#64748b',
                      marginTop: '0.2rem'
                    }}>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8' }}>
                          <Layers size={13} />
                          {doc.chunk_count || 1} RAG Chunks
                        </span>
                        {doc.tags && doc.tags.map((tag, i) => (
                          <span key={i} style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            color: '#cbd5e1'
                          }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <span>{doc.created_at}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Upload Document */}
        {activeTab === 'upload' && (
          <form onSubmit={handleUpload}>
            {uploadStatus && (
              <div style={{
                padding: '0.75rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.85rem',
                backgroundColor: uploadStatus.includes('สำเร็จ') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: uploadStatus.includes('สำเร็จ') ? '#34d399' : '#f87171',
                border: uploadStatus.includes('สำเร็จ') ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                {uploadStatus}
              </div>
            )}

            {/* Drag & Drop File Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              style={{
                border: '2px dashed rgba(99, 102, 241, 0.4)',
                borderRadius: '12px',
                padding: '1.25rem',
                textAlign: 'center',
                backgroundColor: 'rgba(99, 102, 241, 0.05)',
                marginBottom: '1rem',
                cursor: 'pointer'
              }}
              onClick={() => document.getElementById('file-input-upload').click()}
            >
              <input
                id="file-input-upload"
                type="file"
                accept=".md,.txt,.json,.prd,.doc,.docx"
                style={{ display: 'none' }}
                onChange={handleFileDrop}
              />
              <UploadCloud size={32} color="#818cf8" style={{ margin: '0 auto 0.4rem auto' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9' }}>
                ลากและวางไฟล์ หรือคลิกเพื่อเลือกไฟล์
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                รองรับไฟล์ Markdown (.md), JSON / OpenAPI, PRD Text, TXT
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  ชื่อเอกสาร (Title) *
                </label>
                <input
                  type="text"
                  className="settings-input"
                  placeholder="เช่น Architecture Overview v1.0, Payment API Specs"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  ประเภทเอกสาร
                </label>
                <select
                  className="settings-input"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                >
                  <option value="prd">PRD / Requirement</option>
                  <option value="markdown">Architecture Markdown</option>
                  <option value="openapi">Swagger / OpenAPI JSON</option>
                  <option value="text">General Documentation</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                Tags (คั่นด้วยจุลภาค)
              </label>
              <input
                type="text"
                className="settings-input"
                placeholder="เช่น Database, Auth, PostgreSQL, Core"
                value={docTags}
                onChange={(e) => setDocTags(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                เนื้อหาเอกสาร (Markdown / Plain Text) *
              </label>
              <textarea
                className="settings-input"
                style={{ height: '140px', fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
                placeholder="ระบุ Modules, Database Tables, Services, และโครงสร้างระบบเดิมขององค์กร..."
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setActiveTab('list')}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="spinner" size={16} /> : <Sparkles size={16} />}
                <span>ประมวลผลและสร้าง RAG Chunks</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: Test RAG Retrieval */}
        {activeTab === 'rag-test' && (
          <div>
            <form onSubmit={handleRAGSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                className="settings-input"
                placeholder="พิมพ์คำถามหรือฟีเจอร์เพื่อทดสอบค้นหา เช่น 'ตัดบัตรเครดิต', 'ระบบแจ้งเตือน LINE'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="btn-primary" disabled={isSearching} style={{ flexShrink: 0 }}>
                {isSearching ? <Loader2 className="spinner" size={16} /> : <Search size={16} />}
                <span>ค้นหา RAG</span>
              </button>
            </form>

            {searchResults.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#a5b4fc', fontWeight: 600 }}>
                  พบ {searchResults.length} ท่อนเอกสารที่ตรงกับคำค้นหา:
                </div>
                {searchResults.map((res, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.85rem',
                      backgroundColor: 'rgba(30, 27, 75, 0.4)',
                      borderRadius: '8px',
                      border: '1px solid rgba(99, 102, 241, 0.25)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 600, color: '#e0e7ff', fontSize: '0.85rem' }}>
                        📄 {res.doc_title}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>
                        Match Score: {res.score}
                      </span>
                    </div>
                    <pre style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      fontSize: '0.75rem',
                      color: '#cbd5e1',
                      fontFamily: 'monospace',
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      padding: '0.5rem',
                      borderRadius: '6px'
                    }}>
                      {res.chunk_text}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.85rem' }}>
                พิมพ์คำค้นหาด้านบนเพื่อทดสอบการดึงข้อมูลจาก Vector / In-memory RAG Database
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
