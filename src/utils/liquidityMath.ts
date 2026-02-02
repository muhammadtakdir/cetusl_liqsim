import BN from 'bn.js';
import { tickToSqrtPriceX64, tickToPrice } from './tickMath';

/**
 * Estimate liquidity from coin amounts for a CLMM position
 * Based on Cetus SDK ClmmPoolUtil.estimateLiquidityFromCoinAmounts
 */
export function estimateLiquidityFromAmounts(
  currentSqrtPriceX64: BN,
  tickLower: number,
  tickUpper: number,
  amountA: BN,
  amountB: BN
): BN {
  const sqrtPriceLowerX64 = tickToSqrtPriceX64(tickLower);
  const sqrtPriceUpperX64 = tickToSqrtPriceX64(tickUpper);

  // Get liquidity from each token amount
  const liquidityFromA = getLiquidityFromAmountA(
    currentSqrtPriceX64,
    sqrtPriceUpperX64,
    amountA
  );
  const liquidityFromB = getLiquidityFromAmountB(
    sqrtPriceLowerX64,
    currentSqrtPriceX64,
    amountB
  );

  // Current price position determines which liquidity to use
  if (currentSqrtPriceX64.lte(sqrtPriceLowerX64)) {
    // Price below range - only token A
    return liquidityFromA;
  } else if (currentSqrtPriceX64.gte(sqrtPriceUpperX64)) {
    // Price above range - only token B
    return liquidityFromB;
  } else {
    // Price in range - use minimum to ensure both amounts are covered
    return BN.min(liquidityFromA, liquidityFromB);
  }
}

/**
 * Get liquidity from token A amount
 * L = amountA * sqrt(P) * sqrt(Pb) / (sqrt(Pb) - sqrt(P))
 */
function getLiquidityFromAmountA(
  sqrtPriceCurrentX64: BN,
  sqrtPriceUpperX64: BN,
  amountA: BN
): BN {
  if (sqrtPriceCurrentX64.gte(sqrtPriceUpperX64)) {
    return new BN(0);
  }

  const numerator = amountA.mul(sqrtPriceCurrentX64).mul(sqrtPriceUpperX64);
  const denominator = sqrtPriceUpperX64.sub(sqrtPriceCurrentX64);
  
  if (denominator.isZero()) {
    return new BN(0);
  }
  
  return numerator.div(denominator).shrn(64);
}

/**
 * Get liquidity from token B amount
 * L = amountB / (sqrt(P) - sqrt(Pa))
 */
function getLiquidityFromAmountB(
  sqrtPriceLowerX64: BN,
  sqrtPriceCurrentX64: BN,
  amountB: BN
): BN {
  if (sqrtPriceCurrentX64.lte(sqrtPriceLowerX64)) {
    return new BN(0);
  }

  const denominator = sqrtPriceCurrentX64.sub(sqrtPriceLowerX64);
  
  if (denominator.isZero()) {
    return new BN(0);
  }
  
  return amountB.shln(64).div(denominator);
}

/**
 * Get coin amounts from liquidity at a specific price
 * Based on Cetus SDK ClmmPoolUtil.getCoinAmountFromLiquidity
 */
export function getCoinAmountsFromLiquidity(
  liquidity: BN,
  sqrtPriceX64: BN,
  tickLower: number,
  tickUpper: number
): { amountA: BN; amountB: BN } {
  const sqrtPriceLowerX64 = tickToSqrtPriceX64(tickLower);
  const sqrtPriceUpperX64 = tickToSqrtPriceX64(tickUpper);

  let amountA = new BN(0);
  let amountB = new BN(0);

  if (sqrtPriceX64.lte(sqrtPriceLowerX64)) {
    // Price below range - all in token A
    amountA = getAmountAFromLiquidity(sqrtPriceLowerX64, sqrtPriceUpperX64, liquidity);
  } else if (sqrtPriceX64.gte(sqrtPriceUpperX64)) {
    // Price above range - all in token B
    amountB = getAmountBFromLiquidity(sqrtPriceLowerX64, sqrtPriceUpperX64, liquidity);
  } else {
    // Price in range - both tokens
    amountA = getAmountAFromLiquidity(sqrtPriceX64, sqrtPriceUpperX64, liquidity);
    amountB = getAmountBFromLiquidity(sqrtPriceLowerX64, sqrtPriceX64, liquidity);
  }

  return { amountA, amountB };
}

/**
 * Get token A amount from liquidity
 * amountA = L * (sqrt(Pb) - sqrt(P)) / (sqrt(P) * sqrt(Pb))
 */
function getAmountAFromLiquidity(
  sqrtPriceLowerX64: BN,
  sqrtPriceUpperX64: BN,
  liquidity: BN
): BN {
  const diff = sqrtPriceUpperX64.sub(sqrtPriceLowerX64);
  const numerator = liquidity.mul(diff).shln(64);
  const denominator = sqrtPriceLowerX64.mul(sqrtPriceUpperX64);
  
  if (denominator.isZero()) {
    return new BN(0);
  }
  
  return numerator.div(denominator);
}

/**
 * Get token B amount from liquidity
 * amountB = L * (sqrt(P) - sqrt(Pa))
 */
function getAmountBFromLiquidity(
  sqrtPriceLowerX64: BN,
  sqrtPriceUpperX64: BN,
  liquidity: BN
): BN {
  const diff = sqrtPriceUpperX64.sub(sqrtPriceLowerX64);
  return liquidity.mul(diff).shrn(64);
}

/**
 * Calculate position value in USD
 */
export function calculatePositionValueUSD(
  amountA: BN,
  amountB: BN,
  priceA: number,
  priceB: number,
  decimalsA: number,
  decimalsB: number
): number {
  const valueA = amountA.toNumber() / Math.pow(10, decimalsA) * priceA;
  const valueB = amountB.toNumber() / Math.pow(10, decimalsB) * priceB;
  return valueA + valueB;
}

/**
 * Calculate fees earned within a price range
 */
export function calculateFeesInRange(
  liquidity: BN,
  totalLiquidity: BN,
  volume24h: number,
  feeRate: number,
  tickLower: number,
  tickUpper: number,
  currentTick: number
): number {
  // Check if current price is in range
  const priceLower = tickToPrice(tickLower);
  const priceUpper = tickToPrice(tickUpper);
  const currentPrice = tickToPrice(currentTick);
  
  const inRange = currentPrice >= priceLower && currentPrice <= priceUpper;
  
  if (!inRange || totalLiquidity.isZero()) {
    return 0;
  }

  // Proportional share of fees
  const liquidityShare = liquidity.toNumber() / totalLiquidity.toNumber();
  const dailyFees = volume24h * feeRate * liquidityShare;
  
  return dailyFees;
}
