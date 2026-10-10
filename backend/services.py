import os
import re
import json
import uuid
import datetime
import math
import httpx
from typing import Dict, Any, List, Tuple
from collections import Counter
from backend.database import get_db_connection, init_db
from backend.prompts import (
    SYSTEM_PROMPT,
    build_human_to_tech_prompt,
    build_tech_to_human_prompt
)

init_db()

CANDIDATE_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite"
]

DEFAULT_KEY = os.getenv("GEMINI_API_KEY", "")

# ==============================================================================
# 1. PII & SECRET SANITIZER ENGINE (Enterprise Security)
# ==============================================================================

PATTERNS = [
    (
        "api_key",
        r"(sk-[a-zA-Z0-9_-]{20,}|AIza[0-9A-Za-z-_]{35}|ghp_[a-zA-Z0-9]{36}|Bearer\s+[a-zA-Z0-9_\-\.]{25,})",
        "[REDACTED_API_KEY]"
    ),
    (
        "password",
        r"(?:password|passwd|pwd|secret|รหัสผ่าน)\s*[:=]\s*([^\s,;]+)",
        "[REDACTED_PASSWORD]"
    ),
    (
        "pii_email",
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b",
        "[REDACTED_EMAIL]"
    ),
    (
        "pii_thai_id",
        r"\b\d{1}[- ]?\d{4}[- ]?\d{5}[- ]?\d{2}[- ]?\d{1}\b",
        "[REDACTED_THAI_ID]"
    ),
    (
        "pii_phone",
        r"\b(?:0[689]\d{8}|0[23457]\d{7}|\+66\s?[689]\d{8}|\b\d{3}[-.]?\d{3}[-.]?\d{4}\b)",
        "[REDACTED_PHONE]"
    )
]

def sanitize_text(text: str) -> Tuple[str, List[Dict[str, str]]]:
    """
    สแกนและ Mask ข้อมูลอ่อนไหว (PII & Secrets) ก่อนส่งไปยังภายนอกหรือบันทึก
    """
    if not text:
        return text, []

    sanitized = text
    masked_items = []

    for item_type, pattern, replacement in PATTERNS:
        matches = list(re.finditer(pattern, sanitized, flags=re.IGNORECASE))
        for match in matches:
            matched_str = match.group(0)
            if replacement not in matched_str:
                masked_items.append({
                    "type": item_type,
                    "original": matched_str[:4] + "***" if len(matched_str) > 4 else "***",
                    "masked": replacement
                })
        sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)

    return sanitized, masked_items


# ==============================================================================
# 2. CORPORATE KNOWLEDGE BASE & RAG RETRIEVAL ENGINE (SQLite Persistent)
# ==============================================================================

def tokenize(text: str) -> List[str]:
    """แยกคำอย่างง่ายสำหรับภาษาไทยและอังกฤษ"""
    cleaned = re.sub(r'[^\w\s]', ' ', text.lower())
    words = re.findall(r'[a-zA-Z0-9]+|[\u0E00-\u0E7F]+', cleaned)
    return [w for w in words if len(w) > 1]

def chunk_text(content: str, chunk_size: int = 600, overlap: int = 100) -> List[str]:
    """หั่นเอกสารออกเป็นท่อนย่อย (Chunking) เพื่อนำไปทำ RAG"""
    content = content.strip()
    if len(content) <= chunk_size:
        return [content]

    chunks = []
    start = 0
    while start < len(content):
        end = min(start + chunk_size, len(content))
        if end < len(content):
            split_pos = content.rfind('\n', start + chunk_size // 2, end)
            if split_pos == -1:
                split_pos = content.rfind(' ', start + chunk_size // 2, end)
            if split_pos != -1:
                end = split_pos

        chunk = content[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap

    return chunks

def ingest_document(title: str, content: str, doc_type: str = "markdown", tags: List[str] = None) -> Dict[str, Any]:
    """บันทึกเอกสารและ Chunks ลงใน SQLite Database ถาวร"""
    doc_id = str(uuid.uuid4())[:8]
    created_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    tags = tags or []
    tags_json = json.dumps(tags, ensure_ascii=False)

    text_chunks = chunk_text(content)
    preview = content[:180] + ("..." if len(content) > 180 else "")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO documents (id, title, content, doc_type, tags, chunk_count, preview, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (doc_id, title, content, doc_type, tags_json, len(text_chunks), preview, created_at))

    for idx, c_text in enumerate(text_chunks):
        chunk_id = f"{doc_id}-{idx}"
        cursor.execute("""
            INSERT INTO rag_chunks (id, doc_id, doc_title, chunk_index, chunk_text)
            VALUES (?, ?, ?, ?, ?)
        """, (chunk_id, doc_id, title, idx, c_text))

    conn.commit()
    conn.close()

    return {
        "id": doc_id,
        "title": title,
        "content": content,
        "doc_type": doc_type,
        "tags": tags,
        "created_at": created_at,
        "chunk_count": len(text_chunks),
        "preview": preview
    }

def get_all_documents() -> List[Dict[str, Any]]:
    """ดึงเอกสารทั้งหมดจาก SQLite Database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()

    docs = []
    for r in rows:
        tags = []
        if r["tags"]:
            try:
                tags = json.loads(r["tags"])
            except Exception:
                tags = []
        docs.append({
            "id": r["id"],
            "title": r["title"],
            "content": r["content"],
            "doc_type": r["doc_type"],
            "tags": tags,
            "chunk_count": r["chunk_count"],
            "preview": r["preview"],
            "created_at": r["created_at"]
        })
    return docs

def get_chunks_count() -> int:
    """นับจำนวน Chunks ทั้งหมดใน SQLite"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM rag_chunks")
    count = cursor.fetchone()[0]
    conn.close()
    return count

def delete_document(doc_id: str) -> bool:
    """ลบเอกสารและ chunks ออกจาก SQLite Database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    cursor.execute("DELETE FROM rag_chunks WHERE doc_id = ?", (doc_id,))
    changes = conn.total_changes
    conn.commit()
    conn.close()
    return changes > 0

def search_rag_context(query: str, top_k: int = 3) -> List[Dict[str, Any]]:
    """
    RAG Retrieval: ค้นหาท่อนเอกสารจาก SQLite Database
    ที่เกี่ยวข้องกับคำค้นหามากที่สุด
    """
    if not query.strip():
        return []

    q_words = tokenize(query)
    if not q_words:
        return []

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, doc_id, doc_title, chunk_index, chunk_text FROM rag_chunks")
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return []

    scored_chunks = []
    for row in rows:
        c_text = row["chunk_text"]
        c_words = tokenize(c_text)
        chunk_words_set = set(c_words)
        overlap = chunk_words_set.intersection(q_words)
        if not overlap:
            continue

        c_counter = Counter(c_words)
        score = sum(c_counter[w] for w in overlap) / (math.sqrt(len(chunk_words_set)) + 1.0)
        
        # Bonus for exact phrase
        for qw in q_words:
            if len(qw) > 3 and qw in c_text.lower():
                score += 1.5

        scored_chunks.append({
            "doc_id": row["doc_id"],
            "doc_title": row["doc_title"],
            "chunk_index": row["chunk_index"],
            "chunk_text": c_text,
            "score": round(score, 3)
        })

    scored_chunks.sort(key=lambda x: x["score"], reverse=True)
    return scored_chunks[:top_k]

def seed_initial_knowledge_base():
    """เพิ่มเอกสารเริ่มต้นขององค์กรลง SQLite หากยังไม่มีเอกสารใดๆ"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM documents")
    count = cursor.fetchone()[0]
    conn.close()

    if count == 0:
        ingest_document(
            title="E-Commerce & Payment Architecture Spec v2.4",
            content="""# Enterprise Payment & Order Processing Architecture Spec
## Modules
- `PaymentService.py`: รองรับการตัดเงินผ่าน PromptPay QR, Credit Card (2C2P / Stripe) และ Webhook Notification
- `OrderService.py`: จัดการ Order Lifecycle (PENDING, PAID, SHIPPING, COMPLETED, CANCELLED)
- `AuthService.py`: JWT Token Based Authentication & RBAC (Roles: Admin, Manager, User)
- `InventoryService.py`: ตรวจสอบและตัด Stock สินค้าแบบ Pessimistic Locking

## Database Schema (PostgreSQL / SQLite)
- Table `orders`: id (UUID), user_id, total_amount, status, created_at, updated_at
- Table `payments`: id, order_id, gateway, transaction_ref, amount, status, raw_response
- Table `order_items`: id, order_id, product_id, quantity, unit_price
- Table `users`: id, email, password_hash, role, is_active

## Security & Compliance
- ระบบใช้ HTTPS TLS 1.3 และเข้ารหัสฟิลด์ข้อมูลสำคัญตามมาตรฐาน PDPA & PCI-DSS
- ห้ามเก็บเลข CVV / CVC ของบัตรเครดิตลงในฐานข้อมูลโดยเด็ดขาด""",
            doc_type="prd",
            tags=["Payment", "Architecture", "PostgreSQL", "Core"]
        )

        ingest_document(
            title="Notification & Webhook Integration Guide",
            content="""# Notification & Messaging Integration
## Services
- `LineNotifyService.py`: ยิงแจ้งเตือนสถานะออเดอร์ไปยัง LINE Messaging API (Flex Messages)
- `EmailNotificationService.py`: ส่ง Email Receipt ให้ลูกค้าผ่าน SendGrid SMTP
- `AuditLogService.py`: บันทึก Audit Log ลงตาราง `audit_logs` สำหรับเหตุการณ์สำคัญ

## Tables
- Table `notification_logs`: id, recipient, channel (EMAIL/LINE/SMS), status, sent_at
- Table `audit_logs`: id, actor_id, action, target_entity, payload_diff, created_at""",
            doc_type="markdown",
            tags=["Notification", "Webhook", "Audit"]
        )

seed_initial_knowledge_base()


# ==============================================================================
# 3. TRANSLATION & GEMINI AI INTEGRATION WITH RAG & IMPACT ANALYSIS
# ==============================================================================

async def translate_with_gemini(
    input_text: str,
    mode: str,
    api_key: str = None,
    project_context: str = None,
    budget_level: str = None,
    timeline_constraint: str = None,
    use_rag: bool = True,
    sanitize_pii: bool = True,
    security_mode: str = "cloud"
) -> Tuple[Dict[str, Any], bool, str, List[Dict[str, str]], List[Dict[str, Any]]]:
    """
    กระบวนการแปลภาษาหลัก:
    1. Masking PII / Secret Sanitization
    2. RAG Context Retrieval จาก SQLite Corporate Knowledge Base
    3. เรียก Gemini AI หรือ Local Engine พร้อมสร้าง Legacy Impact Analysis
    """
    # 1. PII Sanitization
    processed_text = input_text
    masked_items = []
    if sanitize_pii:
        processed_text, masked_items = sanitize_text(input_text)

    # 2. RAG Knowledge Retrieval
    rag_sources = []
    rag_context_str = ""
    if use_rag:
        rag_sources = search_rag_context(processed_text, top_k=3)
        if rag_sources:
            rag_context_str = "\n[เอกสารสถาปัตยกรรมระบบเดิมขององค์กรที่เกี่ยวข้อง (Corporate Knowledge Base Context)]:\n"
            for idx, src in enumerate(rag_sources, 1):
                rag_context_str += f"--- เอกสารที่ {idx}: {src['doc_title']} ---\n{src['chunk_text']}\n\n"

    key = api_key if api_key and api_key.strip() else DEFAULT_KEY

    ctx_parts = []
    if project_context and project_context.strip():
        ctx_parts.append(f"Tech Stack เดิม: {project_context.strip()}")
    if budget_level and budget_level.strip():
        ctx_parts.append(f"ระดับงบประมาณ (Budget Level): {budget_level.strip()}")
    if timeline_constraint and timeline_constraint.strip():
        ctx_parts.append(f"กรอบเวลาพัฒนา (Timeline Constraint): {timeline_constraint.strip()}")

    context_str = ""
    if ctx_parts:
        context_str = f"\n[บริบทโปรเจกต์และข้อจำกัดขององค์กร]: {', '.join(ctx_parts)}\n"

    # 3. Formulate Prompt using Centralized Prompts Module
    if mode == 'human-to-tech':
        prompt_user = build_human_to_tech_prompt(processed_text, context_str, rag_context_str)
    else:
        prompt_user = build_tech_to_human_prompt(processed_text, context_str, rag_context_str)

    # If security_mode is private-local or no key, use enhanced local engine directly
    print(f"DEBUG translate_with_gemini: key_present={bool(key and key.strip())}, key_len={len(key) if key else 0}, security_mode={security_mode}")
    if security_mode == "private-local" or not key:
        print("DEBUG: Using local fallback because private-local or no key provided.")
        local_data = generate_local_fallback(processed_text, mode, project_context, rag_sources)
        return local_data, False, processed_text, masked_items, rag_sources

    request_body = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"{SYSTEM_PROMPT}\n\n{prompt_user}"}]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "topP": 0.8,
            "responseMimeType": "application/json"
        }
    }

    async with httpx.AsyncClient(timeout=16.0) as client:
        for model in CANDIDATE_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key.strip()}"
            try:
                print(f"DEBUG: Calling Gemini model {model}...")
                resp = await client.post(url, json=request_body)
                print(f"DEBUG: Model {model} response status: {resp.status_code}")
                if resp.status_code == 200:
                    res_data = resp.json()
                    raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                    cleaned = raw_text.replace("```json", "").replace("```", "").strip()
                    parsed = json.loads(cleaned)
                    print(f"DEBUG: Model {model} SUCCESS! is_ai=True")
                    return parsed, True, processed_text, masked_items, rag_sources
                else:
                    print(f"DEBUG: Model {model} error: {resp.text[:300]}")
            except Exception as e:
                print(f"DEBUG: Model {model} exception: {e}")

    # Fallback to local rule engine
    print("DEBUG: All models failed or unavailable. Falling back to local engine.")
    local_data = generate_local_fallback(processed_text, mode, project_context, rag_sources)
    return local_data, False, processed_text, masked_items, rag_sources


def generate_local_fallback(text: str, mode: str, project_context: str = None, rag_sources: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Local Fallback Engine พร้อม Impact Analysis จาก RAG Context แบบสังเคราะห์สาระใหม่ ไม่ทวนคำสั่ง"""
    ctx_desc = f" (สอดคล้องกับสถาปัตยกรรม: {project_context})" if project_context and project_context.strip() else ""
    
    affected_modules = ["PaymentService.py", "OrderService.py"]
    affected_tables = ["orders", "payments"]
    
    if rag_sources:
        for src in rag_sources:
            txt = src["chunk_text"]
            found_mods = re.findall(r'`([A-Za-z0-9_]+\.py)`', txt)
            if found_mods:
                affected_modules.extend(found_mods)
            found_tabs = re.findall(r'Table `([A-Za-z0-9_]+)`', txt)
            if found_tabs:
                affected_tables.extend(found_tabs)

    affected_modules = list(dict.fromkeys(affected_modules))[:4]
    affected_tables = list(dict.fromkeys(affected_tables))[:4]

    lower_text = text.lower()

    if mode == 'human-to-tech':
        tech_stack = [
            {"name": "React + Vite", "desc": "สำหรับระบบ Front-end User Interface ที่รวดเร็ว"},
            {"name": "FastAPI + Python", "desc": "สำหรับ Back-end High Performance REST API"},
            {"name": "SQLite / PostgreSQL", "desc": "สำหรับระบบฐานข้อมูลที่มีความปลอดภัยสูงและจัดเก็บข้อมูลถาวร"}
        ]
        if project_context and project_context.strip():
            tech_stack.insert(0, {"name": "Specified Context Stack", "desc": project_context.strip()})

        # สังเคราะห์ Category และ Core Action จากคำสำคัญ
        # 1. เช็ค Authentication / OAuth / Social Login ก่อนปุ่มเสมอ
        is_auth_sso = any(w in lower_text for w in ["เข้าสู่ระบบ", "สมัคร", "รหัสผ่าน", "password", "login", "oauth", "sso", "google", "line", "บัญชี"])
        is_ui_only = any(w in lower_text for w in ["ปุ่ม", "หน้าจอ", "สี", "ui", "ux", "วิบวับ", "สวย", "ธีม", "animation"])
        
        if is_auth_sso:
            domain_summary = "ออกแบบและพัฒนาระบบยืนยันตัวตนแบบรวมศูนย์ (OAuth 2.0 / SSO) รองรับ Google และ LINE"
            affected_modules = ["AuthService.py", "UserService.py"]
            affected_tables = ["users", "user_oauth_accounts"]
            return {
                "summary": f"{domain_summary}{ctx_desc}",
                "technicalRequirements": [
                    "[Frontend Component] ฝัง Google One Tap / Identity SDK และ LINE Login SDK พร้อมปุ่ม SSO ตาม Brand Guidelines และจัดเก็บ Redirect State",
                    "[Backend Service] พัฒนา REST API Endpoint `/api/v1/auth/social/callback` ทำ Token Exchange แลก Authorization Code เป็น Access Token / ID Token พร้อมตรวจสอบ JWT Signature",
                    "[Database Layer] เพิ่มตาราง `user_oauth_accounts` (user_id, provider, provider_user_id, email, access_token_enc) พร้อมสร้าง Unique Index บนคู่ (provider, provider_user_id)",
                    "[Security & Compliance] ตรวจสอบ CSRF State Token, ป้องกัน Account Hijacking ด้วยระบบ Account Merging อัตโนมัติ และสอดคล้องกับ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)"
                ],
                "techStack": [
                    {"name": "React + Vite", "desc": "สำหรับจัดการ Client-side OAuth Redirect State และ Session ผู้ใช้งาน"},
                    {"name": "FastAPI + PyJWT / Authlib", "desc": "สำหรับทำ Token Exchange และตรวจสอบลายเซ็น JWT ด้วย JWKS"},
                    {"name": "PostgreSQL / SQLite", "desc": "จัดเก็บความสัมพันธ์บัญชีผู้ใช้งานและ Identity Mapping"}
                ],
                "impactAnalysis": {
                    "affectedModules": affected_modules,
                    "affectedTables": affected_tables,
                    "refactoringEffortDays": "1 - 2 วันทำการ",
                    "impactSeverity": "Medium",
                    "riskMitigation": "เตรียม Flow สำหรับกรณีผู้ใช้ปฏิเสธการแชร์อีเมลจาก LINE และทำระบบตรวจสอบอีเมลซ้ำกับบัญชีเดิมเพื่อป้องกันข้อมูลสูญหาย"
                },
                "acceptanceCriteria": [
                    "[AC-1] Given ผู้ใช้งานใหม่กดปุ่ม Login with Google/LINE, When ยืนยันสิทธิ์สำเร็จ, Then ระบบต้องสร้าง User ใหม่และออก JWT Token กลับมาภายใน 1 วินาที",
                    "[AC-2] Given ผู้ใช้งานเดิมมีบัญชีอีเมลนี้อยู่แล้ว, When เข้าสู่ระบบด้วย Social Login, Then ต้องเชื่อมโยง (Account Link) กับบัญชีเดิมอย่างปลอดภัยโดยข้อมูลไม่ซ้ำซ้อน"
                ],
                "nonFunctionalRequirements": [
                    "[Security Standard] รองรับ OAuth 2.0 + OpenID Connect (OIDC) และเข้ารหัส Token ในฐานข้อมูลด้วย AES-256",
                    "[Performance SLA] เวลาทำ Token Exchange และเข้าสู่ระบบสำเร็จต้องน้อยกว่า 800ms"
                ],
                "apiDraft": [
                    "POST /api/v1/auth/social/callback (Request: { provider: 'google', code: 'auth_code_xxx', state: 'csrf_token' })",
                    "GET /api/v1/auth/me (Response: { id: 1, email: 'user@example.com', provider: 'google' })"
                ],
                "riskAnalysis": [
                    "ผู้ใช้ LINE บางรายอาจไม่อนุญาตให้ดึงอีเมล (Email Permission Scope) ต้องเตรียม UI รองรับ fallback ให้กรอกอีเมลเพิ่มเติม",
                    "ความเสี่ยงเรื่อง Account Collision เมื่อผู้ใช้มีอีเมลเดียวกันจากหลาย Social Provider"
                ],
                "suggestedQuestions": [
                    "มีการจดทะเบียน LINE Login Channel บน LINE Developers Console เรียบร้อยแล้วหรือไม่?",
                    "ต้องการให้เชื่อมโยงบัญชีอัตโนมัติทันทีหากพบอีเมลตรงกัน หรือต้องการให้ยืนยันตัวตนด้วยรหัสผ่านเดิมก่อน?"
                ],
                "effortEstimation": {
                    "complexity": "Medium",
                    "estimatedManDays": "3 - 4 วันทำการ",
                    "estimatedCostRange": "18,000 - 28,000 บาท",
                    "reasoning": "พัฒนา Frontend SSO Buttons 1 วัน, พัฒนา OAuth Backend & Token Verification 1.5 วัน, วางโครงสร้าง Database & Account Linking 1 วัน"
                }
            }

        elif is_ui_only:
            domain_summary = "ออกแบบและพัฒนาระบบ Interactive UI Component พร้อม Micro-interactions"
            return {
                "summary": f"{domain_summary}{ctx_desc}",
                "technicalRequirements": [
                    "[Frontend Component] พัฒนา Dynamic Button Component ด้วย CSS Keyframes (Shimmer / Glow Animation) พร้อม Hover/Active State",
                    "[Accessibility & UX] รองรับ prefers-reduced-motion เพื่อไม่ให้รบกวนผู้ใช้งานที่มีปัญหาทางสายตา และรองรับ Responsive Touch Target บนมือถือ (ขั้นต่ำ 44x44px)",
                    "[Analytics Telemetry] ฝัง Event Tracking (Click-through Rate) เพื่อเก็บสถิติ Conversion Rate ผ่าน Client-side Analytics",
                    "[Backend / Database Layer] ไม่มีผลกระทบ (Frontend-only feature ไม่มีการเปลี่ยนแปลง API หรือ Database)"
                ],
                "techStack": [
                    {"name": "React + Vite", "desc": "สำหรับสร้าง UI Component ที่ตอบสนองไว"},
                    {"name": "CSS Keyframes / Tailwind", "desc": "สำหรับทำ Micro-interactions และ Shimmer Effect ที่ลื่นไหล 60 FPS"}
                ],
                "impactAnalysis": {
                    "affectedModules": ["LandingPage.jsx", "ButtonComponent.jsx"],
                    "affectedTables": [],
                    "refactoringEffortDays": "0 วันทำการ (ไม่มีผลกระทบต่อ Backend Core Services)",
                    "impactSeverity": "Low",
                    "riskMitigation": "ทดสอบ Cross-browser Compatibility (Safari, Chrome, Mobile) และตรวจสอบว่า Animation ไม่รบกวนการอ่านเนื้อหาหลัก"
                },
                "acceptanceCriteria": [
                    "[AC-1] Given ผู้ใช้งานเปิดหน้าจอ, When ปุ่มแสดงผล, Then ต้องมี Shimmer Animation นุ่มนวลโดยไม่เกิด Frame Drop",
                    "[AC-2] Given ผู้ใช้งานคลิกที่ปุ่ม, When มีการกด, Then ต้องส่ง Analytics Event สำเร็จและนำทางไปยังฟังก์ชันเป้าหมายได้ถูกต้อง"
                ],
                "nonFunctionalRequirements": [
                    "[Performance] UI Animation ต้องทำงานระดับ 60 FPS โดยใช้ GPU Hardware Acceleration (transform / opacity)",
                    "[Accessibility] สอดคล้องกับมาตรฐาน WCAG 2.1 AA สำหรับ Color Contrast และ Touch Target Size"
                ],
                "apiDraft": [
                    "Client Analytics Event: trackEvent('cta_button_click', { button_name: 'hero_shimmer_cta' })"
                ],
                "riskAnalysis": [
                    "ระวังการใช้เอฟเฟกต์ที่ฉูดฉาดเกินไปจนดึงความสนใจออกจากเนื้อหาสำคัญของเว็บไซต์"
                ],
                "suggestedQuestions": [
                    "ต้องการให้ปุ่มนี้ลิงก์ไปยังหน้าใดเป็นเป้าหมายหลัก (เช่น หน้าสมัครสมาชิก หรือ หน้าชำระเงิน)?",
                    "มีเกณฑ์สีแบรนด์เฉพาะสำหรับเอฟเฟกต์ Shimmer หรือไม่?"
                ],
                "effortEstimation": {
                    "complexity": "Low",
                    "estimatedManDays": "0.5 - 1 วันทำการ",
                    "estimatedCostRange": "3,000 - 6,000 บาท",
                    "reasoning": "เน้นงานเขียน CSS Animation, Component Styling, ทดสอบ Mobile Touch Target และเชื่อมต่อ Event Tracking"
                }
            }

        elif any(w in lower_text for w in ["จ่าย", "เงิน", "ชำระ", "payment", "bank", "โอน"]):
            domain_summary = "พัฒนาระบบ Payment Gateway Integration & Transaction Verification"
            domain_feature = "Payment Settlement & Webhook Processing"
            api_endpoint = "POST /api/v1/payments/checkout"
        elif any(w in lower_text for w in ["เตือน", "แจ้ง", "notify", "notification", "email", "sms", "line"]):
            domain_summary = "พัฒนาระบบ Event-Driven Multi-Channel Notification Dispatcher"
            domain_feature = "Automated Event Messaging & Alert Queue"
            api_endpoint = "POST /api/v1/notifications/send"
        elif any(w in lower_text for w in ["ค้นหา", "search", "กรอง", "filter"]):
            domain_summary = "พัฒนาระบบ Advanced Search & Dynamic Multi-Criteria Filtering Engine"
            domain_feature = "Full-text Search & Indexed Query Retrieval"
            api_endpoint = "GET /api/v1/products/search"
            affected_modules = ["ProductService.py", "CatalogService.py"]
            affected_tables = ["products", "categories"]
            return {
                "summary": f"{domain_summary}{ctx_desc}",
                "technicalRequirements": [
                    "[Frontend Component] พัฒนา Dynamic Search Box พร้อม Debounce Filtering และ UI Chips สำหรับเลือกหมวดหมู่สินค้า",
                    "[Backend Service] พัฒนา Search REST API รองรับ Multi-field Query (ชื่อสินค้า, ช่วงราคา, หมวดหมู่) และ Cursor-based Pagination",
                    f"[Database Layer] สร้าง B-Tree Composite Index บนตาราง ({', '.join(affected_tables)}) คอลัมน์ (category_id, price) เพื่อเร่งความเร็ว Query",
                    "[Security & Performance] ป้องกัน SQL Injection ด้วย Parameterized Query และทำ Result Caching เพื่อลดภาระ Database"
                ],
                "techStack": [
                    {"name": "React + Vite", "desc": "สำหรับระบบ Search Box และ Instant Filter UI"},
                    {"name": "FastAPI + SQLAlchemy", "desc": "สำหรับสร้าง High-Performance Search API"},
                    {"name": "PostgreSQL / SQLite", "desc": "สำหรับรองรับ Indexing และ Full-Text Search"}
                ],
                "impactAnalysis": {
                    "affectedModules": affected_modules,
                    "affectedTables": affected_tables,
                    "refactoringEffortDays": "1 - 2 วันทำการ",
                    "impactSeverity": "Low",
                    "riskMitigation": "ทดสอบ Query Performance ด้วย EXPLAIN ANALYZE เพื่อให้มั่นใจว่าค้นหาได้รวดเร็วภายใต้ 100ms"
                },
                "acceptanceCriteria": [
                    "[AC-1] Given ผู้ใช้งานพิมพ์ค้นหาชื่อสินค้าบางคำ, When หยุดพิมพ์เกิน 300ms, Then ระบบต้องแสดงรายการสินค้าที่ตรงกันทันที",
                    "[AC-2] Given ผู้ใช้งานเลือกตัวกรองช่วงราคาหรือหมวดหมู่, When ปรับตัวกรอง, Then หน้าจอต้องอัปเดตรายการสินค้าที่ตรงตามเงื่อนไขภายใน 300ms"
                ],
                "nonFunctionalRequirements": [
                    "[Performance SLA] Search Query Latency < 150ms ที่ระดับ 50,000 รายการสินค้า",
                    "[Accessibility] Search Input ต้องรองรับ Keyboard Navigation (Arrow Keys / Enter)"
                ],
                "apiDraft": [
                    f"{api_endpoint}?q=keyword&category=1&min_price=100&max_price=500",
                    "GET /api/v1/categories (Response: [{ 'id': 1, 'name': 'Electronics' }])"
                ],
                "riskAnalysis": [
                    "หากจำนวนสินค้าเพิ่มขึ้นเป็นหลักแสนรายการ อาจต้องพิจารณาขยายไปใช้ Elasticsearch หรือ Meilisearch ในอนาคต"
                ],
                "suggestedQuestions": [
                    "ต้องการให้รองรับการค้นหาคำผิด (Fuzzy Search / Typo Tolerance) ด้วยหรือไม่?",
                    "มีเกณฑ์การจัดอันดับผลการค้นหา (Ranking/Relevance) เช่น สินค้าขายดีขึ้นก่อนหรือไม่?"
                ],
                "effortEstimation": {
                    "complexity": "Medium",
                    "estimatedManDays": "1.5 - 2.5 วันทำการ",
                    "estimatedCostRange": "10,000 - 18,000 บาท",
                    "reasoning": "พัฒนา Search UI + Debounce 0.5 วัน, พัฒนา API + Dynamic Query Builder 1 วัน, สร้าง Database Index และทดสอบ 0.5 วัน"
                }
            }

        elif any(w in lower_text for w in ["จ่าย", "เงิน", "ชำระ", "payment", "bank", "โอน"]):
            domain_summary = "พัฒนาระบบ Payment Gateway Integration & Transaction Verification"
            domain_feature = "Payment Settlement & Webhook Processing"
            api_endpoint = "POST /api/v1/payments/checkout"
            affected_modules = ["PaymentService.py", "OrderService.py"]
            affected_tables = ["orders", "payments"]
        elif any(w in lower_text for w in ["เตือน", "แจ้ง", "notify", "notification", "email", "sms", "line"]):
            domain_summary = "พัฒนาระบบ Event-Driven Multi-Channel Notification Dispatcher"
            domain_feature = "Automated Event Messaging & Alert Queue"
            api_endpoint = "POST /api/v1/notifications/send"
            affected_modules = ["NotificationService.py", "OrderService.py", "LineNotifyService.py"]
            affected_tables = ["orders", "notification_logs"]
        else:
            domain_summary = "ออกแบบและพัฒนาระบบประมวลผลข้อมูลและ Business Workflow อัตโนมัติ"
            domain_feature = "Automated Business Logic & Data Processing"
            api_endpoint = "POST /api/v1/workflows/execute"

        return {
            "summary": f"{domain_summary}{ctx_desc}",
            "technicalRequirements": [
                f"[Frontend Component] พัฒนา UI Component สำหรับ {domain_feature} รองรับ State Management, Responsive Design และ Client-side Validation",
                f"[Backend Service] พัฒนา REST API Service สำหรับประมวลผลคำขอ พร้อมทำ DTO Schema Validation และ Exception Handling",
                f"[Database Layer] อัปเดต Table Schema ({', '.join(affected_tables)}), กำหนด Foreign Key Constraints และสร้าง Index เพื่อเพิ่มความเร็วในการ Query",
                "[Security & Guardrails] ตรวจสอบ Role-Based Access Control (RBAC), ป้องกัน OWASP Vulnerabilities และทำ Input Sanitization"
            ],
            "techStack": tech_stack,
            "impactAnalysis": {
                "affectedModules": affected_modules,
                "affectedTables": affected_tables,
                "refactoringEffortDays": "2 - 3 วันทำการ",
                "impactSeverity": "Medium" if len(affected_modules) > 1 else "Low",
                "riskMitigation": "สร้าง Unit Test และ Integration Test ครอบคลุมฟังก์ชันการทำงานเดิมก่อน Deploy พร้อมเตรียม Database Migration Rollback Plan"
            },
            "acceptanceCriteria": [
                "[AC-1] Given ผู้ใช้งานที่มีสิทธิ์เข้าสู่ระบบ, When ส่งคำขอการทำงานผ่านหน้าจอหรือ API, Then ระบบต้องประมวลผลและตอบกลับผลลัพธ์สำเร็จภายใน 500ms",
                "[AC-2] Given ข้อมูลที่ส่งเข้ามาไม่ผ่านเกณฑ์ Validation หรือมีฟิลด์ไม่ครบ, When ระบบตรวจสอบ, Then ต้องส่งรหัสสถานะ 422 Unprocessable Entity พร้อมระบุฟิลด์ที่ผิดพลาด",
                "[AC-3] Given เกิดข้อผิดพลาดของ External Service หรือ Database Timeout, When ทริกเกอร์ Circuit Breaker, Then ต้องมี Fallback Graceful Degradation และบันทึก Audit Log"
            ],
            "nonFunctionalRequirements": [
                "[Performance SLA] API Latency < 300ms ที่ระดับ 1,000 Concurrent Requests",
                "[Security & PDPA] เข้ารหัสข้อมูลสำคัญตามมาตรฐาน AES-256 (Encryption at Rest) และส่งผ่าน HTTPS/TLS 1.3"
            ],
            "apiDraft": [
                f"{api_endpoint} (Request Payload: {{ 'action': 'SUBMIT', 'requestId': 'uuid-v4' }})",
                "GET /api/v1/system/health (Response: { 'status': 'UP', 'cluster': 'active' })"
            ],
            "riskAnalysis": [
                f"ความเสี่ยงเรื่อง Concurrency และ Backward Compatibility กับโมดูลเดิม ({', '.join(affected_modules)})",
                "การจัดการ Rate Limiting หากมีปริมาณ Transaction เพิ่มขึ้นอย่างกะทันหัน"
            ],
            "suggestedQuestions": [
                "มีข้อกำหนดด้านสิทธิ์การเข้าถึง (Permission Matrix / Role-based Access) เฉพาะกลุ่มผู้ใช้หรือไม่?",
                "ต้องการให้ระบบส่งแจ้งเตือนผ่านช่องทางใดเพิ่มเติมหรือไม่ (เช่น Telegram Bot, LINE, Email)?"
            ],
            "effortEstimation": {
                "complexity": "Medium",
                "estimatedManDays": "3 - 5 วันทำการ",
                "estimatedCostRange": "20,000 - 35,000 บาท",
                "reasoning": f"พัฒนา UI Component และ State 1.5 วัน, สร้างและทดสอบ Backend REST API 2 วัน, ปรับปรุงโมดูลเดิม ({', '.join(affected_modules[:2])}) พร้อมทำ Regression Test 1 วัน"
            }
        }
    else:
        # Tech-to-Human สังเคราะห์ปัญหาและการอุปมาอุปไมยตามบริบทที่คมชัด
        if any(w in lower_text for w in ["cors", "403", "forbidden", "preflight", "origin", "auth", "permission", "สิทธิ์"]):
            issue_title = "การตรวจสอบสิทธิ์ความปลอดภัยในการรับส่งข้อมูลระหว่างหน้าเว็บกับเซิร์ฟเวอร์เกิดความคลาดเคลื่อนชั่วคราว"
            analogy_icon = "🔐"
            analogy_title = "เปรียบเสมือน: ระบบสแกนคีย์การ์ดหน้าประตูอาคารที่มีการปรับปรุงรหัสผ่านใหม่เพื่อความปลอดภัย"
            analogy_desc = "เหมือนเจ้าหน้าที่รักษาความปลอดภัยกำลังปรับเทียบสัญญาณคีย์การ์ดหน้าประตู เพื่อให้เฉพาะผู้ที่มีสิทธิ์สามารถเปิดเข้าใช้งานได้อย่างถูกต้องและปลอดภัยสูงสุดครับ"
        elif any(w in lower_text for w in ["database", "deadlock", "lock", "pool", "query", "sql"]):
            issue_title = "ระบบจัดเก็บข้อมูลมีความหนาแน่นของการเรียกใช้งานพร้อมกันสูง"
            analogy_icon = "🗄️"
            analogy_title = "เปรียบเสมือน: ห้องสมุดที่มีผู้เข้าค้นหาหนังสือเล่มเดียวกันพร้อมกันหลายท่าน"
            analogy_desc = "เหมือนบรรณารักษ์กำลังจัดคิวเปิดช่องให้บริการค้นหาเพิ่ม เพื่อให้ทุกท่านยืมหนังสือได้รวดเร็วโดยไม่ต้องยืนรอคิวครับ"
        elif any(w in lower_text for w in ["memory", "ram", "cpu", "leak", "oom", "oomkilled", "พุ่ง", "เต็ม", "ช้า", "ค้าง"]):
            issue_title = "ทรัพยากรการประมวลผลของเครื่องแม่ข่ายทำงานเต็มพิกัดชั่วขณะ"
            analogy_icon = "🚗"
            analogy_title = "เปรียบเสมือน: คอมพิวเตอร์ที่เปิดแอปพลิเคชันพร้อมกันจำนวนมากจนเครื่องต้องพักล้างความจำชั่วคราว"
            analogy_desc = "เหมือนระบบกำลังรีเฟรชเคลียร์โต๊ะทำงานและจัดสรรหน่วยความจำสำรองเพิ่มเติม เพื่อให้กลับมารองรับงานได้ลื่นไหลเต็มความเร็วครับ"
        elif any(w in lower_text for w in ["network", "api", "timeout", "เชื่อมต่อ", "ล่ม", "down", "500", "502", "504"]):
            issue_title = "ช่องทางเชื่อมต่อรับส่งข้อมูลระหว่างเซิร์ฟเวอร์เกิดการสะดุดชั่วคราว"
            analogy_icon = "🚰"
            analogy_title = "เปรียบเสมือน: ท่อส่งน้ำประปาที่มีการสลับวาล์วไปยังท่อสำรอง"
            analogy_desc = "เหมือนระบบกำลังสลับไปใช้ท่อส่งน้ำสายสำรอง เพื่อให้น้ำไหลเวียนได้ต่อเนื่องและแรงดันสม่ำเสมอครับ"
        else:
            issue_title = "ระบบกำลังอยู่ในขั้นตอนการปรับแต่งประสิทธิภาพและจัดระเบียบข้อมูลเบื้องหลัง"
            analogy_icon = "🛠️"
            analogy_title = "เปรียบเสมือน: การตรวจเช็กระยะและปรับจูนเครื่องยนต์ตามรอบการใช้งาน"
            analogy_desc = "เหมือนการนำรถเข้าศูนย์บริการเพื่อเปลี่ยนถ่ายน้ำมันหล่อลื่นและตรวจความพร้อม เพื่อให้ขับขี่ได้อย่างราบรื่นและปลอดภัยสูงสุดครับ"

        return {
            "summary": issue_title,
            "politeExplanation": f"เรียนท่านลูกค้าและทีมงาน ทางทีมวิศวกรได้เข้าควบคุมและตรวจสอบสถานการณ์เรียบร้อยแล้วครับ สาเหตุเกิดจาก{issue_title} ขณะนี้ทีมงานกำลังดำเนินการขยายขีดความสามารถและจัดระเบียบระบบสำรอง เพื่อให้ระบบกลับมาทำงานได้อย่างเสถียร รวดเร็ว และข้อมูลปลอดภัย 100% ครับ",
            "analogy": {
                "icon": analogy_icon,
                "title": analogy_title,
                "description": analogy_desc
            },
            "impact": "ผู้ใช้งานอาจพบการตอบสนองที่ชะลอตัวลงเล็กน้อยในบางช่วงเวลาสั้นๆ โดยไม่มีข้อมูลสูญหายอย่างแน่นอน",
            "estimatedTime": "ทีมงานกำลังเร่งดำเนินการและคาดว่าจะเสร็จสิ้นการปรับปรุงพร้อมทดสอบระบบภายใน 30-45 นาทีนี้ครับ"
        }
