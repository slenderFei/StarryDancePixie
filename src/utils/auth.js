const USERS_KEY = 'starryDancePixie.users.v1'
const SESSION_KEY = 'starryDancePixie.session.v1'
const LOGIN_EVENTS_KEY = 'starryDancePixie.loginEvents.v1'

export const USER_PERMISSIONS = [
  { id: 'dashboard.view', label: '查看系统看板' },
  { id: 'users.view', label: '查看用户管理' },
  { id: 'users.manage', label: '管理用户与权限' },
  { id: 'loginEvents.view', label: '查看登录情况' },
  { id: 'records.view', label: '查看游戏记录' },
  { id: 'records.manage', label: '清空游戏记录' },
]

const ALL_PERMISSION_IDS = USER_PERMISSIONS.map((permission) => permission.id)

const DEFAULT_USERS = [
  {
    id: 'root',
    username: 'root',
    password: 'root',
    role: 'admin',
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
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // The UI will still receive the authentication result when storage is unavailable.
  }
}

function normalizeUsers(value) {
  if (!Array.isArray(value)) return [...DEFAULT_USERS]

  const merged = value.filter(
    (user) =>
      user &&
      user.username &&
      !(user.id === 'admin' && user.username === 'admin' && user.password === 'admin'),
  )
  const normalized = merged.map((user) => ({
    ...user,
    permissions:
      user.role === 'admin'
        ? [...ALL_PERMISSION_IDS]
        : Array.isArray(user.permissions)
          ? user.permissions.filter((permission) => ALL_PERMISSION_IDS.includes(permission))
          : [],
  }))

  DEFAULT_USERS.forEach((defaultUser) => {
    if (!merged.some((user) => user.username === defaultUser.username)) {
      normalized.unshift({ ...defaultUser, permissions: [...ALL_PERMISSION_IDS] })
    }
  })

  return normalized
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function readLoginEvents() {
  const events = safeRead(LOGIN_EVENTS_KEY, [])
  return Array.isArray(events) ? events : []
}

function writeLoginEvents(events) {
  safeWrite(LOGIN_EVENTS_KEY, events.slice(0, 500))
}

function appendLoginEvent(event) {
  writeLoginEvents([event, ...readLoginEvents()])
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
  const cleanUsername = String(username || '').trim()
  const cleanPassword = String(password || '').trim()

  if (!cleanUsername || !cleanPassword) {
    return { ok: false, message: '请输入用户名和密码' }
  }
  if (cleanUsername.length < 2 || cleanUsername.length > 24 || /\s/.test(cleanUsername)) {
    return { ok: false, message: '用户名需为 2-24 个字符，不能包含空格' }
  }
  if (cleanPassword.length < 4 || cleanPassword.length > 64) {
    return { ok: false, message: '密码需为 4-64 个字符' }
  }

  const users = getUsers()
  if (users.some((user) => user.username.toLowerCase() === cleanUsername.toLowerCase())) {
    return { ok: false, message: '用户名已存在' }
  }

  const user = {
    id: createId('user'),
    username: cleanUsername,
    password: cleanPassword,
    role: role === 'admin' ? 'admin' : 'user',
    permissions: role === 'admin' ? [...ALL_PERMISSION_IDS] : [],
    createdAt: new Date().toISOString(),
  }

  saveUsers([...users, user])
  return { ok: true, user }
}

export function removeUser(username) {
  if (username === 'root') {
    return { ok: false, message: 'root 账号不能删除' }
  }

  const users = getUsers()
  if (!users.some((user) => user.username === username)) {
    return { ok: false, message: '用户不存在' }
  }
  saveUsers(users.filter((user) => user.username !== username))
  return { ok: true }
}

export function updateUserPermissions(username, permissions) {
  if (username === 'root') {
    return { ok: false, message: 'root 账号始终拥有全部权限' }
  }

  const users = getUsers()
  const user = users.find((item) => item.username === username)
  if (!user) return { ok: false, message: '用户不存在' }

  const nextPermissions = Array.isArray(permissions)
    ? permissions.filter((permission) => ALL_PERMISSION_IDS.includes(permission))
    : []
  saveUsers(
    users.map((item) =>
      item.username === username
        ? { ...item, permissions: item.role === 'admin' ? [...ALL_PERMISSION_IDS] : nextPermissions }
        : item,
    ),
  )
  return { ok: true }
}

export function getUserPermissions(userOrSession) {
  if (userOrSession?.username === 'root' && userOrSession?.role === 'admin') {
    return [...ALL_PERMISSION_IDS]
  }
  if (userOrSession?.role === 'admin') return [...ALL_PERMISSION_IDS]
  return Array.isArray(userOrSession?.permissions)
    ? userOrSession.permissions.filter((permission) => ALL_PERMISSION_IDS.includes(permission))
    : []
}

export function hasPermission(session, permission) {
  return getUserPermissions(session).includes(permission)
}

export function canAccessAdmin(session) {
  return isRootSession(session) || hasPermission(session, 'dashboard.view')
}

function createSession(user, provider = 'password') {
  const previousSession = getSession()
  if (previousSession?.sessionId) {
    const replacedAt = new Date().toISOString()
    writeLoginEvents(
      readLoginEvents().map((event) =>
        event.sessionId === previousSession.sessionId && event.status === 'active'
          ? { ...event, logoutAt: replacedAt, status: 'replaced' }
          : event,
      ),
    )
  }

  const session = {
    sessionId: createId('session'),
    username: user.username,
    role: user.role,
    permissions: getUserPermissions(user),
    provider,
    loginAt: new Date().toISOString(),
  }

  safeWrite(SESSION_KEY, session)
  appendLoginEvent({
    id: session.sessionId,
    sessionId: session.sessionId,
    username: session.username,
    role: session.role,
    provider,
    loginAt: session.loginAt,
    logoutAt: '',
    status: 'active',
  })
  return session
}

export function login(username, password) {
  const cleanUsername = String(username || '').trim()
  const cleanPassword = String(password || '').trim()
  const user = getUsers().find(
    (item) => item.username === cleanUsername && item.password === cleanPassword,
  )

  if (!user) return { ok: false, message: '用户名或密码错误，请先注册' }

  return { ok: true, session: createSession(user) }
}

export function loginWithExternalUser({ username, role = 'user', provider = 'wechat' }) {
  const cleanUsername = String(username || '').trim()
  if (!cleanUsername) return { ok: false, message: '微信账号未返回可用的用户标识' }

  const users = getUsers()
  let user = users.find((item) => item.username === cleanUsername)
  if (!user) {
    user = {
      id: createId('wechat-user'),
      username: cleanUsername,
      password: createId('external'),
      role: role === 'admin' ? 'admin' : 'user',
      provider,
      createdAt: new Date().toISOString(),
    }
    saveUsers([...users, user])
  }

  return { ok: true, session: createSession(user, provider) }
}

export function logout() {
  const session = getSession()
  if (session?.sessionId) {
    const events = readLoginEvents()
    const logoutAt = new Date().toISOString()
    writeLoginEvents(
      events.map((event) =>
        event.sessionId === session.sessionId && event.status === 'active'
          ? { ...event, logoutAt, status: 'logged_out' }
          : event,
      ),
    )
  }
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignore storage failures during logout.
  }
}

export function getSession() {
  return safeRead(SESSION_KEY, null)
}

export function getLoginEvents() {
  return readLoginEvents()
}

export function getActiveLoginEvents() {
  return readLoginEvents().filter((event) => event.status === 'active')
}

export function isRootSession(session) {
  return session?.username === 'root' && session?.role === 'admin'
}

export function getWechatConfig() {
  const appId = String(import.meta.env.VITE_WECHAT_APP_ID || '').trim()
  const redirectUri = String(
    import.meta.env.VITE_WECHAT_REDIRECT_URI || window.location.origin + window.location.pathname,
  ).trim()
  const apiBase = String(import.meta.env.VITE_AUTH_API_BASE || '').replace(/\/$/, '')
  const exchangePath = String(
    import.meta.env.VITE_WECHAT_EXCHANGE_PATH || '/api/auth/wechat/exchange',
  )

  return {
    appId,
    redirectUri,
    exchangeUrl: `${apiBase}${exchangePath.startsWith('/') ? exchangePath : `/${exchangePath}`}`,
    configured: Boolean(appId && redirectUri),
  }
}

export async function exchangeWechatCode(code, state) {
  const config = getWechatConfig()
  if (!config.configured) {
    return { ok: false, message: '微信登录尚未配置 AppID，请联系管理员' }
  }

  try {
    const response = await fetch(config.exchangeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code, state, redirectUri: config.redirectUri }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || payload.ok === false) {
      return { ok: false, message: payload.message || '微信登录校验失败，请稍后重试' }
    }

    const externalUser = payload.user || payload.session
    const result = loginWithExternalUser({
      username: externalUser?.username || externalUser?.nickname || externalUser?.openid,
      role: externalUser?.role,
      provider: 'wechat',
    })
    return result.ok ? result : { ok: false, message: result.message }
  } catch {
    return { ok: false, message: '无法连接微信登录服务，请检查服务端配置' }
  }
}
