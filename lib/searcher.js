// lib/searcher.js
// Implements the core recursive file traversal and search logic.
import { promises as fs } from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import readline from 'readline';
import glob from 'glob';

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

  // Step 1: Get all target files
  const files = await expandFiles(searchPath, filePattern);
  if (files.length === 0) return [];

  // Step 2: Scan each by line for matches
  const matches = [];
  const matcherQ = ignoreCase ? query.toLowerCase() : query;
  const matchFn =
    ignoreCase
      ? (line) => line.toLowerCase().includes(matcherQ)
      : (line) => line.includes(matcherQ);

  for (const filePath of files) {
    // Check: stop if we reached maxResults
    if (maxResults !== undefined && matches.length >= maxResults) break;
    try {
      const fileMatches = await searchFileLines({ filePath, matchFn, maxResultsLeft: maxResults !== undefined ? (maxResults - matches.length) : undefined });
      matches.push(...fileMatches);
    } catch (err) {
      // Ignore individual file errors (e.g., unreadable/binary/symlink)
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
    if (glob.hasMagic(filePattern) || filePattern !== '*.*') {
      // Try matching filePattern just against dirname
      const globSync = glob.globSync || glob.sync;
      const matches = globSync(filePattern, { cwd: path.dirname(searchPath), matchBase: true, absolute: true });
      if (matches.map(f => path.resolve(f)).includes(path.resolve(searchPath))) {
        return [searchPath];
      } else {
        return [];
      }
    }
    // fallback: *.* pattern matches any file
    return [searchPath];
  } else if (stat.isDirectory()) {
    // Use glob to recursively match files
    const rel = path.relative(process.cwd(), searchPath).replace(/\\/g, '/');
    const globPattern = path.posix.join(rel.length > 0 ? rel : '.', '**', filePattern);
    const globFunc = glob.glob || glob;
    return await new Promise((resolveGlob, reject) => {
      globFunc(
        globPattern,
        { nodir: true, absolute: true },
        (err, matches) => err ? reject(err) : resolveGlob(matches)
      );
    });
  } else {
    throw new Error(`Path must be a file or directory: ${searchPath}`);
  }
}

// Helper: scan a single file line by line, return matching results
async function searchFileLines({ filePath, matchFn, maxResultsLeft }) {
  const results = [];
  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let lineNumber = 0;
  let done = false;
  rl.on('error', (err) => {
    done = true;
    rl.close();
    stream.destroy();
  });

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
