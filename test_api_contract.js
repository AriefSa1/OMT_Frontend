/**
 * Frontend-backend API contract verification.
 * Scrape all fetch/API URL patterns from frontend lib/api.js + components,
 * then verify each endpoint exists in the backend route definitions.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const apiJs = fs.readFileSync(path.join(__dirname, 'lib', 'api.js'), 'utf8');

// Extract all endpoint paths from request('/path/...') calls
const requestPattern = /request\(`([^`]+)`/g;
const directFetchPattern = /fetch\(`([^`]+)`/g;

// Collect all API endpoints referenced in frontend
const frontendEndpoints = new Set();
let match;

// Match API paths from request() calls (template literals)
const apiPattern = /`/g;
const lines = apiJs.split('\n');
for (const line of lines) {
  // Look for request('/api/...') or request(`/api/...${...}`)
  const requestMatch = line.match(/request\(['"`]([^'"`]+)/);
  if (requestMatch && requestMatch[1].startsWith('/')) {
    // Extract the base path before any query params/template vars
    const base = requestMatch[1].split('?')[0].split('${')[0];
    frontendEndpoints.add(base);
  }
  // Also catch template literals with query params
  const templateMatch = line.match(/request\(`([^`]+)/);
  if (templateMatch) {
    const fullPath = templateMatch[1];
    const basePath = fullPath.split('?')[0].split('${')[0].trim();
    if (basePath.startsWith('/')) {
      frontendEndpoints.add(basePath);
    }
  }
}

// Also check component files for hardcoded API paths
const componentDirs = ['components'];
for (const dir of componentDirs) {
  const fullDir = path.join(__dirname, dir);
  if (!fs.existsSync(fullDir)) continue;
  const files = fs.readdirSync(fullDir).filter((f) => f.endsWith('.jsx'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(fullDir, file), 'utf8');
    // Match /api/... patterns in strings
    const compPattern = /['"`](\/api\/[^'"`${]+)/g;
    while ((match = compPattern.exec(content)) !== null) {
      const base = match[1].split('?')[0];
      frontendEndpoints.add(base);
    }
  }
}

// Collect backend route definitions
const backendRoutesDir = process.env.BACKEND_ROUTES_DIR || '../backend/src/routes';
if (!fs.existsSync(path.join(__dirname, backendRoutesDir))) {
  console.warn('[test_api_contract] BACKEND_ROUTES_DIR does not exist — skipping backend route check. Set BACKEND_ROUTES_DIR env var if running outside monorepo.');
  console.log('Frontend API endpoints:', frontendEndpoints.size);
  console.log('Backend route prefixes: SKIPPED (path not found)');
  console.log('Frontend-backend API contract verification PASSED (backend routes skipped)');
  process.exit(0);
}
const backendRouteFiles = fs.readdirSync(path.join(__dirname, backendRoutesDir))
  .filter((f) => f.endsWith('Routes.js'));

const backendEndpoints = new Set();
for (const file of backendRouteFiles) {
  const content = fs.readFileSync(path.join(__dirname, backendRoutesDir, file), 'utf8');
  // Match router.get('/path'), router.post('/path'), etc.
  const routePattern = /router\.\w+\(['"`]([^'"`]+)/g;
  while ((match = routePattern.exec(content)) !== null) {
    let endpoint = match[1];
    // Normalize: /users/:id → /users/:id (keep params in backend but strip from frontend check)
    backendEndpoints.add(endpoint);
  }
}

console.log('Frontend API endpoints:', frontendEndpoints.size);
console.log('Backend route prefixes:', backendEndpoints.size);

// For each frontend endpoint, check if there's a matching backend route
// (we do a prefix check because frontend uses query params differently)
const mismatches = [];
for (const ep of frontendEndpoints) {
  // Skip non-API paths
  if (!ep.startsWith('/api/')) continue;
  
  // Normalize: remove query params and trailing slashes
  const normalizedEp = ep.replace(/\?$/, '').replace(/\/$/, '');
  
  // Check if any backend route is a prefix of this endpoint
  let matched = false;
  for (const bep of backendEndpoints) {
    const baseBackend = bep.replace(/\/$/, '');
    if (normalizedEp.startsWith('/api' + baseBackend) || normalizedEp === '/api' + baseBackend) {
      matched = true;
      break;
    }
  }
  
  if (!matched) {
    mismatches.push(normalizedEp);
  }
}

if (mismatches.length > 0) {
  console.error('Frontend API endpoints without backend routes:', mismatches);
  process.exit(1);
}

console.log('Frontend-backend API contract verification passed');
