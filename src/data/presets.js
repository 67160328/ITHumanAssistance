export const PRESETS = {
  humanToTech: [
    {
      id: 'h2t-1',
      title: 'เว็บขายของเหมือน Shopee ใน 3 วัน + ปุ่มวิบวับ',
      input: 'อยากได้เว็บขายของเหมือน Shopee แต่ขอทำคนเดียวเสร็จภายใน 3 วัน แล้วก็ขอปุ่มวิบวับดึงดูดสายตาสวยๆ ด้วยนะ',
      translation: {
        summary: 'ความต้องการสร้างแพลตฟอร์มอีคอมเมิร์ซความสมบูรณ์สูง ในระยะเวลาที่จำกัดมาก (3 วัน)',
        technicalRequirements: [
          'ระบบ E-Commerce MVP (Product Catalog, Shopping Cart, Checkout Flow)',
          'UI/UX Enhancements: Micro-interactions, CSS Animations & Dynamic Glow Effect สำหรับ CTA Buttons',
          'ระบบชำระเงินรองรับ PromptPay / Credit Card Integration'
        ],
        techStack: [
          { name: 'Shopify / WooCommerce', desc: 'แนะนำใช้องค์ประกอบ No-Code/Low-Code เพื่อส่งมอบงานได้ทัน 3 วัน' },
          { name: 'Next.js + Tailwind CSS', desc: 'หากต้องการ Custom Build สำหรับ Micro-animations & SEO' },
          { name: 'Stripe / Omise API', desc: 'ระบบ Payment Gateway สำเร็จรูป' }
        ],
        riskAnalysis: [
          'ระยะเวลา 3 วันสำหรับระบบระดับ Shopee ครบวงจร (รวมระบบขนส่ง, ร้านค้าหลายราย, Live chat) เกินขอบเขตการพัฒนาด้วยตัวคนเดียว (Feasibility Risk)',
          'แนะนำปรับ Scope เป็น MVP (ร้านค้าเดียว, สั่งซื้อพื้นฐาน, แจ้งชำระเงิน) เพื่อจัดส่งตามกำหนด'
        ],
        suggestedQuestions: [
          'มีระบบชำระเงินและขนส่งที่ต้องการเชื่อมต่อเป็นพิเศษหรือไม่?',
          'ต้องการเปิดรับผู้ขายหลายราย (Multi-vendor) หรือขายเฉพาะสินค้าของตนเอง (Single Merchant)?'
        ]
      }
    },
    {
      id: 'h2t-2',
      title: 'ระบบหลังบ้านจัดการสต็อกแบบง่ายๆ กดปุ่มเดียวรู้เรื่อง',
      input: 'อยากได้ระบบหลังบ้านจัดการสต็อกแบบง่ายๆ ไม่ซับซ้อน เอาแบบพนักงานที่ร้านกดปุ่มเดียวแล้วรู้เลยว่าของเหลือเท่าไหร่ ไม่เอาอะไรยุ่งยากนะ',
      translation: {
        summary: 'ระบบบริหารจัดการคลังสินค้าแบบย่อ (Lightweight Inventory Management System)',
        technicalRequirements: [
          'ระบบจัดการข้อมูลแบบ CRUD (Create, Read, Update, Delete) สำหรับข้อมูลสินค้าและจำนวนสต็อก',
          'Dashboard / Overview Interface: แสดงผล Real-time Stock Metrics พร้อมสถานะสินค้าใกล้หมด (Low-stock Alerts)',
          'User Role & Authorization: หน้าจอเฉพาะพนักงาน storefront (Simple UI/UX)'
        ],
        techStack: [
          { name: 'React / Vue.js', desc: 'Front-end Dashboard ที่ตอบสนองรวดเร็ว' },
          { name: 'Node.js (Express) + PostgreSQL', desc: 'Back-end API และ ฐานข้อมูลเชิงสัมพันธ์ที่มี ACID compliance' },
          { name: 'Retool / Appsheet', desc: 'ทางเลือก Rapid Internal Tool Builder หากต้องการใช้ภายใน 1-2 วัน' }
        ],
        riskAnalysis: [
          'ควรระวังเรื่องการปรับสต็อกพร้อมกันหลายคน (Concurrency Issue)',
          'ต้องตกลงวิธีตัดสต็อก (Scan Barcode หรือ Manual Input)'
        ],
        suggestedQuestions: [
          'มีสแกนเนอร์บาร์โค้ด (Barcode/QR Code Scanner) อยู่แล้วหรือไม่?',
          'ต้องมีการแจ้งเตือนผ่าน Line Official Account / Email หรือไม่เมื่อสินค้าใกล้หมด?'
        ]
      }
    },
    {
      id: 'h2t-3',
      title: 'การแจ้งเตือนยอดสั่งซื้อเข้ามือถือ real-time',
      input: 'อยากให้แอพมันส่งข้อความเตือนเข้ามือถือเวลาลูกค้าสั่งซื้อของ จะได้ไม่ต้องนั่งเปิดดูเว็บตลอดเวลา',
      translation: {
        summary: 'ระบบแจ้งเตือนคำสั่งซื้อแบบทันท่วงที (Real-time Order Notification System)',
        technicalRequirements: [
          'Push Notification Service Integration หรือ Webhook Messaging API',
          'Event-Driven Architecture: เมื่อมี Event "Order Created" ให้ trigger ส่งข้อความทันที',
          'Admin Notification Preference Dashboard'
        ],
        techStack: [
          { name: 'LINE Messaging API / SDK', desc: 'แจ้งเตือนผ่าน LINE Notify หรือ LINE Official Account (ที่คนไทยคุ้นเคย)' },
          { name: 'Firebase Cloud Messaging (FCM)', desc: 'กรณีส่ง Push Notification เข้า Mobile App โดยตรง' },
          { name: 'Webhooks / Socket.io', desc: 'สำหรับ Event push real-time' }
        ],
        riskAnalysis: [
          'LINE Notify จะยกเลิกบริการปลายปี แนะนำให้ใช้ LINE Official Account (Messaging API) แทน',
          'ต้องคำนึงถึงค่าบริการส่งข้อความกรณีมีออเดอร์ปริมาณมาก'
        ],
        suggestedQuestions: [
          'ต้องการรับแจ้งเตือนผ่านช่องทางใด (LINE, Telegram, Mobile App Push, SMS)?',
          'ในข้อความแจ้งเตือน ต้องการแสดงรายละเอียดสินค้าและที่อยู่จัดส่งเลยหรือไม่?'
        ]
      }
    }
  ],
  techToHuman: [
    {
      id: 't2h-1',
      title: 'ติดปัญหา CORS Error และ N+1 Query ทำให้ API ช้า',
      input: 'ตอนนี้เจอปัญหา CORS error บน staging และมีปัญหา N+1 Query ทำให้ API response time ช้ากว่า 5 วินาที ต้องขอทำ Refactoring ฐานข้อมูลก่อนครับ',
      translation: {
        summary: 'ระบบปฏิเสธการเชื่อมต่อชั่วคราวและดึงข้อมูลซ้ำซ้อน ทำให้การแสดงผลช้ากว่าปกติ',
        politeExplanation: 'เรียนท่านลูกค้า ทางทีมงานขอแจ้งอัปเดตการทำงานครับ ขณะนี้พบจุดที่ทำให้การโหลดหน้าจอช้ากว่าปกติเล็กน้อย (ประมาณ 5 วินาที) เนื่องจากประตูด้านความปลอดภัยของระบบเปิดรับข้อมูลผิดช่องทาง ประกอบกับวิธีดึงข้อมูลสินค้ายังมีการวิ่งไปกลับหลายรอบโดยไม่จำเป็นครับ ทีมงานกำลังดำเนินการจัดระเบียบท่อส่งข้อมูลใหม่เพื่อให้ระบบกลับมาทำงานได้อย่างรวดเร็วและปลอดภัยสูงสุดครับ',
        analogy: {
          icon: '🚗',
          title: 'เปรียบเสมือน: การเดินทางและด่านตรวจ',
          description: 'CORS Error เหมือนเจ้าหน้าที่ด่านตรวจไม่คุ้นหน้าเอกสาร จึงขอตรวจสอบความปลอดภัยก่อนปล่อยให้เข้าเมือง ส่วน N+1 Query เหมือนพนักงานขับรถขนของ 10 ชิ้น แต่กลับวิ่งรถไป-กลับ 10 รอบแทนที่จะขนใส่รถบรรทุกไปรอบเดียว ทำให้เสียเวลาบนทางด่วนครับ'
        },
        impact: 'ผู้ใช้อาจรู้สึกว่าหน้าจอใช้เวลาโหลดข้อมูลนานขึ้นเล็กน้อยในช่วงนี้ แต่ข้อมูลทั้งหมดปลอดภัยดีครับ',
        estimatedTime: 'ทีมงานคาดว่าจะปรับปรุงท่อส่งข้อมูลและแก้ไขแล้วเสร็จภายใน 3-4 ชั่วโมงนี้ครับ'
      }
    },
    {
      id: 't2h-2',
      title: 'โดน Rate Limit จาก Third-party Webhook แก้ด้วย Redis Queue',
      input: 'เซิร์ฟเวอร์โดน Rate Limit จาก Third-party Webhook ทำให้ระบบชำระเงินส่ง Callback ไม่เข้า ต้องแก้ด้วยการส่งเข้า Redis Queue',
      translation: {
        summary: 'ระบบรับชำระเงินปลายทางจำกัดจำนวนการส่งข้อมูลกะทันหัน ต้องจัดคิวรอส่งใหม่',
        politeExplanation: 'เรียนท่านลูกค้า ขออนุญาตแจ้งสถานะระบบการแจ้งเตือนชำระเงินครับ เนื่องจากธนาคาร/ผู้ให้บริการชำระเงินมีการจำกัดจำนวนสัญญาณที่ส่งเข้ามาพร้อมกัน เพื่อป้องกันระบบล่ม ส่งผลให้ยอดชำระเงินบางรายการอาจเข้ามาช้ากว่าปกติเล็กน้อย ทีมงานกำลังติดตั้ง "ระบบจัดคิวอัจฉริยะ" เพื่อให้รับข้อมูลได้ครบถ้วนโดยไม่ตกหล่นครับ',
        analogy: {
          icon: '📬',
          title: 'เปรียบเสมือน: ตู้บุรุษไปรษณีย์และช่องจัดคิว',
          description: 'Rate Limit เหมือนไปรษณีย์อนุญาตให้หยอดจดหมายได้แค่ตู้ละ 10 ฉบับต่อนาที เมื่อมีคนมาหยอด 100 ฉบับพร้อมกัน จดหมายที่เหลือจึงต้องยืนรอ ส่วน Redis Queue คือการสร้าง "เก้าอี้พักคิว" ให้จดหมายจัดเรียงตามลำดับ แล้วทยอยหยอดลงตู้ทีละนิดโดยไม่มีจดหมายสูญหายครับ'
        },
        impact: 'ลูกค้าที่ชำระเงินเรียบร้อยแล้ว อาจได้รับข้อความยืนยันล่าช้าไปประมาณ 1-2 นาที แต่ยอดเงินและออเดอร์สมบูรณ์ถูกต้องแน่นอนครับ',
        estimatedTime: 'ทีมพัฒนาใช้เวลาติดตั้งระบบคิวประมาณ 1-2 ชั่วโมงครับ'
      }
    },
    {
      id: 't2h-3',
      title: 'Memory Leak ทำให้ Pod โดน OOMKilled ตอนช่วง Traffic Peak',
      input: 'เกิด Memory Leak ใน Node.js worker process ทำให้ Pod โดน OOMKilled ตอนช่วง Traffic peak ขอเวลาเพิ่มในการทำ Memory profiling ครับ',
      translation: {
        summary: 'พื้นที่หน่วยความจำเต็มสะสมในช่วงคนใช้งานเยอะ ระบบจึงสั่งรีสตาร์ทตัวเองเพื่อความปลอดภัย',
        politeExplanation: 'เรียนท่านลูกค้า ขอแจ้งรายงานความคืบหน้าครับ ในช่วงที่มีผู้ใช้งานเข้ามาพร้อมกันเป็นจำนวนมาก ระบบมีการเก็บสมุดบันทึกข้อมูลไว้ในคลังแน่นเกินไป จนห้องเก็บของเต็ม ทำให้ระบบความปลอดภัยอัตโนมัติสั่งรีสตาร์ทห้องทำงานเพื่อล้างพื้นที่ครับ ทีมงานกำลังตรวจสอบอย่างละเอียดว่ามีกระดาษแผ่นไหนที่ไม่ได้ถูกจัดเก็บเข้าตู้ตามปกติ เพื่อแก้ไขปัญหาอย่างถาวรครับ',
        analogy: {
          icon: '📦',
          title: 'เปรียบเสมือน: การวางของทับกันในห้องทำงานจนเต็มห้อง',
          description: 'Memory Leak เหมือนพนักงานทำงานแล้วหยิบแฟ้มมาวางบนโต๊ะเรื่อยๆ โดยลืมยกไปเก็บเข้าตู้ จนโต๊ะทำงานเต็มขยับตัวไม่ได้ (OOMKilled) รปภ. จึงต้องสั่งให้เคลียร์โต๊ะทั้งหมดใหม่ การทำ Memory profiling คือการเข้าตรวจเช็คว่าพนักงานคนไหนลืมเก็บแฟ้มชิ้นไหนครับ'
        },
        impact: 'ผู้ใช้อาจพบอาการสะดุดหรือกดโหลดใหม่ 1 ครั้งในช่วงที่มีผู้ใช้หนาแน่น แต่ไม่มีข้อมูลสูญหายครับ',
        estimatedTime: 'ทีมงานขอเวลาตรวจสอบและปรับแต่งพื้นที่ความจำประมาณ 4-6 ชั่วโมงครับ'
      }
    }
  ]
};
