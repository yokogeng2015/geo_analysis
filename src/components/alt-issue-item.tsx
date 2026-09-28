'use client';

import { memo, useCallback, useState, useEffect, useRef } from 'react';
import type { AltIssue } from '@/lib/code-optimizer';
import { cn } from '@/lib/utils';

interface AltIssueItemProps {
  issue: AltIssue;
  originalIndex: number;
  editedAlt: string | undefined;
  imageUrlPrefix: string;
  modelName: string;
  onAltEdit: (index: number, value: string) => void;
  onPreview: (src: string) => void;
}

export const AltIssueItem = memo(function AltIssueItem({
  issue,
  originalIndex,
  editedAlt,
  imageUrlPrefix,
  modelName,
  onAltEdit,
  onPreview,
}: AltIssueItemProps) {
  const [localValue, setLocalValue] = useState(editedAlt ?? issue.suggestion);
  const [aiState, setAiState] = useState<'idle' | 'generating' | 'error'>('idle');
  const [aiError, setAiError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Sync with external changes
  useEffect(() => {
    setLocalValue(editedAlt ?? issue.suggestion);
  }, [editedAlt, issue.suggestion]);

  // Abort in-flight AI request on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Debounced update
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      // 手动编辑时中止进行中的 AI 流，避免互相覆盖
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
        setAiState('idle');
      }
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

  // AI 识图：流式生成 alt 描述（SSE），完成后回写到全局编辑状态
  const handleAiDescribe = useCallback(async () => {
    if (!issue.src || aiState === 'generating') return;
    const fullSrc = issue.src.startsWith('http')
      ? issue.src
      : `${imageUrlPrefix}${issue.src}`;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAiState('generating');
    setAiError(null);
    setLocalValue('');

    try {
      const res = await fetch('/api/describe-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: fullSrc, modelName: modelName || undefined }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        let msg = `请求失败（HTTP ${res.status}）`;
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {
          // 非 JSON 响应，保留默认错误信息
        }
        throw new Error(msg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc = '';
      let failed = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const event of events) {
          const dataLine = event.split('\n').find((l) => l.startsWith('data:'));
          if (!dataLine) continue;
          try {
            const payload = JSON.parse(dataLine.slice(5).trim());
            if (payload.error) {
              failed = true;
              setAiError(payload.error);
            } else if (payload.delta) {
              acc += payload.delta;
              setLocalValue(acc);
            }
          } catch {
            // 忽略无法解析的事件帧
          }
        }
      }

      if (!failed && acc.trim()) {
        setLocalValue(acc.trim());
        onAltEdit(originalIndex, acc.trim());
        setAiState('idle');
      } else if (!failed) {
        setAiError('AI 未返回有效描述，请重试');
        setAiState('error');
      } else {
        setAiState('error');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setAiError(err instanceof Error ? err.message : 'AI 识图失败');
      setAiState('error');
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, [issue.src, imageUrlPrefix, modelName, aiState, originalIndex, onAltEdit]);

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
          <>
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
            <button
              onClick={handleAiDescribe}
              disabled={aiState === 'generating'}
              className={cn(
                'text-xs flex items-center gap-1 shrink-0 transition-colors',
                aiState === 'generating'
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-violet-600 hover:text-violet-700'
              )}
            >
              {aiState === 'generating' ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
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
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
              )}
              {aiState === 'generating' ? '识别中…' : 'AI 识图描述'}
            </button>
          </>
        )}
        <code className="flex-1 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded font-mono truncate">
          {issue.original}
        </code>
      </div>
      {aiError && (
        <p className="text-xs text-red-500 mb-1.5 ml-5">{aiError}</p>
      )}
      <div className="flex items-center gap-3">
        <span className="text-gray-400 text-xs">→</span>
        <input
          type="text"
          value={localValue}
          onChange={handleChange}
          className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/20"
          placeholder="输入 alt 描述，或点击「AI 识图描述」自动生成..."
        />
      </div>
    </div>
  );
});
