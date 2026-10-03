from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any

# Translation Models
class TranslateRequest(BaseModel):
    input_text: str = Field(..., min_length=1, description="ข้อความที่ต้องการแปลภาษา (ไทย)")
    mode: str = Field(..., description="โหมดการแปล: 'human-to-tech' หรือ 'tech-to-human'")
    api_key: Optional[str] = Field(None, description="Google Gemini API Key (ถ้าไม่ใส่จะใช้ Key หลักในระบบ)")
    project_context: Optional[str] = Field(None, description="บริบทของโปรเจกต์/Tech Stack ขององค์กร")
    budget_level: Optional[str] = Field(None, description="ระดับงบประมาณ (Low, Medium, Enterprise)")
    timeline_constraint: Optional[str] = Field(None, description="ข้อจำกัดด้านเวลา (เช่น Urgent <1wk, Standard 1mo)")
    use_rag: Optional[bool] = Field(True, description="เปิดใช้งาน RAG Retrieval จาก Corporate Knowledge Base หรือไม่")
    sanitize_pii: Optional[bool] = Field(True, description="สแกนและ Mask ข้อมูลสำคัญ (PII, Secret, API Keys) หรือไม่")
    security_mode: Optional[str] = Field("cloud", description="โหมดความปลอดภัย: 'cloud' หรือ 'private-local'")
    username: Optional[str] = Field(None, description="ชื่อผู้ใช้ที่กำลังส่งคำขอแปล")


class TechStackItem(BaseModel):
    name: str
    desc: str

class AnalogyItem(BaseModel):
    icon: Optional[str] = "💡"
    title: str
    description: str

class ImpactAnalysis(BaseModel):
    affectedModules: List[str] = []
    affectedTables: List[str] = []
    refactoringEffortDays: str = "0 วันทำการ"
    impactSeverity: str = "Low" # Low, Medium, High, Critical
    riskMitigation: str = ""

class HumanToTechData(BaseModel):
    summary: str
    technicalRequirements: List[str]
    techStack: List[TechStackItem]
    riskAnalysis: Optional[List[str]] = []
    suggestedQuestions: Optional[List[str]] = []
    acceptanceCriteria: Optional[List[str]] = []
    nonFunctionalRequirements: Optional[List[str]] = []
    apiDraft: Optional[List[str]] = []
    effortEstimation: Optional[Dict[str, Any]] = None
    impactAnalysis: Optional[ImpactAnalysis] = None

class TechToHumanData(BaseModel):
    summary: str
    politeExplanation: str
    analogy: Optional[AnalogyItem] = None
    impact: str
    estimatedTime: str

class MaskedItem(BaseModel):
    type: str # 'api_key', 'pii_email', 'pii_phone', 'pii_thai_id', 'password'
    original: str
    masked: str

class TranslateResponse(BaseModel):
    mode: str
    source_input: str
    sanitized_input: Optional[str] = None
    masked_items: Optional[List[MaskedItem]] = []
    rag_sources: Optional[List[Dict[str, Any]]] = []
    is_ai: bool
    data: Dict[str, Any]
    quota_info: Optional[Dict[str, Any]] = None


class HistoryItem(BaseModel):
    id: int
    input_text: str
    mode: str
    created_at: str
    summary: str

# Document Ingestion & RAG Models
class DocumentUploadRequest(BaseModel):
    title: str = Field(..., min_length=1, description="ชื่อเอกสารโปรเจกต์ เช่น PRD, Architecture Spec, Swagger")
    content: str = Field(..., min_length=5, description="เนื้อหาเอกสาร (Markdown, JSON, Text, etc.)")
    doc_type: Optional[str] = Field("markdown", description="ประเภทเอกสาร: markdown, json, openapi, prd, text")
    tags: Optional[List[str]] = []

class DocumentChunk(BaseModel):
    id: str
    doc_id: str
    doc_title: str
    chunk_index: int
    text: str

class DocumentItem(BaseModel):
    id: str
    title: str
    doc_type: str
    tags: List[str]
    created_at: str
    chunk_count: int
    preview: str

class RAGSearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 3

class RAGSearchResult(BaseModel):
    doc_id: str
    doc_title: str
    chunk_text: str
    score: float

# Sanitizer standalone models
class SanitizeRequest(BaseModel):
    text: str

class SanitizeResponse(BaseModel):
    original_text: str
    sanitized_text: str
    masked_items: List[MaskedItem]
    has_pii: bool

# Authentication Models
class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="ชื่อผู้ใช้ (อย่างน้อย 3 ตัวอักษร)")
    email: str = Field(..., description="อีเมลผู้สมัคร")
    password: str = Field(..., min_length=6, description="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)")

class UserLoginRequest(BaseModel):
    username: str = Field(..., description="ชื่อผู้ใช้")
    password: str = Field(..., description="รหัสผ่าน")

class ChangePasswordRequest(BaseModel):
    username: str = Field(..., description="ชื่อผู้ใช้")
    old_password: str = Field(..., description="รหัสผ่านเดิม")
    new_password: str = Field(..., min_length=6, description="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)")

class AuthResponse(BaseModel):
    success: bool
    message: str
    username: Optional[str] = None
    token: Optional[str] = None

# Telegram Integration Models
class TelegramSendRequest(BaseModel):
    token: Optional[str] = Field(None, description="Telegram Bot Token (ถ้าไม่ใส่จะใช้ค่า default ใน env)")
    chat_id: str = Field(..., min_length=1, description="Telegram Chat ID หรือ @channel_name")
    mode: str = Field(..., description="human-to-tech หรือ tech-to-human")
    data: Dict[str, Any] = Field(..., description="โครงสร้างข้อมูล AI Translation Output")
    include_json_file: Optional[bool] = Field(False, description="แนบไฟล์ JSON โครงสร้างเต็มไปด้วยหรือไม่")
    include_markdown_file: Optional[bool] = Field(False, description="แนบไฟล์ Markdown (.md) ไปด้วยหรือไม่")

class TelegramTestRequest(BaseModel):
    token: Optional[str] = Field(None, description="Telegram Bot Token")
    chat_id: str = Field(..., min_length=1, description="Telegram Chat ID")

class TelegramResponse(BaseModel):
    success: bool
    message: str
    telegram_message_id: Optional[int] = None
    has_file: Optional[bool] = False

# Quota & Subscription Models
class QuotaStatusResponse(BaseModel):
    allowed: bool
    tier: str
    quota_used: int
    quota_limit: int  # -1 for unlimited
    quota_reset_at: Optional[str] = None
    remaining_seconds: int = 0
    formatted_wait_time: Optional[str] = None

class UpgradeTierRequest(BaseModel):
    username: str
    target_tier: str = "pro"
    payment_method: Optional[str] = "promptpay"

class UpgradeTierResponse(BaseModel):
    success: bool
    message: str
    tier: str
    username: str

# Database Indexing Lab Models
class BenchmarkStatusResponse(BaseModel):
    table_name: str
    row_count: int
    active_indexes: List[str]
    available_indexes: List[str]
    has_indexes: bool
    approx_db_size_mb: float

class BenchmarkSeedRequest(BaseModel):
    count: int = Field(50000, ge=1000, le=200000, description="จำนวนแถวที่ต้องการปั๊ม (1,000 - 200,000)")

class BenchmarkToggleIndexRequest(BaseModel):
    enable: bool = Field(..., description="True = สร้าง Index, False = ลบ Index เพื่อเปรียบเทียบ")

class BenchmarkExecuteRequest(BaseModel):
    query: str = Field(..., min_length=5, description="คำสั่ง SQL SELECT ที่ต้องการทดสอบ")

class BenchmarkExecuteResponse(BaseModel):
    sql: str
    elapsed_ms: float
    row_count: int
    sample_rows: List[Dict[str, Any]]
    uses_index: bool
    is_table_scan: bool
    plan_steps: List[Dict[str, Any]]
    plan_summary: str
