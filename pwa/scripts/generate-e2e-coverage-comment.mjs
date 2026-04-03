import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const summaryPath = resolve('e2e-coverage/coverage-summary.json');
const commentPath = resolve('e2e-coverage-comment.md');

async function readCoverageSummary() {
  try {
    const rawSummary = await readFile(summaryPath, 'utf8');
    return JSON.parse(rawSummary);
  } catch {
    return null;
  }
}

const summary = await readCoverageSummary();
const total = summary?.total ?? null;

const lines = [
  '## 🧪 PWA E2E Coverage Report',
  '',
  '_Informational only — collected from an instrumented Chromium Playwright run across the PWA source tree. The service-worker bundle is excluded from this report._',
  '',
  '### PWA E2E Coverage',
];

if (total) {
  lines.push(
    '| Metric | Coverage |',
    '|--------|----------|',
    `| Lines | ${total.lines.pct}% (${total.lines.covered}/${total.lines.total}) |`,
    `| Statements | ${total.statements.pct}% (${total.statements.covered}/${total.statements.total}) |`,
    `| Functions | ${total.functions.pct}% (${total.functions.covered}/${total.functions.total}) |`,
    `| Branches | ${total.branches.pct}% (${total.branches.covered}/${total.branches.total}) |`,
    '',
    '_Full HTML report is uploaded as the `pwa-e2e-coverage` workflow artifact._',
  );
} else {
  lines.push('Coverage data not available.');
}

lines.push('');

await writeFile(commentPath, lines.join('\n'));
