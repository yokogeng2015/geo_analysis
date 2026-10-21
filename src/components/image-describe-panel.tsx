'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, Image as ImageIcon, Loader2, Sparkles, Trash2, Upload } from 'lucide-react';
import { streamAltDescription } from '@/lib/ai-describe-client';
import { fileToCompressedDataUri } from '@/lib/image-client';

interface DescribeImage {
  id: number;
  dataUrl: string;
  description: string;
  status: 'idle' | 'generating' | 'done' | 'error';
  error?: string;
}

const FALLBACK_IMG =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%23f3f4f6" width="400" height="300"/><text fill="%239ca3af" x="50%" y="50%" text-anchor="middle" dy=".3em">图片加载失败</text></svg>';

/** URL 输入框合法值：http/https 绝对地址或 data:image */
const URL_INPUT_RE = /^(?:https?:\/\/\S+|data:image\/\S+)$/i;

/**
 * 「直接识图生成描述」面板：上传 / Ctrl+V 粘贴 / 拖拽任意图片，
 * 调用多模态 LLM（SSE 流式）生成 Apple 官网风格 alt 描述，可编辑、复制。
 * 自带「产品型号名（选填）」输入与图片放大预览弹窗，可独立于 HTML 解析使用。
 */
export const ImageDescribePanel = memo(function ImageDescribePanel() {
  const [images, setImages] = useState<DescribeImage[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [modelName, setModelName] = useState('');
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const idRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortMapRef = useRef<Map<number, AbortController>>(new Map());
  const dragCounterRef = useRef(0);

  const patchImage = useCallback((id: number, patch: Partial<DescribeImage>) => {
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, ...patch } : img)));
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        let dataUrl: string;
        try {
          dataUrl = await fileToCompressedDataUri(file);
        } catch {
          continue; // 解析失败的文件静默忽略
        }
        const id = ++idRef.current;
        setImages((prev) => [...prev, { id, dataUrl, description: '', status: 'idle' }]);
      }
    },
    []
  );

  // 添加图片 URL（http/https 或 data:image），识别时由服务端代理下载
  const addUrl = useCallback(() => {
    const url = urlInput.trim();
    if (!url || !URL_INPUT_RE.test(url)) return;
    const id = ++idRef.current;
    setImages((prev) => [...prev, { id, dataUrl: url, description: '', status: 'idle' }]);
    setUrlInput('');
  }, [urlInput]);

  // Ctrl+V 粘贴图片
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.items ?? [])
        .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((f): f is File => Boolean(f));
      if (files.length > 0) {
        e.preventDefault();
        void addFiles(files);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addFiles]);

  const generate = useCallback(
    (id: number, dataUrl: string) => {
      // 中断该图片上一次未完成的请求
      abortMapRef.current.get(id)?.abort();
      const controller = new AbortController();
      abortMapRef.current.set(id, controller);
      patchImage(id, { status: 'generating', description: '', error: undefined });

      let lastWrite = 0;
      streamAltDescription({
        imageUrl: dataUrl,
        modelName: modelName.trim() || undefined,
        signal: controller.signal,
        onDelta: (fullText) => {
          // 150ms 节流写入，避免高频 setState
          const now = Date.now();
          if (now - lastWrite >= 150 || fullText.length < 80) {
            lastWrite = now;
            patchImage(id, { description: fullText });
          }
        },
      })
        .then((text) => patchImage(id, { description: text, status: 'done' }))
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') {
            patchImage(id, { status: 'idle' }); // 用户停止：保留已生成的部分文本
            return;
          }
          patchImage(id, { status: 'error', error: err instanceof Error ? err.message : '识别失败' });
        })
        .finally(() => {
          if (abortMapRef.current.get(id) === controller) abortMapRef.current.delete(id);
        });
    },
    [modelName, patchImage]
  );

  const remove = useCallback((id: number) => {
    abortMapRef.current.get(id)?.abort();
    abortMapRef.current.delete(id);
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const copyText = useCallback((img: DescribeImage) => {
    if (!img.description) return;
    void navigator.clipboard.writeText(img.description).then(() => {
      setCopiedId(img.id);
      setTimeout(() => setCopiedId((cur) => (cur === img.id ? null : cur)), 2000);
    });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      if (files.length > 0) void addFiles(files);
    },
    [addFiles]
  );

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Sparkles className="h-4 w-4 text-sky-600" />
        <h3 className="text-sm font-semibold text-gray-800">直接识图生成描述</h3>
        <span className="text-xs text-gray-400">上传 / 贴图片 URL / Ctrl+V / 拖拽，AI 生成 Apple 风格 alt 描述</span>
        <input
          type="text"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          placeholder="产品型号名（选填，如 WH-CH730N）"
          className="ml-auto w-52 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/20"
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void addFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />

      {/* 拖拽/上传区 + 图片列表 */}
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          dragCounterRef.current += 1;
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
          if (dragCounterRef.current === 0) setDragging(false);
        }}
        onDrop={onDrop}
        className={
          'rounded-lg border-2 border-dashed transition-colors ' +
          (dragging ? 'border-sky-400 bg-sky-50/60' : 'border-gray-200')
        }
      >
        {/* 图片 URL 输入行：粘贴 URL 直接添加（识别时由服务端代理下载，绕过防盗链） */}
        <div className="flex gap-2 p-3">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addUrl();
            }}
            placeholder="粘贴图片 URL，如 https://www.sonystyle.com.cn/.../pc1_01.jpg"
            className="flex-1 min-w-0 text-sm px-3 py-2 border border-gray-200 rounded-lg font-mono text-gray-700 placeholder:font-sans placeholder:text-gray-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/20"
          />
          <button
            type="button"
            onClick={addUrl}
            disabled={!URL_INPUT_RE.test(urlInput.trim())}
            className="flex-shrink-0 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            添加
          </button>
        </div>

        {images.length === 0 ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-b-lg border-t border-dashed border-gray-200 px-4 py-6 text-gray-500 transition-colors hover:bg-sky-50/60 hover:text-sky-600"
          >
            <Upload className="h-5 w-5" />
            <span className="text-sm">点击上传图片，或直接拖拽 / Ctrl+V 粘贴到此区域</span>
          </button>
        ) : (
          <ul className="divide-y divide-gray-100 border-t border-dashed border-gray-200">
            {images.map((img) => (
              <li key={img.id} className="flex gap-3 p-3">
                {/* 缩略图：点击放大 */}
                <button
                  type="button"
                  onClick={() => setPreviewSrc(img.dataUrl)}
                  className="group h-12 w-16 flex-shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-50 transition-colors hover:border-sky-400"
                  title="点击放大预览"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.dataUrl}
                    alt="待识别图片"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_IMG;
                    }}
                    className="h-full w-full object-contain group-hover:scale-105"
                  />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => generate(img.id, img.dataUrl)}
                      disabled={img.status === 'generating'}
                      className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {img.status === 'generating' ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          识别中…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          {img.description ? '重新生成' : '生成描述'}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyText(img)}
                      disabled={!img.description}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 transition-colors hover:border-sky-400 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {copiedId === img.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          复制
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(img.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 transition-colors hover:border-red-300 hover:text-red-500"
                      title="移除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {img.status === 'error' && (
                      <span className="text-xs text-red-500">{img.error}</span>
                    )}
                  </div>
                  <textarea
                    value={img.description}
                    onChange={(e) => patchImage(img.id, { description: e.target.value })}
                    placeholder={
                      img.status === 'idle' || img.status === 'error'
                        ? '点击「生成描述」，AI 将按 Apple 官网 alt 风格输出一句话描述（可编辑）'
                        : ''
                    }
                    rows={2}
                    className="mt-2 w-full resize-y rounded-md border border-gray-200 bg-gray-50/60 px-2.5 py-1.5 text-xs leading-relaxed text-gray-700 outline-none focus:border-sky-400 focus:bg-white"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {images.length > 0 && (
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
          <span className="inline-flex items-center gap-1">
            <ImageIcon className="h-3.5 w-3.5" />
            共 {images.length} 张
          </span>
          <span>描述可直接编辑后复制</span>
        </div>
      )}

      {/* 图片放大预览 */}
      {previewSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPreviewSrc(null)}
        >
          <div
            className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 text-sm">图片预览</h3>
              <button onClick={() => setPreviewSrc(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSrc}
                alt="预览图片"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_IMG;
                }}
                className="max-w-full h-auto rounded-lg"
              />
              <p className="mt-3 text-xs text-gray-500 break-all">{previewSrc.slice(0, 120)}{previewSrc.length > 120 ? '…' : ''}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
});
