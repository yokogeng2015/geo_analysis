import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 1. 开启静态导出，让 next build 自动在 out 目录生成纯静态的 index.html
  output: 'export',

  // outputFileTracingRoot: path.resolve(__dirname, '../../'),  // Uncomment and add 'import path from "path"' if needed
  /* config options here */
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    // 2. 静态导出必须关闭 Next.js 默认的服务端图片优化，否则打包会报错
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
