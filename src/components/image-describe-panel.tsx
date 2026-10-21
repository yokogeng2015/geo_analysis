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

interface ImageDescribePanelProps {
  /** 用户输入的型号名，识图描述需要型号时使用 */
  modelName: string;
  /** 点击缩略图放大预览 */
  onPreview: (src: string) => void;
}

/**
 * 「直接识图生成描述」面板：上传 / Ctrl+V 粘贴 / 拖拽任意图片，
 * 调用多模态 LLM（SSE 流式）生成 Apple 官网风格 alt 描述，可编辑、复制。
 */
export const ImageDescribePanel = memo(function ImageDescribePanel({
  modelName,
  onPreview,
}: ImageDescribePanelProps) {
  const [images, setImages] = useState<DescribeImage[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
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
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-sky-600" />
        <h3 className="text-sm font-semibold text-gray-800">直接识图生成描述</h3>
        <span className="text-xs text-gray-400">上传 / Ctrl+V 粘贴 / 拖拽图片，AI 生成 Apple 风格 alt 描述</span>
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
        {images.length === 0 ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-lg px-4 py-8 text-gray-500 transition-colors hover:bg-sky-50/60 hover:text-sky-600"
          >
            <Upload className="h-5 w-5" />
            <span className="text-sm">点击上传图片，或直接拖拽 / Ctrl+V 粘贴到此区域</span>
          </button>
        ) : (
          <ul className="divide-y divide-gray-100">
            {images.map((img) => (
              <li key={img.id} className="flex gap-3 p-3">
                {/* 缩略图：点击放大 */}
                <button
                  type="button"
                  onClick={() => onPreview(img.dataUrl)}
                  className="group h-12 w-16 flex-shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-50 transition-colors hover:border-sky-400"
                  title="点击放大预览"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.dataUrl}
                    alt="待识别图片"
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
    </section>
  );
});
