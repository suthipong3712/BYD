import { useEffect, useState } from 'react'
import { authFetch } from './api'

const COLOR_OPTIONS = ['green', 'amber', 'red', 'muted']
const CATEGORY_LABEL = {
  job_status: 'สถานะงานช่าง',
  parts_status: 'สถานะอะไหล่',
}
const ROLE_OPTIONS = ['admin', 'sa', 'parts', 'technician']

function AdminPanel({ token }) {
  const [options, setOptions] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [users, setUsers] = useState([])
  const [vehicleModels, setVehicleModels] = useState([])
  const [newOption, setNewOption] = useState({
    category: 'job_status', key: '', label: '', color: 'muted', sort_order: 0,
  })
  const [newTechName, setNewTechName] = useState('')
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'technician' })
  const [newModelName, setNewModelName] = useState('')

  function loadOptions() {
    authFetch('/status-options', token)
      .then((res) => res.json())
      .then((data) => setOptions(data))
  }

  function loadTechnicians() {
    authFetch('/technicians', token)
      .then((res) => res.json())
      .then((data) => setTechnicians(data))
  }

  function loadUsers() {
    authFetch('/users', token)
      .then((res) => res.json())
      .then((data) => setUsers(data))
  }

  function loadVehicleModels() {
    authFetch('/vehicle-models', token)
      .then((res) => res.json())
      .then((data) => setVehicleModels(data))
  }

  useEffect(() => {
    loadOptions()
    loadTechnicians()
    loadUsers()
    loadVehicleModels()
  }, [])

  // --- ตัวเลือกสถานะ ---
  function updateLocalOption(id, field, value) {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)))
  }

  function saveOption(option) {
    authFetch(`/status-options/${option.id}`, token, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: option.label,
        color: option.color,
        sort_order: Number(option.sort_order),
      }),
    }).then(loadOptions)
  }

  function addOption(e) {
    e.preventDefault()
    authFetch('/status-options', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newOption, sort_order: Number(newOption.sort_order) }),
    }).then(() => {
      setNewOption({ category: 'job_status', key: '', label: '', color: 'muted', sort_order: 0 })
      loadOptions()
    })
  }

  // --- ช่าง ---
  function updateLocalTech(id, field, value) {
    setTechnicians((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)))
  }

  function saveTechnician(tech) {
    authFetch(`/technicians/${tech.id}`, token, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tech.name, active: tech.active }),
    }).then(loadTechnicians)
  }

  function addTechnician(e) {
    e.preventDefault()
    if (newTechName.trim() === '') return
    authFetch('/technicians', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTechName }),
    }).then(() => {
      setNewTechName('')
      loadTechnicians()
    })
  }

  // --- ผู้ใช้งาน ---
  function updateLocalUser(id, field, value) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, [field]: value } : u)))
  }

  function saveUser(user, newPassword) {
    const body = { role: user.role, active: user.active }
    if (newPassword && newPassword.trim() !== '') {
      body.password = newPassword
    }
    authFetch(`/users/${user.id}`, token, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(loadUsers)
  }

  function addUser(e) {
    e.preventDefault()
    authFetch('/users', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.detail || 'สร้างผู้ใช้ไม่สำเร็จ')
        }
        setNewUser({ username: '', password: '', role: 'technician' })
        loadUsers()
      })
      .catch((err) => alert(err.message))
  }

  // --- รุ่นรถ ---
  function updateLocalModel(id, field, value) {
    setVehicleModels((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)))
  }

  function saveModel(model) {
    authFetch(`/vehicle-models/${model.id}`, token, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model.name, active: model.active }),
    }).then(loadVehicleModels)
  }

  function addModel(e) {
    e.preventDefault()
    if (newModelName.trim() === '') return
    authFetch('/vehicle-models', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newModelName }),
    }).then(() => {
      setNewModelName('')
      loadVehicleModels()
    })
  }

  return (
    <div className="admin-panel">
      <div className="admin-section">
        <h2>ผู้ใช้งานระบบ</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>สิทธิ์ (Role)</th>
              <th>สถานะ</th>
              <th>รีเซ็ตรหัสผ่าน</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow key={u.id} user={u} onChange={updateLocalUser} onSave={saveUser} />
            ))}
          </tbody>
        </table>

        <form className="admin-form" onSubmit={addUser}>
          <input
            placeholder="username"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            required
          />
          <select
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button type="submit">+ เพิ่มผู้ใช้</button>
        </form>
      </div>

      <div className="admin-section">
        <h2>รุ่นรถ</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ชื่อรุ่น</th>
              <th>สถานะ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {vehicleModels.map((m) => (
              <tr key={m.id}>
                <td>
                  <input
                    value={m.name}
                    onChange={(e) => updateLocalModel(m.id, 'name', e.target.value)}
                  />
                </td>
                <td>
                  <select
                    value={m.active ? 'active' : 'inactive'}
                    onChange={(e) => updateLocalModel(m.id, 'active', e.target.value === 'active')}
                  >
                    <option value="active">ใช้งานอยู่</option>
                    <option value="inactive">เลิกใช้งาน</option>
                  </select>
                </td>
                <td>
                  <button onClick={() => saveModel(m)}>บันทึก</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <form className="admin-form" onSubmit={addModel}>
          <input
            placeholder="ชื่อรุ่นใหม่ (เช่น Han)"
            value={newModelName}
            onChange={(e) => setNewModelName(e.target.value)}
          />
          <button type="submit">+ เพิ่มรุ่น</button>
        </form>
      </div>

      <div className="admin-section">
        <h2>รายชื่อช่าง</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ชื่อ</th>
              <th>สถานะ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {technicians.map((t) => (
              <tr key={t.id}>
                <td>
                  <input
                    value={t.name}
                    onChange={(e) => updateLocalTech(t.id, 'name', e.target.value)}
                  />
                </td>
                <td>
                  <select
                    value={t.active ? 'active' : 'inactive'}
                    onChange={(e) => updateLocalTech(t.id, 'active', e.target.value === 'active')}
                  >
                    <option value="active">ใช้งานอยู่</option>
                    <option value="inactive">เลิกใช้งาน</option>
                  </select>
                </td>
                <td>
                  <button onClick={() => saveTechnician(t)}>บันทึก</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <form className="admin-form" onSubmit={addTechnician}>
          <input
            placeholder="ชื่อช่างใหม่"
            value={newTechName}
            onChange={(e) => setNewTechName(e.target.value)}
          />
          <button type="submit">+ เพิ่มช่าง</button>
        </form>
      </div>

      {['job_status', 'parts_status'].map((category) => (
        <div key={category} className="admin-section">
          <h2>{CATEGORY_LABEL[category]}</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>ข้อความที่แสดง</th>
                <th>สี</th>
                <th>ลำดับ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {options
                .filter((o) => o.category === category)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((o) => (
                  <tr key={o.id}>
                    <td className="part-number">{o.key}</td>
                    <td>
                      <input
                        value={o.label}
                        onChange={(e) => updateLocalOption(o.id, 'label', e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        value={o.color}
                        onChange={(e) => updateLocalOption(o.id, 'color', e.target.value)}
                      >
                        {COLOR_OPTIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        style={{ width: '4rem' }}
                        value={o.sort_order}
                        onChange={(e) => updateLocalOption(o.id, 'sort_order', e.target.value)}
                      />
                    </td>
                    <td>
                      <button onClick={() => saveOption(o)}>บันทึก</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="admin-section">
        <h2>เพิ่มตัวเลือกสถานะใหม่</h2>
        <form className="admin-form" onSubmit={addOption}>
          <select
            value={newOption.category}
            onChange={(e) => setNewOption({ ...newOption, category: e.target.value })}
          >
            <option value="job_status">สถานะงานช่าง</option>
            <option value="parts_status">สถานะอะไหล่</option>
          </select>
          <input
            placeholder="key (เช่น waiting_customer)"
            value={newOption.key}
            onChange={(e) => setNewOption({ ...newOption, key: e.target.value })}
            required
          />
          <input
            placeholder="ข้อความที่แสดง"
            value={newOption.label}
            onChange={(e) => setNewOption({ ...newOption, label: e.target.value })}
            required
          />
          <select
            value={newOption.color}
            onChange={(e) => setNewOption({ ...newOption, color: e.target.value })}
          >
            {COLOR_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="number"
            style={{ width: '4rem' }}
            value={newOption.sort_order}
            onChange={(e) => setNewOption({ ...newOption, sort_order: e.target.value })}
          />
          <button type="submit">เพิ่ม</button>
        </form>
      </div>
    </div>
  )
}

function UserRow({ user, onChange, onSave }) {
  const [newPassword, setNewPassword] = useState('')

  return (
    <tr>
      <td>{user.username}</td>
      <td>
        <select value={user.role} onChange={(e) => onChange(user.id, 'role', e.target.value)}>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </td>
      <td>
        <select
          value={user.active ? 'active' : 'inactive'}
          onChange={(e) => onChange(user.id, 'active', e.target.value === 'active')}
        >
          <option value="active">ใช้งานอยู่</option>
          <option value="inactive">ปิดใช้งาน</option>
        </select>
      </td>
      <td>
        <input
          type="password"
          placeholder="เว้นว่างถ้าไม่เปลี่ยน"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </td>
      <td>
        <button
          onClick={() => {
            onSave(user, newPassword)
            setNewPassword('')
          }}
        >
          บันทึก
        </button>
      </td>
    </tr>
  )
}

export default AdminPanel