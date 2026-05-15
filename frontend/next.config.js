/** @type {import('next').NextConfig} */
const nextConfig = {
  // API 代理：将前端的 /api 请求转发到后端 http://localhost:3000，避免跨域问题
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
