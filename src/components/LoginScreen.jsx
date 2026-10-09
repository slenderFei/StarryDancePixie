import React, { useEffect, useRef, useState } from 'react'
import {
  addUser,
  exchangeWechatCode,
  getWechatConfig,
  login,
} from '../utils/auth'
import './LoginScreen.css'

const WECHAT_SDK_URL = 'https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js'
const WECHAT_STATE_KEY = 'starryDancePixie.wechatState.v1'

function createWechatState() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function loadWechatSdk() {
  const existing = document.querySelector('script[data-wechat-login-sdk]')
  if (existing) {
    return existing.dataset.loaded === 'true'
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
          existing.addEventListener('load', resolve, { once: true })
          existing.addEventListener('error', reject, { once: true })
        })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = WECHAT_SDK_URL
    script.async = true
    script.dataset.wechatLoginSdk = 'true'
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true'
        resolve()
      },
      { once: true },
    )
    script.addEventListener('error', reject, { once: true })
    document.head.appendChild(script)
  })
}

function LoginScreen({ onLogin }) {
  const [loginMode, setLoginMode] = useState('password')
  const [authMode, setAuthMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [wechatLoading, setWechatLoading] = useState(false)
  const [wechatReady, setWechatReady] = useState(false)
  const qrRef = useRef(null)
  const wechatConfig = getWechatConfig()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    if (!code) return undefined

    window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.hash}`)
    const expectedState = sessionStorage.getItem(WECHAT_STATE_KEY)
    sessionStorage.removeItem(WECHAT_STATE_KEY)
    if (!state || !expectedState || state !== expectedState) {
      setLoginMode('wechat')
      setMessage('微信登录状态已过期，请重新扫码')
      return undefined
    }

    let active = true
    setLoginMode('wechat')
    setWechatLoading(true)
    exchangeWechatCode(code, state).then((result) => {
      if (!active) return
      setWechatLoading(false)
      if (!result.ok) {
        setMessage(result.message)
        return
      }
      onLogin(result.session)
    })

    return () => {
      active = false
    }
  }, [onLogin])

  useEffect(() => {
    if (loginMode !== 'wechat' || !wechatConfig.appId || !qrRef.current) return undefined

    let active = true
    const state = createWechatState()
    sessionStorage.setItem(WECHAT_STATE_KEY, state)
    setWechatLoading(true)
    setWechatReady(false)

    loadWechatSdk()
      .then(() => {
        if (!active || !qrRef.current || typeof window.WxLogin !== 'function') return
        qrRef.current.innerHTML = ''
        new window.WxLogin({
          id: qrRef.current.id,
          appid: wechatConfig.appId,
          scope: 'snsapi_login',
          redirect_uri: encodeURIComponent(wechatConfig.redirectUri),
          state,
          style: 'black',
        })
        setWechatReady(true)
        setWechatLoading(false)
      })
      .catch(() => {
        if (!active) return
        setWechatLoading(false)
        setMessage('微信二维码加载失败，请检查网络或联系管理员')
      })

    return () => {
      active = false
      if (qrRef.current) qrRef.current.innerHTML = ''
    }
  }, [loginMode, wechatConfig.appId, wechatConfig.redirectUri])

  const handleSubmit = (event) => {
    event.preventDefault()
    setMessage('')

    if (authMode === 'register') {
      if (password !== confirmPassword) {
        setMessage('两次输入的密码不一致')
        return
      }
      const result = addUser({ username, password })
      if (!result.ok) {
        setMessage(result.message)
        return
      }
      setAuthMode('login')
      setPassword('')
      setConfirmPassword('')
      setMessage('注册成功，请使用新账号登录')
      return
    }

    const result = login(username, password)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    onLogin(result.session)
  }

  const switchMode = (mode) => {
    setAuthMode(mode)
    setMessage('')
    setPassword('')
    setConfirmPassword('')
  }

  const switchLoginMode = (mode) => {
    setLoginMode(mode)
    setMessage('')
  }

  return (
    <div className="login-screen">
      <div className="login-panel">
        <div className="login-brand">
          <span className="login-mark">✨</span>
          <div>
            <h1>星光词汇挑战</h1>
            <p>注册后开始体感学单词</p>
          </div>
        </div>

        <div className="login-tabs" role="tablist" aria-label="登录方式">
          <button
            type="button"
            className={loginMode === 'password' ? 'active' : ''}
            onClick={() => switchLoginMode('password')}
          >
            账号密码
          </button>
          <button
            type="button"
            className={loginMode === 'wechat' ? 'active' : ''}
            onClick={() => switchLoginMode('wechat')}
          >
            微信扫码
          </button>
        </div>

        {loginMode === 'password' ? (
          <>
            <div className="auth-mode-tabs" role="tablist" aria-label="账号操作">
              <button
                type="button"
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => switchMode('login')}
              >
                登录
              </button>
              <button
                type="button"
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => switchMode('register')}
              >
                注册新账号
              </button>
            </div>
            <form className="login-form" onSubmit={handleSubmit}>
              <label>
                <span>用户名</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  maxLength={24}
                  required
                />
              </label>
              <label>
                <span>密码</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                  maxLength={64}
                  required
                />
              </label>
              {authMode === 'register' && (
                <label>
                  <span>确认密码</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    maxLength={64}
                    required
                  />
                </label>
              )}
              {message && <div className="login-error">{message}</div>}
              <button type="submit" className="login-primary">
                {authMode === 'register' ? '注册账号' : '登录'}
              </button>
            </form>
          </>
        ) : (
          <div className="wechat-login">
            {wechatConfig.appId ? (
              <div
                ref={qrRef}
                id="wechat-login-container"
                className="wechat-qr-container"
                aria-label="微信扫码登录二维码"
              />
            ) : (
              <div className="qr-unconfigured">
                <span>微信二维码待配置</span>
                <small>请在部署环境配置 VITE_WECHAT_APP_ID</small>
              </div>
            )}
            <p>
              {wechatLoading
                ? '正在加载微信安全登录…'
                : wechatReady
                  ? '请使用微信扫一扫，扫码后将自动注册或登录'
                  : '微信扫码会自动注册新用户，已注册账号直接登录'}
            </p>
            {message && <div className="login-error">{message}</div>}
          </div>
        )}

        <div className="login-hints">
          <span>新用户请先注册</span>
          <span>后台管理：root / root</span>
        </div>
      </div>
    </div>
  )
}

export default LoginScreen
