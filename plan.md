# Build plan

### Ordered Incremental Build Plan

1. **Project scaffolding, dependencies, and base setup**
   - Create package.json, folders, basic README, .gitignore, .env.example
   - Setup 'test' npm script with node --test
   - Implement basic CLI entry (bin/cli.js) parsing --query and --path, validate required inputs, print usage and error on missing

2. **Core Searcher module: directory traversal, file reading, basic substring search**
   - Recursively read files from path
   - Read line by line, case sensitive substring matching
   - Output raw matches (file, line number, line content) in tests

3. **Uniqueness filtering: dedupe results by line content (default)**
   - Implement uniqueness module: filter duplicate lines
   - Integrate into CLI to output unique matches only

4. **Enhance CLI options: --ignore-case, --file-pattern glob support, --max-results limit, --unique-key supporting `line` and `fileLine`**
   - Modify search and uniqueness accordingly
   - Validate CLI inputs

5. **Output formatting and UX polish**
   - Format output: `filepath:lineNumber: line`
   - Colorize matched line text and file/line info
   - Handle no-results message, errors colorfully

6. **Robustness: handle binary files (skip/warn), huge files (streaming), invalid file-pattern/glob errors, missing paths**
   - Add error handling and user notices

7. **Testing: comprehensive unit tests for searcher, uniqueness, formatter, and integration CLI tests**
   - Cover edge cases and error conditions

8. **Documentation and deployment instructions**
   - Complete README with usage examples
   - No deployment config needed (CLI tool)
   - Ensure npm package usage instructions

Each step delivers a full end-to-end feature with code, validation, and tests.
