/**
 * Google Gemini AI Service for IT-to-Human Translation
 */

const SYSTEM_PROMPT = `คุณคือ "ล่ามและหัวหน้าสถาปนิกไอทีอัจฉริยะ (Enterprise IT-to-Human Translator & Architecture Advisor)" ผู้เชี่ยวชาญด้านวิทยาการคอมพิวเตอร์ การวิเคราะห์ความต้องการเชิงระบบ และการสื่อสารระดับองค์กร

🚫 กฎเหล็กสำคัญที่สุด (CRITICAL CONSTRAINTS - STRICTLY ENFORCED):
1. ห้ามคัดลอก ทำซ้ำ หรือทวนประโยคจาก "ข้อความอินพุต" มาใส่ในบทสรุปหรือเนื้อหาเด็ดขาด (DO NOT ECHO OR PARAPHRASE INPUT)
2. คุณต้อง "สังเคราะห์และแปลงสภาพ (Synthesize & Transform)" ข้อมูลใหม่เสมอ:
   - แปลงคำพูดลอยๆ หรือนามธรรมให้กลายเป็น ฟังก์ชันระบบจริง, Architecture Components, Data Flow, และ Technical Spec ที่ทีมพัฒนาลงมือทำได้ทันที
   - แปลงศัพท์เทคนิค/สาเหตุล่าช้า ให้กลายเป็นการอุปมาอุปไมย (Analogy) ในชีวิตประจำวันที่เห็นภาพชัดเจน และข้อความชี้แจงที่สุภาพ มีความรับผิดชอบ และสร้างความมั่นใจให้ผู้ใช้งาน
3. ตอบตรงประเด็น ไม่อารัมภบท ไม่ใส่คำเกริ่นนำ ตอบเฉพาะ JSON Object ที่ถูกต้อง 100%`;

const CANDIDATE_MODELS = [
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

export async function callGeminiApi(inputText, mode, apiKey) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('กรุณาระบุ Gemini API Key ในเมนูตั้งค่า');
  }

  const promptUser = mode === 'human-to-tech' 
    ? `กรุณาแปลงข้อความต่อไปนี้เป็นข้อกำหนดทางเทคนิค [Human-to-Tech]:
ข้อความอินพุตจากลูกค้า/ธุรกิจ: "${inputText}"

⚠️ คำเตือน: ห้ามทวนข้อความอินพุตเดิมเด็ดขาด ให้สังเคราะห์เป็น Architecture และ Functional Specs ใหม่ทั้งหมด
ตอบกลับในรูปแบบ JSON Object เท่านั้น โดยมีโครงสร้างดังนี้:
{
  "summary": "ระบุจุดประสงค์ทางเทคนิคและสถาปัตยกรรมแกนหลักที่ต้องสร้างใน 1 ประโยค (ห้ามใช้คำเดิมจากอินพุต)",
  "technicalRequirements": [
    "[Frontend] ข้อกำหนดส่วนต่อประสานและ User Experience",
    "[Backend] สถาปัตยกรรม Business Logic และ API",
    "[Database] การจัดเก็บข้อมูลและ Schema Changes",
    "[Security/Performance] ข้อกำหนดความปลอดภัยและ Performance"
  ],
  "techStack": [
    { "name": "ชื่อ Framework/Tool (เช่น React, FastAPI, Redis)", "desc": "เหตุผลทางสถาปัตยกรรมที่แนะนำ" }
  ],
  "riskAnalysis": ["ความเสี่ยงทางเทคนิคหรือจุดที่อาจเกิดคอขวด 1", "..."],
  "suggestedQuestions": ["คำถามสำคัญเชิงลึกที่ต้องถามลูกค้าเพื่อความชัดเจนก่อนเริ่มพัฒนา 1", "..."]
}`
    : `กรุณาแปลงปัญหาทางเทคนิคต่อไปนี้เป็นภาษาที่บุคคลทั่วไปเข้าใจง่าย [Tech-to-Human]:
ข้อความอินพุตจากโปรแกรมเมอร์: "${inputText}"

⚠️ คำเตือน: ห้ามทวนคำศัพท์เทคนิคเดิมโดยไม่อธิบาย และห้ามก๊อปปี้ประโยคอินพุตเดิม ให้สังเคราะห์เป็นคำอธิบายที่เห็นภาพและสร้างความมั่นใจ
ตอบกลับในรูปแบบ JSON Object เท่านั้น โดยมีโครงสร้างดังนี้:
{
  "summary": "อธิบายสถานการณ์ที่เกิดขึ้นด้วยภาษาที่เข้าใจง่ายใน 1 ประโยค (ห้ามใช้ศัพท์เทคนิคที่ลูกค้าไม่เข้าใจ)",
  "politeExplanation": "ร่างข้อความชี้แจงอย่างมืออาชีพ สุภาพ มีความรับผิดชอบ ชี้แจงสิ่งที่ทีมงานกำลังแก้ไข และสร้างความมั่นใจให้ลูกค้า",
  "analogy": {
    "icon": "อิโมจิที่ตรงกับชีวิตประจำวัน เช่น 🚗, 🚰, 🍽️, 📦, ⚡, 🏢",
    "title": "เปรียบเสมือน: [ชื่อเรื่องเปรียบเทียบในชีวิตประจำวัน]",
    "description": "คำอธิบายเปรียบเทียบเพื่อให้คนทั่วไปเห็นภาพทันทีว่าเกิดอะไรขึ้น"
  },
  "impact": "ผลกระทบต่อการใช้งานจริงของลูกค้า (อธิบายตามจริงแต่ไม่ตื่นตระหนก)",
  "estimatedTime": "ระยะเวลาแก้ไขโดยประมาณและแนวทางการติดตามผล"
}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: `${SYSTEM_PROMPT}\n\n${promptUser}` }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      responseMimeType: 'application/json'
    }
  };

  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        lastError = new Error(errorData.error?.message || `Model ${model} returned HTTP ${response.status}`);
        continue; // Try next candidate model
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        lastError = new Error(`Model ${model} returned empty content`);
        continue;
      }

      const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanedText);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('การเชื่อมต่อ Gemini API ล้มเหลว');
}
