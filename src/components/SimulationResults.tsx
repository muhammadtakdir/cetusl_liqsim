import React from 'react';
import { SimulationResult } from '../types';
import { tickToPrice } from '../utils';
import { ILCurvePoint } from '../utils/clmmMath';

interface SimulationResultsProps {
  result: SimulationResult | null;
  clmmILData: ILCurvePoint[];
  tokenASymbol: string;
  tokenBSymbol: string;
  tickLower: number;
  tickUpper: number;
}

export const SimulationResults: React.FC<SimulationResultsProps> = ({
  result,
  clmmILData,
  tokenASymbol,
  tokenBSymbol,
  tickLower,
  tickUpper,
}) => {
  if (!result) {
    return (
      <div className="bg-cetus-card rounded-xl p-6 card-glow">
        <div className="text-center text-gray-400 py-8">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p>Enter liquidity parameters and run simulation</p>
        </div>
      </div>
    );
  }

  const priceLower = tickToPrice(tickLower);
  const priceUpper = tickToPrice(tickUpper);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-400 bg-green-500/20';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-500/20';
      case 'HIGH': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="bg-cetus-card rounded-xl p-6 card-glow">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-cetus-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Simulation Results
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Position Value</p>
            <p className="text-2xl font-bold text-white">${result.initialValueUSD.toFixed(2)}</p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Estimated APY</p>
            <p className="text-2xl font-bold text-cetus-accent">{result.estimatedAPY.toFixed(2)}%</p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Daily Fees</p>
            <p className="text-2xl font-bold text-green-400">${result.dailyFees.toFixed(4)}</p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Break-Even</p>
            <p className="text-2xl font-bold text-white">
              {result.breakEvenDays === Infinity ? '∞' : `${Math.round(result.breakEvenDays)} days`}
            </p>
          </div>
        </div>
      </div>

      {/* Price Range Summary */}
      <div className="bg-cetus-card rounded-xl p-6 card-glow">
        <h3 className="text-lg font-semibold text-white mb-4">Price Range</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Min Price</p>
            <p className="text-xl font-semibold text-white">{priceLower.toFixed(6)}</p>
            <p className="text-xs text-gray-500">{tokenBSymbol}/{tokenASymbol}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Max Price</p>
            <p className="text-xl font-semibold text-white">{priceUpper.toFixed(6)}</p>
            <p className="text-xs text-gray-500">{tokenBSymbol}/{tokenASymbol}</p>
          </div>
        </div>
      </div>

      {/* Risk Assessment */}
      <div className="bg-cetus-card rounded-xl p-6 card-glow">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Risk Assessment
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Overall Risk</p>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(result.risks.overallRisk)}`}>
              {result.risks.overallRisk}
            </span>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Out of Range</p>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(result.risks.outOfRangeRisk)}`}>
              {result.risks.outOfRangeRisk}
            </span>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Volatility</p>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(result.risks.volatilityRisk)}`}>
              {result.risks.volatilityRisk}
            </span>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">IL Risk</p>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(result.risks.ilRisk)}`}>
              {result.risks.ilRisk}
            </span>
          </div>
        </div>

        {result.risks.warnings.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-yellow-400 font-medium mb-2">⚠️ Warnings</p>
            <ul className="space-y-1">
              {result.risks.warnings.map((warning, index) => (
                <li key={index} className="text-yellow-300/80 text-sm">• {warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* IL Scenarios Table */}
      <div className="bg-cetus-card rounded-xl p-6 card-glow overflow-x-auto">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
          Impermanent Loss Scenarios
        </h3>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-3 px-2">Price Change</th>
              <th className="text-right py-3 px-2">New Price</th>
              <th className="text-right py-3 px-2">Value if HODL</th>
              <th className="text-right py-3 px-2">Value in Pool</th>
              <th className="text-right py-3 px-2">IL (CLMM)</th>
              <th className="text-right py-3 px-2">IL (V2)</th>
            </tr>
          </thead>
          <tbody>
            {clmmILData.filter((_, i) => i % 4 === 0 || clmmILData.length < 20).map((data, index) => (
              <tr key={index} className={`border-b border-gray-800 hover:bg-gray-800/30 ${data.isOutOfRange ? 'bg-red-900/20' : ''}`}>
                <td className={`py-3 px-2 ${data.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {data.priceChange >= 0 ? '+' : ''}{data.priceChange.toFixed(0)}%
                  {data.isOutOfRange && <span className="ml-1 text-xs text-red-400">⚠️</span>}
                </td>
                <td className="text-right py-3 px-2 text-white">
                  ${data.targetPrice.toFixed(4)}
                </td>
                <td className="text-right py-3 px-2 text-gray-300">
                  ${data.valueHold.toFixed(2)}
                </td>
                <td className="text-right py-3 px-2 text-gray-300">
                  ${data.valuePool.toFixed(2)}
                </td>
                <td className={`text-right py-3 px-2 font-medium ${data.ilPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {data.ilPercentage >= 0 ? '+' : ''}{data.ilPercentage.toFixed(2)}%
                </td>
                <td className="text-right py-3 px-2 text-gray-500">
                  {data.ilV2Percentage.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SimulationResults;
