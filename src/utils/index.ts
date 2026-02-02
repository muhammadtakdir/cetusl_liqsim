export { tickToSqrtPriceX64, sqrtPriceX64ToTick, priceToTick, tickToPrice, sqrtPriceX64ToPrice, priceToSqrtPriceX64, alignTickToSpacing, getDefaultTickRange } from './tickMath';
export { estimateLiquidityFromAmounts, getCoinAmountsFromLiquidity, calculatePositionValueUSD, calculateFeesInRange } from './liquidityMath';
export { calculateImpermanentLoss, generateILCurve, calculateStandardAMMIL, calculateAPY, assessRisk, calculateBreakEvenDays, runSimulation } from './simulation';

// New CLMM Math - Corrected formulas
export { 
  getAmountsForLiquidity, 
  getLiquidityFromAmounts, 
  calculateCLMM_IL, 
  generateILCurve as generateCLMMILCurve,
  calculateStandardAMM_IL,
  calculateCLMMAPY,
  simulateRebalance,
  type CLMMILResult,
  type ILCurvePoint,
  type RebalanceScenario 
} from './clmmMath';
