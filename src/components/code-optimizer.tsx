'use client';

import { useState, useMemo, useCallback } from 'react';
import type { AltIssue, FAQIssue } from '@/lib/code-optimizer';
import { generateFaqSchema } from '@/lib/code-optimizer';
import { cn } from '@/lib/utils';
import { AltIssueItem } from './alt-issue-item';

interface CodeOptimizerProps {
  sourceCode: string;
  altIssues: AltIssue[];
  faqIssues: FAQIssue[];
  optimizedCode: string;
  stats: {
    totalImages: number;
    imagesWithAlt: number;
    imagesWithoutAlt: number;
    hasFaqSchema: boolean;
  };
  onCodeChange: (code: string) => void;
  imageUrlPrefix?: string;
  onImageUrlPrefixChange?: (prefix: string) => void;
}

interface EditedAlt {
  [key: number]: string;
}

export function CodeOptimizer({
  sourceCode,
  altIssues,
  faqIssues,
  optimizedCode: initialOptimized,
  stats,
  onCodeChange,
  imageUrlPrefix: externalPrefix,
  onImageUrlPrefixChange,
}: CodeOptimizerProps) {
  const [editedAlts, setEditedAlts] = useState<EditedAlt>({});
  const [faqQuestions, setFaqQuestions] = useState<{ q: string; a: string }[]>([
    { q: '', a: '' },
  ]);
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'sony' | 'other'>('sony');
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [internalPrefix, setInternalPrefix] = useState('https://www.sonystyle.com.cn');
  const [modelName, setModelName] = useState('');

  const imageUrlPrefix = externalPrefix ?? internalPrefix;
  const setPrefix = onImageUrlPrefixChange ?? setInternalPrefix;

  // Split alt issues into two tabs
  const sonyIssues = useMemo(
    () => altIssues.filter((issue) => issue.src?.includes('/content/dam/sonystyle/products/')),
    [altIssues]
  );
  const otherIssues = useMemo(
    () => altIssues.filter((issue) => !issue.src?.includes('/content/dam/sonystyle/products/')),
    [altIssues]
  );
  const currentIssues = activeTab === 'sony' ? sonyIssues : otherIssues;

  // Build highlighted source with alt issues marked
  const highlightedSource = useMemo(() => {
    let code = sourceCode;
    // We'll use a custom approach: render the source with inline markers
    return code;
  }, [sourceCode]);

  const handleAltEdit = useCallback((issueIndex: number, newAlt: string) => {
    setEditedAlts((prev) => ({ ...prev, [issueIndex]: newAlt }));
  }, []);

  const applyAllAlts = useCallback(() => {
    let code = sourceCode;
    altIssues.forEach((issue, i) => {
      const alt = editedAlts[i] || issue.suggestion;
      if (issue.type === 'missing') {
        code = code.replace(
          issue.original,
          issue.original.replace(/<img\b/i, `<img alt="${alt}"`)
        );
      } else {
        code = code.replace(
          issue.original,
          issue.original.replace(/alt=["'][^"']*["']/i, `alt="${alt}"`)
        );
      }
    });
    onCodeChange(code);
  }, [sourceCode, altIssues, editedAlts, onCodeChange]);

  const addFaqQuestion = () => {
    setFaqQuestions([...faqQuestions, { q: '', a: '' }]);
  };

  const removeFaqQuestion = (index: number) => {
    setFaqQuestions(faqQuestions.filter((_, i) => i !== index));
  };

  const updateFaqQuestion = (index: number, field: 'q' | 'a', value: string) => {
    setFaqQuestions(
      faqQuestions.map((qa, i) => (i === index ? { ...qa, [field]: value } : qa))
    );
  };

  const applyFaqSchema = () => {
    const validQAs = faqQuestions.filter((qa) => qa.q.trim() && qa.a.trim());
    if (validQAs.length === 0) return;
    const schema = generateFaqSchema(validQAs);
    onCodeChange(sourceCode + '\n' + schema);
    setShowFaqForm(false);
  };

  const finalOptimizedCode = useMemo(() => {
    let code = sourceCode;
    altIssues.forEach((issue, i) => {
      const alt = editedAlts[i] || issue.suggestion;
      if (issue.type === 'missing') {
        code = code.replace(
          issue.original,
          issue.original.replace(/<img\b/i, `<img alt="${alt}"`)
        );
      } else {
        code = code.replace(
          issue.original,
          issue.original.replace(/alt=["'][^"']*["']/i, `alt="${alt}"`)
        );
      }
    });
    return code;
  }, [sourceCode, altIssues, editedAlts]);

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">图片总数</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalImages}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">有有效 alt</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.imagesWithAlt}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">alt 问题</p>
          <p className="text-2xl font-bold text-red-500">{stats.imagesWithoutAlt}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">FAQ Schema</p>
          <p className={cn('text-2xl font-bold', stats.hasFaqSchema ? 'text-emerald-600' : 'text-red-500')}>
            {stats.hasFaqSchema ? '已添加' : '缺失'}
          </p>
        </div>
      </div>

      {/* Alt issues list with tabs */}
      {altIssues.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Alt 属性问题 ({altIssues.length})
            </h3>
            <button
              onClick={applyAllAlts}
              className="px-4 py-1.5 bg-sky-500 text-white text-xs font-medium rounded-lg hover:bg-sky-600 transition-colors"
            >
              一键应用所有修改
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('sony')}
              className={cn(
                'flex-1 px-4 py-2.5 text-sm font-medium transition-colors',
                activeTab === 'sony'
                  ? 'text-sky-600 border-b-2 border-sky-500 bg-sky-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              Sony 产品图 ({sonyIssues.length})
            </button>
            <button
              onClick={() => setActiveTab('other')}
              className={cn(
                'flex-1 px-4 py-2.5 text-sm font-medium transition-colors',
                activeTab === 'other'
                  ? 'text-sky-600 border-b-2 border-sky-500 bg-sky-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              其它图片 ({otherIssues.length})
            </button>
          </div>

          {/* Image URL prefix + product model name inputs */}
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 font-medium mb-1.5 block">
                图片 URL 前缀（用于预览）
              </label>
              <input
                type="text"
                value={imageUrlPrefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/20 font-mono"
                placeholder="https://www.sonystyle.com.cn"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 font-medium mb-1.5 block flex items-center gap-1">
                产品型号名
                <span className="text-gray-400 font-normal">（AI 识图描述时默认使用）</span>
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/20"
                placeholder="如：WH-CH730N"
              />
            </div>
          </div>

          <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
            {currentIssues.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">
                暂无问题
              </div>
            ) : (
              currentIssues.map((issue) => {
                const originalIndex = altIssues.indexOf(issue);
                return (
                  <AltIssueItem
                    key={originalIndex}
                    issue={issue}
                    originalIndex={originalIndex}
                    editedAlt={editedAlts[originalIndex]}
                    imageUrlPrefix={imageUrlPrefix}
                    modelName={modelName}
                    onAltEdit={handleAltEdit}
                    onPreview={setPreviewSrc}
                  />
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Image preview modal */}
      {previewSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPreviewSrc(null)}
        >
          <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 text-sm">图片预览</h3>
              <button
                onClick={() => setPreviewSrc(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5">
              <img
                src={previewSrc}
                alt="Preview"
                className="max-w-full h-auto rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%23f3f4f6" width="400" height="300"/><text fill="%239ca3af" x="50%" y="50%" text-anchor="middle" dy=".3em">图片加载失败</text></svg>';
                }}
              />
              <p className="mt-3 text-xs text-gray-500 break-all">{previewSrc}</p>
            </div>
          </div>
        </div>
      )}

      {/* FAQ Schema section */}
      {faqIssues.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              FAQ Schema 缺失
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              添加 FAQ 结构化数据可以帮助 AI 搜索引擎更好地理解和引用你的内容
            </p>
          </div>
          <div className="p-5">
            {!showFaqForm ? (
              <button
                onClick={() => setShowFaqForm(true)}
                className="px-4 py-2 bg-amber-50 text-amber-700 text-sm font-medium rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                + 添加 FAQ Schema
              </button>
            ) : (
              <div className="space-y-4">
                {faqQuestions.map((qa, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={qa.q}
                        onChange={(e) => updateFaqQuestion(i, 'q', e.target.value)}
                        placeholder={`问题 ${i + 1}：输入常见问题...`}
                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/20"
                      />
                      <textarea
                        value={qa.a}
                        onChange={(e) => updateFaqQuestion(i, 'a', e.target.value)}
                        placeholder="回答内容..."
                        rows={2}
                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/20 resize-none"
                      />
                    </div>
                    {faqQuestions.length > 1 && (
                      <button
                        onClick={() => removeFaqQuestion(i)}
                        className="mt-1 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex gap-3">
                  <button
                    onClick={addFaqQuestion}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    添加问题
                  </button>
                  <button
                    onClick={applyFaqSchema}
                    className="px-4 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    生成并添加 Schema
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Side-by-side code comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Original code */}
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">原始代码</span>
            <span className="text-xs text-gray-400">{sourceCode.split('\n').length} 行</span>
          </div>
          <div className="overflow-auto max-h-[600px]">
            <pre className="p-4 text-sm font-mono text-gray-800 leading-relaxed whitespace-pre-wrap">
              <code>{sourceCode}</code>
            </pre>
          </div>
        </div>

        {/* Optimized code */}
        <div className="rounded-xl border-2 border-sky-200 overflow-hidden bg-white">
          <div className="px-4 py-2.5 border-b border-sky-100 bg-sky-50 flex items-center justify-between">
            <span className="text-sm font-medium text-sky-700">优化后代码</span>
            <span className="text-xs text-sky-500">{finalOptimizedCode.split('\n').length} 行</span>
          </div>
          <div className="overflow-auto max-h-[600px]">
            <pre
              className="p-4 text-sm font-mono text-gray-800 leading-relaxed whitespace-pre-wrap"
              style={{ borderLeft: '3px solid #0ea5e9', background: '#f0f9ff' }}
            >
              <code>{finalOptimizedCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
