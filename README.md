# cli-unique-search

A unique, configurable CLI tool for text search that scans local files or directories, filtering unique matches by line or file+line location. Flexible options allow matching file patterns, case-insensitive search, and limiting result counts. Output is readable, colorized, and designed for terminal use.

---

## Features

- **Efficient, local CLI search** across one file, many files, or entire directory trees
- **Uniqueness filtering**: by unique line content or unique file+line location
- **Glob file pattern matching**: search only certain types of files
- **Case-insensitive matching** (`--ignore-case`)
- **Limit maximum results** for faster scans on large codebases
- **Great terminal output**: colorized results and clear error/warning/info messages
- **Skips binary files** automatically with a warning
- **Robust input validation** and helpful usage/errors
- **Works on Windows, Mac, Linux; Node 18+; no noisy dependencies**

---

## Installation

### Local project usage

Clone or download this repository, then run:

```
npm install
```

You can then run the CLI as:

```
node ./bin/cli.js --query "my search" --path ./some-folder
```

### System-wide (global) usage

Install globally from the root of this repo:

```
npm install -g .
```

This globally exposes the `unique-search` command:

```
unique-search --query "something" --path ./src
```

---

## Full CLI Usage

```
unique-search --query <search string> --path <file or dir> [options]

Options:
  --query         REQUIRED: Text to search for (non-empty string)
  --path          REQUIRED: Directory or file path to search [default: .]
  --ignore-case   Case-insensitive search (default: off)
  --file-pattern  Glob pattern to filter files [default: '*.*']
  --max-results   Maximum number of results to return (positive integer)
  --unique-key    Uniqueness mode: 'line' (by line), or 'fileLine' (by file+line) [default: line]
  --help          Show this help message

Notes:
- Binary files are automatically skipped with a warning.
- Invalid glob patterns or unreadable paths produce informative errors.
- Result lines are colorized by file and by matched query for easy scanning.
- The CLI exits with non-zero codes on errors.

Examples:

# Search for 'todo' in all files in ./src, case-insensitive
unique-search --query "todo" --path ./src --ignore-case

# Search only in .js files
unique-search --query "fixme" --file-pattern "*.js" --path ./lib

# Limit results to first 5 unique lines
unique-search --query "err" --path ./logs --max-results 5

# Uniqueness by file+line (not just line content)
unique-search --query "foo" --unique-key fileLine --path ./docs

# All options at once
unique-search --query warning --ignore-case --file-pattern "*.log" --max-results 10 --path ./my-logs

---

## Uniqueness Modes Explained

- **--unique-key line (default):**
  - Each unique line content appears once, no matter which file it is found in or on what line.
  - Use if you want to de-duplicate by line, even if that line appears in multiple places.

- **--unique-key fileLine:**
  - Each unique occurrence by file _and_ line number is included, i.e., matching the same line content in two files or on two lines counts as different results.
  - Use if you want to see ALL places a line appears (including duplicates).

---

## Output Examples

### Colorful Results

```
[36msrc/utils.js:12[0m: Line with [43m[1mfoo[0m example
[36mlib/core.js:27[0m: Another [43m[1mfoo[0m instance
```

- **Filepath:line** is cyan
- **Query** is yellow with bold
- No results:

```
[33mNo results found for query "gibberish"[0m
```

- Skipped binary files:

```
[33mSkipped binary file: ./bin/image.dat[0m
```

- Errors:

```
[31mError: Path not found or unreadable: ./notapath[0m
```

---

## Error Messages & Troubleshooting

- **Missing required --query**:
  - Error: `--query is required and must be a non-empty string.`
- **Path not found or unreadable**:
  - Error: `Path not found or unreadable: <your-path>`
- **Invalid glob pattern**:
  - Error: `Invalid glob pattern: <your-pattern>`
- **Unsupported or unknown CLI option**:
  - Error: `Unknown option: --badoption`
- **Empty file pattern or unique key**:
  - Error: `--file-pattern must be a non-empty string.`
  - Error: `--unique-key must be one of: line, fileLine`
- **Max results not a positive integer**:
  - Error: `--max-results must be a positive integer.`

### Troubleshooting

- **No results**: Check your spelling, file pattern, and case-sensitivity
- **Binary file skipped**: The tool skips files that appear to be non-text
- **Permission errors**: Make sure you have read access to the searched directory
- **Invalid options**: Double-check usage and try `--help` for guidance
- **File pattern filtering off on single file**: Only files matching the glob are searched, even when pointing to a single file

---

## Environment Variables Support

This tool does not require any environment variables for normal usage.
- You may future-proof global defaults using a `.env` or environment variables if required. See `.env.example` for a template.

Set e.g. `DEFAULT_PATH` (not used by default, but code is structured to allow env var overrides in the future):

```
DEFAULT_PATH=~/my/code
```

---

## Development & Contribution Guidelines

1. Fork and clone this repo.
2. Run `npm install` to get dependencies.
3. Add new features or fix bugs in `lib/` or `bin/`.
4. Write tests in `test/` for new functionality.
5. Try `npm test` to verify correctness (requires Node 18+).
6. Submit a pull request with details and test output.

---

## Testing

Run the full test suite:

```
npm test
```

Tests cover searcher logic, uniqueness options, error handling, and formatting.

---

## Publishing (npm)

This CLI is ready for public npm deployment!

- **Ensure the following before publishing:**
  - Update your `package.json` with a new version number (Semantic Versioning: major.minor.patch)
  - Add/change keywords as needed in `package.json` for discoverability ([see below](#keywords))
  - Run all tests: `npm test` (should pass; see output)

**To publish:**

1. Login to npm: `npm login`
2. Publish: `npm publish --access public`

**After publish:** The CLI will be installable as `npm install -g cli-unique-search`.

### Versioning
- Use [SemVer](https://semver.org/) for releases, e.g., bump 0.1.0 → 0.1.1 for bugfixes.
- If adding new CLI options or breaking changes, bump minor/major version accordingly.

### Keywords
Add or update keywords in `package.json` to:
- `cli`
- `search`
- `text search`
- `deduplicate`
- `grep`
- `unique`
- `glob`
- `terminal`
- `filesystem search`

Example:

```json
"keywords": [
  "cli",
  "search",
  "text search",
  "deduplicate",
  "grep",
  "unique",
  "glob",
  "terminal",
  "filesystem search"
]
```

---

## Deployment

Backend-only CLI tool (runs locally). No frontend.

---

## One-click Deployment Buttons

Since this is a CLI tool (not web/HTTP), deployment is not to Railway/Vercel in the usual sense, but for documentation completeness:

### Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

**How to use:**
- Click the button above
- Select the repo: https://github.com/iesparag/cli-unique-search
- Set backend root directory to `backend/` if ever converted to a backend server (future scope)
- (No required env vars at this time. See `.env.example`.)

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/iesparag/cli-unique-search&root-directory=frontend)

- Currently not applicable for this CLI tool. Provided for completeness for future frontend extensions.

---

## Project Structure

```
cli-unique-search/
  bin/cli.js           # CLI entrypoint: argument parsing, program flow
  lib/searcher.js      # Core search logic
  lib/uniqueness.js    # Uniqueness filtering
  lib/formatter.js     # Output formatting
  test/                # Comprehensive tests (unit + integration)
  .env.example         # (Optional config example)
  package.json         # NPM metadata + scripts
  README.md            # This file
```

---

## Author and License

By [iesparag](https://github.com/iesparag). Licensed under the MIT license.
