'use client';

import { useState, useCallback } from 'react';
import { RadarChart } from '@/components/radar-chart';
import type { RadarDataset } from '@/components/radar-chart';
import { CodeSuggestionCard } from '@/components/code-suggestion-card';
import { DimensionDetail } from '@/components/dimension-detail';
import { ScoreGauge } from '@/components/score-gauge';
import type { AnalysisResult } from '@/types/geo';
import { TECHNICAL_DIMENSIONS, CONTENT_DIMENSIONS } from '@/types/geo';
import { cn } from '@/lib/utils';

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
  const [mainUrl, setMainUrl] = useState('');
  const [compareUrls, setCompareUrls] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('technical');

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
    const allUrls = [mainUrl, ...validCompareUrls];

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mainUrl: mainUrl.trim(), compareUrls: validCompareUrls.map(u => u.trim()) }),
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
      if (e.key === 'Enter' && !loading) {
        handleAnalyze();
      }
    },
    [handleAnalyze, loading]
  );

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
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-orange-400 flex items-center justify-center">
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
              <h1 className="text-lg font-bold">GEO Analyzer</h1>
              <p className="text-xs text-gray-500">
                Generative Engine Optimization 对比分析工具
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* URL Input Section */}
        <section className="mb-8">
          {/* Main URL */}
          <div className="mb-4">
            <label className="text-sm font-medium text-cyan-400 mb-2 block">
              主 URL（深度分析 + 优化建议）
            </label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
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
                  className="w-full pl-12 pr-4 py-3.5 bg-[#12121a] border border-cyan-500/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Compare URLs */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-400 mb-2 block">
              对比 URL（仅雷达图对比，最多 4 个）
            </label>
            <div className="space-y-2">
              {compareUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1 relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">
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
                      className="w-full pl-11 pr-4 py-2.5 bg-[#12121a] border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-white/20 transition-all text-sm"
                    />
                  </div>
                  {compareUrls.length > 1 && (
                    <button
                      onClick={() => removeCompareUrl(index)}
                      className="px-3 py-2.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
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
                className="mt-2 text-xs text-gray-500 hover:text-cyan-400 flex items-center gap-1 transition-colors"
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
              'w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-sm transition-all',
              loading
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black hover:shadow-lg hover:shadow-cyan-500/25 active:scale-95'
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

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-3">
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
        </section>

        {/* Loading state */}
        {loading && (
          <section className="flex flex-col items-center justify-center py-20">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              <div className="absolute inset-4 rounded-full border-2 border-t-transparent border-r-orange-400 border-b-transparent border-l-transparent animate-spin [animation-direction:reverse]" />
            </div>
            <p className="text-gray-400 text-sm">正在深度分析页面...</p>
            <p className="text-gray-600 text-xs mt-1">
              从 12 个维度评估 GEO 优化程度
            </p>
          </section>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-8">
            {/* Page info */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[#12121a] border border-white/5">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-orange-500/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-cyan-400"
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
                <h2 className="text-white font-semibold truncate">
                  {result.main.title}
                </h2>
                <p className="text-gray-500 text-sm truncate">{result.main.url}</p>
              </div>
              <div className="text-xs text-gray-500">
                {new Date(result.main.analyzedAt).toLocaleString('zh-CN')}
              </div>
            </div>

            {/* Score gauges for main URL */}
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

            {/* Comparison Radar Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-cyan-500/20 bg-[#12121a] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  <h3 className="text-cyan-400 font-semibold">
                    Technical GEO 对比
                  </h3>
                </div>
                <RadarChart
                  title="Technical GEO"
                  datasets={radarDatasets}
                  dimensions={[...TECHNICAL_DIMENSIONS]}
                />
              </div>
              <div className="rounded-2xl border border-orange-500/20 bg-[#12121a] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                  <h3 className="text-orange-400 font-semibold">
                    Content GEO 对比
                  </h3>
                </div>
                <RadarChart
                  title="Content GEO"
                  datasets={radarDatasets}
                  dimensions={[...CONTENT_DIMENSIONS]}
                />
              </div>
            </div>

            {/* Tab navigation for main URL details */}
            <div>
              <div className="flex gap-1 p-1 bg-[#12121a] rounded-xl border border-white/5 w-fit">
                <button
                  onClick={() => setActiveTab('technical')}
                  className={cn(
                    'px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
                    activeTab === 'technical'
                      ? 'bg-cyan-500/15 text-cyan-400'
                      : 'text-gray-400 hover:text-gray-200'
                  )}
                >
                  Technical GEO 详情
                </button>
                <button
                  onClick={() => setActiveTab('content')}
                  className={cn(
                    'px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
                    activeTab === 'content'
                      ? 'bg-orange-500/15 text-orange-400'
                      : 'text-gray-400 hover:text-gray-200'
                  )}
                >
                  Content GEO 详情
                </button>
              </div>
            </div>

            {/* Dimension details for main URL */}
            {currentCategory && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentCategory.dimensions.map((dim) => (
                  <DimensionDetail
                    key={dim.name}
                    dimension={dim}
                    accentColor={
                      activeTab === 'technical' ? 'cyan' : 'orange'
                    }
                  />
                ))}
              </div>
            )}

            {/* Code suggestions for main URL */}
            {currentCategory && currentCategory.suggestions.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <svg
                    className={cn(
                      'w-5 h-5',
                      activeTab === 'technical'
                        ? 'text-cyan-400'
                        : 'text-orange-400'
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
                  <span className="text-xs text-gray-500 font-normal ml-2">（基于主 URL）</span>
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

            {/* Overall summary */}
            <section className="rounded-2xl border border-white/5 bg-[#12121a] p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                综合优化结论
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-cyan-400 font-semibold mb-3 text-sm">
                    Technical GEO 总结
                  </h4>
                  <div className="space-y-2">
                    {result.main.technicalGEO.dimensions
                      .filter((d) => d.score < 80)
                      .sort((a, b) => a.score - b.score)
                      .map((d) => (
                        <div
                          key={d.name}
                          className="flex items-center gap-3 text-sm"
                        >
                          <span
                            className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold',
                              d.score < 50
                                ? 'bg-red-500/20 text-red-400'
                                : d.score < 70
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-blue-500/20 text-blue-400'
                            )}
                          >
                            {d.score}
                          </span>
                          <span className="text-gray-300">{d.name}</span>
                          <span className="text-gray-600 text-xs ml-auto">
                            {d.issues.length} 个问题
                          </span>
                        </div>
                      ))}
                    {result.main.technicalGEO.dimensions.every(
                      (d) => d.score >= 80
                    ) && (
                      <p className="text-emerald-400 text-sm">
                        所有维度得分均在 80 分以上，技术优化良好！
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-orange-400 font-semibold mb-3 text-sm">
                    Content GEO 总结
                  </h4>
                  <div className="space-y-2">
                    {result.main.contentGEO.dimensions
                      .filter((d) => d.score < 80)
                      .sort((a, b) => a.score - b.score)
                      .map((d) => (
                        <div
                          key={d.name}
                          className="flex items-center gap-3 text-sm"
                        >
                          <span
                            className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold',
                              d.score < 50
                                ? 'bg-red-500/20 text-red-400'
                                : d.score < 70
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-blue-500/20 text-blue-400'
                            )}
                          >
                            {d.score}
                          </span>
                          <span className="text-gray-300">{d.name}</span>
                          <span className="text-gray-600 text-xs ml-auto">
                            {d.issues.length} 个问题
                          </span>
                        </div>
                      ))}
                    {result.main.contentGEO.dimensions.every(
                      (d) => d.score >= 80
                    ) && (
                      <p className="text-emerald-400 text-sm">
                        所有维度得分均在 80 分以上，内容优化良好！
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <section className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-orange-500/10 border border-white/5 flex items-center justify-center mb-6">
              <svg
                className="w-12 h-12 text-gray-600"
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
            <h2 className="text-xl font-bold text-gray-300 mb-2">
              输入 URL 开始 GEO 对比分析
            </h2>
            <p className="text-gray-500 text-sm max-w-md">
              输入一个主 URL 进行深度分析，并可添加最多 4 个对比 URL 进行雷达图对比
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 max-w-lg">
              <div className="p-4 rounded-xl bg-[#12121a] border border-cyan-500/10">
                <h3 className="text-cyan-400 text-sm font-semibold mb-2">
                  Technical GEO
                </h3>
                <ul className="text-xs text-gray-500 space-y-1 text-left">
                  <li>- Crawlability</li>
                  <li>- Content Accessibility</li>
                  <li>- Semantic Structure</li>
                  <li>- Entity & Schema</li>
                  <li>- Internal Context</li>
                  <li>- Metadata & AI Signals</li>
                </ul>
              </div>
              <div className="p-4 rounded-xl bg-[#12121a] border border-orange-500/10">
                <h3 className="text-orange-400 text-sm font-semibold mb-2">
                  Content GEO
                </h3>
                <ul className="text-xs text-gray-500 space-y-1 text-left">
                  <li>- Product Facts</li>
                  <li>- Feature Explainability</li>
                  <li>- User Intent / Q&A</li>
                  <li>- Use Cases</li>
                  <li>- Comparison Context</li>
                  <li>- Evidence & Trust</li>
                </ul>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-xs text-gray-600">
          GEO Analyzer - Generative Engine Optimization 对比分析工具
        </div>
      </footer>
    </div>
  );
}
