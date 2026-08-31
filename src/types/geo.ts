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

export const CONTENT_DIMENSIONS = [
  'Product Facts',
  'Feature Explainability',
  'User Intent / Q&A',
  'Use Cases',
  'Comparison Context',
  'Evidence & Trust',
] as const;
