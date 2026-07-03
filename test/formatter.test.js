// test/formatter.test.js
import assert from 'node:assert';
import { test } from 'node:test';
import {
  formatResults,
  formatError,
  formatInfo,
  highlightQuery,
} from '../lib/formatter.js';

const ANSI = {
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  yellowBg: '\x1b[43m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

test('formatResults: formats each line, colors filepath and lineNumber, highlights query words', () => {
  const sample = [
    {
      filePath: 'src/a.js',
      lineNumber: 12,
      lineContent: 'foo bar baz foo',
    },
    {
      filePath: 'src/b.js',
      lineNumber: 7,
      lineContent: 'something else foo',
    },
  ];
  const query = 'foo';
  const output = formatResults(sample, query, { ignoreCase: false });
  // Expect cyan on filePath and lineNumber
  assert(output.includes(ANSI.cyan + 'src/a.js:12' + ANSI.reset));
  assert(output.includes(ANSI.cyan + 'src/b.js:7' + ANSI.reset));
  // Should have highlight for each 'foo' (yellow background + bold)
  assert.strictEqual(
    (output.match(new RegExp(ANSI.yellowBg + ANSI.bold + 'foo' + ANSI.reset, 'g')) || []).length,
    3 // two in first line, one in second line
  );
});

test('formatResults: highlights all case-insensitive occurrences when ignoreCase=true', () => {
  const sample = [
    { filePath: 'lib/x.js', lineNumber: 2, lineContent: 'Foo fOO foo' },
  ];
  const query = 'foo';
  const out = formatResults(sample, query, { ignoreCase: true });
  // All 'foo' variants should be highlighted
  assert.strictEqual(
    (out.match(new RegExp(ANSI.yellowBg + ANSI.bold + '(Foo|fOO|foo)' + ANSI.reset, 'g')) || []).length,
    3
  );
});

test('highlightQuery: highlights nothing if query not found', () => {
  const text = 'lorem ipsum';
  const result = highlightQuery(text, 'xyz');
  assert.strictEqual(result, text);
});

test('highlightQuery: handles empty query and line cases', () => {
  assert.strictEqual(highlightQuery('abc', ''), 'abc');
  assert.strictEqual(highlightQuery('', 'abc'), '');
  assert.strictEqual(highlightQuery(undefined, 'abc'), undefined);
  assert.strictEqual(highlightQuery('abc', undefined), 'abc');
});

test('formatResults: returns yellow info for no results', () => {
  const out = formatResults([], 'needle');
  assert(out.includes(ANSI.yellow));
  assert(out.includes('No results found'));
  assert(out.includes('needle'));
});

test('formatError: wraps message in red', () => {
  const out = formatError('fail!');
  assert.ok(out.startsWith(ANSI.red));
  assert.ok(out.endsWith(ANSI.reset));
  assert(out.includes('fail!'));
});

test('formatInfo: wraps message in yellow', () => {
  const out = formatInfo('warn!');
  assert.ok(out.startsWith(ANSI.yellow));
  assert.ok(out.endsWith(ANSI.reset));
  assert(out.includes('warn!'));
});
