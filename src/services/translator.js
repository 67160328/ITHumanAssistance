import { PRESETS } from '../data/presets';
import { callGeminiApi } from './aiService';
import { sanitizeClientText } from './securityService';

export const DEFAULT_API_KEY = import.meta.env?.VITE_GEMINI_API_KEY || '';

const getBackendBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
  }
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
export async function translateText(
  input,
  mode,
  apiKeyOverride = null,
  projectContext = null,
  budgetLevel = null,
  timelineConstraint = null,
  useRag = true,
  sanitizePii = true,
  securityMode = 'cloud'
) {
  if (!input || !input.trim()) return null;

  const apiKey = apiKeyOverride !== null ? apiKeyOverride : getStoredApiKey();
  const trimmed = input.trim();
  const baseUrl = getBackendBaseUrl();

  // 1. Try FastAPI REST Backend Endpoint (/api/translate)
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
          timeline_constraint: timelineConstraint,
          use_rag: useRag,
          sanitize_pii: sanitizePii,
          security_mode: securityMode
        })
      });

      if (response.ok) {
        const result = await response.json();
        return {
          mode: result.mode,
          sourceInput: result.source_input,
          sanitizedInput: result.sanitized_input || result.source_input,
          maskedItems: result.masked_items || [],
          ragSources: result.rag_sources || [],
          isAi: result.is_ai,
          data: result.data
        };
      }
    } catch (err) {
      console.info('FastAPI backend connection warning, using client engine:', err.message);
    }
  }

  // Sanitization on client side
  let clientProcessedInput = trimmed;
  let clientMaskedItems = [];
  if (sanitizePii) {
    const sResult = sanitizeClientText(trimmed);
    clientProcessedInput = sResult.sanitizedText;
    clientMaskedItems = sResult.maskedItems;
  }

  // 2. Direct Client-side Gemini API call (For Plesk / Static Web hosting)
  if (apiKey && apiKey.trim() && securityMode !== 'private-local') {
    try {
      const aiData = await callGeminiApi(clientProcessedInput, mode, apiKey);
      return {
        mode,
        sourceInput: input,
        sanitizedInput: clientProcessedInput,
        maskedItems: clientMaskedItems,
        ragSources: [],
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
        sanitizedInput: clientProcessedInput,
        maskedItems: clientMaskedItems,
        ragSources: [],
        isAi: false,
        data: matchedPreset.translation
      };
    }
  }

  // 4. Client-side Fallback Engine
  return {
    mode,
    sourceInput: input,
    sanitizedInput: clientProcessedInput,
    maskedItems: clientMaskedItems,
    ragSources: [],
    isAi: false,
    data: mode === 'human-to-tech' ? getLocalHumanToTech(clientProcessedInput, projectContext) : getLocalTechToHuman(clientProcessedInput)
  };
}

function getLocalHumanToTech(text, projectContext = null) {
  let techStack = [];

  if (projectContext && projectContext.trim()) {
    const ctx = projectContext.trim();
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
      `[Frontend & UI/UX] ออกแบบและสร้าง UI Component สำหรับฟังก์ชัน '${text.slice(0, 40)}' รองรับ Responsive Layout และ Form Validation`,
      `[Frontend State Management] จัดการ State หน้าจอเรียลไทม์ และรองรับ Micro-interactions (เช่น Loading Skeleton, Toast Alerts)`,
      `[Backend Services] พัฒนา REST API Endpoints สำหรับประมวลผลข้อมูลฟังก์ชัน '${text.slice(0, 40)}' พร้อมทำ Request Validation`,
      `[Database & Data Layer] ออกแบบ Data Schema, Indexing และ Caching Strategy ให้สอดคล้องกับสถาปัตยกรรมโปรเจกต์เดิม`,
      `[Security & Access Control] พัฒนาระบบ Authentication/Authorization และ Input Sanitization ป้องกัน XSS & Injection Attacks`,
      `[Integration & Testing] เชื่อมต่อ Third-party Services/APIs ที่เกี่ยวข้อง พร้อมเขียน Unit Tests & Integration Tests สำหรับ Core Logic`
    ],
    techStack: techStack,
    impactAnalysis: {
      affectedModules: ['PaymentService.py', 'OrderService.py'],
      affectedTables: ['orders', 'users'],
      refactoringEffortDays: '2 - 3 วันทำการ',
      impactSeverity: 'Medium',
      riskMitigation: 'ทำ Regression Testing โมดูลเดิม และตรวจสอบ Token Authentication ก่อนเปิดให้บริการ'
    },
    acceptanceCriteria: [
      `[AC-1] Given ผู้ใช้งานป้อนข้อมูล '${text.slice(0, 20)}...', When กดปุ่มบันทึก/ส่งข้อมูล, Then ระบบต้องแสดงสถานะสำเร็จและบันทึกข้อมูลเข้าฐานข้อมูลภายใน 1 วินาที`,
      `[AC-2] Given ผู้ใช้งานป้อนข้อมูลไม่ครบถ้วน, When พยายามกดส่ง, Then ระบบต้องแสดง Inline Error Validation Alert ชัดเจน`,
      `[AC-3] Given เกิดความผิดพลาดทางเครือข่าย/เซิร์ฟเวอร์, Then ระบบต้องแสดง Toast Notification แจ้งเตือนสุภาพพร้อมปุ่ม Retry`
    ],
    nonFunctionalRequirements: [
      `[Performance SLA] API Latency ต้องไม่เกิน 500ms ที่ระดับ 1,000 Concurrent Users`,
      `[Security Standard] ปฏิบัติตามมาตรฐาน OWASP Top 10 และมาตรการคุ้มครองข้อมูลส่วนบุคคล (PDPA)`
    ],
    apiDraft: [
      `POST /api/v1/requests (Body: { "payload": "${text.slice(0, 30)}...", "timestamp": "2026-09-19T..." })`,
      `GET /api/v1/requests/{id} (Response: { "id": 1, "status": "SUCCESS" })`
    ],
    riskAnalysis: [
      `ความเสี่ยงด้านความเข้ากันได้ (Backward Compatibility) กับเวอร์ชันเดิม`,
      `การจัดการ Concurrent Transactions หากมีผู้ใช้ส่งคำขอพร้อมกันจำนวนมาก`
    ],
    suggestedQuestions: [
      `มีข้อกำหนดด้านสิทธิ์การเข้าถึง (Permission Matrix / Role-based Access) เฉพาะหรือไม่?`,
      `ต้องการให้ระบบส่งแจ้งเตือนผ่านช่องทางใดเพิ่มเติมหรือไม่ (เช่น LINE Notify, Email, Webhook)?`
    ],
    effortEstimation: {
      complexity: 'Medium',
      estimatedManDays: '4 - 6 วันทำการ',
      estimatedCostRange: '20,000 - 35,000 บาท',
      reasoning: `ประเมินจากการสร้าง UI Component ใหม่ 2 วัน, พัฒนาและเชื่อมต่อ Backend API 2 วัน และเขียน Automated Test พร้อม Refactor โมดูลเดิม 1-2 วันทำการ`
    }
  };
}

function getLocalTechToHuman(text) {
  return {
    summary: 'แปลงปัญหาทางเทคนิคและอธิบายสถานะให้ลูกค้าเข้าใจอย่างมืออาชีพ',
    politeExplanation: `เรียนท่านลูกค้า ทางทีมวิศวกรได้ตรวจสอบประเด็น "${text.slice(0, 45)}..." เรียบร้อยแล้ว ขณะนี้ทีมงานกำลังปรับปรุงและจัดระเบียบระบบท่อส่งข้อมูล เพื่อให้ระบบทำงานได้รวดเร็ว ลื่นไหล และปลอดภัยสูงสุดครับ`,
    analogy: {
      icon: '🚗',
      title: 'เปรียบเสมือน: การปรับปรุงพื้นผิวทางด่วนและขยายช่องจราจร',
      description: 'เหมือนทีมช่างกำลังซ่อมแซมและขยายช่องจ่ายเงิน เพื่อให้รถยนต์ทุกคันสัญจรได้เร็วขึ้นโดยไม่เกิดการติดขัดสะสมครับ'
    },
    impact: 'ระบบอาจมีการตอบสนองช้าลงเล็กน้อยในบางช่วงเวลาสั้นๆ แต่ข้อมูลของท่านปลอดภัย 100% ครับ',
    estimatedTime: 'ทีมงานคาดว่าจะดำเนินการตรวจสอบและทดสอบระบบให้พร้อมใช้งานเต็มรูปแบบภายใน 1-2 ชั่วโมงนี้ครับ'
  };
}
