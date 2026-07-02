import React, { useMemo, useState } from 'react'
import { addUser, getUsers, logout, removeUser } from '../utils/auth'
import { clearGameRecords, getGameRecords } from '../utils/gameRecords'
import './AdminDashboard.css'

function modeName(record) {
  if (record.playMode === 'balloon') return record.arcadeVersus ? '气球双人' : '气球单机'
  if (record.playMode === 'fruit') return '单词拼写'
  if (record.playMode === 'rope') return '虚拟跳绳'
  if (record.playMode === 'platformer') return '星光大冒险 · 横版闯关'
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

function AdminDashboard({ onExit, onSessionChange }) {
  const [users, setUsers] = useState(() => getUsers())
  const [records, setRecords] = useState(() => getGameRecords())
  const [selectedRecordId, setSelectedRecordId] = useState(records[0]?.id || '')
  const [form, setForm] = useState({ username: '', password: '', role: 'user' })
  const [message, setMessage] = useState('')

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) || records[0] || null,
    [records, selectedRecordId],
  )

  const handleAddUser = (event) => {
    event.preventDefault()
    const result = addUser(form)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setUsers(getUsers())
    setForm({ username: '', password: '', role: 'user' })
    setMessage('用户已添加')
  }

  const handleRemoveUser = (username) => {
    const result = removeUser(username)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setUsers(getUsers())
    setMessage('用户已删除')
  }

  const handleClearRecords = () => {
    clearGameRecords()
    setRecords([])
    setSelectedRecordId('')
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
        <section className="admin-section">
          <div className="admin-section-head">
            <div>
              <h2>用户管理</h2>
              <p>默认 admin/admin 可玩游戏，root/root 可进入后台。</p>
            </div>
          </div>

          <form className="admin-user-form" onSubmit={handleAddUser}>
            <input
              placeholder="用户名"
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
            />
            <input
              placeholder="密码"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
            <select
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
            >
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
            <button type="submit">添加用户</button>
          </form>
          {message && <div className="admin-message">{message}</div>}

          <div className="admin-table">
            <div className="admin-table-row admin-table-head">
              <span>用户名</span>
              <span>角色</span>
              <span>创建时间</span>
              <span>操作</span>
            </div>
            {users.map((user) => (
              <div key={user.username} className="admin-table-row">
                <span>{user.username}</span>
                <span>{user.role === 'admin' ? '管理员' : '普通用户'}</span>
                <span>{formatTime(user.createdAt)}</span>
                <span>
                  <button type="button" onClick={() => handleRemoveUser(user.username)}>
                    删除
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-head">
            <div>
              <h2>游戏记录</h2>
              <p>记录用户、时间、模式、全量单词、击中单词、漏掉单词和拼写明细。</p>
            </div>
            <button type="button" onClick={handleClearRecords}>
              清空记录
            </button>
          </div>

          <div className="records-layout">
            <div className="records-list">
              {records.length ? (
                records.map((record) => (
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
                        : record.playMode === 'balloon'
                          ? `${record.score || 0}分 · ${record.hitCount}/${record.totalWords}`
                          : `${record.hitCount}/${record.totalWords}`}
                    </span>
                  </button>
                ))
              ) : (
                <div className="empty-records">暂无游戏记录</div>
              )}
            </div>

            <div className="record-detail">
              {selectedRecord ? (
                <>
                  <div
                    className={`record-summary ${
                      selectedRecord.playMode === 'balloon' || selectedRecord.playMode === 'platformer'
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
                    {(selectedRecord.playMode === 'balloon' || selectedRecord.playMode === 'platformer') && (
                      <div>
                        <span>得分</span>
                        <strong>{selectedRecord.score || selectedRecord.rankScore || 0} 分</strong>
                      </div>
                    )}
                    <div>
                      <span>
                        {selectedRecord.playMode === 'rope' || selectedRecord.playMode === 'platformer'
                          ? '时长'
                          : '漏掉'}
                      </span>
                      <strong>
                        {selectedRecord.playMode === 'rope'
                          ? `${selectedRecord.durationSeconds || 60} 秒`
                          : selectedRecord.playMode === 'platformer'
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
        </section>
      </main>
    </div>
  )
}

export default AdminDashboard
