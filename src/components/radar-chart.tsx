'use client';

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
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
  const chartData = {
    labels: dimensionLabels || dimensions,
    datasets: datasets.map((ds, i) => {
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
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: 'rgba(0, 0, 0, 0.7)',
          font: { size: 12, family: 'Inter, sans-serif' },
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle',
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
          color: 'rgba(0, 0, 0, 0.6)',
          font: {
            size: 11,
            family: 'Inter, sans-serif',
          },
          padding: 15,
        },
      },
    },
  };

  return <Radar data={chartData} options={options} />;
}
