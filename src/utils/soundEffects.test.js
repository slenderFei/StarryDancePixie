import test from 'node:test'
import assert from 'node:assert/strict'
import { playWordPronunciation, stopGameSpeech } from './soundEffects.js'

test('leaving a game cancels speech that has not started yet', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const spoken = []
  const synthesis = { cancel() {}, getVoices: () => [], speak: (utterance) => spoken.push(utterance.text) }
  globalThis.SpeechSynthesisUtterance = function (text) { this.text = text }
  // Browser globals are local to this test process.
  globalThis.window = { speechSynthesis: synthesis }
  globalThis.speechSynthesis = synthesis
  t.after(() => {
    stopGameSpeech()
    delete globalThis.window
    delete globalThis.speechSynthesis
    delete globalThis.SpeechSynthesisUtterance
  })
  playWordPronunciation('sunshine')
  stopGameSpeech()
  t.mock.timers.tick(200)
  assert.deepEqual(spoken, [])
})

test('a newer word replaces pending pronunciation instead of queueing both', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const spoken = []
  const synthesis = { cancel() {}, getVoices: () => [], speak: (utterance) => spoken.push(utterance.text) }
  globalThis.SpeechSynthesisUtterance = function (text) { this.text = text }
  globalThis.window = { speechSynthesis: synthesis }
  globalThis.speechSynthesis = synthesis
  t.after(() => {
    stopGameSpeech()
    delete globalThis.window
    delete globalThis.speechSynthesis
    delete globalThis.SpeechSynthesisUtterance
  })
  playWordPronunciation('old word')
  t.mock.timers.tick(50)
  playWordPronunciation('new word')
  t.mock.timers.tick(100)
  assert.deepEqual(spoken, ['new word'])
})
