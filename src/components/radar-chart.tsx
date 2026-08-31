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

interface RadarChartProps {
  title: string;
  dimensions: DimensionScore[];
  color: 'cyan' | 'orange';
}

export function RadarChart({ title, dimensions, color }: RadarChartProps) {
  const colorConfig = {
    cyan: {
      border: 'rgba(0, 212, 255, 0.9)',
      bg: 'rgba(0, 212, 255, 0.15)',
      point: 'rgba(0, 212, 255, 1)',
      glow: 'rgba(0, 212, 255, 0.3)',
    },
    orange: {
      border: 'rgba(255, 159, 67, 0.9)',
      bg: 'rgba(255, 159, 67, 0.15)',
      point: 'rgba(255, 159, 67, 1)',
      glow: 'rgba(255, 159, 67, 0.3)',
    },
  };

  const c = colorConfig[color];

  const data = {
    labels: dimensions.map((d) => d.name),
    datasets: [
      {
        label: title,
        data: dimensions.map((d) => d.score),
        backgroundColor: c.bg,
        borderColor: c.border,
        borderWidth: 2,
        pointBackgroundColor: c.point,
        pointBorderColor: c.point,
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: c.border,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    animation: {
      duration: 1500,
      easing: 'easeOutQuart' as const,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(18, 18, 26, 0.95)',
        titleColor: '#fff',
        bodyColor: '#ccc',
        borderColor: c.border,
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: function (context: { parsed: { r: number } }) {
            return `得分: ${context.parsed.r}/100`;
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
          color: 'rgba(255, 255, 255, 0.4)',
          backdropColor: 'transparent',
          font: { size: 10 },
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.08)',
          circular: true,
        },
        angleLines: {
          color: 'rgba(255, 255, 255, 0.08)',
        },
        pointLabels: {
          color: 'rgba(255, 255, 255, 0.75)',
          font: {
            size: 11,
            family: 'Inter, sans-serif',
          },
          padding: 15,
        },
      },
    },
  };

  return (
    <div className="relative">
      <div
        className="absolute inset-0 rounded-full blur-3xl opacity-20"
        style={{ background: c.glow }}
      />
      <Radar data={data} options={options} />
    </div>
  );
}
