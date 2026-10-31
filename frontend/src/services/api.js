const API_BASE = '/api';

async function fetchJSON(url, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Request failed: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`API Error on ${url}:`, error);
    throw error;
  }
}

export const api = {
  // Dashboard
  getDashboardMetrics: () => fetchJSON('/dashboard/metrics'),
  getDailyTrend: (days = 45) => fetchJSON(`/dashboard/daily_trend?days=${days}`),
  getMonthlyConsumption: () => fetchJSON('/dashboard/monthly_consumption'),
  getActualVsPredicted: () => fetchJSON('/dashboard/actual_vs_predicted'),
  getRainfallVsConsumption: () => fetchJSON('/dashboard/rainfall_vs_consumption'),

  // GIS & Map
  getChennaiGeoJSON: () => fetchJSON('/gis/chennai_geojson'),

  // Households
  getHouseholds: (params = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.append('search', params.search);
    if (params.consumption_status) q.append('consumption_status', params.consumption_status);
    if (params.area_id) q.append('area_id', params.area_id);
    if (params.verified_only !== undefined) q.append('verified_only', params.verified_only);
    return fetchJSON(`/households?${q.toString()}`);
  },
  getHouseholdDetails: (id) => fetchJSON(`/households/${id}`),
  assignHouseholdLocation: (id, data) => fetchJSON(`/households/${id}/location`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  // Readings & Live Monitoring
  getReadings: (params = {}) => {
    const q = new URLSearchParams();
    if (params.household_id) q.append('household_id', params.household_id);
    if (params.date) q.append('date', params.date);
    if (params.limit) q.append('limit', params.limit);
    if (params.skip) q.append('skip', params.skip);
    return fetchJSON(`/readings?${q.toString()}`);
  },
  getMonitoringStats: () => fetchJSON('/readings/monitoring_stats'),
  importReadingsCSV: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/readings/import_csv`, {
      method: 'POST',
      body: formData
    });
    return await res.json();
  },

  // Rainfall
  getAnnualRainfall: () => fetchJSON('/rainfall/annual'),
  getRainfallSummary: () => fetchJSON('/rainfall/summary'),
  getWeatherObservations: (limit = 50) => fetchJSON(`/rainfall/weather_observations?limit=${limit}`),
  importRainfallCSV: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/rainfall/import_csv`, {
      method: 'POST',
      body: formData
    });
    return await res.json();
  },

  // Forecast
  getForecastDemand: (params = {}) => {
    const q = new URLSearchParams();
    if (params.household_id) q.append('household_id', params.household_id);
    if (params.horizon) q.append('horizon', params.horizon);
    return fetchJSON(`/forecast/demand?${q.toString()}`);
  },
  getForecastMetrics: () => fetchJSON('/forecast/metrics'),

  // Shortage Risk
  getAreaRiskAssessments: () => fetchJSON('/shortage_risk/areas'),
  getRiskSummary: () => fetchJSON('/shortage_risk/summary'),

  // Reservoirs
  getReservoirs: () => fetchJSON('/reservoirs'),
  addReservoir: (data) => fetchJSON('/reservoirs', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateReservoir: (id, data) => fetchJSON(`/reservoirs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  getDistributionPoints: () => fetchJSON('/reservoirs/distribution_points'),

  // Events
  getEvents: () => fetchJSON('/events'),
  createEvent: (data) => fetchJSON('/events', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Command Center
  getAlerts: () => fetchJSON('/command_center/alerts'),
  acknowledgeAlert: (id) => fetchJSON(`/command_center/alerts/${id}/acknowledge`, { method: 'PUT' }),
  getTasks: () => fetchJSON('/command_center/tasks'),
  createTask: (data) => fetchJSON('/command_center/tasks', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateTaskStatus: (id, data) => fetchJSON(`/command_center/tasks/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  getApprovals: () => fetchJSON('/command_center/approvals'),
  decideApproval: (data) => fetchJSON('/command_center/approvals/decide', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getRecommendations: () => fetchJSON('/command_center/recommendations'),

  // Reports
  getWaterBalanceReport: () => fetchJSON('/reports/water_balance'),
  getAreaComparisonReport: () => fetchJSON('/reports/area_comparison'),

  // Settings
  getSystemStatus: () => fetchJSON('/settings/status'),
  updateMongoConfig: (data) => fetchJSON('/settings/update_mongo', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateThresholds: (data) => fetchJSON('/settings/update_thresholds', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  triggerReseed: () => fetchJSON('/settings/reseed', { method: 'POST' })
};

