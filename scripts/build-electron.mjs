import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('⚡ Compiling Electron TypeScript files...');
execSync('npx tsc -p tsconfig.electron.json', { stdio: 'inherit' });

// Ensure dist-electron exists
if (!fs.existsSync('dist-electron')) {
  fs.mkdirSync('dist-electron', { recursive: true });
}

// 1. Copy main.js -> main.cjs and preload.js -> preload.cjs
if (fs.existsSync(path.join('dist-electron', 'main.js'))) {
  fs.copyFileSync(
    path.join('dist-electron', 'main.js'),
    path.join('dist-electron', 'main.cjs')
  );
  console.log('✅ Generated dist-electron/main.cjs');
}

if (fs.existsSync(path.join('dist-electron', 'preload.js'))) {
  fs.copyFileSync(
    path.join('dist-electron', 'preload.js'),
    path.join('dist-electron', 'preload.cjs')
  );
  console.log('✅ Generated dist-electron/preload.cjs');
}

// 2. Write package.json inside dist-electron explicitly declaring type: commonjs
fs.writeFileSync(
  path.join('dist-electron', 'package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 2)
);
console.log('✅ Created dist-electron/package.json with {"type": "commonjs"}');

