# 📘 คู่มือปฏิบัติการ Database Indexing Lab & Performance Tuning
สำหรับนิสิตและนักพัฒนาซอฟต์แวร์ (Enterprise Database Optimization Guide)

---

## 🎯 1. วัตถุประสงค์การเรียนรู้ (Learning Objectives)
1. **เข้าใจกลไกการทำงานของ Index (B-Tree Indexing)** ว่าช่วยลด Time Complexity จาก $O(N)$ (Sequential Scan) ลงเหลือ $O(\log N)$ (Index Seek) ได้อย่างไร
2. **สามารถอ่านและตีความ Execution Plan** จากคำสั่ง `EXPLAIN QUERY PLAN` (SQLite) หรือ `EXPLAIN ANALYZE` (PostgreSQL / MySQL) ได้อย่างถูกต้อง
3. **รู้เท่าทันข้อผิดพลาดที่พบบ่อย (Common Indexing Pitfalls)** เช่น การใช้ Function Wrap บน Indexed Column หรือการค้นหาด้วย LIKE Wildcard `%`
4. **สามารถนำเทคนิคการทำ Index ไปปรับปรุงประสิทธิภาพโปรเจกต์ของตนเอง** เพื่อรองรับผู้ใช้และข้อมูลจำนวนมหาศาล (Scalability)

---

## 🏗️ 2. สรุปความแตกต่าง: Table Scan vs Index Scan

| คุณลักษณะ | ไม่มี Index (Full Table Scan) | มี Index (B-Tree Index Seek) |
| :--- | :--- | :--- |
| **วิธีการค้นหา** | ไล่อ่านข้อมูลทีละแถวตั้งแต่ Record ที่ 1 จนถึง Record สุดท้าย ($N$ แถว) | กระโดดไปยังตำแหน่งข้อมูลผ่านโครงสร้าง B-Tree Tree Search |
| **Time Complexity** | $O(N)$ (ยิ่งข้อมูลเยอะ ยิ่งช้าลงแบบเชิงเส้น) | $O(\log N)$ (เร็วคงที่ แม้ข้อมูลจะมีหลักแสนหรือหลักล้านแถว) |
| **I/O Disk Read** | สูงมาก (ต้องดึง Data Block ทั้งตารางขึ้น Memory) | ต่ำมาก (ดึงเฉพาะ Index Page และ Data Block ที่ต้องการ) |
| **คำใน Execution Plan** | `SCAN table_name` | `SEARCH table_name USING INDEX index_name` |
| **ความเร็วเฉลี่ย (50k rows)** | ~25 ms – 80 ms | ~0.1 ms – 0.8 ms (**เร็วขึ้น 30x – 100x+ เท่า!**) |

---

## 🧪 3. โจทย์แล็บทดลอง 5 ข้อ (Lab Experiments)

### 📌 Lab 1: Exact Match Query (การค้นหาด้วย Key ตรงๆ)
* **SQL:**
  ```sql
  SELECT * FROM benchmark_records WHERE customer_id = 42;
  ```
* **ผลลัพธ์การวิเคราะห์ Plan:**
  - *No Index:* `SCAN benchmark_records`
  - *With Index:* `SEARCH benchmark_records USING INDEX idx_bench_customer (customer_id=?)`
* **บทเรียน:** ในตารางจริง เช่น `users(id)`, `orders(customer_id)`, หรือ `history(user_id)` การใส่ Index ให้ Foreign Key เป็นหัวใจสำคัญของการ Join และ Filter ข้อมูล

---

### 📌 Lab 2: Date Range Query (การค้นหาช่วงวันที่หรือตัวเลข)
* **SQL:**
  ```sql
  SELECT COUNT(*), SUM(amount) 
  FROM benchmark_records 
  WHERE transaction_date BETWEEN '2025-10-01' AND '2025-10-31';
  ```
* **ผลลัพธ์การวิเคราะห์ Plan:**
  - *With Index:* `SEARCH benchmark_records USING INDEX idx_bench_date (transaction_date>? AND transaction_date<?)`
* **บทเรียน:** B-Tree Index จะจัดเรียงค่าตามลำดับ (Sorted Order) ทำให้สามารถทำ Range Seek หัว-ท้ายและดึงแถวในช่วงที่ต้องการได้อย่างรวดเร็ว เหมาะกับตาราง Logs, Transactions, Audit Trails

---

### ⚠️ Lab 3: Pitfall - Function Wrap on Indexed Column (กับดักการครอบฟังก์ชัน)
* **SQL ตัวอย่างที่มีปัญหา:**
  ```sql
  -- ❌ ผิด: นำฟังก์ชัน substr มาครอบ transaction_date
  SELECT COUNT(*) FROM benchmark_records 
  WHERE substr(transaction_date, 1, 7) = '2025-10';
  ```
* **ผลลัพธ์การวิเคราะห์ Plan:**
  - แม้จะมี Index `idx_bench_date` อยู่แล้ว **แต่ Database จะตกไปเป็น `SCAN benchmark_records` ทันที!**
* **สาเหตุ:** เพราะ B-Tree เก็บค่า `transaction_date` ดิบๆ ไว้ เมื่อมีการครอบฟังก์ชัน Database ต้องคำนวณฟังก์ชันนั้นทีละแถวทุกแถวในตาราง
* **✅ วิธีแก้ไขที่ถูกต้อง:**
  ```sql
  -- ปรับเป็น Range Comparison เพื่อให้ B-Tree Index ทำงานได้เต็มประสิทธิภาพ
  SELECT COUNT(*) FROM benchmark_records 
  WHERE transaction_date >= '2025-10-01' AND transaction_date < '2025-11-01';
  ```

---

### ⚠️ Lab 4: Pitfall - Wildcard Pattern LIKE (% นำหน้า)
* **SQL ตัวอย่างที่มีปัญหา:**
  ```sql
  -- ❌ ผิด: ใช้ % นำหน้า
  SELECT * FROM benchmark_records WHERE user_code LIKE '%0042';
  ```
* **ผลลัพธ์การวิเคราะห์ Plan:**
  - บังคับให้เป็น `SCAN benchmark_records` เสมอ
* **สาเหตุ:** B-Tree เรียงลำดับจากตัวอักษรแรก (Prefix) เมื่อไม่ทราบตัวอักษรแรก จึงไม่สามารถค้นหาใน Tree ได้
* **✅ วิธีแก้ไข:**
  - หากค้นหาแบบขึ้นต้น ให้ใช้ Prefix Search: `WHERE user_code LIKE 'USER-0042%'` (จะใช้ Index ได้)
  - หากต้องค้นหากลางประโยคหรือข้อความยาวๆ ให้ใช้ **Full-Text Search (SQLite FTS5 หรือ PostgreSQL pg_trgm / GIN Index)**

---

### 🎯 Lab 5: Composite Index (การทำ Index หลายคอลัมน์)
* **SQL:**
  ```sql
  SELECT * FROM benchmark_records 
  WHERE status = 'pending' AND transaction_date >= '2025-10-01' 
  LIMIT 100;
  ```
* **ผลลัพธ์การวิเคราะห์ Plan:**
  - *With Index:* `SEARCH benchmark_records USING INDEX idx_bench_composite (status=? AND transaction_date>?)`
* **กฎสำคัญ (Leftmost Prefix Rule):**
  - หากสร้าง Composite Index `(col_a, col_b)` คำสั่ง Query จะต้องมีเงื่อนไข `WHERE col_a = ...` จึงจะสามารถนำ Index ไปใช้ได้ หาก Query กรองเฉพาะ `WHERE col_b = ...` โครงสร้างจะไม่สามารถใช้ Index ได้อย่างเต็มที่

---

## 🚀 4. คำแนะนำในการนำไปประยุกต์ใช้กับโปรเจกต์ของนิสิต

1. **ระบุ Slow Query ด้วย Logging หรือ Profiler:**
   - ใน SQLite / PostgreSQL เปิด Slow Query Log หรือใส่คำสั่ง `EXPLAIN` เพื่อดูว่า Query ตัวไหนทำ Full Table Scan
2. **อย่าใส่ Index พร่ำเพรื่อ (Index Overkill):**
   - ทุกครั้งที่มีการ `INSERT`, `UPDATE`, `DELETE` ฐานข้อมูลต้องเสียเวลาอัปเดต B-Tree Index ทุกตัว
   - ให้สร้าง Index เฉพาะคอลัมน์ที่อยู่ใน `WHERE`, `JOIN ON`, `ORDER BY` บ่อยๆ เท่านั้น
3. **ตรวจสอบ Low Cardinality Columns:**
   - คอลัมน์ที่มีค่าซ้ำกันเยอะมาก เช่น `gender` (M/F) หรือ `boolean_flag` (true/false) การใส่ Index แบบเดี่ยวๆ มักไม่คุ้มค่า ให้พิจารณาทำเป็น Composite Index ร่วมกับคอลัมน์อื่น
4. **ใช้ Functional / Expression Index เมื่อจำเป็น:**
   - หากโปรเจกต์ต้องค้นหา `WHERE LOWER(email) = ...` บ่อยๆ ให้สร้าง Index บน Expression เช่น `CREATE INDEX idx_user_lower_email ON users(LOWER(email));`
