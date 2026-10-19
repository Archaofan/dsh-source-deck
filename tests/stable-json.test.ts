import assert from 'node:assert/strict'
import test from 'node:test'
import { StableJson } from '../src/client/stable-json.ts'

test('fresh identical wire responses reuse identity, but changes and clearing are never stale', () => {
  const decoder = new StableJson<unknown>()
  const first = decoder.decode('{"setId":"A","stars":0}')
  assert.equal(decoder.decode('{"setId":"A","stars":0}'), first)
  const updated = decoder.decode('{"setId":"A","stars":1}')
  assert.notEqual(updated, first); assert.deepEqual(updated, { setId: 'A', stars: 1 })
  assert.deepEqual(decoder.decode('{"setId":"B","stars":1}'), { setId: 'B', stars: 1 })
  assert.equal(decoder.decode('null'), null)
  assert.notEqual(decoder.decode('{"setId":"A","stars":0}'), first)
  assert.throws(() => decoder.decode('{broken'), SyntaxError)
  assert.deepEqual(decoder.decode('{"setId":"A","stars":0}'), { setId: 'A', stars: 0 })
})
