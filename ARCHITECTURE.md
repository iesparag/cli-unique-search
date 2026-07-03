# Architecture

### Components

- CLI Interface (bin/cli.js): argument parsing, command line interaction, validation.
- Searcher Module (lib/searcher.js): recursive file traversal, file reading line-by-line, query matching with ignore-case and file-pattern filtering.
- Uniqueness Module (lib/uniqueness.js): filter search results by uniqueness key (line content or file+line).
- Formatter Module (lib/formatter.js): format and colorize output to terminal, show messages (errors, no results).

### Folder Tree

```
/cli-unique-search
  /bin
    cli.js
  /lib
    searcher.js
    uniqueness.js
    formatter.js
  /test
    searcher.test.js
    uniqueness.test.js
    formatter.test.js
  package.json
  README.md
  .gitignore
  .env.example
```

### Data Flow

1. User runs CLI with options (--query, --path, etc).
2. CLI validates inputs, sets configs, passes parameters to Searcher.
3. Searcher walks directory/files, reads lines, finds matches according to options.
4. Search results go to Uniqueness module to filter duplicates based on user selection.
5. Results passed to Formatter for terminal display.
6. CLI prints output or error/empty messages.

### Key Design Decisions

- Use native Node streams and readline for memory efficiency on large files.
- Support glob file pattern matching with 'glob' npm package.
- Simple CLI argument parsing with 'minimist' for minimal dependencies.
- Unique filtering done via fast in-memory Set-based logic.
- Colorized output with ANSI codes with fallback plain text.
- Strict input validation with friendly messages and exit codes.

This design ensures fast, robust, user-friendly CLI tool focusing on uniqueness filtering and advanced search options.
