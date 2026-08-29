import { PRESETS } from '../data/presets';
import { callGeminiApi } from './aiService';

export const DEFAULT_API_KEY = '';

const getBackendBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Only attempt localhost fetch if actually running on dev machine
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
  }
  // On Plesk or production without FastAPI backend proxy, return null to use client engine directly
  return null;
};

export function getStoredApiKey() {
  const key = localStorage.getItem('gemini_api_key');
  return (key !== null && key !== '') ? key : DEFAULT_API_KEY;
}

export function saveApiKey(key) {
  localStorage.setItem('gemini_api_key', key);
}

/**
 * Main Translator router - fetches from FastAPI Backend REST API or Client Fallback Engine
 */
export async function translateText(input, mode, apiKeyOverride = null, projectContext = null, budgetLevel = null, timelineConstraint = null) {
  if (!input || !input.trim()) return null;

  const apiKey = apiKeyOverride !== null ? apiKeyOverride : getStoredApiKey();
  const trimmed = input.trim();
  const baseUrl = getBackendBaseUrl();

  // 1. Try FastAPI REST Backend Endpoint (/api/translate) ONLY if running locally
  if (baseUrl) {
    try {
      const response = await fetch(`${baseUrl}/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input_text: trimmed,
          mode: mode,
          api_key: apiKey,
          project_context: projectContext,
          budget_level: budgetLevel,
          timeline_constraint: timelineConstraint
        })
      });

      if (response.ok) {
        const result = await response.json();
        return {
          mode: result.mode,
          sourceInput: result.source_input,
          isAi: result.is_ai,
          data: result.data
        };
      }
    } catch (err) {
      console.info('FastAPI backend connection warning, using client engine:', err.message);
    }
  }

  // 2. Direct Client-side Gemini API call (For Plesk / Static Web hosting)
  if (apiKey && apiKey.trim()) {
    try {
      const aiData = await callGeminiApi(trimmed, mode, apiKey);
      return {
        mode,
        sourceInput: input,
        isAi: true,
        data: aiData
      };
    } catch (err) {
      console.warn('Client-side Gemini API call failed, falling back to presets/rules:', err);
    }
  }

  // 3. Client-side Preset Check (Only if no Project Context)
  if (!projectContext || !projectContext.trim()) {
    const presetList = mode === 'human-to-tech' ? PRESETS.humanToTech : PRESETS.techToHuman;
    const matchedPreset = presetList.find(p => p.input.trim() === trimmed || trimmed.includes(p.input.slice(0, 20)));
    
    if (matchedPreset) {
      return {
        mode,
        sourceInput: input,
        isAi: false,
        data: matchedPreset.translation
      };
    }
  }

  // 4. Client-side Fallback
  return {
    mode,
    sourceInput: input,
    isAi: false,
    data: mode === 'human-to-tech' ? getLocalHumanToTech(trimmed, projectContext) : getLocalTechToHuman(trimmed)
  };
}

function getLocalHumanToTech(text, projectContext = null) {
  let techStack = [];

  if (projectContext && projectContext.trim()) {
    const ctx = projectContext.trim();
    // Intelligently breakdown parts if possible or output exact context
    const parts = ctx.split(/,|;|\+|\n/).map(s => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      techStack = parts.map((part, i) => ({
        name: part,
        desc: i === 0 ? 'กำหนดตาม Project Context ขององค์กร (Front-end / Core Stack)' : 'กำหนดตาม Project Context ขององค์กร (Back-end / Data Layer)'
      }));
    } else {
      techStack.push({
        name: 'Project Tech Stack',
        desc: ctx
      });
    }
  } else {
    techStack = [
      { name: 'FastAPI + Python', desc: 'Back-end REST API High Performance' },
      { name: 'React + Vite', desc: 'Front-end User Interface' },
      { name: 'PostgreSQL', desc: 'Database สำหรับการจัดเก็บข้อมูลอย่างปลอดภัย' }
    ];
  }

  return {
    summary: `แปลความต้องการเชิงธุรกิจสำหรับ: "${text}"${projectContext ? ` (บริบท: ${projectContext})` : ''}`,
    technicalRequirements: [
      `[Frontend & UI/UX] ออกแบบและสร้าง UI Component สำหรับฟังก์ชัน '${text}' รองรับ Responsive Layout และ Form Validation`,
      `[Frontend State Management] จัดการ State หน้าจอเรียลไทม์ และรองรับ Micro-interactions (เช่น Loading Skeleton, Toast Alerts)`,
      `[Backend Services] พัฒนา REST API Endpoints สำหรับประมวลผลข้อมูลฟังก์ชัน '${text}' พร้อมทำ Request Validation`,
      `[Database & Data Layer] ออกแบบ Data Schema, Indexing และ Caching Strategy ให้สอดคล้องกับสถาปัตยกรรมโปรเจกต์เดิม`,
      `[Security & Access Control] พัฒนาระบบ Authentication/Authorization และ Input Sanitization ป้องกัน XSS & Injection Attacks`,
      `[Integration & Testing] เชื่อมต่อ Third-party Services/APIs ที่เกี่ยวข้อง พร้อมเขียน Unit Tests & Integration Tests สำหรับ Core Logic`
    ],
    techStack: techStack,
    acceptanceCriteria: [
      `[AC-1] Given ผู้ใช้งานป้อนข้อมูล '${text.slice(0, 20)}...', When กดปุ่มบันทึก/ส่งข้อมูล, Then ระบบต้องแสดงสถานะสำเร็จและบันทึกข้อมูลเข้าฐานข้อมูลภายใน 1 วินาที`,
      `[AC-2] Given ผู้ใช้งานป้อนข้อมูลไม่ครบถ้วน, When พยายามกดส่ง, Then ระบบต้องแสดง Inline Error Validation Alert ชัดเจน`,
      `[AC-3] Given เกิดความผิดพลาดทางเครือข่าย/เซิร์ฟเวอร์, Then ระบบต้องแสดง Toast Notification แจ้งเตือนสุภาพพร้อมปุ่ม Retry`
    ],
    nonFunctionalRequirements: [
      `[Performance SLA] API Latency ต้องไม่เกิน 500ms ที่ระดับ 1,000 Concurrent Users`,
      `[Security & PDPA] เข้ารหัสข้อมูลสำคัญ (Data-at-Rest & In-Transit) ด้วย TLS 1.3 และกรองข้อมูลส่วนบุคคลตามมาตรฐาน PDPA`,
      `[Availability] ระบบรองรับการทำ Auto-scaling พร้อม Uptime SLA 99.9%`
    ],
    apiDraft: [
      `POST /api/v1/feature/action - Request Payload: { "input": "${text.slice(0, 30)}", "timestamp": "ISO8601" }`,
      `GET /api/v1/feature/status - Response: { "status": "success", "data": { ... } }`
    ],
    riskAnalysis: [
      `ควรระบุเงื่อนไขและขอบเขตงานสำหรับ '${text.slice(0, 30)}' ให้ชัดเจนก่อนพัฒนา`,
      `ต้องตรวจสอบ Compatibility กับ Tech Stack เดิม (${projectContext || 'ระบบเดิม'})`
    ],
    suggestedQuestions: [
      'ต้องการส่งออกเป็นไฟล์ประเภทใดเพิ่มหรือไม่? (เช่น Excel/CSV)',
      'มีเงื่อนไขเรื่องสิทธิ์การเข้าถึงข้อมูลหรือไม่?'
    ],
    effortEstimation: {
      complexity: 'Medium',
      estimatedManDays: '3 - 5 วันทำการ',
      estimatedCostRange: '15,000 - 30,000 บาท',
      reasoning: `วิเคราะห์จากขอบเขตงานการสร้าง UI และ API Endpoint ตามบริบท ${projectContext || 'มาตรฐาน'}`
    }
  };
}

function getLocalTechToHuman(text) {
  const lower = text.toLowerCase();
  
  // Intelligent Keyword Rule Engine for Offline / Fallback Translation
  let title = "การปรับปรุงประสิทธิภาพการรับส่งข้อมูล";
  let analogyTitle = "เปรียบเสมือน: การเปิดช่องทางพิเศษบนทางด่วน";
  let analogyDesc = "เพื่อระบายการจราจรที่หนาแน่น ให้รถทุกคันเดินทางถึงจุดหมายได้สะดวกรวดเร็วยิ่งขึ้นครับ";
  let analogyIcon = "🚗";
  let impact = "การเปิดหน้าจออาจใช้เวลาโหลดข้อมูลเพิ่มขึ้นเล็กน้อยชั่วคราว แต่ข้อมูลทั้งหมดปลอดภัยดีครับ";
  let explanation = "ทางทีมงานขอเรียนแจ้งว่า ขณะนี้ระบบมีผู้เข้ามาใช้งานพร้อมกันเป็นจำนวนมาก ทีมพัฒนาได้เร่งขยายช่องทางรับส่งข้อมูลและจัดระเบียบระบบความปลอดภัย เพื่อให้ทุกท่านสามารถใช้งานได้อย่างราบรื่นและต่อเนื่องที่สุดครับ";

  if (lower.includes("traffic") || lower.includes("spooling") || lower.includes("cpu") || lower.includes("504") || lower.includes("timeout") || lower.includes("scaling") || lower.includes("rate limit")) {
    title = "มีผู้เข้าใช้งานระบบพร้อมกันจำนวนมาก ระบบกำลังเร่งขยายช่องทางรองรับ";
    analogyTitle = "เปรียบเสมือน: การเปิดประตูและเคาน์เตอร์บริการเพิ่มในห้าง";
    analogyDesc = "เมื่อมีลูกค้าเดินทางมาที่ห้างพร้อมกันเป็นจำนวนมาก เจ้าหน้าที่จึงเร่งเปิดเคาน์เตอร์และประตูทางเข้าเพิ่ม เพื่อให้ลูกค้าทุกคนได้รับการบริการอย่างสะดวกรวดเร็วโดยไม่ต้องรอคิวนานครับ";
    analogyIcon = "🏬";
    explanation = "เรียนท่านลูกค้า ขณะนี้มีผู้เข้าใช้งานเว็บไซต์พร้อมกันเป็นจำนวนมาก ส่งผลให้ระบบมีการรอคิวเข้าใช้งานชั่วคราว ทางทีมวิศวกรกำลังขยายขนาดเซิร์ฟเวอร์และเปิดช่องทางรับส่งข้อมูลเพิ่มเติมแบบเร่งด่วน เพื่อให้ระบบกลับมารวดเร็วเต็มประสิทธิภาพครับ";
    impact = "ผู้ใช้อาจพบการโหลดหน้าจอช้าลงหรือต้องรอคิวสั้นๆ ชั่วขณะ แต่ระบบไม่ได้ล่มและข้อมูลทุกอย่างปลอดภัย 100% ครับ";
  } else if (lower.includes("cors") || lower.includes("permission") || lower.includes("403") || lower.includes("auth")) {
    title = "การตรวจสอบความปลอดภัยของประตูเชื่อมต่อข้อมูล";
    analogyTitle = "เปรียบเสมือน: เจ้าหน้าที่รักษาความปลอดภัยตรวจสอบบัตรผ่าน";
    analogyDesc = "เพื่อความปลอดภัยสูงสุดของข้อมูล เจ้าหน้าที่จึงทำการตรวจเช็คเอกสารยืนยันตัวตนอย่างละเอียดก่อนอนุญาตให้เข้าสู่อาคารครับ";
    analogyIcon = "🛡️";
    explanation = "เรียนท่านลูกค้า ขณะนี้ระบบความปลอดภัยมีการตรวจสอบสิทธิ์การเข้าถึงข้อมูลอย่างรัดกุม ทีมงานกำลังปรับปรุงกุญแจยืนยันตัวตนให้เชื่อมต่อได้ถูกต้องและปลอดภัยที่สุดครับ";
    impact = "ผู้ใช้อาจต้องเข้าสู่ระบบใหม่อีกครั้งเพื่อความปลอดภัยครับ";
  } else if (lower.includes("memory") || lower.includes("oom") || lower.includes("leak") || lower.includes("500")) {
    title = "การจัดระเบียบคลังเก็บข้อมูลชั่วคราวเพื่อคืนพื้นที่ความจำ";
    analogyTitle = "เปรียบเสมือน: การเคลียร์แฟ้มเอกสารบนโต๊ะทำงาน";
    analogyDesc = "เพื่อไม่ให้โต๊ะทำงานเต็มจนขยับตัวไม่ได้ เจ้าหน้าที่จึงเข้าจัดเก็บแฟ้มที่ใช้งานเสร็จแล้วเข้าตู้ เพื่อให้มีพื้นที่โล่งสำหรับการทำงานชิ้นต่อไปอย่างคล่องตัวครับ";
    analogyIcon = "📦";
    explanation = "เรียนท่านลูกค้า ทีมงานกำลังจัดระเบียบพื้นที่หน่วยความจำของระบบ เพื่อเพิ่มความเสถียรและป้องกันการสะดุดระหว่างการประมวลผลข้อมูลปริมาณมากครับ";
    impact = "ระบบอาจมีการรีเฟรชสั้นๆ 1 ครั้ง แต่ไม่มีข้อมูลสูญหายแน่นอนครับ";
  }

  return {
    summary: title,
    politeExplanation: explanation,
    analogy: {
      icon: analogyIcon,
      title: analogyTitle,
      description: analogyDesc
    },
    impact: impact,
    estimatedTime: "ทีมงานคาดว่าจะดำเนินการแล้วเสร็จภายใน 30 - 60 นาทีนี้ครับ"
  };
}
