'use client';

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type Chart,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import type { DimensionScore } from '@/types/geo';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

// 截断文本到指定长度
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// 自定义插件：绘制富文本维度标签（英文加粗 + 中文换行小字）
const richLabelPlugin = {
  id: 'richLabelPlugin',
  afterDraw(chart: Chart) {
    const { ctx, scales } = chart;
    const rScale = scales.r as RadialLinearScale;
    if (!rScale) return;

    const labels = chart.data.labels as string[];
    if (!labels) return;

    const pointLabels = rScale.options.pointLabels;
    const fontSize = (pointLabels?.font as { size?: number })?.size || 11;
    const padding = typeof pointLabels?.padding === 'number' ? pointLabels.padding : 15;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const angleCount = labels.length;
    const angleStep = (Math.PI * 2) / angleCount;

    for (let i = 0; i < angleCount; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const distance = rScale.drawingArea + padding + fontSize * 2;
      const x = rScale.xCenter + Math.cos(angle) * distance;
      const y = rScale.yCenter + Math.sin(angle) * distance;

      const label = labels[i];
      const parts = label.split('\n');
      const enText = parts[0] || '';
      const cnText = parts[1] || '';

      // 保持水平，不旋转
      // 绘制英文（加粗深色）
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = 'rgba(31, 41, 55, 0.9)';
      ctx.fillText(enText, x, y - fontSize * 0.4);

      // 绘制中文（小字灰色）
      if (cnText) {
        ctx.font = `${fontSize * 0.85}px Inter, sans-serif`;
        ctx.fillStyle = 'rgba(107, 114, 128, 0.7)';
        ctx.fillText(cnText, x, y + fontSize * 0.6);
      }
    }

    ctx.restore();
  },
};

export interface RadarDataset {
  label: string;
  dimensions: DimensionScore[];
  borderColor: string;
  backgroundColor: string;
  pointColor: string;
}

interface RadarChartProps {
  title: string;
  datasets: RadarDataset[];
  dimensions: string[];
  dimensionLabels?: string[];
}

const COLORS = [
  {
    border: 'rgba(14, 165, 233, 0.8)',
    bg: 'rgba(14, 165, 233, 0.1)',
    point: 'rgba(14, 165, 233, 1)',
  },
  {
    border: 'rgba(245, 158, 11, 0.8)',
    bg: 'rgba(245, 158, 11, 0.1)',
    point: 'rgba(245, 158, 11, 1)',
  },
  {
    border: 'rgba(16, 185, 129, 0.8)',
    bg: 'rgba(16, 185, 129, 0.1)',
    point: 'rgba(16, 185, 129, 1)',
  },
  {
    border: 'rgba(239, 68, 68, 0.8)',
    bg: 'rgba(239, 68, 68, 0.1)',
    point: 'rgba(239, 68, 68, 1)',
  },
  {
    border: 'rgba(139, 92, 246, 0.8)',
    bg: 'rgba(139, 92, 246, 0.1)',
    point: 'rgba(139, 92, 246, 1)',
  },
];

export function RadarChart({ title, datasets, dimensions, dimensionLabels }: RadarChartProps) {
  // 截断图例标签到 20 个字符
  const truncatedDatasets = datasets.map((ds) => ({
    ...ds,
    label: truncateText(ds.label, 20),
  }));

  const chartData = {
    labels: dimensionLabels || dimensions,
    datasets: truncatedDatasets.map((ds, i) => {
      const color = COLORS[i % COLORS.length];
      return {
        label: ds.label,
        data: ds.dimensions.map((d) => d.score),
        backgroundColor: color.bg,
        borderColor: color.border,
        borderWidth: 2,
        pointBackgroundColor: color.point,
        pointBorderColor: color.point,
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: color.border,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
      };
    }),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    animation: {
      duration: 1200,
      easing: 'easeOutQuart' as const,
    },
    layout: {
      padding: {
        top: 10,
        bottom: 30,
        left: 30,
        right: 30,
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: 'rgba(0, 0, 0, 0.7)',
          font: { size: 12, family: 'Inter, sans-serif' },
          padding: 12,
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#6b7280',
        borderColor: 'rgba(0,0,0,0.1)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: function (context: {
            dataset: { label?: string };
            parsed: { r: number };
          }) {
            return `${context.dataset.label}: ${context.parsed.r}/100`;
          },
        },
      },
      richLabelPlugin: richLabelPlugin,
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        min: 0,
        ticks: {
          stepSize: 20,
          color: 'rgba(0, 0, 0, 0.3)',
          backdropColor: 'transparent',
          font: { size: 10 },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.06)',
          circular: true,
        },
        angleLines: {
          color: 'rgba(0, 0, 0, 0.06)',
        },
        pointLabels: {
          display: false,
        },
      },
    },
  };

  return <Radar data={chartData} options={options} plugins={[richLabelPlugin]} />;
}
