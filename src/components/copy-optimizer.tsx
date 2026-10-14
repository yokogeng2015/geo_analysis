'use client';

import { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** 渲染 **加粗** 的轻量 markdown（输出文案中的分组标签） */
function renderBoldText(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-gray-900 font-semibold">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

interface CopyPrinciple {
  n: number;
  title: string;
  en: string;
  desc: string;
  bad: string;
  good: string;
}

const PRINCIPLES: CopyPrinciple[] = [
  {
    n: 1,
    title: '结论先行',
    en: 'Conclusion-First',
    desc: '核心价值主张前置，每段第一句 30 字内直接陈述关键利益点或使用场景',
    bad: '满足全天通勤与长途差旅需求，配合充电盒总续航可达 36 小时，单次充电可连续播放 8 小时。',
    good: '单次充电可连续播放 8 小时，配合充电盒总续航可达 36 小时，满足全天通勤与长途差旅需求。',
  },
  {
    n: 2,
    title: '场景驱动映射',
    en: 'Scenario-Driven Mapping',
    desc: '【目标场景】+【用户痛点】+【硬件/功能方案】三合一公式',
    bad: '轻盈舒适，稳固佩戴，全天候无感佩戴体验。',
    good: '针对戴眼镜用户与全天办公场景，采用 C 型弧形结构与 5.2g 超轻单耳设计，避开镜腿压迫点，实现全天佩戴无负担。',
  },
  {
    n: 3,
    title: '实体精确',
    en: 'Entity Precision',
    desc: '具体名词替代空泛营销词：规格、材料、量化指标优先，纯话术会被 AI 过滤',
    bad: '黑科技音质，声场震撼，音质出众。',
    good: '搭载 12mm 动态驱动单元与反向声波消除技术，在保持开放耳道的同时降低 80% 漏音，保护通话隐私。',
  },
  {
    n: 4,
    title: '结构化易读',
    en: 'Structured Digestibility',
    desc: '短句 + 要点列表，避免超过 4 行的长段落增加 AI 切分熵导致参数丢失',
    bad: '本产品兼容最新的全画幅微单机型包括 Alpha 7 IV 和 Alpha 9 III 同时支持通过手机 App 快速传输照片和无线升级固件让您的拍摄工作流更加高效。',
    good: '生态兼容：适配 Alpha 7 IV、Alpha 9 III 等全画幅微单机型。\n无线传输：支持通过 Creators\' App 实现照片无线秒传与相机固件在线升级。',
  },
];

export function CopyOptimizer() {
  const [sourceText, setSourceText] = useState('');
  const [modelName, setModelName] = useState('');
  const [output, setOutput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleOptimize = useCallback(async () => {
    if (!sourceText.trim() || generating) return;

    setGenerating(true);
    setError('');
    setOutput('');
    setCopied(false);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/optimize-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sourceText, modelName: modelName.trim() || undefined }),
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
            if (payload.error) throw new Error(payload.error);
            if (payload.delta) {
              acc += payload.delta;
              setOutput(acc);
            }
          } catch (err) {
            if (err instanceof SyntaxError) continue;
            throw err;
          }
        }
      }

      if (!acc.trim()) {
        throw new Error('AI 未返回优化结果，请重试');
      }
      setOutput(acc.trim());
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // 用户主动停止，保留已生成的部分
      } else {
        setError(err instanceof Error ? err.message : '文案优化失败，请稍后重试');
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }, [sourceText, modelName, generating]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleClear = useCallback(() => {
    if (generating) abortRef.current?.abort();
    setSourceText('');
    setOutput('');
    setError('');
    setCopied(false);
  }, [generating]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('复制失败，请手动选择文本复制');
    }
  }, [output]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1.5">GEO 文案优化</h2>
        <p className="text-sm text-gray-500">
          粘贴一段产品描述文案，AI 将从以下 4 个方向重写为更适合 GEO / AI 阅读与引用的版本（原文参数原样保留，不编造数据）
        </p>
      </div>

      {/* 4 大优化原则参考 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PRINCIPLES.map((p) => (
          <div key={p.n} className="p-4 rounded-xl bg-white border border-gray-200">
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              {p.n} {p.title}{' '}
              <span className="text-xs font-normal text-gray-400">({p.en})</span>
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-2.5">{p.desc}</p>
            <div className="space-y-1.5 text-xs leading-relaxed">
              <p className="flex items-start gap-1.5 text-gray-400 line-through decoration-red-300">
                <span className="shrink-0 not-italic no-underline">❌</span>
                {p.bad}
              </p>
              <p className="flex items-start gap-1.5 text-gray-700">
                <span className="shrink-0">✅</span>
                {renderBoldText(p.good)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 输入区 */}
      <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">原始文案</span>
          <span className="text-xs text-gray-400">{sourceText.length} 字符</span>
        </div>
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder={'粘贴需要优化的产品描述文案，例如：\n轻盈舒适，稳固佩戴，全天候无感佩戴体验。配合充电盒可续航36小时，满足全天通勤需求。'}
          className="w-full px-5 py-4 text-sm text-gray-800 leading-relaxed resize-y min-h-[140px] outline-none placeholder:text-gray-300"
        />
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <label htmlFor="copy-model-name" className="text-xs text-gray-500 shrink-0">
              产品型号名（可选）
            </label>
            <input
              id="copy-model-name"
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="如：WH-CH730N"
              className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 bg-white"
            />
          </div>
          <button
            onClick={generating ? handleStop : handleOptimize}
            disabled={!generating && !sourceText.trim()}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
              generating
                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                : 'bg-violet-500 text-white hover:bg-violet-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed'
            )}
          >
            {generating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                停止生成
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI 优化文案
              </>
            )}
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
          >
            清空
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* 输出区 */}
      {(output || generating) && (
        <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-violet-50 to-transparent">
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              优化结果（GEO 版）
            </span>
            <button
              onClick={handleCopy}
              disabled={!output || generating}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-500 text-white hover:bg-violet-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {copied ? '已复制' : '复制文案'}
            </button>
          </div>
          <div className="px-5 py-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
            {output}
            {generating && (
              <span className="inline-block w-2 h-4 ml-0.5 bg-violet-400 align-text-bottom animate-pulse" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
