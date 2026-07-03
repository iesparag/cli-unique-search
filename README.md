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
- **Colorful and readable terminal output!**
- Skips binary files automatically with a warning; handles invalid paths and glob patterns gracefully
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

Notes:
  - Binary files are automatically skipped with a warning.
  - Invalid glob patterns or unreadable paths produce informative errors.

Examples:
  unique-search --query "hello" --path ./docs --ignore-case
  unique-search --query foo --path ./src --file-pattern '*.js' --max-results 5
```

---

## Colorful Output Demo

Below are examples of how the CLI output appears in the terminal with color formatting:

### Example: Result Output

```
[36msrc/utils.js:12[0m: Some line with [43m[1mfoo[0m in it
[36mlib/formatter.js:3[0m: Highlight [43m[1mfoo[0m and [43m[1mfoo[0m again
```

- **Filepath:lineNumber** is shown in cyan
- **Matching words** are shown with yellow background and bold.

### Example: No Results

```
[33mNo results found for query "missingWord"[0m
```

- Informational or no-results messages appear in yellow.

### Example: Error Message

```
[31mError: Path not found or unreadable: ./doesNotExist[0m
```

- Error messages are shown in red for maximum visibility.
- When binary files are skipped, a yellow info message is printed:

```
[33mSkipped binary file: ./bin/file.bin[0m
```

---

## Robustness & Error Handling

- Binary files (detected by sampling for null/non-ASCII bytes) are **skipped** automatically and a warning is issued in CLI output.
- **Large files** are streamed line-by-line; tool never loads the full file into memory.
- Invalid paths, unreadable files, and invalid glob patterns produce clear error messages and cause the program to exit with a non-zero code.

---

## Scripts

- **npm test** – Runs parsing & validation tests for CLI arguments and search functionality

```
npm test
```

---

## Project Structure

- `bin/cli.js` – Main CLI entry, argument parsing, validation, and runs search/unique logic
- `lib/searcher.js` – File traversal and matching logic (skips binaries, large files streamed, robust input)
- `lib/uniqueness.js` – Filter unique results per chosen uniqueness key
- `lib/formatter.js` – Output formatting with colors and messages
- `test/` – Automated tests
- `.env.example` – template for any future environment variables

---

## Deployment

Backend-only CLI tool. No frontend.

---

## License
MIT
