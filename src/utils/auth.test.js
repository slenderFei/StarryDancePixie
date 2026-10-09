import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addUser,
  canAccessAdmin,
  getLoginEvents,
  getUsers,
  hasPermission,
  login,
  logout,
  updateUserPermissions,
} from './auth.js'

function createStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

test('requires registration for normal users and records login/logout', () => {
  globalThis.localStorage = createStorage()

  assert.equal(login('new-player', 'secret').ok, false)
  const registration = addUser({ username: 'new-player', password: 'secret' })
  assert.equal(registration.ok, true)
  assert.equal(getUsers().some((user) => user.username === 'new-player'), true)

  const result = login('new-player', 'secret')
  assert.equal(result.ok, true)
  assert.equal(result.session.provider, 'password')
  assert.equal(getLoginEvents()[0].status, 'active')

  logout()
  assert.equal(getLoginEvents()[0].status, 'logged_out')
  assert.ok(getLoginEvents()[0].logoutAt)
})

test('keeps root as the built-in administrator', () => {
  globalThis.localStorage = createStorage()

  assert.equal(login('admin', 'admin').ok, false)
  const result = login('root', 'root')
  assert.equal(result.ok, true)
  assert.equal(result.session.role, 'admin')
  logout()
})

test('assigns dashboard permissions to a selected user', () => {
  globalThis.localStorage = createStorage()

  assert.equal(addUser({ username: 'viewer', password: 'secret' }).ok, true)
  const viewer = login('viewer', 'secret')
  assert.equal(canAccessAdmin(viewer.session), false)
  logout()

  assert.equal(updateUserPermissions('viewer', ['dashboard.view', 'records.view']).ok, true)
  const updatedViewer = login('viewer', 'secret')
  assert.equal(canAccessAdmin(updatedViewer.session), true)
  assert.equal(hasPermission(updatedViewer.session, 'records.view'), true)
  assert.equal(hasPermission(updatedViewer.session, 'users.manage'), false)
  logout()
})
