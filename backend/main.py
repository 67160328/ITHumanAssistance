import datetime
import hashlib
import secrets
from fastapi import FastAPI, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional, Any

from backend.database import get_db_connection, init_db
from backend.models import (
    TranslateRequest,
    TranslateResponse,
    UserRegisterRequest,
    UserLoginRequest,
    ChangePasswordRequest,
    AuthResponse,
    DocumentUploadRequest,
    DocumentItem,
    RAGSearchRequest,
    RAGSearchResult,
    SanitizeRequest,
    SanitizeResponse
)
from backend.services import (
    translate_with_gemini,
    sanitize_text,
    ingest_document,
    get_all_documents,
    get_chunks_count,
    delete_document,
    search_rag_context
)

# Ensure database tables exist
init_db()

app = FastAPI(
    title="IT-to-Human Translator Enterprise API",
    description="REST API สำหรับบริการล่ามแปลภาษาไอทีอัจฉริยะระดับองค์กร พร้อม SQLite Database, RAG Corporate Knowledge Base, PII Sanitizer Guardrails, Impact Analysis & Authentication",
    version="2.1.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

@app.get("/health", tags=["Health Check"])
def health_check():
    """Endpoint สำหรับตรวจสอบสถานะของ API Service และการเชื่อมต่อ SQLite Database"""
    docs = get_all_documents()
    chunks_count = get_chunks_count()
    return {
        "status": "ok",
        "service": "IT-to-Human Translator Enterprise API",
        "framework": "FastAPI",
        "database": "SQLite (app.db - Connected)",
        "version": "2.1.0 (SQLite Database Integrated)",
        "documents_count": len(docs),
        "chunks_count": chunks_count,
        "timestamp": datetime.datetime.now().isoformat()
    }

# ==============================================================================
# AUTHENTICATION ENDPOINTS (SQLite Persistent)
# ==============================================================================

@app.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED, tags=["Authentication"])
@app.post("/api/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED, tags=["Authentication"])
def register_user(req: UserRegisterRequest):
    """
    1. POST /register - สมัครสมาชิกใหม่ (บันทึกลง SQLite Database)
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE username = ?", (req.username,))
    existing_user = cursor.fetchone()
    if existing_user:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ชื่อผู้ใช้ '{req.username}' มีอยู่ในระบบแล้ว"
        )
    
    created_at = datetime.datetime.now().isoformat()
    pwd_hash = hash_password(req.password)
    
    cursor.execute("""
        INSERT INTO users (username, email, password_hash, created_at)
        VALUES (?, ?, ?, ?)
    """, (req.username, req.email, pwd_hash, created_at))
    
    conn.commit()
    conn.close()
    
    return AuthResponse(
        success=True,
        message=f"สมัครสมาชิกสำหรับ '{req.username}' สำเร็จเรียบร้อยแล้ว",
        username=req.username
    )

@app.post("/login", response_model=AuthResponse, tags=["Authentication"])
@app.post("/api/login", response_model=AuthResponse, tags=["Authentication"])
def login_user(req: UserLoginRequest):
    """
    2. POST /login - เข้าสู่ระบบ (ตรวจสอบจาก SQLite Database และออก Session Token)
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT username, password_hash FROM users WHERE username = ?", (req.username,))
    user = cursor.fetchone()

    if not user or user["password_hash"] != hash_password(req.password):
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
        )
    
    # Generate and store session token
    token = secrets.token_hex(16)
    created_at = datetime.datetime.now().isoformat()

    cursor.execute("""
        INSERT OR REPLACE INTO sessions (token, username, created_at)
        VALUES (?, ?, ?)
    """, (token, req.username, created_at))

    conn.commit()
    conn.close()
    
    return AuthResponse(
        success=True,
        message=f"เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ '{req.username}'",
        username=req.username,
        token=token
    )

@app.post("/logout", response_model=AuthResponse, tags=["Authentication"])
@app.post("/api/logout", response_model=AuthResponse, tags=["Authentication"])
def logout_user(authorization: Optional[str] = Header(None)):
    """
    3. POST /logout - ออกจากระบบ (ลบ Token Session ออกจาก SQLite)
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
        conn.close()
    
    return AuthResponse(
        success=True,
        message="ออกจากระบบสำเร็จเรียบร้อยแล้ว"
    )

@app.post("/change-password", response_model=AuthResponse, tags=["Authentication"])
@app.post("/api/change-password", response_model=AuthResponse, tags=["Authentication"])
def change_password(req: ChangePasswordRequest):
    """
    4. POST /change-password - เปลี่ยนรหัสผ่าน (อัปเดตลง SQLite Database)
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT username, password_hash FROM users WHERE username = ?", (req.username,))
    user = cursor.fetchone()

    if not user:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ไม่พบผู้ใช้ '{req.username}' ในระบบ"
        )
    
    if user["password_hash"] != hash_password(req.old_password):
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="รหัสผ่านเดิมไม่ถูกต้อง"
        )
    
    new_hash = hash_password(req.new_password)
    cursor.execute("UPDATE users SET password_hash = ? WHERE username = ?", (new_hash, req.username))
    conn.commit()
    conn.close()
    
    return AuthResponse(
        success=True,
        message=f"เปลี่ยนรหัสผ่านสำหรับ '{req.username}' สำเร็จเรียบร้อยแล้ว",
        username=req.username
    )

# ==============================================================================
# CORPORATE KNOWLEDGE BASE & RAG ENDPOINTS (SQLite Persistent)
# ==============================================================================

@app.get("/api/documents", tags=["Corporate Knowledge Base (RAG)"])
def list_documents():
    """ดูรายการเอกสารโปรเจกต์ทั้งหมดใน Corporate Knowledge Base (SQLite)"""
    docs_list = get_all_documents()
    chunks_count = get_chunks_count()
    return {
        "total": len(docs_list),
        "total_chunks": chunks_count,
        "documents": docs_list
    }

@app.post("/api/documents", status_code=status.HTTP_201_CREATED, tags=["Corporate Knowledge Base (RAG)"])
def upload_document(req: DocumentUploadRequest):
    """อัปโหลดและบันทึกเอกสารลง SQLite Knowledge Base พร้อมสร้าง RAG Chunks"""
    doc = ingest_document(
        title=req.title,
        content=req.content,
        doc_type=req.doc_type or "markdown",
        tags=req.tags or []
    )
    return {
        "success": True,
        "message": f"อัปโหลดและบันทึก {doc['chunk_count']} Chunks สำหรับ '{req.title}' ลงฐานข้อมูลเรียบร้อยแล้ว",
        "document": doc
    }

@app.delete("/api/documents/{doc_id}", tags=["Corporate Knowledge Base (RAG)"])
def remove_document(doc_id: str):
    """ลบเอกสารออกจาก SQLite Knowledge Base"""
    success = delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"ไม่พบเอกสารรหัส {doc_id}")
    return {"success": True, "message": f"ลบเอกสาร {doc_id} ออกจากฐานข้อมูลเรียบร้อยแล้ว"}

@app.post("/api/documents/rag-search", tags=["Corporate Knowledge Base (RAG)"])
def rag_search(req: RAGSearchRequest):
    """ทดสอบค้นหา RAG Context Chunks จาก SQLite Knowledge Base"""
    results = search_rag_context(req.query, top_k=req.top_k or 3)
    return {
        "query": req.query,
        "total_results": len(results),
        "results": results
    }

# ==============================================================================
# ENTERPRISE SECURITY & PII SANITIZER ENDPOINTS
# ==============================================================================

@app.post("/api/security/sanitize", response_model=SanitizeResponse, tags=["Enterprise Security"])
def sanitize_endpoint(req: SanitizeRequest):
    """สแกนและ Mask ข้อมูลสำคัญ (API Key, PII, รหัสผ่าน, เบอร์โทร, เลขบัตรประชาชน)"""
    sanitized, masked = sanitize_text(req.text)
    return SanitizeResponse(
        original_text=req.text,
        sanitized_text=sanitized,
        masked_items=masked,
        has_pii=len(masked) > 0
    )

# ==============================================================================
# TRANSLATION & CRUD ENDPOINTS (SQLite Persistent History)
# ==============================================================================

@app.post("/api/translate", response_model=TranslateResponse, tags=["Translation Core"])
async def translate(req: TranslateRequest):
    """
    ส่งข้อความเข้าแปลผ่าน Gemini AI / RAG Context Retrieval / PII Sanitizer
    และบันทึกประวัติการแปลลง SQLite Database ถาวร
    """
    if req.mode not in ["human-to-tech", "tech-to-human"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mode ต้องเป็น 'human-to-tech' หรือ 'tech-to-human' เท่านั้น"
        )

    translated_data, is_ai, sanitized_txt, masked_items, rag_sources = await translate_with_gemini(
        input_text=req.input_text,
        mode=req.mode,
        api_key=req.api_key,
        project_context=req.project_context,
        budget_level=req.budget_level,
        timeline_constraint=req.timeline_constraint,
        use_rag=req.use_rag if req.use_rag is not None else True,
        sanitize_pii=req.sanitize_pii if req.sanitize_pii is not None else True,
        security_mode=req.security_mode or "cloud"
    )

    created_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    summary = translated_data.get("summary", "")
    has_impact = 1 if "impactAnalysis" in translated_data else 0

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO history (input_text, mode, summary, has_impact_analysis, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (req.input_text, req.mode, summary, has_impact, created_at))
    conn.commit()
    conn.close()

    return TranslateResponse(
        mode=req.mode,
        source_input=req.input_text,
        sanitized_input=sanitized_txt,
        masked_items=masked_items,
        rag_sources=rag_sources,
        is_ai=is_ai,
        data=translated_data
    )

@app.get("/api/history", tags=["History Management (CRUD)"])
def get_history():
    """ดูประวัติการแปลทั้งหมดจาก SQLite Database (Read)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, input_text, mode, summary, created_at, has_impact_analysis FROM history ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()

    history_list = [dict(r) for r in rows]
    return {"total": len(history_list), "history": history_list}

@app.delete("/api/history/{history_id}", status_code=status.HTTP_200_OK, tags=["History Management (CRUD)"])
def delete_history(history_id: int):
    """ลบประวัติการแปลตาม ID จาก SQLite Database (Delete)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM history WHERE id = ?", (history_id,))
    changes = conn.total_changes
    conn.commit()
    conn.close()

    if changes == 0:
        raise HTTPException(status_code=404, detail=f"ไม่พบประวัติ ID {history_id}")
    return {"message": f"ลบประวัติ ID {history_id} ออกจากฐานข้อมูลเรียบร้อยแล้ว"}

@app.delete("/api/history", status_code=status.HTTP_200_OK, tags=["History Management (CRUD)"])
def clear_all_history():
    """ล้างประวัติการแปลทั้งหมดใน SQLite Database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM history")
    conn.commit()
    conn.close()
    return {"message": "ล้างประวัติการแปลในฐานข้อมูลเรียบร้อยแล้ว"}
