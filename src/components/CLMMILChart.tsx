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
import { ILCurvePoint } from '../utils/clmmMath';

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

interface CLMMILChartProps {
  ilData: ILCurvePoint[];
  tokenASymbol: string;
  currentPrice: number;
  priceLower: number;
  priceUpper: number;
}

export const CLMMILChart: React.FC<CLMMILChartProps> = ({ 
  ilData, 
  tokenASymbol,
  currentPrice,
  priceLower,
  priceUpper 
}) => {
  if (!ilData || ilData.length === 0) {
    return (
      <div className="bg-cetus-card rounded-xl p-6 card-glow">
        <div className="text-center text-gray-400 py-8">
          <p>No IL data available. Run simulation first.</p>
        </div>
      </div>
    );
  }

  // Find range boundary indices for annotations
  const lowerBoundChange = ((priceLower / currentPrice) - 1) * 100;
  const upperBoundChange = ((priceUpper / currentPrice) - 1) * 100;

  const labels = ilData.map(d => `${d.priceChange >= 0 ? '+' : ''}${d.priceChange.toFixed(0)}%`);
  
  // Color code based on in-range vs out-of-range
  const borderColors = ilData.map(d => {
    if (d.isOutOfRange) {
      return 'rgb(239, 68, 68)'; // Red for out of range
    }
    return 'rgb(0, 212, 170)'; // Green for in range
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'CLMM IL (%)',
        data: ilData.map(d => d.ilPercentage),
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
        pointRadius: ilData.map(d => d.isOutOfRange ? 6 : 4),
        pointHoverRadius: 8,
        pointBackgroundColor: borderColors,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        segment: {
          borderColor: (ctx: { p0DataIndex: number }) => {
            const idx = ctx.p0DataIndex;
            return ilData[idx]?.isOutOfRange ? 'rgba(239, 68, 68, 0.5)' : 'rgb(239, 68, 68)';
          },
          borderDash: (ctx: { p0DataIndex: number }) => {
            const idx = ctx.p0DataIndex;
            return ilData[idx]?.isOutOfRange ? [5, 5] : [];
          },
        },
      },
      {
        label: 'V2 AMM IL (%)',
        data: ilData.map(d => d.ilV2Percentage),
        borderColor: 'rgb(156, 163, 175)', // Gray
        backgroundColor: 'transparent',
        borderDash: [3, 3],
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
      {
        label: 'Value in Pool ($)',
        data: ilData.map(d => d.valuePool),
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
        data: ilData.map(d => d.valueHold),
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
        text: `CLMM Impermanent Loss vs ${tokenASymbol} Price Change`,
        color: '#fff',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        padding: {
          bottom: 10,
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
          afterLabel: (context: { dataIndex: number }) => {
            const point = ilData[context.dataIndex];
            if (!point) return '';
            
            const lines: string[] = [];
            
            // Amplification factor
            if (point.amplificationFactor > 1.1) {
              lines.push(`📈 ${point.amplificationFactor.toFixed(1)}x worse than V2 AMM`);
            }
            
            // Out of range warning
            if (point.isOutOfRange) {
              lines.push(`⚠️ OUT OF RANGE (${point.outOfRangeDirection})`);
              lines.push('🚫 Not earning fees!');
            } else {
              lines.push('✅ In Range - Earning fees');
            }
            
            return lines;
          },
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
      {/* Range indicator */}
      <div className="mb-4 flex items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-400">In Range (earning fees)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-gray-400">Out of Range (no fees, max IL)</span>
        </div>
      </div>

      {/* Range boundaries info */}
      <div className="mb-4 grid grid-cols-2 gap-4 text-xs">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-center">
          <span className="text-red-400">Lower Bound: {lowerBoundChange.toFixed(1)}%</span>
          <span className="text-gray-500 block">${priceLower.toFixed(4)}</span>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-center">
          <span className="text-red-400">Upper Bound: +{upperBoundChange.toFixed(1)}%</span>
          <span className="text-gray-500 block">${priceUpper.toFixed(4)}</span>
        </div>
      </div>

      {/* Amplification Factor Info */}
      {(() => {
        const avgAmplification = ilData.reduce((sum, p) => sum + (p.amplificationFactor || 1), 0) / ilData.length;
        const rangeWidth = (priceUpper / priceLower - 1) * 100;
        return avgAmplification > 1.5 ? (
          <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-sm">
            <p className="text-purple-400 font-medium">📊 IL Amplification Analysis</p>
            <p className="text-purple-300/80 mt-1">
              Range width: <strong>{rangeWidth.toFixed(1)}%</strong> • 
              IL Amplification: <strong>{avgAmplification.toFixed(1)}x</strong> vs V2 AMM
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Concentrated ranges amplify IL. Narrower range = higher capital efficiency but higher IL risk.
            </p>
          </div>
        ) : null;
      })()}

      <div className="h-[400px]">
        <Line data={data} options={options} />
      </div>

      {/* Legend explanation */}
      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
        <p className="text-yellow-400 font-medium">⚠️ CLMM vs V2 AMM Impermanent Loss</p>
        <p className="text-yellow-300/80 mt-1">
          <strong>Red line (CLMM):</strong> IL in concentrated range - higher IL but more capital efficient.
        </p>
        <p className="text-gray-400 mt-1">
          <strong>Gray line (V2 AMM):</strong> IL in traditional AMM (xy=k) for comparison.
        </p>
        <p className="text-gray-400 mt-1 text-xs">
          V2 Formula: IL = 2√k/(1+k) - 1 where k = P'/P • CLMM Formula: IL = V_pool/V_hold - 1 (value-based calculation with √price bounds)
        </p>
      </div>
    </div>
  );
};

export default CLMMILChart;
