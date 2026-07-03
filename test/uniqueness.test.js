// test/uniqueness.test.js
import assert from 'node:assert';
import { test } from 'node:test';
import { filterUnique } from '../lib/uniqueness.js';

test('Uniqueness module (filterUnique): filters duplicates by lineContent (mode: line)', () => {
  const sample = [
    { filePath: '/a/x.txt', lineNumber: 5, lineContent: 'foo' },
    { filePath: '/a/y.txt', lineNumber: 2, lineContent: 'bar' },
    { filePath: '/a/x.txt', lineNumber: 7, lineContent: 'foo' }, // duplicate lineContent
    { filePath: '/b/z.txt', lineNumber: 8, lineContent: 'foo' }, // duplicate lineContent, different file
    { filePath: '/a/x.txt', lineNumber: 5, lineContent: 'foo' }, // exact duplicate
    { filePath: '/a/y.txt', lineNumber: 2, lineContent: 'bar' }, // exact duplicate
    { filePath: '/a/y.txt', lineNumber: 3, lineContent: 'baz' },
  ];
  // Only first occurrence for each lineContent kept
  const result = filterUnique(sample, 'line');
  assert.deepStrictEqual(
    result.map(r => r.lineContent),
    ['foo', 'bar', 'baz']
  );
  assert.deepStrictEqual(
    result.map(r => [r.filePath, r.lineNumber]),
    [
      ['/a/x.txt', 5], // first "foo"
      ['/a/y.txt', 2], // first "bar"
      ['/a/y.txt', 3], // "baz"
    ]
  );
});

test('Uniqueness module (filterUnique): filters duplicates by filePath+lineNumber (mode: fileLine)', () => {
  const sample = [
    { filePath: '/a/x.txt', lineNumber: 5, lineContent: 'foo' },
    { filePath: '/a/y.txt', lineNumber: 2, lineContent: 'bar' },
    { filePath: '/a/x.txt', lineNumber: 7, lineContent: 'foo' },
    { filePath: '/b/z.txt', lineNumber: 8, lineContent: 'foo' },
    { filePath: '/a/x.txt', lineNumber: 5, lineContent: 'foo' },
    { filePath: '/a/y.txt', lineNumber: 2, lineContent: 'bar' },
    { filePath: '/a/y.txt', lineNumber: 3, lineContent: 'baz' },
  ];
  // Only first unique filePath+lineNumber kept
  const result = filterUnique(sample, 'fileLine');
  assert.deepStrictEqual(
    result.map(r => [r.filePath, r.lineNumber, r.lineContent]),
    [
      ['/a/x.txt', 5, 'foo'],   // 1st occurrence
      ['/a/y.txt', 2, 'bar'],   // 2nd occurrence
      ['/a/x.txt', 7, 'foo'],   // new file+line
      ['/b/z.txt', 8, 'foo'],   // new file+line
      ['/a/y.txt', 3, 'baz'],   // unique
    ]
  );
});

test('Uniqueness module (filterUnique): handles empty array', () => {
  assert.deepStrictEqual(filterUnique([], 'line'), []);
  assert.deepStrictEqual(filterUnique([], 'fileLine'), []);
});

test('Uniqueness module (filterUnique): throws on invalid keyMode', () => {
  const sample = [ { filePath: '/a/x.txt', lineNumber: 5, lineContent: 'foo' } ];
  assert.throws(() => filterUnique(sample, 'xyz'), /Invalid keyMode/);
});

test('Uniqueness module (filterUnique): skips null and malformed entries', () => {
  const bad = [
    { garbage: true },
    null,
    undefined,
    { filePath: '/a/t.txt', lineNumber: 1 }, // no lineContent
    { lineContent: 123 },
    { filePath: '', lineNumber: 2, lineContent: 'x' }, // ok
  ];
  const r = filterUnique(bad, 'line');
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].lineContent, 'x');
});
