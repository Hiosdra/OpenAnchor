import { spawn } from 'node:child_process';
import { readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const isWindows = process.platform === 'win32';
const npxCommand = isWindows ? 'npx.cmd' : 'npx';
const rawCoverageDir = resolve('.nyc_output/e2e');
const coverageReportDir = resolve('e2e-coverage');
const playwrightArgs = process.argv.slice(2);

function run(command, args, env = process.env) {
  return new Promise((resolveCode, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env,
    });

    child.on('error', reject);
    child.on('exit', (code) => resolveCode(code ?? 1));
  });
}

async function hasCoverageOutput(directory) {
  try {
    const files = await readdir(directory);
    return files.some((file) => file.endsWith('.json'));
  } catch {
    return false;
  }
}

await rm(rawCoverageDir, { recursive: true, force: true });
await rm(coverageReportDir, { recursive: true, force: true });

const coverageEnv = {
  ...process.env,
  E2E_COVERAGE: 'true',
};

const testExitCode = await run(npxCommand, ['playwright', 'test', ...playwrightArgs], coverageEnv);
const rawCoverageAvailable = await hasCoverageOutput(rawCoverageDir);

let reportExitCode = 0;
if (rawCoverageAvailable) {
  reportExitCode = await run(process.execPath, ['./scripts/generate-e2e-coverage-report.mjs']);
} else if (testExitCode === 0) {
  console.error('E2E coverage run completed without producing raw coverage files.');
  reportExitCode = 1;
}

process.exit(testExitCode !== 0 ? testExitCode : reportExitCode);
