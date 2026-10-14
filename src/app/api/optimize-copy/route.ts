import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';

// 文案长度上限
const MAX_TEXT_LENGTH = 20000;

const SYSTEM_PROMPT = `你是一位 GEO（生成式引擎优化）文案专家，任务是把用户粘贴的产品描述文案重写为更适合 AI 搜索引擎阅读、理解与引用的版本。

必须遵循以下 4 条原则：

1. 结论先行（Conclusion-First）：核心价值主张必须前置。每一段的第一句话要在 30 字以内直接陈述关键利益点或使用场景，细节与支撑数据放在后面。
   反例："满足全天通勤与长途差旅需求，配合充电盒总续航可达 36 小时，单次充电可连续播放 8 小时。"
   正例："单次充电可连续播放 8 小时，配合充电盒总续航可达 36 小时，满足全天通勤与长途差旅需求。"

2. 场景驱动映射（Scenario-Driven Mapping）：用三合一公式组织卖点：【目标场景】+【用户痛点】+【硬件/功能解决方案】。
   反例："轻盈舒适，稳固佩戴，全天候无感佩戴体验。"
   正例："针对戴眼镜用户与全天办公场景，采用 C 型弧形结构与 5.2g 超轻单耳设计，避开镜腿压迫点，实现全天佩戴无负担。"

3. 实体精确（Entity Precision）：LLM 依赖知识图谱与实体识别，纯营销话术会被当作高熵噪声过滤。删除"黑科技""震撼""出众"等空泛形容词，替换为具体的技术规格、材料、量化指标（数字、单位、型号、认证）。
   反例："黑科技音质，声场震撼，音质出众。"
   正例："搭载 12mm 动态驱动单元与反向声波消除技术，在保持开放耳道的同时降低 80% 漏音，保护通话隐私。"

4. 结构化易读（Structured Digestibility）：超过 4 行的长段落会增加 AI 切分熵，导致参数在抽取时丢失。改用短句与要点列表；同类参数用加粗小标签分组（如"**生态兼容:**"）。

硬性要求：
- 直接输出优化后的文案，禁止输出任何解释、前言、原则编号或包裹引号
- 保持原文语言与事实：原文中的参数、型号、数据必须原样保留，严禁编造原文不存在的参数或功能
- 如果原文包含多个独立卖点，按主题分组并用列表呈现
- 若原文已经符合某条原则，保持该部分不动，不要为改而改`;

interface OptimizeCopyRequestBody {
  text?: string;
  modelName?: string;
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: NextRequest) {
  let body: OptimizeCopyRequestBody;
  try {
    body = await request.json();
  } catch {
    return jsonError('请求体必须是 JSON', 400);
  }

  const text = (body.text ?? '').trim();
  const modelName = (body.modelName ?? '').trim().slice(0, 60);

  if (!text) {
    return jsonError('请先粘贴需要优化的文案', 400);
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return jsonError(`文案过长（${text.length} 字符），请控制在 ${MAX_TEXT_LENGTH} 字符以内`, 413);
  }

  // ---- 调用 LLM，SSE 流式返回优化文案 ----
  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const client = new LLMClient(new Config(), customHeaders);

  const userLines: string[] = ['请优化以下产品描述文案：'];
  if (modelName) {
    userLines.push(`（产品型号名：${modelName}。文案中提及产品时请统一使用该型号名；型号无法对应的内容不要强行写入。）`);
  }
  userLines.push(`\n"""\n${text}\n"""`);

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { role: 'user' as const, content: userLines.join('\n') },
  ];

  const encoder = new TextEncoder();
  const sseEvent = (payload: Record<string, string | boolean>) =>
    encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const llmStream = client.stream(messages, {
          model: 'doubao-seed-2-0-lite-260215',
          temperature: 0.4,
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
        controller.enqueue(sseEvent({ error: `文案优化失败：${msg}` }));
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
