import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GEO Analyzer - Generative Engine Optimization 分析工具',
  description:
    '从 Technical GEO 和 Content GEO 两大维度，共 12 个细分指标，深度分析网页在 AI 搜索引擎中的优化程度',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased" style={{ fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
