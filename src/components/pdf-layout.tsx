'use client';

import { RadarChart } from './radar-chart';
import { DimensionDetail } from './dimension-detail';
import {
  TECHNICAL_DIMENSIONS,
  CONTENT_DIMENSIONS,
  TECHNICAL_DIMENSIONS_CN,
  CONTENT_DIMENSIONS_CN,
  type AnalysisResult,
  type DimensionScore,
} from '@/types/geo';
import type { Chart } from 'chart.js';
import { forwardRef } from 'react';

interface CompareResult {
  url: string;
  title: string;
  technicalGEO: AnalysisResult['technicalGEO'];
  contentGEO: AnalysisResult['contentGEO'];
}

interface PdfLayoutProps {
  result: {
    main: AnalysisResult;
    comparisons: CompareResult[];
  };
  technicalChartRef?: React.RefObject<Chart | null>;
  contentChartRef?: React.RefObject<Chart | null>;
}

export const PdfLayout = forwardRef<HTMLDivElement, PdfLayoutProps>(
  ({ result, technicalChartRef, contentChartRef }: PdfLayoutProps, ref) => {
    const { main, comparisons } = result;

    // 构建 Technical GEO 数据集
    const technicalDatasets = [
      {
        label: main.title || main.url,
        dimensions: main.technicalGEO.dimensions,
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        pointColor: '#0ea5e9',
      },
      ...comparisons.map((comp: CompareResult, idx: number) => {
        const colors = [
          { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', point: '#f59e0b' },
          { border: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', point: '#10b981' },
          { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', point: '#8b5cf6' },
          { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', point: '#ef4444' },
        ];
        const color = colors[idx % colors.length];
        return {
          label: comp.title || comp.url,
          dimensions: comp.technicalGEO.dimensions,
          borderColor: color.border,
          backgroundColor: color.bg,
          pointColor: color.point,
        };
      }),
    ];

    // 构建 Content GEO 数据集
    const contentDatasets = [
      {
        label: main.title || main.url,
        dimensions: main.contentGEO.dimensions,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        pointColor: '#f59e0b',
      },
      ...comparisons.map((comp: CompareResult, idx: number) => {
        const colors = [
          { border: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.1)', point: '#0ea5e9' },
          { border: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', point: '#10b981' },
          { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', point: '#8b5cf6' },
          { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', point: '#ef4444' },
        ];
        const color = colors[idx % colors.length];
        return {
          label: comp.title || comp.url,
          dimensions: comp.contentGEO.dimensions,
          borderColor: color.border,
          backgroundColor: color.bg,
          pointColor: color.point,
        };
      }),
    ];

    const technicalDimensionLabels = TECHNICAL_DIMENSIONS.map(
      (d) => `${d}\n${TECHNICAL_DIMENSIONS_CN[d] || ''}`
    );
    const contentDimensionLabels = CONTENT_DIMENSIONS.map(
      (d) => `${d}\n${CONTENT_DIMENSIONS_CN[d] || ''}`
    );

    return (
      <div 
        ref={ref} 
        style={{ width: '210mm', minHeight: '297mm', backgroundColor: '#f8f9fc', padding: '32px' }}
      >
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
            GEO 分析报告
          </h1>
          <p style={{ color: '#4b5563' }}>主站：{main.url}</p>
          {comparisons.length > 0 && (
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
              对比站点：{comparisons.map((c) => c.url).join('、')}
            </p>
          )}
        </div>

        {/* Technical GEO Section */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0284c7', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '4px', height: '24px', backgroundColor: '#0ea5e9', borderRadius: '9999px' }}></span>
            Technical GEO 技术维度
          </h2>

          {/* Radar Chart Container */}
          <div style={{ borderRadius: '16px', backgroundColor: '#ffffff', padding: '24px', border: '2px solid #bae6fd', marginBottom: '32px' }}>
            <RadarChart
              ref={technicalChartRef}
              title="Technical GEO"
              datasets={technicalDatasets}
              dimensions={[...TECHNICAL_DIMENSIONS]}
              dimensionLabels={technicalDimensionLabels}
            />
          </div>

          {/* Dimension Details */}
          <div className="space-y-4">
            {main.technicalGEO.dimensions.map((dim: DimensionScore) => (
              <DimensionDetail
                key={dim.name}
                dimension={dim}
                accentColor="cyan"
                chineseName={TECHNICAL_DIMENSIONS_CN[dim.name] || ''}
              />
            ))}
          </div>
        </div>

        {/* Content GEO Section */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '4px', height: '24px', backgroundColor: '#f59e0b', borderRadius: '9999px' }}></span>
            Content GEO 内容维度
          </h2>

          {/* Radar Chart Container */}
          <div style={{ borderRadius: '16px', backgroundColor: '#ffffff', padding: '24px', border: '2px solid #fde68a', marginBottom: '32px' }}>
            <RadarChart
              ref={contentChartRef}
              title="Content GEO"
              datasets={contentDatasets}
              dimensions={[...CONTENT_DIMENSIONS]}
              dimensionLabels={contentDimensionLabels}
            />
          </div>

          {/* Dimension Details */}
          <div className="space-y-4">
            {main.contentGEO.dimensions.map((dim: DimensionScore) => (
              <DimensionDetail
                key={dim.name}
                dimension={dim}
                accentColor="orange"
                chineseName={CONTENT_DIMENSIONS_CN[dim.name] || ''}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
);

PdfLayout.displayName = 'PdfLayout';