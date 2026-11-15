import test from 'node:test';
import assert from 'node:assert/strict';
import { BEAT_STYLES, beatNotes, volumeGain } from '../src/engine/sounds';

test('każde brzmienie: głośny sygnał jest wyraźnie głośniejszy od delikatnego tyku', () => {
  for (const { id } of BEAT_STYLES) {
    const soft = Math.max(...beatNotes(id, false).map((n) => n.gain)); const loud = Math.max(...beatNotes(id, true).map((n) => n.gain));
    assert.ok(loud >= 3 * soft, `${id}: ${soft} vs ${loud}`);
    assert.ok(soft > 0 && loud <= 0.6);
  }
});
test('nieznane brzmienie wraca do miękkiego; głośność jest ograniczona', () => {
  assert.deepEqual(beatNotes('xyz' as never, false), beatNotes('soft', false));
  assert.equal(volumeGain(70), 1); assert.equal(volumeGain(0), 0); assert.equal(volumeGain(500), 100 / 70); assert.equal(volumeGain(undefined), 1);
});
