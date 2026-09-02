'use client';

import type { DimensionScore } from '@/types/geo';

interface DimensionDetailProps {
  dimension: DimensionScore;
  accentColor: 'cyan' | 'orange';
  chineseName?: string;
  showOptimizationBtn?: boolean;
  onOptimizationClick?: () => void;
}

// 1. 改为返回 HEX 十六进制颜色，避免生成 lab/oklch
function getScoreColor(score: number): string {
  if (score >= 80) return '#059669'; // emerald-600
  if (score >= 60) return '#d97706'; // amber-600
  return '#dc2626'; // red-600
}

function getScoreBg(score: number): string {
  if (score >= 80) return '#10b981'; // emerald-500
  if (score >= 60) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}

export function DimensionDetail({
  dimension,
  chineseName,
  showOptimizationBtn,
  onOptimizationClick,
}: DimensionDetailProps) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div>
            <h4 className="font-bold text-sm" style={{ color: '#374151' }}>
              {dimension.name}
            </h4>
            {chineseName && (
              <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                {chineseName}
              </p>
            )}
          </div>
          {showOptimizationBtn && (
            <button
              onClick={onOptimizationClick}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors"
              style={{
                color: '#b45309',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              优化建议
            </button>
          )}
        </div>
        <span
          className="text-lg font-bold tabular-nums"
          style={{ color: getScoreColor(dimension.score) }}
        >
          {dimension.score}
          <span className="text-xs" style={{ color: '#9ca3af' }}>
            /100
          </span>
        </span>
      </div>

      {/* Score bar */}
      <div className="h-1.5 rounded-full mb-3 overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${dimension.score}%`,
            backgroundColor: getScoreBg(dimension.score),
          }}
        />
      </div>

      {/* Issues */}
      {dimension.issues.length > 0 && (
        <div className="mb-3">
          <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: '#9ca3af' }}>
            发现的问题
          </p>
          <ul className="space-y-1.5">
            {dimension.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#374151' }}>
                <span className="mt-0.5 shrink-0" style={{ color: '#ef4444' }}>
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
          <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: '#9ca3af' }}>
            优化建议
          </p>
          <ul className="space-y-1.5">
            {dimension.suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#4b5563' }}>
                <span className="mt-0.5 shrink-0" style={{ color: '#10b981' }}>
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