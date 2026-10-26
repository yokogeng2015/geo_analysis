export interface DimensionScore {
  name: string;
  score: number; // 0-100
  issues: string[];
  suggestions: string[];
  contentSnippet?: string; // 1-2 lines of actual content from the page
  intentGaps?: IntentGap[]; // 用户高频意图缺口分析（Comparison Context 专用）
}

// 用户高频意图缺口（Prompt Intent Gap Analysis）
export interface IntentGap {
  topic: string; // 缺失问题点：缺少哪个具体场景或对比维度的解答
  status: 'missing' | 'unstructured'; // 页面现状类型：未覆盖 / 非结构化
  pageStatus: string; // 页面现状描述
  userPrompt: string; // 用户高频 Prompt（具体提问方式）
  suggestion: string; // 建议补齐文案（直接可复制）
  suggestionLabel?: string; // 建议文案的类型标签（如"在【佩戴体验】模块新增段落" / "新增 2×3 HTML 表格"）
}

// 竞品对比分析点：诊断结论 → 竞品示范 → 己方对照 → 改写示范
export interface ComparisonPoint {
  topic: string; // 诊断定位，如"缺乏'场景/痛点 → 功能响应'的场景化叙事"
  rationale: string; // 判定依据：GEO 为什么重视这一点（1 句话）
  competitorText?: string; // 🟢 竞品优质示范原文（已过滤免责/按钮/页脚文本）
  competitorAnalysis?: string; // 亮点解析：该文案如何匹配 Prompt Intent
  mainText?: string; // 🔴 己方劣势文本原文（堆砌式/广告化文案）
  mainAnalysis?: string; // 问题诊断：为什么属于低熵/营销修饰词
  rewrite?: string; // 💡 推荐优化改写方案（标准 GEO 范例文案）
}

export interface CodeSuggestion {
  type: 'optimize' | 'add' | 'fix';
  title: string;
  description: string;
  originalCode?: string;
  optimizedCode: string;
  language: string;
}

export interface CategoryResult {
  dimensions: DimensionScore[];
  overallScore: number;
  suggestions: CodeSuggestion[];
}

export interface AnalysisResult {
  url: string;
  title: string;
  technicalGEO: CategoryResult;
  contentGEO: CategoryResult;
  analyzedAt: string;
}

export const TECHNICAL_DIMENSIONS = [
  'Crawlability',
  'Content Accessibility',
  'Semantic Structure',
  'Entity & Schema',
  'Internal Context',
  'Metadata & AI Signals',
] as const;

export const TECHNICAL_DIMENSIONS_CN: Record<string, string> = {
  'Crawlability': '信源爬取性能',
  'Content Accessibility': '内容可识别性',
  'Semantic Structure': '标题/框架结构',
  'Entity & Schema': 'AI专属信息结构(schema)',
  'Internal Context': '产品关联性(推荐/配件)',
  'Metadata & AI Signals': '商品信息',
};

export const CONTENT_DIMENSIONS = [
  'Product Facts',
  'Feature Explainability',
  'User Intent / Q&A',
  'Use Cases',
  'Comparison Context',
  'Evidence & Trust',
] as const;

export const CONTENT_DIMENSIONS_CN: Record<string, string> = {
  'Product Facts': '产品信息/准确性',
  'Feature Explainability': '功能/卖点描述',
  'User Intent/Q&A': '用户意图/问答',
  'Use Cases': '使用场景',
  'Comparison Context': '定位/对比/选择依据',
  'Evidence & Trust': '数据/可信度',
};
