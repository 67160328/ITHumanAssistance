from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any

class TranslateRequest(BaseModel):
    input_text: str = Field(..., min_length=1, description="ข้อความที่ต้องการแปลภาษา (ไทย)")
    mode: str = Field(..., description="โหมดการแปล: 'human-to-tech' หรือ 'tech-to-human'")
    api_key: Optional[str] = Field(None, description="Google Gemini API Key (ถ้าไม่ใส่จะใช้ Key หลักในระบบ)")
    project_context: Optional[str] = Field(None, description="บริบทของโปรเจกต์/Tech Stack ขององค์กร")
    budget_level: Optional[str] = Field(None, description="ระดับงบประมาณ (Low, Medium, Enterprise)")
    timeline_constraint: Optional[str] = Field(None, description="ข้อจำกัดด้านเวลา (เช่น Urgent <1wk, Standard 1mo)")


class TechStackItem(BaseModel):
    name: str
    desc: str

class AnalogyItem(BaseModel):
    icon: Optional[str] = "💡"
    title: str
    description: str

class HumanToTechData(BaseModel):
    summary: str
    technicalRequirements: List[str]
    techStack: List[TechStackItem]
    riskAnalysis: Optional[List[str]] = []
    suggestedQuestions: Optional[List[str]] = []
    acceptanceCriteria: Optional[List[str]] = []
    nonFunctionalRequirements: Optional[List[str]] = []
    apiDraft: Optional[List[str]] = []

class TechToHumanData(BaseModel):
    summary: str
    politeExplanation: str
    analogy: Optional[AnalogyItem] = None
    impact: str
    estimatedTime: str

class TranslateResponse(BaseModel):
    mode: str
    source_input: str
    is_ai: bool
    data: Dict[str, Any]

class HistoryItem(BaseModel):
    id: int
    input_text: str
    mode: str
    created_at: str
    summary: str

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
