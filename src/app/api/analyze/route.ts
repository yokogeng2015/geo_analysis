import { NextRequest, NextResponse } from 'next/server';
import { analyzeUrl } from '@/lib/geo-analyzer';

interface AnalyzeRequest {
  mainUrl: string;
  compareUrls?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mainUrl, compareUrls = [] } = body as AnalyzeRequest;

    if (!mainUrl) {
      return NextResponse.json(
        { error: '请提供主 URL' },
        { status: 400 }
      );
    }

    // Validate URLs
    const allUrls = [mainUrl, ...compareUrls];
    const validatedUrls: string[] = [];

    for (const url of allUrls) {
      let targetUrl = url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      try {
        const parsed = new URL(targetUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return NextResponse.json(
            { error: '仅支持 HTTP/HTTPS 协议' },
            { status: 400 }
          );
        }
        validatedUrls.push(targetUrl);
      } catch {
        return NextResponse.json(
          { error: `URL 格式不正确: ${url}` },
          { status: 400 }
        );
      }
    }

    // Analyze all URLs in parallel
    const results = await Promise.allSettled(
      validatedUrls.map((url) => analyzeUrl(url))
    );

    const mainResult = results[0];
    if (mainResult.status === 'rejected') {
      return NextResponse.json(
        { error: `主 URL 分析失败: ${mainResult.reason}` },
        { status: 500 }
      );
    }

    const compareResults = results.slice(1).filter(
      (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof analyzeUrl>>> =>
        r.status === 'fulfilled'
    ).map((r) => r.value);

    return NextResponse.json({
      main: mainResult.value,
      comparisons: compareResults,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '分析过程中发生未知错误';
    return NextResponse.json(
      { error: `分析失败: ${message}` },
      { status: 500 }
    );
  }
}
