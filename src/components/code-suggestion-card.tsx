'use client';

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { CodeSuggestion } from '@/types/geo';
import { cn } from '@/lib/utils';

interface CodeSuggestionCardProps {
  suggestion: CodeSuggestion;
  accentColor: 'cyan' | 'orange';
}

const typeLabels: Record<string, { label: string; className: string }> = {
  optimize: {
    label: '优化',
    className: 'bg-sky-100 text-sky-700 border-sky-200',
  },
  add: {
    label: '新增',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  fix: {
    label: '修复',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
};

export function CodeSuggestionCard({
  suggestion,
  accentColor,
}: CodeSuggestionCardProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const typeInfo = typeLabels[suggestion.type] || typeLabels.optimize;

  const borderColor =
    accentColor === 'cyan' ? 'border-sky-200' : 'border-amber-200';
  const accentBg =
    accentColor === 'cyan'
      ? 'bg-sky-50 hover:bg-sky-100'
      : 'bg-amber-50 hover:bg-amber-100';

  return (
    <div
      className={cn(
        'rounded-xl border bg-white overflow-hidden shadow-sm',
        borderColor
      )}
    >
      {/* Header */}
      <div className={cn('px-5 py-4 border-b', borderColor, accentBg)}>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'px-2.5 py-0.5 rounded-full text-xs font-medium border',
              typeInfo.className
            )}
          >
            {typeInfo.label}
          </span>
          <h4 className="text-gray-900 font-semibold text-sm">
            {suggestion.title}
          </h4>
        </div>
        <p className="text-gray-500 text-sm mt-2">{suggestion.description}</p>
      </div>

      {/* Code blocks */}
      <div className="relative">
        {/* Original code (collapsible) */}
        {suggestion.originalCode && (
          <div className="border-b border-gray-100">
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className="w-full px-5 py-2.5 flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors bg-gray-50"
            >
              <svg
                className={cn(
                  'w-3.5 h-3.5 transition-transform',
                  showOriginal && 'rotate-90'
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span>查看原始代码（无需修改部分）</span>
            </button>
            {showOriginal && (
              <div className="relative">
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] bg-gray-200 text-gray-500 z-10">
                  原始代码
                </div>
                <SyntaxHighlighter
                  language={suggestion.language}
                  style={oneLight}
                  customStyle={{
                    margin: 0,
                    padding: '1.25rem',
                    background: '#f9fafb',
                    fontSize: '0.8rem',
                    lineHeight: '1.6',
                  }}
                  wrapLongLines
                >
                  {suggestion.originalCode}
                </SyntaxHighlighter>
              </div>
            )}
          </div>
        )}

        {/* Optimized code */}
        <div className="relative">
          <div
            className={cn(
              'absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] z-10 font-medium',
              accentColor === 'cyan'
                ? 'bg-sky-100 text-sky-700'
                : 'bg-amber-100 text-amber-700'
            )}
          >
            优化代码
          </div>
          <SyntaxHighlighter
            language={suggestion.language}
            style={oneLight}
            customStyle={{
              margin: 0,
              padding: '1.25rem',
              background: '#f0f9ff',
              fontSize: '0.8rem',
              lineHeight: '1.6',
              borderLeft: `3px solid ${accentColor === 'cyan' ? '#0ea5e9' : '#f59e0b'}`,
            }}
            wrapLongLines
          >
            {suggestion.optimizedCode}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
}
