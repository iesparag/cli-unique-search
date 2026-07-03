# cli-unique-search

A unique, configurable CLI tool for text search, letting you scan directories or files for matches, filter for unique lines or locations, and see readable, useful output in your terminal.

---

## Features

- Easy CLI: Search a string across files/directories
- Flexible options:
  - Case sensitivity (`--ignore-case`)
  - File pattern glob filtering (`--file-pattern`)
  - Limit max results (`--max-results`)
  - Uniqueness control (`--unique-key`)
- Meaningful input validation & helpful error messages
- Friendly usage and help output

---

## Getting Started

### 1. Install dependencies

```
npm install
```

### 2. Run via CLI

You can run the tool with:

```
node ./bin/cli.js --query "search word" --path ./some-folder
```

Or (for global use):

```
npm install -g .
unique-search --query "search word" --path ./some-folder
```

### 3. Example Usage

#### Case-insensitive search

```
unique-search --query TODO --path ./src --ignore-case
```
_Search for "TODO" in all files in ./src, matching all case variations._

#### Filter by file type

```
unique-search --query "fixme" --file-pattern "*.js" --path ./lib
```
_Search only in .js files in lib/ for "fixme"._

#### Limit maximum results returned

```
unique-search --query "error" --path ./logs --max-results 5
```
_Only the first 5 matching lines will be shown._

#### Uniqueness option (by file+line)

```
unique-search --query "foo" --unique-key fileLine --path ./docs
```
_Filter unique matches by file and line number._

#### Multiple options

```
unique-search --query warning --ignore-case --file-pattern "*.log" --max-results 10 --path ./my-logs
```

---

## CLI Usage

```
unique-search --query <search string> --path <file or dir> [options]

Options:
  --query         REQUIRED: Text to search for
  --path          REQUIRED: Directory or file path to search [default: .]
  --ignore-case   Case-insensitive search (default: off)
  --file-pattern  Glob pattern to filter files [default: '*.*']
  --max-results   Maximum number of results to return (positive integer)
  --unique-key    Uniqueness mode: 'line' (by line), or 'fileLine' (by file+line) [default: line]
  --help          Show this help message

Examples:
  unique-search --query "hello" --path ./docs --ignore-case
  unique-search --query foo --path ./src --file-pattern '*.js' --max-results 5
```

---

## Scripts

- **npm test** – Runs parsing & validation tests for CLI arguments and search functionality

```
npm test
```

---

## Project Structure

- `bin/cli.js` – Main CLI entry, argument parsing, validation, and runs search/unique logic
- `lib/searcher.js` – File traversal and matching logic with new options
- `lib/uniqueness.js` – Filter unique results per chosen uniqueness key
- `test/` – Automated tests
- `.env.example` – template for any future environment variables

---

## Deployment

Backend-only CLI tool. No frontend.

---

## License
MIT
