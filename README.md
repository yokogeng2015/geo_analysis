# GEO Analyzer

Generative Engine Optimization（生成式引擎优化）分析工具 —— 从 **Technical GEO** 与 **Content GEO** 两大维度、共 12 个细分指标，深度分析网页在 AI 搜索引擎（ChatGPT / 豆包 / Kimi 等）中的可理解性与推荐潜力。

本项目提供**两种部署形态**：

| 形态 | 入口 | 依赖 | 适用场景 |
|------|------|------|----------|
| **全栈版**（Next.js 16） | `src/app/page.tsx` | Node 运行时 + AI 凭证 | 完整功能：URL 分析、雷达图、代码/文案 AI 优化、PDF 导出 |
| **静态版**（纯 index.html） | `docs/index.html` | 任意静态托管，零后端 | GitHub Pages / 对象存储托管；核心分析引擎完全离线可用 |

---

## 静态版（GitHub Pages 就绪）

静态版复用与全栈版**同一份分析引擎**（`src/lib/geo-analyzer.ts` + `src/lib/code-optimizer.ts`），通过 tsup 打包为浏览器 IIFE：

```
docs/
├── index.html          # 单文件静态页（内联 CSS/JS，含三 Tab）
└── analyzer.bundle.js  # esbuild/tsup 打包的引擎（window.GeoAnalyzer）
```

### 功能

1. **页面分析**：输入 URL（自动尝试公共 CORS 代理抓取，失败可粘贴 HTML 兜底）→ 双总分 + 双雷达图（Chart.js）+ 12 维度明细 + 代码建议
2. **代码优化**：粘贴 HTML 片段 → alt 有效性检测（缺失/空/无意义，含缩略图预览）+ FAQ Schema 检测 + 优化后代码
3. **AI 工具**（可选）：火山方舟 OpenAI 兼容接口浏览器直连 —— GEO 文案优化（4 大原则 + 广告法合规）、AI 识图生成 alt；API Key 仅存本机 localStorage

> AI 工具 Tab 需自备火山方舟 API Key；不填则前两个 Tab 依然完整可用。

### 重新打包引擎

修改 `src/lib/geo-analyzer.ts` / `src/lib/code-optimizer.ts` 后需要重新生成 bundle：

```bash
pnpm run build:static
```

### GitHub Pages 启用步骤

1. 推送本仓库后，进入 GitHub 仓库 **Settings → Pages**
2. Source 选择 **Deploy from a branch**
3. Branch 选择 **main**，目录选择 **/docs**，保存
4. 约 1 分钟后访问 `https://<用户名>.github.io/geo_analysis/`

---

## 全栈版（Next.js）

### 快速开始

```bash
pnpm install        # 安装依赖（仅允许 pnpm）
pnpm dev            # 开发服务（热更新）
pnpm run build      # 生产构建
pnpm start          # 生产服务
```

### 开发检查

```bash
pnpm ts-check       # TypeScript 类型检查
pnpm lint           # ESLint
pnpm run build:static  # 重新打包静态版引擎
```

### 核心目录

```
src/
├── app/
│   ├── api/analyze/route.ts        # GEO 分析 API（服务端抓取 + 引擎分析）
│   ├── api/describe-image/route.ts # AI 识图生成 alt（SSE 流式）
│   ├── api/optimize-copy/route.ts  # GEO 文案优化（SSE 流式 + 广告法合规）
│   ├── api/extract-text/route.ts   # 截图 OCR 提取文案（SSE 流式）
│   └── page.tsx                    # 主页面
├── components/                     # UI 组件（雷达图/维度详情/优化面板等）
├── lib/
│   ├── geo-analyzer.ts             # GEO 分析引擎核心（12 维度，纯 TS，浏览器/Node 通用）
│   ├── code-optimizer.ts           # HTML 代码优化分析（alt/FAQ Schema）
│   ├── static-entry.ts             # 静态版浏览器入口（打包为 window.GeoAnalyzer）
│   └── ...
└── types/geo.ts                    # 类型定义
```

### 引擎双端复用说明

`geo-analyzer.ts` 与 `code-optimizer.ts` 为纯 TypeScript（无 Node API 依赖），同一份代码同时服务：

- **服务端**：`/api/analyze` 通过 `analyzeUrl(url)` 抓取并分析
- **浏览器**：`static-entry.ts` 暴露 `parseHTML(html, url)` + `analyzeParsedPage(page, url)`，由静态版直接调用

修改引擎后同时受益两端，记得跑 `pnpm run build:static` 同步静态版。

## 技术栈

- **Framework**: Next.js 16.1.1 (App Router) + React 19
- **UI**: shadcn/ui + Tailwind CSS 4
- **Charts**: Chart.js + react-chartjs-2（全栈版）/ Chart.js CDN（静态版）
- **静态打包**: tsup（esbuild）→ IIFE
- **PDF**: jsPDF + html-to-image
- **包管理器**: pnpm 9+
