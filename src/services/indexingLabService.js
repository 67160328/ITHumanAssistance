/**
 * Database Indexing Lab Service
 * Interacts with FastAPI backend for benchmark seeding, query execution, and index toggling.
 */

const getBackendBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
  }
  return 'http://localhost:8000';
};

/**
 * ดึงสถานะปัจจุบันของตาราง benchmark_records (จำนวนแถว, ขนาด DB, Index ที่มีอยู่)
 */
export async function getIndexingLabStatus() {
  const baseUrl = getBackendBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/indexing-lab/status`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'ไม่สามารถดึงข้อมูลสถานะ Indexing Lab ได้');
    }
    return await res.json();
  } catch (error) {
    console.warn('[IndexingLabService] Backend offline or error:', error.message);
    // Local mock fallback for offline demo
    return {
      table_name: 'benchmark_records',
      row_count: 50000,
      active_indexes: ['idx_bench_date', 'idx_bench_customer', 'idx_bench_user', 'idx_bench_composite'],
      available_indexes: ['idx_bench_date', 'idx_bench_customer', 'idx_bench_user', 'idx_bench_composite'],
      has_indexes: true,
      approx_db_size_mb: 8.45,
      is_mock: true
    };
  }
}

/**
 * สั่งให้ระบบปั๊มข้อมูลจำลองขนาดใหญ่ (Default: 50,000 แถว)
 */
export async function seedIndexingLabData(count = 50000) {
  const baseUrl = getBackendBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/indexing-lab/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'ไม่สามารถปั๊มข้อมูลทดสอบได้');
    }
    return await res.json();
  } catch (error) {
    console.warn('[IndexingLabService] Seed fallback:', error.message);
    return {
      success: true,
      seeded_count: count,
      total_records: count,
      elapsed_ms: 185.4,
      message: `(จำลอง Offline) ปั๊มข้อมูล ${count.toLocaleString()} แถวเสร็จสิ้น`
    };
  }
}

/**
 * ล้างข้อมูลในตาราง benchmark_records
 */
export async function clearIndexingLabData() {
  const baseUrl = getBackendBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/indexing-lab/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'ไม่สามารถล้างข้อมูลได้');
    }
    return await res.json();
  } catch (error) {
    return {
      success: true,
      message: '(จำลอง Offline) ล้างข้อมูลตาราง benchmark_records เรียบร้อย'
    };
  }
}

/**
 * สลับเปิด/ปิด Index (True = CREATE, False = DROP)
 */
export async function toggleIndexingLabIndexes(enable) {
  const baseUrl = getBackendBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/indexing-lab/toggle-index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'ไม่สามารถจัดการ Index ได้');
    }
    return await res.json();
  } catch (error) {
    return {
      success: true,
      action: enable ? 'สร้าง Index ทั้งหมด' : 'ลบ Index ทั้งหมด',
      elapsed_ms: 45.2,
      active_indexes: enable ? ['idx_bench_date', 'idx_bench_customer', 'idx_bench_user', 'idx_bench_composite'] : [],
      message: `(จำลอง Offline) ${enable ? 'สร้าง' : 'ลบ'} Index เรียบร้อย`
    };
  }
}

/**
 * รัน Query และส่งคืนเวลาประมวลผล Execution Time และ Execution Plan
 */
export async function executeIndexingLabQuery(query) {
  const baseUrl = getBackendBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/indexing-lab/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'เกิดข้อผิดพลาดในการประมวลผลคำสั่ง SQL');
    }
    return await res.json();
  } catch (error) {
    // Offline simulation calculation based on query characteristics
    const lower = query.toLowerCase();
    const hasIndex = !lower.includes('substr') && !lower.includes('%') && (lower.includes('customer_id') || lower.includes('transaction_date'));
    const elapsed = hasIndex ? (Math.random() * 0.8 + 0.3).toFixed(3) : (Math.random() * 35 + 25).toFixed(3);

    return {
      sql: query,
      elapsed_ms: parseFloat(elapsed),
      row_count: hasIndex ? 12 : 1250,
      sample_rows: [
        { id: 1042, transaction_date: '2025-10-15', customer_id: 42, user_code: 'USER-0042', amount: 1540.5, status: 'paid', category: 'API_PAYMENT' },
        { id: 3981, transaction_date: '2025-11-20', customer_id: 42, user_code: 'USER-0042', amount: 9800.0, status: 'paid', category: 'RAG_SEARCH' }
      ],
      uses_index: hasIndex,
      is_table_scan: !hasIndex,
      plan_steps: [
        { id: 2, parent: 0, notused: 0, detail: hasIndex ? 'SEARCH benchmark_records USING INDEX idx_bench_customer (customer_id=?)' : 'SCAN benchmark_records' }
      ],
      plan_summary: hasIndex ? 'SEARCH benchmark_records USING INDEX idx_bench_customer (customer_id=?)' : 'SCAN benchmark_records (Full Table Scan)'
    };
  }
}
