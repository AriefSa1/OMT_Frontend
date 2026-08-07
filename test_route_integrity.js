/**
 * Frontend route & build integrity check.
 * Verify all expected routes are present in the build manifest + .next output.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const appDir = path.join(__dirname, 'app');
const nextDir = path.join(__dirname, '.next', 'server', 'app');

// 1. Semua page.jsx di app/ harus ada di .next/server/app/ build output
const routeFolders = fs.readdirSync(appDir).filter((f) => {
  const stat = fs.statSync(path.join(appDir, f));
  return stat.isDirectory();
});

console.log('Route folders found:', routeFolders.length);

let missingRoutes = [];
for (const folder of routeFolders) {
  const pagePath = path.join(appDir, folder, 'page.jsx');
  const builtPath = path.join(nextDir, folder);
  
  if (fs.existsSync(pagePath)) {
    const builtExists = fs.existsSync(builtPath);
    if (!builtExists) {
      missingRoutes.push(folder);
    }
  }
}

// 2. Check nested routes (shopee/performance, optimization/product, etc.)
const nestedRoutes = [
  'shopee', 'shopee/performance', 'optimization', 'optimization/product',
  'optimization/store', 'optimization/ads', 'product/[id]'
];

for (const nested of nestedRoutes) {
  const builtPath = path.join(nextDir, nested);
  if (!fs.existsSync(builtPath)) {
    missingRoutes.push(nested);
  }
}

assert.strictEqual(missingRoutes.length, 0, 
  `Missing build outputs for routes: ${missingRoutes.join(', ')}`);

// 3. Check middleware is present (auth redirect)
const middlewarePath = path.join(nextDir, 'middleware.js');
if (!fs.existsSync(middlewarePath)) {
  console.warn('Warning: No middleware.js found in build — auth redirect might not work');
}

console.log('Frontend route & build integrity checks passed');
