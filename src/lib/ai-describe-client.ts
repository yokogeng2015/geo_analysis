/**
 * 客户端：SSE 流式 LLM 接口通用消费工具。
 * 供 AI 识图（describe-image）、截图文字提取（extract-text）等复用。
 */

interface StreamTextOptions {
  endpoint: string;
  body: Record<string, unknown>;
  signal?: AbortSignal;
  /** 每收到一个增量块回调（参数为当前累计全文），用于流式渲染 */
  onDelta?: (fullText: string) => void;
  /** 服务端在流中发出的提示性警告（如广告法风险词列表） */
  onWarning?: (words: string[]) => void;
  /** 流结束后对累计全文的校验/提示文案，空结果时抛错 */
  emptyMessage?: string;
}

export async function streamText({
  endpoint,
  body,
  signal,
  onDelta,
  onWarning,
  emptyMessage = 'AI 未返回有效内容，请重试',
}: StreamTextOptions): Promise<string> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
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
      let payload: { delta?: string; done?: boolean; error?: string; warning?: string; words?: string };
      try {
        payload = JSON.parse(dataLine.slice(5).trim());
      } catch {
        continue; // 忽略无法解析的事件帧
      }
      if (payload.error) throw new Error(payload.error);
      if (payload.warning && payload.words) {
        onWarning?.(payload.words.split(',').filter(Boolean));
      }
      if (payload.delta) {
        acc += payload.delta;
        onDelta?.(acc);
      }
    }
  }

  const text = acc.trim();
  if (!text) throw new Error(emptyMessage);
  return text;
}

/** 调用 /api/describe-image，流式生成图片 alt 描述（单个/批量 AI 识图共用） */
export function streamAltDescription(options: {
  imageUrl: string;
  modelName?: string;
  signal?: AbortSignal;
  onDelta?: (fullText: string) => void;
}): Promise<string> {
  return streamText({
    endpoint: '/api/describe-image',
    body: { imageUrl: options.imageUrl, modelName: options.modelName || undefined },
    signal: options.signal,
    onDelta: options.onDelta,
    emptyMessage: 'AI 未返回有效描述，请重试',
  });
}
