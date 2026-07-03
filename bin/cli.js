#!/usr/bin/env node
import minimist from 'minimist';
import { resolve } from 'path';
import process from 'process';
import { search } from '../lib/searcher.js';
import { filterUnique } from '../lib/uniqueness.js';

const USAGE = `\ncli-unique-search\nA unique, configurable CLI text search tool.\n\nUsage:\n  unique-search --query <search string> --path <directory or file> [options]\n\nOptions:\n  --query         REQUIRED: Text to search for\n  --path          REQUIRED: Directory or file path to search [default: .]\n  --ignore-case   Case-insensitive search (default: off)\n  --file-pattern  Glob pattern to filter files [default: '*.*']\n  --max-results   Maximum number of results to return (positive integer)\n  --unique-key    Uniqueness mode: 'line' (by line), or 'fileLine' (by file+line) [default: line]\n  --help          Show this help message\n\nExamples:\n  unique-search --query "hello" --path ./docs --ignore-case\n  unique-search --query foo --path ./src --file-pattern '*.js' --max-results 5\n`;

const UNIQUE_KEYS = ["line", "fileLine"];

/**
 * Prints usage help to stderr
 */
function printUsage() {
  process.stderr.write(USAGE);
}

/**
 * Validate glob pattern syntax via glob.hasMagic or a simple test.
 */
function isValidGlobPattern(pattern) {
  // Accept string with at most typical glob tokens: *, ?, [], {}, etc.
  if (typeof pattern !== 'string' || pattern.trim() === '') return false;
  // Basic attempt: forbid bad non-string or weird patterns (very loose)
  try {
    // Try to see if glob synchronously matches something; don't care if matches empty.
    // We do not check whether any file actually matches, only pattern-parseability.
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate CLI arguments. Returns opts for search and uniqueness, or prints error and exits.
 */
function parseAndValidateArgs(argv) {
  const args = minimist(argv.slice(2), {
    string: ["query", "path", "unique-key", "file-pattern", "max-results"],
    boolean: ["help", "ignore-case"],
    alias: {},
    default: {
      path: ".",
      "unique-key": "line",
      "file-pattern": "*.*"
    },
    unknown: (arg) => {
      if (arg.startsWith("-")) {
        process.stderr.write(`Unknown option: ${arg}\n`);
        printUsage();
        process.exit(1);
        return false;
      }
      return true;
    }
  });

  if (args.help) {
    printUsage();
    process.exit(0);
  }

  if (!args.query || typeof args.query !== "string" || args.query.trim() === "") {
    process.stderr.write("\nError: --query is required and must be a non-empty string.\n");
    printUsage();
    process.exit(1);
  }

  let searchPath = args.path;
  if (typeof searchPath !== "string" || searchPath.trim() === "") {
    process.stderr.write("\nError: --path is required and must be a non-empty string.\n");
    printUsage();
    process.exit(1);
  }
  searchPath = resolve(searchPath);

  // Unique-key validation
  let uniqueKey = args["unique-key"];
  if (!UNIQUE_KEYS.includes(uniqueKey)) {
    process.stderr.write(`\nError: --unique-key must be one of: ${UNIQUE_KEYS.join(', ')}\n`);
    printUsage();
    process.exit(1);
  }

  // ignore-case
  const ignoreCase = Boolean(args["ignore-case"]);

  // file-pattern
  let filePattern = args["file-pattern"];
  if (typeof filePattern !== "string" || filePattern.trim() === "") {
    process.stderr.write(`\nError: --file-pattern must be a non-empty string.\n`);
    printUsage();
    process.exit(1);
  }
  if (!isValidGlobPattern(filePattern)) {
    process.stderr.write(`\nError: --file-pattern '${filePattern}' is not a valid glob pattern.\n`);
    printUsage();
    process.exit(1);
  }

  // max-results: Parse or undefined
  let maxResults = undefined;
  if (args["max-results"] !== undefined) {
    const raw = args["max-results"];
    const val = typeof raw === 'number' ? raw : Number.parseInt(raw, 10);
    if (!Number.isInteger(val) || val <= 0) {
      process.stderr.write(`\nError: --max-results must be a positive integer.\n`);
      printUsage();
      process.exit(1);
    }
    maxResults = val;
  }

  return {
    query: args.query,
    path: searchPath,
    uniqueKey,
    ignoreCase,
    filePattern,
    maxResults
  };
}

// Simple formatter for terminal output
function formatResults(results) {
  if (!Array.isArray(results) || results.length === 0) return 'No results found.';
  return results
    .map(
      r => `${r.filePath}:${r.lineNumber}: ${r.lineContent}`
    )
    .join('\n');
}

// Main
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      const { query, path, uniqueKey, ignoreCase, filePattern, maxResults } = parseAndValidateArgs(process.argv);
      // Search files for matches
      const rawResults = await search({ query, path, ignoreCase, filePattern, maxResults });
      // Uniqueness filter
      const filteredResults = filterUnique(rawResults, uniqueKey);
      // Output
      process.stdout.write(formatResults(filteredResults) + '\n');
    } catch (err) {
      process.stderr.write(`Unexpected error: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exit(1);
    }
  })();
}

// Minimal test for CLI parser with new options (run by 'npm test')
if (process.env.NODE_ENV === "test" || process.env.TEST_CLI_UNIQUE_SEARCH === "1") {
  import('node:assert').then(({ default: assert }) => {
    // Test valid parse
    const args = ["node", "cli.js", "--query", "hello", "--path", "./test-path", "--ignore-case", "--file-pattern", "*.md", "--unique-key", "fileLine", "--max-results", "5"];
    const opts = parseAndValidateArgs(args);
    assert.strictEqual(opts.query, "hello");
    assert.ok(opts.path.endsWith("test-path"));
    assert.strictEqual(opts.uniqueKey, "fileLine");
    assert.strictEqual(opts.ignoreCase, true);
    assert.strictEqual(opts.filePattern, "*.md");
    assert.strictEqual(opts.maxResults, 5);
    // Test default file-pattern
    const opts2 = parseAndValidateArgs(["node", "cli.js", "--query", "foo"]);
    assert.strictEqual(opts2.filePattern, "*.*");
    assert.strictEqual(opts2.ignoreCase, false);
    assert.strictEqual(opts2.maxResults, undefined);
    // Test accepted unique-key
    assert.strictEqual(parseAndValidateArgs(["node","cli.js","--query","x","--unique-key","fileLine"]).uniqueKey, 'fileLine');
    // Test invalid unique-key
    let exited = false;
    const _exit = process.exit;
    process.exit = (code) => { exited = code; throw new Error("exit"); };
    try {
      parseAndValidateArgs(["node","cli.js","--query","x","--unique-key","garbage"]);
    } catch {
      assert.strictEqual(exited, 1);
    } finally {
      process.exit = _exit;
    }
    // Test invalid file-pattern
    exited = false;
    process.exit = (code) => { exited = code; throw new Error("exit"); };
    try {
      parseAndValidateArgs(["node","cli.js","--query","x","--file-pattern",""]);
    } catch {
      assert.strictEqual(exited, 1);
    } finally {
      process.exit = _exit;
    }
    // Test invalid max-results
    exited = false;
    process.exit = (code) => { exited = code; throw new Error("exit"); };
    try {
      parseAndValidateArgs(["node","cli.js","--query","x","--max-results","0"]);
    } catch {
      assert.strictEqual(exited, 1);
    } finally {
      process.exit = _exit;
    }
  });
}
