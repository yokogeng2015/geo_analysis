/**
 * 静态版（GitHub Pages / 纯 index.html）浏览器入口。
 *
 * 将 GEO 分析引擎的纯计算部分打包为 IIFE，暴露到全局 `GeoAnalyzer`：
 *   - parseHTML(html, url)                → ParsedPage
 *   - analyzeParsedPage(page, url?)       → AnalysisResult（12 维度完整分析）
 *   - analyzeHTMLCode(html)               → 代码优化分析（alt 检测 + FAQ Schema）
 *   - generateFaqSchema(questions)        → JSON-LD 字符串
 *   - isMeaninglessAlt(alt)               → alt 有效性判断
 *
 * 打包命令见 package.json 的 `build:static` 脚本（esbuild）。
 */
import {
  analyzeParsedPage,
  parseHTML,
  type ParsedPage,
} from './geo-analyzer';
import {
  analyzeHTMLCode,
  generateFaqSchema,
  isMeaninglessAlt,
} from './code-optimizer';

export { analyzeParsedPage, parseHTML, analyzeHTMLCode, generateFaqSchema, isMeaninglessAlt };
export type { ParsedPage };

const scope = globalThis as unknown as Record<string, unknown>;

scope.GeoAnalyzer = {
  parseHTML,
  analyzeParsedPage,
  analyzeHTMLCode,
  generateFaqSchema,
  isMeaninglessAlt,
};
