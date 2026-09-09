import { useState } from "react";
import { authFetch } from "./api";

const STATUS_LABEL = { open: "เปิดอยู่", closed: "ปิดแล้ว" };
const PARTS_LABEL = {
  not_ordered: "ยังไม่สั่ง",
  ordered: "รออะไหล่",
  arrived: "มาถึงแล้ว",
};

function ImportPage({ token }) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    authFetch("/admin/import/preview", token, {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        setRows(data.rows);
        setLoading(false);
      });
    e.target.value = "";
  }

  function toggleSkip(index) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, skip: !r.skip } : r)),
    );
  }

  function handleCommit() {
    const ok = window.confirm(
      `ยืนยันนำเข้า ${rows.filter((r) => !r.skip).length} รายการใช่ไหม? การกระทำนี้ย้อนกลับไม่ได้`,
    );
    if (!ok) return;
    setLoading(true);
    authFetch("/admin/import/commit", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    })
      .then((res) => res.json())
      .then((data) => {
        setResult(data);
        setRows(null);
        setLoading(false);
      });
  }

  const willImport = rows ? rows.filter((r) => !r.skip).length : 0;
  const willSkip = rows ? rows.filter((r) => r.skip).length : 0;

  return (
    <div className="admin-panel">
      <div className="admin-section">
        <h2>นำเข้าข้อมูลจาก Excel</h2>
        <p className="intake-hint">
          รองรับไฟล์ที่มี 2 ชีต: ชื่อชีตมีคำว่า "รอดำเนินการ" และ "เสร็จสิ้น" —
          ระบบจะแปลงข้อมูลให้ดูก่อน ยังไม่บันทึกจนกว่าจะกดยืนยัน
        </p>
        <input
          type="file"
          accept=".xlsx"
          onChange={handleFile}
          disabled={loading}
        />

        {result && (
          <p className="intake-message">
            นำเข้าสำเร็จ {result.imported} รายการ (ข้าม {result.skipped} รายการ,
            ซ้ำกับที่มีอยู่แล้ว {result.duplicates} รายการ)
          </p>
        )}
      </div>

      {loading && <p className="detail-empty">กำลังประมวลผล...</p>}

      {rows !== null && (
        <div className="admin-section">
          <h2>
            ตรวจสอบก่อนนำเข้า ({willImport} จะนำเข้า, {willSkip} ข้าม)
          </h2>
          <div className="import-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>นำเข้า</th>
                  <th>ชีต</th>
                  <th>ทะเบียน</th>
                  <th>VIN</th>
                  <th>ลูกค้า</th>
                  <th>รุ่น</th>
                  <th>ประเภท</th>
                  <th>สถานะ</th>
                  <th>อะไหล่</th>
                  <th>ไมล์</th>
                  <th>วันที่</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, index) => (
                  <tr key={index} style={{ opacity: r.skip ? 0.4 : 1 }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={!r.skip}
                        onChange={() => toggleSkip(index)}
                      />
                      {r.skip_reason && (
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--status-red-text)",
                          }}
                        >
                          {r.skip_reason}
                        </div>
                      )}
                    </td>
                    <td>{r.source_sheet}</td>
                    <td>{r.license_plate ?? "-"}</td>
                    <td className="part-number">{r.vin ?? "-"}</td>
                    <td>{r.customer_name ?? "-"}</td>
                    <td>{r.model ?? "-"}</td>
                    <td>
                      {r.job_type === "warranty" ? "Warranty" : "Customer pay"}
                    </td>
                    <td>{STATUS_LABEL[r.order_status]}</td>
                    <td>{PARTS_LABEL[r.parts_order_status]}</td>
                    <td>{r.mileage ?? "-"}</td>
                    <td>{r.open_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            className="intake-submit"
            onClick={handleCommit}
            disabled={loading || willImport === 0}
          >
            ยืนยันนำเข้า {willImport} รายการ
          </button>
        </div>
      )}
    </div>
  );
}

export default ImportPage;
