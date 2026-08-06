import axios from 'axios';
import { ElMessage } from 'element-plus';

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

request.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body.code === 0) return body.data;
    ElMessage.error(body.message || '请求失败');
    return Promise.reject(new Error(body.message));
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else {
      ElMessage.error(error.response?.data?.message || error.message || '网络错误');
    }
    return Promise.reject(error);
  },
);

export default request;
