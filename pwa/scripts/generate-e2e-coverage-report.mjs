import { readdir, readFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import istanbulCoverage from 'istanbul-lib-coverage';
import istanbulInstrument from 'istanbul-lib-instrument';
import istanbulReport from 'istanbul-lib-report';
import istanbulReports from 'istanbul-reports';

const rawCoverageDir = resolve('.nyc_output/e2e');
const coverageReportDir = resolve('e2e-coverage');
const sourceRoot = resolve('src');
const serviceWorkerRoot = resolve('src/service-worker');
const sourceExtensions = new Set(['.ts', '.tsx']);
const { createCoverageMap } = istanbulCoverage;
const { createInstrumenter } = istanbulInstrument;

function isIncludedSourceFile(filePath) {
  if (!filePath.startsWith(sourceRoot)) return false;
  if (filePath.startsWith(serviceWorkerRoot)) return false;
  if (filePath.endsWith('.d.ts')) return false;
  return Array.from(sourceExtensions).some((extension) => filePath.endsWith(extension));
}

async function collectRawCoverageFiles() {
  const rawFiles = await readdir(rawCoverageDir);
  return rawFiles
    .filter((file) => file.endsWith('.json') && !file.includes('processinfo'))
    .map((file) => join(rawCoverageDir, file));
}

async function walkSourceFiles(directory, files = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (fullPath === serviceWorkerRoot) {
        continue;
      }
      await walkSourceFiles(fullPath, files);
      continue;
    }

    if (isIncludedSourceFile(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

const rawCoverageFiles = await collectRawCoverageFiles();
if (rawCoverageFiles.length === 0) {
  throw new Error('No raw E2E coverage files were found.');
}

const coverageMap = createCoverageMap({});
for (const filePath of rawCoverageFiles) {
  const rawCoverage = JSON.parse(await readFile(filePath, 'utf8'));
  coverageMap.merge(rawCoverage);
}

const existingFiles = new Set(coverageMap.files());
const instrumenter = createInstrumenter({
  esModules: true,
  produceSourceMap: true,
  parserPlugins: ['typescript', 'jsx'],
});

for (const filePath of await walkSourceFiles(sourceRoot)) {
  if (existingFiles.has(filePath)) continue;

  const source = await readFile(filePath, 'utf8');
  instrumenter.instrumentSync(source, filePath);
  const fileCoverage = instrumenter.lastFileCoverage();

  if (fileCoverage) {
    coverageMap.addFileCoverage(fileCoverage);
    existingFiles.add(filePath);
  }
}

await mkdir(coverageReportDir, { recursive: true });

const reportContext = istanbulReport.createContext({
  dir: coverageReportDir,
  coverageMap,
});

istanbulReports.create('json-summary').execute(reportContext);
istanbulReports.create('html').execute(reportContext);
istanbulReports.create('text-summary').execute(reportContext);
