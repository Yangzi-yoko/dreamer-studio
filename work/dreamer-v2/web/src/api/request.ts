import axios from 'axios';

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('member_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

request.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body.code === 0) return body.data;
    return Promise.reject(new Error(body.message || '请求失败'));
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default request;
