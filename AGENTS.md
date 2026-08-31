# AGENTS.md

## 项目概览
GEO Analyzer - Generative Engine Optimization 分析工具。从 Technical GEO 和 Content GEO 两大维度，共 12 个细分指标，深度分析网页在 AI 搜索引擎中的优化程度。

## 技术栈
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **Charts**: Chart.js + react-chartjs-2
- **Code Highlight**: react-syntax-highlighter

## 目录结构
```
src/
├── app/
│   ├── api/analyze/route.ts    # GEO 分析 API
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                # 主页面（URL输入 + 结果展示）
│   └── globals.css             # 全局样式
├── components/
│   ├── radar-chart.tsx         # 雷达图组件
│   ├── code-suggestion-card.tsx # 代码建议卡片（含语法高亮 + 折叠）
│   ├── dimension-detail.tsx    # 维度详情组件
│   └── score-gauge.tsx         # 分数仪表组件
├── lib/
│   ├── geo-analyzer.ts         # GEO 分析引擎核心逻辑
│   └── utils.ts                # 工具函数
└── types/
    └── geo.ts                  # 类型定义
```

## 开发命令
- `pnpm dev` - 启动开发服务
- `pnpm build` - 构建生产版本
- `pnpm start` - 启动生产服务
- `pnpm ts-check` - TypeScript 类型检查
- `pnpm lint` - ESLint 检查

## 核心功能
1. **URL 输入与分析**: 用户输入 URL，后端抓取页面 HTML 并分析
2. **Technical GEO 分析**: Crawlability / Content Accessibility / Semantic Structure / Entity & Schema / Internal Context / Metadata & AI Signals
3. **Content GEO 分析**: Product Facts / Feature Explainability / User Intent / Q&A / Use Cases / Comparison Context / Evidence & Trust
4. **雷达图可视化**: 使用 Chart.js 渲染两个雷达图
5. **代码优化建议**: 使用 react-syntax-highlighter 展示优化代码，原始代码可折叠

## 注意事项
- 分析引擎在 `src/lib/geo-analyzer.ts`，基于正则解析 HTML
- 代码建议组件使用深色主题，优化代码有左侧彩色边框区分
- 原始代码默认折叠，点击可展开
