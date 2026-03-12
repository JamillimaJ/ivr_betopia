import axios from 'axios';

const API_BASE_URL = `http://${window.location.hostname}:5869/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// QA Leads API
export const qaLeadsAPI = {
  getAll: () => api.get('/qa-leads/'),
  getOne: (id) => api.get(`/qa-leads/${id}/`),
  create: (data) => api.post('/qa-leads/', data),
  update: (id, data) => api.put(`/qa-leads/${id}/`, data),
  delete: (id) => api.delete(`/qa-leads/${id}/`),
  migrateToProduction: (leadIds) => api.post('/qa-leads/migrate_to_production/', { qa_lead_ids: leadIds }),
};

// Production Leads API
export const productionLeadsAPI = {
  getAll: (params) => api.get('/production-leads/', { params }),
  getOne: (id) => api.get(`/production-leads/${id}/`),
  delete: (id) => api.delete(`/production-leads/${id}/`),
  checkCallStatus: (id) => api.post(`/production-leads/${id}/check_call_status/`),
};

// Post Call Summaries API
export const postCallSummariesAPI = {
  getAll: (params) => api.get('/post-call-summaries/', { params }),
  getOne: (id) => api.get(`/post-call-summaries/${id}/`),
  delete: (id) => api.delete(`/post-call-summaries/${id}/`),
};

// Inbound Calls Sync
export const inboundCallsAPI = {
  sync: () => api.post('/sync-inbound-calls/'),
};

export default api;
