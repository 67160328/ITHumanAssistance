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

    conn.commit()
    conn.close()

# Initialize DB on module import
init_db()
