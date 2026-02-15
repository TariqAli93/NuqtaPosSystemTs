import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();

const ignoredDirs = new Set([
  '.git',
  'node_modules',
  'dist',
  'out',
  '.turbo',
  'coverage',
  '.cache',
  '.idea',
]);

const includedExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.vue']);
const ignoredFiles = new Set(['tools/check-transaction-sync.mjs']);

const rules = [
  {
    id: 'no-async-transaction-callback',
    description: 'Do not use async callbacks in transaction(...)',
    regex: /\.transaction\s*\(\s*async\b/g,
  },
  {
    id: 'no-async-sqlite-transaction-callback',
    description: 'Do not use async callbacks in sqlite.transaction(...)',
    regex: /sqlite\.transaction\s*\(\s*async\b/g,
  },
  {
    id: 'no-async-with-transaction-callback',
    description: 'Do not use async callbacks in withTransaction(...)',
    regex: /withTransaction\s*\(\s*[^,]+,\s*async\b/g,
  },
  {
    id: 'no-await-tx-inside-transaction',
    description: 'Do not await tx.* inside transaction callbacks',
    regex: /await\s+tx\./g,
  },
];

const findings = [];

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function getLineNumber(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = toPosix(path.relative(rootDir, fullPath));

    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) {
        continue;
      }
      await walk(fullPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (ignoredFiles.has(relativePath)) {
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!includedExtensions.has(ext)) {
      continue;
    }

    const content = await readFile(fullPath, 'utf8');

    for (const rule of rules) {
      rule.regex.lastIndex = 0;
      let match = rule.regex.exec(content);

      while (match) {
        const line = getLineNumber(content, match.index);
        findings.push({
          file: relativePath,
          line,
          rule: rule.id,
          description: rule.description,
        });
        match = rule.regex.exec(content);
      }
    }
  }
}

await walk(rootDir);

if (findings.length > 0) {
  console.error('Transaction sync check failed:');
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} [${finding.rule}] ${finding.description}`
    );
  }
  process.exit(1);
}

console.log('Transaction sync check passed.');
