import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRange } from './range.js';

test('parseRange', () => {
  assert.equal(parseRange(undefined, 1000), null);
  assert.equal(parseRange('bytes=0-1,5-6', 1000), null);
  assert.deepEqual(parseRange('bytes=0-99', 1000), { start: 0, end: 99 });
  assert.deepEqual(parseRange('bytes=500-', 1000), { start: 500, end: 999 });
  assert.deepEqual(parseRange('bytes=-200', 1000), { start: 800, end: 999 });
  assert.deepEqual(parseRange('bytes=900-5000', 1000), { start: 900, end: 999 }); // end clamped
  assert.equal(parseRange('bytes=1000-', 1000), 'invalid');
  assert.equal(parseRange('bytes=50-10', 1000), 'invalid');
});
