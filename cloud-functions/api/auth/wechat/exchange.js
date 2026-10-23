import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const WECHAT_TOKEN_URL = 'https://api.weixin.qq.com/sns/oauth2/access_token'
const WECHAT_USERINFO_URL = 'https://api.weixin.qq.com/sns/userinfo'
const STATE_MAX_AGE_MS = 10 * 60 * 1000

function envValue(env, key) {
  if (env && typeof env[key] === 'string') return env[key].trim()
  if (typeof process !== 'undefined' && typeof process.env?.[key] === 'string') {
    return process.env[key].trim()
  }
  return ''
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  })
}

function getConfig(env) {
  const allowedOrigins = envValue(env, 'WECHAT_ALLOWED_ORIGINS')
    .split(',')
    .map((item) => item.trim().replace(/\/$/, ''))
    .filter(Boolean)
  const redirectUris = envValue(env, 'WECHAT_ALLOWED_REDIRECT_URIS')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return {
    appId: envValue(env, 'WECHAT_APP_ID'),
    appSecret: envValue(env, 'WECHAT_APP_SECRET'),
    stateSecret: envValue(env, 'WECHAT_STATE_SECRET') || envValue(env, 'WECHAT_APP_SECRET'),
    allowedOrigins,
    redirectUris,
  }
}

function createStateSignature(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

export function createWechatState(config, now = Date.now()) {
  const timestamp = String(now)
  const nonce = randomBytes(18).toString('base64url')
  const payload = `${timestamp}.${nonce}`
  return `${payload}.${createStateSignature(payload, config.stateSecret || config.appSecret)}`
}

function isValidState(state, secret, now = Date.now()) {
  if (typeof state !== 'string' || !secret) return false
  const [timestamp, nonce, signature] = state.split('.')
  const createdAt = Number(timestamp)
  if (!timestamp || !nonce || !signature || !Number.isSafeInteger(createdAt)) return false
  if (createdAt > now + 30_000 || now - createdAt > STATE_MAX_AGE_MS) return false

  const expected = createStateSignature(`${timestamp}.${nonce}`, secret)
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(signature)
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
}

function corsHeaders(request, config) {
  const origin = request.headers.get('origin') || ''
  if (!origin || !config.allowedOrigins.includes(origin.replace(/\/$/, ''))) return {}
  return {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin',
  }
}

function validRedirectUri(redirectUri, config) {
  return Boolean(redirectUri && config.redirectUris.includes(redirectUri))
}

async function readJson(response) {
  const payload = await response.json().catch(() => null)
  return payload && typeof payload === 'object' ? payload : null
}

function wechatError(payload, fallback) {
  return payload?.errmsg ? `${fallback}（${payload.errmsg}）` : fallback
}

export function validateExchangeInput(body, config) {
  if (!config.appId || !config.appSecret || !config.redirectUris.length) {
    return '微信服务端尚未完成配置'
  }
  if (!body || typeof body !== 'object') return '请求参数格式错误'
  if (typeof body.code !== 'string' || body.code.length < 8 || body.code.length > 512) {
    return '微信授权 code 无效'
  }
  if (!isValidState(body.state, config.stateSecret)) return '微信登录 state 无效或已过期'
  if (!validRedirectUri(body.redirectUri, config)) return '微信回调地址未获服务端授权'
  return ''
}

export function onRequestGet({ request, env }) {
  const config = getConfig(env)
  const headers = corsHeaders(request, config)
  if (!config.appId || !config.appSecret || !config.stateSecret || !config.redirectUris.length) {
    return json({ ok: false, message: '微信服务端尚未完成配置' }, 400, headers)
  }

  const redirectUri = new URL(request.url).searchParams.get('redirectUri') || ''
  if (!validRedirectUri(redirectUri, config)) {
    return json({ ok: false, message: '微信回调地址未获服务端授权' }, 400, headers)
  }

  return json({ ok: true, state: createWechatState(config) }, 200, headers)
}

export async function onRequestPost({ request, env }) {
  const config = getConfig(env)
  const headers = corsHeaders(request, config)

  let body
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, message: '请求参数格式错误' }, 400, headers)
  }

  const validationError = validateExchangeInput(body, config)
  if (validationError) return json({ ok: false, message: validationError }, 400, headers)

  const tokenUrl = new URL(WECHAT_TOKEN_URL)
  tokenUrl.search = new URLSearchParams({
    appid: config.appId,
    secret: config.appSecret,
    code: body.code,
    grant_type: 'authorization_code',
  }).toString()

  let tokenPayload
  try {
    const response = await fetch(tokenUrl)
    tokenPayload = await readJson(response)
  } catch {
    return json({ ok: false, message: '无法连接微信授权服务' }, 502, headers)
  }

  if (!tokenPayload?.openid || !tokenPayload.access_token) {
    return json(
      { ok: false, message: wechatError(tokenPayload, '微信授权 code 校验失败') },
      401,
      headers,
    )
  }

  let profile = {}
  try {
    const profileUrl = new URL(WECHAT_USERINFO_URL)
    profileUrl.search = new URLSearchParams({
      access_token: tokenPayload.access_token,
      openid: tokenPayload.openid,
      lang: 'zh_CN',
    }).toString()
    const response = await fetch(profileUrl)
    const profilePayload = await readJson(response)
    if (profilePayload && !profilePayload.errcode) profile = profilePayload
  } catch {
    // The openid from the token response is sufficient for account linkage.
  }

  const externalId = String(profile.unionid || tokenPayload.unionid || tokenPayload.openid)
  return json(
    {
      ok: true,
      user: {
        username: `wechat_${externalId}`,
        nickname: typeof profile.nickname === 'string' ? profile.nickname.slice(0, 64) : '',
        openid: tokenPayload.openid,
        unionid: profile.unionid || tokenPayload.unionid || '',
        role: 'user',
      },
    },
    200,
    headers,
  )
}

export function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, getConfig(env)) })
}
