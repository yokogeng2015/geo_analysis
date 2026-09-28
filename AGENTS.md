# AGENTS.md

## 项目概览
GEO Analyzer - Generative Engine Optimization 分析工具。从 Technical GEO 和 Content GEO 两大维度，共 12 个细分指标，深度分析网页在 AI 搜索引擎中的优化程度。

## 技术栈
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **Charts**: Chart.js + react-chartjs-2
- **PDF**: jsPDF + html-to-image（浏览器原生 SVG foreignObject 渲染，完美支持 oklch/lab）

## 目录结构
```
src/
── app/
│   ├── api/analyze/route.ts    # GEO 分析 API
│   ├── api/describe-image/route.ts # AI 识图生成 alt（SSE 流式，多模态 LLM）
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                # 主页面（URL输入 + 结果展示）
│   └── globals.css             # 全局样式
├── components/
│   ├── radar-chart.tsx         # 雷达图组件（forwardRef 暴露 Chart 实例）
│   ├── pdf-layout.tsx          # PDF 导出布局（平铺双雷达图 + 维度详情）
│   ├── code-suggestion-card.tsx # 代码建议卡片（含语法高亮 + 折叠）
│   ├── dimension-detail.tsx    # 维度详情组件
│   ├── score-gauge.tsx         # 分数仪表组件
│   ├── code-optimizer.tsx      # 代码优化组件（alt 检测 + FAQ Schema）
│   ├── alt-issue-item.tsx      # Alt 问题项（左侧缩略图点击放大 + AI 识图勾选框，memoized + 防抖）
│   └── optimization-modal.tsx  # Comparison Context 优化弹窗
├── lib/
│   ├── geo-analyzer.ts         # GEO 分析引擎核心逻辑
│   ├── code-optimizer.ts       # HTML 代码优化分析（alt 检测增强）
│   ├── pdf-export.ts           # PDF 导出（onclone 修复 lab/oklch 颜色）
│   └── utils.ts                # 工具函数
└── types/
    └── geo.ts                  # 类型定义（含中英文维度映射）
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
4. **雷达图可视化**: 使用 Chart.js 渲染两个雷达图（支持多站点对比叠加）
5. **代码优化建议**: 使用 react-syntax-highlighter 展示优化代码，原始代码可折叠
6. **代码优化模式**: 粘贴 HTML body，检测 alt 属性问题和 FAQ Schema 缺失；支持 AI 识图生成 alt（输入型号名后，多模态 LLM 识别图片内容并按 Apple 官网风格生成描述）
7. **竞品对比分析**: 基于双方页面真实内容生成对比点（场景化叙事 / 量化数据 / 结构化步骤），引用具体原文并解释 AI 理解差异
8. **PDF 导出**: 使用 html-to-image（浏览器原生 SVG foreignObject 渲染）导出完整报告，完美支持 Tailwind v4 的 oklch/lab 颜色

## 注意事项
- 分析引擎在 `src/lib/geo-analyzer.ts`，基于正则解析 HTML
- **文本提取（collectContentTexts）**：SPA 页面数据常藏在 script JSON 和标签属性（如华为的 `<input data-xxx="JSON">`）中，提取路径包括：可见段落/列表 → script 块 → 属性值 JSON → body JSON 兜底；处理时先解码实体（`&#34;`/`&lt;`）再反转义 `\"`，避免破坏标签边界
- **引文清洗**：findScenarioTexts/findQuantTexts 通过 FOOTER_NOISE 过滤页脚/客服/备案噪声，按长度+信息密度评分排序，确保引用真实完整句子
- 竞品对比点数据由 `generateComparisonPoints` 生成，API 返回 `comparisonPoints: Record<compUrl, ComparisonPoint[]>`
- 代码建议组件使用深色主题，优化代码有左侧彩色边框区分
- 原始代码默认折叠，点击可展开
- PDF 导出使用 `html-to-image`，基于浏览器原生 SVG `<foreignObject>` 渲染，无需手动处理 `lab()`/`oklch()` 颜色转换
- **AI 识图（/api/describe-image）**：POST `{ imageUrl, modelName? }`，SSE 流式返回 `{delta}`/`{done}`/`{error}`；服务端代理下载图片（带 UA/Referer 防盗链、解码 `&amp;` 实体、8MB 上限）转 base64 dataURI，调用 doubao-seed-2-0-lite 多模态模型；前端通过 `src/lib/ai-describe-client.ts` 的 `streamAltDescription`（fetch `body.getReader()` 逐帧解析 SSE）消费；列表项支持勾选多选后「一键 AI 识图」按列表顺序**串行**逐张识别（识别中按钮变「停止 N/M」可中断，流式增量 150ms 节流写入编辑态），批量完成后结果进入编辑态、参与「一键应用所有修改」
- 雷达图组件使用 `forwardRef` 暴露 Chart 实例，供 PDF 导出使用 `toBase64Image()`
