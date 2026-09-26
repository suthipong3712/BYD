import { authFetch } from "./api";

function ContactToggle({ contacted, onToggle }) {
  return (
    <button
      className={`contact-toggle ${contacted ? "contact-toggle--done" : "contact-toggle--pending"}`}
      onClick={onToggle}
    >
      {contacted ? "✓ ติดต่อแล้ว" : "ยังไม่ติดต่อ"}
    </button>
  );
}

function CRPage({ vehicles, token, onSelectVehicle, onRefresh }) {
  const today = new Date().toISOString().slice(0, 10);

  function toggleField(orderId, field, currentValue) {
    authFetch(`/repair-orders/${orderId}`, token, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: !currentValue }),
    }).then(onRefresh);
  }

  const openEntries = [];
  vehicles.forEach((v) => {
    v.repair_orders
      .filter((o) => o.status === "open")
      .forEach((o) => openEntries.push({ vehicle: v, order: o }));
  });

  const readyList = openEntries.filter(
    ({ order }) =>
      order.items.length > 0 &&
      order.items.every((i) => i.job_status === "done"),
  );
  const partsList = openEntries.filter(({ order }) =>
    order.items.some((i) => i.parts_request?.order_status === "arrived"),
  );
  const apptList = openEntries.filter(
    ({ order }) => order.appointment_date === today,
  );
  const claimList = openEntries.filter(
    ({ order }) =>
      order.job_type === "warranty" &&
      order.items.some((i) => i.claim_status === "rejected"),
  );

  function Section({ title, field, entries, emptyText }) {
    return (
      <div className="admin-section">
        <h2>
          {title} ({entries.length})
        </h2>
        {entries.length === 0 && <p className="detail-empty">{emptyText}</p>}
        {entries.length > 0 && (
          <div className="cr-list">
            {entries.map(({ vehicle, order }) => (
              <div
                key={order.id}
                className={`cr-row ${order[field] ? "cr-row--done" : ""}`}
              >
                <button
                  className="cr-row__info"
                  onClick={() => onSelectVehicle(vehicle.id)}
                >
                  <div className="vehicle-card__plate">
                    {vehicle.license_plate}
                  </div>
                  <div className="vehicle-card__meta">
                    {vehicle.customer_name}
                    {vehicle.phone && (
                      <>
                        {" · "}
                        <a
                          href={`tel:${vehicle.phone}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {vehicle.phone}
                        </a>
                      </>
                    )}
                  </div>
                </button>
                <ContactToggle
                  contacted={!!order[field]}
                  onToggle={() => toggleField(order.id, field, order[field])}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <Section
        title="🟢 รถพร้อมส่งมอบ"
        field="contacted_ready"
        entries={readyList}
        emptyText="ไม่มีรถพร้อมส่งมอบตอนนี้"
      />
      <Section
        title="📦 อะไหล่เพิ่งมาถึง"
        field="contacted_parts"
        entries={partsList}
        emptyText="ไม่มีอะไหล่ที่เพิ่งมาถึง"
      />
      <Section
        title="📅 นัดหมายวันนี้"
        field="contacted_appointment"
        entries={apptList}
        emptyText="ไม่มีนัดหมายวันนี้"
      />
      <Section
        title="⚠️ เคลม BYD ถูกปฏิเสธ"
        field="contacted_claim"
        entries={claimList}
        emptyText="ไม่มีเคลมที่ถูกปฏิเสธ"
      />
    </div>
  );
}

export default CRPage;
