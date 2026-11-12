#!/usr/bin/env node

/**
 * Audit script to prevent hardcoded literal dates in application code.
 * All temporal logic must rely on central injectable Clock (src/rules/clock.ts).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

const DATE_REGEX = /202\d-[0-9]{2}/;

function isTestOrExempt(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.includes('/__tests__/')) return true;
  if (normalized.endsWith('.test.ts') || normalized.endsWith('.test.tsx')) return true;
  if (normalized.endsWith('.spec.ts') || normalized.endsWith('.spec.tsx')) return true;
  if (normalized.includes('/src/data/')) return true;
  return false;
}

function scanDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        scanDir(fullPath, fileList);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js'))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const files = scanDir(srcDir);
const violations = [];

for (const file of files) {
  if (isTestOrExempt(file)) continue;

  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Check if line contains literal date
    if (DATE_REGEX.test(line)) {
      violations.push({
        file: path.relative(rootDir, file).replace(/\\/g, '/'),
        line: index + 1,
        code: line.trim()
      });
    }
  });
}

if (violations.length > 0) {
  console.error('\n❌ LITERAL DATES FOUND IN APPLICATION CODE:');
  console.error('All temporal operations must use central Clock (src/rules/clock.ts).\n');
  violations.forEach(v => {
    console.error(`  ${v.file}:${v.line} -> ${v.code}`);
  });
  console.error(`\nTotal violations: ${violations.length}\n`);
  process.exit(1);
} else {
  console.log('✅ Date audit passed: Zero literal dates found in src/ outside test files.');
  process.exit(0);
}
