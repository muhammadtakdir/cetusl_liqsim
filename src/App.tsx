import { useState, useCallback, useMemo } from 'react';
import {
  Header,
  PoolSelector,
  PoolStats,
  LiquidityInput,
  SimulationResults,
  CLMMILChart,
  RebalanceSimulator,
} from './components';
import { SimulationResult } from './types';
import { runSimulation, priceToTick, alignTickToSpacing, tickToPrice } from './utils';
import { generateILCurve as generateCLMMILCurve, ILCurvePoint } from './utils/clmmMath';
import { PoolInfo } from './services/cetusSdk';

function App() {
  // Pool selection - now using real pool data from SDK
  const [selectedPool, setSelectedPool] = useState<PoolInfo | null>(null);

  // Liquidity inputs
  const [amountA, setAmountA] = useState(100);
  const [amountB, setAmountB] = useState(100);
  
  // Price range (ticks)
  const [tickLower, setTickLower] = useState(-2000);
  const [tickUpper, setTickUpper] = useState(2000);

  // Simulation result
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [clmmILData, setCLMMILData] = useState<ILCurvePoint[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState<'simulation' | 'rebalance'>('simulation');

  // Handle pool selection
  const handlePoolSelect = useCallback((pool: PoolInfo) => {
    setSelectedPool(pool);
    
    // Update tick range based on new pool
    if (pool.currentPrice > 0) {
      const currentTick = priceToTick(pool.currentPrice);
      const tickRange = 2000; // Default ~20% range
      setTickLower(alignTickToSpacing(currentTick - tickRange, pool.tickSpacing, false));
      setTickUpper(alignTickToSpacing(currentTick + tickRange, pool.tickSpacing, true));
    }
    
    // Reset simulation results
    setResult(null);
    setCLMMILData([]);
  }, []);

  // Run simulation
  const handleSimulate = useCallback(() => {
    if (!selectedPool) return;

    setIsSimulating(true);

    // Simulate async operation
    setTimeout(() => {
      try {
        // Get price range from ticks
        const priceLower = tickToPrice(tickLower);
        const priceUpper = tickToPrice(tickUpper);
        
        console.log('Simulation params:', {
          tickLower, tickUpper, priceLower, priceUpper,
          amountA, amountB, currentPrice: selectedPool.currentPrice
        });

        // Validate range
        if (priceLower >= priceUpper || priceLower <= 0 || priceUpper <= 0) {
          console.error('Invalid price range:', { priceLower, priceUpper });
          setIsSimulating(false);
          return;
        }

        console.log('Running runSimulation...');
        // Run original simulation for basic metrics
        const simulationResult = runSimulation(
          amountA,
          amountB,
          selectedPool.currentPrice,
          1, // Price B (stablecoin = $1)
          tickLower,
          tickUpper,
          selectedPool.coinDecimalsA,
          selectedPool.coinDecimalsB,
          selectedPool.feeRate,
          0, // volume_24h - not available from SDK fallback
          0  // tvl - not available from SDK fallback
        );
        console.log('runSimulation done:', simulationResult);

        console.log('Running generateCLMMILCurve...');
        // Generate CLMM IL curve using CORRECT formulas
        // This uses the correct formulas for CLMM, not traditional AMM
        const clmmCurve = generateCLMMILCurve(
          selectedPool.currentPrice,
          priceLower,
          priceUpper,
          amountA,
          amountB,
          { min: -80, max: 200, steps: 40 }
        );
        console.log('generateCLMMILCurve done:', clmmCurve);

        setResult(simulationResult);
        setCLMMILData(clmmCurve);
      } catch (error) {
        console.error('Simulation error:', error);
      } finally {
        setIsSimulating(false);
      }
    }, 500);
  }, [selectedPool, amountA, amountB, tickLower, tickUpper]);

  // Calculate price range for display
  const priceLower = useMemo(() => tickToPrice(tickLower), [tickLower]);
  const priceUpper = useMemo(() => tickToPrice(tickUpper), [tickUpper]);

  if (!selectedPool) {
    return (
      <div className="min-h-screen bg-cetus-dark">
        <Header />
        <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="mb-6 sm:mb-8 text-center">
            <h2 className="text-xl sm:text-3xl font-bold text-white mb-2">
              Simulate Your <span className="text-cetus-accent">CLMM Position</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto px-4">
              Select a pool to start simulating your liquidity position.
            </p>
          </div>
          <div className="max-w-md mx-auto">
            <PoolSelector
              selectedPoolId=""
              onSelectPool={handlePoolSelect}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cetus-dark">
      <Header />
      
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Page Title */}
        <div className="mb-4 sm:mb-8 text-center">
          <h2 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">
            Simulate Your <span className="text-cetus-accent">CLMM Position</span>
          </h2>
          <p className="text-xs sm:text-base text-gray-400 max-w-2xl mx-auto px-2 hidden sm:block">
            Calculate potential impermanent loss, estimate APY from trading fees, and assess risks 
            before providing liquidity on Cetus DEX.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Inputs */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            <PoolSelector
              selectedPoolId={selectedPool?.poolId || ''}
              onSelectPool={handlePoolSelect}
            />

            <PoolStats
              currentPrice={selectedPool.currentPrice}
              volume24h={0}
              tvl={0}
              feeRate={selectedPool.feeRate}
              tokenASymbol={selectedPool.coinSymbolA}
              tokenBSymbol={selectedPool.coinSymbolB}
            />

            <LiquidityInput
              amountA={amountA}
              amountB={amountB}
              tickLower={tickLower}
              tickUpper={tickUpper}
              currentPrice={selectedPool.currentPrice}
              tokenASymbol={selectedPool.coinSymbolA}
              tokenBSymbol={selectedPool.coinSymbolB}
              tickSpacing={selectedPool.tickSpacing}
              onAmountAChange={setAmountA}
              onAmountBChange={setAmountB}
              onTickLowerChange={setTickLower}
              onTickUpperChange={setTickUpper}
            />

            {/* Simulate Button */}
            <button
              onClick={handleSimulate}
              disabled={isSimulating}
              className="w-full py-3 sm:py-4 bg-gradient-to-r from-cetus-primary to-cetus-accent hover:from-cetus-primary/80 hover:to-cetus-accent/80 text-white font-bold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {isSimulating ? (
                <>
                  <svg className="animate-spin w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Simulating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Run Simulation
                </>
              )}
            </button>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Tab Switcher */}
            <div className="flex gap-1 sm:gap-2 bg-cetus-card rounded-lg p-1">
              <button
                onClick={() => setActiveTab('simulation')}
                className={`flex-1 py-2 px-2 sm:px-4 rounded-md font-medium transition-all text-xs sm:text-base ${
                  activeTab === 'simulation' 
                    ? 'bg-cetus-primary text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📊 IL Simulation
              </button>
              <button
                onClick={() => setActiveTab('rebalance')}
                className={`flex-1 py-2 px-2 sm:px-4 rounded-md font-medium transition-all text-xs sm:text-base ${
                  activeTab === 'rebalance' 
                    ? 'bg-cetus-primary text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🔄 Rebalancing
              </button>
            </div>

            {activeTab === 'simulation' ? (
              <>
                {/* CLMM IL Chart - Using correct formulas */}
                <CLMMILChart
                  ilData={clmmILData}
                  tokenASymbol={selectedPool.coinSymbolA}
                  currentPrice={selectedPool.currentPrice}
                  priceLower={priceLower}
                  priceUpper={priceUpper}
                />

                {/* Simulation Results */}
                <SimulationResults
                  result={result}
                  clmmILData={clmmILData}
                  tokenASymbol={selectedPool.coinSymbolA}
                  tokenBSymbol={selectedPool.coinSymbolB}
                  tickLower={tickLower}
                  tickUpper={tickUpper}
                  currentPrice={selectedPool.currentPrice}
                />
              </>
            ) : (
              /* Rebalancing Simulator */
              <RebalanceSimulator
                currentPrice={selectedPool.currentPrice}
                currentPriceLower={priceLower}
                currentPriceUpper={priceUpper}
                positionValueUSD={(amountA * selectedPool.currentPrice) + amountB}
                dailyVolume={0}
                feeRate={selectedPool.feeRate}
                totalPoolTVL={0}
                tokenASymbol={selectedPool.coinSymbolA}
                tokenBSymbol={selectedPool.coinSymbolB}
              />
            )}
          </div>
        </div>

        {/* Educational Section */}
        <div className="mt-12 bg-cetus-card rounded-xl p-8 card-glow">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-cetus-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Cetus CLMM Mechanics
          </h3>
          
          <div className="grid md:grid-cols-3 gap-6 text-gray-300">
            <div>
              <h4 className="font-semibold text-white mb-2">📊 Active Liquidity</h4>
              <p className="text-sm">
                <strong>Position states sesuai docs:</strong><br/>
                • P &lt; Pa: 100% Token Y (quote)<br/>
                • P &gt; Pb: 100% Token X (base)<br/>
                • Pa ≤ P ≤ Pb: Mix of both tokens<br/>
                Only in-range positions earn fees!
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">💰 Fee Structure</h4>
              <p className="text-sm">
                <strong>Cetus CLMM Fees:</strong><br/>
                • 80% → Liquidity Providers<br/>
                • 20% → Protocol Treasury<br/>
                • 16 fee tiers: 0.01% - 4%<br/>
                Fees distributed proportionally to active liquidity.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">⛏️ Fee-Based Mining</h4>
              <p className="text-sm">
                <strong>Mining rewards based on:</strong><br/>
                • Actual fee contribution, not just TVL<br/>
                • Only active positions get rewards<br/>
                • More efficient = higher rewards<br/>
                Inactive positions don't dilute rewards.
              </p>
            </div>
          </div>

          {/* Formula Section */}
          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
            <h4 className="font-semibold text-white mb-3">📐 CLMM Formulas (from Cetus Docs)</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 mb-1">Active Liquidity Position:</p>
                <code className="text-cetus-accent">(x + L/√Pb) · (y + L·√Pa) = L²</code>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Token amounts in range:</p>
                <code className="text-cetus-accent">x = L(1/√P - 1/√Pb), y = L(√P - √Pa)</code>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              <p>• IL = (V_pool / V_hold) - 1, where V_pool = position value at new price</p>
              <p>• Pool liquidity: L_pool = Σ(L_i) for all active positions</p>
              <p>• Source: <a href="https://cetus-1.gitbook.io/cetus-docs/clmm/mechanics" target="_blank" rel="noopener noreferrer" className="text-cetus-accent hover:underline">Cetus CLMM Docs</a></p>
            </div>
          </div>

          {/* Range Orders Info */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h4 className="font-semibold text-white mb-2">💡 Pro Tip: Range Orders</h4>
            <p className="text-sm text-gray-300">
              CLMM positions can act as <strong>limit orders</strong>: Set a narrow range above/below current price. 
              When price crosses your range, your tokens swap automatically. 
              But remember: if price fluctuates back, the swap may reverse!
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>Built for Cetus Protocol on Sui Network • Educational Tool Only</p>
          <p className="mt-1">Not financial advice. Always DYOR before providing liquidity.</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
