# 051 - Aho-Corasick Matcher

Vanilla JavaScript Aho-Corasick matcher with trie automata, failure links, multi-pattern scanning, brute-force verification, Canvas 2D match-count rendering, benchmark mode, PNG export, and JSON evidence.

## What It Does

- Builds an automaton with failure links.
- Finds multiple patterns in one pass.
- Verifies match count against brute-force regular expression scans.

## Validation

From the repository root:

```bash
node scripts/test-project-051.js
npm run test:projects
npm run smoke:projects
```
