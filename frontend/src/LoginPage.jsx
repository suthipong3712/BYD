import { useState } from 'react'
import { API_URL } from './api'

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.detail || 'เข้าสู่ระบบไม่สำเร็จ')
        }
        return res.json()
      })
      .then((data) => onLogin(data))
      .catch((err) => setError(err.message))
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>BYD Garage</h1>
        <p className="login-subtitle">เข้าสู่ระบบเพื่อใช้งาน Dashboard</p>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="login-error">{error}</p>}
        <button type="submit" className="login-submit">เข้าสู่ระบบ</button>
      </form>
    </div>
  )
}

export default LoginPage