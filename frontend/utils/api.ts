import axios from 'axios';

// Axios 实例：通过 Next.js 代理转发请求到后端
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export default api;
