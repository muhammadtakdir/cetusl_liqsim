export { tickToSqrtPriceX64, sqrtPriceX64ToTick, priceToTick, tickToPrice, sqrtPriceX64ToPrice, priceToSqrtPriceX64, alignTickToSpacing, getDefaultTickRange } from './tickMath';
export { estimateLiquidityFromAmounts, getCoinAmountsFromLiquidity, calculatePositionValueUSD, calculateFeesInRange } from './liquidityMath';
export { calculateImpermanentLoss, generateILCurve, calculateStandardAMMIL, calculateAPY, assessRisk, calculateBreakEvenDays, runSimulation } from './simulation';

// New CLMM Math - Corrected formulas sesuai Cetus docs
export { 
  // Position calculations
  getAmountsForLiquidity, 
  getLiquidityFromAmounts, 
  
  // IL calculations
  calculateCLMM_IL, 
  generateILCurve as generateCLMMILCurve,
  calculateStandardAMM_IL,
  calculateAmplificationFactor,
  calculateV2_IL,
  calculateCLMM_IL_Analytical,
  
  // Fee & APY calculations
  calculateCLMMAPY,
  CETUS_PROTOCOL_FEE_RATE,
  CETUS_LP_FEE_SHARE,
  CETUS_FEE_TIERS,
  
  // Mining rewards
  calculateMiningRewards,
  
  // Rebalancing
  simulateRebalance,
  
  // Risk & Health assessment
  getILWarnings,
  calculatePositionHealth,
  
  // Types
  type CLMMILResult,
  type ILCurvePoint,
  type RebalanceScenario,
  type MiningRewardsResult,
  type ILWarning,
  type PositionHealth,
} from './clmmMath';
