import { useEffect, useState } from "react";
import "./App.css";
import AdminPanel from "./AdminPanel";
import IntakeForm from "./IntakeForm";
import LoginPage from "./LoginPage";
import NewOrderForm from "./NewOrderForm";
import HistoryPage from "./HistoryPage";
import ImportPage from "./ImportPage";
import { authFetch } from "./api";

const ORDER_STATUS_LABEL = {
  open: "งานเปิดอยู่",
  closed: "ปิดงานแล้ว",
  cancelled: "ยกเลิกแล้ว",
};

const ORDER_STATUS_COLOR = {
  open: "red",
  closed: "green",
  cancelled: "muted",
};
const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return `${THAI_MONTHS[m - 1]} ${y + 543}`;
}

function groupVehiclesByMonth(vehicleList) {
  const groups = {};
  vehicleList.forEach((v) => {
    const dates = v.repair_orders.map((o) => o.open_date).filter(Boolean);
    if (dates.length === 0) return;
    const lastDate = [...dates].sort().reverse()[0];
    const key = lastDate.slice(0, 7);
    if (!groups[key]) groups[key] = [];
    groups[key].push(v);
  });
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

function getVehicleStatusKey(vehicle) {
  const openOrders = vehicle.repair_orders.filter((o) => o.status === "open");
  const items = openOrders.flatMap((o) => o.items);
  if (items.length === 0) return "no_pending";

  const allDone = items.every((i) => i.job_status === "done");
  if (allDone) return "ready";

  const hasNotOrdered = items.some(
    (i) => i.parts_request?.order_status === "not_ordered",
  );
  if (hasNotOrdered) return "waiting_parts";

  return "in_progress";
}

function Badge({ color, children }) {
  return <span className={`badge badge--${color}`}>{children}</span>;
}

function App() {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("gms_token");
    const userRaw = localStorage.getItem("gms_user");
    if (!token || !userRaw) return null;
    return { token, user: JSON.parse(userRaw) };
  });

  const [view, setView] = useState("dashboard");
  const [vehicles, setVehicles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [statusOptions, setStatusOptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [listTab, setListTab] = useState("pending");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedMonths, setExpandedMonths] = useState(new Set());
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editForm, setEditForm] = useState({
    job_type: "warranty",
    diagnosis_result: "",
    job_card_number: "",
  });
  const [addingOrder, setAddingOrder] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historySearchVehicle, setHistorySearchVehicle] = useState(null);

  const token = auth?.token;
  const role = auth?.user?.role;
  const canManage = role === "admin" || role === "sa";

  function handleLogin(data) {
    localStorage.setItem("gms_token", data.token);
    localStorage.setItem("gms_user", JSON.stringify(data.user));
    setAuth(data);
  }

  function handleLogout() {
    localStorage.removeItem("gms_token");
    localStorage.removeItem("gms_user");
    setAuth(null);
    setView("dashboard");
    setSelectedId(null);
    setDetail(null);
  }

  useEffect(() => {
    if (!auth) return;
    authFetch("/vehicles", token)
      .then((res) => res.json())
      .then((data) => setVehicles(data));

    authFetch("/status-options", token)
      .then((res) => res.json())
      .then((data) => setStatusOptions(data));
  }, [view, auth]);

  useEffect(() => {
    if (!auth || selectedId === null) return;
    authFetch(`/vehicles/${selectedId}`, token)
      .then((res) => res.json())
      .then((data) => setDetail(data));
  }, [selectedId, auth]);

  useEffect(() => {
    if (listTab !== "done") return;
    const groups = groupVehiclesByMonth(
      vehicles.filter((v) => !isVehiclePending(v)),
    );
    if (groups.length > 0) {
      setExpandedMonths(new Set([groups[0][0]]));
    }
  }, [listTab, vehicles]);

  function refreshVehicleList() {
    authFetch("/vehicles", token)
      .then((res) => res.json())
      .then((data) => setVehicles(data));
  }

  function refreshDetail() {
    authFetch(`/vehicles/${selectedId}`, token)
      .then((res) => res.json())
      .then((data) => {
        setDetail(data);
        refreshVehicleList();
      });
  }

  function updateJobStatus(itemId, jobStatus) {
    authFetch(`/repair-items/${itemId}/status`, token, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_status: jobStatus }),
    }).then(refreshDetail);
  }

  function updatePartsStatus(itemId, orderStatus) {
    authFetch(`/repair-items/${itemId}/parts-status`, token, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_status: orderStatus }),
    }).then(refreshDetail);
  }

  function closeOrder(order) {
    const notDone = order.items.filter((i) => i.job_status !== "done");
    if (notDone.length > 0) {
      const ok = window.confirm(
        `ยังมี ${notDone.length} รายการที่ยังไม่เสร็จ ต้องการปิดงานนี้เลยไหม?`,
      );
      if (!ok) return;
    }

    let jobCardNumber = order.job_card_number;
    if (!jobCardNumber) {
      jobCardNumber = window.prompt("กรุณาใส่เลขใบสั่งซ่อม ก่อนปิดงาน");
      if (!jobCardNumber || jobCardNumber.trim() === "") {
        alert("ต้องใส่เลขใบสั่งซ่อมก่อนปิดงาน");
        return;
      }
    }

    authFetch(`/repair-orders/${order.id}/close`, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_card_number: jobCardNumber }),
    }).then(refreshDetail);
  }

  function cancelOrder(order) {
    const ok = window.confirm(
      "ต้องการยกเลิกใบสั่งซ่อมนี้ใช่ไหม? (ประวัติจะยังเก็บไว้ แต่จะไม่นับเป็นงานที่ทำอยู่)",
    );
    if (!ok) return;
    authFetch(`/repair-orders/${order.id}/cancel`, token, {
      method: "POST",
    }).then(refreshDetail);
  }

  function startEdit(order) {
    setEditingOrderId(order.id);
    setEditForm({
      job_type: order.job_type,
      diagnosis_result: order.diagnosis_result ?? "",
      job_card_number: order.job_card_number ?? "",
    });
  }

  function saveEdit(order) {
    authFetch(`/repair-orders/${order.id}`, token, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    }).then(() => {
      setEditingOrderId(null);
      refreshDetail();
    });
  }

  function uploadPhoto(orderId, kind, file) {
    const formData = new FormData();
    formData.append("file", file);
    authFetch(`/repair-orders/${orderId}/photo/${kind}`, token, {
      method: "POST",
      body: formData,
    }).then(refreshDetail);
  }

  function optionsFor(category) {
    return statusOptions
      .filter((o) => o.category === category)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  function optionMeta(category, key) {
    const found = statusOptions.find(
      (o) => o.category === category && o.key === key,
    );
    return found ?? { label: key, color: "muted" };
  }

  if (!auth) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const canEditJob = role === "admin" || role === "technician";
  const canEditParts = role === "admin" || role === "parts";

  const isVehiclePending = (v) =>
    v.repair_orders.some((o) => o.status === "open");

  const filteredVehicles = vehicles
    .filter((v) =>
      listTab === "pending" ? isVehiclePending(v) : !isVehiclePending(v),
    )
    .filter(
      (v) => statusFilter === "all" || getVehicleStatusKey(v) === statusFilter,
    )
    .filter((v) => {
      const q = searchQuery.trim().toLowerCase();
      if (q === "") return true;
      return (
        v.license_plate.toLowerCase().includes(q) ||
        v.customer_name.toLowerCase().includes(q) ||
        v.vin.toLowerCase().includes(q)
      );
    });
  const showGrouped = listTab === "done" && searchQuery.trim() === "";
  const monthGroups = showGrouped ? groupVehiclesByMonth(filteredVehicles) : [];

  function toggleMonth(key) {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const historySearchResults =
    historySearchQuery.trim() === ""
      ? []
      : vehicles.filter((v) => {
          const q = historySearchQuery.trim().toLowerCase();
          return (
            v.license_plate.toLowerCase().includes(q) ||
            v.vin.toLowerCase().includes(q)
          );
        });

  function renderOrderCard(order) {
    const isOpen = order.status === "open";
    const isEditing = editingOrderId === order.id;
    return (
      <div className="repair-order" key={order.id}>
        <div className="repair-order__header">
          <div style={{ flex: 1 }}>
            <h2 className="repair-order__title">
              ใบสั่งซ่อม #{order.id}
              {order.job_card_number &&
                ` · เลขใบสั่งซ่อม ${order.job_card_number}`}
            </h2>

            {!isEditing && (
              <div className="repair-order__meta">
                {order.job_type === "warranty" ? "Warranty" : "Customer pay"}
                {" · "}
                {order.diagnosis_result ?? "ยังไม่มีผลวินิจฉัย"}
                {" · "}
                เปิดงานวันที่ {order.open_date}
                {order.mileage != null &&
                  ` · ${order.mileage.toLocaleString()} กม.`}
              </div>
            )}

            {isEditing && (
              <div className="edit-order-form">
                <select
                  value={editForm.job_type}
                  onChange={(e) =>
                    setEditForm({ ...editForm, job_type: e.target.value })
                  }
                >
                  <option value="warranty">Warranty</option>
                  <option value="customer_pay">Customer pay</option>
                </select>
                <input
                  placeholder="ผลการวินิจฉัย"
                  value={editForm.diagnosis_result}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      diagnosis_result: e.target.value,
                    })
                  }
                />
                <input
                  placeholder="เลขใบสั่งซ่อม"
                  value={editForm.job_card_number}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      job_card_number: e.target.value,
                    })
                  }
                />
                <button onClick={() => saveEdit(order)}>บันทึก</button>
                <button onClick={() => setEditingOrderId(null)}>ยกเลิก</button>
              </div>
            )}
          </div>

          <div className="repair-order__actions">
            <Badge color={ORDER_STATUS_COLOR[order.status]}>
              {ORDER_STATUS_LABEL[order.status]}
            </Badge>
            {isOpen && canManage && !isEditing && (
              <>
                <button
                  className="btn-close-order"
                  onClick={() => startEdit(order)}
                >
                  แก้ไข
                </button>
                <button
                  className="btn-close-order"
                  onClick={() => closeOrder(order)}
                >
                  ปิดงาน
                </button>
                <button
                  className="btn-cancel-order"
                  onClick={() => cancelOrder(order)}
                >
                  ยกเลิกงาน
                </button>
              </>
            )}
          </div>
        </div>

        <div className="order-photos">
          <PhotoSlot
            label="รูปรถ"
            src={order.car_photo_path}
            canUpload={canManage}
            onSelect={(file) => uploadPhoto(order.id, "car", file)}
            onView={setLightboxSrc}
          />
          <PhotoSlot
            label="รูปหน้า VIN"
            src={order.vin_photo_path}
            canUpload={canManage}
            onSelect={(file) => uploadPhoto(order.id, "vin", file)}
            onView={setLightboxSrc}
          />
        </div>

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
              const partKey = item.parts_request?.order_status ?? "not_ordered";
              const partMeta = optionMeta("parts_status", partKey);
              const jobMeta = optionMeta("job_status", item.job_status);

              return (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td className="part-number">{item.part_number ?? "-"}</td>
                  <td>
                    <select
                      className={`status-select status-select--${partMeta.color}`}
                      value={partKey}
                      disabled={!isOpen || !canEditParts}
                      onChange={(e) =>
                        updatePartsStatus(item.id, e.target.value)
                      }
                    >
                      {optionsFor("parts_status").map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{item.technician ? item.technician.name : "-"}</td>
                  <td>
                    <select
                      className={`status-select status-select--${jobMeta.color}`}
                      value={item.job_status}
                      disabled={!isOpen || !canEditJob}
                      onChange={(e) => updateJobStatus(item.id, e.target.value)}
                    >
                      {optionsFor("job_status").map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  let openOrders = [];
  let historyOrders = [];
  let totalVisits = 0;
  let closedVisits = 0;
  let cancelledVisits = 0;
  let lastVisitDate = null;

  if (detail !== null) {
    openOrders = detail.repair_orders.filter((o) => o.status === "open");
    historyOrders = [...detail.repair_orders]
      .filter((o) => o.status !== "open")
      .sort((a, b) => b.open_date.localeCompare(a.open_date));
    totalVisits = detail.repair_orders.length;
    closedVisits = detail.repair_orders.filter(
      (o) => o.status === "closed",
    ).length;
    cancelledVisits = detail.repair_orders.filter(
      (o) => o.status === "cancelled",
    ).length;
    lastVisitDate =
      detail.repair_orders.length > 0
        ? [...detail.repair_orders].sort((a, b) =>
            b.open_date.localeCompare(a.open_date),
          )[0].open_date
        : null;
  }

  return (
    <div>
      <header className="app-header">
        <div className="app-header__brand">
          <div className="app-header__logo">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="currentColor" />
            </svg>
          </div>
          <div>
            <h1>BYD Garage</h1>
            <span>ระบบบริหารจัดการงานซ่อม</span>
          </div>
        </div>
        <div className="app-header__nav">
          <button
            className={`app-header__nav-btn ${view === "dashboard" ? "active" : ""}`}
            onClick={() => setView("dashboard")}
          >
            รายการรถ
          </button>
          <button
            className={`app-header__nav-btn ${view === "historySearch" ? "active" : ""}`}
            onClick={() => {
              setView("historySearch");
              setHistorySearchVehicle(null);
              setHistorySearchQuery("");
            }}
          >
            ค้นหาประวัติ
          </button>
          {(role === "admin" || role === "sa") && (
            <button
              className={`app-header__nav-btn ${view === "intake" ? "active" : ""}`}
              onClick={() => setView("intake")}
            >
              + รับรถใหม่
            </button>
          )}
          {role === "admin" && (
            <button
              className={`app-header__nav-btn ${view === "admin" ? "active" : ""}`}
              onClick={() => setView("admin")}
            >
              ⚙ Admin
            </button>
          )}
          {role === "admin" && (
            <button
              className={`app-header__nav-btn ${view === "import" ? "active" : ""}`}
              onClick={() => setView("import")}
            >
              นำเข้าข้อมูล
            </button>
          )}
        </div>
        <div className="app-header__user">
          <span>
            {auth.user.username} · {auth.user.role}
          </span>
          <button className="app-header__logout" onClick={handleLogout}>
            ออกจากระบบ
          </button>
        </div>
      </header>

      {view === "admin" && role === "admin" && <AdminPanel token={token} />}
      {view === "import" && role === "admin" && <ImportPage token={token} />}
      {view === "intake" && (role === "admin" || role === "sa") && (
        <IntakeForm
          token={token}
          onCreated={() => {
            refreshVehicleList();
            setView("dashboard");
          }}
        />
      )}

      {view === "historySearch" && historySearchVehicle !== null && (
        <HistoryPage
          vehicle={historySearchVehicle}
          statusOptions={statusOptions}
          onBack={() => setHistorySearchVehicle(null)}
        />
      )}

      {view === "historySearch" && historySearchVehicle === null && (
        <div className="history-search-page">
          <h1>ค้นหาประวัติรถ</h1>
          <p className="history-search-page__hint">
            พิมพ์เลขทะเบียนหรือเลข VIN เพื่อค้นหา
          </p>
          <input
            className="history-search-input"
            placeholder="เลขทะเบียน หรือ VIN"
            value={historySearchQuery}
            onChange={(e) => setHistorySearchQuery(e.target.value)}
            autoFocus
          />

          {historySearchQuery.trim() !== "" &&
            historySearchResults.length === 0 && (
              <p className="detail-empty">
                ไม่พบรถที่ตรงกับ "{historySearchQuery}"
              </p>
            )}

          <div className="history-search-results">
            {historySearchResults.map((v) => (
              <button
                key={v.id}
                className="history-search-result"
                onClick={() => setHistorySearchVehicle(v)}
              >
                <div>
                  <div className="vehicle-card__plate">{v.license_plate}</div>
                  <div className="vehicle-card__meta">
                    {v.model} · {v.customer_name} ·{" "}
                    <span className="part-number">{v.vin}</span>
                  </div>
                </div>
                <span className="history-search-result__count">
                  {v.repair_orders.length} ครั้ง →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {view === "history" && detail !== null && (
        <HistoryPage
          vehicle={detail}
          statusOptions={statusOptions}
          onBack={() => setView("dashboard")}
        />
      )}

      {view === "dashboard" && (
        <div className="layout">
          <div className="sidebar">
            <input
              className="sidebar-search"
              placeholder="ค้นหา ทะเบียน / ชื่อลูกค้า / VIN"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="sidebar-tabs">
              <button
                className={`sidebar-tab ${listTab === "pending" ? "active" : ""}`}
                onClick={() => setListTab("pending")}
              >
                งานที่ยังค้าง
              </button>
              <button
                className={`sidebar-tab ${listTab === "done" ? "active" : ""}`}
                onClick={() => setListTab("done")}
              >
                เสร็จสิ้นแล้ว
              </button>
            </div>

            <select
              className="sidebar-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">ทุกสถานะ</option>
              {optionsFor("vehicle_summary").map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>

            <div className="vehicle-list">
              {filteredVehicles.length === 0 && (
                <p className="sidebar-empty">ไม่พบรถที่ตรงกับเงื่อนไข</p>
              )}

              {!showGrouped &&
                filteredVehicles.map((v) => (
                  <VehicleCard
                    key={v.id}
                    vehicle={v}
                    selectedId={selectedId}
                    optionMeta={optionMeta}
                    onSelect={(nextId) => {
                      setSelectedId(nextId);
                      if (nextId === null) setDetail(null);
                      setExpandedHistoryId(null);
                    }}
                  />
                ))}

              {showGrouped &&
                monthGroups.map(([key, vehiclesInMonth]) => {
                  const isOpen = expandedMonths.has(key);
                  return (
                    <div className="month-group" key={key}>
                      <button
                        className="month-group__header"
                        onClick={() => toggleMonth(key)}
                      >
                        <span>{monthLabel(key)}</span>
                        <span className="month-group__count">
                          {vehiclesInMonth.length} คัน {isOpen ? "▲" : "▼"}
                        </span>
                      </button>
                      {isOpen &&
                        vehiclesInMonth.map((v) => (
                          <VehicleCard
                            key={v.id}
                            vehicle={v}
                            selectedId={selectedId}
                            optionMeta={optionMeta}
                            onSelect={(nextId) => {
                              setSelectedId(nextId);
                              if (nextId === null) setDetail(null);
                              setExpandedHistoryId(null);
                            }}
                          />
                        ))}
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="detail-panel">
            {detail === null && (
              <p className="detail-empty">เลือกรถจากรายการทางซ้ายก่อน</p>
            )}

            {detail !== null && (
              <>
                <div className="info-grid">
                  <div className="info-box">
                    <h3>ข้อมูลรถ</h3>
                    <div className="info-row">
                      <span>ทะเบียน</span>
                      <span>{detail.license_plate}</span>
                    </div>
                    <div className="info-row">
                      <span>รุ่น</span>
                      <span>{detail.model}</span>
                    </div>
                    <div className="info-row">
                      <span>VIN</span>
                      <span className="part-number">{detail.vin}</span>
                    </div>
                  </div>
                  <div className="info-box">
                    <h3>ข้อมูลลูกค้า</h3>
                    <div className="info-row">
                      <span>ชื่อ</span>
                      <span>{detail.customer_name}</span>
                    </div>
                    <div className="info-row">
                      <span>เบอร์โทร</span>
                      <span>{detail.phone ?? "-"}</span>
                    </div>
                  </div>
                </div>

                <div className="history-stats">
                  <div className="stat-box">
                    <div className="stat-box__value">{totalVisits}</div>
                    <div className="stat-box__label">เข้าซ่อมทั้งหมด</div>
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
                    <div className="stat-box__value">
                      {lastVisitDate ?? "-"}
                    </div>
                    <div className="stat-box__label">เข้าล่าสุด</div>
                  </div>
                </div>

                <div className="action-row">
                  <button
                    className="btn-view-history"
                    onClick={() => setView("history")}
                  >
                    ดูประวัติทั้งหมดแบบเต็ม →
                  </button>

                  {canManage && !addingOrder && (
                    <button
                      className="btn-add-order"
                      onClick={() => setAddingOrder(true)}
                    >
                      + เพิ่มงานซ่อม
                    </button>
                  )}
                </div>

                {addingOrder && (
                  <NewOrderForm
                    token={token}
                    vehicleId={selectedId}
                    onCreated={() => {
                      setAddingOrder(false);
                      refreshDetail();
                    }}
                    onCancel={() => setAddingOrder(false)}
                  />
                )}

                {openOrders.length === 0 && historyOrders.length === 0 && (
                  <p className="detail-empty">
                    ยังไม่มีใบสั่งซ่อมสำหรับรถคันนี้
                  </p>
                )}

                {openOrders.length > 0 && (
                  <>
                    <h3 className="section-heading">งานที่กำลังดำเนินการ</h3>
                    {openOrders.map(renderOrderCard)}
                  </>
                )}

                {historyOrders.length > 0 && (
                  <>
                    <h3 className="section-heading">
                      ประวัติการเข้าซ่อม ({historyOrders.length})
                    </h3>
                    {historyOrders.map((order) => {
                      const isExpanded = expandedHistoryId === order.id;
                      return (
                        <div className="history-entry" key={order.id}>
                          <div
                            className="history-row"
                            onClick={() =>
                              setExpandedHistoryId(isExpanded ? null : order.id)
                            }
                          >
                            <span className="history-row__date">
                              {order.open_date}
                            </span>
                            <span>
                              {order.job_type === "warranty"
                                ? "Warranty"
                                : "Customer pay"}
                            </span>
                            <span>{order.items.length} รายการ</span>
                            {order.mileage != null && (
                              <span>{order.mileage.toLocaleString()} กม.</span>
                            )}
                            <Badge color={ORDER_STATUS_COLOR[order.status]}>
                              {ORDER_STATUS_LABEL[order.status]}
                            </Badge>
                            <span className="history-row__chevron">
                              {isExpanded ? "▲" : "▼"}
                            </span>
                          </div>
                          {isExpanded && renderOrderCard(order)}
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {lightboxSrc !== null && (
        <div className="lightbox" onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="" />
          <button
            className="lightbox__close"
            onClick={() => setLightboxSrc(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
function VehicleCard({ vehicle, selectedId, optionMeta, onSelect }) {
  const statusKey = getVehicleStatusKey(vehicle);
  const statusMeta = optionMeta("vehicle_summary", statusKey);
  return (
    <button
      className={`vehicle-card ${selectedId === vehicle.id ? "selected" : ""}`}
      style={{
        borderLeftColor: `var(--status-${statusMeta.color}-text, var(--color-border))`,
      }}
      onClick={() => onSelect(selectedId === vehicle.id ? null : vehicle.id)}
    >
      <div>
        <div className="vehicle-card__plate">{vehicle.license_plate}</div>
        <div className="vehicle-card__meta">
          {vehicle.model} · {vehicle.customer_name}
        </div>
      </div>
      <Badge color={statusMeta.color}>{statusMeta.label}</Badge>
    </button>
  );
}

function PhotoSlot({ label, src, canUpload, onSelect, onView }) {
  return (
    <div className="photo-slot">
      {src ? (
        <img
          src={src}
          alt={label}
          onClick={() => onView(src)}
          className="photo-slot__img"
        />
      ) : (
        <div className="photo-slot__placeholder">ยังไม่มีรูป</div>
      )}
      {canUpload && (
        <label className="photo-slot__label">
          {src ? "เปลี่ยนรูป" : `+ ${label}`}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) onSelect(file);
              e.target.value = "";
            }}
          />
        </label>
      )}
      {!canUpload && <div className="photo-slot__caption">{label}</div>}
    </div>
  );
}

export default App;
