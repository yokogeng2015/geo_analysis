'use client';

import { memo, useCallback, useState, useEffect } from 'react';
import type { AltIssue } from '@/lib/code-optimizer';
import { cn } from '@/lib/utils';

interface AltIssueItemProps {
  issue: AltIssue;
  originalIndex: number;
  editedAlt: string | undefined;
  imageUrlPrefix: string;
  onAltEdit: (index: number, value: string) => void;
  onPreview: (src: string) => void;
}

export const AltIssueItem = memo(function AltIssueItem({
  issue,
  originalIndex,
  editedAlt,
  imageUrlPrefix,
  onAltEdit,
  onPreview,
}: AltIssueItemProps) {
  const [localValue, setLocalValue] = useState(editedAlt ?? issue.suggestion);

  // Sync with external changes
  useEffect(() => {
    setLocalValue(editedAlt ?? issue.suggestion);
  }, [editedAlt, issue.suggestion]);

  // Debounced update
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      // Use requestAnimationFrame to debounce
      requestAnimationFrame(() => {
        onAltEdit(originalIndex, newValue);
      });
    },
    [originalIndex, onAltEdit]
  );

  const handlePreview = useCallback(() => {
    const fullSrc = issue.src?.startsWith('http')
      ? issue.src
      : `${imageUrlPrefix}${issue.src}`;
    onPreview(fullSrc);
  }, [issue.src, imageUrlPrefix, onPreview]);

  return (
    <div className="px-5 py-3">
      <div className="flex items-center gap-2 mb-1.5">
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
      </div>
      <div className="flex items-center gap-2 mb-2">
        {issue.src && (
          <button
            onClick={handlePreview}
            className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1 shrink-0"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            预览图片
          </button>
        )}
        <code className="flex-1 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded font-mono truncate">
          {issue.original}
        </code>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-gray-400 text-xs">→</span>
        <input
          type="text"
          value={localValue}
          onChange={handleChange}
          className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/20"
          placeholder="输入 alt 描述..."
        />
      </div>
    </div>
  );
});
