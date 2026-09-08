import { useState } from 'react'

const ORDER_STATUS_LABEL = {
  open: 'งานเปิดอยู่',
  closed: 'ปิดงานแล้ว',
  cancelled: 'ยกเลิกแล้ว',
}

const ORDER_STATUS_COLOR = {
  open: 'red',
  closed: 'green',
  cancelled: 'muted',
}

function Badge({ color, children }) {
  return <span className={`badge badge--${color}`}>{children}</span>
}

function HistoryPage({ vehicle, statusOptions, onBack }) {
  const [lightboxSrc, setLightboxSrc] = useState(null)

  function optionMeta(category, key) {
    const found = statusOptions.find((o) => o.category === category && o.key === key)
    return found ?? { label: key, color: 'muted' }
  }

  const orders = [...vehicle.repair_orders].sort((a, b) =>
    b.open_date.localeCompare(a.open_date)
  )
  const totalVisits = orders.length
  const openVisits = orders.filter((o) => o.status === 'open').length
  const closedVisits = orders.filter((o) => o.status === 'closed').length
  const cancelledVisits = orders.filter((o) => o.status === 'cancelled').length
  const totalItems = orders.reduce((sum, o) => sum + o.items.length, 0)
  const lastVisit = orders[0]?.open_date ?? '-'

  return (
    <div className="history-page">
      <button className="btn-back" onClick={onBack}>← กลับหน้ารายการรถ</button>

      <div className="history-page__header">
        <h1>{vehicle.license_plate} — {vehicle.model}</h1>
        <p>
          {vehicle.customer_name} · {vehicle.phone ?? '-'} ·{' '}
          <span className="part-number">VIN {vehicle.vin}</span>
        </p>
      </div>

      <div className="history-stats history-stats--big">
        <div className="stat-box">
          <div className="stat-box__value">{totalVisits}</div>
          <div className="stat-box__label">เข้าซ่อมทั้งหมด</div>
        </div>
        <div className="stat-box">
          <div className="stat-box__value">{openVisits}</div>
          <div className="stat-box__label">กำลังดำเนินการ</div>
        </div>
        <div className="stat-box">
          <div className="stat-box__value">{closedVisits}</div>
          <div className="stat-box__label">เสร็จสิ้นแล้ว</div>
        </div>
        <div className="stat-box">
          <div className="stat-box__value">{cancelledVisits}</div>
          <div className="stat-box__label">ยกเลิก</div>
        </div>
        <div className="stat-box">
          <div className="stat-box__value">{totalItems}</div>
          <div className="stat-box__label">รายการซ่อมสะสม</div>
        </div>
        <div className="stat-box">
          <div className="stat-box__value">{lastVisit}</div>
          <div className="stat-box__label">เข้าล่าสุด</div>
        </div>
      </div>

      <div className="timeline">
        {orders.length === 0 && <p className="detail-empty">ยังไม่มีประวัติการเข้าซ่อม</p>}

        {orders.map((order) => (
          <div className="timeline-entry" key={order.id}>
            <div className={`timeline-dot timeline-dot--${ORDER_STATUS_COLOR[order.status]}`} />
            <div className="timeline-card">
              <div className="timeline-card__header">
                <div>
                  <div className="timeline-card__date">{order.open_date}</div>
                  <div className="timeline-card__title">
                    ใบสั่งซ่อม #{order.id}
                    {order.job_card_number && ` · เลขใบสั่งซ่อม ${order.job_card_number}`}
                  </div>
                </div>
                <Badge color={ORDER_STATUS_COLOR[order.status]}>
                  {ORDER_STATUS_LABEL[order.status]}
                </Badge>
              </div>

              <div className="timeline-card__meta">
                {order.job_type === 'warranty' ? 'Warranty' : 'Customer pay'}
                {' · '}
                {order.diagnosis_result ?? 'ยังไม่มีผลวินิจฉัย'}
                {order.mileage != null && ` · ${order.mileage.toLocaleString()} กม.`}
              </div>

              <div className="order-photos">
                <div className="photo-slot">
                  {order.car_photo_path ? (
                    <img
                      src={order.car_photo_path}
                      alt="รูปรถ"
                      className="photo-slot__img"
                      onClick={() => setLightboxSrc(order.car_photo_path)}
                    />
                  ) : (
                    <div className="photo-slot__placeholder">ไม่มีรูปรถ</div>
                  )}
                  <div className="photo-slot__caption">รูปรถ</div>
                </div>
                <div className="photo-slot">
                  {order.vin_photo_path ? (
                    <img
                      src={order.vin_photo_path}
                      alt="VIN"
                      className="photo-slot__img"
                      onClick={() => setLightboxSrc(order.vin_photo_path)}
                    />
                  ) : (
                    <div className="photo-slot__placeholder">ไม่มีรูป VIN</div>
                  )}
                  <div className="photo-slot__caption">รูปหน้า VIN</div>
                </div>
              </div>

              {order.items.length > 0 && (
                <table className="repair-table">
                  <thead>
                    <tr>
                      <th>รายการซ่อม</th>
                      <th>อะไหล่</th>
                      <th>สถานะอะไหล่</th>
                      <th>ช่าง</th>
                      <th>สถานะงาน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => {
                      const partKey = item.parts_request?.order_status ?? 'not_ordered'
                      const partMeta = optionMeta('parts_status', partKey)
                      const jobMeta = optionMeta('job_status', item.job_status)
                      return (
                        <tr key={item.id}>
                          <td>{item.description}</td>
                          <td className="part-number">{item.part_number ?? '-'}</td>
                          <td><Badge color={partMeta.color}>{partMeta.label}</Badge></td>
                          <td>{item.technician ? item.technician.name : '-'}</td>
                          <td><Badge color={jobMeta.color}>{jobMeta.label}</Badge></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ))}
      </div>

      {lightboxSrc !== null && (
        <div className="lightbox" onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="" />
          <button className="lightbox__close" onClick={() => setLightboxSrc(null)}>
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

export default HistoryPage