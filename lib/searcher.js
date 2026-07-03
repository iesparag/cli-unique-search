// lib/searcher.js
// Implements the core recursive file traversal and search logic with robust binary, invalid path, and glob error handling.
import { promises as fs } from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import readline from 'readline';
import glob from 'glob';
import { formatInfo, formatError } from './formatter.js';

const BINARY_CHECK_BYTES = 4096; // 4KB sample for heuristic

/**
 * Search for query in files under a given path (recursively if directory).
 *
 * @param {Object} opts
 *  - query: String to search for (substring match)
 *  - path: File or directory path to search
 *  - ignoreCase: Whether to match case-insensitively (default: false)
 *  - filePattern: Glob pattern for file matching (default: '*.*')
 *  - maxResults: Limit the number of matches to return (default: unlimited)
 * @returns {Promise<Array<{filePath:string, lineNumber:number, lineContent:string}>>}
 */
export async function search({
  query,
  path: searchPath,
  ignoreCase = false,
  filePattern = '*.*',
  maxResults = undefined
} = {}) {
  if (!query || typeof query !== 'string' || !searchPath || typeof searchPath !== 'string') {
    throw new TypeError('query and path are required');
  }
  if (typeof ignoreCase !== 'boolean') {
    throw new TypeError('ignoreCase must be boolean');
  }
  if (filePattern === undefined || typeof filePattern !== 'string' || filePattern.trim() === '') {
    throw new TypeError('filePattern must be a non-empty string');
  }
  if (maxResults !== undefined && (!Number.isInteger(maxResults) || maxResults <= 0)) {
    throw new TypeError('maxResults must be a positive integer');
  }

  // Step 1: Get all target files, handling invalid glob pattern gracefully
  let files = [];
  try {
    files = await expandFiles(searchPath, filePattern);
  } catch (err) {
    if (err && (err.message?.includes('glob pattern') || err.message?.includes('pattern'))) {
      throw new Error(`Invalid glob pattern: ${filePattern}`);
    }
    if (err instanceof Error) throw err;
    throw new Error('Unknown error during file expansion');
  }
  if (files.length === 0) return [];

  // Step 2: Scan each file by line for match
  const matches = [];
  const matcherQ = ignoreCase ? query.toLowerCase() : query;
  const matchFn = ignoreCase ? (line) => line.toLowerCase().includes(matcherQ)
                            : (line) => line.includes(matcherQ);
  for (const filePath of files) {
    if (maxResults !== undefined && matches.length >= maxResults) break;

    let binary = false;
    try {
      binary = await isBinaryFile(filePath);
    } catch (err) {
      process.stderr.write(formatError(`Warning: Could not check if file is binary: ${filePath}: ${err.message}\n`));
      continue;
    }
    if (binary) {
      process.stderr.write(formatInfo(`Skipped binary file: ${filePath}\n`));
      continue;
    }

    try {
      const fileMatches = await searchFileLines({ filePath, matchFn, maxResultsLeft: maxResults !== undefined ? (maxResults - matches.length) : undefined });
      matches.push(...fileMatches);
    } catch (err) {
      process.stderr.write(formatError(`Warning: Could not read file: ${filePath}: ${err.message}\n`));
      continue;
    }
  }
  return maxResults !== undefined ? matches.slice(0, maxResults) : matches;
}

// Helper: recursively expand files from given path, filter by glob pattern
async function expandFiles(searchPath, filePattern) {
  let stat;
  try {
    stat = await fs.stat(searchPath);
  } catch (err) {
    throw new Error(`Path not found or unreadable: ${searchPath}`);
  }
  if (stat.isFile()) {
    // If the file matches filePattern, keep; else empty
    const matchBase = true;
    let matches = [];
    // Support glob 10: import as default, no destructure
    if (glob.hasMagic(filePattern)) {
      try {
        matches = glob.sync(filePattern, { cwd: path.dirname(searchPath), matchBase, absolute: true });
      } catch (e) {
        throw new Error(`Invalid glob pattern: ${filePattern}`);
      }
      if (matches.map(f => path.resolve(f)).includes(path.resolve(searchPath))) {
        return [searchPath];
      } else {
        return [];
      }
    } else {
      // filePattern is just a file basename; compare directly
      if (path.basename(searchPath) === filePattern || filePattern === '*.*') {
        return [searchPath];
      } else {
        return [];
      }
    }
  } else if (stat.isDirectory()) {
    // Use glob to recursively match files
    const rel = path.relative(process.cwd(), searchPath).replace(/\\/g, '/');
    const base = rel.length > 0 ? rel : '.';
    const globPattern = path.posix.join(base, '**', filePattern);
    return await new Promise((resolveGlob, reject) => {
      glob(
        globPattern,
        { nodir: true, absolute: true },
        (err, matches) => err ? reject(new Error(`Invalid glob pattern: ${filePattern}`)) : resolveGlob(matches)
      );
    });
  } else {
    throw new Error(`Path must be a file or directory: ${searchPath}`);
  }
}

// Helper: scan a single file line by line, return matching results, streaming for large files
async function searchFileLines({ filePath, matchFn, maxResultsLeft }) {
  const results = [];
  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let lineNumber = 0;
  try {
    for await (const line of rl) {
      lineNumber++;
      if (matchFn(line)) {
        results.push({ filePath, lineNumber, lineContent: line });
        if (maxResultsLeft !== undefined && results.length >= maxResultsLeft) {
          break;
        }
      }
    }
  } catch (err) {
    throw new Error(`Failed to read file: ${filePath} - ${err.message}`);
  } finally {
    rl.close();
    stream.destroy();
  }
  return results;
}

/**
 * Heuristic: Check if file at filePath is likely to be binary.
 * Returns true if appears binary, else false.
 * Throws if file unreadable.
 */
async function isBinaryFile(filePath) {
  // Read first N bytes and check for nulls or significant non-text
  const fh = await fs.open(filePath, 'r');
  try {
    // make a Node.js Buffer
    const buf = Buffer.alloc(BINARY_CHECK_BYTES);
    const { bytesRead } = await fh.read(buf, 0, BINARY_CHECK_BYTES, 0);
    // Textual heuristic: if any null byte, or >30% bytes not printable, treat as binary.
    let nulls = 0;
    let weird = 0;
    for (let i = 0; i < bytesRead; ++i) {
      const c = buf[i];
      if (c === 0) { nulls++; continue; }
      // Allow: tab (9), LF (10), CR (13), ESC (27), printable ASCII (32-126), DEL (127, rarely)
      if (c < 7 || (c > 13 && c < 32) || c > 127) weird++;
    }
    const nullPct = nulls / (bytesRead || 1);
    const weirdPct = weird / (bytesRead || 1);
    return (nullPct > 0.01) || (weirdPct > 0.3);
  } finally {
    await fh.close();
  }
}
