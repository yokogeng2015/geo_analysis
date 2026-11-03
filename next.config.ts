import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // 本项目为全栈应用（含 /api/* SSE 流式路由），必须使用标准构建 + next start；
  // 静态导出（output: 'export'）不支持 API 路由与 robots.ts 动态生成，禁止开启
  turbopack: {
    root: path.resolve(__dirname),
  },
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
