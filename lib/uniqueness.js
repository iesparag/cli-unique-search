// lib/uniqueness.js
// Uniqueness filtering for search results
/**
 * Filter an array of search results for uniqueness, using the given key mode.
 * @param {Array<{filePath:string, lineNumber:number, lineContent:string}>} results 
 * @param {'line'|'fileLine'} keyMode
 *   'line' -> unique by lineContent (across all files)
 *   'fileLine' -> unique by (filePath + lineNumber)
 * @returns filtered array (order preserved: keeps first occurrence)
 */
export function filterUnique(results, keyMode = 'line') {
  if (!Array.isArray(results)) throw new TypeError("results must be array");
  if (keyMode !== 'line' && keyMode !== 'fileLine')
    throw new Error("Invalid keyMode: must be 'line' or 'fileLine'");
  const seen = new Set();
  const toKey =
    keyMode === 'line'
      ? r => r.lineContent
      : r => `${r.filePath}\u0000${r.lineNumber}`;
  const filtered = [];
  for (const r of results) {
    // Defensive: ensure all fields present
    if (!r || typeof r.lineContent !== 'string' ||
        (keyMode === 'fileLine' && (typeof r.filePath !== 'string' || typeof r.lineNumber !== 'number')))
      continue;
    const key = toKey(r);
    if (!seen.has(key)) {
      seen.add(key);
      filtered.push(r);
    }
  }
  return filtered;
}
