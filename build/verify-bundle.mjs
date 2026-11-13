import { statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

const bundlePath = join(root, 'dist', 'src', 'index.js');
const bytes = statSync(bundlePath).size;
if (bytes > 5 * 1024 * 1024) {
  throw new Error(`dist/src/index.js is ${(bytes / 1024 / 1024).toFixed(2)} MB, over the 5 MB cap`);
}

const require = createRequire(import.meta.url);
const piece = require(bundlePath);

// The framework stores actions under `_actions` (a name->action record) in
// some versions and exposes `actions` in others; accept both shapes.
const candidates = Object.keys(piece).filter((key) => {
  const value = piece[key];
  if (value === null || typeof value !== 'object' || typeof value.displayName !== 'string') {
    return false;
  }
  return value._actions !== undefined || Array.isArray(value.actions);
});

if (candidates.length !== 1) {
  throw new Error(`Expected exactly one exported piece, found: ${Object.keys(piece).join(', ')}`);
}

const taodock = piece[candidates[0]];
const actionEntries =
  taodock._actions !== undefined
    ? Object.entries(taodock._actions)
    : taodock.actions.map((action) => [action.name, action]);
const actions = actionEntries.map(([name, action]) => `${name} (${action.displayName})`);

const expected = ['list_models', 'generate_image', 'create_video', 'get_video_status', 'download_video'];
for (const name of expected) {
  if (!actionEntries.some(([key]) => key === name)) {
    throw new Error(`Missing action: ${name}. Found: ${actions.join(', ')}`);
  }
}

if (typeof taodock.auth !== 'object' || taodock.auth === null) {
  throw new Error('Piece has no auth definition');
}

console.info(`[verify] piece "${taodock.displayName}" loaded from the bundle`);
console.info(`[verify] actions (${actions.length}): ${actions.join(', ')}`);
console.info(`[verify] bundle size: ${(bytes / 1024).toFixed(0)} KB`);
