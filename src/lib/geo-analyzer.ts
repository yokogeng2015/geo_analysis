import type {
  AnalysisResult,
  CategoryResult,
  CodeSuggestion,
  DimensionScore,
} from '@/types/geo';

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
          'Mozilla/5.0 (compatible; GEOAnalyzer/1.0; +https://example.com/bot)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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

  // Check images without alt
  const imagesWithoutAlt = page.images.filter((img) => !img.alt);
  if (imagesWithoutAlt.length > 0) {
    issues.push(
      `${imagesWithoutAlt.length} 张图片缺少 alt 属性，影响内容可访问性`
    );
    suggestions.push('为所有图片添加描述性的 alt 属性');
    score -= Math.min(30, imagesWithoutAlt.length * 10);
  }

  // Check content length
  if (page.wordCount < 300) {
    issues.push(
      `页面文字内容仅 ${page.wordCount} 词，内容可能不够充分`
    );
    suggestions.push('增加页面的实质性文字内容，建议至少 300 词以上');
    score -= 20;
  }

  // Check heading hierarchy
  const h1Count = page.headings.filter((h) => h.tag === 'h1').length;
  if (h1Count === 0) {
    issues.push('页面缺少 H1 标题');
    suggestions.push('添加一个明确的 H1 标题来描述页面主题');
    score -= 15;
  } else if (h1Count > 1) {
    issues.push(`页面有 ${h1Count} 个 H1 标题，建议只保留一个`);
    suggestions.push('确保页面只有一个 H1 标题');
    score -= 10;
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
  const hasH1 = headingTags.includes('h1');
  const hasH2 = headingTags.includes('h2');
  const hasH3 = headingTags.includes('h3');

  if (!hasH1) {
    issues.push('缺少 H1 主标题');
    score -= 20;
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

  return {
    name: 'Product Facts',
    score: Math.max(0, score),
    issues,
    suggestions,
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

  return {
    name: 'Feature Explainability',
    score: Math.max(0, score),
    issues,
    suggestions,
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

  return {
    name: 'User Intent / Q&A',
    score: Math.max(0, score),
    issues,
    suggestions,
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

  return {
    name: 'Use Cases',
    score: Math.max(0, score),
    issues,
    suggestions,
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

  return {
    name: 'Comparison Context',
    score: Math.max(0, score),
    issues,
    suggestions,
  };
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

  return {
    name: 'Evidence & Trust',
    score: Math.max(0, score),
    issues,
    suggestions,
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
  // Fetch the page
  const html = await fetchPage(url);

  // Parse the HTML
  const page = parseHTML(html, url);

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
