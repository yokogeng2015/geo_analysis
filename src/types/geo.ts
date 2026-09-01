export interface DimensionScore {
  name: string;
  score: number; // 0-100
  issues: string[];
  suggestions: string[];
  contentSnippet?: string; // 1-2 lines of actual content from the page
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
  'Content Accessibility': '内容可访问性(AA评分)',
  'Semantic Structure': '语义结构(h1/h2/h3)',
  'Entity & Schema': '实体与结构化数据(系列/型号/schema)',
  'Internal Context': '内部页面关联(配件/推荐/对比/镜头)',
  'Metadata & AI Signals': '元数据与 AI 信号(title/meta/alt)',
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
  'User Intent / Q&A': '用户意图 / 问答',
  'Use Cases': '使用场景',
  'Comparison Context': '产品定位/对比/选择依据',
  'Evidence & Trust': '数据/可信度/备注',
};
