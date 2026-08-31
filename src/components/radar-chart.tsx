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
}

const COLORS = [
  {
    border: 'rgba(0, 212, 255, 0.9)',
    bg: 'rgba(0, 212, 255, 0.12)',
    point: 'rgba(0, 212, 255, 1)',
  },
  {
    border: 'rgba(255, 159, 67, 0.9)',
    bg: 'rgba(255, 159, 67, 0.12)',
    point: 'rgba(255, 159, 67, 1)',
  },
  {
    border: 'rgba(0, 230, 118, 0.9)',
    bg: 'rgba(0, 230, 118, 0.12)',
    point: 'rgba(0, 230, 118, 1)',
  },
  {
    border: 'rgba(255, 82, 82, 0.9)',
    bg: 'rgba(255, 82, 82, 0.12)',
    point: 'rgba(255, 82, 82, 1)',
  },
  {
    border: 'rgba(171, 71, 188, 0.9)',
    bg: 'rgba(171, 71, 188, 0.12)',
    point: 'rgba(171, 71, 188, 1)',
  },
];

export function RadarChart({ title, datasets, dimensions }: RadarChartProps) {
  const chartData = {
    labels: dimensions,
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
          color: 'rgba(255, 255, 255, 0.8)',
          font: { size: 12, family: 'Inter, sans-serif' },
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(18, 18, 26, 0.95)',
        titleColor: '#fff',
        bodyColor: '#ccc',
        borderColor: 'rgba(255,255,255,0.1)',
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
          color: 'rgba(255, 255, 255, 0.3)',
          backdropColor: 'transparent',
          font: { size: 10 },
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.06)',
          circular: true,
        },
        angleLines: {
          color: 'rgba(255, 255, 255, 0.06)',
        },
        pointLabels: {
          color: 'rgba(255, 255, 255, 0.7)',
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
