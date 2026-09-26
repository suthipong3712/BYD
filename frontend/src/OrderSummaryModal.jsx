const ORDER_STATUS_LABEL = {
  open: "งานเปิดอยู่",
  closed: "ปิดงานแล้ว",
  cancelled: "ยกเลิกแล้ว",
};

function Row({ label, value }) {
  return (
    <div className="summary-row">
      <span className="summary-row__label">{label}</span>
      <span className="summary-row__value">
        {value ?? <em>— ไม่ได้ระบุ —</em>}
      </span>
    </div>
  );
}

function OrderSummaryModal({ order, vehicle, optionMeta, onClose }) {
  return (
    <div className="quick-search-overlay" onClick={onClose}>
      <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
        <div className="summary-modal__header">
          <div>
            <h2>{vehicle.license_plate}</h2>
            <p>
              เปิดงานวันที่ {order.open_date} · สถานะ:{" "}
              {ORDER_STATUS_LABEL[order.status]}
            </p>
          </div>
          <button className="summary-modal__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="summary-section">
          <Row label="ชื่อลูกค้า" value={vehicle.customer_name} />
          <Row label="เบอร์โทร" value={vehicle.phone} />
          <Row label="เลขตัวถัง (VIN)" value={vehicle.vin} />
          <Row label="รุ่นรถ" value={vehicle.model} />
          <Row
            label="ประเภทงาน"
            value={order.job_type === "warranty" ? "Warranty" : "Customer pay"}
          />
          <Row label="ปัญหา / ผลวินิจฉัย" value={order.diagnosis_result} />
          <Row label="เลขใบสั่งซ่อม" value={order.job_card_number} />
          <Row
            label="เลขไมล์"
            value={
              order.mileage != null
                ? `${order.mileage.toLocaleString()} กม.`
                : null
            }
          />
          <Row label="วันที่นัดหมาย" value={order.appointment_date} />
        </div>

        <div className="summary-divider">รายการซ่อม ({order.items.length})</div>

        {order.items.map((item, i) => {
          const partMeta = item.parts_request
            ? optionMeta("parts_status", item.parts_request.order_status)
            : null;
          const jobMeta = optionMeta("job_status", item.job_status);
          return (
            <div className="summary-section" key={item.id}>
              <div className="summary-item-title">
                {i + 1}. {item.description}
              </div>
              <Row label="ช่างผู้รับผิดชอบ" value={item.technician?.name} />
              <Row label="หมายเหตุ / วิธีแก้ (ช่าง)" value={item.notes} />
              <Row
                label="ชั่วโมงทำงานโดยประมาณ"
                value={item.repair_time_estimate}
              />
              <Row label="อะไหล่ที่ต้องใช้" value={item.part_name} />
              <Row label="เลขอะไหล่" value={item.part_number} />
              <Row
                label="สถานะอะไหล่"
                value={
                  partMeta ? (
                    <span className={`badge badge--${partMeta.color}`}>
                      {partMeta.label}
                    </span>
                  ) : (
                    "ไม่ต้องใช้อะไหล่"
                  )
                }
              />
              <Row
                label="สถานะงาน"
                value={
                  <span className={`badge badge--${jobMeta.color}`}>
                    {jobMeta.label}
                  </span>
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default OrderSummaryModal;
