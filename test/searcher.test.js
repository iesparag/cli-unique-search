// test/searcher.test.js
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { test } from 'node:test';
import { search } from '../lib/searcher.js';

// Helper: create tmp test files/dirs with content, return {dirPath, filePaths: [abs]}
async function setupFilestructure(filesMap, binaryFiles = {}) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cus-test-'));
  const absPaths = [];
  // filesMap: {'sub/file.txt': 'content'}
  for (const [rel, content] of Object.entries(filesMap)) {
    const abs = path.join(tmpDir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf8');
    absPaths.push(abs);
  }
  // binaryFiles: {'file.bin': Uint8Array}
  for (const [rel, buffer] of Object.entries(binaryFiles)) {
    const abs = path.join(tmpDir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, buffer);
    absPaths.push(abs);
  }
  return { dirPath: tmpDir, filePaths: absPaths };
}

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
    assert.strictEqual(res.length, 0);
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
    const results = await search({ query: 'foo', path: dirPath, maxResults: 3 });
    assert.strictEqual(results.length, 3);
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
    const results = await search({ query: 'match', path: dirPath, filePattern: '*.md' });
    assert.deepStrictEqual(
      results.map(r => path.basename(r.filePath)).sort(),
      ['x.md', 'z.md']
    );
  } finally {
    await cleanup(dirPath);
  }
});

test('searcher.js: skips binary files and outputs warning', async (t) => {
  const binContent = Buffer.from([0, 159, 146, 150, 0, 33, 42]);
  const { dirPath } = await setupFilestructure({
    'text.txt': 'match\nhere',
    'other.txt': 'irrelevant',
    'ignore.me': 'nothing',
  }, {'bin.dat': binContent});
  try {
    let messages = '';
    const origStderr = process.stderr.write;
    process.stderr.write = (chunk) => { messages += chunk; return true; };

    const results = await search({ query: 'match', path: dirPath });
    process.stderr.write = origStderr;

    assert(results.some(r => path.basename(r.filePath) === 'text.txt'));
    assert(results.every(r => path.basename(r.filePath) !== 'bin.dat'));
    assert(messages.includes('Skipped binary file'));
    assert(messages.includes('bin.dat'));
  } finally {
    await cleanup(dirPath);
  }
});

test('searcher.js: handles invalid path error', async (t) => {
  let error = null;
  try {
    await search({ query: 'foo', path: '/does-not-exist-xxx' });
  } catch (err) {
    error = err;
  }
  assert(error instanceof Error);
  assert(error.message.includes('not found'));
});

test('searcher.js: handles invalid glob pattern', async (t) => {
  const { dirPath } = await setupFilestructure({ 'a.txt': 'foo' });
  try {
    let error = null;
    try {
      await search({ query: 'foo', path: dirPath, filePattern: '[[' });
    } catch (err) {
      error = err;
    }
    assert(error instanceof Error);
    assert(error.message.toLowerCase().includes('glob pattern'));
  } finally{
    await cleanup(dirPath);
  }
});
