export interface DimensionScore {
  name: string;
  score: number; // 0-100
  issues: string[];
  suggestions: string[];
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
  'Semantic Structure': '语义结构',
  'Entity & Schema': '实体与结构化数据',
  'Internal Context': '内部上下文',
  'Metadata & AI Signals': '元数据与 AI 信号',
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
  'Product Facts': '产品事实',
  'Feature Explainability': '功能可解释性',
  'User Intent / Q&A': '用户意图 / 问答',
  'Use Cases': '使用场景',
  'Comparison Context': '对比上下文',
  'Evidence & Trust': '证据与信任',
};
