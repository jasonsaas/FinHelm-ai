import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,  // Increased timeout for AI processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      localStorage.removeItem('quickbooksSessionToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => apiClient.post('/auth/register', userData),
  login: (credentials) => apiClient.post('/auth/login', credentials),
  logout: () => apiClient.post('/auth/logout'),
  getQuickBooksOAuthUrl: () => apiClient.get('/auth/quickbooks/oauth-url'),
  handleQuickBooksCallback: (callbackData) => 
    apiClient.post('/auth/quickbooks/callback', callbackData),
};

// Chat API
export const chatAPI = {
  createSession: (sessionData) => apiClient.post('/chat/sessions', sessionData),
  getSessions: () => apiClient.get('/chat/sessions'),
  getSession: (sessionId) => apiClient.get(`/chat/sessions/${sessionId}`),
  sendMessage: (queryData) => apiClient.post('/chat/query', queryData),
  deleteSession: (sessionId) => apiClient.delete(`/chat/sessions/${sessionId}`),
  updateSession: (sessionId, sessionData) => 
    apiClient.patch(`/chat/sessions/${sessionId}`, sessionData),
};

// Forecasting API
export const forecastAPI = {
  generateForecast: (forecastRequest) => apiClient.post('/forecast', forecastRequest),
};

// Health API
export const healthAPI = {
  checkHealth: () => apiClient.get('/health'),
  checkRoot: () => apiClient.get('/'),
};

// Utility functions
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('accessToken', token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('accessToken');
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

export const getStoredUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user) => {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
};

export const isAuthenticated = () => {
  const token = localStorage.getItem('accessToken');
  const user = getStoredUser();
  return !!(token && user);
};

export const getQuickBooksSession = () => {
  try {
    const session = localStorage.getItem('quickbooksSessionToken');
    return session || null;
  } catch {
    return null;
  }
};

export const setQuickBooksSession = (sessionToken) => {
  if (sessionToken) {
    localStorage.setItem('quickbooksSessionToken', sessionToken);
  } else {
    localStorage.removeItem('quickbooksSessionToken');
  }
};

export const isQuickBooksConnected = () => {
  const session = getQuickBooksSession();
  return !!session;
};

export default apiClient;