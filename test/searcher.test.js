// test/searcher.test.js
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { test } from 'node:test';
import { search } from '../lib/searcher.js';

// Helper: create tmp test files/dirs with content, return {dirPath, filePaths: [abs]}
async function setupFilestructure(filesMap) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cus-test-'));
  const absPaths = [];
  // filesMap: {"sub/file.txt": "content"}
  for (const [rel, content] of Object.entries(filesMap)) {
    const abs = path.join(tmpDir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf8');
    absPaths.push(abs);
  }
  return { dirPath: tmpDir, filePaths: absPaths };
}

// Helper: recursive rm tmpdir
async function cleanup(dir) {
  await fs.rm(dir, { recursive: true, force: true });
}

test('searcher.js: finds matching lines in a single file', async (t) => {
  const { dirPath, filePaths } = await setupFilestructure({
    'one.txt': 'line1\nfoo is here\nbar\nFoo again',
  });
  try {
    const res = await search({ query: 'foo', path: filePaths[0] });
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].lineNumber, 2);
    assert.strictEqual(res[0].lineContent, 'foo is here');
  } finally {
    await cleanup(dirPath);
  }
});

test('searcher.js: supports recursive searching in directories', async (t) => {
  const { dirPath } = await setupFilestructure({
    'a.txt': 'alpha\nmatch\none',
    'sub/b.txt': 'beta\nnope\nmatch',
    'sub/nest/c.txt': 'gamma\nmatch',
    'other/nod.txt': 'irrelevant',
  });
  try {
    const results = await search({ query: 'match', path: dirPath });
    assert.deepStrictEqual(
      results.map(r => ({ file: path.basename(r.filePath), line: r.lineNumber, text: r.lineContent })),
      [
        { file: 'a.txt', line: 2, text: 'match' },
        { file: 'b.txt', line: 3, text: 'match' },
        { file: 'c.txt', line: 2, text: 'match' },
      ]
    );
  } finally {
    await cleanup(dirPath);
  }
});

test('searcher.js: respects the ignoreCase option', async (t) => {
  const { dirPath, filePaths } = await setupFilestructure({
    'case.txt': 'Foobar\nfOoBaR\nnope\nbar',
  });
  try {
    let res = await search({ query: 'foobar', path: filePaths[0] });
    // Case sensitive default: match none
    assert.strictEqual(res.length, 0);
    // Now ignoreCase=true: should match lines 1 and 2
    res = await search({ query: 'foobar', path: filePaths[0], ignoreCase: true });
    assert.strictEqual(res.length, 2);
    assert.deepStrictEqual(res.map(r => r.lineNumber), [1, 2]);
  } finally {
    await cleanup(dirPath);
  }
});

test('searcher.js: limits results with maxResults', async (t) => {
  const { dirPath, filePaths } = await setupFilestructure({
    'm.txt': 'a\nfoo\nfoo\nfoo\nfoo',
    'm2.txt': 'foo\nfoo\nfoo',
  });
  try {
    // There are 7 foo's; limit to max 3
    const results = await search({ query: 'foo', path: dirPath, maxResults: 3 });
    assert.strictEqual(results.length, 3);
    // Results must be in order: m.txt lines 2/3/4
    assert.deepStrictEqual(results[0].filePath.endsWith('m.txt'), true);
    assert.strictEqual(results[0].lineNumber, 2);
  } finally {
    await cleanup(dirPath);
  }
});

test('searcher.js: filters files using filePattern', async (t) => {
  const { dirPath } = await setupFilestructure({
    'x.md': 'match\none',
    'y.txt': 'match',
    'a.log': 'skip',
    'docs/z.md': 'match',
  });
  try {
    // Only search *.md
    const results = await search({ query: 'match', path: dirPath, filePattern: '*.md' });
    assert.deepStrictEqual(
      results.map(r => path.basename(r.filePath)).sort(),
      ['x.md', 'z.md']
    );
  } finally {
    await cleanup(dirPath);
  }
});
