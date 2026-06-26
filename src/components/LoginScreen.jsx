import React, { useState } from 'react'
import { login } from '../utils/auth'
import './LoginScreen.css'

function LoginScreen({ onLogin }) {
  const [loginMode, setLoginMode] = useState('password')
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin')
  const [message, setMessage] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    const result = login(username, password)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setMessage('')
    onLogin(result.session)
  }

  return (
    <div className="login-screen">
      <div className="login-panel">
        <div className="login-brand">
          <span className="login-mark">✨</span>
          <div>
            <h1>星光词汇挑战</h1>
            <p>登录后开始体感学单词</p>
          </div>
        </div>

        <div className="login-tabs" role="tablist" aria-label="登录方式">
          <button
            type="button"
            className={loginMode === 'password' ? 'active' : ''}
            onClick={() => setLoginMode('password')}
          >
            账号密码
          </button>
          <button
            type="button"
            className={loginMode === 'wechat' ? 'active' : ''}
            onClick={() => setLoginMode('wechat')}
          >
            微信扫码
          </button>
        </div>

        {loginMode === 'password' ? (
          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              <span>用户名</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
              />
            </label>
            <label>
              <span>密码</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            {message && <div className="login-error">{message}</div>}
            <button type="submit" className="login-primary">
              登录
            </button>
          </form>
        ) : (
          <div className="wechat-login">
            <div className="qr-box" aria-label="微信扫码登录占位">
              <div className="qr-grid" />
            </div>
            <p>微信扫码登录需要接入微信开放平台 AppID 和服务端回调校验。</p>
            <button
              type="button"
              className="login-primary"
              onClick={() => {
                const result = login('admin', 'admin')
                onLogin(result.session)
              }}
            >
              使用 admin 演示登录
            </button>
          </div>
        )}

        <div className="login-hints">
          <span>游戏用户：admin / admin</span>
          <span>后台管理：root / root</span>
        </div>
      </div>
    </div>
  )
}

export default LoginScreen
