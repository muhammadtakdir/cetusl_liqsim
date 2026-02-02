import React from 'react';
import { tickToPrice } from '../utils';

interface LiquidityInputProps {
  amountA: number;
  amountB: number;
  tickLower: number;
  tickUpper: number;
  currentPrice: number;
  tokenASymbol: string;
  tokenBSymbol: string;
  tickSpacing: number;
  onAmountAChange: (value: number) => void;
  onAmountBChange: (value: number) => void;
  onTickLowerChange: (value: number) => void;
  onTickUpperChange: (value: number) => void;
}

export const LiquidityInput: React.FC<LiquidityInputProps> = ({
  amountA,
  amountB,
  tickLower,
  tickUpper,
  currentPrice,
  tokenASymbol,
  tokenBSymbol,
  tickSpacing,
  onAmountAChange,
  onAmountBChange,
  onTickLowerChange,
  onTickUpperChange,
}) => {
  const priceLower = tickToPrice(tickLower);
  const priceUpper = tickToPrice(tickUpper);
  
  const rangePercent = ((priceUpper - priceLower) / currentPrice * 100).toFixed(1);
  const isInRange = currentPrice >= priceLower && currentPrice <= priceUpper;

  return (
    <div className="bg-cetus-card rounded-xl p-6 card-glow space-y-6">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <svg className="w-5 h-5 text-cetus-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Liquidity Amounts
      </h3>

      {/* Token Amounts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-gray-400">{tokenASymbol} Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amountA}
              onChange={(e) => onAmountAChange(parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cetus-accent focus:outline-none transition-colors"
              placeholder="0.0"
              min="0"
              step="0.1"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              {tokenASymbol}
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm text-gray-400">{tokenBSymbol} Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amountB}
              onChange={(e) => onAmountBChange(parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cetus-accent focus:outline-none transition-colors"
              placeholder="0.0"
              min="0"
              step="0.1"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              {tokenBSymbol}
            </span>
          </div>
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-md font-medium text-white">Price Range</h4>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            isInRange ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isInRange ? 'In Range' : 'Out of Range'}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Current Price</span>
            <span className="text-white font-medium">{currentPrice.toFixed(4)} {tokenBSymbol}/{tokenASymbol}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Range Width</span>
            <span className="text-cetus-accent font-medium">{rangePercent}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Min Price (Tick: {tickLower})</label>
            <input
              type="number"
              value={priceLower.toFixed(6)}
              onChange={(e) => {
                const price = parseFloat(e.target.value) || 0;
                const tick = Math.floor(Math.log(price) / Math.log(1.0001));
                const alignedTick = Math.floor(tick / tickSpacing) * tickSpacing;
                onTickLowerChange(alignedTick);
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cetus-primary focus:outline-none transition-colors"
              step="0.0001"
              min="0"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Max Price (Tick: {tickUpper})</label>
            <input
              type="number"
              value={priceUpper.toFixed(6)}
              onChange={(e) => {
                const price = parseFloat(e.target.value) || 0;
                const tick = Math.ceil(Math.log(price) / Math.log(1.0001));
                const alignedTick = Math.ceil(tick / tickSpacing) * tickSpacing;
                onTickUpperChange(alignedTick);
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cetus-primary focus:outline-none transition-colors"
              step="0.0001"
              min="0"
            />
          </div>
        </div>

        {/* Quick Range Buttons */}
        <div className="flex gap-2">
          {[10, 25, 50, 100].map((range) => (
            <button
              key={range}
              onClick={() => {
                const tickRange = Math.ceil(Math.log(1 + range / 100) / Math.log(1.0001));
                const currentTick = Math.floor(Math.log(currentPrice) / Math.log(1.0001));
                const newLower = Math.floor((currentTick - tickRange) / tickSpacing) * tickSpacing;
                const newUpper = Math.ceil((currentTick + tickRange) / tickSpacing) * tickSpacing;
                onTickLowerChange(newLower);
                onTickUpperChange(newUpper);
              }}
              className="flex-1 py-2 px-3 bg-gray-800 hover:bg-cetus-primary/30 border border-gray-700 hover:border-cetus-primary rounded-lg text-sm text-gray-300 hover:text-white transition-all"
            >
              ±{range}%
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LiquidityInput;
