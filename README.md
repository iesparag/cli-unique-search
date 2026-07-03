# cli-unique-search

A unique, configurable CLI tool for text search, letting you scan directories or files for matches, filter for unique lines or locations, and see readable, useful output in your terminal.

---

## Features (Initial Version)

- Easy CLI: Search for a string across files/directories
- Argument parsing and validation (`--query`, `--path` required)
- Friendly usage and help output
- Foundation for future extensions (file pattern, uniqueness logic, etc)

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

```
unique-search --query "TODO" --path ./src
```

You will see output like:

```
Query: TODO
Path: /your/full/path/to/src
```

If you miss a required argument, you'll see usage help.

### 4. CLI Usage

```
unique-search --query <search string> --path <file or dir>

Options:
  --query   REQUIRED: Text to search for
  --path    REQUIRED: Directory or file path to search [default: .]
  --help    Show help message
```

---

## Scripts

- **npm test** – Run a minimal CLI parsing test (passes if argument parsing and help/errors work)

```
npm test
```

---

## Project Structure

- `bin/cli.js` – Main CLI entry, argument parsing and validation
- `lib/` – (for core search/logic, WIP in later versions)
- `test/` – (future: automated tests)
- `.env.example` – template for any future environment variables

---

## License
MIT
