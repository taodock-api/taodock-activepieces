import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const distDir = join(root, 'dist');

rmSync(distDir, { recursive: true, force: true });
mkdirSync(join(distDir, 'src'), { recursive: true });

// The published piece is a single self-contained CommonJS bundle that
// inlines @activepieces/* and all third-party dependencies, mirroring
// how Activepieces bundles its own community pieces.
const result = await build({
  entryPoints: [join(root, 'src', 'index.ts')],
  outfile: join(distDir, 'src', 'index.js'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: false,
  minify: false,
  legalComments: 'none',
  logLevel: 'info',
  metafile: true,
});

const bundleBytes = Object.values(result.metafile.outputs)[0]?.bytes ?? 0;
if (bundleBytes > 5 * 1024 * 1024) {
  throw new Error(`Bundle is over the 5 MB cap: ${(bundleBytes / 1024 / 1024).toFixed(2)} MB`);
}

// Emit the publish manifest inside dist: the framework code is fully
// inlined, so the published package carries no runtime dependencies.
const rootManifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
const distManifest = {
  name: rootManifest.name,
  version: rootManifest.version,
  description: rootManifest.description,
  main: './src/index.js',
  files: ['src/index.js'],
  keywords: rootManifest.keywords,
  license: rootManifest.license,
  publishConfig: { access: 'public' },
};
writeFileSync(join(distDir, 'package.json'), `${JSON.stringify(distManifest, null, 2)}\n`);
copyFileSync(join(root, 'README.md'), join(distDir, 'README.md'));
copyFileSync(join(root, 'LICENSE'), join(distDir, 'LICENSE'));

console.info(`[build] bundle: ${(bundleBytes / 1024).toFixed(0)} KB → dist/src/index.js`);
console.info('[build] publishable artifact ready at dist/ (npm publish ./dist)');
