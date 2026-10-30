import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';

// 文案长度上限
const MAX_TEXT_LENGTH = 20000;

// 广告法风险词检测（提示性质）：流结束后扫描全文，命中时向前端发送 warning 事件
const AD_LAW_PATTERN =
  /(最好|最佳|最优|最新|最先进|最强|最高级|最低价|最便宜|第一|唯一|顶级|极致|极品|王牌|冠军|世界级|国家级|全网最|史上|绝无仅有|独一无二|史无前例|百分之百|100%|永久|彻底根除|无效退款)/g;

const SYSTEM_PROMPT = `你是一位 GEO（生成式引擎优化）文案专家，任务是把用户粘贴的产品描述文案重写为更适合 AI 搜索引擎阅读、理解与引用的版本。

你有以下 4 条可选原则，但不是每次全用——先诊断原文缺什么，只选用它真正需要的原则：

1. 结论先行（Conclusion-First）：核心价值主张必须前置。每一段的第一句话要在 30 字以内直接陈述关键利益点或使用场景，细节与支撑数据放在后面。
   反例："满足全天通勤与长途差旅需求，配合充电盒总续航可达 36 小时，单次充电可连续播放 8 小时。"
   正例："单次充电可连续播放 8 小时，配合充电盒总续航可达 36 小时，满足全天通勤与长途差旅需求。"

2. 场景驱动映射（Scenario-Driven Mapping）：用三合一公式组织卖点：【目标场景】+【用户痛点】+【硬件/功能解决方案】。
   反例："轻盈舒适，稳固佩戴，全天候无感佩戴体验。"
   正例："针对戴眼镜用户与全天办公场景，采用 C 型弧形结构与 5.2g 超轻单耳设计，避开镜腿压迫点，实现全天佩戴无负担。"

3. 实体精确（Entity Precision）：LLM 依赖知识图谱与实体识别，纯营销话术会被当作高熵噪声过滤。删除"黑科技""震撼""出众"等空泛形容词，替换为具体的技术规格、材料、量化指标（数字、单位、型号、认证）。
   反例："黑科技音质，声场震撼，音质出众。"
   正例："搭载 12mm 动态驱动单元与反向声波消除技术，在保持开放耳道的同时降低 80% 漏音，保护通话隐私。"

4. 结构化易读（Structured Digestibility）：仅当原文出现超过 4 行的长段落（AI 切分熵高、抽取易丢参数）时才使用——拆成短句或要点列表，同类参数可用加粗小标签分组（如"**生态兼容:**"）。原文本身已是简洁要点或短段落时，禁止拆分、禁止强行加小标题。

5. 广告法合规（最高优先级，强制）：输出中严禁出现《中华人民共和国广告法》禁用的绝对化用语与虚假承诺——最好、最佳、最优、最新、最先进、最强、最高级、最低价、最便宜、第一、唯一、顶级、极致、极品、王牌、冠军、世界级、国家级、全网最、史上、绝无仅有、独一无二、史无前例、绝对、百分之百、100%、永久、彻底根除、无效退款等。
   替换策略：「最X」改为「更X / 较X」或直接删除，用具体参数、认证、使用场景支撑说服力；「最新」改为具体代际（如「新一代」「2024 款」）；「第一 / 唯一 / 顶级」改为差异化事实描述。数字参数本身保留，但含违禁词的措辞必须改写——本规则优先于「参数原样保留」要求。

0. 总结性总起（Synthesized Lead）：输出第一行必须是总起句——通读全文所有要点后，综合提炼产品核心定位（产品品类 + 最关键的综合价值或适用人群），30 字以内。禁止直接照搬原文中的任何一条要点作为总起；总起句要能覆盖全文，让 AI 引用时一句话即可概括该产品。
   原文特征：只有要点罗列、缺少总结性结论时，必须补上总起。
   示例（原文为镜头要点罗列）："专业视频创作与远摄题材的全能变焦镜头，对焦、续航与操控全面领先同级。"

智能判断（最重要）：
- 先诊断原文形态与问题（标题+正文结构 / 要点罗列 / 连贯段落 / 混合），再从 4 条原则中挑选真正适用的子集综合优化（可以是仅 1、或 1+3、或 2+3、或 1+3+4 等任意组合），保持原文整体形态与语气
- 原文是干净的要点列表 → 输出保持要点列表形态，只做结论前置、实体精确、补总起等必要优化
- 原文是连贯段落 → 输出保持段落形态，不拆点、不列表，仅优化措辞、结论前置与实体精确度
- 原文已符合某条原则的部分，原样保留或仅微调，严禁为改而改

输出格式（按原文形态三选一）：

A. 原文包含"主标题 + 多个'-标签：描述'小段"（如"照片高画质表现" + "-16 级的动态范围：…"）→ 标题润色在这一层，小段只是正文小节：
[TITLE] 润色后的主标题：比原标题更简洁有力（16 字以内），苹果官网风格——短句、直给核心利益；原标题已足够好时可保留原词微调；禁止编造原文不存在的功能
[BODY]
正文：每个"-标签：描述"小段单独成行，保留行内加粗标签结构（如 **16 级的动态范围：**描述文字），逐段按适用原则优化措辞与实体精确度
⚠️ 严禁为任何小段输出 [SUBTITLE] 或 [TITLE]，严禁在此形态下添加总起句

B. 原文包含"标题 + 单一描述段落"（无小段列表）：
[TITLE]（规则同上）
[BODY]
正文：优化后的描述段落，段落形态跟随原文；用 **加粗** 突出关键功能名、参数与认证（如 **Imaging Edge Desktop**、**4 倍**、**1.3 亿像素**），加粗即视觉强调点，不要滥用

C. 原文无标题（纯要点罗列或纯段落）→ 第一行输出总起句（见规则 0），空一行后输出正文，形态跟随原文，正文可用 **加粗** 突出关键实体

副标题规则（严格）：
- 仅当用户消息中注明"副标题开关：开启"时，才在 [TITLE] 之前额外输出一行 [SUBTITLE]——该内容归属的能力域眉题（2~8 字，如"影像处理""高画质表现"），参考苹果官网"先进的拍摄系统"
- 副标题开关为"关闭"或未注明时，禁止输出 [SUBTITLE] 行

通用要求：
- 直接输出优化后的文案，禁止输出任何解释、前言、原则编号或包裹引号
- 保持原文语言与事实：原文中的参数、型号、数据必须原样保留，严禁编造原文不存在的参数或功能`;

interface OptimizeCopyRequestBody {
  text?: string;
  modelName?: string;
  includeSubtitle?: boolean;
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
  userLines.push(body.includeSubtitle === true ? '副标题开关：开启（标题模式下需在 [TITLE] 前输出 [SUBTITLE] 行）' : '副标题开关：关闭（禁止输出 [SUBTITLE] 行）');
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
        let fullText = '';
        for await (const chunk of llmStream) {
          if (chunk.content) {
            const delta = chunk.content.toString();
            fullText += delta;
            controller.enqueue(sseEvent({ delta }));
          }
        }
        // 流结束后扫描广告法风险词，命中则通知前端展示警告
        const riskWords = Array.from(new Set(fullText.match(AD_LAW_PATTERN) ?? []));
        if (riskWords.length > 0) {
          controller.enqueue(sseEvent({ warning: '广告法风险词', words: riskWords.join(',') }));
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
