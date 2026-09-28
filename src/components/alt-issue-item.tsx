'use client';

import { memo, useCallback, useState, useEffect } from 'react';
import type { AltIssue } from '@/lib/code-optimizer';
import { cn } from '@/lib/utils';

export type AiStatus = 'idle' | 'generating' | 'error';

const FALLBACK_IMG =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%23f3f4f6" width="400" height="300"/><text fill="%239ca3af" x="50%" y="50%" text-anchor="middle" dy=".3em">图片加载失败</text></svg>';

interface AltIssueItemProps {
  issue: AltIssue;
  originalIndex: number;
  editedAlt: string | undefined;
  imageUrlPrefix: string;
  selected: boolean;
  aiStatus: AiStatus;
  aiError?: string;
  onAltEdit: (index: number, value: string) => void;
  onToggleSelect: (index: number) => void;
  onPreview: (src: string) => void;
}

export const AltIssueItem = memo(function AltIssueItem({
  issue,
  originalIndex,
  editedAlt,
  imageUrlPrefix,
  selected,
  aiStatus,
  aiError,
  onAltEdit,
  onToggleSelect,
  onPreview,
}: AltIssueItemProps) {
  const [localValue, setLocalValue] = useState(editedAlt ?? issue.suggestion);

  // Sync with external changes（批量识图的流式增量也通过 editedAlt 传入）
  useEffect(() => {
    setLocalValue(editedAlt ?? issue.suggestion);
  }, [editedAlt, issue.suggestion]);

  const fullSrc = issue.src
    ? issue.src.startsWith('http')
      ? issue.src
      : `${imageUrlPrefix}${issue.src}`
    : null;

  // Debounced update
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
      // Use requestAnimationFrame to debounce
      requestAnimationFrame(() => {
        onAltEdit(originalIndex, e.target.value);
      });
    },
    [originalIndex, onAltEdit]
  );

  const handleToggle = useCallback(() => {
    onToggleSelect(originalIndex);
  }, [originalIndex, onToggleSelect]);

  return (
    <div className="px-5 py-3 flex gap-3">
      {/* 左列：AI 识图勾选框 + 预览缩略图（点击放大） */}
      <div className="flex flex-col items-center gap-2 shrink-0">
        <input
          type="checkbox"
          checked={selected}
          disabled={!fullSrc}
          onChange={handleToggle}
          className="w-4 h-4 accent-violet-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          title={fullSrc ? '勾选后可一键 AI 识图' : '该图片无 src，无法 AI 识图'}
        />
        {fullSrc ? (
          <button
            onClick={() => onPreview(fullSrc)}
            className="group block"
            title="点击放大预览"
          >
            <img
              src={fullSrc}
              alt=""
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = FALLBACK_IMG;
              }}
              className="w-16 h-12 object-cover rounded-md border border-gray-200 bg-gray-50 group-hover:border-sky-400 transition-colors cursor-zoom-in"
            />
          </button>
        ) : (
          <div className="w-16 h-12 rounded-md border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-[10px] text-gray-400">
            无图
          </div>
        )}
      </div>

      {/* 右列：问题信息 + alt 编辑 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-xs text-gray-400 font-mono">行 {issue.line}</span>
          <span
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-medium',
              issue.type === 'missing'
                ? 'bg-red-100 text-red-700'
                : issue.type === 'empty'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-orange-100 text-orange-700'
            )}
          >
            {issue.type === 'missing'
              ? '缺少 alt'
              : issue.type === 'empty'
              ? 'alt 为空'
              : 'alt 无意义'}
          </span>
          {issue.reason && (
            <span className="text-xs text-red-500">{issue.reason}</span>
          )}
          {aiStatus === 'generating' && (
            <span className="text-xs text-violet-600 flex items-center gap-1">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
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
              AI 识别中…
            </span>
          )}
          {aiStatus === 'error' && (
            <span className="text-xs text-red-500">AI 识图失败，可重新勾选重试</span>
          )}
        </div>
        <code className="block text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded font-mono truncate mb-2">
          {issue.original}
        </code>
        {aiError && (
          <p className="text-xs text-red-500 mb-1.5">{aiError}</p>
        )}
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-xs shrink-0">→</span>
          <input
            type="text"
            value={localValue}
            onChange={handleChange}
            className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/20"
            placeholder="输入 alt 描述，或勾选后一键 AI 识图..."
          />
        </div>
      </div>
    </div>
  );
});
