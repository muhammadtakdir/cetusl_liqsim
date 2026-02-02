import React, { useState } from 'react';
import { simulateRebalance, RebalanceScenario } from '../utils/clmmMath';

interface RebalanceSimulatorProps {
  currentPrice: number;
  currentPriceLower: number;
  currentPriceUpper: number;
  positionValueUSD: number;
  dailyVolume: number;
  feeRate: number;
  totalPoolTVL: number;
  tokenASymbol: string;
  tokenBSymbol: string;
}

export const RebalanceSimulator: React.FC<RebalanceSimulatorProps> = ({
  currentPrice,
  currentPriceLower,
  currentPriceUpper,
  positionValueUSD,
  dailyVolume,
  feeRate,
  totalPoolTVL,
}) => {
  const [newPriceLower, setNewPriceLower] = useState(currentPrice * 0.9);
  const [newPriceUpper, setNewPriceUpper] = useState(currentPrice * 1.1);
  const [gasCostSUI, setGasCostSUI] = useState(0.02);
  const [suiPriceUSD, setSuiPriceUSD] = useState(currentPrice);
  const [result, setResult] = useState<RebalanceScenario | null>(null);

  // Check if position is out of range
  const isOutOfRange = currentPrice < currentPriceLower || currentPrice > currentPriceUpper;

  const handleSimulate = () => {
    const scenario = simulateRebalance(
      currentPrice,
      currentPriceLower,
      currentPriceUpper,
      newPriceLower,
      newPriceUpper,
      positionValueUSD,
      dailyVolume,
      feeRate,
      totalPoolTVL,
      gasCostSUI,
      suiPriceUSD
    );
    setResult(scenario);
  };

  // Auto-center around current price
  const handleAutoCenter = (rangePercent: number) => {
    const range = currentPrice * (rangePercent / 100);
    setNewPriceLower(currentPrice - range);
    setNewPriceUpper(currentPrice + range);
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'recommended': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'not-recommended': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  return (
    <div className="bg-cetus-card rounded-xl p-6 card-glow">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-cetus-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Rebalancing Simulator
      </h3>

      {/* Current Position Status */}
      <div className={`mb-4 p-3 rounded-lg border ${isOutOfRange ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
        <div className="flex items-center gap-2">
          {isOutOfRange ? (
            <>
              <span className="text-red-400 font-medium">⚠️ Position Out of Range</span>
              <span className="text-red-300/80 text-sm">- Not earning fees!</span>
            </>
          ) : (
            <>
              <span className="text-green-400 font-medium">✅ Position In Range</span>
              <span className="text-green-300/80 text-sm">- Earning fees</span>
            </>
          )}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-gray-500">Current Range:</span>
            <span className="text-white ml-2">${currentPriceLower.toFixed(4)} - ${currentPriceUpper.toFixed(4)}</span>
          </div>
          <div>
            <span className="text-gray-500">Current Price:</span>
            <span className="text-white ml-2">${currentPrice.toFixed(4)}</span>
          </div>
          <div>
            <span className="text-gray-500">Position Value:</span>
            <span className="text-white ml-2">${positionValueUSD.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* New Range Input */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">New Min Price</label>
            <input
              type="number"
              value={newPriceLower}
              onChange={(e) => setNewPriceLower(parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cetus-accent focus:outline-none"
              step="0.0001"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">New Max Price</label>
            <input
              type="number"
              value={newPriceUpper}
              onChange={(e) => setNewPriceUpper(parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cetus-accent focus:outline-none"
              step="0.0001"
            />
          </div>
        </div>

        {/* Quick Range Buttons */}
        <div className="flex gap-2">
          {[5, 10, 20, 50].map((percent) => (
            <button
              key={percent}
              onClick={() => handleAutoCenter(percent)}
              className="flex-1 py-2 px-3 bg-gray-800 hover:bg-cetus-primary/30 border border-gray-700 hover:border-cetus-primary rounded-lg text-sm text-gray-300 hover:text-white transition-all"
            >
              ±{percent}%
            </button>
          ))}
        </div>

        {/* Gas Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Gas Cost (SUI)</label>
            <input
              type="number"
              value={gasCostSUI}
              onChange={(e) => setGasCostSUI(parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:border-cetus-accent focus:outline-none"
              step="0.001"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">SUI Price (USD)</label>
            <input
              type="number"
              value={suiPriceUSD}
              onChange={(e) => setSuiPriceUSD(parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:border-cetus-accent focus:outline-none"
              step="0.01"
            />
          </div>
        </div>

        <button
          onClick={handleSimulate}
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold rounded-xl transition-all"
        >
          🔄 Simulate Rebalance
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-6 space-y-4">
          {/* Recommendation */}
          <div className={`p-4 rounded-lg border ${getRecommendationColor(result.recommendation)}`}>
            <div className="flex items-center gap-2 mb-2">
              {result.recommendation === 'recommended' && <span>✅</span>}
              {result.recommendation === 'not-recommended' && <span>❌</span>}
              {result.recommendation === 'neutral' && <span>⚠️</span>}
              <span className="font-semibold capitalize">{result.recommendation.replace('-', ' ')}</span>
            </div>
            <p className="text-sm opacity-80">{result.reason}</p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-xs uppercase">Gas Cost</p>
              <p className="text-xl font-bold text-white">${result.gasCostUSD.toFixed(4)}</p>
              <p className="text-xs text-gray-500">{gasCostSUI * 2} SUI × 2 tx</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-xs uppercase">New APY</p>
              <p className="text-xl font-bold text-cetus-accent">{result.newAPY.toFixed(2)}%</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-xs uppercase">Break-Even</p>
              <p className="text-xl font-bold text-white">
                {result.breakEvenDays === Infinity ? '∞' : `${result.breakEvenDays.toFixed(1)} days`}
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
            <p className="text-blue-400 font-medium">💡 What is Rebalancing?</p>
            <p className="text-blue-300/80 mt-1">
              Rebalancing means removing your liquidity and adding it back at a new price range. 
              This costs gas but can increase your APY if the current price is near or outside your range.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RebalanceSimulator;
