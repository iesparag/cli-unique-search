// lib/formatter.js
// Utilities for formatting search results, error, and info with ANSI colors.

// ANSI color codes
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  yellowBg: '\x1b[43m',
  red: '\x1b[31m',
};

/**
 * Colorizes the filepath and lineNumber in cyan, highlights query matches in lineContent with yellow BG.
 * @param {Array<{filePath:string, lineNumber:number, lineContent:string}>} results 
 * @param {string} query
 * @param {Object} opts
 *   - ignoreCase: boolean, if true, highlight insensitively
 * @returns {string} multiline colored string
 */
export function formatResults(results, query, opts = {}) {
  if (!Array.isArray(results) || results.length === 0) {
    return formatInfo(`No results found for query \"${query}\"`);
  }
  const { ignoreCase = false } = opts;
  return results.map(r => {
    const filePart = ANSI.cyan + r.filePath + ':' + r.lineNumber + ANSI.reset;
    const contentPart = highlightQuery(r.lineContent, query, { ignoreCase });
    return `${filePart}: ${contentPart}`;
  }).join('\n');
}

/**
 * Highlights all query substrings in a line (yellow background). If no query found, returns line as-is.
 * Case is controlled by ignoreCase.
 * @param {string} line
 * @param {string} query
 * @param {Object} opts {ignoreCase: boolean}
 * @returns {string}
 */
export function highlightQuery(line, query, { ignoreCase = false } = {}) {
  if (!query || typeof query !== 'string' || !line) return line;
  if (query.length === 0) return line;
  // Escape regex special characters in query for matching literal substring
  // Use character escaping for both bracketed and unbracketed chars
  // Fix regex escaping
  const queryEsc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let re;
  try {
    re = new RegExp(queryEsc, ignoreCase ? 'gi' : 'g');
  } catch {
    // Shouldn't happen, but fallback: don't highlight
    return line;
  }
  return line.replace(re, (m) => ANSI.yellowBg + ANSI.bold + m + ANSI.reset);
}

/**
 * Format error messages in red.
 * @param {string} msg
 * @returns {string}
 */
export function formatError(msg) {
  return `${ANSI.red}${msg}${ANSI.reset}`;
}

/**
 * Format info/warning message in yellow.
 * @param {string} msg
 * @returns {string}
 */
export function formatInfo(msg) {
  return `${ANSI.yellow}${msg}${ANSI.reset}`;
}
