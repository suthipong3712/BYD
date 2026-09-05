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

function IntakeForm({ token, onCreated }) {
  const [vehicle, setVehicle] = useState({
    vin: "",
    license_plate: "",
    model: "",
    customer_name: "",
    phone: "",
  });
  const [order, setOrder] = useState({
    job_type: "warranty",
    diagnosis_result: "",
  });
  const [items, setItems] = useState([emptyItem()]);
  const [technicians, setTechnicians] = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    authFetch("/technicians", token)
      .then((res) => res.json())
      .then((data) => setTechnicians(data));

    authFetch("/vehicle-models", token)
      .then((res) => res.json())
      .then((data) => setVehicleModels(data));
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

  function resetForm() {
    setVehicle({
      vin: "",
      license_plate: "",
      model: "",
      customer_name: "",
      phone: "",
    });
    setOrder({ job_type: "warranty", diagnosis_result: "" });
    setItems([emptyItem()]);
  }

  function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      vehicle,
      order: {
        ...order,
        items: items
          .filter((it) => it.description.trim() !== "")
          .map((it) => ({
            ...it,
            technician_id: it.technician_id ? Number(it.technician_id) : null,
          })),
      },
    };

    authFetch("/intake", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        setMessage(`บันทึกแล้ว: ${data.license_plate} — ${data.model}`);
        resetForm();
        onCreated && onCreated();
      });
  }

  return (
    <div className="admin-panel">
      <div className="admin-section">
        <h2>ข้อมูลรถ</h2>
        <div className="intake-grid">
          <input
            placeholder="VIN"
            value={vehicle.vin}
            onChange={(e) => setVehicle({ ...vehicle, vin: e.target.value })}
            required
          />
          <input
            placeholder="เลขทะเบียน"
            value={vehicle.license_plate}
            onChange={(e) =>
              setVehicle({ ...vehicle, license_plate: e.target.value })
            }
            required
          />
          <select
            value={vehicle.model}
            onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
            required
          >
            <option value="">-- เลือกรุ่นรถ --</option>
            {vehicleModels
              .filter((m) => m.active)
              .map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
          </select>
          <input
            placeholder="ชื่อลูกค้า"
            value={vehicle.customer_name}
            onChange={(e) =>
              setVehicle({ ...vehicle, customer_name: e.target.value })
            }
            required
          />
          <input
            placeholder="เบอร์โทร"
            value={vehicle.phone}
            onChange={(e) => setVehicle({ ...vehicle, phone: e.target.value })}
          />
        </div>
        <p className="intake-hint">
          ถ้า VIN นี้เคยมาซ่อมแล้ว ระบบจะใช้ข้อมูลรถเดิม ไม่สร้างซ้ำ
        </p>
      </div>

      <div className="admin-section">
        <h2>ใบสั่งซ่อม</h2>
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
        </div>
      </div>

      <div className="admin-section">
        <h2>รายการซ่อม</h2>
        {items.map((item, index) => (
          <div className="intake-item-row" key={index}>
            <input
              placeholder="รายการซ่อม (เช่น เปลี่ยนแบตเตอรี่ HV)"
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
      </div>

      <button className="intake-submit" onClick={handleSubmit}>
        บันทึกรับรถเข้าซ่อม
      </button>

      {message && <p className="intake-message">{message}</p>}
    </div>
  );
}

export default IntakeForm;
