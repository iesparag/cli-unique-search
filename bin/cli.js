#!/usr/bin/env node
import minimist from 'minimist';
import { resolve } from 'path';
import process from 'process';

const USAGE = `\ncli-unique-search\nA unique, configurable CLI text search tool.\n\nUsage:\n  unique-search --query <search string> --path <directory or file>\n\nOptions:\n  --query   REQUIRED: Text to search for\n  --path    REQUIRED: Directory or file path to search [default: .]\n  --help    Show this help message\n\nExample:\n  unique-search --query "hello" --path ./docs\n`;

/**
 * Prints usage help to stderr
 */
function printUsage() {
  process.stderr.write(USAGE);
}

/**
 * Validate CLI arguments. Returns { query: string, path: string } or prints error and exits.
 */
function parseAndValidateArgs(argv) {
  const args = minimist(argv.slice(2), {
    string: ["query", "path"],
    boolean: ["help"],
    alias: {},
    default: {
      path: "."
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

  return {
    query: args.query,
    path: searchPath
  };
}

// Main
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const { query, path } = parseAndValidateArgs(process.argv);
    // For now, just echo back for demonstration
    console.log(`Query: ${query}\nPath: ${path}`);
  } catch (err) {
    process.stderr.write(`Unexpected error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
}

// Minimal test for CLI parser as per initial requirements (run by 'npm test')
if (process.env.NODE_ENV === "test" || process.env.TEST_CLI_UNIQUE_SEARCH === "1") {
  import('node:assert').then(({ default: assert }) => {
    // Test valid parse
    const args = ["node", "cli.js", "--query", "hello", "--path", "./test-path"];
    const { query, path } = parseAndValidateArgs(args);
    assert.strictEqual(query, "hello");
    assert.ok(path.endsWith("test-path"));
    // Test missing query
    let exited = false;
    const _exit = process.exit;
    process.exit = (code) => { exited = code; throw new Error("exit"); };
    try {
      parseAndValidateArgs(["node", "cli.js", "--path", "foo"]);
    } catch {
      assert.strictEqual(exited, 1);
    } finally {
      process.exit = _exit;
    }
    // Test help flag
    exited = false;
    process.exit = (code) => { exited = code; throw new Error("exit"); };
    try {
      parseAndValidateArgs(["node", "cli.js", "--help"]);
    } catch {
      assert.strictEqual(exited, 0);
    } finally {
      process.exit = _exit;
    }
  });
}
