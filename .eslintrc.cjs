// Minimal ESLint config for Node.js ESM strictness, test, and scripts
module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  overrides: [
    {
      files: ["test/**/*.js"],
      env: { "jest": false, "mocha": false }
    }
  ],
  extends: [
    'eslint:recommended',
  ],
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { 'avoidEscape': true }],
  },
  ignorePatterns: ['coverage/', 'node_modules/'],
};
