import { useEffect, useState } from "react";
import { authFetch } from "./api";

function emptyItem() {
  return {
    description: "",
    part_name: "",
    part_number: "",
    repair_time_estimate: "",
    technician_id: "",
  };
}

function NewOrderForm({ token, vehicleId, onCreated, onCancel }) {
  const [order, setOrder] = useState({
    job_type: "warranty",
    diagnosis_result: "",
    mileage: "",
  });
  const [items, setItems] = useState([emptyItem()]);
  const [technicians, setTechnicians] = useState([]);

  useEffect(() => {
    authFetch("/technicians", token)
      .then((res) => res.json())
      .then((data) => setTechnicians(data));
  }, []);

  function updateItem(index, field, value) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...order,
      mileage: order.mileage ? Number(order.mileage) : null,
      items: items
        .filter((it) => it.description.trim() !== "")
        .map((it) => ({
          ...it,
          technician_id: it.technician_id ? Number(it.technician_id) : null,
        })),
    };
    authFetch(`/vehicles/${vehicleId}/repair-orders`, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(() => onCreated());
  }

  return (
    <div className="admin-section new-order-form">
      <h2>เพิ่มงานซ่อมใหม่</h2>
      <form onSubmit={handleSubmit}>
        <div className="intake-grid">
          <select
            value={order.job_type}
            onChange={(e) => setOrder({ ...order, job_type: e.target.value })}
          >
            <option value="warranty">Warranty</option>
            <option value="customer_pay">Customer pay</option>
          </select>
          <input
            placeholder="ผลการวินิจฉัย (ถ้ามี)"
            value={order.diagnosis_result}
            onChange={(e) =>
              setOrder({ ...order, diagnosis_result: e.target.value })
            }
          />
          <input
            type="number"
            placeholder="เลขไมล์ (กม.)"
            value={order.mileage}
            onChange={(e) => setOrder({ ...order, mileage: e.target.value })}
          />
        </div>
        {items.map((item, index) => (
          <div className="intake-item-row" key={index}>
            <input
              placeholder="รายการซ่อม"
              value={item.description}
              onChange={(e) => updateItem(index, "description", e.target.value)}
            />
            <input
              placeholder="ชื่ออะไหล่"
              value={item.part_name}
              onChange={(e) => updateItem(index, "part_name", e.target.value)}
            />
            <input
              placeholder="เบอร์อะไหล่"
              value={item.part_number}
              onChange={(e) => updateItem(index, "part_number", e.target.value)}
            />
            <input
              placeholder="เวลาที่ใช้"
              value={item.repair_time_estimate}
              onChange={(e) =>
                updateItem(index, "repair_time_estimate", e.target.value)
              }
            />
            <select
              value={item.technician_id}
              onChange={(e) =>
                updateItem(index, "technician_id", e.target.value)
              }
            >
              <option value="">-- ช่าง --</option>
              {technicians
                .filter((t) => t.active)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
            <button type="button" onClick={() => removeItem(index)}>
              ลบ
            </button>
          </div>
        ))}
        <button type="button" onClick={addItem}>
          + เพิ่มรายการซ่อม
        </button>

        <div className="new-order-form__actions">
          <button type="submit" className="intake-submit">
            บันทึกงานใหม่
          </button>
          <button type="button" onClick={onCancel}>
            ยกเลิก
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewOrderForm;
