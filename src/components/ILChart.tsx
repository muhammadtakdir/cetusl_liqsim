import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ILDataPoint } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ILChartProps {
  ilData: ILDataPoint[];
  tokenASymbol: string;
}

export const ILChart: React.FC<ILChartProps> = ({ ilData, tokenASymbol }) => {
  if (!ilData || ilData.length === 0) {
    return (
      <div className="bg-cetus-card rounded-xl p-6 card-glow">
        <div className="text-center text-gray-400 py-8">
          <p>No IL data available. Run simulation first.</p>
        </div>
      </div>
    );
  }

  const labels = ilData.map(d => `${d.priceChange >= 0 ? '+' : ''}${d.priceChange.toFixed(0)}%`);
  
  const data = {
    labels,
    datasets: [
      {
        label: 'Impermanent Loss (%)',
        data: ilData.map(d => d.impermanentLoss),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: (context: { chart: ChartJS }) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(239, 68, 68, 0.1)';
          
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(239, 68, 68, 0.0)');
          gradient.addColorStop(1, 'rgba(239, 68, 68, 0.3)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
      {
        label: 'Value in Pool ($)',
        data: ilData.map(d => d.valueInPool),
        borderColor: 'rgb(0, 212, 170)',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        yAxisID: 'y1',
      },
      {
        label: 'Value if HODL ($)',
        data: ilData.map(d => d.valueIfHold),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'transparent',
        borderDash: [10, 5],
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#9ca3af',
          usePointStyle: true,
          padding: 20,
        },
      },
      title: {
        display: true,
        text: `Impermanent Loss vs ${tokenASymbol} Price Change`,
        color: '#fff',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        padding: {
          bottom: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(26, 26, 46, 0.95)',
        titleColor: '#fff',
        bodyColor: '#9ca3af',
        borderColor: '#6366f1',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y ?? 0;
            if (label.includes('%')) {
              return `${label}: ${value.toFixed(2)}%`;
            }
            return `${label}: $${value.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        ticks: {
          color: '#9ca3af',
        },
        title: {
          display: true,
          text: 'Price Change',
          color: '#9ca3af',
        },
      },
      y: {
        position: 'left' as const,
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        ticks: {
          color: '#9ca3af',
          callback: (value: number | string) => `${value}%`,
        },
        title: {
          display: true,
          text: 'Impermanent Loss (%)',
          color: '#9ca3af',
        },
      },
      y1: {
        position: 'right' as const,
        grid: {
          display: false,
        },
        ticks: {
          color: '#9ca3af',
          callback: (value: number | string) => `$${value}`,
        },
        title: {
          display: true,
          text: 'Position Value ($)',
          color: '#9ca3af',
        },
      },
    },
  };

  return (
    <div className="bg-cetus-card rounded-xl p-6 card-glow">
      <div className="h-[400px]">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default ILChart;
