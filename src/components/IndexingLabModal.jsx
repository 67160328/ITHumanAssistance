import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Zap,
  Play,
  Trash2,
  RefreshCw,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Clock,
  Layers,
  Search,
  BookOpen,
  ArrowRight,
  TrendingUp,
  FileText,
  ShieldAlert
} from 'lucide-react';
import {
  getIndexingLabStatus,
  seedIndexingLabData,
  clearIndexingLabData,
  toggleIndexingLabIndexes,
  executeIndexingLabQuery
} from '../services/indexingLabService';

const LAB_EXPERIMENTS = [
  {
    id: 'lab1',
    name: 'Lab 1: Exact Match Query (Primary / Foreign Key)',
    category: 'Exact Search',
    difficulty: 'Basic',
    query: 'SELECT * FROM benchmark_records WHERE customer_id = 42',
    explanation: 'ค้นหา customer_id แบบเจาะจง เมื่อมี Index `idx_bench_customer` ระบบจะค้นหาผ่าน B-Tree (O(log N)) แทนที่จะไล่อ่านทั้ง 50,000 แถว (O(N))',
    pitfallTip: 'กรณีค้นหาค่า Key ตรงๆ B-Tree Index ให้ผลลัพธ์เร็วที่สุด'
  },
  {
    id: 'lab2',
    name: 'Lab 2: Date Range Query (Between / Greater Than)',
    category: 'Range Scan',
    difficulty: 'Intermediate',
    query: "SELECT COUNT(*), SUM(amount) FROM benchmark_records WHERE transaction_date BETWEEN '2025-10-01' AND '2025-10-31'",
    explanation: 'ค้นหาช่วงวันที่ของธุรกรรม Index `idx_bench_date` จัดเรียงวันที่เรียงตามลำดับ ทำให้สามารถ Seek หัว-ท้ายและ Scan แค่ช่วงข้อมูลที่ระบุได้ทันที',
    pitfallTip: 'เหมาะอย่างยิ่งกับตาราง Log, Audit Trail, และรายงานยอดขายตามช่วงเวลา'
  },
  {
    id: 'lab3',
    name: 'Lab 3: Pitfall - Function wrap on Indexed Column (Loss of Index)',
    category: 'Common Pitfalls',
    difficulty: 'Advanced',
    query: "SELECT COUNT(*) FROM benchmark_records WHERE substr(transaction_date, 1, 7) = '2025-10'",
    explanation: 'ข้อควรระวัง: การนำฟังก์ชัน (substr, date, UPPER) ไปครอบคอลัมน์ที่มี Index จะทำให้ Database ไม่สามารถใช้ B-Tree ปกติได้ และตกไปเป็น Full Table Scan!',
    pitfallTip: 'แก้ไขด้วยการเปลี่ยนเป็น Range Comparison (`transaction_date >= "2025-10-01" AND ...`) หรือสร้าง Functional / Expression Index'
  },
  {
    id: 'lab4',
    name: 'Lab 4: Pitfall - Wildcard Pattern LIKE (% vs prefix)',
    category: 'Pattern Matching',
    difficulty: 'Intermediate',
    query: "SELECT * FROM benchmark_records WHERE user_code LIKE '%0042'",
    explanation: 'การใช้ `%` นำหน้าสตริง (เช่น `%0042`) บังคับให้ฐานข้อมูลต้องทำ Sequential Scan ทั้งตาราง เพราะไม่สามารถกระโดดไปยังจุดเริ่มต้นของคำใน B-Tree ได้',
    pitfallTip: 'หากต้องการใช้ Index ควรใช้ Prefix Search เช่น `user_code LIKE "USER-0042%"` หรือใช้ Full-Text Search (FTS5)'
  },
  {
    id: 'lab5',
    name: 'Lab 5: Composite Index (status + transaction_date)',
    category: 'Composite Index',
    difficulty: 'Advanced',
    query: "SELECT * FROM benchmark_records WHERE status = 'pending' AND transaction_date >= '2025-10-01' LIMIT 100",
    explanation: 'ใช้ Index หลายคอลัมน์พร้อมกัน `(status, transaction_date)` กรองสถานะที่ตรงกันก่อน แล้วกรองช่วงวันที่ต่อโดยไม่ต้องอ่าน Record จริงขึ้นมาทั้งหมด',
    pitfallTip: 'ระวัง Leftmost Prefix Rule: Query ต้องกรองคอลัมน์แรกสุดของ Composite Index เสมอ'
  }
];

export default function IndexingLabModal({ isOpen, onClose }) {
  const [status, setStatus] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isTogglingIndex, setIsTogglingIndex] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Selected experiment & Custom SQL
  const [selectedLab, setSelectedLab] = useState(LAB_EXPERIMENTS[0]);
  const [customSql, setCustomSql] = useState(LAB_EXPERIMENTS[0].query);

  // Execution Results Comparison
  const [lastResult, setLastResult] = useState(null);
  const [baselineNoIndex, setBaselineNoIndex] = useState(null);
  const [historyRuns, setHistoryRuns] = useState([]);
  const [bannerNotice, setBannerNotice] = useState(null);

  // Load Status
  const refreshStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const data = await getIndexingLabStatus();
      setStatus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handlers
  const handleSeed = async (count = 50000) => {
    setIsSeeding(true);
    setBannerNotice(null);
    try {
      const res = await seedIndexingLabData(count);
      setBannerNotice({ type: 'success', message: res.message || `ปั๊มข้อมูล ${count.toLocaleString()} แถวสำเร็จ!` });
      await refreshStatus();
    } catch (err) {
      setBannerNotice({ type: 'error', message: err.message });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('คุณต้องการล้างข้อมูลทดสอบทั้งหมดใน benchmark_records หรือไม่?')) return;
    try {
      await clearIndexingLabData();
      setLastResult(null);
      setBaselineNoIndex(null);
      setBannerNotice({ type: 'info', message: 'ล้างข้อมูลทดสอบเรียบร้อยแล้ว' });
      await refreshStatus();
    } catch (err) {
      setBannerNotice({ type: 'error', message: err.message });
    }
  };

  const handleToggleIndexes = async (enable) => {
    setIsTogglingIndex(true);
    try {
      const res = await toggleIndexingLabIndexes(enable);
      setBannerNotice({ type: 'info', message: res.message });
      await refreshStatus();
    } catch (err) {
      setBannerNotice({ type: 'error', message: err.message });
    } finally {
      setIsTogglingIndex(false);
    }
  };

  const handleSelectLab = (lab) => {
    setSelectedLab(lab);
    setCustomSql(lab.query);
    setLastResult(null);
  };

  const handleExecuteQuery = async () => {
    setIsExecuting(true);
    setBannerNotice(null);
    try {
      const res = await executeIndexingLabQuery(customSql);
      setLastResult(res);

      // Track benchmark comparisons
      if (!status?.has_indexes) {
        setBaselineNoIndex(res);
      }

      setHistoryRuns((prev) => [
        {
          id: Date.now(),
          labName: selectedLab?.name || 'Custom Query',
          hasIndex: status?.has_indexes,
          elapsedMs: res.elapsed_ms,
          usesIndex: res.uses_index,
          isTableScan: res.is_table_scan,
          rowCount: res.row_count,
          timestamp: new Date().toLocaleTimeString('th-TH')
        },
        ...prev.slice(0, 5)
      ]);
    } catch (err) {
      setBannerNotice({ type: 'error', message: err.message });
    } finally {
      setIsExecuting(false);
    }
  };

  // Speedup calculation
  const speedupRatio =
    baselineNoIndex && lastResult && lastResult.uses_index && lastResult.elapsed_ms > 0
      ? (baselineNoIndex.elapsed_ms / lastResult.elapsed_ms).toFixed(1)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Database Indexing Lab & Optimization Studio
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  For Students & Engineers
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ห้องทดลองวัดประสิทธิภาพ Indexing: เปรียบเทียบ Table Scan vs B-Tree Index บนข้อมูลขนาดใหญ่
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner Notice */}
        {bannerNotice && (
          <div
            className={`px-6 py-2.5 text-xs font-medium flex items-center justify-between border-b ${
              bannerNotice.type === 'error'
                ? 'bg-rose-500/20 text-rose-200 border-rose-500/30'
                : bannerNotice.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30'
                : 'bg-indigo-500/20 text-indigo-200 border-indigo-500/30'
            }`}
          >
            <span>{bannerNotice.message}</span>
            <button onClick={() => setBannerNotice(null)} className="opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {/* Body Container (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Bar & Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">จำลองข้อมูลใน DB</div>
                <div className="text-lg font-bold text-white">
                  {status ? `${status.row_count.toLocaleString()} แถว` : 'กำลังโหลด...'}
                </div>
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl flex items-center gap-3">
              <div
                className={`p-3 rounded-lg ${
                  status?.has_indexes ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                }`}
              >
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">สถานะ Indexes</div>
                <div className="text-lg font-bold text-white flex items-center gap-1.5">
                  {status?.has_indexes ? (
                    <span className="text-emerald-400">เปิดใช้งาน ({status.active_indexes.length})</span>
                  ) : (
                    <span className="text-amber-400">ปิดอยู่ (No Index)</span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">ขนาด Database โดยประมาณ</div>
                <div className="text-lg font-bold text-white">
                  {status ? `${status.approx_db_size_mb} MB` : 'กำลังคำนวณ...'}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl flex flex-col justify-center gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSeed(50000)}
                  disabled={isSeeding}
                  className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
                  {isSeeding ? 'กำลังปั๊ม...' : '+50,000 แถว'}
                </button>
                <button
                  onClick={handleClear}
                  className="p-1.5 bg-slate-700 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg text-xs transition"
                  title="ล้างข้อมูลทั้งหมด"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleIndexes(!status?.has_indexes)}
                  disabled={isTogglingIndex}
                  className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    status?.has_indexes
                      ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  {status?.has_indexes ? 'ลบ Index (ทดสอบ No Index)' : 'สร้าง Index (ทดสอบ With Index)'}
                </button>
              </div>
            </div>
          </div>

          {/* Active Indexes Pill List */}
          {status && (
            <div className="bg-slate-800/40 border border-slate-700/40 px-4 py-2.5 rounded-xl flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">B-Tree Indexes ที่รองรับ:</span>
              {status.available_indexes.map((idx) => {
                const isActive = status.active_indexes.includes(idx);
                return (
                  <span
                    key={idx}
                    className={`px-2.5 py-1 rounded-md font-mono text-[11px] flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-slate-700/50 text-slate-500 border border-slate-700 line-through'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    {idx}
                  </span>
                );
              })}
            </div>
          )}

          {/* Lab Preset Picker & Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Lab Presets */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>เลือกโจทย์ทดลอง (Benchmark Scenarios)</span>
              </div>
              <div className="space-y-2">
                {LAB_EXPERIMENTS.map((lab) => {
                  const isSelected = selectedLab.id === lab.id;
                  return (
                    <div
                      key={lab.id}
                      onClick={() => handleSelectLab(lab)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500/60 shadow-md ring-1 ring-indigo-500/30'
                          : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-white">{lab.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            lab.difficulty === 'Basic'
                              ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                              : lab.difficulty === 'Intermediate'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                          }`}
                        >
                          {lab.difficulty}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {lab.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: SQL Editor & Execution Engine */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>SQL Query Editor</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">SQLite EXPLAIN QUERY PLAN</span>
                </div>

                <div className="relative">
                  <textarea
                    value={customSql}
                    onChange={(e) => setCustomSql(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-none"
                    placeholder="พิมพ์คำสั่ง SQL SELECT เพื่อทดสอบ..."
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>คำแนะนำ: {selectedLab.pitfallTip}</span>
                  </div>
                  <button
                    onClick={handleExecuteQuery}
                    disabled={isExecuting || !customSql.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
                  >
                    <Play className={`w-4 h-4 ${isExecuting ? 'animate-spin' : ''}`} />
                    {isExecuting ? 'กำลังประมวลผล...' : 'รัน Benchmark & วิเคราะห์ Plan'}
                  </button>
                </div>
              </div>

              {/* Execution Result Box */}
              {lastResult && (
                <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">ผลการวิเคราะห์ Query</span>
                      {lastResult.uses_index ? (
                        <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Indexed (Fast Search)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-md flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Table Scan (Slow O(N))
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-slate-400">
                        แถวที่พบ: <strong className="text-white">{lastResult.row_count.toLocaleString()}</strong>
                      </span>
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Execution Time:{' '}
                        <strong className="text-amber-300 text-sm">{lastResult.elapsed_ms} ms</strong>
                      </span>
                    </div>
                  </div>

                  {/* Plan Tree Display */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                      Execution Plan Strategy:
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-xs text-indigo-300 flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>{lastResult.plan_summary}</span>
                    </div>
                  </div>

                  {/* Performance Speedup Comparison */}
                  {speedupRatio && (
                    <div className="bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/40 p-3 rounded-lg flex items-center justify-between text-xs text-emerald-200">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        <div>
                          <strong>อัตราเร่งความเร็ว (Speedup):</strong> Index ช่วยให้ค้นหาเร็วขึ้นกว่า No Index ถึง{' '}
                          <span className="text-base font-extrabold text-emerald-300 underline">
                            {speedupRatio}x เท่า!
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        ({baselineNoIndex.elapsed_ms}ms ➔ {lastResult.elapsed_ms}ms)
                      </span>
                    </div>
                  )}

                  {/* Sample Rows Preview */}
                  {lastResult.sample_rows && lastResult.sample_rows.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-slate-400">
                        ตัวอย่างผลลัพธ์ข้อมูล (Top {lastResult.sample_rows.length} แถว):
                      </div>
                      <div className="overflow-x-auto max-h-36 bg-slate-950 rounded-lg border border-slate-800 p-2">
                        <table className="w-full text-left font-mono text-[11px] text-slate-300">
                          <thead>
                            <tr className="text-slate-500 border-b border-slate-800">
                              <th className="pb-1 px-2">ID</th>
                              <th className="pb-1 px-2">Date</th>
                              <th className="pb-1 px-2">Customer</th>
                              <th className="pb-1 px-2">User Code</th>
                              <th className="pb-1 px-2">Amount</th>
                              <th className="pb-1 px-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lastResult.sample_rows.map((row, idx) => (
                              <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-900/50">
                                <td className="py-1 px-2 text-indigo-400">{row.id}</td>
                                <td className="py-1 px-2">{row.transaction_date}</td>
                                <td className="py-1 px-2">{row.customer_id}</td>
                                <td className="py-1 px-2">{row.user_code}</td>
                                <td className="py-1 px-2 text-emerald-400">{row.amount?.toLocaleString()}</td>
                                <td className="py-1 px-2">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800">
                                    {row.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* History Comparison Table */}
          {historyRuns.length > 0 && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 space-y-2">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>ประวัติการทดสอบรอบล่าสุด (Run History)</span>
                <span className="text-[11px] text-slate-400 font-normal">เปรียบเทียบเวลา Execution Time</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs text-slate-300">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-700/60">
                      <th className="py-2 px-3">เวลา</th>
                      <th className="py-2 px-3">หัวข้อทดสอบ</th>
                      <th className="py-2 px-3">สถานะ Index</th>
                      <th className="py-2 px-3">กลยุทธ์ค้นหา</th>
                      <th className="py-2 px-3 text-right">เวลาประมวลผล</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRuns.map((run) => (
                      <tr key={run.id} className="border-b border-slate-700/30 hover:bg-slate-800/60">
                        <td className="py-2 px-3 text-slate-400">{run.timestamp}</td>
                        <td className="py-2 px-3 font-sans font-medium text-slate-200">{run.labName}</td>
                        <td className="py-2 px-3">
                          {run.hasIndex ? (
                            <span className="text-emerald-400 font-semibold">With Index</span>
                          ) : (
                            <span className="text-rose-400 font-semibold">No Index</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {run.usesIndex ? (
                            <span className="text-indigo-400">SEARCH USING INDEX</span>
                          ) : (
                            <span className="text-amber-400">SCAN (Full Scan)</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-amber-300">{run.elapsedMs} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-800/90 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SQLite Database Engine v3.x | Enterprise Indexing Optimizer</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
