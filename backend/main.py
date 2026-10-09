import datetime
import hashlib
import secrets
from fastapi import FastAPI, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional, Any

from backend.database import (
    get_db_connection,
    init_db,
    save_telegram_chat_id,
    get_latest_telegram_chat_id,
    get_all_telegram_recipients,
    check_user_quota,
    consume_user_quota,
    upgrade_user_tier
)
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
    SanitizeResponse,
    TelegramSendRequest,
    TelegramTestRequest,
    TelegramResponse,
    QuotaStatusResponse,
    UpgradeTierRequest,
    UpgradeTierResponse,
    BenchmarkStatusResponse,
    BenchmarkSeedRequest,
    BenchmarkToggleIndexRequest,
    BenchmarkExecuteRequest,
    BenchmarkExecuteResponse
)
from backend.indexing_service import (
    get_benchmark_status,
    seed_benchmark_records,
    clear_benchmark_records,
    toggle_benchmark_indexes,
    execute_benchmark_query
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
from backend.telegram_service import (
    format_telegram_message,
    send_telegram_message,
    send_telegram_document,
    test_telegram_connection
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

    # ตรวจสอบโควต้าการใช้งาน Token/Requests ของผู้ใช้
    quota_status = check_user_quota(req.username)
    if not quota_status["allowed"]:
        rem_sec = quota_status.get("remaining_seconds", 0)
        hours = rem_sec // 3600
        minutes = (rem_sec % 3600) // 60
        time_str = f"{hours} ชม. {minutes} นาที" if hours > 0 else f"{minutes} นาที"
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": f"คุณใช้โควต้าฟรีครบกำหนดแล้ว ({quota_status['quota_limit']} ครั้ง/รอบ) สามารถใช้งานได้อีกทีในอีก {time_str} หรือสมัครสมาชิกแบบชำระเงินเพื่อใช้งานได้ไม่จำกัด",
                "remaining_seconds": rem_sec,
                "formatted_wait_time": time_str,
                "tier": quota_status["tier"],
                "quota_used": quota_status["quota_used"],
                "quota_limit": quota_status["quota_limit"]
            }
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

    # บันทึกการใช้งานโควต้า
    updated_quota = consume_user_quota(req.username)

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
        data=translated_data,
        quota_info=updated_quota
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

# ==============================================================================
# TELEGRAM BOT INTEGRATION ENDPOINTS
# ==============================================================================

@app.get("/api/telegram/config", tags=["Telegram Integration"])
def get_telegram_config_endpoint():
    """
    ดึงค่าคอนฟิก Telegram เริ่มต้น (Token เริ่มต้นของระบบ และ Chat ID ที่เคยบันทึกไว้ใน DB)
    """
    latest_chat_id = get_latest_telegram_chat_id()
    recipients = get_all_telegram_recipients()
    return {
        "default_token": "8893607516:AAE7EvjSy5Vn-wbLAmPcshI0WqEA42mzNmM",
        "latest_chat_id": latest_chat_id or "",
        "recent_chat_ids": [r["chat_id"] for r in recipients]
    }

@app.post("/api/telegram/test", response_model=TelegramResponse, tags=["Telegram Integration"])
async def telegram_test_endpoint(req: TelegramTestRequest):
    """
    ทดสอบยิงข้อความทดสอบไปยัง Telegram Chat ID เพื่อยืนยันว่า Token และ Chat ID ใช้งานได้
    พร้อมบันทึก Chat ID ลงใน SQLite Database
    """
    try:
        res = await test_telegram_connection(req.token or "", req.chat_id)
        msg_id = res.get("result", {}).get("message_id")
        
        # บันทึก Chat ID ลงฐานข้อมูลอัตโนมัติ
        save_telegram_chat_id(req.chat_id)

        return TelegramResponse(
            success=True,
            message="เชื่อมต่อ Telegram สำเร็จ! ได้รับข้อความทดสอบเรียบร้อยแล้ว",
            telegram_message_id=msg_id
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.post("/api/telegram/send", response_model=TelegramResponse, tags=["Telegram Integration"])
async def telegram_send_endpoint(req: TelegramSendRequest):
    """
    ส่งโครงสร้างข้อมูล AI Translation Output ไปยัง Telegram Chat/Group
    รองรับทั้งข้อความสรุปและแนบไฟล์ JSON โครงสร้างเต็ม
    พร้อมบันทึก Chat ID ลงใน SQLite Database ให้โดยอัตโนมัติ
    """
    try:
        # 1. Format and send summary message
        formatted_text = format_telegram_message(req.data, req.mode)
        send_res = await send_telegram_message(
            token=req.token or "",
            chat_id=req.chat_id,
            text=formatted_text,
            parse_mode="HTML"
        )
        msg_id = send_res.get("result", {}).get("message_id")
        has_file = False

        # 2. Optionally send full JSON structure file
        if req.include_json_file:
            json_bytes = json.dumps(req.data, ensure_ascii=False, indent=2).encode("utf-8")
            timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"ai_spec_{req.mode}_{timestamp_str}.json"
            await send_telegram_document(
                token=req.token or "",
                chat_id=req.chat_id,
                file_bytes=json_bytes,
                filename=filename,
                caption=f"📁 โครงสร้างข้อมูล JSON เต็ม ({req.mode})"
            )
            has_file = True

        # 3. บันทึก Chat ID ลงใน SQLite Database อัตโนมัติเพื่อให้ใช้ในรอบถัดไป
        save_telegram_chat_id(req.chat_id)

        return TelegramResponse(
            success=True,
            message="ส่งโครงสร้างข้อมูลเข้า Telegram เรียบร้อยแล้ว (บันทึก Chat ID ลงฐานข้อมูลแล้ว)",
            telegram_message_id=msg_id,
            has_file=has_file
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

# ==============================================================================
# TOKEN & SUBSCRIPTION QUOTA MANAGEMENT ENDPOINTS
# ==============================================================================

@app.get("/api/user/quota", response_model=QuotaStatusResponse, tags=["Subscription & Quota"])
async def get_user_quota_endpoint(username: Optional[str] = None):
    """
    ตรวจสอบโควต้าการใช้งาน Token/Requests และระยะเวลาที่เหลือของรอบ
    พร้อมส่งแจ้งเตือน Telegram อัตโนมัติเมื่อโควต้ารีเซ็ตกลับมาใช้งานได้
    """
    quota_info = check_user_quota(username)
    rem_sec = quota_info.get("remaining_seconds", 0)
    hours = rem_sec // 3600
    minutes = (rem_sec % 3600) // 60
    time_str = f"{hours} ชม. {minutes} นาที" if hours > 0 else f"{minutes} นาที" if minutes > 0 else "0 นาที"

    # ถ้าโควต้าเพิ่งถูกรีเซ็ต (just_restored == True) และมี Telegram Chat ID ที่บันทึกไว้ -> ส่งแจ้งเตือน Telegram อัตโนมัติ
    if quota_info.get("just_restored"):
        latest_chat_id = get_latest_telegram_chat_id()
        if latest_chat_id:
            try:
                alert_text = (
                    f"🎉 <b>[IT-to-Human Translator] โควต้าพร้อมใช้งานแล้ว!</b>\n\n"
                    f"⚡ เรียนคุณ <b>{username or 'ผู้ใช้งาน'}</b> โควต้าการแปลภาษาของคุณได้รับการรีเซ็ตแล้ว ({quota_info['quota_limit']} ครั้ง/รอบ)\n"
                    f"คุณสามารถกลับมาใช้งานแปลภาษาไอทีและวิเคราะห์ระบบได้ตามปกติทันทีครับ\n\n"
                    f"🔗 <i>ระบบพร้อมให้บริการแล้วที่ IT-to-Human Translator</i>"
                )
                await send_telegram_message(
                    token="",
                    chat_id=latest_chat_id,
                    text=alert_text,
                    parse_mode="HTML"
                )
            except Exception as e:
                print(f"[Telegram Quota Restored Alert] Notice failed: {e}")

    return QuotaStatusResponse(
        allowed=quota_info["allowed"],
        tier=quota_info["tier"],
        quota_used=quota_info["quota_used"],
        quota_limit=quota_info["quota_limit"],
        quota_reset_at=quota_info.get("quota_reset_at"),
        remaining_seconds=rem_sec,
        formatted_wait_time=time_str
    )

@app.post("/api/user/upgrade", response_model=UpgradeTierResponse, tags=["Subscription & Quota"])
def upgrade_tier_endpoint(req: UpgradeTierRequest):
    """
    อัปเกรดสถานะสมาชิกเป็น Pro (Unlimited Tokens) หลังยืนยันการชำระเงิน
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE username = ?", (req.username,))
    existing = cursor.fetchone()
    conn.close()

    if not existing:
        raise HTTPException(status_code=404, detail=f"ไม่พบผู้ใช้งาน '{req.username}' ในระบบ กรุณาเข้าสู่ระบบก่อนทำการอัปเกรด")

    success = upgrade_user_tier(req.username, req.target_tier)
    if not success:
        raise HTTPException(status_code=400, detail="ไม่สามารถอัปเกรดแพ็กเกจได้ กรุณาลองใหม่อีกครั้ง")

    return UpgradeTierResponse(
        success=True,
        message=f"ยินดีด้วย! คุณได้อัปเกรดเป็นสมาชิก {req.target_tier.upper()} เรียบร้อยแล้ว (ใช้งานได้ไม่จำกัด)",
        tier=req.target_tier,
        username=req.username
    )

# ==========================================
# Database Indexing Lab Endpoints for Students
# ==========================================

@app.get("/api/indexing-lab/status", response_model=BenchmarkStatusResponse, tags=["Indexing Lab"])
def get_indexing_lab_status():
    """
    ดึงสถานะตารางทดสอบ benchmark_records: จำนวนแถว, รายการ Index ที่เปิดใช้งาน, ขนาด DB
    """
    try:
        return get_benchmark_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการดึงสถานะแล็บ: {str(e)}")

@app.post("/api/indexing-lab/seed", tags=["Indexing Lab"])
def seed_indexing_lab_data(req: BenchmarkSeedRequest):
    """
    จำลองข้อมูลธุรกรรมขนาดใหญ่ (Default 50,000 แถว) สำหรับทดสอบวัดประสิทธิภาพ Indexing
    """
    try:
        result = seed_benchmark_records(count=req.count)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการปั๊มข้อมูล: {str(e)}")

@app.post("/api/indexing-lab/clear", tags=["Indexing Lab"])
def clear_indexing_lab_data():
    """
    ล้างข้อมูลทั้งหมดในตาราง benchmark_records
    """
    try:
        return clear_benchmark_records()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการล้างข้อมูล: {str(e)}")

@app.post("/api/indexing-lab/toggle-index", tags=["Indexing Lab"])
def toggle_indexing_lab_indexes(req: BenchmarkToggleIndexRequest):
    """
    สลับเปิด-ปิด (CREATE / DROP) Index ทั้งหมดในตาราง benchmark_records เพื่อเปรียบเทียบผล
    """
    try:
        return toggle_benchmark_indexes(enable=req.enable)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการจัดการ Index: {str(e)}")

@app.post("/api/indexing-lab/execute", response_model=BenchmarkExecuteResponse, tags=["Indexing Lab"])
def execute_indexing_lab_query(req: BenchmarkExecuteRequest):
    """
    รัน SQL Query พร้อมดึง EXPLAIN QUERY PLAN และจับเวลา Execution Time (ms)
    """
    try:
        return execute_benchmark_query(sql_query=req.query)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการรัน Query: {str(e)}")
