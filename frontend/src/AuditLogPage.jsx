import { useEffect, useState } from 'react'
import { authFetch } from './api'

const ACTION_LABEL = {
  create_user: 'สร้างผู้ใช้',
  update_user: 'แก้ไขผู้ใช้',
  delete_user: 'ลบผู้ใช้',
  create_vehicle_model: 'เพิ่มรุ่นรถ',
  update_vehicle_model: 'แก้รุ่นรถ',
  create_technician: 'เพิ่มช่าง',
  update_technician: 'แก้ไขช่าง',
  delete_technician: 'ลบช่าง',
  create_status_option: 'เพิ่มตัวเลือกสถานะ',
  update_status_option: 'แก้ตัวเลือกสถานะ',
  delete_status_option: 'ลบตัวเลือกสถานะ',
  update_job_status: 'เปลี่ยนสถานะงาน',
  update_parts_status: 'เปลี่ยนสถานะอะไหล่',
  update_claim_status: 'เปลี่ยนสถานะเคลม',
  create_intake: 'รับรถเข้าซ่อม',
  create_repair_order: 'เพิ่มงานซ่อม',
  close_repair_order: 'ปิดงาน',
  cancel_repair_order: 'ยกเลิกงาน',
  update_repair_order: 'แก้ไขใบสั่งซ่อม',
  upload_photo: 'อัปโหลดรูป',
  import_excel: 'นำเข้าจาก Excel',
}

function AuditLogPage({ token }) {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    authFetch('/audit-logs', token)
      .then((res) => res.json())
      .then((data) => setLogs(data))
  }, [])

  return (
    <div className="admin-panel">
      <div className="admin-section">
        <h2>ประวัติการใช้งานระบบ (300 รายการล่าสุด)</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>เวลา</th>
              <th>ผู้ใช้</th>
              <th>การกระทำ</th>
              <th>รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                  {new Date(log.created_at + 'Z').toLocaleString('th-TH')}
                </td>
                <td>{log.username}</td>
                <td>{ACTION_LABEL[log.action] ?? log.action}</td>
                <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  {log.entity_type && `${log.entity_type} #${log.entity_id} — `}
                  {log.details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AuditLogPage