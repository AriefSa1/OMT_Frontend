import { invalidateSnapshotCache, readCached } from './queryCache';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api';

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function request(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      cache: 'no-store',
      ...options,
      headers: { ...getAuthHeaders(), ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { success: false, status: response.status, error: data.error || data.message || 'Permintaan gagal.' };
    return data;
  } catch (error) {
    return { success: false, error: 'Server tidak dapat dihubungi.' };
  }
}

function cached(path, ttl = 30000) {
  return readCached(path, () => request(path), ttl);
}

export function clearApiCache() {
  invalidateSnapshotCache();
}

export async function loginUser(credentials) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify(credentials), headers: { 'Content-Type': 'application/json' } });
}

export async function registerUser(userData) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(userData), headers: { 'Content-Type': 'application/json' } });
}

export async function getMe() {
  return request('/auth/me');
}

export async function fetchSettings() { return cached('/settings', 60000); }
export async function saveSettings(settingsData) {
  const result = await request('/settings', { method: 'POST', body: JSON.stringify(settingsData) });
  if (result.success) clearApiCache();
  return result;
}

export async function testWarehouseConnection(credentials = {}) {
  return request('/settings/test-warehouse', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function fetchDashboardOverview(storeId = null) {
  const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  const result = await cached(`/dashboard/overview${query}`, 20000);
  return result.success ? result.data : null;
}

export async function fetchShopeeSession(storeId = null) {
  const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  return cached(`/shopee/session${query}`, 30000);
}

export async function fetchStores() {
  const result = await request('/shopee/stores');
  return result.success ? result.stores : [];
}

export async function setActiveStoreApi(storeId, isActive = true) {
  const result = await request('/shopee/stores/active', {
    method: 'POST',
    body: JSON.stringify({ storeId, isActive }),
  });
  if (result.success) clearApiCache();
  return result;
}
export const toggleStoreActive = setActiveStoreApi;

export async function deleteStoreApi(storeId) {
  const result = await request(`/shopee/stores/${encodeURIComponent(storeId)}`, {
    method: 'DELETE',
  });
  if (result.success) clearApiCache();
  return result;
}

export async function fetchShopeeCatalog(params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));
  return cached(`/shopee/metrics${query.toString() ? `?${query}` : ''}`, 30000);
}

export async function fetchProductDetail(id) {
  const result = await cached(`/shopee/product/${encodeURIComponent(id)}`, 30000);
  return result.success ? result : null;
}

export async function updateProductEconomics(id, values) {
  const result = await request(`/shopee/product/${encodeURIComponent(id)}/economics`, { method: 'PUT', body: JSON.stringify(values) });
  if (result.success) invalidateSnapshotCache('/shopee');
  return result;
}

export async function updateShopeeCookie(rawCookie, storeName = '') {
  const result = await request('/shopee/cookie', { method: 'POST', body: JSON.stringify({ rawCookie, storeName }) });
  if (result.success) clearApiCache();
  return result;
}

export async function triggerShopeeSync(storeId = null) {
  const result = await request('/shopee/sync', {
    method: 'POST',
    body: JSON.stringify({ store_id: storeId }),
  });
  if (result.success) clearApiCache();
  return result;
}

export async function triggerFullSync(storeId = null) {
  const result = await request('/sync/run', {
    method: 'POST',
    body: JSON.stringify({ store_id: storeId }),
  });
  if (result.success) clearApiCache();
  return result;
}

export async function fetchShopeeAds(params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));
  return cached(`/shopee/ads${query.toString() ? `?${query}` : ''}`, 30000);
}
export async function fetchShopeeProductPerformance(params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));
  return cached(`/shopee/product-performance${query.toString() ? `?${query}` : ''}`, 15000);
}
// Live read from Seller Center, so the cache window stays short.
export async function fetchTrafficSources(days = 7, storeId = null) {
  const query = new URLSearchParams({ days });
  if (storeId) query.set('store_id', storeId);
  return cached(`/shopee/traffic-sources?${query.toString()}`, 60000);
}
export async function fetchConnectionStatus() { return cached('/status', 20000); }
export async function fetchSyncLogs() { return cached('/sync/logs', 20000); }

export async function fetchWarehouseInventory(params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));
  return cached(`/warehouse/inventory${query.toString() ? `?${query}` : ''}`, 30000);
}

export async function fetchWarehouseProductDetail(sku, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));
  return request(`/warehouse/inventory/${encodeURIComponent(sku)}${query.toString() ? `?${query}` : ''}`);
}

export async function fetchWarehouseProductHistory(sku, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));
  return request(`/warehouse/inventory/${encodeURIComponent(sku)}/history${query.toString() ? `?${query}` : ''}`);
}

export async function fetchReconciliation(storeId = null) {
  const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  return cached(`/warehouse/reconciliation${query}`, 30000);
}

// Read live from PDC Gudang rather than a snapshot, so the cache window stays short.
export async function fetchWarehouseTeamOverview() { return cached('/warehouse/team-overview', 60000); }

export async function triggerWarehouseSync() {
  const result = await request('/warehouse/sync', { method: 'POST' });
  if (result.success) clearApiCache();
  return result;
}

export async function fetchTasks(params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));
  return cached(`/tasks${query.toString() ? `?${query}` : ''}`, 20000);
}

export async function createTask(recommendation) {
  const result = await request('/tasks', { method: 'POST', body: JSON.stringify({
    recommendationId: recommendation.id,
    type: recommendation.type,
    title: recommendation.title,
    description: recommendation.description,
    source: recommendation.source,
    entityType: recommendation.entityType,
    entityId: recommendation.entityId,
    priority: recommendation.priority,
  }) });
  if (result.success) invalidateSnapshotCache('/tasks');
  return result;
}

export async function updateTaskStatus(id, status, note = '') {
  const result = await request(`/tasks/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status, note }) });
  if (result.success) invalidateSnapshotCache('/tasks');
  return result;
}

export async function fetchProductOptimizations(storeId = null) {
  const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  const result = await cached(`/optimization/products${query}`, 30000);
  return result.success ? result.data : null;
}
export async function fetchStoreOptimizations(storeId = null) {
  const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  const result = await cached(`/optimization/store${query}`, 30000);
  return result.success ? result.data : null;
}
export async function fetchAdsOptimizations(storeId = null) {
  const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  const result = await cached(`/optimization/ads${query}`, 30000);
  return result.success ? result.data : null;
}
export async function fetchGrowthIntelligence(storeId = null) {
  const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  const result = await cached(`/growth-intelligence/overview${query}`, 30000);
  return result.success ? result.data : null;
}
export async function fetchMarketplaceIntelligence(storeId = null) {
  const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  return cached(`/optimization/marketplace-intelligence${query}`, 30000);
}

export async function fetchCompetitorIntelligence(itemId) {
  return cached(`/optimization/competitor-intelligence?itemId=${encodeURIComponent(itemId)}`, 30000);
}

export async function refreshCompetitorIntelligence(itemId) {
  return request('/optimization/competitor-intelligence', { method: 'POST', body: JSON.stringify({ itemId }) });
}

export async function applyOptimizationAction(actionId, type, recommendation = null) {
  const result = await request('/optimization/apply', { method: 'POST', body: JSON.stringify({ actionId, type, recommendation }) });
  if (result.success) invalidateSnapshotCache('/tasks');
  return result;
}

export async function generateAIABCopy(payload) {
  return request('/ai/ab-copy', { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchAIPredictiveRestock(payload) {
  return request('/ai/predictive-restock', { method: 'POST', body: JSON.stringify(payload) });
}

export async function simulateAIDynamicPricing(payload) {
  return request('/ai/pricing-simulator', { method: 'POST', body: JSON.stringify(payload) });
}

// The free Gemini tier this project runs on allows a small number of requests per day.
// Uncached, this fired on every dashboard visit and alone could exhaust the day's quota
// before a user ever tried the other four AI features. 10 minutes matches how often the
// underlying snapshot actually changes; refreshBriefing() below bypasses it on demand.
export async function fetchAIDailyBriefing() {
  return cached('/ai/daily-briefing', 600000);
}

export async function refreshAIDailyBriefing() {
  invalidateSnapshotCache('/ai/daily-briefing');
  return fetchAIDailyBriefing();
}

export async function optimizeAIAdsKeywords(payload) {
  return request('/ai/ads-keyword-optimization', { method: 'POST', body: JSON.stringify(payload) });
}

export async function suggestAIScaleUp(payload) {
  return request('/ai/scale-up-strategy', { method: 'POST', body: JSON.stringify(payload) });
}

// ----------------------------------------------------
// Admin Panel API Functions
// ----------------------------------------------------

export async function fetchAdminUsers(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.role) query.append('role', params.role);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  const qStr = query.toString();
  return request(`/admin/users${qStr ? `?${qStr}` : ''}`);
}

export async function createAdminUser(data) {
  return request('/admin/users', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAdminUserRole(id, role) {
  return request(`/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
}

export async function resetAdminUserPassword(id, password) {
  return request(`/admin/users/${id}/reset-password`, { method: 'PUT', body: JSON.stringify({ password }) });
}

export async function deleteAdminUser(id) {
  return request(`/admin/users/${id}`, { method: 'DELETE' });
}

export async function fetchAdminRegistrationCodes() {
  return request('/admin/registration-codes');
}

export async function createAdminRegistrationCode(data) {
  return request('/admin/registration-codes', { method: 'POST', body: JSON.stringify(data) });
}

export async function toggleAdminRegistrationCode(id, isActive) {
  return request(`/admin/registration-codes/${id}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive })
  });
}

export async function deleteAdminRegistrationCode(id) {
  return request(`/admin/registration-codes/${id}`, { method: 'DELETE' });
}

export async function fetchAdminAuditLogs(params = {}) {
  const query = new URLSearchParams();
  if (params.limit) query.append('limit', params.limit);
  if (params.action) query.append('action', params.action);
  const qStr = query.toString();
  return request(`/admin/audit-logs${qStr ? `?${qStr}` : ''}`);
}

export async function fetchAdminSystemStats() {
  return request('/admin/system-stats');
}

export async function fetchAdminStores() {
  return request('/admin/stores');
}

