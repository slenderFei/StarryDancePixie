import http from 'node:http'
import fs from 'node:fs'
import { onRequestGet, onRequestPost, onRequestOptions } from '../cloud-functions/api/auth/wechat/exchange.js'

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return
  for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (!match || match[1] in process.env) continue
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
  }
}

loadEnvFile('.env.auth')
const port = Number(process.env.AUTH_PORT || 8787)
const bodyLimit = 16 * 1024

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.setEncoding('utf8')
    request.on('data', (chunk) => {
      body += chunk
      if (body.length > bodyLimit) reject(new Error('body_too_large'))
    })
    request.on('end', () => resolve(body))
    request.on('error', reject)
  })
}

const server = http.createServer(async (request, response) => {
  if (!request.url.startsWith('/api/auth/wechat/exchange') || !['GET', 'POST', 'OPTIONS'].includes(request.method)) {
    response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify({ ok: false, message: 'Not found' }))
    return
  }

  if (request.method === 'OPTIONS') {
    const result = onRequestOptions({ request: new Request(`http://${request.headers.host}${request.url}`, { method: 'OPTIONS', headers: request.headers }), env: process.env })
    result.headers.forEach((value, key) => response.setHeader(key, value))
    response.writeHead(result.status)
    response.end()
    return
  }

  if (request.method === 'GET') {
    const result = onRequestGet({
      request: new Request(`http://${request.headers.host}${request.url}`, { method: 'GET', headers: request.headers }),
      env: process.env,
    })
    const payload = await result.text()
    result.headers.forEach((value, key) => response.setHeader(key, value))
    response.writeHead(result.status)
    response.end(payload)
    return
  }

  try {
    const rawBody = await readBody(request)
    const webRequest = new Request(`http://${request.headers.host}${request.url}`, {
      method: 'POST',
      headers: request.headers,
      body: rawBody,
    })
    const result = await onRequestPost({ request: webRequest, env: process.env })
    const payload = await result.text()
    result.headers.forEach((value, key) => response.setHeader(key, value))
    response.writeHead(result.status)
    response.end(payload)
  } catch (error) {
    response.writeHead(error.message === 'body_too_large' ? 413 : 400, {
      'Content-Type': 'application/json; charset=utf-8',
    })
    response.end(JSON.stringify({ ok: false, message: '请求参数格式错误' }))
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`WeChat auth API listening on http://127.0.0.1:${port}`)
})
