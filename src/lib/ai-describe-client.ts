/**
 * 客户端：调用 /api/describe-image，SSE 流式生成 alt 描述。
 * 供单个/批量 AI 识图共同复用。
 */
export interface StreamAltOptions {
  imageUrl: string;
  modelName?: string;
  signal?: AbortSignal;
  /** 每收到一个增量块回调（参数为当前累计全文），用于流式渲染 */
  onDelta?: (fullText: string) => void;
}

export async function streamAltDescription({
  imageUrl,
  modelName,
  signal,
  onDelta,
}: StreamAltOptions): Promise<string> {
  const res = await fetch('/api/describe-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl, modelName: modelName || undefined }),
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
      let payload: { delta?: string; done?: boolean; error?: string };
      try {
        payload = JSON.parse(dataLine.slice(5).trim());
      } catch {
        continue; // 忽略无法解析的事件帧
      }
      if (payload.error) throw new Error(payload.error);
      if (payload.delta) {
        acc += payload.delta;
        onDelta?.(acc);
      }
    }
  }

  const text = acc.trim();
  if (!text) throw new Error('AI 未返回有效描述，请重试');
  return text;
}
