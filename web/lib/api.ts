import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({ baseURL: BASE, timeout: 120000 });

api.interceptors.request.use(cfg => {
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('clasr_token');
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
  }
  return cfg;
});

api.interceptors.response.use(r => r, async err => {
  if (err.response?.status === 401) {
    try {
      const rt = localStorage.getItem('clasr_refresh');
      if (!rt) throw new Error();
      const { data } = await axios.post(`${BASE}/auth/refresh`, { refresh_token: rt });
      localStorage.setItem('clasr_token', data.access_token);
      localStorage.setItem('clasr_refresh', data.refresh_token);
      err.config.headers.Authorization = `Bearer ${data.access_token}`;
      return api.request(err.config);
    } catch {
      localStorage.removeItem('clasr_token');
      localStorage.removeItem('clasr_refresh');
      window.location.href = '/login';
    }
  }
  return Promise.reject(err);
});

export const authApi = {
  register: (email: string, password: string) => api.post('/auth/register', { email, password }),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email, redirectTo: `${window.location.origin}/reset-password` }),
  resetPassword: (access_token: string, new_password: string) => api.post('/auth/reset-password', { access_token, new_password }),
};

export const analyzeApi = {
  submit: (formData: FormData) => api.post('/analyze', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  history: () => api.get('/analyze/history'),
  get: (id: string) => api.get(`/analyze/${id}`),
};

export const chatApi = {
  sendMessage: (formData: FormData) => api.post('/chat/message', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  conversations: () => api.get('/chat/conversations'),
  getConversation: (id: string) => api.get(`/chat/conversations/${id}`),
  deleteConversation: (id: string) => api.delete(`/chat/conversations/${id}`),
  clearHistory: () => api.delete('/chat/conversations'),
};

export const subscriptionApi = {
  status: () => api.get('/subscription/status'),
  checkout: (price_key: string) => api.post('/subscription/checkout', { price_key }),
  portal: () => api.post('/subscription/portal'),
};

export default api;
