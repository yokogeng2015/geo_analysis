import { NextRequest, NextResponse } from 'next/server';
import { analyzeUrl } from '@/lib/geo-analyzer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body as { url: string };

    if (!url) {
      return NextResponse.json(
        { error: '请提供要分析的 URL' },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'URL 格式不正确，请提供完整的 URL（包含 http:// 或 https://）' },
        { status: 400 }
      );
    }

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: '仅支持 HTTP/HTTPS 协议' },
        { status: 400 }
      );
    }

    const result = await analyzeUrl(url);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '分析过程中发生未知错误';
    return NextResponse.json(
      { error: `分析失败: ${message}` },
      { status: 500 }
    );
  }
}
