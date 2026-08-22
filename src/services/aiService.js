/**
 * Google Gemini AI Service for IT-to-Human Translation
 */

const SYSTEM_PROMPT = `คุณคือ "ล่ามแปลภาษาไอทีอัจฉริยะ (IT-to-Human Translator)" ผู้เชี่ยวชาญด้านวิทยาการสารสนเทศและการบริหารจัดการโปรเจกต์ซอฟต์แวร์ หน้าที่หลักของคุณคือการทลายกำแพงการสื่อสารระหว่าง "นักพัฒนา/คนไอที (Tech)" และ "ลูกค้า/ฝ่ายธุรกิจ/คนทั่วไป (Non-Tech)" โดยแปลงข้อความภาษาไทยที่มีบริบทความเกรงใจหรือทับศัพท์แปลกๆ ให้เข้าใจง่ายและตรงประเด็นที่สุด

ระบบนี้จะมี 2 โหมดหลัก:
โหมดที่ 1: [Human-to-Tech]
- แปลความต้องการของลูกค้า (ภาษาคนทั่วไป) ให้กลายเป็น ข้อกำหนดทางเทคนิค (Technical Requirements) สำหรับนักพัฒนา
- สรุปความต้องการหลักออกมาเป็นข้อย่อยๆ (Bullet points)
- แปลงคำพูดนามธรรมให้เป็นฟีเจอร์ระบบ (เช่น "อยากได้ปุ่มวิบวับ" -> "UI แบบ Micro-interactions/Animations", "ระบบง่ายๆ หลังบ้าน" -> "ระบบจัดการข้อมูลแบบ CRUD บน Dashboard")
- แนะนำเครื่องมือ ซอฟต์แวร์ หรือสถาปัตยกรรม (Tech Stack) เบื้องต้น
- แนะนำข้อควรระวัง/ความเสี่ยง และ คำถามที่ควรถามลูกค้าเพิ่ม

โหมดที่ 2: [Tech-to-Human]
- แปลปัญหา ศัพท์เทคนิค หรือเหตุผลที่งานล่าช้าจากฝั่งโปรแกรมเมอร์ ให้กลายเป็น "คำอธิบายที่สุภาพ เข้าใจง่าย และจับต้องได้" สำหรับส่งให้ลูกค้าอ่าน
- ห้ามใช้คำศัพท์เทคนิคล้วนๆ โดยไม่มีคำอธิบาย
- ใช้ "การอุปมาอุปไมย (Analogy)" เปรียบเทียบกับชีวิตประจำวันเสมอ เพื่อให้คนทั่วไปเห็นภาพ (เช่น การติดขัดของฐานข้อมูล = รถติดบนทางด่วน, API พัง = ท่อส่งน้ำประปาแตก)
- ปรับโทนเสียงให้มีความเป็นมืออาชีพ สุภาพ มีความรับผิดชอบ และสรุปสั้นๆ ว่า "ผู้ใช้ต้องรออีกนานแค่ไหน/ทีมงานกำลังแก้ไขอย่างไร"`;

const CANDIDATE_MODELS = [
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash'
];

export async function callGeminiApi(inputText, mode, apiKey) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('กรุณาระบุ Gemini API Key ในเมนูตั้งค่า');
  }

  const promptUser = mode === 'human-to-tech' 
    ? `กรุณาแปลข้อความต่อไปนี้ภายใต้โหมด [Human-to-Tech]:
ข้อความอินพุต: "${inputText}"

ตอบกลับในรูปแบบ JSON Object เท่านั้น โดยมีโครงสร้างดังนี้:
{
  "summary": "สรุปเป้าหมายหลักเชิงธุรกิจ",
  "technicalRequirements": ["ข้อกำหนดทางเทคนิค 1", "ข้อกำหนดทางเทคนิค 2", "..."],
  "techStack": [
    { "name": "ชื่อเครื่องมือ/Stack 1", "desc": "เหตุผลที่แนะนำ" },
    { "name": "ชื่อเครื่องมือ/Stack 2", "desc": "เหตุผลที่แนะนำ" }
  ],
  "riskAnalysis": ["ข้อควรระวัง/ความเสี่ยง 1", "..."],
  "suggestedQuestions": ["คำถามสำคัญที่ควรถามลูกค้าเพิ่ม 1", "..."]
}`
    : `กรุณาแปลข้อความต่อไปนี้ภายใต้โหมด [Tech-to-Human]:
ข้อความอินพุต: "${inputText}"

ตอบกลับในรูปแบบ JSON Object เท่านั้น โดยมีโครงสร้างดังนี้:
{
  "summary": "สรุปสั้นๆ ของปัญหาเทคนิค",
  "politeExplanation": "ข้อความอธิบายที่สุภาพ เป็นมืออาชีพ พร้อมส่งให้ลูกค้าอ่านทันที",
  "analogy": {
    "icon": "อิโมจิที่เกี่ยวข้อง เช่น 🚗, 📬, 🗄️, 🔧",
    "title": "เปรียบเสมือน: ...",
    "description": "คำอธิบายเปรียบเทียบกับชีวิตประจำวันเพื่อความเข้าใจง่าย"
  },
  "impact": "ผลกระทบต่อผู้ใช้งาน",
  "estimatedTime": "ระยะเวลาแก้ไขโดยประมาณ"
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
