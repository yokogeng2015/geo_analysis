export interface AltIssue {
  line: number;
  original: string;
  type: 'missing' | 'empty' | 'meaningless';
  suggestion: string;
  reason?: string;
  src?: string; // Image source URL for preview
}

export interface FAQIssue {
  type: 'missing' | 'incomplete';
  suggestion: string;
}

export interface CodeAnalysisResult {
  altIssues: AltIssue[];
  faqIssues: FAQIssue[];
  optimizedCode: string;
  stats: {
    totalImages: number;
    imagesWithAlt: number;
    imagesWithoutAlt: number;
    hasFaqSchema: boolean;
  };
}

const MEANINGLESS_ALTS = [
  'image',
  'img',
  'photo',
  'picture',
  '图片',
  '照片',
  '图像',
  'icon',
  'logo',
  'banner',
  'thumb',
  'thumbnail',
  '1',
  '0',
  'test',
  'untitled',
  'no name',
  '',
  ' ',
];

// Descriptive words that indicate a meaningful alt text
const DESCRIPTIVE_WORDS = [
  '展示', '显示', '介绍', '说明', '图解', '示意图', '正面', '背面', '侧面',
  '外观', '细节', '特写', '全景', '对比', '使用', '操作', '界面', '截图',
  '场景', '效果', '功能', '特点', '优势', '参数', '规格', '配置',
  'show', 'display', 'view', 'detail', 'close-up', 'overview', 'screenshot',
  'interface', 'dashboard', 'diagram', 'illustration', 'photo of', 'image of',
];

// Common brand names that often appear as bare product names
const BRAND_NAMES = [
  'apple', 'samsung', 'sony', 'huawei', 'xiaomi', 'oppo', 'vivo',
  'google', 'microsoft', 'amazon', 'tesla', 'nike', 'adidas',
  'iphone', 'ipad', 'macbook', 'airpods', 'galaxy', 'pixel',
  'apple', '华为', '小米', '三星', '索尼', 'oppo', 'vivo', '荣耀',
];

function isMeaninglessAlt(alt: string): boolean {
  const trimmed = alt.trim();
  const lower = trimmed.toLowerCase();

  // Exact match against known meaningless list
  if (MEANINGLESS_ALTS.includes(lower)) return true;

  // Too short to be descriptive (Chinese ≤ 4 chars, English ≤ 15 chars)
  const isChinese = /[\u4e00-\u9fa5]/.test(trimmed);
  if (isChinese && trimmed.length <= 4) return true;
  if (!isChinese && trimmed.length <= 15) {
    // Short English text - check if it's just a product name/model
    // Pattern: Brand + Model number (e.g., "iPhone 15 Pro", "X1 Carbon Gen 11")
    const modelPattern = /^[A-Z][a-zA-Z]*\s*\d+[A-Z]*\s*[A-Za-z]*$/;
    if (modelPattern.test(trimmed)) return true;

    // Just a brand name
    if (BRAND_NAMES.includes(lower)) return true;

    // Just numbers and letters (model codes like "A2345", "X1C")
    const codePattern = /^[A-Z0-9\s\-]+$/;
    if (codePattern.test(trimmed) && trimmed.length <= 10) return true;
  }

  // Check if alt contains any descriptive words
  const hasDescriptiveWord = DESCRIPTIVE_WORDS.some((word) =>
    lower.includes(word)
  );
  if (!hasDescriptiveWord) {
    // No descriptive words - check if it's just a noun phrase
    // A good alt should have verbs, adjectives, or context words
    // Pure noun phrases like "laptop computer", "wireless headphones" are weak
    const words = trimmed.split(/\s+/);
    if (words.length <= 3 && !hasDescriptiveWord) {
      // Very short noun phrase without description
      return true;
    }
  }

  return false;
}

function extractFilename(src: string): string {
  try {
    const url = new URL(src);
    const pathname = url.pathname;
    const filename = pathname.split('/').pop() || '';
    return filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim();
  } catch {
    const filename = src.split('/').pop() || src;
    return filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim();
  }
}

export function analyzeHTMLCode(html: string): CodeAnalysisResult {
  const altIssues: AltIssue[] = [];
  let totalImages = 0;
  let imagesWithAlt = 0;
  let imagesWithoutAlt = 0;

  // Analyze images
  const imgRegex = /<img\b([^>]*)>/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    totalImages++;
    const attrs = imgMatch[1];
    const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
    const altMatch = attrs.match(/alt=["']([^"']*)["']/i);

    if (!altMatch) {
      imagesWithoutAlt++;
      const lineNum = html.substring(0, imgMatch.index).split('\n').length;
      const src = srcMatch ? srcMatch[1] : '';
      const filename = src ? extractFilename(src) : '';
      const suggestedAlt = filename
        ? `${filename}的产品展示图，描述图片中的具体内容和场景`
        : '请描述图片内容，包括主体、场景和关键信息';
      altIssues.push({
        line: lineNum,
        original: imgMatch[0],
        type: 'missing',
        suggestion: suggestedAlt,
        src: src || undefined,
      });
    } else {
      const altValue = altMatch[1];
      if (isMeaninglessAlt(altValue)) {
        imagesWithoutAlt++;
        const lineNum = html.substring(0, imgMatch.index).split('\n').length;
        const src = srcMatch ? srcMatch[1] : '';
        const filename = src ? extractFilename(src) : '';
        // Provide a more specific suggestion based on what's wrong
        let reason = '';
        if (altValue.trim() === '') {
          reason = 'alt 为空';
        } else if (altValue.length <= 4 && /[\u4e00-\u9fa5]/.test(altValue)) {
          reason = `alt "${altValue}" 过短，仅为名词，缺少描述性内容`;
        } else if (altValue.length <= 15 && !/[\u4e00-\u9fa5]/.test(altValue)) {
          reason = `alt "${altValue}" 仅为产品名/型号，缺少对图片内容的描述`;
        } else {
          reason = `alt "${altValue}" 无实际描述意义`;
        }
        const suggestedAlt = filename
          ? `${filename}的产品展示图，描述图片中的具体内容和场景`
          : '请描述图片内容，包括主体、场景和关键信息';
        altIssues.push({
          line: lineNum,
          original: imgMatch[0],
          type: altValue.trim() === '' ? 'empty' : 'meaningless',
          suggestion: suggestedAlt,
          src: src || undefined,
        });
        // Store the reason for display
        (altIssues[altIssues.length - 1] as AltIssue & { reason?: string }).reason = reason;
      } else {
        imagesWithAlt++;
      }
    }
  }

  // Check FAQ Schema
  const faqIssues: FAQIssue[] = [];
  const hasFaqSchema =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?FAQPage[\s\S]*?<\/script>/i.test(html) ||
    /itemtype=["']https:\/\/schema\.org\/Question["']/i.test(html);

  if (!hasFaqSchema) {
    faqIssues.push({
      type: 'missing',
      suggestion: '页面缺少 FAQ Schema 结构化数据，建议添加常见问题问答模块',
    });
  }

  // Generate optimized code
  let optimizedCode = html;

  // Fix alt issues
  for (const issue of altIssues) {
    const srcMatch = issue.original.match(/src=["']([^"']+)["']/i);
    const src = srcMatch ? srcMatch[1] : '';
    const suggestedAlt = src ? `描述${extractFilename(src)}的图片内容` : '请描述图片内容';

    if (issue.type === 'missing') {
      optimizedCode = optimizedCode.replace(
        issue.original,
        issue.original.replace(/<img\b/i, `<img alt="${suggestedAlt}"`)
      );
    } else {
      optimizedCode = optimizedCode.replace(
        issue.original,
        issue.original.replace(/alt=["'][^"']*["']/i, `alt="${suggestedAlt}"`)
      );
    }
  }

  // Add FAQ Schema if missing
  if (!hasFaqSchema) {
    const faqSchema = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "你的常见问题是什么？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "这里是详细的回答内容。"
      }
    }
  ]
}
</script>`;
    optimizedCode += faqSchema;
  }

  return {
    altIssues,
    faqIssues,
    optimizedCode,
    stats: {
      totalImages,
      imagesWithAlt,
      imagesWithoutAlt,
      hasFaqSchema,
    },
  };
}

export function generateFaqSchema(questions: { q: string; a: string }[]): string {
  const entities = questions
    .map(
      (qa) => `    {
      "@type": "Question",
      "name": "${qa.q}",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "${qa.a}"
      }
    }`
    )
    .join(',\n');

  return `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
${entities}
  ]
}
</script>`;
}
