#!/usr/bin/env node
import minimist from 'minimist';
import { resolve } from 'path';
import process from 'process';
import { search } from '../lib/searcher.js';
import { filterUnique } from '../lib/uniqueness.js';

const USAGE = `\ncli-unique-search\nA unique, configurable CLI text search tool.\n\nUsage:\n  unique-search --query <search string> --path <directory or file> [--unique-key line|fileLine]\n\nOptions:\n  --query         REQUIRED: Text to search for\n  --path          REQUIRED: Directory or file path to search [default: .]\n  --unique-key    Uniqueness mode: 'line' (by line), or 'fileLine' (by file+line) [default: line]\n  --help          Show this help message\n\nExample:\n  unique-search --query "hello" --path ./docs --unique-key fileLine\n`;

const UNIQUE_KEYS = ["line", "fileLine"];

/**
 * Prints usage help to stderr
 */
function printUsage() {
  process.stderr.write(USAGE);
}

/**
 * Validate CLI arguments. Returns opts for search and uniqueness, or prints error and exits.
 */
function parseAndValidateArgs(argv) {
  const args = minimist(argv.slice(2), {
    string: ["query", "path", "unique-key"],
    boolean: ["help"],
    alias: {},
    default: {
      path: ".",
      "unique-key": "line"
    },
    unknown: (arg) => {
      // Early fail on unknown future flags
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

  // path is not required to exist at this stage; just normalize
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

  return {
    query: args.query,
    path: searchPath,
    uniqueKey
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
      const { query, path, uniqueKey } = parseAndValidateArgs(process.argv);
      // Search files for matches
      const rawResults = await search({ query, path });
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

// Minimal test for CLI parser with unique-key (run by 'npm test')
if (process.env.NODE_ENV === "test" || process.env.TEST_CLI_UNIQUE_SEARCH === "1") {
  import('node:assert').then(({ default: assert }) => {
    // Test valid parse
    const args = ["node", "cli.js", "--query", "hello", "--path", "./test-path"];
    const { query, path, uniqueKey } = parseAndValidateArgs(args);
    assert.strictEqual(query, "hello");
    assert.ok(path.endsWith("test-path"));
    assert.strictEqual(uniqueKey, "line");
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
  });
}
