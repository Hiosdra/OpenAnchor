import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pwaRoot = process.cwd();
const entryHtmlFiles = [
  'index.html',
  'modules/anchor/index.html',
  'modules/egzamin/index.html',
  'modules/wachtownik/index.html',
  'modules/zeglowanie/index.html',
];

function readPwaFile(relativePath: string): string {
  return readFileSync(resolve(pwaRoot, relativePath), 'utf8');
}

describe('manifest asset wiring', () => {
  it('loads the shared theme and dashboard skin from the main entry', () => {
    const dashboardHtml = readPwaFile('index.html');

    expect(dashboardHtml).toContain('href="styles/theme.css"');
    expect(dashboardHtml).toContain('href="styles/dashboard.css"');
    expect(existsSync(resolve(pwaRoot, 'styles/dashboard.css'))).toBe(true);
  });

  it('points every HTML entry to the root-served manifest', () => {
    for (const relativePath of entryHtmlFiles) {
      expect(readPwaFile(relativePath)).toContain('href="/manifest.json"');
    }
  });

  it('uses a root-scoped manifest with stable icon files from public/assets', () => {
    const manifest = JSON.parse(readPwaFile('public/manifest.json'));

    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
    expect(manifest.background_color).toBe('#07131f');
    expect(manifest.theme_color).toBe('#07131f');
    expect(manifest.shortcuts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: './modules/anchor/' }),
        expect.objectContaining({ url: './modules/wachtownik/' }),
        expect.objectContaining({ url: './modules/egzamin/' }),
        expect.objectContaining({ url: './modules/zeglowanie/' }),
      ]),
    );

    for (const icon of manifest.icons) {
      const publicPath = icon.src.replace(/^\.\//, '');
      expect(existsSync(resolve(pwaRoot, 'public', publicPath))).toBe(true);
    }
  });
});
