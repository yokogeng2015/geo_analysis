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

export const PdfLayout = forwardRef<HTMLDivElement, PdfLayoutProps>(({ result, technicalChartRef, contentChartRef }: PdfLayoutProps, ref) => {
  const { main, comparisons } = result;

  // Build datasets for Technical GEO radar chart
  const technicalDatasets = [
    {
      label: main.title || main.url,
      dimensions: main.technicalGEO.dimensions,
      borderColor: 'rgba(14, 165, 233, 0.8)',
      backgroundColor: 'rgba(14, 165, 233, 0.1)',
      pointColor: 'rgba(14, 165, 233, 1)',
    },
    ...comparisons.map((comp: CompareResult, idx: number) => {
      const colors = [
        { border: 'rgba(245, 158, 11, 0.8)', bg: 'rgba(245, 158, 11, 0.1)', point: 'rgba(245, 158, 11, 1)' },
        { border: 'rgba(16, 185, 129, 0.8)', bg: 'rgba(16, 185, 129, 0.1)', point: 'rgba(16, 185, 129, 1)' },
        { border: 'rgba(139, 92, 246, 0.8)', bg: 'rgba(139, 92, 246, 0.1)', point: 'rgba(139, 92, 246, 1)' },
        { border: 'rgba(239, 68, 68, 0.8)', bg: 'rgba(239, 68, 68, 0.1)', point: 'rgba(239, 68, 68, 1)' },
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

  // Build datasets for Content GEO radar chart
  const contentDatasets = [
    {
      label: main.title || main.url,
      dimensions: main.contentGEO.dimensions,
      borderColor: 'rgba(245, 158, 11, 0.8)',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      pointColor: 'rgba(245, 158, 11, 1)',
    },
    ...comparisons.map((comp: CompareResult, idx: number) => {
      const colors = [
        { border: 'rgba(14, 165, 233, 0.8)', bg: 'rgba(14, 165, 233, 0.1)', point: 'rgba(14, 165, 233, 1)' },
        { border: 'rgba(16, 185, 129, 0.8)', bg: 'rgba(16, 185, 129, 0.1)', point: 'rgba(16, 185, 129, 1)' },
        { border: 'rgba(139, 92, 246, 0.8)', bg: 'rgba(139, 92, 246, 0.1)', point: 'rgba(139, 92, 246, 1)' },
        { border: 'rgba(239, 68, 68, 0.8)', bg: 'rgba(239, 68, 68, 0.1)', point: 'rgba(239, 68, 68, 1)' },
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
    <div className="bg-[#f8f9fc] p-8" style={{ width: '210mm', minHeight: '297mm' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">GEO 分析报告</h1>
        <p className="text-gray-600">
          主站：{main.url}
        </p>
        {comparisons.length > 0 && (
          <p className="text-gray-500 text-sm mt-1">
            对比站点：{comparisons.map((c: any) => c.url).join('、')}
          </p>
        )}
      </div>

      {/* Technical GEO Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-sky-600 mb-6 flex items-center gap-2">
          <span className="w-1 h-6 bg-sky-500 rounded-full"></span>
          Technical GEO 技术维度
        </h2>

        {/* Radar Chart */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border-2 border-sky-200 mb-8">
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
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-amber-600 mb-6 flex items-center gap-2">
          <span className="w-1 h-6 bg-amber-500 rounded-full"></span>
          Content GEO 内容维度
        </h2>

        {/* Radar Chart */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border-2 border-amber-200 mb-8">
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
});

PdfLayout.displayName = 'PdfLayout';
