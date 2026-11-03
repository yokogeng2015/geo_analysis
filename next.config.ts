import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 开启静态导出
  output: 'export',

  // 关键：指定你的 GitHub 仓库子路径名称（前后都要有斜杠或只在前面加）
  basePath: '/geo_analysis',
  assetPrefix: '/geo_analysis/',

  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    unoptimized: true,
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
