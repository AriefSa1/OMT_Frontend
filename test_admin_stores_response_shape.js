const assert = require('assert');
const fs = require('fs');
const path = require('path');

const page = fs.readFileSync(path.join(__dirname, 'app', 'admin', 'page.jsx'), 'utf8');

assert.match(
  page,
  /storesRes\.data\?\.stores|storesRes\.data\s*&&\s*storesRes\.data\.stores/,
  'Admin overview must read stores from backend response data.stores.'
);
assert.match(
  page,
  /storesRes\.data\?\.totalStores|storesRes\.data\s*&&\s*storesRes\.data\.totalStores/,
  'Admin overview must read total stores from backend response data.totalStores.'
);
assert.doesNotMatch(
  page,
  /setStoresData\(\{\s*stores:\s*storesRes\.stores/s,
  'Admin overview must not read stores from the old top-level storesRes.stores shape.'
);

console.log('admin stores response shape regression passed');
