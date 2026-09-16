const ORDER_STATUS_COLOR = { open: "red", closed: "green", cancelled: "muted" };

function daysBetween(fromDateStr) {
  const from = new Date(fromDateStr);
  const now = new Date();
  return Math.floor((now - from) / (1000 * 60 * 60 * 24));
}

function OverviewPage({ vehicles, onSelectVehicle, onGoToList }) {
  const today = new Date().toISOString().slice(0, 10);

  const openOrdersAll = vehicles.flatMap((v) =>
    v.repair_orders
      .filter((o) => o.status === "open")
      .map((o) => ({ ...o, vehicle: v })),
  );

  const totalPending = openOrdersAll.length;
  const intakeToday = openOrdersAll.filter((o) => o.open_date === today).length;

  const readyVehicles = vehicles.filter((v) => {
    const items = v.repair_orders
      .filter((o) => o.status === "open")
      .flatMap((o) => o.items);
    return items.length > 0 && items.every((i) => i.job_status === "done");
  }).length;

  const waitingPartsItems = [];
  openOrdersAll.forEach((o) => {
    o.items.forEach((item) => {
      const pr = item.parts_request;
      if (pr && pr.order_status !== "arrived" && pr.ordered_date) {
        waitingPartsItems.push({
          vehicle: o.vehicle,
          order: o,
          item,
          days: daysBetween(pr.ordered_date),
        });
      }
    });
  });
  const waitingOverWeek = waitingPartsItems.filter((w) => w.days >= 7);
  const topWaiting = [...waitingPartsItems]
    .sort((a, b) => b.days - a.days)
    .slice(0, 8);

  const appointmentsToday = openOrdersAll.filter(
    (o) => o.appointment_date === today,
  );

  return (
    <div className="overview-page">
      <div className="overview-page__header">
        <h1>ภาพรวมวันนี้</h1>
        <button className="btn-add-order" onClick={onGoToList}>
          ไปหน้ารายการรถ →
        </button>
      </div>

      <div className="history-stats history-stats--big">
        <div className="stat-box">
          <div className="stat-box__value">{totalPending}</div>
          <div className="stat-box__label">งานค้างทั้งหมด</div>
        </div>
        <div className="stat-box">
          <div className="stat-box__value">{intakeToday}</div>
          <div className="stat-box__label">รับรถวันนี้</div>
        </div>
        <div className="stat-box">
          <div className="stat-box__value">{readyVehicles}</div>
          <div className="stat-box__label">พร้อมส่งมอบ</div>
        </div>
        <div className="stat-box overview-stat--warn">
          <div className="stat-box__value">{waitingOverWeek.length}</div>
          <div className="stat-box__label">รออะไหล่เกิน 7 วัน</div>
        </div>
        <div className="stat-box">
          <div className="stat-box__value">{appointmentsToday.length}</div>
          <div className="stat-box__label">นัดหมายวันนี้</div>
        </div>
      </div>

      <h3 className="section-heading">อะไหล่ที่รอนานที่สุด</h3>
      {topWaiting.length === 0 && (
        <p className="detail-empty">ไม่มีรายการรออะไหล่ค้างอยู่</p>
      )}
      {topWaiting.length > 0 && (
        <div className="overview-list">
          {topWaiting.map((w) => (
            <button
              key={w.item.id}
              className="overview-list__row"
              onClick={() => onSelectVehicle(w.vehicle.id)}
            >
              <div>
                <div className="vehicle-card__plate">
                  {w.vehicle.license_plate}
                </div>
                <div className="vehicle-card__meta">{w.item.description}</div>
              </div>
              <span className={`badge badge--${w.days >= 7 ? "red" : "amber"}`}>
                รอมา {w.days} วัน
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default OverviewPage;
