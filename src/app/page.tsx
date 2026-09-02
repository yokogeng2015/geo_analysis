'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { RadarChart } from '@/components/radar-chart';
import type { RadarDataset } from '@/components/radar-chart';
import { CodeSuggestionCard } from '@/components/code-suggestion-card';
import { DimensionDetail } from '@/components/dimension-detail';
import { ScoreGauge } from '@/components/score-gauge';
import { CodeOptimizer } from '@/components/code-optimizer';
import { OptimizationModal } from '@/components/optimization-modal';
import { analyzeHTMLCode } from '@/lib/code-optimizer';
import { exportToPdfWithCharts } from '@/lib/pdf-export';
import { PdfLayout } from '@/components/pdf-layout';
import type { AnalysisResult } from '@/types/geo';
import { TECHNICAL_DIMENSIONS, CONTENT_DIMENSIONS, TECHNICAL_DIMENSIONS_CN, CONTENT_DIMENSIONS_CN } from '@/types/geo';
import { cn } from '@/lib/utils';

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

type AppMode = 'analyze' | 'optimize';
type TabType = 'technical' | 'content';

interface CompareResult {
  url: string;
  title: string;
  technicalGEO: AnalysisResult['technicalGEO'];
  contentGEO: AnalysisResult['contentGEO'];
}

interface AnalyzeResponse {
  main: AnalysisResult;
  comparisons: CompareResult[];
}

export default function Home() {
  const [mode, setMode] = useState<AppMode>('analyze');

  // Analyze mode state
  const [mainUrl, setMainUrl] = useState('');
  const [compareUrls, setCompareUrls] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('technical');
  const [exporting, setExporting] = useState(false);
  const [showOptModal, setShowOptModal] = useState(false);
  const [optItems, setOptItems] = useState<{ source: string; optimized: string; reason: string }[]>([]);

  // Optimize mode state
  const [htmlCode, setHtmlCode] = useState('');
  const [codeResult, setCodeResult] = useState<ReturnType<typeof analyzeHTMLCode> | null>(null);
  const [optimizedCode, setOptimizedCode] = useState('');
  const [analyzingProgress, setAnalyzingProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Cache for code analysis results
  const codeAnalysisCache = useMemo(() => new Map<string, ReturnType<typeof analyzeHTMLCode>>(), []);

  const addCompareUrl = () => {
    if (compareUrls.length < 4) {
      setCompareUrls([...compareUrls, '']);
    }
  };

  const removeCompareUrl = (index: number) => {
    setCompareUrls(compareUrls.filter((_, i) => i !== index));
  };

  const updateCompareUrl = (index: number, value: string) => {
    setCompareUrls(compareUrls.map((url, i) => (i === index ? value : url)));
  };

  const handleAnalyze = useCallback(async () => {
    if (!mainUrl.trim()) {
      setError('请输入主 URL');
      return;
    }

    const validCompareUrls = compareUrls.filter((u) => u.trim());

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mainUrl: mainUrl.trim(), compareUrls: validCompareUrls.map((u) => u.trim()) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '分析失败');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [mainUrl, compareUrls]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !loading && mode === 'analyze') {
        handleAnalyze();
      }
    },
    [handleAnalyze, loading, mode]
  );

  const handleCodeAnalyze = useCallback(() => {
    if (!htmlCode.trim()) {
      setError('请粘贴 HTML 代码');
      return;
    }
    setError('');

    // Check cache first
    const cached = codeAnalysisCache.get(htmlCode);
    if (cached) {
      setCodeResult(cached);
      setOptimizedCode(cached.optimizedCode);
      return;
    }

    setIsAnalyzing(true);
    setAnalyzingProgress(0);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setAnalyzingProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 50);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const analysis = analyzeHTMLCode(htmlCode);
      clearInterval(progressInterval);
      setAnalyzingProgress(100);

      // Cache the result
      codeAnalysisCache.set(htmlCode, analysis);

      setCodeResult(analysis);
      setOptimizedCode(analysis.optimizedCode);
      setIsAnalyzing(false);
      setAnalyzingProgress(0);
    }, 100);
  }, [htmlCode, codeAnalysisCache]);

  const handleOptimizedCodeChange = useCallback((code: string) => {
    setOptimizedCode(code);
  }, []);

  const technicalChartRef = useRef<any>(null);
  const contentChartRef = useRef<any>(null);
  const pdfLayoutRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = useCallback(async () => {
    if (!result) return;
    setExporting(true);
    try {
      const domain = result.main.url.replace(/^https?:\/\//, '').replace(/\//g, '_');
      await exportToPdfWithCharts(
        'geo-report',
        `GEO分析报告_${domain}.pdf`,
        technicalChartRef.current,
        contentChartRef.current
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF 导出失败');
    } finally {
      setExporting(false);
    }
  }, [result]);

  const currentCategory =
    activeTab === 'technical' ? result?.main.technicalGEO : result?.main.contentGEO;

  const dimensions =
    activeTab === 'technical' ? [...TECHNICAL_DIMENSIONS] : [...CONTENT_DIMENSIONS];

  // Build radar datasets
  const radarDatasets: RadarDataset[] = [];
  if (result) {
    const mainCat =
      activeTab === 'technical' ? result.main.technicalGEO : result.main.contentGEO;
    radarDatasets.push({
      label: result.main.title || result.main.url,
      dimensions: mainCat.dimensions,
      borderColor: '',
      backgroundColor: '',
      pointColor: '',
    });

    result.comparisons.forEach((comp) => {
      const compCat =
        activeTab === 'technical' ? comp.technicalGEO : comp.contentGEO;
      radarDatasets.push({
        label: comp.title || comp.url,
        dimensions: compCat.dimensions,
        borderColor: '',
        backgroundColor: '',
        pointColor: '',
      });
    });
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-amber-500 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">GEO Analyzer</h1>
              <p className="text-xs text-gray-500">
                Generative Engine Optimization 工具
              </p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setMode('analyze')}
              className={cn(
                'px-5 py-2 rounded-lg text-sm font-medium transition-all',
                mode === 'analyze'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                分析
              </span>
            </button>
            <button
              onClick={() => setMode('optimize')}
              className={cn(
                'px-5 py-2 rounded-lg text-sm font-medium transition-all',
                mode === 'optimize'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                优化代码
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
            <svg
              className="w-5 h-5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
          </div>
        )}

        {/* ==================== ANALYZE MODE ==================== */}
        {mode === 'analyze' && (
          <>
            {/* URL Input Section */}
            <section className="mb-8">
              {/* Main URL */}
              <div className="mb-4">
                <label className="text-sm font-medium text-sky-600 mb-2 block">
                  主 URL（深度分析 + 优化建议）
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={mainUrl}
                      onChange={(e) => setMainUrl(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="输入主分析 URL，例如 https://example.com"
                      className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Compare URLs */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-600 mb-2 block">
                  对比 URL（仅雷达图对比，最多 4 个）
                </label>
                <div className="space-y-2">
                  {compareUrls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1 relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                            />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={url}
                          onChange={(e) => updateCompareUrl(index, e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder={`对比 URL ${index + 1}`}
                          className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-300 transition-all text-sm"
                        />
                      </div>
                      {compareUrls.length > 1 && (
                        <button
                          onClick={() => removeCompareUrl(index)}
                          className="px-3 py-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {compareUrls.length < 4 && (
                  <button
                    onClick={addCompareUrl}
                    className="mt-2 text-xs text-gray-500 hover:text-sky-600 flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    添加对比 URL
                  </button>
                )}
              </div>

              {/* Analyze button */}
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className={cn(
                  'px-8 py-3.5 rounded-xl font-semibold text-sm transition-all',
                  loading
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-sky-500 to-sky-400 text-white hover:shadow-lg hover:shadow-sky-500/25 active:scale-95'
                )}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    分析中...
                  </span>
                ) : (
                  '开始对比分析'
                )}
              </button>
            </section>

            {/* Loading state */}
            {loading && (
              <section className="flex flex-col items-center justify-center py-20">
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 rounded-full border-2 border-sky-200 animate-ping" />
                  <div className="absolute inset-2 rounded-full border-2 border-t-sky-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                  <div className="absolute inset-4 rounded-full border-2 border-t-transparent border-r-amber-400 border-b-transparent border-l-transparent animate-spin [animation-direction:reverse]" />
                </div>
                <p className="text-gray-500 text-sm">正在深度分析页面...</p>
                <p className="text-gray-400 text-xs mt-1">
                  从 12 个维度评估 GEO 优化程度
                </p>
              </section>
            )}

            {/* Results */}
            {result && !loading && (
              <div id="geo-report" className="space-y-8">
                {/* Page info */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-100 to-amber-100 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-sky-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-gray-900 font-semibold truncate" title={result.main.title}>
                      {truncateText(result.main.title, 20)}
                    </h2>
                    <p className="text-gray-500 text-sm truncate">{result.main.url}</p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(result.main.analyzedAt).toLocaleString('zh-CN')}
                  </div>
                  <button
                    onClick={handleExportPdf}
                    disabled={exporting}
                    className={cn(
                      'ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0',
                      exporting
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-200'
                    )}
                  >
                    {exporting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        生成中...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        下载 PDF
                      </>
                    )}
                  </button>
                </div>

                {/* Score gauges */}
                <div className="flex justify-center gap-16">
                  <ScoreGauge
                    score={result.main.technicalGEO.overallScore}
                    label="Technical GEO"
                    color="cyan"
                  />
                  <ScoreGauge
                    score={result.main.contentGEO.overallScore}
                    label="Content GEO"
                    color="orange"
                  />
                </div>

                {/* Tab navigation - above radar chart */}
                <div className="flex justify-center">
                  <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                    <button
                      onClick={() => setActiveTab('technical')}
                      className={cn(
                        'px-6 py-2.5 rounded-lg text-sm font-medium transition-all',
                        activeTab === 'technical'
                          ? 'bg-white text-sky-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      )}
                    >
                      Technical GEO
                    </button>
                    <button
                      onClick={() => setActiveTab('content')}
                      className={cn(
                        'px-6 py-2.5 rounded-lg text-sm font-medium transition-all',
                        activeTab === 'content'
                          ? 'bg-white text-amber-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      )}
                    >
                      Content GEO
                    </button>
                  </div>
                </div>

                {/* Single Radar Chart */}
                <div className={cn(
                  'rounded-2xl bg-white p-8 shadow-sm max-w-3xl mx-auto',
                  activeTab === 'technical' ? 'border-2 border-sky-200' : 'border-2 border-amber-200'
                )}>
                  <RadarChart
                    title={activeTab === 'technical' ? 'Technical GEO' : 'Content GEO'}
                    datasets={radarDatasets}
                    dimensions={dimensions}
                    dimensionLabels={dimensions.map((d) => {
                      const cnMap = activeTab === 'technical' ? TECHNICAL_DIMENSIONS_CN : CONTENT_DIMENSIONS_CN;
                      return `${d}\n${cnMap[d] || ''}`;
                    })}
                  />
                </div>

                {/* Comparison info */}
                {result.comparisons.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <span className="text-xs text-gray-400">对比站点：</span>
                    {result.comparisons.map((comp, i) => (
                      <span key={i} className="text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                        {comp.title || comp.url.replace(/^https?:\/\//, '')}
                      </span>
                    ))}
                  </div>
                )}

                {/* Dimension details */}
                {currentCategory && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentCategory.dimensions.map((dim) => {
                      const cnMap = activeTab === 'technical' ? TECHNICAL_DIMENSIONS_CN : CONTENT_DIMENSIONS_CN;
                      const isComparisonContext = dim.name === 'Comparison Context';
                      return (
                        <DimensionDetail
                          key={dim.name}
                          dimension={dim}
                          accentColor={
                            activeTab === 'technical' ? 'cyan' : 'orange'
                          }
                          chineseName={cnMap[dim.name]}
                          showOptimizationBtn={isComparisonContext && dim.score < 80}
                          onOptimizationClick={() => {
                            // Generate optimization items from the dimension's issues and suggestions
                            const items = dim.issues.map((issue, i) => ({
                              source: issue,
                              optimized: dim.suggestions[i] || issue,
                              reason: `问题 ${i + 1}：${issue}`,
                            }));
                            setOptItems(items);
                            setShowOptModal(true);
                          }}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Code suggestions */}
                {currentCategory && currentCategory.suggestions.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <svg
                        className={cn(
                          'w-5 h-5',
                          activeTab === 'technical'
                            ? 'text-sky-500'
                            : 'text-amber-500'
                        )}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                        />
                      </svg>
                      优化代码建议
                      <span className="text-xs text-gray-400 font-normal ml-2">（基于主 URL）</span>
                    </h3>
                    <div className="space-y-4">
                      {currentCategory.suggestions.map((suggestion, i) => (
                        <CodeSuggestionCard
                          key={i}
                          suggestion={suggestion}
                          accentColor={
                            activeTab === 'technical' ? 'cyan' : 'orange'
                          }
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Competitor references for dimensions where competitors do better */}
                {activeTab === 'content' && result.comparisons.length > 0 && currentCategory && (
                  <section>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      竞品参考
                      <span className="text-xs text-gray-400 font-normal ml-2">（得分高于主站的维度）</span>
                    </h3>
                    <div className="space-y-4">
                      {currentCategory.dimensions.map((dim) => {
                        // Find competitors that score higher on this dimension
                        const betterCompetitors = result.comparisons
                          .map((comp) => {
                            const compDim = comp.contentGEO.dimensions.find((d) => d.name === dim.name);
                            return { comp, compDim };
                          })
                          .filter(({ compDim }) => compDim && compDim.score > dim.score && compDim.score >= 60);

                        if (betterCompetitors.length === 0) return null;

                        const cnMap = CONTENT_DIMENSIONS_CN;
                        const mainIssues = dim.issues;
                        return (
                          <div key={dim.name} className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-sm font-semibold text-gray-900">{dim.name}</span>
                              <span className="text-xs text-gray-400">{cnMap[dim.name]}</span>
                              <span className="text-xs text-red-500 ml-auto">主站 {dim.score}分</span>
                            </div>
                            {betterCompetitors.map(({ comp, compDim }) => {
                              const scoreDiff = compDim!.score - dim.score;
                              return (
                                <div key={comp.url} className="mb-3 last:mb-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                      {comp.title || comp.url.replace(/^https?:\/\//, '')}
                                    </span>
                                    <span className="text-xs text-emerald-600">{compDim!.score}分</span>
                                    <span className="text-xs text-gray-400">（高出 {scoreDiff} 分）</span>
                                  </div>
                                  {/* Why competitor is better */}
                                  <div className="ml-2 space-y-2">
                                    <div className="text-xs text-gray-700">
                                      <span className="font-medium text-emerald-700">✓ 做得好的地方：</span>
                                    </div>
                                    {compDim!.suggestions.length > 0 && (
                                      <ul className="space-y-1 ml-3">
                                        {compDim!.suggestions.map((s, j) => (
                                          <li key={j} className="text-xs text-gray-600 flex items-start gap-1.5">
                                            <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                                            {s}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                    {/* Contrast with main site issues */}
                                    {mainIssues.length > 0 && (
                                      <div className="mt-2">
                                        <div className="text-xs text-gray-700">
                                          <span className="font-medium text-red-500"> 主站不足：</span>
                                        </div>
                                        <ul className="space-y-1 ml-3 mt-1">
                                          {mainIssues.slice(0, 3).map((issue, j) => (
                                            <li key={j} className="text-xs text-gray-500 flex items-start gap-1.5">
                                              <span className="text-red-400 mt-0.5 shrink-0">•</span>
                                              {issue}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {/* Content snippet from competitor */}
                                    {compDim!.contentSnippet && (
                                      <div className="mt-2 text-xs text-gray-600 bg-white/60 rounded px-3 py-2 border border-gray-100">
                                        <span className="font-medium text-gray-700"> 内容示例：</span>
                                        <span className="text-gray-500 ml-1">{compDim!.contentSnippet}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* Empty state for analyze mode */}
            {!result && !loading && (
              <section className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-sky-100 to-amber-100 border border-gray-200 flex items-center justify-center mb-6">
                  <svg
                    className="w-12 h-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-700 mb-2">
                  输入 URL 开始 GEO 对比分析
                </h2>
                <p className="text-gray-500 text-sm max-w-md">
                  输入一个主 URL 进行深度分析，并可添加最多 4 个对比 URL 进行雷达图对比
                </p>
              </section>
            )}
          </>
        )}

        {/* ==================== OPTIMIZE MODE ==================== */}
        {mode === 'optimize' && (
          <>
            {/* Code input */}
            <section className="mb-8">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                粘贴 HTML 代码（body 内容）
              </label>
              <textarea
                value={htmlCode}
                onChange={(e) => setHtmlCode(e.target.value)}
                placeholder={`粘贴你的 HTML 代码到这里...\n\n例如：\n<div>\n  <img src="hero.jpg" />\n  <img src="logo.png" alt="img" />\n  <h2>常见问题</h2>\n</div>`}
                rows={12}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 font-mono text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 transition-all resize-y"
              />
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  支持检测：图片 alt 属性缺失/无意义、FAQ Schema 缺失
                </p>
                <button
                  onClick={handleCodeAnalyze}
                  disabled={!htmlCode.trim() || isAnalyzing}
                  className={cn(
                    'px-6 py-2.5 rounded-xl font-semibold text-sm transition-all',
                    !htmlCode.trim() || isAnalyzing
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-sky-500 to-sky-400 text-white hover:shadow-lg hover:shadow-sky-500/25 active:scale-95'
                  )}
                >
                  {isAnalyzing ? '分析中...' : '分析并优化'}
                </button>
              </div>

              {/* Progress bar */}
              {isAnalyzing && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-600">正在解析 HTML 代码...</span>
                    <span className="text-xs font-medium text-sky-600">{analyzingProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${analyzingProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Code optimization results */}
            {codeResult && (
              <CodeOptimizer
                sourceCode={htmlCode}
                altIssues={codeResult.altIssues}
                faqIssues={codeResult.faqIssues}
                optimizedCode={codeResult.optimizedCode}
                stats={codeResult.stats}
                onCodeChange={handleOptimizedCodeChange}
                imageUrlPrefix="https://www.sonystyle.com.cn"
              />
            )}

            {/* Empty state for optimize mode */}
            {!codeResult && (
              <section className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-sky-100 to-amber-100 border border-gray-200 flex items-center justify-center mb-6">
                  <svg
                    className="w-12 h-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-700 mb-2">
                  粘贴 HTML 代码开始优化
                </h2>
                <p className="text-gray-500 text-sm max-w-md">
                  粘贴 HTML body 内容，自动检测 alt 属性问题和 FAQ Schema 缺失，
                  提供左右对照的优化建议
                </p>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
                  <div className="p-4 rounded-xl bg-white border border-gray-200 text-left">
                    <h3 className="text-red-600 text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                      </svg>
                      Alt 属性检测
                    </h3>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>- 缺失 alt 属性标红</li>
                      <li>- 空 alt 值标红</li>
                      <li>- 无意义 alt（如 "img"）标红</li>
                      <li>- 支持手动编辑修改</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-gray-200 text-left">
                    <h3 className="text-amber-600 text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      FAQ Schema
                    </h3>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>- 检测是否缺少 FAQ Schema</li>
                      <li>- 引导填写问答内容</li>
                      <li>- 自动生成 JSON-LD 代码</li>
                      <li>- 一键添加到代码末尾</li>
                    </ul>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-xs text-gray-400">
          GEO Analyzer - Generative Engine Optimization 工具
        </div>
      </footer>

      {/* Optimization Modal */}
      <OptimizationModal
        isOpen={showOptModal}
        onClose={() => setShowOptModal(false)}
        items={optItems}
      />

      {/* Off-screen PDF layout for export (charts + dimension details) */}
      {result && (
        <div
          className="fixed top-0 left-0 w-[210mm] bg-white"
          style={{ opacity: 0, pointerEvents: 'none', zIndex: -1 }}
          id="pdf-charts-container"
        >
          <PdfLayout
            ref={pdfLayoutRef}
            result={result}
            technicalChartRef={technicalChartRef}
            contentChartRef={contentChartRef}
          />
        </div>
      )}
    </div>
  );
}
