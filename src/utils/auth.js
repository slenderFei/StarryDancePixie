const USERS_KEY = 'starryDancePixie.users.v1'
const SESSION_KEY = 'starryDancePixie.session.v1'

const DEFAULT_USERS = [
  {
    id: 'root',
    username: 'root',
    password: 'root',
    role: 'admin',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'admin',
    username: 'admin',
    password: 'admin',
    role: 'user',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function safeWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function normalizeUsers(value) {
  if (!Array.isArray(value)) return DEFAULT_USERS

  const merged = [...value]
  DEFAULT_USERS.forEach((defaultUser) => {
    if (!merged.some((user) => user.username === defaultUser.username)) {
      merged.unshift(defaultUser)
    }
  })

  return merged
}

export function getUsers() {
  const users = normalizeUsers(safeRead(USERS_KEY, DEFAULT_USERS))
  safeWrite(USERS_KEY, users)
  return users
}

export function saveUsers(users) {
  safeWrite(USERS_KEY, normalizeUsers(users))
}

export function addUser({ username, password, role = 'user' }) {
  const cleanUsername = username.trim()
  const cleanPassword = password.trim()
  if (!cleanUsername || !cleanPassword) {
    return { ok: false, message: '请输入用户名和密码' }
  }

  const users = getUsers()
  if (users.some((user) => user.username === cleanUsername)) {
    return { ok: false, message: '用户名已存在' }
  }

  const user = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    username: cleanUsername,
    password: cleanPassword,
    role: role === 'admin' ? 'admin' : 'user',
    createdAt: new Date().toISOString(),
  }

  saveUsers([...users, user])
  return { ok: true, user }
}

export function removeUser(username) {
  if (username === 'root' || username === 'admin') {
    return { ok: false, message: '默认账号不能删除' }
  }

  const users = getUsers()
  saveUsers(users.filter((user) => user.username !== username))
  return { ok: true }
}

export function login(username, password) {
  const user = getUsers().find(
    (item) => item.username === username.trim() && item.password === password.trim(),
  )

  if (!user) return { ok: false, message: '用户名或密码错误' }

  const session = {
    username: user.username,
    role: user.role,
    loginAt: new Date().toISOString(),
  }
  safeWrite(SESSION_KEY, session)
  return { ok: true, session }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

export function getSession() {
  return safeRead(SESSION_KEY, null)
}

export function isRootSession(session) {
  return session?.username === 'root' && session?.role === 'admin'
}
