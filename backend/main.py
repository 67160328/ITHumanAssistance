import datetime
import hashlib
import secrets
from fastapi import FastAPI, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional

from backend.models import (
    TranslateRequest,
    TranslateResponse,
    UserRegisterRequest,
    UserLoginRequest,
    ChangePasswordRequest,
    AuthResponse
)
from backend.services import translate_with_gemini

app = FastAPI(
    title="IT-to-Human Translator API",
    description="REST API สำหรับบริการล่ามแปลภาษาไอทีอัจฉริยะ พัฒนาด้วย FastAPI, Authentication & Google Gemini AI",
    version="1.1.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory Databases
history_db: List[Dict] = []
next_history_id = 1

# User DB: { username: { "username": str, "email": str, "password_hash": str } }
users_db: Dict[str, Dict] = {}
# Active Sessions: { token: username }
sessions_db: Dict[str, str] = {}

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

@app.get("/health", tags=["Health Check"])
def health_check():
    """Endpoint สำหรับตรวจสอบสถานะของ API Service (Health Check)"""
    return {
        "status": "ok",
        "service": "IT-to-Human Translator API",
        "framework": "FastAPI",
        "timestamp": datetime.datetime.now().isoformat()
    }

# ==============================================================================
# AUTHENTICATION ENDPOINTS (POST /register, /login, /logout, /change-password)
# ==============================================================================

@app.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED, tags=["Authentication"])
@app.post("/api/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED, tags=["Authentication"])
def register_user(req: UserRegisterRequest):
    """
    1. POST /register - สมัครสมาชิกใหม่
    - ตรวจสอบว่าชื่อผู้ใช้ถูกใช้งานไปแล้วหรือยัง
    - บันทึกชื่อผู้ใช้, อีเมล และรหัสผ่านที่ผ่านการ Hash แล้ว
    """
    if req.username in users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ชื่อผู้ใช้ '{req.username}' มีอยู่ในระบบแล้ว"
        )
    
    users_db[req.username] = {
        "username": req.username,
        "email": req.email,
        "password_hash": hash_password(req.password),
        "created_at": datetime.datetime.now().isoformat()
    }
    
    return AuthResponse(
        success=True,
        message=f"สมัครสมาชิกสำหรับ '{req.username}' สำเร็จเรียบร้อยแล้ว",
        username=req.username
    )

@app.post("/login", response_model=AuthResponse, tags=["Authentication"])
@app.post("/api/login", response_model=AuthResponse, tags=["Authentication"])
def login_user(req: UserLoginRequest):
    """
    2. POST /login - เข้าสู่ระบบ
    - ตรวจสอบชื่อผู้ใช้และรหัสผ่าน
    - ออก Access Token สำหรับใช้งานใน Session
    """
    user = users_db.get(req.username)
    if not user or user["password_hash"] != hash_password(req.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
        )
    
    # Generate session token
    token = secrets.token_hex(16)
    sessions_db[token] = req.username
    
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
    3. POST /logout - ออกจากระบบ
    - ยกเลิก Token/Session ปัจจุบัน
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        if token in sessions_db:
            del sessions_db[token]
    
    return AuthResponse(
        success=True,
        message="ออกจากระบบสำเร็จเรียบร้อยแล้ว"
    )

@app.post("/change-password", response_model=AuthResponse, tags=["Authentication"])
@app.post("/api/change-password", response_model=AuthResponse, tags=["Authentication"])
def change_password(req: ChangePasswordRequest):
    """
    4. POST /change-password - เปลี่ยนรหัสผ่าน
    - ตรวจสอบว่ามีผู้ใช้นี้อยู่จริงหรือไม่
    - ยืนยันรหัสผ่านเดิมถูกต้องก่อนอัปเดตรหัสผ่านใหม่
    """
    user = users_db.get(req.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ไม่พบผู้ใช้ '{req.username}' ในระบบ"
        )
    
    if user["password_hash"] != hash_password(req.old_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="รหัสผ่านเดิมไม่ถูกต้อง"
        )
    
    user["password_hash"] = hash_password(req.new_password)
    
    return AuthResponse(
        success=True,
        message=f"เปลี่ยนรหัสผ่านสำหรับ '{req.username}' สำเร็จเรียบร้อยแล้ว",
        username=req.username
    )

# ==============================================================================
# TRANSLATION & CRUD ENDPOINTS
# ==============================================================================

@app.post("/api/translate", response_model=TranslateResponse, tags=["Translation Core"])
async def translate(req: TranslateRequest):
    """ส่งข้อความเข้าแปลผ่าน Gemini AI / Service layer"""
    global next_history_id
    if req.mode not in ["human-to-tech", "tech-to-human"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mode ต้องเป็น 'human-to-tech' หรือ 'tech-to-human' เท่านั้น"
        )

    translated_data, is_ai = await translate_with_gemini(
        req.input_text,
        req.mode,
        req.api_key,
        req.project_context,
        req.budget_level,
        req.timeline_constraint
    )

    history_entry = {
        "id": next_history_id,
        "input_text": req.input_text,
        "mode": req.mode,
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "summary": translated_data.get("summary", "")
    }
    history_db.insert(0, history_entry)
    next_history_id += 1

    return TranslateResponse(
        mode=req.mode,
        source_input=req.input_text,
        is_ai=is_ai,
        data=translated_data
    )

@app.get("/api/history", tags=["History Management (CRUD)"])
def get_history():
    """ดูประวัติการแปลทั้งหมด (Read)"""
    return {"total": len(history_db), "history": history_db}

@app.delete("/api/history/{history_id}", status_code=status.HTTP_200_OK, tags=["History Management (CRUD)"])
def delete_history(history_id: int):
    """ลบประวัติการแปลตาม ID (Delete)"""
    global history_db
    initial_len = len(history_db)
    history_db = [item for item in history_db if item["id"] != history_id]
    if len(history_db) == initial_len:
        raise HTTPException(status_code=404, detail=f"ไม่พบประวัติ ID {history_id}")
    return {"message": f"ลบประวัติ ID {history_id} เรียบร้อยแล้ว"}

@app.delete("/api/history", status_code=status.HTTP_200_OK, tags=["History Management (CRUD)"])
def clear_all_history():
    """ล้างประวัติการแปลทั้งหมด"""
    global history_db
    history_db.clear()
    return {"message": "ล้างประวัติการแปลเรียบร้อยแล้ว"}
