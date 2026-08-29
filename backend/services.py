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

async def translate_with_gemini(input_text: str, mode: str, api_key: str = None, project_context: str = None, budget_level: str = None, timeline_constraint: str = None) -> tuple[Dict[str, Any], bool]:
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
        context_str = (
            f"\n[สำคัญมาก - บริบทโปรเจกต์และข้อจำกัดขององค์กร]: {', '.join(ctx_parts)}\n"
            "**คำสั่งพิเศษ**: โปรดเลือกแนะนำ Tech Stack, สถาปัตยกรรมระบบ, และการคำนวณ Effort/Cost (Man-Days & Budget Range) ให้สะท้อนและสอดคล้องกับข้อจำกัดเรื่องงบประมาณและกรอบเวลาด้านบนอย่างตรงไปตรงมา\n"
        )

    prompt_user = (
        f'กรุณาแปลข้อความต่อไปนี้ภายใต้โหมด [Human-to-Tech]:\nข้อความอินพุต: "{input_text}"{context_str}\n\n'
        '**ข้อกำหนดสำคัญ**: ให้สร้างข้อมูลที่สมบูรณ์สำหรับระดับ Enterprise PRD โดยตอบกลับเป็น JSON Object เท่านั้นที่มีคีย์ต่อไปนี้:\n'
        '1. summary (string): สรุปเป้าหมายหลัก\n'
        '2. technicalRequirements (list of detailed strings): ข้อกำหนดทางเทคนิคเชิงลึก ครอบคลุม Frontend, Backend, Database, Security\n'
        '3. techStack (list of dict with name, desc): แนะนำ Tech Stack ที่สอดคล้องกับบริบท\n'
        '4. acceptanceCriteria (list of strings): เงื่อนไขการตรวจรับงาน (Acceptance Criteria) ในรูปแบบ Given-When-Then หรือ Checklist\n'
        '5. nonFunctionalRequirements (list of strings): ข้อกำหนดด้านประสิทธิภาพ (NFR) เช่น Latency SLA, Concurrent Users, PDPA/Security Standard\n'
        '6. apiDraft (list of strings): ร่าง API Endpoints หรือ Data Payload (เช่น POST /api/v1/... (Body: {...}))\n'
        '7. riskAnalysis (list of strings): วิเคราะห์ความเสี่ยง\n'
        '8. suggestedQuestions (list of strings): คำถามถามลูกค้าเพิ่มเติม\n'
        '9. effortEstimation (dict with keys: complexity, estimatedManDays, estimatedCostRange, reasoning)\n'
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
    return generate_local_fallback(input_text, mode, project_context), False

def generate_local_fallback(text: str, mode: str, project_context: str = None) -> Dict[str, Any]:
    ctx_desc = f" (ตามบริบทโปรเจกต์: {project_context})" if project_context and project_context.strip() else ""
    if mode == 'human-to-tech':
        tech_stack = [
            {"name": "React / Next.js", "desc": "สำหรับระบบ Front-end ที่ทันสมัย"},
            {"name": "FastAPI + Python", "desc": "สำหรับ Back-end High Performance REST API"},
            {"name": "PostgreSQL", "desc": "สำหรับระบบฐานข้อมูลที่มีความปลอดภัยสูง"}
        ]
        if project_context and project_context.strip():
            tech_stack.insert(0, {"name": "Specified Context Stack", "desc": project_context.strip()})

        return {
            "summary": f"สรุปความต้องการเชิงธุรกิจ{ctx_desc}: {text[:50]}...",
            "technicalRequirements": [
                f"พัฒนาฟีเจอร์สำหรับ '{text}' ให้รองรับสถาปัตยกรรมเดิมของโปรเจกต์{ctx_desc}",
                "ออกแบบระบบจัดการข้อมูลและรายงานหลังบ้าน (CRUD Administrative Dashboard)"
            ],
            "techStack": tech_stack,
            "riskAnalysis": [f"ควรกำหนดขอบเขตงาน (Scope of Work) และตรวจสอบ compatibility กับ {project_context or 'ระบบเดิม'}"],
            "suggestedQuestions": ["มีระบบเดิมที่ต้องเชื่อมต่อข้อมูลเพิ่มเติมหรือไม่?"],
            "effortEstimation": {
                "complexity": "Medium",
                "estimatedManDays": "3 - 5 วันทำการ",
                "estimatedCostRange": "15,000 - 30,000 บาท",
                "reasoning": f"อ้างอิงจากขอบเขตงานการสร้าง UI Dashboard และ API endpoint ตามบริบท {project_context or 'มาตรฐาน'}"
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
