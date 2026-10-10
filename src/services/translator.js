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
  securityMode = 'cloud',
  username = null
) {
  if (!input || !input.trim()) return null;

  const apiKey = apiKeyOverride !== null ? apiKeyOverride : getStoredApiKey();
  const trimmed = input.trim();
  const baseUrl = getBackendBaseUrl();

  // 1. Try FastAPI REST Backend Endpoint (/api/translate) with fast timeout
  if (baseUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${baseUrl}/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          input_text: trimmed,
          mode: mode,
          api_key: apiKey,
          project_context: projectContext,
          budget_level: budgetLevel,
          timeline_constraint: timelineConstraint,
          use_rag: useRag,
          sanitize_pii: sanitizePii,
          security_mode: securityMode,
          username: username
        })
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const errJson = await response.json();
        const err = new Error(errJson.detail?.message || 'คุณใช้โควต้าฟรีครบกำหนดแล้ว');
        err.isQuotaExceeded = true;
        err.quotaDetails = errJson.detail;
        throw err;
      }

      if (response.ok) {
        const result = await response.json();
        return {
          mode: result.mode,
          sourceInput: result.source_input,
          sanitizedInput: result.sanitized_input || result.source_input,
          maskedItems: result.masked_items || [],
          ragSources: result.rag_sources || [],
          isAi: result.is_ai,
          data: result.data,
          quotaInfo: result.quota_info
        };
      }
    } catch (err) {
      if (err.isQuotaExceeded) {
        throw err;
      }
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

  const lower = text.toLowerCase();
  const isUiOnly = /ปุ่ม|หน้าจอ|สี|ui|ux|วิบวับ|สวย|ธีม|animation/.test(lower);

  if (isUiOnly) {
    return {
      summary: `ออกแบบและพัฒนาระบบ Interactive UI Component พร้อม Micro-interactions${projectContext ? ` (บริบท: ${projectContext})` : ''}`,
      technicalRequirements: [
        '[Frontend Component] พัฒนา Dynamic Button Component ด้วย CSS Keyframes (Shimmer / Glow Animation) พร้อม Hover/Active State',
        '[Accessibility & UX] รองรับ prefers-reduced-motion เพื่อไม่ให้รบกวนผู้ใช้งานที่มีปัญหาทางสายตา และรองรับ Responsive Touch Target บนมือถือ (ขั้นต่ำ 44x44px)',
        '[Analytics Telemetry] ฝัง Event Tracking (Click-through Rate) เพื่อเก็บสถิติ Conversion Rate ผ่าน Client-side Analytics',
        '[Backend / Database Layer] ไม่มีผลกระทบ (Frontend-only feature ไม่มีการเปลี่ยนแปลง API หรือ Database)'
      ],
      techStack: [
        { name: 'React + Vite', desc: 'สำหรับสร้าง UI Component ที่ตอบสนองไว' },
        { name: 'CSS Keyframes / Tailwind', desc: 'สำหรับทำ Micro-interactions และ Shimmer Effect ที่ลื่นไหล 60 FPS' }
      ],
      impactAnalysis: {
        affectedModules: ['LandingPage.jsx', 'ButtonComponent.jsx'],
        affectedTables: [],
        refactoringEffortDays: '0 วันทำการ (ไม่มีผลกระทบต่อ Backend Core Services)',
        impactSeverity: 'Low',
        riskMitigation: 'ทดสอบ Cross-browser Compatibility (Safari, Chrome, Mobile) และตรวจสอบว่า Animation ไม่รบกวนการอ่านเนื้อหาหลัก'
      },
      acceptanceCriteria: [
        '[AC-1] Given ผู้ใช้งานเปิดหน้าจอ, When ปุ่มแสดงผล, Then ต้องมี Shimmer Animation นุ่มนวลโดยไม่เกิด Frame Drop',
        '[AC-2] Given ผู้ใช้งานคลิกที่ปุ่ม, When มีการกด, Then ต้องส่ง Analytics Event สำเร็จและนำทางไปยังฟังก์ชันเป้าหมายได้ถูกต้อง'
      ],
      nonFunctionalRequirements: [
        '[Performance] UI Animation ต้องทำงานระดับ 60 FPS โดยใช้ GPU Hardware Acceleration (transform / opacity)',
        '[Accessibility] สอดคล้องกับมาตรฐาน WCAG 2.1 AA สำหรับ Color Contrast และ Touch Target Size'
      ],
      apiDraft: [
        "Client Analytics Event: trackEvent('cta_button_click', { button_name: 'hero_shimmer_cta' })"
      ],
      riskAnalysis: [
        'ระวังการใช้เอฟเฟกต์ที่ฉูดฉาดเกินไปจนดึงความสนใจออกจากเนื้อหาสำคัญของเว็บไซต์'
      ],
      suggestedQuestions: [
        'ต้องการให้ปุ่มนี้ลิงก์ไปยังหน้าใดเป็นเป้าหมายหลัก (เช่น หน้าสมัครสมาชิก หรือ หน้าชำระเงิน)?',
        'มีเกณฑ์สีแบรนด์เฉพาะสำหรับเอฟเฟกต์ Shimmer หรือไม่?'
      ],
      effortEstimation: {
        complexity: 'Low',
        estimatedManDays: '0.5 - 1 วันทำการ',
        estimatedCostRange: '3,000 - 6,000 บาท',
        reasoning: 'เน้นงานเขียน CSS Animation, Component Styling, ทดสอบ Mobile Touch Target และเชื่อมต่อ Event Tracking'
      }
    };
  }

  let domainSummary = 'ออกแบบและพัฒนาระบบประมวลผลข้อมูลและ Business Workflow อัตโนมัติ';
  let domainFeature = 'Automated Business Logic & Data Processing';
  let apiEndpoint = 'POST /api/v1/workflows/execute';

  if (/จ่าย|เงิน|ชำระ|payment|bank|โอน/.test(lower)) {
    domainSummary = 'พัฒนาระบบ Payment Gateway Integration & Transaction Verification';
    domainFeature = 'Payment Settlement & Webhook Processing';
    apiEndpoint = 'POST /api/v1/payments/checkout';
  } else if (/เตือน|แจ้ง|notify|notification|email|sms|line/.test(lower)) {
    domainSummary = 'พัฒนาระบบ Event-Driven Multi-Channel Notification Dispatcher';
    domainFeature = 'Automated Event Messaging & Alert Queue';
    apiEndpoint = 'POST /api/v1/notifications/send';
  } else if (/ค้นหา|search|กรอง|filter/.test(lower)) {
    domainSummary = 'พัฒนาระบบ Advanced Search & Dynamic Multi-Criteria Filtering Engine';
    domainFeature = 'Full-text Search & Indexed Query Retrieval';
    apiEndpoint = 'GET /api/v1/search/query';
  }

  return {
    summary: `${domainSummary}${projectContext ? ` (บริบท: ${projectContext})` : ''}`,
    technicalRequirements: [
      `[Frontend & UI/UX] ออกแบบและสร้าง UI Component สำหรับ ${domainFeature} รองรับ Responsive Layout และ Form Validation`,
      `[Frontend State Management] จัดการ State หน้าจอเรียลไทม์ และรองรับ Micro-interactions (เช่น Loading Skeleton, Toast Alerts)`,
      `[Backend Services] พัฒนา REST API Endpoints สำหรับประมวลผลข้อมูล ${domainFeature} พร้อมทำ DTO Schema Validation`,
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
      `[AC-1] Given ผู้ใช้งานที่มีสิทธิ์เข้าถึงระบบ, When กดปุ่มบันทึกหรือส่งข้อมูลคำขอ, Then ระบบต้องตอบกลับสถานะสำเร็จและบันทึกข้อมูลเข้าฐานข้อมูลภายใน 500ms`,
      `[AC-2] Given ผู้ใช้งานป้อนข้อมูลไม่ครบถ้วนตามเกณฑ์ Validation, When พยายามกดส่งคำขอ, Then ระบบต้องแสดง Inline Error Validation Alert ชัดเจน`,
      `[AC-3] Given เกิดความผิดพลาดทางเครือข่ายหรือบริการภายนอก Timeout, Then ระบบต้องแสดง Toast Notification แจ้งเตือนสุภาพพร้อมปุ่ม Retry และมี Fallback รองรับ`
    ],
    nonFunctionalRequirements: [
      `[Performance SLA] API Latency ต้องไม่เกิน 300ms ที่ระดับ 1,000 Concurrent Users`,
      `[Security Standard] ปฏิบัติตามมาตรฐาน OWASP Top 10 และมาตรการคุ้มครองข้อมูลส่วนบุคคล (PDPA)`
    ],
    apiDraft: [
      `${apiEndpoint} (Request Body: { "action": "SUBMIT", "requestId": "uuid-v4" })`,
      `GET /api/v1/system/health (Response: { "status": "UP" })`
    ],
    riskAnalysis: [
      `ความเสี่ยงด้านความเข้ากันได้ (Backward Compatibility) กับโมดูลเดิมของระบบ`,
      `การจัดการ Concurrent Transactions หากมีผู้ใช้ส่งคำขอพร้อมกันจำนวนมาก`
    ],
    suggestedQuestions: [
      `มีข้อกำหนดด้านสิทธิ์การเข้าถึง (Permission Matrix / Role-based Access) เฉพาะหรือไม่?`,
      `ต้องการให้ระบบส่งแจ้งเตือนผ่านช่องทางใดเพิ่มเติมหรือไม่ (เช่น LINE Notify, Email, Webhook)?`
    ],
    effortEstimation: {
      complexity: 'Medium',
      estimatedManDays: '3 - 5 วันทำการ',
      estimatedCostRange: '20,000 - 35,000 บาท',
      reasoning: `ประเมินจากการสร้าง UI Component ใหม่ 1.5 วัน, พัฒนาและเชื่อมต่อ Backend API 2 วัน และเขียน Automated Test พร้อม Refactor โมดูลเดิม 1 วันทำการ`
    }
  };
}

function getLocalTechToHuman(text) {
  const lower = text.toLowerCase();
  let issueTitle = 'ระบบกำลังอยู่ในขั้นตอนการปรับแต่งประสิทธิภาพและจัดระเบียบข้อมูลเบื้องหลัง';
  let analogyIcon = '🛠️';
  let analogyTitle = 'เปรียบเสมือน: การตรวจเช็กระยะและปรับจูนเครื่องยนต์ตามรอบการใช้งาน';
  let analogyDesc = 'เหมือนการนำรถเข้าศูนย์บริการเพื่อเปลี่ยนถ่ายน้ำมันหล่อลื่นและตรวจความพร้อม เพื่อให้ขับขี่ได้อย่างราบรื่นและปลอดภัยสูงสุดครับ';

  if (/database|deadlock|lock|pool|query|sql/.test(lower)) {
    issueTitle = 'ระบบจัดเก็บข้อมูลมีความหนาแน่นของการเรียกใช้งานพร้อมกันสูง';
    analogyIcon = '🗄️';
    analogyTitle = 'เปรียบเสมือน: ห้องสมุดที่มีผู้เข้าค้นหาหนังสือเล่มเดียวกันพร้อมกันหลายท่าน';
    analogyDesc = 'เหมือนบรรณารักษ์กำลังจัดคิวเปิดช่องให้บริการค้นหาเพิ่ม เพื่อให้ทุกท่านยืมหนังสือได้รวดเร็วโดยไม่ต้องยืนรอคิวครับ';
  } else if (/network|api|timeout|เชื่อมต่อ|ล่ม|down|500|502/.test(lower)) {
    issueTitle = 'ช่องทางเชื่อมต่อรับส่งข้อมูลระหว่างเซิร์ฟเวอร์เกิดการสะดุดชั่วคราว';
    analogyIcon = '🚰';
    analogyTitle = 'เปรียบเสมือน: ท่อส่งน้ำประปาที่มีการสลับวาล์วไปยังท่อสำรอง';
    analogyDesc = 'เหมือนระบบกำลังสลับไปใช้ท่อส่งน้ำสายสำรอง เพื่อให้น้ำไหลเวียนได้ต่อเนื่องและแรงดันสม่ำเสมอครับ';
  } else if (/memory|ram|cpu|leak|เต็ม|ช้า|ค้าง/.test(lower)) {
    issueTitle = 'ทรัพยากรการประมวลผลของเครื่องแม่ข่ายทำงานเต็มพิกัดชั่วขณะ';
    analogyIcon = '🚗';
    analogyTitle = 'เปรียบเสมือน: รถสัญจรหนาแน่นบนทางด่วนในช่วงเวลาเร่งด่วน';
    analogyDesc = 'เหมือนเจ้าหน้าที่กำลังเปิดช่องทางพิเศษเพื่อระบายการจราจรให้รถเคลื่อนตัวได้คล่องตัวและปลอดภัยครับ';
  }

  return {
    summary: issueTitle,
    politeExplanation: `เรียนท่านลูกค้าและทีมงาน ทางทีมวิศวกรได้เข้าควบคุมและตรวจสอบสถานการณ์เรียบร้อยแล้วครับ สาเหตุเกิดจาก${issueTitle} ขณะนี้ทีมงานกำลังดำเนินการขยายขีดความสามารถและจัดระเบียบระบบสำรอง เพื่อให้ระบบกลับมาทำงานได้อย่างเสถียร รวดเร็ว และข้อมูลปลอดภัย 100% ครับ`,
    analogy: {
      icon: analogyIcon,
      title: analogyTitle,
      description: analogyDesc
    },
    impact: 'ผู้ใช้งานอาจพบการตอบสนองที่ชะลอตัวลงเล็กน้อยในบางช่วงเวลาสั้นๆ โดยไม่มีข้อมูลสูญหายอย่างแน่นอนครับ',
    estimatedTime: 'ทีมงานกำลังเร่งดำเนินการและคาดว่าจะเสร็จสิ้นการปรับปรุงพร้อมทดสอบระบบภายใน 30-45 นาทีนี้ครับ'
  };
}
