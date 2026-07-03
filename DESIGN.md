# Design analysis

# Design Analysis for Project: "ek unique kuch bnao search kro" (Domain: CLI tools)

---

## 1. Restated Requirements, Project Type, and Assumptions

**Original user request:**  
> "ek unique kuch bnao search kro"  
(Translation: "Make something unique, do a search")

**Domain:** CLI tools

### Interpretation and restatement

- The user wants a **CLI tool** that provides **a unique search functionality**.
- The phrase "ek unique kuch bnao" means "make something unique" — this suggests the tool should produce or leverage something unique, possibly from search results.
- "search kro" means "do a search" — so the core feature is search.
- Given this is in CLI tools domain and the brief is very minimal, the challenge is to build a **unique CLI search utility** that stands out compared to typical search tools.
  
### Assumptions

- The tool will be run locally in a terminal.
- The search will be performed on **some textual data source** (files, web search, or internal database).
- The "unique" aspect could mean **returning unique search results**, **generating unique queries**, or **providing an unusual search experience**.
- Since no data source is specified, the most straightforward is a **local text search in user-supplied files or directories**.
- CLI interface only; no frontend or backend server. Everything runs locally.
- Tool should be useful, reasonably fast, and reasonably user-friendly on CLI.

### Project Type

- **CLI tool only**, no frontend UI, no backend service.

---

## 2. Core Domain Entities and Data Model

Since this is a CLI tool for searching, the domain entities are minimal:

| Entity           | Description                                        | Fields / Attributes             |
|------------------|--------------------------------------------------|--------------------------------|
| **SearchQuery**  | User's input query string                          | `query: string`                |
| **SearchTarget** | Targets to search within; file(s) or directory    | `path: string`                 |
| **SearchResult** | Matching lines or entries found                    | `filePath: string`             |
|                  |                                                  | `lineNumber: number`           |
|                  |                                                  | `lineContent: string`          |
|                  | Unique identifier for result (file + lineNumber) |                                |

No persistent data storage is expected.

---

## 3. Architecture

### Components

- **CLI Interface**: Entry point, argument parsing, user interaction.
- **Searcher Module**: Core search logic on files.
- **Uniqueness Module**: Filter or transform results to ensure uniqueness.
- **Output Formatter**: Displays results nicely on terminal.

### Folder structure (suggested)

```
/cli-unique-search
  /bin
    cli.js                # CLI entry point script
  /lib
    searcher.js           # Search logic
    uniqueness.js         # Logic to ensure uniqueness
    formatter.js          # Output formatting
  /test
    searcher.test.js
    uniqueness.test.js
  package.json
  README.md
```

### Data flow

1. User runs `cli.js` with parameters (e.g., query, target path).
2. CLI parses params, passes to `searcher.js`.
3. `searcher.js` reads files matching target path, applies search filter.
4. Results passed to `uniqueness.js` to filter or aggregate unique results.
5. `formatter.js` outputs results on CLI.

---

## 4. Key User Flows and API Surface

Because this is CLI, UX is via commands.

### User flow 1: Basic unique search

User runs:

```bash
unique-search --query "foo" --path ./docs/
```

- CLI loads files under `./docs`
- Finds all lines with substring "foo"
- Filters to unique lines (no duplicates)
- Prints results in format:

```
filepath:lineNumber: lineContent
```

### User flow 2: Additional options

- `--ignore-case`: Case insensitive search
- `--file-pattern`: Search only specific file types (e.g. `*.md`)
- `--max-results`: Limit number of results returned
- `--unique-key`: Define what "unique" means; e.g., unique by line content or unique by file + line

### CLI API Surface (options)

| Option         | Description                              | Required? | Default    |
|----------------|--------------------------------------  |-----------|------------|
| `--query`      | Search query string                     | Yes       | N/A        |
| `--path`       | Directory or file path to search        | Yes       | Current dir|
| `--ignore-case`| Case insensitive search flag             | No        | false      |
| `--file-pattern`| Glob pattern for filtering files       | No        | `*.*`      |
| `--max-results`| Maximum results to display               | No        | unlimited  |
| `--unique-key` | Uniqueness basis: `line`, `fileLine`     | No        | `line`     |

---

## 5. Edge Cases, Failure Modes, and Handling

| Case                           | Handling                                    | CLI States                         |
|--------------------------------|---------------------------------------------|----------------------------------|
| No query provided               | Show error message, usage help                | Error exit, print usage          |
| Path does not exist or no access| Show clear error message                       | Error                            |
| Path is file vs directory       | If file, search that file directly            | Proceed normally                 |
| No matching results             | Show "No results found" message                | Empty state                      |
| Huge files or many files        | Use streaming/line-by-line reading to avoid memory issue | Loading state (possibly spinner)|
| Binary files in search path     | Automatically skip or warn                      | Info message                    |
| Invalid glob in file-pattern    | Show error message                              | Error                           |
| `max-results` reached early     | Stop search early, show partial results        | Normal with notice              |
| Unicode/UTF-8 file issues       | Fail gracefully, or skip problem files          | Warning                        |

---

## 6. Security, Validation, and Configuration Concerns

- **Input validation** on CLI arguments:  
  - Disallow empty queries.  
  - Validate that `path` exists and is accessible.  
  - Validate `max-results` is positive integer.  
  - Validate `unique-key` is from allowed values.

- **File system access**:  
  - Use safe patterns to avoid injection or unsafe code execution — though CLI limited to local FS.

- **No remote code involved**, so minimal security risks.

- **Configuration**:  
  - Support environment variables for default params (optional, e.g., default path).  
  - Allow user config file (optional stretch).

---

## 7. Testing Strategy

- **Unit tests**:

  - Searcher module: Test searching single/multiple files, case sensitivity, file pattern filter.
  - Uniqueness module: Test duplicate detection and filtering.
  - Formatter: Test output formatting with sample data.

- **Integration tests**:

  - Simulate command-line calls with various parameters on sample files.
  - Test error cases (missing query, no results, invalid paths).

- **CLI build**:

  - Ensure CLI parses all arguments correctly.
  - Ensure help/usage output is clean.
  - Linting and build passes (if compiled or bundled).

---

## 8. Ordered Incremental Build Approach

1. **Basic CLI Setup + Argument Parsing**  
   - Implement minimal CLI with `--query` and `--path`.  
   - Validate inputs, print usage info.

2. **Implement Core Search Logic (Searcher Module)**  
   - Recursive directory traversal, read files line by line.  
   - Search lines containing query string, case sensitive.  
   - Output raw matches to console.

3. **Add Uniqueness Filtering**  
   - Remove duplicate lines from search results (keep first occurrences).

4. **Enhance CLI Options**  
   - Add `--ignore-case`, `--file-pattern`, `--max-results`, `--unique-key`.  
   - Implement corresponding logic in searcher/uniqueness modules.

5. **Output Formatting and UX polish**  
   - Clean CLI output, colorize if reasonable.  
   - "No results" message, error messages.

6. **Robustness & Edge cases**  
   - Handle binary files, huge files, missing paths gracefully.

7. **Testing suite**  
   - Add comprehensive unit and integration tests.

8. **Documentation and packaging**  
   - Write README, CLI usage examples.  
   - Add npm scripts if applicable.

---

# Summary

This CLI tool will accept a query and a path, perform a local file-based text search with options for uniqueness and filters, and display unique results. The emphasis is on meaningful uniqueness, usability, robust CLI behavior, and good developer experience through tests and clear errors. This design honors the original brief and the CLI tool domain precisely.
