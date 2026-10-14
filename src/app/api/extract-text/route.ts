import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';

// 图片大小上限：dataURI base64 长度约 11MB（对应二进制约 8MB）
const MAX_DATAURI_LENGTH = 11 * 1024 * 1024;

const SYSTEM_PROMPT = `你是精准的 OCR 文字提取助手。用户会提供一张网页/产品页截图，你的任务是提取图中的描述性文字。

提取规则：
1. 按图中原始阅读顺序逐行输出，保持原有分行与条目结构
2. 只提取正文描述与要点文字（如产品功能、参数、卖点说明）；忽略明显的界面元素（导航栏、按钮、页码、水印、logo）
3. 与产品相关的场景标签或图注（如图标下方的"人像""视频"等）可以保留，合并为一行
4. 原样保留数字、单位、型号、专有名词与上标标记（如 *1、*2）
5. 直接输出提取的文字，禁止输出任何解释、前言、总结或包裹引号
6. 若图中没有可提取的文字，只输出：[未识别到文字]`;

interface ExtractTextRequestBody {
  imageData?: string;
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: NextRequest) {
  let body: ExtractTextRequestBody;
  try {
    body = await request.json();
  } catch {
    return jsonError('请求体必须是 JSON', 400);
  }

  const imageData = (body.imageData ?? '').trim();
  if (!imageData) {
    return jsonError('请先上传或粘贴截图', 400);
  }

  // 仅支持 dataURI（客户端已压缩）；http(s) URL 转发代理下载
  let finalDataUri: string;
  if (imageData.startsWith('data:image/')) {
    if (imageData.length > MAX_DATAURI_LENGTH) {
      return jsonError('截图过大（上限约 8MB），请裁剪后重试', 413);
    }
    const mimeMatch = imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);/);
    if (!mimeMatch) {
      return jsonError('截图格式无法识别，请使用 PNG/JPG/WebP 格式', 400);
    }
    finalDataUri = imageData;
  } else if (/^https?:\/\//i.test(imageData)) {
    // 代理下载远端图片（带 UA 防 403），转 base64
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const imgRes = await fetch(imageData, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          Referer: new URL(imageData).origin + '/',
        },
        signal: controller.signal,
        redirect: 'follow',
      }).finally(() => clearTimeout(timer));
      if (!imgRes.ok) {
        return jsonError(`图片下载失败（HTTP ${imgRes.status}）`, 502);
      }
      const buf = Buffer.from(await imgRes.arrayBuffer());
      if (buf.length > 8 * 1024 * 1024) {
        return jsonError('图片过大（上限 8MB）', 413);
      }
      const mime = (imgRes.headers.get('content-type') ?? 'image/jpeg').split(';')[0];
      finalDataUri = `data:${mime.startsWith('image/') ? mime : 'image/jpeg'};base64,${buf.toString('base64')}`;
    } catch {
      return jsonError('图片下载失败，请检查链接或改用本地截图上传', 502);
    }
  } else {
    return jsonError('不支持的图片格式，请上传截图或提供图片链接', 400);
  }

  // ---- 调用多模态 LLM，SSE 流式返回提取结果 ----
  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const client = new LLMClient(new Config(), customHeaders);

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    {
      role: 'user' as const,
      content: [
        { type: 'text' as const, text: '请提取这张截图中产品描述相关的文字，按原始顺序逐行输出。' },
        { type: 'image_url' as const, image_url: { url: finalDataUri, detail: 'high' as const } },
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
          temperature: 0.1,
          thinking: 'disabled',
        });
        for await (const chunk of llmStream) {
          if (chunk.content) {
            controller.enqueue(sseEvent({ delta: chunk.content.toString() }));
          }
        }
        controller.enqueue(sseEvent({ done: true }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'AI 处理失败';
        controller.enqueue(sseEvent({ error: `截图识别失败：${msg}` }));
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
