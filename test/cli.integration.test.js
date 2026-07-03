// test/cli.integration.test.js
// Integration tests for bin/cli.js as a real CLI process
import assert from 'node:assert';
import { test, describe } from 'node:test';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

// Helper to create a test directory with files (and optional binary files)
async function setupFilestructure(filesMap, binaryFiles = {}) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cus-int-'));
  const absPaths = [];
  for (const [rel, content] of Object.entries(filesMap)) {
    const abs = path.join(tmpDir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf8');
    absPaths.push(abs);
  }
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

// Helper to run the actual CLI as a child process and get output
function runCli(args, opts = {}) {
  return new Promise((resolve, reject) => {
    const cliPath = path.resolve('./bin/cli.js');
    const proc = spawn(process.execPath, [cliPath, ...args], {
      env: { ...process.env, FORCE_COLOR: '1' },
      cwd: opts.cwd || process.cwd(),
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', chunk => { stdout += chunk; });
    proc.stderr.on('data', chunk => { stderr += chunk; });
    proc.on('error', reject);
    proc.on('close', code => {
      resolve({ code, stdout, stderr });
    });
  });
}

describe('CLI integration tests', (suite) => {
  test('Basic required args: finds query in directory, outputs colored results', async () => {
    const { dirPath } = await setupFilestructure({
      'a.txt': 'lorem\nfoo foo\nbar',
      'b.txt': 'nothing\nfoo',
      'sub/c.md': 'foo\nbaz',
      'd.bin': '',
    });
    try {
      // Should match in a.txt (line 2), b.txt (line 2), sub/c.md (line 1)
      const { code, stdout, stderr } = await runCli([
        '--query', 'foo', '--path', dirPath
      ]);
      // Should print three colored lines *without* errors
      assert.strictEqual(code, 0);
      assert(stdout.includes('\x1b[36m') && stdout.includes('foo') && stdout.includes('\x1b[43m'));
      assert(stdout.match(/: foo/));
      // No error
      assert.strictEqual(stderr, '');
    } finally {
      await cleanup(dirPath);
    }
  });

  test('Case-insensitive search', async () => {
    const { dirPath } = await setupFilestructure({
      'x.txt': 'Foo\nfOo\nxx',
    });
    try {
      const { code, stdout } = await runCli([
        '--query', 'foo', '--ignore-case', '--path', dirPath
      ]);
      assert.strictEqual(code, 0);
      assert((stdout.match(/\x1b\[43m\x1b\[1mFoo\x1b\[0m/g) || []).length === 1);
      assert((stdout.match(/\x1b\[43m\x1b\[1mfOo\x1b\[0m/g) || []).length === 1);
    } finally { await cleanup(dirPath); }
  });

  test('File pattern filter: only search certain files', async () => {
    const { dirPath } = await setupFilestructure({
      'x.md': 'target\none',
      'y.txt': 'target',
      'ignore.log': 'target',
      'sub/z.md': 'target',
      'no.txt': 'foo',
    });
    try {
      // Only .md files!
      const { code, stdout } = await runCli([
        '--query', 'target', '--path', dirPath, '--file-pattern', '*.md'
      ]);
      assert.strictEqual(code, 0);
      // Both x.md and z.md appear, y.txt does not
      assert(stdout.includes('x.md'));
      assert(stdout.includes('z.md'));
      assert(!stdout.includes('y.txt'));
      assert(!stdout.includes('ignore.log'));
    } finally {
      await cleanup(dirPath);
    }
  });

  test('Unique key fileLine returns distinct file+line', async () => {
    const { dirPath } = await setupFilestructure({
      'f1.txt': 'dupe\ndupe\nunique',
      'f2.txt': 'dupe\ndupe\nunique',
    });
    try {
      // Without unique-key:line (default) only two lines
      let { stdout } = await runCli([
        '--query', 'dupe', '--path', dirPath, '--unique-key', 'line'
      ]);
      assert(stdout.match(/dupe/g).length === 1);
      // With unique-key:fileLine keeps all file+line distinct
      let { stdout: out2 } = await runCli([
        '--query', 'dupe', '--path', dirPath, '--unique-key', 'fileLine'
      ]);
      assert(out2.match(/dupe/g).length === 4);
    } finally {
      await cleanup(dirPath);
    }
  });

  test('Respect max-results limit arg', async () => {
    const { dirPath } = await setupFilestructure({
      'x.txt': 'a\nb\nc\nd\ne'
    });
    try {
      const { stdout } = await runCli([
        '--query', 'b', '--path', dirPath, '--max-results', '1'
      ]);
      assert((stdout.match(/b/g) || []).length === 1);
    } finally { await cleanup(dirPath); }
  });

  test('Handles missing query parameter with usage and error', async () => {
    const { dirPath } = await setupFilestructure({ 'only.txt': 'yes' });
    try {
      const { code, stdout, stderr } = await runCli([
        '--path', dirPath
      ]);
      assert.notStrictEqual(code, 0);
      assert(stderr.includes('--query is required'));
      assert(stderr.includes('Usage:'));
      // No stdout
      assert.strictEqual(stdout, '');
    } finally { await cleanup(dirPath); }
  });

  test('Handles invalid path with error message', async () => {
    const { code, stderr } = await runCli([
      '--query', 'x', '--path', './not-apath-zzz'
    ]);
    assert.notStrictEqual(code, 0);
    assert(stderr.includes('not found'));
  });

  test('No results case prints yellow info message', async () => {
    const { dirPath } = await setupFilestructure({ 'f.txt': 'lorem' });
    try {
      const { code, stdout } = await runCli([
        '--query', 'nomatch', '--path', dirPath
      ]);
      assert(stdout.includes('No results found'));
      assert(stdout.includes('\x1b[33m'));
      assert.strictEqual(code, 0);
    } finally { await cleanup(dirPath); }
  });

  test('Skipping binary files emits warning', async () => {
    const bin = Buffer.from([0, 1, 2, 3, 4, 5, 6, 255, 254]);
    const { dirPath } = await setupFilestructure({ 'ok.txt': 'foo', 'bad.dat': '' }, { 'bin.bin': bin });
    try {
      const { stdout, stderr } = await runCli([
        '--query', 'foo', '--path', dirPath
      ]);
      assert(stdout.includes('foo'));
      assert(stderr.includes('Skipped binary file'));
      assert(stderr.includes('bin.bin'));
    } finally { await cleanup(dirPath); }
  });

  test('Help flag produces usage and exits 0', async () => {
    const { code, stdout, stderr } = await runCli(['--help']);
    assert.strictEqual(code, 0);
    assert(stdout.includes('Usage:'));
  });

  test('Rejects bad glob patterns with error', async () => {
    const { dirPath } = await setupFilestructure({'a.txt': 'foo' });
    try {
      const { code, stderr } = await runCli([
        '--query', 'foo', '--path', dirPath, '--file-pattern', '[['
      ]);
      assert.notStrictEqual(code, 0);
      assert(stderr.toLowerCase().includes('glob pattern'));
    } finally { await cleanup(dirPath); }
  });

  test('Unknown options cause error and usage', async () => {
    const { dirPath } = await setupFilestructure({'a.txt': 'foo'});
    try {
      const { code, stderr, stdout } = await runCli([
        '--query', 'foo', '--path', dirPath, '--notanoption'
      ]);
      assert.notStrictEqual(code, 0);
      assert(stderr.includes('Unknown option'));
      assert(stderr.includes('--notanoption'));
      assert(stderr.includes('Usage:'));
      assert.strictEqual(stdout, '');
    } finally { await cleanup(dirPath); }
  });

  test('max-results 0 or negative is rejected', async () => {
    const { dirPath } = await setupFilestructure({'one.txt': 'x'});
    try {
      const { code, stderr } = await runCli([
        '--query', 'x', '--path', dirPath, '--max-results', '0'] );
      assert.notStrictEqual(code, 0);
      assert(stderr.includes('--max-results must be a positive integer'));
    } finally { await cleanup(dirPath); }
  });

  test('Invalid unique-key is rejected', async () => {
    const { dirPath } = await setupFilestructure({ 'one.txt': 'x' });
    try {
      const { code, stderr } = await runCli([
        '--query', 'x', '--path', dirPath, '--unique-key', 'banana'] );
      assert.notStrictEqual(code, 0);
      assert(stderr.includes('--unique-key must be one of'));
    } finally { await cleanup(dirPath); }
  });

  test('file-pattern empty string is rejected', async () => {
    const { dirPath } = await setupFilestructure({ 'one.txt': 'x' });
    try {
      const { code, stderr } = await runCli([
        '--query', 'x', '--path', dirPath, '--file-pattern', ''] );
      assert.notStrictEqual(code, 0);
      assert(stderr.includes('--file-pattern must be a non-empty string'));
    } finally { await cleanup(dirPath); }
  });

});
