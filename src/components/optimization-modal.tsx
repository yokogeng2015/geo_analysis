'use client';

import { useEffect, useState } from 'react';
import type { IntentGap } from '@/types/geo';

interface OptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  gaps: IntentGap[];
}

export function OptimizationModal({
  isOpen,
  onClose,
  productName,
  gaps,
}: OptimizationModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // clipboard API 不可用时静默失败
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              Comparison Context（竞品对比与选购意图）优化建议
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              用户高频意图缺口分析 · Prompt Intent Gap Analysis
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {gaps.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm">
                页面已覆盖用户高频选购意图，暂无需要补齐的意图缺口
              </p>
            </div>
          ) : (
            <>
              {/* AI 评估 */}
              <div className="rounded-lg bg-sky-50 border border-sky-200 px-4 py-3 mb-6">
                <p className="text-sm text-sky-800 leading-relaxed">
                  <span className="font-semibold">💡 AI 评估：</span>
                  当用户向 AI 询问
                  &ldquo;我该不该买 {productName}&rdquo;或&ldquo;它与 Y
                  有什么区别&rdquo;时，目前页面缺失以下 {gaps.length}{' '}
                  个关键问题的解答，导致 AI 无法优先推荐本页面。
                </p>
              </div>

              <div className="space-y-6">
                {gaps.map((gap, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-gray-200 p-4 space-y-3"
                  >
                    {/* 问题标题 */}
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <p className="text-sm font-semibold text-gray-800 pt-0.5">
                        问题 {index + 1}：{gap.topic}
                      </p>
                    </div>

                    {/* 页面现状 */}
                    <div className="ml-8 rounded-md border border-red-200 bg-red-50/60 px-3 py-2.5">
                      <p className="text-xs font-medium text-red-700 mb-1">
                        🔴 页面现状
                        {gap.status === 'missing' ? '（未覆盖）' : '（非结构化）'}
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {gap.pageStatus}
                      </p>
                    </div>

                    {/* 用户高频 Prompt */}
                    <div className="ml-8 rounded-md border border-purple-200 bg-purple-50/60 px-3 py-2.5">
                      <p className="text-xs font-medium text-purple-700 mb-1">
                        🎯 用户高频 Prompt
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        &ldquo;{gap.userPrompt}&rdquo;
                      </p>
                    </div>

                    {/* 建议新增文案 */}
                    <div className="ml-8 rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-emerald-700">
                          💡 建议新增文案（直接可复制）
                          {gap.suggestionLabel && (
                            <span className="ml-2 text-gray-500 font-normal">
                              {gap.suggestionLabel}：
                            </span>
                          )}
                        </p>
                        <button
                          onClick={() =>
                            handleCopy(gap.suggestion, index)
                          }
                          className="text-xs px-2 py-1 rounded border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 transition-colors flex items-center gap-1"
                        >
                          {copiedIndex === index ? '已复制' : '复制'}
                        </button>
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {gap.suggestion}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
