'use client';

import type { DimensionScore } from '@/types/geo';
import { cn } from '@/lib/utils';

interface DimensionDetailProps {
  dimension: DimensionScore;
  accentColor: 'cyan' | 'orange';
  chineseName?: string;
  showOptimizationBtn?: boolean;
  onOptimizationClick?: () => void;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

export function DimensionDetail({
  dimension,
  accentColor,
  chineseName,
  showOptimizationBtn,
  onOptimizationClick,
}: DimensionDetailProps) {
  const accentText =
    accentColor === 'cyan' ? 'text-sky-600' : 'text-amber-600';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div>
            <h4 className="font-bold text-sm text-gray-700">
              {dimension.name}
            </h4>
            {chineseName && (
              <p className="text-xs text-gray-400 mt-0.5">{chineseName}</p>
            )}
          </div>
          {showOptimizationBtn && (
            <button
              onClick={onOptimizationClick}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              优化建议
            </button>
          )}
        </div>
        <span
          className={cn(
            'text-lg font-bold tabular-nums',
            getScoreColor(dimension.score)
          )}
        >
          {dimension.score}
          <span className="text-xs text-gray-400">/100</span>
        </span>
      </div>

      {/* Score bar */}
      <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-1000', getScoreBg(dimension.score))}
          style={{ width: `${dimension.score}%` }}
        />
      </div>

      {/* Issues */}
      {dimension.issues.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">
            发现的问题
          </p>
          <ul className="space-y-1.5">
            {dimension.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-red-500 mt-0.5 shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {dimension.suggestions.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">
            优化建议
          </p>
          <ul className="space-y-1.5">
            {dimension.suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-emerald-500 mt-0.5 shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
