import { MetadataRoute } from 'next';

// 加上这一行，告诉 Next.js 在静态导出时将其编译为静态文件
export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/_next/', '/static/'],
    },
  };
}
