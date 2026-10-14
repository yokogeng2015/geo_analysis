'use client';

import { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { streamText } from '@/lib/ai-describe-client';

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
    desc: '仅当出现超过 4 行的长段落时才拆分为短句或要点列表，降低 AI 切分熵；原文已是简洁要点/短段落则保持原形态',
    bad: '本产品兼容最新的全画幅微单机型包括 Alpha 7 IV 和 Alpha 9 III 同时支持通过手机 App 快速传输照片和无线升级固件让您的拍摄工作流更加高效。',
    good: '生态兼容：适配 Alpha 7 IV、Alpha 9 III 等全画幅微单机型。\n无线传输：支持通过 Creators\' App 实现照片无线秒传与相机固件在线升级。',
  },
];

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const NO_TEXT_MARKER = '[未识别到文字]';

/** 读取截图为 dataURI；超过 1.5MB 时用 canvas 压到最长边 2000px（JPEG 90%）再返回 */
async function fileToDataUri(file: File): Promise<string> {
  const readAsDataUri = () =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('读取截图失败'));
      reader.readAsDataURL(file);
    });

  if (file.size <= 1.5 * 1024 * 1024) return readAsDataUri();

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('截图解析失败'));
      el.src = objectUrl;
    });
    const scale = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return readAsDataUri();
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function CopyOptimizer() {
  const [sourceText, setSourceText] = useState('');
  const [modelName, setModelName] = useState('');
  const [output, setOutput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  // 截图附件
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const busy = generating || extracting;

  // ---- 截图附件 ----
  const handleAttachFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('仅支持图片文件（PNG / JPG / WebP）');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('截图过大（上限 15MB），请裁剪后重试');
      return;
    }
    setError('');
    try {
      const dataUri = await fileToDataUri(file);
      setImageData(dataUri);
      setImageName(file.name || '剪贴板截图');
      setCopied(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '截图读取失败');
    }
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleAttachFile(file);
          return;
        }
      }
      // 非图片粘贴，保持默认文本行为
    },
    [handleAttachFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) handleAttachFile(file);
    },
    [handleAttachFile]
  );

  const handleRemoveImage = useCallback(() => {
    setImageData(null);
    setImageName('');
  }, []);

  // ---- 截图文字提取（OCR，流式写入原文区） ----
  const runExtract = useCallback(
    async (signal: AbortSignal): Promise<string | null> => {
      if (!imageData) return null;
      setExtracting(true);
      setError('');
      setSourceText('');
      setOutput('');
      try {
        let last = 0;
        const text = await streamText({
          endpoint: '/api/extract-text',
          body: { imageData },
          signal,
          onDelta: (acc) => {
            const now = Date.now();
            if (now - last > 80) {
              last = now;
              setSourceText(acc);
            }
          },
          emptyMessage: '未能从截图中识别出文字，请更换更清晰的截图',
        });
        setSourceText(text);
        return text;
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : '截图识别失败，请稍后重试');
        }
        return null;
      } finally {
        setExtracting(false);
      }
    },
    [imageData]
  );

  /** 仅提取文字到原文区（不自动优化） */
  const handleExtractOnly = useCallback(async () => {
    if (busy) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const text = await runExtract(controller.signal);
    abortRef.current = null;
    if (text && text !== NO_TEXT_MARKER) {
      setImageData(null);
      setImageName('');
    }
  }, [busy, runExtract]);

  // ---- 文案优化（流式） ----
  const runGenerate = useCallback(
    async (text: string, signal: AbortSignal) => {
      setGenerating(true);
      setError('');
      setOutput('');
      setCopied(false);
      try {
        const result = await streamText({
          endpoint: '/api/optimize-copy',
          body: { text, modelName: modelName.trim() || undefined },
          signal,
          onDelta: (acc) => setOutput(acc),
          emptyMessage: 'AI 未返回优化结果，请重试',
        });
        setOutput(result);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : '文案优化失败，请稍后重试');
        }
      } finally {
        setGenerating(false);
      }
    },
    [modelName]
  );

  const handleOptimize = useCallback(async () => {
    if (busy) return;
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      let text = sourceText;
      if (imageData) {
        // 先识别截图 → 填充原文 → 继续优化
        const extracted = await runExtract(controller.signal);
        if (!extracted || extracted === NO_TEXT_MARKER) return;
        setImageData(null);
        setImageName('');
        text = extracted;
      }
      if (!text.trim()) return;
      await runGenerate(text, controller.signal);
    } finally {
      abortRef.current = null;
    }
  }, [busy, sourceText, imageData, runExtract, runGenerate]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleClear = useCallback(() => {
    if (busy) abortRef.current?.abort();
    setSourceText('');
    setOutput('');
    setError('');
    setCopied(false);
    setImageData(null);
    setImageName('');
  }, [busy]);

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

  // ---- 输出拆分：首行 = 总结性总起句，其余 = 正文 ----
  const newlineIdx = output.indexOf('\n');
  const lead = newlineIdx === -1 ? output : output.slice(0, newlineIdx);
  const body = newlineIdx === -1 ? '' : output.slice(newlineIdx + 1).replace(/^\s+/, '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1.5">GEO 文案优化</h2>
        <p className="text-sm text-gray-500">
          粘贴产品描述文案或上传页面截图，AI 将诊断原文后从以下 4 个方向中智能选用适用的组合进行优化（不强制拆点、保持原文形态），重写为更适合
          GEO / AI 阅读与引用的版本，并在开头提炼总结性总起句（原文参数原样保留，不编造数据）
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
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-gray-700">原始文案</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:inline">
              支持 Ctrl+V 粘贴截图 / 拖拽截图到输入框
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              上传截图
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAttachFile(file);
                e.target.value = '';
              }}
            />
            <span className="text-xs text-gray-400">{sourceText.length} 字符</span>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn('transition-shadow', dragging && 'ring-2 ring-violet-300 ring-inset')}
        >
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            onPaste={handlePaste}
            disabled={extracting}
            placeholder={'粘贴需要优化的产品描述文案，或直接粘贴/拖入页面截图。\n例如：\n轻盈舒适，稳固佩戴，全天候无感佩戴体验。配合充电盒可续航36小时，满足全天通勤需求。'}
            className="w-full px-5 py-4 text-sm text-gray-800 leading-relaxed resize-y min-h-[140px] outline-none placeholder:text-gray-300 disabled:bg-gray-50"
          />
        </div>

        {/* 截图附件预览 */}
        {imageData && (
          <div className="px-5 py-2.5 border-t border-gray-100 bg-violet-50/50 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageData}
              alt="待识别截图"
              className="w-16 h-12 object-cover rounded-md border border-gray-200 bg-white"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">{imageName}</p>
              <p className="text-xs text-gray-400">
                {extracting ? '正在识别截图中的文字…' : '点击「AI 优化文案」将先识别截图文字再优化'}
              </p>
            </div>
            <button
              onClick={handleRemoveImage}
              disabled={busy}
              className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="移除截图"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

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
          {imageData && !busy && (
            <button
              onClick={handleExtractOnly}
              className="px-4 py-2 rounded-lg text-sm font-medium text-violet-600 border border-violet-200 hover:bg-violet-50 transition-colors"
            >
              仅提取文字
            </button>
          )}
          <button
            onClick={busy ? handleStop : handleOptimize}
            disabled={!busy && !sourceText.trim() && !imageData}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
              busy
                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                : 'bg-violet-500 text-white hover:bg-violet-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed'
            )}
          >
            {busy ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                {extracting ? '停止识别' : '停止生成'}
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
              <span className="text-xs font-normal text-gray-400">首行为 AI 综合提炼的总起句</span>
            </span>
            <button
              onClick={handleCopy}
              disabled={!output || generating}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-500 text-white hover:bg-violet-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {copied ? '已复制' : '复制文案'}
            </button>
          </div>
          <div className="px-5 py-4 space-y-3">
            {lead && (
              <div className="rounded-lg bg-violet-50 border-l-4 border-violet-400 px-4 py-3 text-[15px] font-semibold text-gray-900 leading-relaxed">
                {renderBoldText(lead)}
                {generating && newlineIdx === -1 && (
                  <span className="inline-block w-2 h-4 ml-0.5 bg-violet-400 align-text-bottom animate-pulse" />
                )}
              </div>
            )}
            {(body || (generating && newlineIdx !== -1)) && (
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                {renderBoldText(body)}
                {generating && newlineIdx !== -1 && (
                  <span className="inline-block w-2 h-4 ml-0.5 bg-violet-400 align-text-bottom animate-pulse" />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
