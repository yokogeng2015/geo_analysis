export interface AltIssue {
  line: number;
  original: string;
  type: 'missing' | 'empty' | 'meaningless';
  suggestion: string;
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

function isMeaninglessAlt(alt: string): boolean {
  const trimmed = alt.trim().toLowerCase();
  return MEANINGLESS_ALTS.includes(trimmed) || trimmed.length <= 2;
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
  const lines = html.split('\n');
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
      const suggestedAlt = src ? `描述${extractFilename(src)}的图片内容` : '请描述图片内容';
      altIssues.push({
        line: lineNum,
        original: imgMatch[0],
        type: 'missing',
        suggestion: suggestedAlt,
      });
    } else {
      const altValue = altMatch[1];
      if (isMeaninglessAlt(altValue)) {
        imagesWithoutAlt++;
        const lineNum = html.substring(0, imgMatch.index).split('\n').length;
        const src = srcMatch ? srcMatch[1] : '';
        const suggestedAlt = src ? `描述${extractFilename(src)}的图片内容` : '请描述图片内容';
        altIssues.push({
          line: lineNum,
          original: imgMatch[0],
          type: altValue.trim() === '' ? 'empty' : 'meaningless',
          suggestion: suggestedAlt,
        });
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
