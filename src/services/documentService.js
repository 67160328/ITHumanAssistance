const FASTAPI_BASE_URL = 'http://localhost:8000';

const LOCAL_DOCS_KEY = 'corporate_knowledge_base_docs';

const INITIAL_DEMO_DOCS = [
  {
    id: 'doc-demo-1',
    title: 'E-Commerce & Payment Architecture Spec v2.4',
    doc_type: 'prd',
    tags: ['Payment', 'Architecture', 'PostgreSQL', 'Core'],
    created_at: '2026-09-19 10:00:00',
    chunk_count: 2,
    preview: 'Enterprise Payment & Order Processing Architecture: Modules: PaymentService.py (PromptPay, Stripe), OrderService.py, AuthService.py (JWT RBAC), InventoryService.py...'
  },
  {
    id: 'doc-demo-2',
    title: 'Notification & Webhook Integration Guide',
    doc_type: 'markdown',
    tags: ['Notification', 'Webhook', 'Audit'],
    created_at: '2026-09-19 10:05:00',
    chunk_count: 1,
    preview: 'Notification Services: LineNotifyService.py (LINE Messaging API), EmailNotificationService.py (SendGrid), AuditLogService.py (audit_logs table)...'
  }
];

export async function getDocuments() {
  try {
    const res = await fetch(`${FASTAPI_BASE_URL}/api/documents`);
    if (res.ok) {
      const data = await res.json();
      return data.documents || [];
    }
  } catch (err) {
    console.info('Backend documents unavailable, using local cache:', err.message);
  }

  const stored = localStorage.getItem(LOCAL_DOCS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      // fallback
    }
  }
  return INITIAL_DEMO_DOCS;
}

export async function uploadDocument(title, content, docType = 'markdown', tags = []) {
  try {
    const res = await fetch(`${FASTAPI_BASE_URL}/api/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        doc_type: docType,
        tags
      })
    });
    if (res.ok) {
      const data = await res.json();
      return data.document;
    }
  } catch (err) {
    console.warn('FastAPI upload failed, saving to local state:', err.message);
  }

  // Local fallback
  const docs = await getDocuments();
  const newDoc = {
    id: 'doc-' + Date.now().toString(36),
    title,
    content,
    doc_type: docType,
    tags,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    chunk_count: Math.max(1, Math.ceil(content.length / 500)),
    preview: content.slice(0, 160) + (content.length > 160 ? '...' : '')
  };
  const updated = [newDoc, ...docs];
  localStorage.setItem(LOCAL_DOCS_KEY, JSON.stringify(updated));
  return newDoc;
}

export async function deleteDocument(docId) {
  try {
    const res = await fetch(`${FASTAPI_BASE_URL}/api/documents/${docId}`, {
      method: 'DELETE'
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('Backend delete document failed, removing locally:', err.message);
  }

  const docs = await getDocuments();
  const filtered = docs.filter(d => d.id !== docId);
  localStorage.setItem(LOCAL_DOCS_KEY, JSON.stringify(filtered));
  return true;
}

export async function searchRAG(query) {
  try {
    const res = await fetch(`${FASTAPI_BASE_URL}/api/documents/rag-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k: 3 })
    });
    if (res.ok) {
      const data = await res.json();
      return data.results || [];
    }
  } catch (err) {
    console.info('Backend RAG search failed:', err.message);
  }
  return [];
}
