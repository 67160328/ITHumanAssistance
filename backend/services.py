import os
import json
import httpx
from typing import Dict, Any

SYSTEM_PROMPT = """คุณคือ "ล่ามแปลภาษาไอทีอัจฉริยะ (IT-to-Human Translator)" ผู้เชี่ยวชาญด้านวิทยาการสารสนเทศและการบริหารจัดการโปรเจกต์ซอฟต์แวร์ หน้าที่หลักของคุณคือการทลายกำแพงการสื่อสารระหว่าง "นักพัฒนา/คนไอที (Tech)" และ "ลูกค้า/ฝ่ายธุรกิจ/คนทั่วไป (Non-Tech)" โดยแปลงข้อความภาษาไทยที่มีบริบทความเกรงใจหรือทับศัพท์แปลกๆ ให้เข้าใจง่ายและตรงประเด็นที่สุด

ระบบนี้จะมี 2 โหมดหลัก:
โหมดที่ 1: [Human-to-Tech]
- แปลความต้องการของลูกค้า (ภาษาคนทั่วไป) ให้กลายเป็น ข้อกำหนดทางเทคนิค (Technical Requirements) สำหรับนักพัฒนา
- สรุปความต้องการหลักออกมาเป็นข้อย่อยๆ (Bullet points)
- แปลงคำพูดนามธรรมให้เป็นฟีเจอร์ระบบ
- แนะนำเครื่องมือ ซอฟต์แวร์ หรือสถาปัตยกรรม (Tech Stack) เบื้องต้น
- แนะนำข้อควรระวัง/ความเสี่ยง และ คำถามที่ควรถามลูกค้าเพิ่ม

โหมดที่ 2: [Tech-to-Human]
- แปลปัญหา ศัพท์เทคนิค หรือเหตุผลที่งานล่าช้าจากฝั่งโปรแกรมเมอร์ ให้กลายเป็น "คำอธิบายที่สุภาพ เข้าใจง่าย และจับต้องได้" สำหรับส่งให้ลูกค้าอ่าน
- ห้ามใช้คำศัพท์เทคนิคล้วนๆ โดยไม่มีคำอธิบาย
- ใช้ "การอุปมาอุปไมย (Analogy)" เปรียบเทียบกับชีวิตประจำวันเสมอ
- ปรับโทนเสียงให้มีความเป็นมืออาชีพ สุภาพ มีความรับผิดชอบ และสรุปสั้นๆ ว่า "ผู้ใช้ต้องรออีกนานแค่ไหน/ทีมงานกำลังแก้ไขอย่างไร" """

CANDIDATE_MODELS = [
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-pro"
]

DEFAULT_KEY = os.getenv("GEMINI_API_KEY", "")

async def translate_with_gemini(input_text: str, mode: str, api_key: str = None, project_context: str = None) -> tuple[Dict[str, Any], bool]:
    key = api_key if api_key and api_key.strip() else DEFAULT_KEY

    context_str = f"\n[บริบทองค์กร/Tech Stack เดิมของผู้ใช้]: {project_context.strip()}\n" if project_context and project_context.strip() else ""

    prompt_user = (
        f'กรุณาแปลข้อความต่อไปนี้ภายใต้โหมด [Human-to-Tech]:\nข้อความอินพุต: "{input_text}"{context_str}\n\n'
        'ตอบกลับในรูปแบบ JSON Object เท่านั้น มีคีย์ summary, technicalRequirements (list), techStack (list of dict with name, desc), riskAnalysis (list), suggestedQuestions (list), และ effortEstimation (dict with keys: complexity (Low/Medium/High), estimatedManDays (string เช่น 3-5 วัน), estimatedCostRange (string เช่น 15,000 - 25,000 บาท), reasoning)'
        if mode == 'human-to-tech' else
        f'กรุณาแปลข้อความต่อไปนี้ภายใต้โหมด [Tech-to-Human]:\nข้อความอินพุต: "{input_text}"{context_str}\n\n'
        'ตอบกลับในรูปแบบ JSON Object เท่านั้น มีคีย์ summary, politeExplanation, analogy (dict with icon, title, description), impact, estimatedTime'
    )

    request_body = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"{SYSTEM_PROMPT}\n\n{prompt_user}"}]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "topP": 0.8,
            "responseMimeType": "application/json"
        }
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        for model in CANDIDATE_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key.strip()}"
            try:
                resp = await client.post(url, json=request_body)
                if resp.status_code == 200:
                    res_data = resp.json()
                    raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                    cleaned = raw_text.replace("```json", "").replace("```", "").strip()
                    parsed = json.loads(cleaned)
                    return parsed, True
            except Exception as e:
                print(f"Model {model} failed: {e}")

    # Local fallback
    return generate_local_fallback(input_text, mode), False

def generate_local_fallback(text: str, mode: str) -> Dict[str, Any]:
    if mode == 'human-to-tech':
        return {
            "summary": f"สรุปความต้องการเชิงธุรกิจ: {text[:50]}...",
            "technicalRequirements": [
                "ระบบเว็บและโมบายแอปพลิเคชัน (Responsive & Cross-platform Architecture)",
                "ระบบจัดการข้อมูลและรายงานหลังบ้าน (CRUD Administrative Dashboard)"
            ],
            "techStack": [
                {"name": "React / Next.js", "desc": "สำหรับระบบ Front-end ที่ทันสมัย"},
                {"name": "FastAPI + Python", "desc": "สำหรับ Back-end High Performance REST API"},
                {"name": "PostgreSQL", "desc": "สำหรับระบบฐานข้อมูลที่มีความปลอดภัยสูง"}
            ],
            "riskAnalysis": ["ควรกำหนดขอบเขตงาน (Scope of Work) ให้ชัดเจนก่อนเริ่มการพัฒนา"],
            "suggestedQuestions": ["มีระบบเดิมที่ต้องเชื่อมต่อข้อมูลเพิ่มเติมหรือไม่?"],
            "effortEstimation": {
                "complexity": "Medium",
                "estimatedManDays": "3 - 5 วันทำการ",
                "estimatedCostRange": "15,000 - 30,000 บาท",
                "reasoning": "อ้างอิงจากขอบเขตงานการสร้าง UI Dashboard และ API endpoint เบื้องต้น"
            }
        }
    else:
        return {
            "summary": "การอธิบายปัญหาเทคนิคและอัปเดตสถานะงานให้เข้าใจง่าย",
            "politeExplanation": f"เรียนท่านลูกค้า ทางทีมงานขอแจ้งอัปเดตสถานะการทำงานครับ จากกรณีปัญหาที่พบ ({text[:50]}...) ทีมพัฒนาได้ปรับปรุงท่อส่งข้อมูลให้รวดเร็วและปลอดภัยยิ่งขึ้นครับ",
            "analogy": {
                "icon": "🚗",
                "title": "เปรียบเสมือน: การจัดระเบียบการจราจรบนทางด่วน",
                "description": "เหมือนเปิดช่องทางพิเศษเพิ่มเพื่อระบายรถติด ให้เดินทางถึงจุดหมายได้รวดเร็วขึ้นครับ"
            },
            "impact": "การแสดงผลบางส่วนอาจช้าลงเล็กน้อยชั่วคราว แต่ข้อมูลปลอดภัยดีครับ",
            "estimatedTime": "ทีมงานคาดว่าจะดำเนินการแล้วเสร็จภายใน 1-2 ชั่วโมงนี้ครับ"
        }
