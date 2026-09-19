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

init_db()

SYSTEM_PROMPT = """คุณคือ "ล่ามแปลภาษาไอทีอัจฉริยะระดับองค์กร (Enterprise IT-to-Human Translator & Architecture Advisor)" ผู้เชี่ยวชาญด้านวิทยาการคอมพิวเตอร์ สถาปัตยกรรมซอฟต์แวร์ และการบริหารจัดการโปรเจกต์ซอฟต์แวร์

หน้าที่หลักของคุณคือ:
1. [Human-to-Tech]: แปลความต้องการของลูกค้าหรือฝ่ายธุรกิจ ให้เป็น Technical Requirements, Architecture Specifications, Database/Module Impact Analysis, และ Acceptance Criteria ที่ทีมพัฒนาทำงานต่อได้ทันที
2. [Tech-to-Human]: แปลปัญหา ศัพท์เทคนิค หรือสาเหตุงานล่าช้าจากทีมโปรแกรมเมอร์ ให้เป็นคำอธิบายที่สุภาพ เข้าใจง่าย มีการใช้อุปมาอุปไมย (Analogy) เปรียบเทียบกับชีวิตประจำวัน

[ความสามารถระดับองค์กร (Enterprise Phase 2 Features)]:
- วิเคราะห์ผลกระทบต่อระบบเดิม (Impact Analysis): ระบุโมดูลเดิมที่ต้องแก้ไข (Affected Modules) และตารางฐานข้อมูลที่เกี่ยวข้อง (Affected Tables)
- ประเมินระยะเวลา Refactoring (Refactoring Effort Days)
- ตรวจสอบความปลอดภัยและการปกป้องข้อมูล (Enterprise Security Guardrails)
"""

CANDIDATE_MODELS = [
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-pro"
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

    # 3. Formulate Prompt
    prompt_user = (
        f'กรุณาแปลข้อความต่อไปนี้ภายใต้โหมด [Human-to-Tech]:\n'
        f'ข้อความอินพุต: "{processed_text}"\n'
        f'{context_str}'
        f'{rag_context_str}\n'
        '**ข้อกำหนดสำคัญ (Enterprise Spec)**: ตอบกลับเป็น JSON Object เท่านั้น มีคีย์ต่อไปนี้:\n'
        '1. summary (string): สรุปเป้าหมายหลัก\n'
        '2. technicalRequirements (list of detailed strings): ข้อกำหนดทางเทคนิคเชิงลึก (Frontend, Backend, Database, Security)\n'
        '3. techStack (list of dict with name, desc): แนะนำ Tech Stack ที่สอดคล้องกับระบบเดิม\n'
        '4. impactAnalysis (dict with keys: affectedModules [list of strings], affectedTables [list of strings], refactoringEffortDays [string], impactSeverity ["Low"|"Medium"|"High"|"Critical"], riskMitigation [string]): วิเคราะห์ผลกระทบต่อโมดูล/ตารางเดิมใน Knowledge Base\n'
        '5. acceptanceCriteria (list of strings): เงื่อนไขการตรวจรับงานในรูปแบบ Given-When-Then\n'
        '6. nonFunctionalRequirements (list of strings): ข้อกำหนดด้านความปลอดภัย SLA และ PDPA\n'
        '7. apiDraft (list of strings): ร่าง API Endpoints (เช่น POST /api/v1/...)\n'
        '8. riskAnalysis (list of strings): วิเคราะห์ความเสี่ยง\n'
        '9. suggestedQuestions (list of strings): คำถามที่ควรถามลูกค้าเพิ่ม\n'
        '10. effortEstimation (dict with keys: complexity, estimatedManDays, estimatedCostRange, reasoning)\n'
        if mode == 'human-to-tech' else
        f'กรุณาแปลข้อความต่อไปนี้ภายใต้โหมด [Tech-to-Human]:\n'
        f'ข้อความอินพุต: "{processed_text}"\n'
        f'{context_str}'
        f'{rag_context_str}\n'
        'ตอบกลับในรูปแบบ JSON Object เท่านั้น มีคีย์ summary, politeExplanation, analogy (dict with icon, title, description), impact, estimatedTime'
    )

    # If security_mode is private-local or no key, use enhanced local engine directly
    if security_mode == "private-local" or not key:
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
                resp = await client.post(url, json=request_body)
                if resp.status_code == 200:
                    res_data = resp.json()
                    raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                    cleaned = raw_text.replace("```json", "").replace("```", "").strip()
                    parsed = json.loads(cleaned)
                    return parsed, True, processed_text, masked_items, rag_sources
            except Exception as e:
                print(f"Model {model} failed: {e}")

    # Fallback to local rule engine
    local_data = generate_local_fallback(processed_text, mode, project_context, rag_sources)
    return local_data, False, processed_text, masked_items, rag_sources


def generate_local_fallback(text: str, mode: str, project_context: str = None, rag_sources: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Local Fallback Engine พร้อม Impact Analysis จาก RAG Context"""
    ctx_desc = f" (ตามบริบทโปรเจกต์: {project_context})" if project_context and project_context.strip() else ""
    
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

    if mode == 'human-to-tech':
        tech_stack = [
            {"name": "React + Vite", "desc": "สำหรับระบบ Front-end User Interface ที่รวดเร็ว"},
            {"name": "FastAPI + Python", "desc": "สำหรับ Back-end High Performance REST API"},
            {"name": "SQLite / PostgreSQL", "desc": "สำหรับระบบฐานข้อมูลที่มีความปลอดภัยสูงและจัดเก็บข้อมูลถาวร"}
        ]
        if project_context and project_context.strip():
            tech_stack.insert(0, {"name": "Specified Context Stack", "desc": project_context.strip()})

        return {
            "summary": f"สรุปความต้องการเชิงธุรกิจ{ctx_desc}: {text[:60]}...",
            "technicalRequirements": [
                f"[Frontend Component] พัฒนา UI Component สำหรับฟังก์ชัน '{text[:40]}' รองรับ Responsive Layout และ Data Validation",
                f"[Backend REST API] พัฒนา API Endpoints เพื่อประมวลผลคำขอ '{text[:40]}' พร้อม Request Validation",
                f"[Database Layer] อัปเดต Data Schema และสร้าง Migration Script เพื่อรองรับข้อมูลใหม่",
                "[Security & Sanitization] ตรวจสอบ Input Sanitization และ Access Control (RBAC) ตามมาตรฐานความปลอดภัย"
            ],
            "techStack": tech_stack,
            "impactAnalysis": {
                "affectedModules": affected_modules,
                "affectedTables": affected_tables,
                "refactoringEffortDays": "2 - 3 วันทำการ",
                "impactSeverity": "Medium" if len(affected_modules) > 1 else "Low",
                "riskMitigation": "สร้าง Unit Test และ Regression Test ครอบคลุมฟังก์ชันการทำงานเดิมก่อน Deploy"
            },
            "acceptanceCriteria": [
                f"[AC-1] Given ผู้ใช้งานป้อนข้อมูล '{text[:25]}...', When กดส่งคำขอ, Then ระบบต้องตอบกลับและบันทึกข้อมูลเรียบร้อยภายใน 1 วินาที",
                "[AC-2] Given ผู้ใช้งานไม่ได้กรอกฟิลด์บังคับ, When กดส่ง, Then ระบบต้องแสดง Inline Validation Error ทันที"
            ],
            "nonFunctionalRequirements": [
                "[Performance SLA] API Latency < 500ms ที่ระดับ 1,000 Concurrent Users",
                "[Security] สอดคล้องกับมาตรฐาน PDPA และการเข้ารหัสข้อมูลสำคัญขณะจัดเก็บ (Encryption at Rest)"
            ],
            "apiDraft": [
                f"POST /api/v1/requests (Body: {{ 'payload': '{text[:30]}...', 'timestamp': '2026-09-19T...' }})",
                "GET /api/v1/requests/{id} (Response: { 'id': 1, 'status': 'SUCCESS' })"
            ],
            "riskAnalysis": [
                f"ควรตรวจสอบความเข้ากันได้กับระบบเดิม ({', '.join(affected_modules)}) เพื่อป้องกัน Breaking Changes"
            ],
            "suggestedQuestions": [
                "ต้องการให้ระบบส่งแจ้งเตือนผ่านช่องทางใดเพิ่มเติมหรือไม่ (เช่น Email, LINE Notify)?",
                "มีข้อกำหนดเรื่องสิทธิ์การเข้าถึง (Permission Matrix) เฉพาะกลุ่มผู้ใช้หรือไม่?"
            ],
            "effortEstimation": {
                "complexity": "Medium",
                "estimatedManDays": "4 - 6 วันทำการ",
                "estimatedCostRange": "20,000 - 35,000 บาท",
                "reasoning": f"รวมระยะเวลาเขียนฟีเจอร์ใหม่ 3 วัน และปรับปรุงโมดูลเดิม ({', '.join(affected_modules[:2])}) อีก 2 วันทำการ"
            }
        }
    else:
        return {
            "summary": "การอธิบายปัญหาเทคนิคและอัปเดตสถานะงานให้เข้าใจง่าย",
            "politeExplanation": f"เรียนท่านลูกค้า ทางทีมงานขอแจ้งอัปเดตสถานะการทำงานครับ จากกรณีข้อสงสัย/ปัญหาที่พบ ({text[:50]}...) ทีมพัฒนาได้ทำการตรวจสอบและปรับปรุงระบบให้มีความเสถียรและรวดเร็วยิ่งขึ้นเรียบร้อยครับ",
            "analogy": {
                "icon": "🚗",
                "title": "เปรียบเสมือน: การจัดระเบียบการจราจรบนทางด่วน",
                "description": "เหมือนการเปิดช่องทางพิเศษเพิ่มและปรับปรุงป้ายบอกทาง เพื่อให้รถสัญจรได้คล่องตัวและไม่ติดขัดครับ"
            },
            "impact": "ระบบอาจมีการตอบสนองช้าลงเล็กน้อยในบางช่วงเวลาสั้นๆ แต่ข้อมูลทั้งหมดปลอดภัย 100% ครับ",
            "estimatedTime": "ทีมงานคาดว่าจะดำเนินการตรวจสอบความเรียบร้อยทั้งหมดภายใน 1-2 ชั่วโมงนี้ครับ"
        }
