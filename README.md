# 🌐 IT-to-Human Translator (ล่ามแปลภาษาไอทีอัจฉริยะ)

> **AI-Powered Requirement Engineering & Technical Communication Platform**
> โครงงานพัฒนาเว็บแอปพลิเคชัน Full-Stack ที่ทลายกำแพงการสื่อสารระหว่าง **"ฝ่ายธุรกิจ/ลูกค้า (Non-Tech)"** และ **"ทีมพัฒนา/โปรแกรมเมอร์ (Tech)"** ขับเคลื่อนด้วย **FastAPI**, **React + Vite**, **Docker** และ **Google Gemini AI**

---

## 📌 ที่มาและความสำคัญ (Problem Statement)
ในวงการพัฒนาซอฟต์แวร์ ปัญหาคลาสสิกที่ทำให้งานล่าช้าหรืองบบานปลายมักเกิดจาก **Communication Gap**:
* **ลูกค้า/ฝ่ายธุรกิจ:** มักจะบรีฟงานด้วยภาษาที่เป็นนามธรรม เช่น *"อยากได้เว็บขายของเหมือน Shopee ทำคนเดียวเสร็จใน 3 วัน"* ซึ่งโปรแกรมเมอร์ไม่สามารถนำไปเขียนโค้ดได้ทันที
* **โปรแกรมเมอร์:** เมื่อระบบขัดข้อง มักจะอธิบายด้วยศัพท์เทคนิคล้วนๆ เช่น *"ติด CORS Error และมีปัญหา N+1 Query"* ทำให้ลูกค้าเข้าใจผิดและคิดว่าทีมงานแก้ตัว

**IT-to-Human Translator** ถูกสร้างขึ้นเพื่อทำหน้าที่เป็น **"ล่ามคนกลาง"** แปลงภาษาของทั้งสองฝั่งให้ตรงประเด็น เข้าใจง่าย และนำไปปฏิบัติงานต่อได้ทันที

---

## ✨ ฟีเจอร์เด่น (Key Features)

### 1. โหมด [Human-to-Tech] : แปลความต้องการลูกค้า ➔ ข้อกำหนดทางเทคนิค
* **Context-Aware Ingestion:** ใส่บริบทเดิมขององค์กรได้ (เช่น *"ใช้ Python FastAPI + PostgreSQL บน AWS"*) เพื่อให้ AI ออกแบบระบบที่สอดคล้องกับสถาปัตยกรรมเดิม
* **Technical Requirements:** วิเคราะห์และสรุปฟีเจอร์ออกมาเป็นข้อย่อยสำหรับนักพัฒนา
* **Tech Stack Recommendation:** แนะนำเครื่องมือ สถาปัตยกรรม และฐานข้อมูลที่เหมาะสม
* **Risk & Scope Analysis:** แจ้งเตือนความเสี่ยงของโปรเจกต์ และระบุคำถามที่ควรถามลูกค้าเพิ่ม
* **AI Effort & Cost Estimator:** ประเมินระดับความซับซ้อน (Complexity), ระยะเวลาทำงาน (Man-Days) และช่วงงบประมาณเบื้องต้น
* **Export to Jira Format:** ส่งออก Requirement เป็นรูปแบบ Jira Markdown พร้อมนำไปเปิด Ticket ได้ทันที

### 2. โหมด [Tech-to-Human] : แปลศัพท์เทคนิค ➔ ภาษาธุรกิจที่สุภาพ
* **Polite & Business Tone:** แปลงศัพท์เทคนิคยากๆ เป็นคำอธิบายที่สุภาพ แสดงความรับผิดชอบ และเข้าใจง่าย
* **Everyday Analogy:** ใช้วิธีการอุปมาอุปไมยเปรียบเทียบกับชีวิตประจำวัน (เช่น ระบบจราจร, เจ้าหน้าที่ตรวจบัตร, การจัดระเบียบตู้เอกสาร) เพื่อให้ลูกค้าเห็นภาพชัดเจน
* **Impact & Time Estimation:** ระบุผลกระทบต่อผู้ใช้ และระยะเวลาแก้ไขโดยประมาณ

### 3. Dual-Layer Reliability (ระบบสองชั้น)
* **Online Mode:** ประมวลผลแบบ Real-time ร่วมกับ **Google Gemini 1.5 Flash** ผ่าน FastAPI Backend
* **Offline / Fallback Mode:** มี **Smart Semantic Rule Engine** ฝั่ง Frontend ช่วยแปลผลได้อย่างถูกต้องแม้ไม่มีอินเทอร์เน็ตหรือ API Key มีปัญหา

---

## 🛠️ สถาปัตยกรรมระบบ (System Architecture & Tech Stack)

| ส่วนประกอบ | เทคโนโลยีที่ใช้ | รายละเอียด |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite 5, Lucide Icons | Responsive Glassmorphism Design, Fast HMR |
| **Backend** | FastAPI (Python 3.11), Pydantic, Uvicorn | High Performance Asynchronous REST API, Data Validation |
| **AI Engine** | Google Gemini API (Gemini 1.5 Flash) | Context-Aware Prompt Engineering |
| **Container & DevOps** | Docker, Docker Compose | Multi-container setup (Frontend Nginx + Backend API) |

---

## 🚀 การติดตั้งและรันโปรเจกต์ (Getting Started)

### 🔹 วิธีที่ 1: รันด้วย Docker Compose (แนะนำ)
`ash
# 1. Clone repository
git clone https://github.com/67160328/ITHumanAssistance.git
cd ITHumanAssistance

# 2. สั่งรัน Containers
docker compose up -d --build
`
* **Frontend Web:** [http://localhost:3000](http://localhost:3000)
* **Backend API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 🔹 วิธีที่ 2: รันแยกเครื่อง (Manual Development)

#### 1. Backend (FastAPI)
`ash
# ติดตั้ง dependencies
pip install -r backend/requirements.txt

# รัน FastAPI server
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
`

#### 2. Frontend (React + Vite)
`ash
# ติดตั้ง dependencies
npm install

# รัน Vite dev server
npm run dev
`

---

## 📂 โครงสร้างโปรเจกต์ (Project Structure)
`	ext
ITHumanAssistance/
├── backend/
│   ├── Dockerfile             # Dockerfile สำหรับ FastAPI
│   ├── main.py                # FastAPI Routes, CORS & Data Models
│   ├── models.py              # Pydantic Schema Validation
│   ├── requirements.txt       # Python Dependencies
│   └── services.py            # Gemini AI Integration & Prompt Engine
├── src/
│   ├── components/            # React UI Components (SettingsModal, Auth, etc.)
│   ├── data/presets.js        # ตัวอย่างชุดข้อมูลเคสทดสอบ
│   ├── services/              # API Client & Smart Rule Translator
│   ├── App.jsx                # หน้าจอหลักของ Web Application
│   └── index.css              # Custom Styling (Glassmorphism & Neon Theme)
├── docker-compose.yml         # Container Orchestration
├── Dockerfile.frontend        # Dockerfile สำหรับ Frontend (Nginx)
├── vite.config.js             # Vite Configuration
└── package.json               # Node.js Dependencies & Scripts
`

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
