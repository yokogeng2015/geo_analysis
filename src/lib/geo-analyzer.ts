import type {
  AnalysisResult,
  CategoryResult,
  CodeSuggestion,
  ComparisonPoint,
  DimensionScore,
  IntentGap,
} from '@/types/geo';
import { isMeaninglessAlt } from './code-optimizer';

interface ParsedPage {
  url: string;
  html: string;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  ogTags: Record<string, string>;
  headings: { tag: string; text: string }[];
  links: { href: string; text: string; isExternal: boolean }[];
  images: { src: string; alt: string }[];
  schemaMarkup: Record<string, unknown>[];
  canonicalUrl: string;
  robotsMeta: string;
  lang: string;
  hasSitemap: boolean;
  hasFavicon: boolean;
  wordCount: number;
  paragraphs: string[];
  lists: string[];
  tables: string[];
  faqContent: { question: string; answer: string }[];
  textContent: string;
}

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseHTML(html: string, url: string): ParsedPage {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Extract meta description
  const metaDescMatch = html.match(
    /<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i
  );
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

  // Extract meta keywords
  const metaKwMatch = html.match(
    /<meta[^>]*name=["']keywords["'][^>]*content=["']([\s\S]*?)["']/i
  );
  const metaKeywords = metaKwMatch ? metaKwMatch[1].trim() : '';

  // Extract OG tags
  const ogTags: Record<string, string> = {};
  const ogRegex =
    /<meta[^>]*property=["']og:(\w+)["'][^>]*content=["']([\s\S]*?)["']/gi;
  let ogMatch;
  while ((ogMatch = ogRegex.exec(html)) !== null) {
    ogTags[ogMatch[1]] = ogMatch[2].trim();
  }

  // Extract headings
  const headings: { tag: string; text: string }[] = [];
  const headingRegex = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let headingMatch;
  while ((headingMatch = headingRegex.exec(html)) !== null) {
    const text = headingMatch[2].replace(/<[^>]+>/g, '').trim();
    headings.push({ tag: headingMatch[1].toLowerCase(), text });
  }

  // Extract links
  const baseUrl = new URL(url);
  const links: { href: string; text: string; isExternal: boolean }[] = [];
  const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const href = linkMatch[1];
    const text = linkMatch[2].replace(/<[^>]+>/g, '').trim();
    let isExternal = false;
    try {
      const linkUrl = new URL(href, url);
      isExternal = linkUrl.hostname !== baseUrl.hostname;
    } catch {
      // relative URL
    }
    links.push({ href, text, isExternal });
  }

  // Extract images
  const images: { src: string; alt: string }[] = [];
  const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*?)["']/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    images.push({ src: imgMatch[1], alt: imgMatch[2] });
  }
  // Also find images without alt
  const imgNoAltRegex = /<img[^>]*src=["']([^"']+)["'][^>]*(?!.*alt=)/gi;
  let imgNoAltMatch: RegExpExecArray | null;
  while ((imgNoAltMatch = imgNoAltRegex.exec(html)) !== null) {
    if (!images.find((i) => i.src === imgNoAltMatch![1])) {
      images.push({ src: imgNoAltMatch[1], alt: '' });
    }
  }

  // Extract schema markup (JSON-LD)
  const schemaMarkup: Record<string, unknown>[] = [];
  const schemaRegex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let schemaMatch;
  while ((schemaMatch = schemaRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(schemaMatch[1]);
      schemaMarkup.push(parsed);
    } catch {
      // invalid JSON-LD
    }
  }

  // Extract canonical URL
  const canonicalMatch = html.match(
    /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i
  );
  const canonicalUrl = canonicalMatch ? canonicalMatch[1] : '';

  // Extract robots meta
  const robotsMatch = html.match(
    /<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["']/i
  );
  const robotsMeta = robotsMatch ? robotsMatch[1] : '';

  // Extract lang
  const langMatch = html.match(/<html[^>]*lang=["']([^"']+)["']/i);
  const lang = langMatch ? langMatch[1] : '';

  // Extract text content (strip tags)
  const textContent = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const wordCount = textContent.split(/\s+/).filter(Boolean).length;

  // Extract paragraphs
  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pMatch;
  while ((pMatch = pRegex.exec(html)) !== null) {
    const text = pMatch[1].replace(/<[^>]+>/g, '').trim();
    if (text.length > 20) paragraphs.push(text);
  }

  // Extract lists
  const lists: string[] = [];
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let liMatch;
  while ((liMatch = liRegex.exec(html)) !== null) {
    lists.push(liMatch[1].replace(/<[^>]+>/g, '').trim());
  }

  // Extract tables
  const tables: string[] = [];
  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  let tableMatch;
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    tables.push(tableMatch[0]);
  }

  // Extract FAQ content (look for common FAQ patterns)
  const faqContent: { question: string; answer: string }[] = [];
  const faqSchema = schemaMarkup.find(
    (s) =>
      (s as Record<string, unknown>)['@type'] === 'FAQPage' ||
      (s as Record<string, unknown>)['@type'] === 'Question'
  );
  if (faqSchema && 'mainEntity' in faqSchema) {
    const entities = faqSchema.mainEntity as Array<{
      name?: string;
      acceptedAnswer?: { text?: string };
    }>;
    if (Array.isArray(entities)) {
      entities.forEach((entity) => {
        if (entity.name && entity.acceptedAnswer?.text) {
          faqContent.push({
            question: entity.name,
            answer: entity.acceptedAnswer.text.replace(/<[^>]+>/g, ''),
          });
        }
      });
    }
  }

  // Check for sitemap
  const hasSitemap =
    html.includes('sitemap.xml') ||
    html.includes('/sitemap') ||
    links.some((l) => l.href.includes('sitemap'));

  // Check for favicon
  const hasFavicon =
    html.includes('favicon') ||
    html.includes('icon') ||
    /<link[^>]*rel=["'](icon|shortcut icon)["']/i.test(html);

  return {
    url,
    html,
    title,
    metaDescription,
    metaKeywords,
    ogTags,
    headings,
    links,
    images,
    schemaMarkup,
    canonicalUrl,
    robotsMeta,
    lang,
    hasSitemap,
    hasFavicon,
    wordCount,
    paragraphs,
    lists,
    tables,
    faqContent,
    textContent,
  };
}

function analyzeCrawlability(page: ParsedPage): DimensionScore {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Check robots.txt accessibility
  if (page.robotsMeta.includes('noindex')) {
    issues.push('页面设置了 noindex，搜索引擎无法索引此页面');
    suggestions.push('如果页面需要被索引，移除 noindex 指令');
    score -= 30;
  }

  // Check canonical URL
  if (!page.canonicalUrl) {
    issues.push('缺少 canonical URL，可能导致重复内容问题');
    suggestions.push('添加 <link rel="canonical" href="..."> 标签');
    score -= 15;
  }

  // Check language attribute
  if (!page.lang) {
    issues.push('HTML 标签缺少 lang 属性');
    suggestions.push('在 <html> 标签中添加 lang 属性，如 lang="zh-CN"');
    score -= 10;
  }

  // Check for sitemap reference
  if (!page.hasSitemap) {
    issues.push('未发现 sitemap 引用');
    suggestions.push('创建并提交 XML sitemap 以帮助搜索引擎发现页面');
    score -= 10;
  }

  // Check for favicon
  if (!page.hasFavicon) {
    issues.push('缺少 favicon 配置');
    suggestions.push('添加 favicon 以提升品牌识别度');
    score -= 5;
  }

  // Check for broken structure
  if (page.html.length < 500) {
    issues.push('页面 HTML 内容过少，可能不利于爬取分析');
    suggestions.push('确保页面有足够的实质性内容');
    score -= 15;
  }

  if (issues.length === 0) {
    suggestions.push('爬取性良好，继续保持');
  }

  return {
    name: 'Crawlability',
    score: Math.max(0, score),
    issues,
    suggestions,
  };
}

function analyzeContentAccessibility(
  page: ParsedPage
): DimensionScore {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // alt 有效性按覆盖率比例计分（权重 50）：10 张图 5 张有效 → 75 分，4 张有效 → 70 分
  // 覆盖率越高得分越高，避免「一张缺 alt 就重扣」；有效 = alt 存在且非无意义（与代码优化 tab 同一判断标准）
  const totalImages = page.images.length;
  if (totalImages > 0) {
    const missingAlt = page.images.filter((img) => img.alt.trim() === '').length;
    const meaninglessAlt = page.images.filter(
      (img) => img.alt.trim() !== '' && isMeaninglessAlt(img.alt)
    ).length;
    const invalidAlt = missingAlt + meaninglessAlt;
    if (invalidAlt > 0) {
      const validAlt = totalImages - invalidAlt;
      const coverage = Math.round((validAlt / totalImages) * 100);
      const parts: string[] = [];
      if (missingAlt > 0) parts.push(`${missingAlt} 张缺失`);
      if (meaninglessAlt > 0) parts.push(`${meaninglessAlt} 张无意义（如 "img"、"图片"）`);
      issues.push(
        `${invalidAlt}/${totalImages} 张图片 alt 无效（${parts.join('、')}），有效覆盖率 ${coverage}%`
      );
      suggestions.push(
        '为 alt 无效的图片补充描述性 alt（描述图片内容与所在场景），将有效覆盖率提升至 90% 以上'
      );
      score -= Math.round((invalidAlt / totalImages) * 50);
    }
  }

  // Check content length
  if (page.wordCount < 300) {
    issues.push(
      `页面文字内容仅 ${page.wordCount} 词，内容可能不够充分`
    );
    suggestions.push('增加页面的实质性文字内容，建议至少 300 词以上');
    score -= 20;
  }

  // Check for structured lists
  if (page.lists.length === 0 && page.wordCount > 200) {
    issues.push('内容中缺少结构化列表');
    suggestions.push('使用 <ul>/<ol> 列表来组织要点信息，提升可读性');
    score -= 10;
  }

  if (issues.length === 0) {
    suggestions.push('内容可访问性良好');
  }

  return {
    name: 'Content Accessibility',
    score: Math.max(0, score),
    issues,
    suggestions,
  };
}

function analyzeSemanticStructure(
  page: ParsedPage
): DimensionScore {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Check heading hierarchy
  const headingTags = page.headings.map((h) => h.tag);
  const h1Count = headingTags.filter((tag) => tag === 'h1').length;
  const hasH2 = headingTags.includes('h2');
  const hasH3 = headingTags.includes('h3');

  if (h1Count === 0) {
    issues.push('缺少 H1 主标题');
    suggestions.push('添加一个明确的 H1 标题来描述页面主题');
    score -= 20;
  } else if (h1Count > 1) {
    issues.push(`页面有 ${h1Count} 个 H1 标题，建议只保留一个`);
    suggestions.push('确保页面只有一个 H1 主标题');
    score -= 10;
  }
  if (!hasH2) {
    issues.push('缺少 H2 副标题，内容结构不够清晰');
    suggestions.push('使用 H2 划分主要章节');
    score -= 15;
  }
  if (!hasH3 && hasH2) {
    issues.push('缺少 H3 子标题，层级结构可以更丰富');
    suggestions.push('在 H2 下使用 H3 进一步细分内容');
    score -= 5;
  }

  // Check for semantic HTML5 elements
  const hasArticle = /<article[\s>]/i.test(page.html);
  const hasSection = /<section[\s>]/i.test(page.html);
  const hasNav = /<nav[\s>]/i.test(page.html);
  const hasMain = /<main[\s>]/i.test(page.html);
  const hasAside = /<aside[\s>]/i.test(page.html);

  const missingSemantic = [];
  if (!hasMain) missingSemantic.push('main');
  if (!hasArticle) missingSemantic.push('article');
  if (!hasSection) missingSemantic.push('section');
  if (!hasNav) missingSemantic.push('nav');

  if (missingSemantic.length > 0) {
    issues.push(
      `缺少语义化 HTML5 标签: ${missingSemantic.join(', ')}`
    );
    suggestions.push(
      `使用 ${missingSemantic.join(', ')} 等语义化标签组织页面结构`
    );
    score -= missingSemantic.length * 5;
  }

  // Check for heading hierarchy issues (skipping levels)
  for (let i = 1; i < headingTags.length; i++) {
    const prevLevel = parseInt(headingTags[i - 1].charAt(1));
    const currLevel = parseInt(headingTags[i].charAt(1));
    if (currLevel > prevLevel + 1) {
      issues.push(
        `标题层级跳跃: ${headingTags[i - 1].toUpperCase()} 后直接跟 ${headingTags[i].toUpperCase()}`
      );
      suggestions.push('保持标题层级连续，不要跳级');
      score -= 5;
      break;
    }
  }

  if (issues.length === 0) {
    suggestions.push('语义结构良好');
  }

  return {
    name: 'Semantic Structure',
    score: Math.max(0, score),
    issues,
    suggestions,
  };
}

function analyzeEntitySchema(
  page: ParsedPage
): DimensionScore {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  if (page.schemaMarkup.length === 0) {
    issues.push('页面没有任何 Schema 结构化数据 (JSON-LD)');
    suggestions.push(
      '添加 JSON-LD 格式的 Schema 标记，如 Organization、Product、Article 等'
    );
    score -= 40;
  } else {
    const types = page.schemaMarkup.map(
      (s) => (s as Record<string, unknown>)['@type']
    );

    if (!types.includes('Organization') && !types.includes('WebSite')) {
      issues.push('缺少 Organization 或 WebSite 类型的 Schema');
      suggestions.push('添加 Organization 或 WebSite Schema 来定义网站身份');
      score -= 15;
    }

    if (!types.includes('BreadcrumbList')) {
      issues.push('缺少 BreadcrumbList Schema');
      suggestions.push('添加面包屑导航 Schema 帮助搜索引擎理解页面层级');
      score -= 10;
    }

    if (!types.includes('FAQPage') && page.faqContent.length === 0) {
      issues.push('缺少 FAQ Schema');
      suggestions.push(
        '如果页面有问答内容，添加 FAQPage Schema 增强 AI 理解'
      );
      score -= 10;
    }
  }

  // Check for entity mentions
  const hasDefinedEntities =
    page.html.includes('itemtype') ||
    page.html.includes('itemscope') ||
    page.schemaMarkup.length > 0;

  if (!hasDefinedEntities) {
    issues.push('页面缺少明确的实体定义');
    suggestions.push(
      '使用 Schema.org 词汇标记页面中的关键实体（产品、人物、组织等）'
    );
    score -= 15;
  }

  if (issues.length === 0) {
    suggestions.push('实体与 Schema 标记完善');
  }

  return {
    name: 'Entity & Schema',
    score: Math.max(0, score),
    issues,
    suggestions,
  };
}

function analyzeInternalContext(
  page: ParsedPage
): DimensionScore {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  const internalLinks = page.links.filter((l) => !l.isExternal);
  const externalLinks = page.links.filter((l) => l.isExternal);

  // Check internal link count
  if (internalLinks.length < 3) {
    issues.push(
      `内部链接仅 ${internalLinks.length} 个，页面间关联度不足`
    );
    suggestions.push('增加指向相关页面的内部链接，建议至少 5 个以上');
    score -= 20;
  }

  // Check for links without anchor text
  const emptyLinks = page.links.filter((l) => !l.text || l.text.length < 2);
  if (emptyLinks.length > 0) {
    issues.push(
      `${emptyLinks.length} 个链接缺少描述性锚文本`
    );
    suggestions.push('为链接添加有意义的锚文本，避免"点击这里"等模糊文本');
    score -= 10;
  }

  // Check external links
  if (externalLinks.length === 0) {
    issues.push('缺少外部权威链接引用');
    suggestions.push('适当引用权威外部资源，增强内容可信度');
    score -= 10;
  }

  // Check for related content sections
  const hasRelatedContent =
    page.html.includes('related') ||
    page.html.includes('推荐') ||
    page.html.includes('相关阅读') ||
    page.textContent.toLowerCase().includes('see also') ||
    page.textContent.toLowerCase().includes('related');

  if (!hasRelatedContent && internalLinks.length < 5) {
    issues.push('缺少相关内容推荐区域');
    suggestions.push('添加"相关内容"或"推荐阅读"模块，增强内容关联');
    score -= 10;
  }

  if (issues.length === 0) {
    suggestions.push('内部上下文关联良好');
  }

  return {
    name: 'Internal Context',
    score: Math.max(0, score),
    issues,
    suggestions,
  };
}

function analyzeMetadataAISignals(
  page: ParsedPage
): DimensionScore {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Check title
  if (!page.title) {
    issues.push('页面缺少 title 标签');
    suggestions.push('添加描述性的 title 标签，控制在 50-60 字符内');
    score -= 25;
  } else if (page.title.length > 60) {
    issues.push(`title 过长 (${page.title.length} 字符)，可能被截断`);
    suggestions.push('将 title 控制在 50-60 字符以内');
    score -= 5;
  }

  // Check meta description
  if (!page.metaDescription) {
    issues.push('缺少 meta description');
    suggestions.push(
      '添加 meta description，控制在 150-160 字符，包含核心关键词'
    );
    score -= 20;
  } else if (page.metaDescription.length < 70) {
    issues.push('meta description 过短，未充分利用展示空间');
    suggestions.push('扩展 meta description 到 150-160 字符');
    score -= 10;
  }

  // Check OG tags
  const requiredOG = ['title', 'description', 'image', 'type', 'url'];
  const missingOG = requiredOG.filter((tag) => !page.ogTags[tag]);
  if (missingOG.length > 0) {
    issues.push(`缺少 Open Graph 标签: ${missingOG.join(', ')}`);
    suggestions.push(
      '添加完整的 OG 标签以优化社交分享和 AI 引用展示'
    );
    score -= missingOG.length * 3;
  }

  // Check for AI-specific signals
  const hasAIFriendly =
    page.html.includes('llms.txt') ||
    page.html.includes('ai-summary') ||
    page.html.includes('data-ai') ||
    page.metaDescription.length > 100;

  if (!hasAIFriendly) {
    issues.push('缺少面向 AI 引擎的优化信号');
    suggestions.push(
      '考虑添加 llms.txt、AI 摘要标签等面向 AI 搜索引擎的优化'
    );
    score -= 10;
  }

  if (issues.length === 0) {
    suggestions.push('元数据与 AI 信号完善');
  }

  return {
    name: 'Metadata & AI Signals',
    score: Math.max(0, score),
    issues,
    suggestions,
  };
}

function analyzeProductFacts(
  page: ParsedPage
): DimensionScore {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  const text = page.textContent.toLowerCase();

  // Check for specific product information
  const hasSpecs =
    text.includes('specification') ||
    text.includes('规格') ||
    text.includes('参数') ||
    text.includes('feature') ||
    text.includes('功能') ||
    page.tables.length > 0;

  if (!hasSpecs) {
    issues.push('页面缺少具体的产品规格/参数信息');
    suggestions.push(
      '添加产品规格表格，包含具体数值和参数，便于 AI 引擎提取事实'
    );
    score -= 25;
  }

  // Check for quantitative data
  const hasNumbers = /\d+[\s]*[%mgkMGK]|\d+\.\d+|\$\d+/.test(page.textContent);
  if (!hasNumbers) {
    issues.push('内容中缺少量化数据');
    suggestions.push(
      '添加具体数字、百分比、价格等量化信息，增强事实性'
    );
    score -= 15;
  }

  // Check for version/date info
  const hasVersion =
    /\bv?\d+\.\d+/.test(page.textContent) ||
    text.includes('version') ||
    text.includes('版本') ||
    text.includes('updated') ||
    text.includes('更新');

  if (!hasVersion) {
    issues.push('缺少版本/更新日期信息');
    suggestions.push('标注产品版本和内容的最后更新日期');
    score -= 10;
  }

  if (issues.length === 0) {
    suggestions.push('产品事实信息充分');
  }

  // Extract content snippet - find a paragraph with product specs
  let contentSnippet = '';
  const specParagraph = page.paragraphs.find(
    (p) =>
      /\d+[\s]*[%mgkMGK]|\d+\.\d+|\$\d+|specification|规格|参数/.test(p)
  );
  if (specParagraph) {
    contentSnippet = specParagraph.length > 120
      ? specParagraph.substring(0, 120) + '...'
      : specParagraph;
  }

  return {
    name: 'Product Facts',
    score: Math.max(0, score),
    issues,
    suggestions,
    contentSnippet: contentSnippet || undefined,
  };
}

function analyzeFeatureExplainability(
  page: ParsedPage
): DimensionScore {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Check for detailed feature descriptions
  if (page.paragraphs.length < 3) {
    issues.push(
      `页面段落内容仅 ${page.paragraphs.length} 段，功能说明可能不够详细`
    );
    suggestions.push('为每个核心功能提供独立的段落说明');
    score -= 20;
  }

  // Check for step-by-step content
  const hasSteps =
    page.lists.length > 3 ||
    page.textContent.toLowerCase().includes('step') ||
    page.textContent.toLowerCase().includes('步骤') ||
    /(\d+[\.\)]\s)/.test(page.textContent);

  if (!hasSteps) {
    issues.push('缺少步骤化的功能说明');
    suggestions.push(
      '使用有序列表提供功能使用步骤，便于 AI 提取操作指南'
    );
    score -= 15;
  }

  // Check for "how to" content
  const hasHowTo =
    page.textContent.toLowerCase().includes('how to') ||
    page.textContent.toLowerCase().includes('如何') ||
    page.textContent.toLowerCase().includes('教程') ||
    page.schemaMarkup.some(
      (s) => (s as Record<string, unknown>)['@type'] === 'HowTo'
    );

  if (!hasHowTo) {
    issues.push('缺少 How-to 类型的内容');
    suggestions.push(
      '添加 How-to 指南内容，并使用 HowTo Schema 标记'
    );
    score -= 15;
  }

  // Check content depth
  if (page.wordCount < 500) {
    issues.push(
      `内容仅 ${page.wordCount} 词，功能解释深度不足`
    );
    suggestions.push('扩展功能说明内容，提供使用场景和详细解释');
    score -= 15;
  }

  if (issues.length === 0) {
    suggestions.push('功能可解释性良好');
  }

  // Extract content snippet - find a paragraph with feature description
  let contentSnippet = '';
  const featureParagraph = page.paragraphs.find(
    (p) =>
      p.length > 50 &&
      (p.toLowerCase().includes('feature') ||
        p.toLowerCase().includes('功能') ||
        p.toLowerCase().includes('how to') ||
        p.toLowerCase().includes('步骤') ||
        /\d+[\.\)]\s/.test(p))
  );
  if (featureParagraph) {
    contentSnippet = featureParagraph.length > 120
      ? featureParagraph.substring(0, 120) + '...'
      : featureParagraph;
  }

  return {
    name: 'Feature Explainability',
    score: Math.max(0, score),
    issues,
    suggestions,
    contentSnippet: contentSnippet || undefined,
  };
}

function analyzeUserIntentQA(
  page: ParsedPage
): DimensionScore {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Check for FAQ content
  if (page.faqContent.length === 0) {
    issues.push('页面缺少 FAQ 问答内容');
    suggestions.push(
      '添加常见问题解答模块，覆盖用户可能搜索的问题'
    );
    score -= 25;
  } else if (page.faqContent.length < 3) {
    issues.push(
      `FAQ 仅 ${page.faqContent.length} 条，覆盖面不足`
    );
    suggestions.push('增加更多 FAQ 条目，覆盖不同用户意图');
    score -= 10;
  }

  // Check for question-like headings
  const questionHeadings = page.headings.filter(
    (h) => h.text.includes('?') || h.text.includes('？') || h.text.includes('如何') || h.text.includes('怎么')
  );
  if (questionHeadings.length === 0) {
    issues.push('标题中缺少问题形式的表述');
    suggestions.push(
      '使用问句作为部分章节标题，匹配用户的搜索意图'
    );
    score -= 15;
  }

  // Check for conversational content
  const hasConversational =
    page.textContent.toLowerCase().includes('you might') ||
    page.textContent.toLowerCase().includes('you can') ||
    page.textContent.toLowerCase().includes('你可以') ||
    page.textContent.toLowerCase().includes('你可能');

  if (!hasConversational) {
    issues.push('内容缺少对话式表述');
    suggestions.push(
      '使用更自然的对话式语言，匹配 AI 引擎的问答模式'
    );
    score -= 10;
  }

  if (issues.length === 0) {
    suggestions.push('用户意图覆盖良好');
  }

  // Extract content snippet - use FAQ content or question headings
  let contentSnippet = '';
  if (page.faqContent.length > 0) {
    const faq = page.faqContent[0];
    contentSnippet = `${faq.question} ${faq.answer}`;
    if (contentSnippet.length > 120) {
      contentSnippet = contentSnippet.substring(0, 120) + '...';
    }
  } else {
    const questionHeading = page.headings.find(
      (h) => h.text.includes('?') || h.text.includes('？') || h.text.includes('如何')
    );
    if (questionHeading) {
      contentSnippet = questionHeading.text;
    }
  }

  return {
    name: 'User Intent / Q&A',
    score: Math.max(0, score),
    issues,
    suggestions,
    contentSnippet: contentSnippet || undefined,
  };
}

function analyzeUseCases(
  page: ParsedPage
): DimensionScore {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  const text = page.textContent.toLowerCase();

  // Check for use case sections
  const hasUseCases =
    text.includes('use case') ||
    text.includes('用例') ||
    text.includes('应用场景') ||
    text.includes('example') ||
    text.includes('示例') ||
    text.includes('scenario') ||
    text.includes('场景');

  if (!hasUseCases) {
    issues.push('页面缺少明确的使用场景/用例描述');
    suggestions.push(
      '添加"使用场景"或"应用案例"章节，描述产品的典型使用方式'
    );
    score -= 30;
  }

  // Check for real-world examples
  const hasExamples =
    page.lists.some(
      (l) =>
        l.toLowerCase().includes('example') ||
        l.toLowerCase().includes('例如') ||
        l.toLowerCase().includes('如')
    ) ||
    text.includes('for instance') ||
    text.includes('比如');

  if (!hasExamples) {
    issues.push('缺少具体的实例说明');
    suggestions.push('为关键功能提供具体的使用实例');
    score -= 15;
  }

  // Check for industry/audience targeting
  const hasAudience =
    text.includes('for ') ||
    text.includes('适合') ||
    text.includes('面向') ||
    text.includes('target') ||
    text.includes('行业');

  if (!hasAudience) {
    issues.push('缺少目标用户/行业定位描述');
    suggestions.push('明确描述产品适合哪些用户群体或行业');
    score -= 15;
  }

  if (issues.length === 0) {
    suggestions.push('使用场景描述充分');
  }

  // Extract content snippet - find a paragraph about use cases
  let contentSnippet = '';
  const useCaseParagraph = page.paragraphs.find(
    (p) =>
      p.toLowerCase().includes('use case') ||
      p.toLowerCase().includes('场景') ||
      p.toLowerCase().includes('example') ||
      p.toLowerCase().includes('例如') ||
      p.toLowerCase().includes('适合')
  );
  if (useCaseParagraph) {
    contentSnippet = useCaseParagraph.length > 120
      ? useCaseParagraph.substring(0, 120) + '...'
      : useCaseParagraph;
  }

  return {
    name: 'Use Cases',
    score: Math.max(0, score),
    issues,
    suggestions,
    contentSnippet: contentSnippet || undefined,
  };
}

function analyzeComparisonContext(
  page: ParsedPage
): DimensionScore {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  const text = page.textContent.toLowerCase();

  // Check for comparison content
  const hasComparison =
    text.includes('vs') ||
    text.includes('versus') ||
    text.includes('对比') ||
    text.includes('比较') ||
    text.includes('相比') ||
    text.includes('advantage') ||
    text.includes('优势');

  if (!hasComparison) {
    issues.push('页面缺少对比/比较内容');
    suggestions.push(
      '添加与竞品或替代方案的对比内容，帮助 AI 引擎理解产品定位'
    );
    score -= 30;
  }

  // Check for comparison tables
  if (page.tables.length === 0 && hasComparison) {
    issues.push('对比内容未使用表格呈现');
    suggestions.push(
      '使用表格形式呈现对比信息，便于 AI 提取结构化数据'
    );
    score -= 15;
  }

  // Check for unique selling points
  const hasUSP =
    text.includes('unique') ||
    text.includes('独特') ||
    text.includes('difference') ||
    text.includes('区别') ||
    text.includes('why choose') ||
    text.includes('为什么选择');

  if (!hasUSP) {
    issues.push('缺少独特卖点 (USP) 的明确表述');
    suggestions.push('明确阐述产品的独特优势和差异化特点');
    score -= 15;
  }

  if (issues.length === 0) {
    suggestions.push('对比上下文完善');
  }

  // 用户高频意图缺口分析（Prompt Intent Gap Analysis）
  const intentGaps = generateIntentGaps(page);

  // Extract content snippet - find a paragraph about comparisons
  let contentSnippet = '';
  const comparisonParagraph = page.paragraphs.find(
    (p) =>
      p.toLowerCase().includes('vs') ||
      p.toLowerCase().includes('对比') ||
      p.toLowerCase().includes('比较') ||
      p.toLowerCase().includes('advantage') ||
      p.toLowerCase().includes('优势')
  );
  if (comparisonParagraph) {
    contentSnippet = comparisonParagraph.length > 120
      ? comparisonParagraph.substring(0, 120) + '...'
      : comparisonParagraph;
  }

  return {
    name: 'Comparison Context',
    score: Math.max(0, score),
    issues,
    suggestions,
    contentSnippet: contentSnippet || undefined,
    intentGaps,
  };
}

/**
 * 用户高频意图缺口分析（Prompt Intent Gap Analysis）
 * 1. 预测（Predict User Prompts）：基于产品品类，预测用户买前最常询问 AI 的对话式 Prompt
 * 2. 缺口比对（Content Gap Identification）：检查页面文本能否直接回答上述 Prompt
 * 3. 输出：缺失问题点 + 高频 User Prompt + 建议补齐文案（可直接复制）
 */
function generateIntentGaps(page: ParsedPage): IntentGap[] {
  const gaps: IntentGap[] = [];
  const rawText = page.textContent;
  const text = rawText.toLowerCase();
  const title = page.title || '';

  // 提取产品名：优先 title（去掉站点后缀和分隔符后的部分）
  let productName = title.replace(/[|\-–—_·].*$/, '').trim() || '本产品';

  // ===== 意图 1：场景/人群适配（买前决策最高频）=====
  // 预测 Prompt 与检测关键词成对出现；页面未覆盖则标记为意图缺口
  const audienceChecks: {
    keywords: RegExp;
    prompt: RegExp | null;
    topic: string;
    promptText: (n: string) => string;
    suggestion: (n: string) => string;
  }[] = [
    {
      keywords: /眼镜|镜腿|压迫/,
      prompt: null,
      topic: '缺少【戴眼镜/眼镜腿干涉】场景的适配说明',
      promptText: (n) => `戴眼镜的人适合戴${n}吗？会不会卡到眼镜腿？`,
      suggestion: (n) =>
        `采用避开耳后眼镜腿触点的弧形设计，佩戴时镜腿无额外压迫感，戴眼镜用户可长时间舒适使用。`,
    },
    {
      keywords: /运动|跑步|健身|汗水|防水|防汗/,
      prompt: null,
      topic: '缺少【运动/汗水场景】的适用性说明',
      promptText: (n) => `${n}适合运动、跑步时使用吗？出汗会不会影响？`,
      suggestion: (n) =>
        `${n}具备运动场景适配能力：佩戴稳固不易脱落，防汗防泼溅设计满足跑步、健身等场景需求。`,
    },
    {
      keywords: /儿童|老人|学生|小头围|耳道|入门|新手/,
      prompt: null,
      topic: '缺少【目标人群/避坑】适配说明',
      promptText: (n) => `${n}适合哪些人群？老人小孩用起来方便吗？`,
      suggestion: (n) =>
        `${n}适合关注核心功能、追求便携易用的用户：操作简单无需复杂设置，初次使用也能快速上手。`,
    },
  ];

  for (const check of audienceChecks) {
    if (gaps.length >= 3) break;
    // 页面完全没有相关关键词 → 缺失意图
    if (!check.keywords.test(rawText) && !check.keywords.test(title)) {
      gaps.push({
        topic: check.topic,
        status: 'missing',
        pageStatus: '扫描全文，未提取到与该场景相关的任何描述，AI 无法回答此类买前提问。',
        userPrompt: check.promptText(productName),
        suggestion: check.suggestion(productName),
        suggestionLabel: '在产品描述模块新增段落',
      });
    }
  }

  // ===== 意图 2：代际/同级对比（选购决策核心）=====
  const hasGenCompare =
    /vs\.?|versus|对比|相比|比较|升级|上一代|前代|区别|提升/.test(text) ||
    page.tables.some((t) => /对比|比较|参数|spec|compare|vs/i.test(t));
  if (!hasGenCompare) {
    gaps.push({
      topic: '缺少与【上一代/同级产品】的参数结构化对比',
      status: 'unstructured',
      pageStatus: '仅有单品卖点描述，未提供与前代产品或主流竞品的对比逻辑，AI 无法生成"值不值得升级"类回答。',
      userPrompt: `${productName}和上一代相比提升了什么？值得升级吗？`,
      suggestion: `建议新增一个 2×3 的 HTML 表格（对比核心参数：如续航、芯片、音质等级），并在表格上方加上 H3 标题："与上一代产品对比：核心提升点"，逐项列出数值变化，便于 AI 直接提取结构化数据。`,
      suggestionLabel: '新增对比表格 + H3 标题',
    });
  }

  // ===== 意图 3：同类替代品对比（横评意图）=====
  const hasAltCompare =
    /替代|同类|同级|竞品|同价位| alternatives |recommend/i.test(text) ||
    page.tables.length > 0;
  if (!hasAltCompare && gaps.length < 3) {
    gaps.push({
      topic: '缺少【同价位/同类替代品】的横向对比说明',
      status: 'missing',
      pageStatus: '页面未提及任何同类替代品或同价位横评信息，AI 在"它和 Y 有什么区别"类提问时无法引用本页面。',
      userPrompt: `${productName}和同价位其他产品相比有什么区别？`,
      suggestion: `新增段落"与同价位产品对比"：列出 2-3 个具体差异维度（如佩戴方式、续航、特色功能），每项给出本产品的具体数值或能力，并说明适合哪类需求的用户选择。`,
      suggestionLabel: '新增横向对比段落',
    });
  }

  // 最多输出 3 个意图缺口
  return gaps.slice(0, 3);
}

function analyzeEvidenceTrust(
  page: ParsedPage
): DimensionScore {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  const text = page.textContent.toLowerCase();

  // Check for social proof
  const hasSocialProof =
    text.includes('review') ||
    text.includes('评价') ||
    text.includes('testimonial') ||
    text.includes('客户') ||
    text.includes('customer') ||
    text.includes('用户反馈');

  if (!hasSocialProof) {
    issues.push('缺少社会证明（用户评价、案例研究等）');
    suggestions.push('添加用户评价、客户案例或第三方评测引用');
    score -= 20;
  }

  // Check for authority signals
  const hasAuthority =
    text.includes('research') ||
    text.includes('研究') ||
    text.includes('study') ||
    text.includes('report') ||
    text.includes('报告') ||
    text.includes('official') ||
    text.includes('官方');

  if (!hasAuthority) {
    issues.push('缺少权威性引用或数据来源');
    suggestions.push('引用权威研究、行业报告或官方数据');
    score -= 15;
  }

  // Check for external links to authoritative sources
  const externalLinks = page.links.filter((l) => l.isExternal);
  const hasAuthoritativeLinks = externalLinks.some(
    (l) =>
      l.href.includes('.gov') ||
      l.href.includes('.edu') ||
      l.href.includes('wikipedia') ||
      l.href.includes('github')
  );

  if (!hasAuthoritativeLinks && externalLinks.length < 2) {
    issues.push('缺少指向权威来源的外部链接');
    suggestions.push('引用权威外部资源（官方文档、研究机构等）');
    score -= 15;
  }

  // Check for contact/about info
  const hasContact =
    text.includes('contact') ||
    text.includes('联系') ||
    text.includes('about') ||
    text.includes('关于');

  if (!hasContact) {
    issues.push('缺少联系/关于信息');
    suggestions.push('添加联系方式和关于信息，增强网站可信度');
    score -= 10;
  }

  // Check for privacy/terms
  const hasLegal =
    page.html.includes('privacy') ||
    page.html.includes('隐私') ||
    page.html.includes('terms') ||
    page.html.includes('条款');

  if (!hasLegal) {
    issues.push('缺少隐私政策/服务条款链接');
    suggestions.push('添加隐私政策和服务条款页面链接');
    score -= 10;
  }

  if (issues.length === 0) {
    suggestions.push('证据与信任信号完善');
  }

  // Extract content snippet - find a paragraph with trust signals
  let contentSnippet = '';
  const trustParagraph = page.paragraphs.find(
    (p) =>
      p.toLowerCase().includes('review') ||
      p.toLowerCase().includes('评价') ||
      p.toLowerCase().includes('customer') ||
      p.toLowerCase().includes('客户') ||
      p.toLowerCase().includes('award') ||
      p.toLowerCase().includes('认证')
  );
  if (trustParagraph) {
    contentSnippet = trustParagraph.length > 120
      ? trustParagraph.substring(0, 120) + '...'
      : trustParagraph;
  }

  return {
    name: 'Evidence & Trust',
    score: Math.max(0, score),
    issues,
    suggestions,
    contentSnippet: contentSnippet || undefined,
  };
}

function generateCodeSuggestions(
  page: ParsedPage,
  technicalResult: CategoryResult,
  contentResult: CategoryResult
): { technical: CodeSuggestion[]; content: CodeSuggestion[] } {
  const technical: CodeSuggestion[] = [];
  const content: CodeSuggestion[] = [];

  // Technical code suggestions
  const crawlability = technicalResult.dimensions.find(
    (d) => d.name === 'Crawlability'
  );
  if (crawlability && crawlability.score < 80) {
    if (!page.canonicalUrl) {
      technical.push({
        type: 'add',
        title: '添加 Canonical URL',
        description: '在 <head> 中添加 canonical 标签，避免重复内容问题',
        optimizedCode: `<head>
  <!-- 添加 canonical URL -->
  <link rel="canonical" href="${page.url}" />
</head>`,
        language: 'html',
      });
    }

    if (!page.lang) {
      technical.push({
        type: 'fix',
        title: '添加 HTML lang 属性',
        description: '在 html 标签中添加语言属性',
        originalCode: `<html>`,
        optimizedCode: `<html lang="zh-CN">`,
        language: 'html',
      });
    }
  }

  const semantic = technicalResult.dimensions.find(
    (d) => d.name === 'Semantic Structure'
  );
  if (semantic && semantic.score < 80) {
    const missingTags: string[] = [];
    if (!/<main[\s>]/i.test(page.html)) missingTags.push('main');
    if (!/<article[\s>]/i.test(page.html)) missingTags.push('article');
    if (!/<section[\s>]/i.test(page.html)) missingTags.push('section');

    if (missingTags.length > 0) {
      technical.push({
        type: 'optimize',
        title: '使用语义化 HTML5 标签',
        description: `添加缺失的语义化标签: ${missingTags.join(', ')}`,
        optimizedCode: `<body>
  <header>
    <nav>...</nav>
  </header>
  <main>
    <article>
      <section>
        <h2>章节标题</h2>
        <p>内容段落...</p>
      </section>
    </article>
    <aside>
      <h3>相关内容</h3>
    </aside>
  </main>
  <footer>...</footer>
</body>`,
        language: 'html',
      });
    }
  }

  const entitySchema = technicalResult.dimensions.find(
    (d) => d.name === 'Entity & Schema'
  );
  if (entitySchema && entitySchema.score < 70) {
    technical.push({
      type: 'add',
      title: '添加 JSON-LD Schema 标记',
      description: '添加结构化数据帮助 AI 引擎理解页面内容',
      optimizedCode: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "${page.title || '页面标题'}",
  "description": "${page.metaDescription || '页面描述'}",
  "url": "${page.url}",
  "publisher": {
    "@type": "Organization",
    "name": "组织名称",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.png"
    }
  }
}
</script>`,
      language: 'html',
    });

    if (page.faqContent.length === 0) {
      technical.push({
        type: 'add',
        title: '添加 FAQ Schema',
        description: '如果页面有问答内容，使用 FAQPage Schema 标记',
        optimizedCode: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "你的问题是什么？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "这里是详细的回答内容。"
      }
    },
    {
      "@type": "Question",
      "name": "第二个常见问题？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "对应的回答内容。"
      }
    }
  ]
}
</script>`,
        language: 'html',
      });
    }
  }

  const metadata = technicalResult.dimensions.find(
    (d) => d.name === 'Metadata & AI Signals'
  );
  if (metadata && metadata.score < 80) {
    if (!page.metaDescription) {
      technical.push({
        type: 'add',
        title: '添加 Meta Description',
        description: '编写精准的 meta description，包含核心关键词',
        optimizedCode: `<head>
  <meta name="description" content="在这里编写150-160字符的页面描述，包含核心关键词和主要价值主张，吸引用户点击。" />
  
  <!-- Open Graph 标签 -->
  <meta property="og:title" content="${page.title || '页面标题'}" />
  <meta property="og:description" content="社交分享时的描述内容" />
  <meta property="og:image" content="https://example.com/og-image.jpg" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${page.url}" />
</head>`,
        language: 'html',
      });
    }

    technical.push({
      type: 'add',
      title: '添加面向 AI 的优化标签',
      description: '添加 llms.txt 和 AI 摘要相关的 meta 标签',
      optimizedCode: `<head>
  <!-- AI 友好的元数据 -->
  <meta name="ai:purpose" content="描述页面的核心用途" />
  <meta name="ai:topic" content="页面的主要主题" />
  <meta name="ai:audience" content="目标受众描述" />
  
  <!-- 链接到 llms.txt -->
  <link rel="llms" href="/llms.txt" />
</head>`,
      language: 'html',
    });
  }

  const accessibility = technicalResult.dimensions.find(
    (d) => d.name === 'Content Accessibility'
  );
  if (accessibility && accessibility.score < 80) {
    const imagesWithoutAlt = page.images.filter((img) => !img.alt);
    if (imagesWithoutAlt.length > 0) {
      technical.push({
        type: 'fix',
        title: '为图片添加 alt 属性',
        description: `${imagesWithoutAlt.length} 张图片缺少 alt 属性`,
        originalCode: imagesWithoutAlt
          .slice(0, 2)
          .map((img) => `<img src="${img.src}" />`)
          .join('\n'),
        optimizedCode: imagesWithoutAlt
          .slice(0, 2)
          .map(
            (img) =>
              `<img src="${img.src}" alt="描述图片内容的文字" />`
          )
          .join('\n'),
        language: 'html',
      });
    }
  }

  // Content code suggestions
  const productFacts = contentResult.dimensions.find(
    (d) => d.name === 'Product Facts'
  );
  if (productFacts && productFacts.score < 70) {
    content.push({
      type: 'add',
      title: '添加产品规格表格',
      description: '使用 HTML 表格呈现产品规格，便于 AI 提取结构化数据',
      optimizedCode: `<section>
  <h2>产品规格</h2>
  <table>
    <thead>
      <tr>
        <th>参数</th>
        <th>规格</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>核心参数1</td>
        <td>具体数值</td>
      </tr>
      <tr>
        <td>核心参数2</td>
        <td>具体数值</td>
      </tr>
    </tbody>
  </table>
</section>`,
      language: 'html',
    });
  }

  const featureExp = contentResult.dimensions.find(
    (d) => d.name === 'Feature Explainability'
  );
  if (featureExp && featureExp.score < 70) {
    content.push({
      type: 'add',
      title: '添加 How-to 结构化内容',
      description: '使用有序列表和 HowTo Schema 提供功能使用指南',
      optimizedCode: `<article>
  <h2>如何使用 [产品名]</h2>
  <ol>
    <li>
      <h3>第一步：准备工作</h3>
      <p>详细说明准备工作...</p>
    </li>
    <li>
      <h3>第二步：核心操作</h3>
      <p>详细说明操作步骤...</p>
    </li>
    <li>
      <h3>第三步：验证结果</h3>
      <p>详细说明验证方法...</p>
    </li>
  </ol>
</article>

<!-- HowTo Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "如何使用[产品名]",
  "step": [
    {
      "@type": "HowToStep",
      "name": "准备工作",
      "text": "详细说明..."
    }
  ]
}
</script>`,
      language: 'html',
    });
  }

  const userIntent = contentResult.dimensions.find(
    (d) => d.name === 'User Intent / Q&A'
  );
  if (userIntent && userIntent.score < 70) {
    content.push({
      type: 'add',
      title: '添加 FAQ 问答模块',
      description: '添加常见问题解答，覆盖用户搜索意图',
      optimizedCode: `<section>
  <h2>常见问题</h2>
  
  <div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <h3 itemprop="name">什么是[产品名]？</h3>
    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">
        [产品名]是一款...，它可以帮助用户...
      </p>
    </div>
  </div>

  <div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <h3 itemprop="name">如何使用[产品名]？</h3>
    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">
        使用[产品名]非常简单，只需三步...
      </p>
    </div>
  </div>

  <div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <h3 itemprop="name">[产品名]的价格是多少？</h3>
    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">
        [产品名]提供多种定价方案...
      </p>
    </div>
  </div>
</section>`,
      language: 'html',
    });
  }

  const useCases = contentResult.dimensions.find(
    (d) => d.name === 'Use Cases'
  );
  if (useCases && useCases.score < 70) {
    content.push({
      type: 'add',
      title: '添加使用场景章节',
      description: '描述产品的典型使用场景和目标用户',
      optimizedCode: `<section>
  <h2>应用场景</h2>
  
  <div>
    <h3>场景一：[场景名称]</h3>
    <p><strong>适用人群：</strong>[描述目标用户]</p>
    <p><strong>痛点：</strong>[用户面临的问题]</p>
    <p><strong>解决方案：</strong>[产品如何解决]</p>
    <p><strong>效果：</strong>[量化结果]</p>
  </div>

  <div>
    <h3>场景二：[场景名称]</h3>
    <p><strong>适用人群：</strong>[描述目标用户]</p>
    <p><strong>痛点：</strong>[用户面临的问题]</p>
    <p><strong>解决方案：</strong>[产品如何解决]</p>
    <p><strong>效果：</strong>[量化结果]</p>
  </div>
</section>`,
      language: 'html',
    });
  }

  const comparison = contentResult.dimensions.find(
    (d) => d.name === 'Comparison Context'
  );
  if (comparison && comparison.score < 70) {
    content.push({
      type: 'add',
      title: '添加产品对比表格',
      description: '使用表格清晰呈现与竞品的对比',
      optimizedCode: `<section>
  <h2>产品对比</h2>
  <table>
    <thead>
      <tr>
        <th>功能特性</th>
        <th>[产品名]</th>
        <th>竞品A</th>
        <th>竞品B</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>核心功能1</td>
        <td>✅ 支持</td>
        <td>❌ 不支持</td>
        <td>⚠️ 部分支持</td>
      </tr>
      <tr>
        <td>核心功能2</td>
        <td>✅ 支持</td>
        <td>✅ 支持</td>
        <td>❌ 不支持</td>
      </tr>
      <tr>
        <td>价格</td>
        <td>¥XX/月</td>
        <td>¥XX/月</td>
        <td>¥XX/月</td>
      </tr>
    </tbody>
  </table>
  
  <h3>为什么选择[产品名]？</h3>
  <ul>
    <li><strong>独特优势1：</strong>详细说明...</li>
    <li><strong>独特优势2：</strong>详细说明...</li>
  </ul>
</section>`,
      language: 'html',
    });
  }

  const evidence = contentResult.dimensions.find(
    (d) => d.name === 'Evidence & Trust'
  );
  if (evidence && evidence.score < 70) {
    content.push({
      type: 'add',
      title: '添加信任信号模块',
      description: '增加用户评价、权威引用等信任信号',
      optimizedCode: `<section>
  <h2>客户评价</h2>
  <div itemscope itemtype="https://schema.org/Review">
    <blockquote>
      <p itemprop="reviewBody">"使用[产品名]后，我们的效率提升了XX%..."</p>
    </blockquote>
    <cite itemprop="author">— 用户名, 公司名</cite>
    <div itemprop="reviewRating" itemscope itemtype="https://schema.org/Rating">
      <meta itemprop="ratingValue" content="5" />
    </div>
  </div>
</section>

<section>
  <h2>数据与认证</h2>
  <ul>
    <li>📊 来自[权威机构]的研究显示...</li>
    <li>🏆 获得[行业认证/奖项]</li>
    <li>📈 已有 XX+ 企业客户信赖使用</li>
  </ul>
</section>`,
      language: 'html',
    });
  }

  return { technical, content };
}

export async function analyzeUrl(url: string): Promise<AnalysisResult> {
  // Fetch the page (use cache to avoid duplicate fetches when comparing)
  const page = await getParsedPage(url);

  // Analyze Technical GEO dimensions
  const technicalDimensions: DimensionScore[] = [
    analyzeCrawlability(page),
    analyzeContentAccessibility(page),
    analyzeSemanticStructure(page),
    analyzeEntitySchema(page),
    analyzeInternalContext(page),
    analyzeMetadataAISignals(page),
  ];

  const technicalOverall = Math.round(
    technicalDimensions.reduce((sum, d) => sum + d.score, 0) /
      technicalDimensions.length
  );

  // Analyze Content GEO dimensions
  const contentDimensions: DimensionScore[] = [
    analyzeProductFacts(page),
    analyzeFeatureExplainability(page),
    analyzeUserIntentQA(page),
    analyzeUseCases(page),
    analyzeComparisonContext(page),
    analyzeEvidenceTrust(page),
  ];

  const contentOverall = Math.round(
    contentDimensions.reduce((sum, d) => sum + d.score, 0) /
      contentDimensions.length
  );

  const technicalResult: CategoryResult = {
    dimensions: technicalDimensions,
    overallScore: technicalOverall,
    suggestions: [],
  };

  const contentResult: CategoryResult = {
    dimensions: contentDimensions,
    overallScore: contentOverall,
    suggestions: [],
  };

  // Generate code suggestions
  const codeSuggestions = generateCodeSuggestions(
    page,
    technicalResult,
    contentResult
  );
  technicalResult.suggestions = codeSuggestions.technical;
  contentResult.suggestions = codeSuggestions.content;

  return {
    url,
    title: page.title || url,
    technicalGEO: technicalResult,
    contentGEO: contentResult,
    analyzedAt: new Date().toISOString(),
  };
}

// ---------- 竞品内容对比分析 ----------

// 判断文本是否为"广告宣传词"风格（低信息量修饰词）
function isMarketingClaim(text: string): boolean {
  const claimPatterns = [
    /(超乎想象|卓越|极致|领先|臻|尊享|巅峰|非凡|出众|一流|顶级|殿堂级)/,
    /(高分辨率锐利|惊艳|令人叹为观止|焕然一新|尽享|畅享|智享|悦享)/,
    /(轻量化设计|时尚外观|美学设计|匠心)/,
  ];
  return claimPatterns.some((p) => p.test(text));
}

// 判断文本是否包含"场景 → 功能"链条（如"进入机场、火车站时，智能弹出提醒"）
function hasScenarioFunction(text: string): boolean {
  // 排除客服/售后/法律声明类噪音
  if (/(客服|咨询|疑问|保修|退换|隐私|条款|侵权|备案|关注我们|公众号|cookie|版权)/i.test(text)) return false;
  // 场景关键词 + 功能动词
  const scenarioWords = /(在.{2,12}(时|中|下)|进入|当.{2,10}(时|后)|出行|通勤|会议|旅行|驾驶|开车|高铁|机场|火车站|地铁|户外|夜晚|运动|办公|居家|通话|视频|游戏|拍照|观影|导航|骑行|跑步|马拉松|训练|健身|滑雪|潜水|游泳|徒步|爬山|钓鱼|睡眠)/;
  const functionWords = /(智能|自动|一键|即可|可以|支持|会|将|弹出|切换|启动|开启|连接|识别|提醒|建议|推荐|检测|监测|降噪|显示|播放|记录|定位|模式|体验|地图|摘要|计划|分析|管理)/;
  return scenarioWords.test(text) && functionWords.test(text);
}

// 判断文本是否含量化数据
function hasQuantData(text: string): boolean {
  // x 倍率仅认可明确变焦语境（如"10x 变焦"），避免"手表 5X"类产品型号误判；中文页面倍率多用"倍"
  return (
    /\d+(\.\d+)?\s*(%|小时|分钟|倍|帧|nit|尼特|Hz|万|亿|mm|cm|kg|g|mA|mAh|dB|lux)/i.test(text) ||
    /\d+x\s*(?:zoom|光学变焦|变焦)/i.test(text) ||
    /\d+\.\d+\s*(英寸|寸|km|m\b)/i.test(text)
  );
}

// 从段落列表中找出"场景化描述"例句（按信息密度排序，优先具体场景）
// 拆句规则：仅按句末标点拆分（不做空白拆分，避免破坏"数字 中文"混排的完整句子）
const splitSentences = (text: string): string[] =>
  text
    .split(/[。；;.!？?\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

// 页脚/导航等噪音关键词（\d{6,} 过滤客服热线/序列号类数字）
// 噪声过滤：页脚/菜单/免责声明/按钮文本，禁止作为分析例证
const FOOTER_NOISE = /(版权所有|关注我们|隐私政策|法律声明|免责声明|网站地图|联系我们|备案号|选择国家|分享到|\d{6,})/;
// 免责声明/按钮/CTA 文本：严禁作为 GEO 分析例证
const DISCLAIMER_NOISE = /(请以实际(体验|产品|情况)?为准|实际体验为准|仅供参考|可能有(所)?差异|略有差异|因.{0,12}(不同|差异)|更多(详情|信息)|查看更多|了解更多|立即(购买|抢购|注册|体验)|到货通知|加入购物车|马上(购买|抢购)|点击(购买|查看|这里)|前往(购买|商城)|在线(客服|咨询)|售(后|前)服务|预约(体验|试用)|找相似|相关推荐|为您推荐|猜你喜欢|热卖|爆款|新品(上市|首发)|限时(优惠|折扣)|即将(上市|发售)|敬请期待|以官网为准|最终解释权)/;
// 备注/脚注/技术注解类文本（*1 标注、可能性说明、条件限制说明）：不作为分析例证，对比仅针对正文产品描述
const FOOTNOTE_NOISE = /(^\s*[*＊]\s*\d|[*＊]\s*\d+\s*$|^注[:：]|^备注[:：]|^\(\d|^\（\d|可能会(产生|出现|造成|导致|有|受|影响|无法|被|带)|可能无法|可能存在|可能不|或(存在|有)差异|基于.{0,25}的(天性|特性|原理|机制|原因)|受.{0,20}(影响|限制|制约)|视.{0,15}(而定|而异|情况)|取决于|不适用于|仅(在|限).{0,12}(情况|条件|环境)|特殊(情况|设置|条件)|实际(使用|续航|表现|效果).{0,10}(因|视|会|可能))/;

function findScenarioTexts(paragraphs: string[]): string[] {
  const results: string[] = [];
  const seenNorm = new Set<string>();
  const concreteScene = /(机场|火车站|高铁|地铁|会议|驾驶|开车|跑步|健身|通勤|旅行|户外|夜晚|居家|办公室|咖啡馆|通话|视频会议|马拉松|滑雪|潜水|游泳|睡眠|训练|骑行)/;
  // 排除实验室测试条件/规格脚注类文本（如"常亮显示场景测试模型：出厂默认配置..."）
  const specFootnote = /(测试模型|出厂|默认配置|默认设置|实验室|手动关闭)/;
  const candidates: { text: string; score: number }[] = [];
  for (const raw of paragraphs) {
    const p = cleanText(raw) || raw;
    const sentences = splitSentences(p).filter((s) => s.length > 5);
    for (const s of sentences) {
      if (hasScenarioFunction(s) && s.length <= 80 && !FOOTER_NOISE.test(s) && !DISCLAIMER_NOISE.test(s) && !FOOTNOTE_NOISE.test(s) && !specFootnote.test(s)) {
        const normKey = s.replace(/\s+/g, '');
        if (seenNorm.has(normKey)) continue;
        seenNorm.add(normKey);
        // 具体场景词加分；信息密度高的短片段（如"户外探险模式"）加分
        const score =
          (concreteScene.test(s) ? 10 : 0) +
          (s.length <= 16 ? 5 : 0) +
          Math.max(0, 6 - Math.abs(s.length - 40) / 10);
        candidates.push({ text: s, score });
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  for (const c of candidates) {
    results.push(c.text);
    if (results.length >= 5) break;
  }
  return results;
}

// 从段落列表中找出"广告宣传词"例句
function findMarketingTexts(paragraphs: string[]): string[] {
  const results: string[] = [];
  for (const raw of paragraphs) {
    const p = cleanText(raw) || raw;
    const sentences = splitSentences(p).filter((s) => s.length > 6 && s.length <= 60);
    for (const s of sentences) {
      if (isMarketingClaim(s) && !FOOTER_NOISE.test(s) && !DISCLAIMER_NOISE.test(s) && !FOOTNOTE_NOISE.test(s)) {
        results.push(s);
        if (results.length >= 5) return results;
      }
    }
  }
  return results;
}

// 从段落列表中找出含量化数据的句子
function findQuantTexts(paragraphs: string[]): string[] {
  const results: string[] = [];
  // 按归一化文本去重（可见文本与内嵌 JSON 常有微小空格差异导致的重复）
  const norm = (t: string) => t.replace(/\s+/g, '');
  const seenNormalized = new Set<string>();
  const dedupPush = (s: string) => {
    const key = norm(s);
    if (!key || seenNormalized.has(key)) return;
    seenNormalized.add(key);
    results.push(s);
  };
  for (const raw of paragraphs) {
    const p = cleanText(raw) || raw;
    // 收集所有量化句子，优先完整长句（短碎片排后）
    const sentences = splitSentences(p).filter((s) => s.length > 8 && s.length <= 80);
    for (const s of sentences) {
      if (hasQuantData(s) && !FOOTER_NOISE.test(s) && !DISCLAIMER_NOISE.test(s) && !FOOTNOTE_NOISE.test(s)) {
        dedupPush(s);
      }
    }
  }
  // 长句优先（完整句 > 片段）
  return results.sort((a, b) => b.length - a.length).slice(0, 5);
}

// 从段落列表中找出"问题-解决方案"结构句子（痛点词 + 解决词）
function findProblemSolutionTexts(paragraphs: string[]): string[] {
  const results: string[] = [];
  const painWords = /(痛点|困扰|问题|难点|痛点|痛点|为了解决|针对|告别|不再|无需|难以|担心)/;
  const solutionWords = /(解决|方案|通过|使用|借助|只需|即可|一键|自动)/;
  for (const raw of paragraphs) {
    const p = cleanText(raw) || raw;
    const sentences = splitSentences(p).filter((s) => s.length > 10 && s.length <= 80);
    for (const s of sentences) {
      if (painWords.test(s) && solutionWords.test(s) && !FOOTER_NOISE.test(s) && !DISCLAIMER_NOISE.test(s) && !FOOTNOTE_NOISE.test(s)) {
        results.push(s);
        if (results.length >= 3) return results;
      }
    }
  }
  return results;
}

function quoteList(texts: string[], max: number = 2): string {
  return texts.slice(0, max).map((t) => `"${t}"`).join('、');
}

/**
 * 清洗提取文本：解码 HTML 实体、过滤 URL/CSS/属性噪音。
 */
function cleanText(text: string): string {
  // 解码常见 HTML 实体
  const decoded = text
    .replace(/&#34;|&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // 过滤噪音：URL 片段、CSS 属性、残留属性值、纯数字/符号
  if (
    /\/{2,}|https?:|\.html?|\.css|\.js\b/.test(decoded) ||
    /(width|height|margin|padding|border|font|color|background|position|display|flex|opacity|transform)\s*:/.test(decoded) ||
    /^(jpg|png|gif|webp|svg|jpeg)/i.test(decoded) ||
    /^[\d\s.,%\-+/\\|:：#*()（）「」【】\[\]]+$/.test(decoded)
  ) {
    return '';
  }
  return decoded;
}

/**
 * 汇总页面上可用于内容对比的全部文本来源：
 * 段落 + 列表项 + 表格单元格文本（specs 页面内容多在表格中）+ 标题 + 脚本 JSON 数据（JS 渲染型页面的内容载体）
 */
function collectContentTexts(page: ParsedPage): string[] {
  const texts: string[] = [];
  const push = (t: string) => {
    const cleaned = cleanText(t);
    if (cleaned.length > 10) texts.push(cleaned);
  };
  for (const p of page.paragraphs) push(p);
  for (const li of page.lists) push(li);
  // 从表格 HTML 中提取单元格文本
  for (const tableHtml of page.tables) {
    const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(tableHtml)) !== null) {
      const cellText = cellMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (cellText.length > 10) push(cellText);
    }
  }
  // 标题也纳入（H2/H3 常含场景化卖点句）
  for (const h of page.headings) {
    if (h.text && h.text.length > 10) push(h.text);
  }
  // 提取 HTML 内嵌 JSON 数据中的中文内容：
  // JS 渲染型官网的内容常以转义 JSON 形式存放在 <script> 或 body 的 data 属性中（如华为官网）。
  // 策略 A：直接从原始 HTML 的属性值（data-xxx="..."）中提取 JSON 中文，避免实体解码破坏标签边界
  {
    const seen = new Set(texts);
    const addText = (val: string) => {
      const cleaned = cleanText(val);
      if (!cleaned || !/[\u4e00-\u9fa5]/.test(cleaned)) return;
      // 片段阈值较低：JSON 内的场景/卖点短语常只有 5~10 字（如"户外探险模式"）
      if (cleaned.length >= 5 && cleaned.length < 400 && !seen.has(cleaned)) {
        seen.add(cleaned);
        texts.push(cleaned);
      }
    };
    const extractFromDecoded = (source: string) => {
      const strRegex = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g;
      let strMatch;
      while ((strMatch = strRegex.exec(source)) !== null) {
        let val = strMatch[1] ?? strMatch[2] ?? '';
        if (!val || !/[\u4e00-\u9fa5]/.test(val)) continue;
        val = val
          .replace(/\\n|\\r|\\t/g, '。')
          .replace(/<br\s*\/?>/gi, '。')
          .replace(/<[^>]+>/g, ' ')
          .replace(/<[^>]*$/, ' ')
          .replace(/</g, ' ')
          .replace(/\\u([\dA-Fa-f]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
          .replace(/\\"/g, '"');
        if (/\/{2,}|https?:|\.svg|\.png|\.jpg|\.js\b|\.css/.test(val)) continue;
        // 空格分隔的 JSON 短语需切分为独立片段（如"户外探险模式 进阶骑行体验"）
        for (const frag of val.split(/[。\s]+/)) {
          const f = frag.trim();
          if (f.length >= 5) addText(f);
          else if (/[\u4e00-\u9fa5]/.test(f) && f.length >= 4) addText(f);
        }
        addText(val.replace(/[。\s]+/g, '。'));
        if (texts.length > 800) return;
      }
    };
    // A1: 原始 HTML 中的属性值（tag 边界未被实体解码破坏）
    const attrRegex = /[\w-]+\s*=\s*"([^"]*)"|[\w-]+\s*=\s*'([^']*)'/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(page.html)) !== null) {
      let attrVal = attrMatch[1] ?? attrMatch[2] ?? '';
      if (!attrVal || !/[\u4e00-\u9fa5]/.test(attrVal)) continue;
      // 在属性值内部解码实体与双层转义
      let decodedVal = attrVal
        .replace(/&#34;|&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
      for (let i = 0; i < 3 && /\\["n]/.test(decodedVal); i++) {
        decodedVal = decodedVal.replace(/\\(["\\/])/g, '$1').replace(/\\n/g, '。');
      }
      extractFromDecoded(decodedVal);
      if (texts.length > 800) break;
    }
    if (texts.length <= 800) {
      // A2: <script> 块内的 JSON 字符串
      const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
      let scriptMatch;
      while ((scriptMatch = scriptRegex.exec(page.html)) !== null) {
        const rawScript = scriptMatch[1];
        if (!rawScript || rawScript.length < 100) continue;
        let decodedScript = rawScript
          .replace(/&#34;|&quot;/g, '"')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&');
        for (let i = 0; i < 3 && /\\["n]/.test(decodedScript); i++) {
          decodedScript = decodedScript.replace(/\\(["\\/])/g, '$1').replace(/\\n/g, '。');
        }
        extractFromDecoded(decodedScript);
        if (texts.length > 800) break;
      }
    }
    if (texts.length <= 800) {
      // A3: 兜底 —— 全文实体解码后按句段提取（覆盖无引号包裹的正文 JSON）
      let decodedHtml = page.html
        .replace(/&#34;|&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
      for (let i = 0; i < 3 && /\\["n]/.test(decodedHtml); i++) {
        decodedHtml = decodedHtml.replace(/\\(["\\/])/g, '$1').replace(/\\n/g, '。');
      }
      const bodyOnly = decodedHtml.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
      const flat = bodyOnly
        .replace(/<(?:sup|sub)[^>]*>[^<]{0,30}<\/(?:sup|sub)>/gi, '')
        .replace(/<br\s*\/?>/gi, '。')
        .replace(/<(?![a-zA-Z\/!])/g, '\u0001') // 保护非标签开头的孤立 <，防止标签正则大段误吞
        .replace(/<[^>]+>/g, ' ')
        .replace(/\u0001/g, '<')
        .replace(/\\u([\dA-Fa-f]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
      const plainText = flat.replace(/["'{}\[\]\\|,;]+/g, '。').replace(/\s+/g, ' ');
      for (const seg of plainText.split('。')) {
        const s = seg.trim();
        if (s.length >= 5 && s.length < 400 && /[\u4e00-\u9fa5]/.test(s) && !/\/{2,}|https?:|\.(svg|png|jpg|js|css)\b/i.test(s) && !seen.has(s)) {
          seen.add(s);
          texts.push(s);
        }
        if (texts.length > 800) break;
      }
    }
  }
  return texts;
}

/**
 * 对比主站与竞品页面，生成具体的竞品参考分析点。
 * 只生成有实际内容依据的对比点，避免空洞结论。
 */
// 从营销词生成改写示范（规则模板：场景 + 功能 + 可验证效果）
function buildScenarioRewrite(productName: string, marketingClaims: string[], compSample?: string): string {
  const scenes = ['通勤地铁上', '差旅高铁/机场候机时', '开放式办公室里', '周末户外徒步中'];
  const scene = scenes[Math.min(marketingClaims.length, scenes.length - 1)];
  const core = marketingClaims[0]?.replace(/[【】""''（）()、，。！!？? ]+/g, ' ').trim().slice(0, 20) || '核心功能';
  return `改写示例："${scene}，${productName}自动开启${core}，无需手动调节；嘈杂环境中的通话与人声依然清晰，适合每天需要${scene.includes('通勤') ? '长距离通勤' : '移动办公'}的用户。"` +
    (compSample ? `\n（参考竞品句式：将功能绑定到"谁 + 在哪 + 做什么 + 效果"，AI 可直接摘录为推荐理由。）` : '');
}

function buildQuantRewrite(productName: string, compQuant: string[]): string {
  const numMatch = compQuant[0]?.match(/[\d.]+\s*(?:小时|分钟|km|dB|英寸|Hz|mAh|W\b|%)/);
  return `改写示例："${productName}官方标称${numMatch ? `关键指标达到 ${numMatch[0]}` : '核心参数均给出具体数值'}（注明测试条件：如 XX 音量、XX 模式），续航/性能数据可直接被 AI 引用。规则：每个卖点至少配 1 个数字 + 1 个测试条件，删除'超长续航''极致轻巧'类无量词表述。"`;
}

function buildPSRewrite(productName: string): string {
  return `改写示例："经常在嘈杂环境中漏听提示音？${productName}针对该痛点提供两步方案：1) 开启环境声自适应，实时监测周围噪音；2) 在 App 中一键切换通透模式。全程无需摘下设备。"`;
}

function buildFaqRewrite(productName: string): string {
  return `改写示例（配 FAQPage Schema）："Q：${productName}适合戴多久？A：单次连续佩戴约 6 小时无压迫感，耳压经实验室测试低于行业均值；建议每 2 小时休息 5 分钟。"`;
}

function buildStepsRewrite(productName: string): string {
  return `改写示例："${productName}三步完成配对：1) 长按电源键 2 秒进入配对模式（指示灯快闪）；2) 手机蓝牙列表选择设备名称；3) 语音提示'已连接'即完成。首次配对约需 10 秒。"`;
}

export function generateComparisonPoints(
  main: ParsedPage,
  competitor: ParsedPage
): ComparisonPoint[] {
  const points: ComparisonPoint[] = [];
  const compName = competitor.title
    ? competitor.title.replace(/[|\-–—_].*$/, '').trim().slice(0, 30)
    : '竞品';
  const productName = main.title
    ? main.title.replace(/[|\-–—_].*$/, '').trim().slice(0, 30) || '产品'
    : '产品';

  // 全局引文登记表：同一句原文只允许在一个维度中出现，避免多个维度重复引用
  const usedQuotes = new Set<string>();
  const normQuote = (t: string) => t.replace(/\s+/g, '');
  /** 从候选中取前 max 条未被使用过的原文，并登记占用 */
  const pickFresh = (texts: string[], max: number): string[] => {
    const picked: string[] = [];
    for (const t of texts) {
      const key = normQuote(t);
      if (!key || usedQuotes.has(key)) continue;
      usedQuotes.add(key);
      picked.push(t);
      if (picked.length >= max) break;
    }
    return picked;
  };
  /** 取未被使用的原文拼成引文串；无可用原文时返回 undefined */
  const freshQuoteList = (texts: string[], max = 3): string | undefined => {
    const picked = pickFresh(texts, max);
    return picked.length > 0 ? picked.map((t) => `"${t}"`).join('、') : undefined;
  };

  // 汇总双方全部文本来源（段落+列表+表格+标题）
  const mainTexts = collectContentTexts(main);
  const compTexts = collectContentTexts(competitor);

  // ---- 1. 场景化描述（场景/任务 → 功能响应） ----
  const compScenarios = findScenarioTexts(compTexts);
  const mainScenarios = findScenarioTexts(mainTexts);
  const mainMarketing = findMarketingTexts(mainTexts);

  if (compScenarios.length > 0 && (mainScenarios.length < compScenarios.length || mainMarketing.length > 0)) {
    points.push({
      topic: '诊断维度：场景化表达缺失（缺乏"场景/痛点 → 功能响应"叙事）',
      rationale:
        'GEO 极其偏好"场景/痛点 → 解决方案 → 操作步骤"的文本结构：AI 能直接识别【场景/任务】→【功能响应】链条，用于回答"在 X 场景下应该怎么办"类提问。',
      competitorText: freshQuoteList(compScenarios, 3),
      competitorAnalysis:
        `该文案将功能绑定到具体使用场景（谁 + 在哪 + 做什么 + 效果），AI 可直接提取"场景 → 功能"链条，在用户询问相关场景时优先引用${compName}的回答。`,
      mainText:
        mainMarketing.length > 0
          ? freshQuoteList(mainMarketing, 3)
          : freshQuoteList(mainScenarios, 3),
      mainAnalysis:
        mainMarketing.length > 0
          ? '主站文本多为广告宣传词（Marketing Claims）。在 AI 的语义分析中，这类修饰词属于低信息量的无意图文本，不会被判定为有效场景。'
          : '主站缺少"场景 + 功能"的绑定描述，AI 难以将其匹配到具体使用场景的提问。',
      rewrite: buildScenarioRewrite(productName, mainMarketing, compScenarios[0]),
    });
  }

  // ---- 2. 量化数据 ----
  const compQuant = findQuantTexts(compTexts);
  const mainQuant = findQuantTexts(mainTexts);

  if (compQuant.length > 0 && mainQuant.length < compQuant.length) {
    points.push({
      topic: '诊断维度：技术原理与参数未对齐（量化数据不足，事实密度低于竞品）',
      rationale:
        'AI 生成回答时优先引用带具体数值的可验证事实（续航时长、峰值亮度、降噪深度）。无数字的形容词描述被视为不可验证信息，引用权重极低。',
      competitorText: freshQuoteList(compQuant, 3),
      competitorAnalysis:
        '对方使用具体数值 + 测试条件描述产品表现，属于"可验证事实"，AI 直接摘录进回答的概率显著更高。',
      mainText: mainQuant.length > 0 ? freshQuoteList(mainQuant, 3) : undefined,
      mainAnalysis:
        mainQuant.length > 0
          ? '主站虽有部分数据，但量化密度明显低于竞品，AI 引用时信息量不足。'
          : '主站缺少量化数据，功能描述依赖形容词，AI 难以将其作为事实依据引用。',
      rewrite: buildQuantRewrite(productName, compQuant),
    });
  }

  // ---- 3. 问题-解决方案结构 ----
  const compPS = findProblemSolutionTexts(compTexts);
  const mainPS = findProblemSolutionTexts(mainTexts);

  if (compPS.length > 0 && mainPS.length === 0) {
    points.push({
      topic: '诊断维度：缺乏"问题-解决方案（Problem-Solving）"结构化叙事',
      rationale:
        'GEO 偏好"痛点 → 解决方案 → 操作步骤"结构。AI 在回答"如何解决 X 问题"类提问时，优先检索带痛点关键词的内容。',
      competitorText: freshQuoteList(compPS, 2),
      competitorAnalysis:
        '对方文本明确写出用户痛点并给出对应解决方案，AI 可直接将其组织为"问题 → 方案"的答案片段。',
      mainAnalysis:
        '主站内容以功能罗列为主，未覆盖用户痛点表述，在"怎么办/如何解决"类提问中几乎不会被命中。',
      rewrite: buildPSRewrite(productName),
    });
  }

  // ---- 4. 广告词 vs 客观描述（仅当还有未被引用的宣传词与场景原文时） ----
  const freshMarketing = pickFresh(mainMarketing, 3);
  const freshCompScenario = pickFresh(compScenarios, 1)[0];
  if (mainMarketing.length >= 2 && freshMarketing.length > 0 && freshCompScenario) {
    points.push({
      topic: '诊断维度：宣传语式文案削弱 AI 可引用性',
      rationale:
        'AI 语义分析会将"超乎想象""极致体验"类修饰词标记为低信息量主观文本（Subjective Claims），不会出现在 AI 生成的推荐理由中。',
      competitorText: `"${freshCompScenario}"`,
      competitorAnalysis:
        '同样在讲产品优势，对方用"可感知的具体行为描述"而非情绪化修饰，AI 可以原样摘录为推荐依据。',
      mainText: freshMarketing.map((t) => `"${t}"`).join('、'),
      mainAnalysis:
        '主站大量使用情绪化修饰词堆砌卖点，属于低熵文本；AI 无法从"轻盈""稳固"中提取可验证的场景证据。',
      rewrite: buildScenarioRewrite(productName, freshMarketing, freshCompScenario),
    });
  }

  // ---- 5. FAQ / 问答结构 ----
  if (competitor.faqContent.length > 0 && main.faqContent.length === 0) {
    points.push({
      topic: '诊断维度：缺少 FAQ 问答结构，错失 AI 直接引用入口',
      rationale:
        'FAQ（配合 FAQPage Schema）是 AI 引擎最高优先级的引用来源之一，带 Schema 的问答内容引用权重远高于普通段落。',
      competitorText: `"${competitor.faqContent[0].question}" → "${competitor.faqContent[0].answer.slice(0, 60)}..."`,
      competitorAnalysis:
        '对方以"用户原话提问 + 结构化回答"组织内容，AI 可直接摘取整组问答作为回答素材。',
      mainAnalysis:
        '主站没有 FAQ 结构，用户高频问题只能从长段落中自行推断，AI 提取成本高、命中概率低。',
      rewrite: buildFaqRewrite(productName),
    });
  }

  // ---- 6. 步骤化说明 ----
  const compStepCount = competitor.lists.length;
  const mainStepCount = main.lists.length;
  if (compStepCount > mainStepCount * 2 && compStepCount >= 4) {
    points.push({
      topic: '诊断维度：步骤化/结构化内容不足',
      rationale:
        'AI 偏好以有序列表（步骤 1/2/3）组织操作类内容，列表结构让 AI 能按条摘录，形成"步骤型答案"。',
      competitorAnalysis: `对方页面包含 ${compStepCount} 组列表结构，操作说明被组织为可逐条引用的步骤链。`,
      mainAnalysis: `主站仅有 ${mainStepCount} 组列表，操作说明以长段落呈现，AI 提取步骤时需自行切分，容易丢失关键细节。`,
      rewrite: buildStepsRewrite(productName),
    });
  }

  // 按实际命中的顺序重新编号（未命中的维度不占号，保证"诊断维度 1/2/3..."连续）
  return points.map((p, i) => ({
    ...p,
    topic: p.topic.replace(/^诊断维度：/, `诊断维度 ${i + 1}：`),
  }));
}

// 简单内存缓存，避免同一页面被重复抓取解析
const pageCache = new Map<string, { page: ParsedPage; ts: number }>();
const PAGE_CACHE_TTL = 5 * 60 * 1000; // 5 分钟

async function getParsedPage(url: string): Promise<ParsedPage> {
  const cached = pageCache.get(url);
  if (cached && Date.now() - cached.ts < PAGE_CACHE_TTL) {
    return cached.page;
  }
  const html = await fetchPage(url);
  const page = parseHTML(html, url);
  pageCache.set(url, { page, ts: Date.now() });
  // 简单清理过期缓存
  if (pageCache.size > 20) {
    const now = Date.now();
    for (const [k, v] of pageCache) {
      if (now - v.ts > PAGE_CACHE_TTL) pageCache.delete(k);
    }
  }
  return page;
}

/**
 * 对比主站与多个竞品，返回每个竞品 URL 对应的具体对比分析点。
 */
export async function compareWithCompetitors(
  mainUrl: string,
  compareUrls: string[]
): Promise<Record<string, ComparisonPoint[]>> {
  const mainPage = await getParsedPage(mainUrl);
  const results: Record<string, ComparisonPoint[]> = {};

  await Promise.all(
    compareUrls.map(async (url) => {
      try {
        const compPage = await getParsedPage(url);
        results[url] = generateComparisonPoints(mainPage, compPage);
      } catch {
        results[url] = [];
      }
    })
  );

  return results;
}
