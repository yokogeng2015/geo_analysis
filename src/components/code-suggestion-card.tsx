'use client';

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { CodeSuggestion } from '@/types/geo';
import { cn } from '@/lib/utils';

interface CodeSuggestionCardProps {
  suggestion: CodeSuggestion;
  accentColor: 'cyan' | 'orange';
}

const typeLabels: Record<string, { label: string; className: string }> = {
  optimize: {
    label: '优化',
    className: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  add: {
    label: '新增',
    className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  fix: {
    label: '修复',
    className: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
};

export function CodeSuggestionCard({
  suggestion,
  accentColor,
}: CodeSuggestionCardProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const typeInfo = typeLabels[suggestion.type] || typeLabels.optimize;

  const borderColor =
    accentColor === 'cyan' ? 'border-cyan-500/30' : 'border-orange-500/30';
  const accentBg =
    accentColor === 'cyan'
      ? 'bg-cyan-500/5 hover:bg-cyan-500/10'
      : 'bg-orange-500/5 hover:bg-orange-500/10';

  return (
    <div
      className={cn(
        'rounded-xl border bg-[#1a1a2e] overflow-hidden transition-all',
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
          <h4 className="text-white font-semibold text-sm">
            {suggestion.title}
          </h4>
        </div>
        <p className="text-gray-400 text-sm mt-2">{suggestion.description}</p>
      </div>

      {/* Code blocks */}
      <div className="relative">
        {/* Original code (collapsible) */}
        {suggestion.originalCode && (
          <div className="border-b border-white/5">
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className="w-full px-5 py-2.5 flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 transition-colors bg-[#0d0d15]"
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
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] bg-gray-700/50 text-gray-400 z-10">
                  原始代码
                </div>
                <SyntaxHighlighter
                  language={suggestion.language}
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    padding: '1.25rem',
                    background: '#0d0d15',
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
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'bg-orange-500/20 text-orange-300'
            )}
          >
            优化代码
          </div>
          <SyntaxHighlighter
            language={suggestion.language}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: '1.25rem',
              background: '#12121a',
              fontSize: '0.8rem',
              lineHeight: '1.6',
              borderLeft: `3px solid ${accentColor === 'cyan' ? '#00d4ff' : '#ff9f43'}`,
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
