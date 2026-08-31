'use client';

import { useState, useMemo, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { AltIssue, FAQIssue } from '@/lib/code-optimizer';
import { generateFaqSchema } from '@/lib/code-optimizer';
import { cn } from '@/lib/utils';

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
}: CodeOptimizerProps) {
  const [editedAlts, setEditedAlts] = useState<EditedAlt>({});
  const [faqQuestions, setFaqQuestions] = useState<{ q: string; a: string }[]>([
    { q: '', a: '' },
  ]);
  const [showFaqForm, setShowFaqForm] = useState(false);

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

      {/* Alt issues list */}
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
          <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
            {altIssues.map((issue, i) => (
              <div key={i} className="px-5 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-400 font-mono">行 {issue.line}</span>
                  <span className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-medium',
                    issue.type === 'missing' ? 'bg-red-100 text-red-700' :
                    issue.type === 'empty' ? 'bg-amber-100 text-amber-700' :
                    'bg-orange-100 text-orange-700'
                  )}>
                    {issue.type === 'missing' ? '缺少 alt' : issue.type === 'empty' ? 'alt 为空' : 'alt 无意义'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <code className="flex-1 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded font-mono truncate">
                    {issue.original}
                  </code>
                  <span className="text-gray-400">→</span>
                  <input
                    type="text"
                    value={editedAlts[i] ?? issue.suggestion}
                    onChange={(e) => handleAltEdit(i, e.target.value)}
                    className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/20"
                    placeholder="输入 alt 描述..."
                  />
                </div>
              </div>
            ))}
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
            <SyntaxHighlighter
              language="html"
              style={oneLight}
              customStyle={{
                margin: 0,
                padding: '1rem',
                background: '#ffffff',
                fontSize: '0.8rem',
                lineHeight: '1.6',
              }}
              wrapLongLines
              showLineNumbers
            >
              {sourceCode}
            </SyntaxHighlighter>
          </div>
        </div>

        {/* Optimized code */}
        <div className="rounded-xl border-2 border-sky-200 overflow-hidden bg-white">
          <div className="px-4 py-2.5 border-b border-sky-100 bg-sky-50 flex items-center justify-between">
            <span className="text-sm font-medium text-sky-700">优化后代码</span>
            <span className="text-xs text-sky-500">{finalOptimizedCode.split('\n').length} 行</span>
          </div>
          <div className="overflow-auto max-h-[600px]">
            <SyntaxHighlighter
              language="html"
              style={oneLight}
              customStyle={{
                margin: 0,
                padding: '1rem',
                background: '#f0f9ff',
                fontSize: '0.8rem',
                lineHeight: '1.6',
                borderLeft: '3px solid #0ea5e9',
              }}
              wrapLongLines
              showLineNumbers
            >
              {finalOptimizedCode}
            </SyntaxHighlighter>
          </div>
        </div>
      </div>
    </div>
  );
}
