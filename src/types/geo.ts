export interface DimensionScore {
  name: string;
  score: number; // 0-100
  issues: string[];
  suggestions: string[];
  contentSnippet?: string; // 1-2 lines of actual content from the page
}

// 竞品对比分析点：展示双方实际内容 + AI 提取逻辑说明
export interface ComparisonPoint {
  topic: string; // 对比主题，如"缺乏'问题-解决方案'的结构化叙事"
  aiLogic: string; // AI 提取逻辑说明，如"GEO 极其偏好'场景/痛点 → 解决方案 → 操作步骤'的文本结构"
  competitorText?: string; // 竞品实际内容引用（1-2 行）
  competitorAnalysis?: string; // 为什么竞品的写法对 AI 更友好
  mainText?: string; // 主站实际内容引用（1-2 行）
  mainAnalysis?: string; // 为什么主站的写法对 AI 不友好
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
  'Crawlability': '可爬取性',
  'Content Accessibility': '内容可访问性',
  'Semantic Structure': '语义结构(h1)',
  'Entity & Schema': '实体与结构化数据(schema)',
  'Internal Context': '内部页面关联(推荐/关联)',
  'Metadata & AI Signals': '元数据与 AI 信号(title/alt)',
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
