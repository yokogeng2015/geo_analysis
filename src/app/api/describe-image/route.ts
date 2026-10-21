import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';

// 下载图片的大小上限（8MB）
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
// 图片下载超时（ms）
const IMAGE_FETCH_TIMEOUT = 15000;

/** 还原 HTML 属性中被转义的字符（src 常含 &amp; 等） */
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/gi, '&')
    .replace(/&#38;/g, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

/** 根据扩展名猜测 MIME（部分 CDN 返回 application/octet-stream） */
function guessMimeFromUrl(url: string): string {
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.gif')) return 'image/gif';
  if (clean.endsWith('.avif')) return 'image/avif';
  if (clean.endsWith('.bmp')) return 'image/bmp';
  return 'image/jpeg';
}

const SYSTEM_PROMPT = `你是电商与品牌官网的图片 alt 文本撰写助手，风格参考 Apple 官网：用一句简洁的中文描述图片中的具体内容与场景（主体是什么、颜色/材质、正在做什么或处于什么状态、画面重点）。
示例风格："双手拿着横摊展开的星光白色 iPhone Duo，内屏显示主屏幕画面。"
硬性要求：
1. 直接输出 alt 文本本身，禁止输出引号、前后缀说明或任何解释
2. 只描述画面中真实可见的内容，严禁编造图中不存在的功能、参数或卖点
3. 不要以"图片""图像""这是一张"开头，不要关键词堆砌
4. 长度 15~60 个汉字，一句话完成
5. 若图中主要是规格表/数据图表，概括其呈现的关键信息；若图中无有效信息（如装饰/占位图），输出"页面装饰性图片"`;

interface DescribeRequestBody {
  imageUrl?: string;
  modelName?: string;
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: NextRequest) {
  let body: DescribeRequestBody;
  try {
    body = await request.json();
  } catch {
    return jsonError('请求体必须是 JSON', 400);
  }

  const rawUrl = (body.imageUrl ?? '').trim();
  const imageUrl = decodeHtmlEntities(rawUrl);
  const modelName = (body.modelName ?? '').trim().slice(0, 60);

  const isDataUri = /^data:image\//i.test(imageUrl);
  if (!imageUrl || (!isDataUri && !/^https?:\/\//i.test(imageUrl))) {
    return jsonError('imageUrl 必须是 http/https 绝对地址或 data:image 图片', 400);
  }

  let dataUri: string;
  if (isDataUri) {
    // 前端上传/粘贴的图片：直接使用 dataURI（base64 长度校验，对应 8MB 二进制上限）
    const maxBase64Len = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 256;
    if (imageUrl.length > maxBase64Len) {
      return jsonError('图片过大（超过 8MB），无法识别', 413);
    }
    dataUri = imageUrl;
  } else {
    // ---- 服务端代理下载图片（绕过防盗链，转为 base64 供多模态模型识别） ----
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT);
    let imageBytes: Buffer;
    let contentType: string;
    try {
      const origin = new URL(imageUrl).origin;
      const imgRes = await fetch(imageUrl, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          Referer: origin + '/',
        },
      });
      if (!imgRes.ok) {
        return jsonError(`图片下载失败（HTTP ${imgRes.status}），请检查 URL 前缀是否正确`, 502);
      }
      contentType = imgRes.headers.get('content-type') ?? '';
      const arrayBuffer = await imgRes.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        return jsonError('图片内容为空', 502);
      }
      if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
        return jsonError('图片过大（超过 8MB），无法识别', 413);
      }
      imageBytes = Buffer.from(arrayBuffer);
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'AbortError'
          ? '图片下载超时'
          : '图片下载失败，请检查图片地址是否可访问';
      return jsonError(msg, 502);
    } finally {
      clearTimeout(timer);
    }

    const mime = contentType.startsWith('image/')
      ? contentType.split(';')[0].trim()
      : guessMimeFromUrl(imageUrl);
    dataUri = `data:${mime};base64,${imageBytes.toString('base64')}`;
  }

  // ---- 调用多模态 LLM，SSE 流式返回 alt 描述 ----
  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const client = new LLMClient(new Config(), customHeaders);

  const contextParts: string[] = ['请为这张图片撰写 alt 描述文本。'];
  if (modelName) {
    contextParts.push(
      `产品型号名：${modelName}。若图中产品可确认属于该型号，请在描述中自然使用此型号名；若无法确认则不要强行写入。`
    );
  }

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    {
      role: 'user' as const,
      content: [
        { type: 'text' as const, text: contextParts.join('') },
        {
          type: 'image_url' as const,
          image_url: { url: dataUri, detail: 'high' as const },
        },
      ],
    },
  ];

  const encoder = new TextEncoder();
  const sseEvent = (payload: Record<string, string | boolean>) =>
    encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const llmStream = client.stream(messages, {
          model: 'doubao-seed-2-0-lite-260215',
          temperature: 0.3,
          thinking: 'disabled',
        });
        for await (const chunk of llmStream) {
          if (chunk.content) {
            controller.enqueue(sseEvent({ delta: chunk.content.toString() }));
          }
        }
        controller.enqueue(sseEvent({ done: true }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'AI 识图失败';
        controller.enqueue(sseEvent({ error: `AI 识图失败：${msg}` }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Transfer-Encoding': 'chunked',
      'X-Accel-Buffering': 'no',
    },
  });
}
