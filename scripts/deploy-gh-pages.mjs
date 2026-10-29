/**
 * Local helper script to build and deploy ReaCut Studio to gh-pages branch.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('🚀 Building ReaCut Studio for Web / GitHub Pages...');
execSync('npm run build:web', { stdio: 'inherit' });

// Add .nojekyll to dist to prevent GitHub Pages from ignoring files starting with underscore
fs.writeFileSync(path.join('dist', '.nojekyll'), '');
console.log('✅ Created dist/.nojekyll');

console.log('🎉 Web build completed in ./dist ready for GitHub Pages deployment.');
