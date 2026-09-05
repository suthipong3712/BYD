export const API_URL = ''

export function authFetch(path, token, options = {}) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}