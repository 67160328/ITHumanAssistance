import sqlite3
import os
import json
import datetime
from typing import List, Dict, Optional, Any

DB_PATH = os.path.join(os.path.dirname(__file__), "app.db")

def get_db_connection():
    """สร้าง Connection เชื่อมต่อไปยัง SQLite Database"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """สร้างตารางที่จำเป็นทั้งหมดใน SQLite Database ถ้ายังไม่มี"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    # 2. Active Sessions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
    )
    """)

    # 3. Translation History Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        input_text TEXT NOT NULL,
        mode TEXT NOT NULL,
        summary TEXT,
        has_impact_analysis BOOLEAN DEFAULT 0,
        created_at TEXT NOT NULL
    )
    """)

    # 4. Corporate Knowledge Base Documents Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        doc_type TEXT NOT NULL,
        tags TEXT, -- JSON array of tags
        chunk_count INTEGER DEFAULT 1,
        preview TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # 5. RAG Document Chunks Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rag_chunks (
        id TEXT PRIMARY KEY,
        doc_id TEXT NOT NULL,
        doc_title TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        chunk_text TEXT NOT NULL,
        FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
    )
    """)

    # 6. Global / System Settings Table (Key-Value)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # 7. Telegram Saved Recipients / Chat IDs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS telegram_recipients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT UNIQUE NOT NULL,
        label TEXT,
        last_used_at TEXT NOT NULL
    )
    """)

    # 8. Student Lab: Benchmark Records Table (ข้อมูลขนาดใหญ่สำหรับทดลอง Indexing)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS benchmark_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_date TEXT NOT NULL,
        customer_id INTEGER NOT NULL,
        user_code TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT
    )
    """)

    # ==========================================================================
    # CORE APPLICATION INDEXES (เพิ่มประสิทธิภาพการ Query ในระบบจริง)
    # ==========================================================================
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_history_created ON history (created_at DESC)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_history_mode ON history (mode)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_rag_doc_id ON rag_chunks (doc_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tele_last_used ON telegram_recipients (last_used_at DESC)")

    # Default Telegram Bot Token if not present
    cursor.execute("SELECT value FROM app_settings WHERE key = 'telegram_bot_token'")
    if not cursor.fetchone():
        now = datetime.datetime.now().isoformat()
        cursor.execute(
            "INSERT INTO app_settings (key, value, updated_at) VALUES ('telegram_bot_token', ?, ?)",
            ("8893607516:AAE7EvjSy5Vn-wbLAmPcshI0WqEA42mzNmM", now)
        )

    conn.commit()
    conn.close()

def save_telegram_chat_id(chat_id: str, label: Optional[str] = None):
    """บันทึกหรืออัปเดต Chat ID ล่าสุดลงฐานข้อมูล SQLite"""
    if not chat_id or not chat_id.strip():
        return
    clean_id = chat_id.strip()
    now = datetime.datetime.now().isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO telegram_recipients (chat_id, label, last_used_at)
        VALUES (?, ?, ?)
        ON CONFLICT(chat_id) DO UPDATE SET
            last_used_at = excluded.last_used_at,
            label = COALESCE(excluded.label, telegram_recipients.label)
    """, (clean_id, label, now))
    conn.commit()
    conn.close()

def get_latest_telegram_chat_id() -> Optional[str]:
    """ดึง Chat ID ล่าสุดที่เคยใช้งานจากฐานข้อมูล SQLite"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT chat_id FROM telegram_recipients ORDER BY last_used_at DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    return row["chat_id"] if row else None

def get_all_telegram_recipients() -> List[Dict[str, Any]]:
    """ดึงรายการ Chat ID ทั้งหมดที่บันทึกไว้ใน SQLite"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, chat_id, label, last_used_at FROM telegram_recipients ORDER BY last_used_at DESC LIMIT 10")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ==============================================================================
# TOKEN & USAGE QUOTA ENGINE (SQLite Persistent)
# ==============================================================================

FREE_QUOTA_LIMIT = 5  # 5 ครั้งต่อรอบสำหรับ Free Tier
QUOTA_WINDOW_HOURS = 4  # รอบรีเซ็ตทุก 4 ชั่วโมง

def migrate_users_quota_columns():
    """เพิ่มคอลัมน์ tier, quota_used, quota_reset_at ในตาราง users ถ้ายังไม่มี"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(users)")
    cols = [r["name"] for r in cursor.fetchall()]
    
    if "tier" not in cols:
        cursor.execute("ALTER TABLE users ADD COLUMN tier TEXT DEFAULT 'free'")
    if "quota_used" not in cols:
        cursor.execute("ALTER TABLE users ADD COLUMN quota_used INTEGER DEFAULT 0")
    if "quota_reset_at" not in cols:
        cursor.execute("ALTER TABLE users ADD COLUMN quota_reset_at TEXT")
    if "quota_notified" not in cols:
        cursor.execute("ALTER TABLE users ADD COLUMN quota_notified INTEGER DEFAULT 0")

    conn.commit()
    conn.close()

migrate_users_quota_columns()

def check_user_quota(username: Optional[str]) -> Dict[str, Any]:
    """
    ตรวจสอบสถานะโควต้าการใช้งาน Token/Requests ของผู้ใช้
    คืนค่า { allowed: bool, tier: str, quota_used: int, quota_limit: int, quota_reset_at: str, remaining_seconds: int }
    """
    now = datetime.datetime.now()
    now_iso = now.isoformat()

    if not username:
        # สำหรับ Guest ที่ไม่ได้ล็อกอิน (ใช้ local storage หรือ default quota)
        return {
            "allowed": True,
            "tier": "free",
            "quota_used": 0,
            "quota_limit": FREE_QUOTA_LIMIT,
            "quota_reset_at": None,
            "remaining_seconds": 0
        }

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT tier, quota_used, quota_reset_at, quota_notified FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        return {
            "allowed": True,
            "tier": "free",
            "quota_used": 0,
            "quota_limit": FREE_QUOTA_LIMIT,
            "quota_reset_at": None,
            "remaining_seconds": 0,
            "just_restored": False
        }

    tier = user["tier"] or "free"
    # หากเป็นสมาชิก Pro จะใช้งานได้ไม่จำกัด
    if tier == "pro":
        return {
            "allowed": True,
            "tier": "pro",
            "quota_used": user["quota_used"] or 0,
            "quota_limit": -1,  # unlimited
            "quota_reset_at": None,
            "remaining_seconds": 0,
            "just_restored": False
        }

    quota_used = user["quota_used"] or 0
    quota_reset_at_str = user["quota_reset_at"]
    quota_notified = user["quota_notified"] or 0
    remaining_seconds = 0
    just_restored = False

    if quota_reset_at_str:
        try:
            reset_time = datetime.datetime.fromisoformat(quota_reset_at_str)
            if now >= reset_time:
                # รีเซ็ตโควต้ารอบใหม่
                was_exhausted = quota_used >= FREE_QUOTA_LIMIT
                quota_used = 0
                quota_reset_at_str = None
                conn = get_db_connection()
                c = conn.cursor()
                # ถ้าเคยใช้โควต้าหมดและยังไม่ได้ส่งแจ้งเตือน ให้ flag ว่าเพิ่งฟื้นฟู
                if was_exhausted and not quota_notified:
                    just_restored = True
                    c.execute("UPDATE users SET quota_used = 0, quota_reset_at = NULL, quota_notified = 1 WHERE username = ?", (username,))
                else:
                    c.execute("UPDATE users SET quota_used = 0, quota_reset_at = NULL WHERE username = ?", (username,))
                conn.commit()
                conn.close()
            else:
                remaining_seconds = int((reset_time - now).total_seconds())
        except Exception:
            quota_used = 0
            quota_reset_at_str = None

    allowed = quota_used < FREE_QUOTA_LIMIT
    return {
        "allowed": allowed,
        "tier": tier,
        "quota_used": quota_used,
        "quota_limit": FREE_QUOTA_LIMIT,
        "quota_reset_at": quota_reset_at_str,
        "remaining_seconds": remaining_seconds,
        "just_restored": just_restored
    }

def consume_user_quota(username: Optional[str]) -> Dict[str, Any]:
    """
    บันทึกการใช้งานโควต้า 1 ครั้ง
    """
    if not username:
        return {"allowed": True, "tier": "free"}

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT tier, quota_used, quota_reset_at FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()

    if not user:
        conn.close()
        return {"allowed": True, "tier": "free"}

    tier = user["tier"] or "free"
    if tier == "pro":
        # บันทึกสถิติแต่ไม่นับจำกัด
        cursor.execute("UPDATE users SET quota_used = COALESCE(quota_used, 0) + 1 WHERE username = ?", (username,))
        conn.commit()
        conn.close()
        return {"allowed": True, "tier": "pro"}

    now = datetime.datetime.now()
    reset_time = user["quota_reset_at"]
    if not reset_time:
        # เริ่มนับรอบใหม่ 4 ชั่วโมงนับจากคำขอนี้
        next_reset = (now + datetime.timedelta(hours=QUOTA_WINDOW_HOURS)).isoformat()
        cursor.execute(
            "UPDATE users SET quota_used = 1, quota_reset_at = ? WHERE username = ?",
            (next_reset, username)
        )
    else:
        cursor.execute(
            "UPDATE users SET quota_used = COALESCE(quota_used, 0) + 1 WHERE username = ?",
            (username,)
        )

    # หากใช้ครบตามโควต้า ให้รีเซ็ต flag quota_notified เป็น 0 เพื่อให้แจ้งเตือนรอบถัดไป
    cursor.execute("""
        UPDATE users 
        SET quota_notified = 0 
        WHERE username = ? AND quota_used >= ?
    """, (username, FREE_QUOTA_LIMIT))

    conn.commit()
    conn.close()
    return check_user_quota(username)

def upgrade_user_tier(username: str, target_tier: str = "pro") -> bool:
    """อัปเกรดสถานะผู้ใช้เป็น Pro หรือ Free"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET tier = ? WHERE username = ?", (target_tier, username))
    changes = conn.total_changes
    conn.commit()
    conn.close()
    return changes > 0

# Initialize DB on module import
init_db()
