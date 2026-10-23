import test from 'node:test'
import assert from 'node:assert/strict'
import { createWechatState, validateExchangeInput } from '../../cloud-functions/api/auth/wechat/exchange.js'

const config = {
  appId: 'wx-test',
  appSecret: 'secret',
  stateSecret: 'state-secret',
  redirectUris: ['https://barone.chat/'],
}
const validState = createWechatState(config)

test('requires a configured and allowlisted WeChat redirect URI', () => {
  assert.equal(
    validateExchangeInput(
      { code: 'valid-code-123', state: validState, redirectUri: 'https://barone.chat/' },
      config,
    ),
    '',
  )
  assert.match(
    validateExchangeInput(
      { code: 'valid-code-123', state: validState, redirectUri: 'https://evil.example/' },
      config,
    ),
    /回调地址/,
  )
})

test('rejects malformed or undersized WeChat callback values', () => {
  assert.match(
    validateExchangeInput(
      { code: 'short', state: validState, redirectUri: 'https://barone.chat/' },
      config,
    ),
    /code/,
  )
  assert.match(
    validateExchangeInput(
      { code: 'valid-code-123', state: 'short', redirectUri: 'https://barone.chat/' },
      config,
    ),
    /state/,
  )
  assert.match(
    validateExchangeInput(
      {
        code: 'valid-code-123',
        state: createWechatState(config, Date.now() - 11 * 60 * 1000),
        redirectUri: 'https://barone.chat/',
      },
      config,
    ),
    /state/,
  )
})
