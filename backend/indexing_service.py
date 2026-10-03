import time
import random
import datetime
from typing import Dict, Any, List, Optional
from backend.database import get_db_connection

BENCHMARK_INDEXES = {
    "idx_bench_date": "CREATE INDEX IF NOT EXISTS idx_bench_date ON benchmark_records (transaction_date)",
    "idx_bench_customer": "CREATE INDEX IF NOT EXISTS idx_bench_customer ON benchmark_records (customer_id)",
    "idx_bench_user": "CREATE INDEX IF NOT EXISTS idx_bench_user ON benchmark_records (user_code)",
    "idx_bench_composite": "CREATE INDEX IF NOT EXISTS idx_bench_composite ON benchmark_records (status, transaction_date)"
}

def get_benchmark_status() -> Dict[str, Any]:
    """
    ตรวจสอบสถานะของตาราง benchmark_records:
    - จำนวนแถวข้อมูล (Row Count)
    - รายการ Index ที่มีอยู่จริงในปัจจุบัน
    - ขนาดโดยประมาณของตารางและ Index
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM benchmark_records")
    row_count = cursor.fetchone()[0]

    cursor.execute("PRAGMA index_list('benchmark_records')")
    indexes_raw = cursor.fetchall()
    active_indexes = [r["name"] for r in indexes_raw if not r["name"].startswith("sqlite_autoindex")]

    # Check database file size
    cursor.execute("PRAGMA page_count")
    page_count = cursor.fetchone()[0]
    cursor.execute("PRAGMA page_size")
    page_size = cursor.fetchone()[0]
    total_db_bytes = page_count * page_size

    conn.close()

    return {
        "table_name": "benchmark_records",
        "row_count": row_count,
        "active_indexes": active_indexes,
        "available_indexes": list(BENCHMARK_INDEXES.keys()),
        "has_indexes": len(active_indexes) > 0,
        "approx_db_size_mb": round(total_db_bytes / (1024 * 1024), 2)
    }

def seed_benchmark_records(count: int = 50000) -> Dict[str, Any]:
    """
    ปั๊มข้อมูลธุรกรรมและประวัติการแปลจำลองขนาดใหญ่สำหรับให้นิสิตทำ Lab Indexing
    """
    start_time = time.perf_counter()
    conn = get_db_connection()
    cursor = conn.cursor()

    # ปิด synchronous ชั่วคราวเพื่อเร่งความเร็วในการ bulk insert
    cursor.execute("PRAGMA synchronous = OFF")
    cursor.execute("PRAGMA journal_mode = MEMORY")

    base_date = datetime.date(2025, 9, 25)
    statuses = ["paid", "paid", "paid", "pending", "cancelled"]
    categories = ["API_PAYMENT", "AUTH_VERIFY", "RAG_SEARCH", "TELEGRAM_SYNC", "WEBHOOK_EVENT"]

    batch_size = 5000
    rows = []
    
    for i in range(1, count + 1):
        days_offset = random.randint(0, 365)
        tx_date = (base_date + datetime.timedelta(days=days_offset)).isoformat()
        cust_id = random.randint(1, 9999)
        u_code = f"USER-{cust_id:04d}"
        amount = round(random.uniform(50.0, 99999.0), 2)
        status = random.choice(statuses)
        category = random.choice(categories)
        desc = f"Transaction bulk benchmark record #{i} - {category}"
        rows.append((tx_date, cust_id, u_code, amount, status, category, desc))

        if len(rows) >= batch_size:
            cursor.executemany("""
                INSERT INTO benchmark_records (transaction_date, customer_id, user_code, amount, status, category, description)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, rows)
            rows = []

    if rows:
        cursor.executemany("""
            INSERT INTO benchmark_records (transaction_date, customer_id, user_code, amount, status, category, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, rows)

    conn.commit()

    # นับจำนวนใหม่
    cursor.execute("SELECT COUNT(*) FROM benchmark_records")
    total = cursor.fetchone()[0]
    conn.close()

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
    return {
        "success": True,
        "seeded_count": count,
        "total_records": total,
        "elapsed_ms": elapsed_ms,
        "message": f"จำลองข้อมูลสำเร็จ {count:,} แถว (รวมทั้งหมด {total:,} แถว ใน {elapsed_ms} ms)"
    }

def clear_benchmark_records() -> Dict[str, Any]:
    """ล้างข้อมูลทดสอบทั้งหมดใน benchmark_records"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM benchmark_records")
    cursor.execute("DELETE FROM sqlite_sequence WHERE name = 'benchmark_records'")
    conn.commit()
    conn.close()
    return {"success": True, "message": "ล้างข้อมูลในตาราง benchmark_records เรียบร้อยแล้ว"}

def toggle_benchmark_indexes(enable: bool) -> Dict[str, Any]:
    """
    สร้างหรือลบ Index บนตาราง benchmark_records สำหรับเปรียบเทียบ
    """
    start_time = time.perf_counter()
    conn = get_db_connection()
    cursor = conn.cursor()

    if enable:
        for idx_name, ddl in BENCHMARK_INDEXES.items():
            cursor.execute(ddl)
    else:
        for idx_name in BENCHMARK_INDEXES.keys():
            cursor.execute(f"DROP INDEX IF EXISTS {idx_name}")

    conn.commit()
    conn.close()

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
    status = get_benchmark_status()
    action = "สร้าง Index ทั้งหมด" if enable else "ลบ Index ทั้งหมด"
    return {
        "success": True,
        "action": action,
        "elapsed_ms": elapsed_ms,
        "active_indexes": status["active_indexes"],
        "message": f"{action} สำเร็จใน {elapsed_ms} ms"
    }

def execute_benchmark_query(sql_query: str) -> Dict[str, Any]:
    """
    รัน EXPLAIN QUERY PLAN และจับเวลา Execution Time ของ Query
    """
    # ตรวจสอบความปลอดภัย: ป้องกัน SQL Injection / อนุญาตเฉพาะคำสั่ง SELECT
    cleaned = sql_query.strip()
    if not cleaned.lower().startswith("select"):
        raise ValueError("อนุญาตเฉพาะคำสั่ง SELECT เท่านั้นสำหรับการทำ Lab Benchmark")

    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. รัน EXPLAIN QUERY PLAN เพื่อดูว่า SQLite วางแผนค้นหาอย่างไร (SCAN vs SEARCH USING INDEX)
    explain_sql = f"EXPLAIN QUERY PLAN {cleaned}"
    cursor.execute(explain_sql)
    explain_rows = cursor.fetchall()
    plan_steps = [dict(r) for r in explain_rows]
    plan_details = [r["detail"] for r in explain_rows]
    uses_index = any("USING INDEX" in d for d in plan_details)
    is_table_scan = any("SCAN" in d and "USING INDEX" not in d for d in plan_details)

    # 2. รันคำสั่งจริงพร้อมจับเวลา (High Precision Timer)
    start_ns = time.perf_counter_ns()
    cursor.execute(cleaned)
    results = cursor.fetchall()
    end_ns = time.perf_counter_ns()
    elapsed_ms = round((end_ns - start_ns) / 1_000_000, 3)

    sample_rows = [dict(r) for r in results[:5]]
    row_count = len(results)

    conn.close()

    return {
        "sql": cleaned,
        "elapsed_ms": elapsed_ms,
        "row_count": row_count,
        "sample_rows": sample_rows,
        "uses_index": uses_index,
        "is_table_scan": is_table_scan,
        "plan_steps": plan_steps,
        "plan_summary": " ➔ ".join(plan_details) if plan_details else "No details"
    }
