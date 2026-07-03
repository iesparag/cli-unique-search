#!/usr/bin/env node
import minimist from 'minimist';
import { resolve } from 'path';
import process from 'process';
import { search } from '../lib/searcher.js';
import { filterUnique } from '../lib/uniqueness.js';
import { formatResults, formatError, formatInfo } from '../lib/formatter.js';

const USAGE = `\ncli-unique-search\nA unique, configurable CLI text search tool.\n\nUsage:\n  unique-search --query <search string> --path <directory or file> [options]\n\nOptions:\n  --query         REQUIRED: Text to search for\n  --path          REQUIRED: Directory or file path to search [default: .]\n  --ignore-case   Case-insensitive search (default: off)\n  --file-pattern  Glob pattern to filter files [default: '*.*']\n  --max-results   Maximum number of results to return (positive integer)\n  --unique-key    Uniqueness mode: 'line' (by line), or 'fileLine' (by file+line) [default: line]\n  --help          Show this help message\n\nNotes:\n  - Binary files are automatically skipped with a warning.\n  - Invalid glob patterns or unreadable paths produce informative errors.\n\nExamples:\n  unique-search --query "hello" --path ./docs --ignore-case\n  unique-search --query foo --path ./src --file-pattern '*.js' --max-results 5\n`;

const UNIQUE_KEYS = ["line", "fileLine"];

function printUsage() {
  process.stderr.write(USAGE);
}

function isValidGlobPattern(pattern) {
  if (typeof pattern !== 'string' || pattern.trim() === '') return false;
  return true;
}

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
        process.stderr.write(formatError(`Unknown option: ${arg}\n`));
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
    process.stderr.write(formatError("\nError: --query is required and must be a non-empty string.\n"));
    printUsage();
    process.exit(1);
  }

  let searchPath = args.path;
  if (typeof searchPath !== "string" || searchPath.trim() === "") {
    process.stderr.write(formatError("\nError: --path is required and must be a non-empty string.\n"));
    printUsage();
    process.exit(1);
  }
  searchPath = resolve(searchPath);

  let uniqueKey = args["unique-key"];
  if (!UNIQUE_KEYS.includes(uniqueKey)) {
    process.stderr.write(formatError(`\nError: --unique-key must be one of: ${UNIQUE_KEYS.join(', ')}\n`));
    printUsage();
    process.exit(1);
  }

  const ignoreCase = Boolean(args["ignore-case"]);

  let filePattern = args["file-pattern"];
  if (typeof filePattern !== "string" || filePattern.trim() === "") {
    process.stderr.write(formatError(`\nError: --file-pattern must be a non-empty string.\n`));
    printUsage();
    process.exit(1);
  }
  if (!isValidGlobPattern(filePattern)) {
    process.stderr.write(formatError(`\nError: --file-pattern '${filePattern}' is not a valid glob pattern.\n`));
    printUsage();
    process.exit(1);
  }

  let maxResults = undefined;
  if (args["max-results"] !== undefined) {
    const raw = args["max-results"];
    const val = typeof raw === 'number' ? raw : Number.parseInt(raw, 10);
    if (!Number.isInteger(val) || val <= 0) {
      process.stderr.write(formatError(`\nError: --max-results must be a positive integer.\n`));
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

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      const { query, path, uniqueKey, ignoreCase, filePattern, maxResults } = parseAndValidateArgs(process.argv);
      let rawResults;
      try {
        rawResults = await search({ query, path, ignoreCase, filePattern, maxResults });
      } catch (err) {
        if (err.message && err.message.includes('Invalid glob pattern')) {
          process.stderr.write(formatError(`Error: ${err.message}\n`));
          process.exit(1);
        }
        if (err.message && err.message.startsWith('Path not found')) {
          process.stderr.write(formatError(`Error: ${err.message}\n`));
          process.exit(1);
        }
        throw err;
      }
      const filteredResults = filterUnique(rawResults, uniqueKey);
      process.stdout.write(formatResults(filteredResults, query, { ignoreCase }) + '\n');
    } catch (err) {
      process.stderr.write(formatError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}\n`));
      process.exit(1);
    }
  })();
}

if (process.env.NODE_ENV === "test" || process.env.TEST_CLI_UNIQUE_SEARCH === "1") {
  import('node:assert').then(({ default: assert }) => {
    const args = ["node", "cli.js", "--query", "hello", "--path", "./test-path", "--ignore-case", "--file-pattern", "*.md", "--unique-key", "fileLine", "--max-results", "5"];
    const opts = parseAndValidateArgs(args);
    assert.strictEqual(opts.query, "hello");
    assert.ok(opts.path.endsWith("test-path"));
    assert.strictEqual(opts.uniqueKey, "fileLine");
    assert.strictEqual(opts.ignoreCase, true);
    assert.strictEqual(opts.filePattern, "*.md");
    assert.strictEqual(opts.maxResults, 5);
    const opts2 = parseAndValidateArgs(["node", "cli.js", "--query", "foo"]);
    assert.strictEqual(opts2.filePattern, "*.*");
    assert.strictEqual(opts2.ignoreCase, false);
    assert.strictEqual(opts2.maxResults, undefined);
    assert.strictEqual(parseAndValidateArgs(["node","cli.js","--query","x","--unique-key","fileLine"]).uniqueKey, 'fileLine');
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
    exited = false;
    process.exit = (code) => { exited = code; throw new Error("exit"); };
    try {
      parseAndValidateArgs(["node","cli.js","--query","x","--file-pattern",""]);
    } catch {
      assert.strictEqual(exited, 1);
    } finally {
      process.exit = _exit;
    }
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
