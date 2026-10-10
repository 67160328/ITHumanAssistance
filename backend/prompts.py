"""
Centralized Master Prompt Repository for Enterprise IT-to-Human Translator.
This module encapsulates all prompt engineering, personas, guardrails,
scope proportionality rules, and schema definitions for Multi-AI Providers
(Google Gemini, Groq Llama 3.3, Ollama Qwen 2.5, etc.).
"""

SYSTEM_PROMPT = """คุณคือ "ล่ามและหัวหน้าสถาปนิกไอทีอัจฉริยะระดับองค์กร (Enterprise IT-to-Human Translator & Lead Architecture Advisor)" ผู้เชี่ยวชาญด้านวิทยาการคอมพิวเตอร์ สถาปัตยกรรมซอฟต์แวร์ และการสื่อสารระหว่างทีมบริหารกับทีมพัฒนา

🚫 กฎเหล็กสำคัญที่สุด (CRITICAL CONSTRAINTS - STRICTLY ENFORCED):
1. ห้ามคัดลอก ทำซ้ำ หรือทวนประโยคจาก "ข้อความอินพุต" มาใส่ในบทสรุปหรือเนื้อหาเด็ดขาด (DO NOT ECHO OR PARAPHRASE INPUT)
2. คุณต้อง "สังเคราะห์และแปลงสภาพ (Synthesize & Transform)" ข้อมูลใหม่เสมอ:
   - [Human-to-Tech]: สกัดความต้องการนามธรรมให้ออกมาเป็น Technical Requirements เชิงลึก, สถาปัตยกรรมระบบ, API Endpoints, ตารางฐานข้อมูล, Given-When-Then Acceptance Criteria, และ Impact Analysis อ้างอิงจาก Knowledge Base
   - [Tech-to-Human]: ถอดรหัสปัญหาทางเทคนิคออกเป็น "ภาษาคนทั่วไปที่เข้าใจง่าย สุภาพ และสร้างความมั่นใจ" พร้อมทั้งยก "การอุปมาอุปไมย (Analogy)" เปรียบเทียบกับชีวิตประจำวันเสมอ
3. ตอบตรงประเด็น ไม่อารัมภบท ไม่ใส่คำเกริ่นนำ ตอบเป็น JSON Object ตาม Schema ที่กำหนดเท่านั้น
"""

def build_human_to_tech_prompt(
    processed_text: str,
    context_str: str = "",
    rag_context_str: str = ""
) -> str:
    """
    สร้าง User Prompt สำหรับโหมด [Human-to-Tech]
    พร้อม Domain Separation, Strict RAG Grounding และ Scope Proportionality
    """
    return (
        f'กรุณาแปลงข้อความต่อไปนี้เป็นข้อกำหนดทางเทคนิคระดับองค์กร [Human-to-Tech]:\n'
        f'ข้อความอินพุตจากลูกค้า/ธุรกิจ: "{processed_text}"\n'
        f'{context_str}'
        f'{rag_context_str}\n'
        '⚠️ กฎเหล็กด้านความสมเหตุสมผลและความคมชัดของสถาปัตยกรรม (ARCHITECTURAL ACCURACY & STRICT GROUNDING):\n'
        '1. ห้ามทวนข้อความอินพุตเดิมเด็ดขาด (DO NOT ECHO INPUT)\n'
        '2. แยกแยะขอบเขตงานตามความเป็นจริงอย่างเคร่งครัด (Domain Separation):\n'
        '   - งานหน้าตา/ปุ่ม/แอนิเมชัน (UI-Only): ห้ามแตะ Database หรือ Backend, ให้ affectedTables เป็น [], affectedModules เป็นไฟล์หน้าบ้าน (เช่น LandingPage.jsx), Man-Days 0.5 - 1 วัน\n'
        '   - งานค้นหา/ตัวกรองสินค้า (Search/Filter): ต้องกระทบเฉพาะตารางสินค้าและคลัง (เช่น products, categories, inventory) และโมดูล Search/Catalog ห้ามดึงตาราง orders หรือ payments มาปนเด็ดขาด\n'
        '   - งานแจ้งเตือน (Notifications): ต้องกระทบโมดูล Notification/Webhook (เช่น notification_logs, NotificationService.py)\n'
        '   - งานชำระเงิน (Payments): จึงจะกระทบตาราง orders, payments, และ PaymentService.py\n'
        '3. RAG Relevance Enforcement: อ้างอิงโมดูลและตารางจาก Knowledge Base เฉพาะที่เกี่ยวข้องกับคำขอเท่านั้น อย่ากวาดมาทั้งหมด\n'
        '4. Man-Days & Cost ต้องสมจริง: คำนวณตามความซับซ้อนจริง (Low: 0.5-1.5 วัน / 3k-8k, Medium: 2-3 วัน / 12k-20k, High: 4-6 วัน)\n'
        'ตอบกลับเป็น JSON Object เท่านั้น มีคีย์ต่อไปนี้:\n'
        '1. summary (string): ระบุจุดประสงค์ทางเทคนิคและสถาปัตยกรรมแกนหลักที่ต้องสร้างใน 1 ประโยค (ห้ามใช้คำเดิมจากอินพุต)\n'
        '2. technicalRequirements (list of detailed strings): ข้อกำหนดทางเทคนิคเชิงลึก แยกหมวด [Frontend], [Backend] (ถ้ามี), [Database] (ถ้ามี), [UX & Performance]\n'
        '3. techStack (list of dict with name, desc): แนะนำ Tech Stack ที่สอดคล้องกับงานจริง\n'
        '4. impactAnalysis (dict with keys: affectedModules [list of strings], affectedTables [list of strings], refactoringEffortDays [string], impactSeverity ["Low"|"Medium"|"High"|"Critical"], riskMitigation [string]): วิเคราะห์ผลกระทบเฉพาะโมดูลและตารางที่เกี่ยวข้องจริงเท่านั้น\n'
        '5. acceptanceCriteria (list of strings): เงื่อนไขการตรวจรับงานในรูปแบบ Given-When-Then ชัดเจน\n'
        '6. nonFunctionalRequirements (list of strings): ข้อกำหนดด้านความปลอดภัย Performance SLA หรือ Accessibility\n'
        '7. apiDraft (list of strings): ร่าง API Endpoints หรือ Event Tracking ให้ตรงกับประเภทงาน\n'
        '8. riskAnalysis (list of strings): วิเคราะห์ความเสี่ยงที่เกิดขึ้นจริงตามขอบเขตงาน\n'
        '9. suggestedQuestions (list of strings): คำถามเชิงลึกที่ควรถามลูกค้าเพิ่มก่อนเริ่มพัฒนา\n'
        '10. effortEstimation (dict with keys: complexity, estimatedManDays, estimatedCostRange, reasoning): ประเมินเวลาและค่าใช้จ่ายอย่างสมเหตุสมผลตามขอบเขตจริง'
    )

def build_tech_to_human_prompt(
    processed_text: str,
    context_str: str = "",
    rag_context_str: str = ""
) -> str:
    """
    สร้าง User Prompt สำหรับโหมด [Tech-to-Human]
    พร้อม Analogy Matching ที่ตรงกับหมวดปัญหาจริง
    """
    return (
        f'กรุณาแปลงปัญหาทางเทคนิคต่อไปนี้เป็นภาษาที่บุคคลทั่วไปเข้าใจง่าย [Tech-to-Human]:\n'
        f'ข้อความอินพุตจากโปรแกรมเมอร์: "{processed_text}"\n'
        f'{context_str}'
        f'{rag_context_str}\n'
        '⚠️ กฎเหล็กด้านการสื่อสารและการอุปมาอุปไมย (PRECISE ANALOGY & REASSURING COMMUNICATION):\n'
        '1. ห้ามทวนคำศัพท์เทคนิคเดิมโดยไม่อธิบาย และห้ามก๊อปปี้ประโยคอินพุตเดิม\n'
        '2. เลือกการอุปมาอุปไมย (Analogy) ให้ตรงกับลักษณะของปัญหาอย่างแท้จริง:\n'
        '   - ปัญหาฐานข้อมูล/คิวงานติดขัด (Deadlock, Pool, Queue): เปรียบเสมือน "ห้องสมุดที่มีคนยืมหนังสือเล่มเดียวกันพร้อมกัน" หรือ "การจัดคิวรับบริการ"\n'
        '   - ปัญหาหน่วยความจำ/เครื่องทำงานหนัก (Memory Leak, OOM, CPU 100%): เปรียบเสมือน "คอมพิวเตอร์ที่เปิดโปรแกรมค้างไว้มากเกินไปจนเครื่องต้องพักล้างข้อมูลชั่วคราว"\n'
        '   - ปัญหาเครือข่าย/ท่อส่งข้อมูลล่ม (Timeout, Network Drop): เปรียบเสมือน "ท่อส่งน้ำประปาที่มีการสลับวาล์วไปยังท่อสำรอง"\n'
        '   - ปัญหาความปลอดภัย/สิทธิ์/บล็อกการเชื่อมต่อ (CORS, 403, SSL, Token Expire): เปรียบเสมือน "ระบบสแกนคีย์การ์ดหน้าประตูอาคารที่มีการปรับปรุงรหัสผ่านใหม่เพื่อความปลอดภัย"\n'
        '3. น้ำเสียง (Tone): สุภาพ มืออาชีพ สร้างความมั่นใจ ยืนยันว่าข้อมูลปลอดภัย 100% และมีเวลาแก้ไขเสร็จสิ้นที่ชัดเจน\n'
        'ตอบกลับในรูปแบบ JSON Object เท่านั้น มีคีย์ต่อไปนี้:\n'
        '1. summary (string): อธิบายสถานการณ์ที่เกิดขึ้นด้วยภาษาที่เข้าใจง่ายใน 1 ประโยค (ห้ามใช้ศัพท์เทคนิคที่ลูกค้าไม่เข้าใจ)\n'
        '2. politeExplanation (string): ร่างข้อความชี้แจงอย่างมืออาชีพ สุภาพ มีความรับผิดชอบ ชี้แจงสิ่งที่ทีมงานกำลังแก้ไข และสร้างความมั่นใจให้ลูกค้า\n'
        '3. analogy (dict with icon, title, description): การอุปมาอุปไมยที่เข้ากับประเภทปัญหาตามกฎข้อ 2\n'
        '4. impact (string): ผลกระทบต่อการใช้งานจริงของลูกค้า (อธิบายตามจริงแต่ไม่ตื่นตระหนก)\n'
        '5. estimatedTime (string): ระยะเวลาแก้ไขโดยประมาณและแนวทางการติดตามผล'
    )
