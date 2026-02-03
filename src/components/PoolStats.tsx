import React from 'react';

interface PoolStatsProps {
  currentPrice: number;
  volume24h: number;
  tvl: number;
  feeRate: number;
  tokenASymbol: string;
  tokenBSymbol: string;
}

// Format large numbers nicely
const formatNumber = (num: number): string => {
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(2)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
  return num.toFixed(2);
};

// Format price based on magnitude
const formatPrice = (price: number): string => {
  if (price === 0) return '0.00';
  if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.0001) return price.toFixed(6);
  return price.toExponential(2);
};

export const PoolStats: React.FC<PoolStatsProps> = ({
  currentPrice,
  volume24h,
  tvl,
  feeRate,
  tokenASymbol,
  tokenBSymbol,
}) => {
  const fees24h = volume24h * feeRate;
  const dailyAPR = tvl > 0 ? (fees24h / tvl) * 100 : 0;
  const estimatedAPY = (Math.pow(1 + dailyAPR / 100, 365) - 1) * 100;

  return (
    <div className="bg-cetus-card rounded-xl p-4 sm:p-6 card-glow">
      <h3 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-cetus-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Pool Statistics
      </h3>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Current Price */}
        <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4">
          <p className="text-gray-400 text-[10px] sm:text-xs uppercase tracking-wide mb-1">
            Price
          </p>
          <p className="text-sm sm:text-lg font-bold text-white" title={`$${currentPrice}`}>
            ${formatPrice(currentPrice)}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-500">
            {tokenASymbol}/{tokenBSymbol}
          </p>
        </div>

        {/* 24h Volume */}
        <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4">
          <p className="text-gray-400 text-[10px] sm:text-xs uppercase tracking-wide mb-1">
            Volume 24h
          </p>
          <p className="text-sm sm:text-lg font-bold text-white" title={`$${volume24h.toLocaleString()}`}>
            ${formatNumber(volume24h)}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-500">
            {volume24h > 0 ? 'Trading' : 'No data'}
          </p>
        </div>

        {/* TVL */}
        <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4">
          <p className="text-gray-400 text-[10px] sm:text-xs uppercase tracking-wide mb-1">
            TVL
          </p>
          <p className="text-sm sm:text-lg font-bold text-cetus-accent" title={`$${tvl.toLocaleString()}`}>
            ${formatNumber(tvl)}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-500">
            {tvl > 0 ? 'Locked' : 'No data'}
          </p>
        </div>

        {/* Est. APY */}
        <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4">
          <p className="text-gray-400 text-[10px] sm:text-xs uppercase tracking-wide mb-1">
            Est. APY
          </p>
          <p className="text-sm sm:text-lg font-bold text-green-400">
            {estimatedAPY > 1000 ? '>1000' : estimatedAPY.toFixed(1)}%
          </p>
          <p className="text-[10px] sm:text-xs text-gray-500">
            {volume24h > 0 ? 'From fees' : 'No data'}
          </p>
        </div>
      </div>

      {/* Footer stats */}
      <div className="mt-4 p-2 sm:p-3 bg-gray-800/30 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cetus-accent flex-shrink-0"></div>
          <span className="text-xs sm:text-sm text-gray-400">
            Fee Tier: <span className="text-white font-medium">{(feeRate * 100).toFixed(2)}%</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></div>
          <span className="text-xs sm:text-sm text-gray-400">
            24h Fees: <span className="text-white font-medium">${formatNumber(fees24h)}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default PoolStats;
