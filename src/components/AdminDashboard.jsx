import React, { useEffect, useMemo, useState } from 'react'
import {
  addUser,
  getLoginEvents,
  getUsers,
  hasPermission,
  logout,
  removeUser,
  updateUserPermissions,
  USER_PERMISSIONS,
} from '../utils/auth'
import { clearGameRecords, getGameRecords } from '../utils/gameRecords'
import './AdminDashboard.css'

function modeName(record) {
  if (record.playMode === 'balloon') return record.arcadeVersus ? '气球双人' : '气球单机'
  if (record.playMode === 'fruit') return '单词拼写'
  if (record.playMode === 'rope') return '虚拟跳绳'
  if (record.playMode === 'platformer') return '星光大冒险 · 横版闯关'
  if (record.playMode === 'gnm') return 'GNM Head · 表情挑战'
  if (record.playMode === 'herb') return '识别中草药村'
  if (record.playMode === 'catwarrior') return '猫武士 · 月影巡林'
  return '体感学单词'
}

function formatTime(value) {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function providerName(provider) {
  return provider === 'wechat' ? '微信扫码' : '账号密码'
}

function loginStatusName(status) {
  if (status === 'active') return '登录中'
  if (status === 'replaced') return '已切换账号'
  return '已退出'
}

function WordList({ title, words }) {
  return (
    <div className="admin-word-list">
      <h4>{title}</h4>
      <div>
        {(words || []).length ? (
          words.map((word, index) => (
            <span key={`${word.id}-${word.word}-${index}`}>
              <strong>{word.word}</strong>
              {word.meaning ? ` · ${word.meaning}` : ''}
              {word.score ? <em>{word.balloonLabel || '气球'} +{word.score}</em> : null}
            </span>
          ))
        ) : (
          <em>暂无</em>
        )}
      </div>
    </div>
  )
}

function SpellingResultList({ results }) {
  if (!results?.length) return null

  return (
    <div className="admin-spelling-list">
      <h4>拼写明细</h4>
      <div className="admin-spelling-items">
        {results.map((result, index) => (
          <article key={`${result.id}-${index}`} className="admin-spelling-item">
            <div>
              <strong>{result.meaning || result.word}</strong>
              <span>
                {result.targetWord || result.word} → {result.spelledWord || '未完成'}
              </span>
            </div>
            <div className="admin-letter-attempts">
              {(result.attempts || []).map((attempt) => (
                <span key={`${attempt.letterIndex}-${attempt.expectedLetter}`}>
                  {attempt.expectedLetter}
                  <em>{Math.round((attempt.confidence || 0) * 100)}%</em>
                </span>
              ))}
              {result.canceledCount > 0 && <span>重写 {result.canceledCount} 次</span>}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function AdminDashboard({ session, onExit, onSessionChange }) {
  const [users, setUsers] = useState(() => getUsers())
  const [records, setRecords] = useState(() => getGameRecords())
  const [loginEvents, setLoginEvents] = useState(() => getLoginEvents())
  const [selectedRecordId, setSelectedRecordId] = useState(records[0]?.id || '')
  const [form, setForm] = useState({ username: '', password: '', role: 'user' })
  const [permissionUser, setPermissionUser] = useState('')
  const [permissionDraft, setPermissionDraft] = useState([])
  const [message, setMessage] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [recordQuery, setRecordQuery] = useState('')
  const [recordMode, setRecordMode] = useState('all')
  const [lastRefreshedAt, setLastRefreshedAt] = useState(() => new Date())

  const canViewUsers = hasPermission(session, 'users.view')
  const canManageUsers = hasPermission(session, 'users.manage')
  const canViewLoginEvents = hasPermission(session, 'loginEvents.view')
  const canViewRecords = hasPermission(session, 'records.view')
  const canManageRecords = hasPermission(session, 'records.manage')

  const visibleUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase()
    if (!query) return users
    return users.filter((user) => user.username.toLowerCase().includes(query))
  }, [userQuery, users])

  const visibleRecords = useMemo(() => {
    const query = recordQuery.trim().toLowerCase()
    return records.filter((record) => {
      const matchesMode = recordMode === 'all' || record.playMode === recordMode
      const matchesQuery =
        !query ||
        String(record.username || '').toLowerCase().includes(query) ||
        modeName(record).toLowerCase().includes(query)
      return matchesMode && matchesQuery
    })
  }, [recordMode, recordQuery, records])

  const selectedRecord = useMemo(
    () => visibleRecords.find((record) => record.id === selectedRecordId) || visibleRecords[0] || null,
    [selectedRecordId, visibleRecords],
  )

  const refreshData = () => {
    setUsers(getUsers())
    setRecords(getGameRecords())
    setLoginEvents(getLoginEvents())
    setLastRefreshedAt(new Date())
  }

  useEffect(() => {
    const handleStorage = (event) => {
      if (
        event.key === 'starryDancePixie.users.v1' ||
        event.key === 'starryDancePixie.gameRecords.v1' ||
        event.key === 'starryDancePixie.loginEvents.v1'
      ) {
        refreshData()
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    if (selectedRecordId && records.some((record) => record.id === selectedRecordId)) return
    setSelectedRecordId(records[0]?.id || '')
  }, [records, selectedRecordId])

  const handleAddUser = (event) => {
    event.preventDefault()
    const result = addUser(form)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setUsers(getUsers())
    setLoginEvents(getLoginEvents())
    setForm({ username: '', password: '', role: 'user' })
    setMessage('用户已添加')
  }

  const handleRemoveUser = (username) => {
    if (!canManageUsers) return
    const result = removeUser(username)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setUsers(getUsers())
    setLoginEvents(getLoginEvents())
    setMessage('用户已删除')
  }

  const handleEditPermissions = (user) => {
    setPermissionUser(user.username)
    setPermissionDraft(user.permissions || [])
    setMessage('')
  }

  const handleSavePermissions = () => {
    if (!permissionUser || !canManageUsers) return
    const result = updateUserPermissions(permissionUser, permissionDraft)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setUsers(getUsers())
    setPermissionUser('')
    setPermissionDraft([])
    setMessage('用户权限已更新')
  }

  const handleClearRecords = () => {
    if (!records.length) {
      setMessage('当前没有可清空的游戏记录')
      return
    }
    if (!window.confirm(`确定清空全部 ${records.length} 条游戏记录吗？此操作无法撤销。`)) return
    clearGameRecords()
    setRecords([])
    setSelectedRecordId('')
    setMessage(`已清空 ${records.length} 条游戏记录`)
  }

  const handleLogout = () => {
    logout()
    onSessionChange()
  }

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div>
          <span className="admin-logo">✦</span>
          <h1>后台管理</h1>
          <p>用户与游戏记录</p>
        </div>
        <button type="button" onClick={onExit}>
          返回游戏
        </button>
        <button type="button" onClick={handleLogout}>
          退出登录
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-overview">
          <div>
            <span className="admin-overview-kicker">SYSTEM CONSOLE</span>
            <h2>系统看板</h2>
            <p>集中管理账号权限、登录会话与游戏数据。</p>
          </div>
          <div className="admin-overview-actions">
            <span>更新于 {formatTime(lastRefreshedAt)}</span>
            <button type="button" onClick={refreshData}>刷新全部</button>
          </div>
        </header>

        <div className="admin-stat-grid" aria-label="系统摘要">
          <div className="admin-stat-card"><span>用户总数</span><strong>{users.length}</strong><small>含 root 管理员</small></div>
          <div className="admin-stat-card"><span>当前登录</span><strong>{loginEvents.filter((event) => event.status === 'active').length}</strong><small>活跃会话</small></div>
          <div className="admin-stat-card"><span>游戏记录</span><strong>{records.length}</strong><small>本地保存记录</small></div>
          <div className="admin-stat-card admin-stat-card-accent"><span>权限项</span><strong>{USER_PERMISSIONS.length}</strong><small>可分配权限</small></div>
        </div>

        {canViewUsers && <section className="admin-section">
          <div className="admin-section-head">
            <div>
              <h2>用户管理</h2>
              <p>新用户必须注册后才能登录，root/root 仅用于后台管理。</p>
            </div>
          </div>

          {canManageUsers && (
            <form className="admin-user-form" onSubmit={handleAddUser}>
              <input
                placeholder="用户名"
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
              />
              <input
                type="password"
                placeholder="密码"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
              <select
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
              >
                <option value="user">普通用户</option>
                <option value="admin">管理员（全部权限）</option>
              </select>
              <button type="submit">添加用户</button>
            </form>
          )}
          {message && <div className="admin-message">{message}</div>}

          <div className="admin-filter-row">
            <label>
              <span>筛选用户</span>
              <input
                type="search"
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
                placeholder="输入用户名搜索"
              />
            </label>
            <span className="admin-filter-count">显示 {visibleUsers.length} / {users.length} 个用户</span>
          </div>

          <div className="admin-table">
            <div className="admin-table-row admin-table-head">
              <span>用户名</span>
              <span>角色</span>
              <span>权限</span>
              <span>创建时间</span>
              <span>操作</span>
            </div>
            {visibleUsers.map((user) => (
              <div key={user.username} className="admin-table-row">
                <span>{user.username}</span>
                <span>{user.role === 'admin' ? '管理员' : '普通用户'}</span>
                <span>{user.role === 'admin' ? '全部权限' : `${user.permissions?.length || 0} 项`}</span>
                <span>{formatTime(user.createdAt)}</span>
                <span className="admin-user-actions">
                  {canManageUsers && (
                    <button type="button" onClick={() => handleEditPermissions(user)}>
                      分配权限
                    </button>
                  )}
                  {canManageUsers && user.username !== 'root' && (
                    <button type="button" onClick={() => handleRemoveUser(user.username)}>
                      删除
                    </button>
                  )}
                </span>
              </div>
            ))}
            {!visibleUsers.length && <div className="empty-records">没有匹配的用户</div>}
          </div>
          {permissionUser && (
            <div className="permission-editor">
              <div className="permission-editor-head">
                <div>
                  <strong>为 {permissionUser} 分配权限</strong>
                  <span>权限立即保存到当前项目账号。</span>
                </div>
                <button type="button" onClick={() => setPermissionUser('')}>关闭</button>
              </div>
              <div className="permission-options">
                {USER_PERMISSIONS.map((permission) => (
                  <label key={permission.id}>
                    <input
                      type="checkbox"
                      checked={permissionDraft.includes(permission.id)}
                      onChange={(event) => {
                        setPermissionDraft((current) =>
                          event.target.checked
                            ? [...new Set([...current, permission.id])]
                            : current.filter((item) => item !== permission.id),
                        )
                      }}
                    />
                    <span>{permission.label}</span>
                  </label>
                ))}
              </div>
              <button type="button" className="permission-save" onClick={handleSavePermissions}>
                保存权限
              </button>
            </div>
          )}
        </section>}

        {canViewLoginEvents && <section className="admin-section">
          <div className="admin-section-head">
            <div>
              <h2>用户登录情况</h2>
              <p>查看当前登录会话、登录来源和最近登录/退出时间。</p>
            </div>
            <div className="login-summary">
              <strong>{loginEvents.filter((event) => event.status === 'active').length}</strong>
              <span>当前登录</span>
            </div>
          </div>

          <div className="login-events-table">
            <div className="login-events-row login-events-head">
              <span>用户</span>
              <span>来源</span>
              <span>登录时间</span>
              <span>退出时间</span>
              <span>状态</span>
            </div>
            {loginEvents.length ? (
              loginEvents.slice(0, 100).map((event) => (
                <div key={event.id || `${event.username}-${event.loginAt}`} className="login-events-row">
                  <span>
                    <strong>{event.username}</strong>
                    <small>{event.role === 'admin' ? '管理员' : '普通用户'}</small>
                  </span>
                  <span>{providerName(event.provider)}</span>
                  <span>{formatTime(event.loginAt)}</span>
                  <span>{event.logoutAt ? formatTime(event.logoutAt) : '—'}</span>
                  <span className={event.status === 'active' ? 'login-status-active' : ''}>
                    {loginStatusName(event.status)}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-records">暂无登录记录</div>
            )}
          </div>
        </section>}

        {canViewRecords && <section className="admin-section">
          <div className="admin-section-head">
            <div>
              <h2>游戏记录</h2>
              <p>记录用户、时间、模式、全量单词、击中单词、漏掉单词和拼写明细。</p>
            </div>
            {canManageRecords && (
              <button type="button" onClick={handleClearRecords}>
                清空记录
              </button>
            )}
          </div>

          <div className="records-layout">
            <div className="records-list">
              <div className="record-filters">
                <input
                  type="search"
                  value={recordQuery}
                  onChange={(event) => setRecordQuery(event.target.value)}
                  placeholder="搜索用户或游戏模式"
                  aria-label="搜索游戏记录"
                />
                <select value={recordMode} onChange={(event) => setRecordMode(event.target.value)} aria-label="按游戏模式筛选">
                  <option value="all">全部模式</option>
                  <option value="classic">体感学单词</option>
                  <option value="balloon">气球跳跳碰</option>
                  <option value="fruit">单词拼写</option>
                  <option value="rope">虚拟跳绳</option>
                  <option value="platformer">星光大冒险</option>
                  <option value="gnm">GNM Head</option>
                  <option value="herb">识别中草药村</option>
                  <option value="catwarrior">猫武士</option>
                </select>
                <span className="admin-filter-count">显示 {visibleRecords.length} / {records.length} 条</span>
              </div>
              {visibleRecords.length ? (
                visibleRecords.map((record) => (
                  <button
                    type="button"
                    key={record.id}
                    className={selectedRecord?.id === record.id ? 'selected' : ''}
                    onClick={() => setSelectedRecordId(record.id)}
                  >
                    <strong>{record.username}</strong>
                    <span>{modeName(record)}</span>
                    <span>
                      {formatTime(record.createdAt)} ·{' '}
                      {record.playMode === 'rope'
                        ? `${record.jumpCount || record.rankScore || 0} 次`
                        : record.playMode === 'platformer'
                          ? `${record.score || record.rankScore || 0}分 · ${record.hitCount}/${record.totalWords}`
                        : record.playMode === 'balloon' || record.playMode === 'gnm'
                          ? `${record.score || 0}分 · ${record.hitCount}/${record.totalWords}`
                          : `${record.hitCount}/${record.totalWords}`}
                    </span>
                  </button>
                ))
              ) : (
                <div className="empty-records">{records.length ? '没有匹配的游戏记录' : '暂无游戏记录'}</div>
              )}
            </div>

            <div className="record-detail">
              {selectedRecord ? (
                <>
                  <div
                    className={`record-summary ${
                      selectedRecord.playMode === 'balloon' ||
                      selectedRecord.playMode === 'platformer' ||
                      selectedRecord.playMode === 'gnm'
                        ? 'record-summary-wide'
                        : ''
                    }`}
                  >
                    <div>
                      <span>用户</span>
                      <strong>{selectedRecord.username}</strong>
                    </div>
                    <div>
                      <span>模式</span>
                      <strong>{modeName(selectedRecord)}</strong>
                    </div>
                    <div>
                      <span>{selectedRecord.playMode === 'rope' ? '次数' : '命中'}</span>
                      <strong>
                        {selectedRecord.playMode === 'rope'
                          ? selectedRecord.jumpCount || selectedRecord.rankScore || 0
                          : `${selectedRecord.hitCount}/${selectedRecord.totalWords}`}
                      </strong>
                    </div>
                    {(selectedRecord.playMode === 'balloon' ||
                      selectedRecord.playMode === 'platformer' ||
                      selectedRecord.playMode === 'gnm') && (
                      <div>
                        <span>得分</span>
                        <strong>{selectedRecord.score || selectedRecord.rankScore || 0} 分</strong>
                      </div>
                    )}
                    <div>
                      <span>
                        {selectedRecord.playMode === 'rope' ||
                        selectedRecord.playMode === 'platformer' ||
                        selectedRecord.playMode === 'gnm'
                          ? '时长'
                          : '漏掉'}
                      </span>
                      <strong>
                        {selectedRecord.playMode === 'rope'
                          ? `${selectedRecord.durationSeconds || 60} 秒`
                          : selectedRecord.playMode === 'platformer' || selectedRecord.playMode === 'gnm'
                            ? `${selectedRecord.durationSeconds || 0} 秒`
                            : selectedRecord.missedCount}
                      </strong>
                    </div>
                  </div>
                  {selectedRecord.playMode === 'rope' ? (
                    <div className="admin-word-list">
                      <h4>跳绳成绩</h4>
                      <div>
                        <span>60 秒 {selectedRecord.jumpCount || selectedRecord.rankScore || 0} 次</span>
                        <span>最佳连击 {selectedRecord.bestCombo || 0}</span>
                      </div>
                    </div>
                  ) : selectedRecord.playMode === 'gnm' ? (
                    <div className="admin-word-list">
                      <h4>表情挑战成绩</h4>
                      <div>
                        <span>完成 {selectedRecord.completedChallenges || selectedRecord.hitCount}/6 个动作</span>
                        <span>最高连击 {selectedRecord.bestCombo || 0}</span>
                        <span>总分 {selectedRecord.score || 0}</span>
                        <span>{selectedRecord.completed ? '全动作完成' : '挑战已结束'}</span>
                      </div>
                    </div>
                  ) : selectedRecord.playMode === 'platformer' ? (
                    <>
                      <div className="admin-word-list">
                        <h4>冒险成绩</h4>
                        <div>
                          <span>
                            关卡{' '}
                            {selectedRecord.platformerStats?.levelsCompleted || 0}/
                            {selectedRecord.platformerStats?.totalLevels || 3}
                          </span>
                          <span>金币 {selectedRecord.coins || 0}</span>
                          <span>受伤 {selectedRecord.damageCount || 0} 次</span>
                          <span>{selectedRecord.completed ? '已通关' : '未通关'}</span>
                        </div>
                      </div>
                      <WordList title="本关全量单词" words={selectedRecord.allWords} />
                      <WordList title="学到的单词" words={selectedRecord.hitWords} />
                      <WordList title="未完成单词" words={selectedRecord.missedWords} />
                    </>
                  ) : (
                    <>
                      <WordList title="本局全量单词" words={selectedRecord.allWords} />
                      <WordList title="击中的单词" words={selectedRecord.hitWords} />
                      <WordList title="漏掉的单词" words={selectedRecord.missedWords} />
                      <SpellingResultList results={selectedRecord.spellingResults} />
                    </>
                  )}
                </>
              ) : (
                <div className="empty-records">选择一条记录查看详情</div>
              )}
            </div>
          </div>
        </section>}
        {!canViewUsers && !canViewLoginEvents && !canViewRecords && (
          <section className="admin-section admin-empty-permissions">
            <h2>暂无后台权限</h2>
            <p>请联系 root 管理员分配系统看板权限。</p>
          </section>
        )}
      </main>
    </div>
  )
}

export default AdminDashboard
