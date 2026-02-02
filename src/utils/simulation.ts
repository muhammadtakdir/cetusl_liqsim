import BN from 'bn.js';
import { ILDataPoint, RiskAssessment, SimulationResult } from '../types';
import { priceToSqrtPriceX64, tickToPrice } from './tickMath';
import { getCoinAmountsFromLiquidity, estimateLiquidityFromAmounts } from './liquidityMath';

/**
 * Calculate Impermanent Loss for a price change
 * 
 * For CLMM: IL depends on whether price stays in range
 * - In range: IL follows concentrated liquidity formula
 * - Out of range: Position is 100% in one token
 */
export function calculateImpermanentLoss(
  initialPriceA: number,
  newPriceA: number,
  priceB: number, // Assuming stablecoin = $1
  tickLower: number,
  tickUpper: number,
  initialAmountA: BN,
  initialAmountB: BN,
  liquidity: BN,
  decimalsA: number,
  decimalsB: number
): ILDataPoint {
  const priceChange = ((newPriceA - initialPriceA) / initialPriceA) * 100;
  
  // Value if held (no LP)
  const holdValueA = initialAmountA.toNumber() / Math.pow(10, decimalsA) * newPriceA;
  const holdValueB = initialAmountB.toNumber() / Math.pow(10, decimalsB) * priceB;
  const valueIfHold = holdValueA + holdValueB;

  // Calculate new sqrt price
  const newSqrtPriceX64 = priceToSqrtPriceX64(newPriceA / priceB, decimalsA, decimalsB);
  
  // Get new amounts in pool at new price
  const { amountA: newAmountA, amountB: newAmountB } = getCoinAmountsFromLiquidity(
    liquidity,
    newSqrtPriceX64,
    tickLower,
    tickUpper
  );

  // Value in pool
  const poolValueA = newAmountA.toNumber() / Math.pow(10, decimalsA) * newPriceA;
  const poolValueB = newAmountB.toNumber() / Math.pow(10, decimalsB) * priceB;
  const valueInPool = poolValueA + poolValueB;

  // IL = (valueInPool / valueIfHold) - 1
  const impermanentLoss = valueIfHold > 0 ? ((valueInPool / valueIfHold) - 1) * 100 : 0;

  return {
    priceChange,
    newPrice: newPriceA,
    impermanentLoss,
    valueIfHold,
    valueInPool,
  };
}

/**
 * Generate IL data points for a range of price changes
 */
export function generateILCurve(
  currentPriceA: number,
  priceB: number,
  tickLower: number,
  tickUpper: number,
  initialAmountA: BN,
  initialAmountB: BN,
  liquidity: BN,
  decimalsA: number,
  decimalsB: number,
  priceChangeSteps: number[] = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 50, 75, 100]
): ILDataPoint[] {
  return priceChangeSteps.map(changePercent => {
    const newPriceA = currentPriceA * (1 + changePercent / 100);
    return calculateImpermanentLoss(
      currentPriceA,
      newPriceA,
      priceB,
      tickLower,
      tickUpper,
      initialAmountA,
      initialAmountB,
      liquidity,
      decimalsA,
      decimalsB
    );
  });
}

/**
 * Standard AMM IL formula for comparison
 * IL = 2 * sqrt(k) / (1 + k) - 1
 * where k = new_price / initial_price
 */
export function calculateStandardAMMIL(priceRatio: number): number {
  const sqrtK = Math.sqrt(priceRatio);
  return (2 * sqrtK / (1 + priceRatio) - 1) * 100;
}

/**
 * Calculate APY from fees
 */
export function calculateAPY(
  dailyFees: number,
  positionValueUSD: number
): number {
  if (positionValueUSD <= 0) return 0;
  
  const dailyYield = dailyFees / positionValueUSD;
  // APY with compounding
  const apy = (Math.pow(1 + dailyYield, 365) - 1) * 100;
  
  return Math.min(apy, 10000); // Cap at 10000% APY
}

/**
 * Assess risk levels for a position
 */
export function assessRisk(
  currentPrice: number,
  priceLower: number,
  priceUpper: number,
  _volatility: number = 0.5, // Default 50% annual volatility (reserved for future use)
  rangeWidth: number
): RiskAssessment {
  const warnings: string[] = [];
  
  // Distance to range boundaries
  const distanceToLower = (currentPrice - priceLower) / currentPrice;
  const distanceToUpper = (priceUpper - currentPrice) / currentPrice;
  const minDistance = Math.min(distanceToLower, distanceToUpper);
  
  // Out of range risk
  let outOfRangeRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  if (minDistance < 0.1) {
    outOfRangeRisk = 'HIGH';
    warnings.push('Price is very close to range boundary. High risk of going out of range.');
  } else if (minDistance < 0.25) {
    outOfRangeRisk = 'MEDIUM';
    warnings.push('Price is moderately close to range boundary.');
  } else {
    outOfRangeRisk = 'LOW';
  }

  // Volatility risk based on range width
  let volatilityRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  if (rangeWidth < 0.2) {
    volatilityRisk = 'HIGH';
    warnings.push('Narrow range increases impermanent loss risk during volatility.');
  } else if (rangeWidth < 0.5) {
    volatilityRisk = 'MEDIUM';
  } else {
    volatilityRisk = 'LOW';
  }

  // IL risk based on concentration
  let ilRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  const concentration = 1 / rangeWidth; // Higher = more concentrated
  if (concentration > 5) {
    ilRisk = 'HIGH';
    warnings.push('High concentration means higher IL if price moves significantly.');
  } else if (concentration > 2) {
    ilRisk = 'MEDIUM';
  } else {
    ilRisk = 'LOW';
  }

  // Overall risk
  const riskScores = { LOW: 1, MEDIUM: 2, HIGH: 3 };
  const avgRisk = (riskScores[outOfRangeRisk] + riskScores[volatilityRisk] + riskScores[ilRisk]) / 3;
  const overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' = avgRisk > 2.3 ? 'HIGH' : avgRisk > 1.6 ? 'MEDIUM' : 'LOW';

  return {
    outOfRangeRisk,
    volatilityRisk,
    ilRisk,
    overallRisk,
    warnings,
  };
}

/**
 * Calculate break-even days (when fees offset potential IL)
 */
export function calculateBreakEvenDays(
  potentialIL: number, // In USD
  dailyFees: number
): number {
  if (dailyFees <= 0) return Infinity;
  return Math.abs(potentialIL) / dailyFees;
}

/**
 * Run full simulation
 */
export function runSimulation(
  amountAInput: number,
  amountBInput: number,
  currentPriceA: number,
  priceB: number,
  tickLower: number,
  tickUpper: number,
  decimalsA: number,
  decimalsB: number,
  feeRate: number,
  volume24h: number,
  totalLiquidityUSD: number
): SimulationResult {
  // Validate inputs
  if (amountAInput <= 0 && amountBInput <= 0) {
    throw new Error('At least one amount must be positive');
  }
  
  // Convert amounts to BN with proper decimals
  const amountA = new BN(Math.floor(Math.max(0, amountAInput) * Math.pow(10, decimalsA)));
  const amountB = new BN(Math.floor(Math.max(0, amountBInput) * Math.pow(10, decimalsB)));
  
  // Calculate current sqrt price
  const currentSqrtPriceX64 = priceToSqrtPriceX64(currentPriceA / priceB, decimalsA, decimalsB);
  
  // Estimate liquidity
  const liquidity = estimateLiquidityFromAmounts(
    currentSqrtPriceX64,
    tickLower,
    tickUpper,
    amountA,
    amountB
  );

  // Calculate initial position value
  const initialValueUSD = (amountAInput * currentPriceA) + (amountBInput * priceB);

  // Generate IL curve
  const ilByPriceChange = generateILCurve(
    currentPriceA,
    priceB,
    tickLower,
    tickUpper,
    amountA,
    amountB,
    liquidity,
    decimalsA,
    decimalsB
  );

  // Calculate fees
  const positionShare = totalLiquidityUSD > 0 ? initialValueUSD / totalLiquidityUSD : 0;
  const dailyFees = volume24h * feeRate * positionShare;
  const yearlyFees = dailyFees * 365;

  // Calculate APY
  const estimatedAPY = calculateAPY(dailyFees, initialValueUSD);

  // Assess risks
  const priceLower = tickToPrice(tickLower);
  const priceUpper = tickToPrice(tickUpper);
  const rangeWidth = (priceUpper - priceLower) / currentPriceA;
  const risks = assessRisk(currentPriceA, priceLower, priceUpper, 0.5, rangeWidth);

  // Break-even calculation (using 20% price move IL as reference)
  const il20 = ilByPriceChange.find(d => Math.abs(d.priceChange - 20) < 5);
  const potentialIL20 = il20 ? Math.abs(il20.impermanentLoss / 100 * initialValueUSD) : 0;
  const breakEvenDays = calculateBreakEvenDays(potentialIL20, dailyFees);

  return {
    liquidity,
    initialValueUSD,
    ilByPriceChange,
    estimatedAPY,
    dailyFees,
    yearlyFees,
    risks,
    breakEvenDays,
  };
}
