import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export function showToast(message: string, type: 'success' | 'error' = 'success') {
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
}

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(new Error('未登录'));
    }

    let message = '请求失败';
    if (error.response?.data?.detail) {
      if (typeof error.response.data.detail === 'string') {
        message = error.response.data.detail;
      } else if (Array.isArray(error.response.data.detail)) {
        message = error.response.data.detail[0]?.msg || message;
      }
    } else if (error.message) {
      message = error.message;
    }
    showToast(message, 'error');
    return Promise.reject(new Error(message));
  }
);

export default api;
