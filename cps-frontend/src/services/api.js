import axios from 'axios';

//const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const BACKEND_URL="http://localhost:8000";
const API = `${BACKEND_URL}/api`;

// Claims API
export const claimsApi = {
  getAll: (params = {}) => axios.get(`${API}/claims`, { params }),
  getById: (id) => axios.get(`${API}/claims/${id}`),
  create: (data) => axios.post(`${API}/claims`, data),
  update: (id, data) => axios.put(`${API}/claims/${id}`, data),
  assign: (id) => axios.post(`${API}/claims/${id}/assign`),
  approve: (id) => axios.post(`${API}/claims/${id}/approve`),
  reject: (id) => axios.post(`${API}/claims/${id}/reject`),
  analyzeFraud: (id) => axios.post(`${API}/claims/${id}/analyze-fraud`),
};

// Documents API
export const documentsApi = {
  upload: (claimId, file, documentType) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${API}/claims/${claimId}/documents?document_type=${documentType}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  download: (claimId, docId) => axios.get(`${API}/claims/${claimId}/documents/${docId}/download`, { responseType: 'blob' }),
};

// Notes API
export const notesApi = {
  getAll: (claimId) => axios.get(`${API}/claims/${claimId}/notes`),
  create: (claimId, content) => axios.post(`${API}/claims/${claimId}/notes`, { content }),
};

// Alerts API
export const alertsApi = {
  getAll: (params = {}) => axios.get(`${API}/alerts`, { params }),
  resolve: (id) => axios.put(`${API}/alerts/${id}/resolve`),
};

// Analytics API
export const analyticsApi = {
  getDashboard: () => axios.get(`${API}/analytics/dashboard`),
};

// Admin API
export const adminApi = {
  getUsers: () => axios.get(`${API}/admin/users`),
  updateUserRole: (userId, role) => axios.put(`${API}/admin/users/${userId}/role?role=${role}`),
  updateUserStatus: (userId, isActive) => axios.put(`${API}/admin/users/${userId}/status?is_active=${isActive}`),
  getAuditLogs: (params = {}) => axios.get(`${API}/admin/audit-logs`, { params }),
  getComplianceReport: () => axios.get(`${API}/admin/compliance-report`),
};

export default { claimsApi, documentsApi, notesApi, alertsApi, analyticsApi, adminApi };
