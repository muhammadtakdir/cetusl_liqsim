import BN from 'bn.js';

// Constants
const Q64 = new BN(1).shln(64); // 2^64
const LOG_B_2_X64 = new BN('18446744073709551616'); // log_b(2) * 2^64 where b = 1.0001

/**
 * Converts a tick index to sqrt price X64
 * Formula: sqrt(1.0001^tick) * 2^64
 */
export function tickToSqrtPriceX64(tick: number): BN {
  if (tick >= 0) {
    return positiveTickToSqrtPriceX64(tick);
  } else {
    return negativeTickToSqrtPriceX64(tick);
  }
}

function positiveTickToSqrtPriceX64(tick: number): BN {
  // sqrt(1.0001^tick) = 1.0001^(tick/2)
  let ratio = Q64;
  
  if (tick & 1) ratio = ratio.mul(new BN('18446920394820956382')).shrn(64);
  if (tick & 2) ratio = ratio.mul(new BN('18447543041086839124')).shrn(64);
  if (tick & 4) ratio = ratio.mul(new BN('18448788321568618856')).shrn(64);
  if (tick & 8) ratio = ratio.mul(new BN('18451278912259688804')).shrn(64);
  if (tick & 16) ratio = ratio.mul(new BN('18456260700440286180')).shrn(64);
  if (tick & 32) ratio = ratio.mul(new BN('18466227088285128992')).shrn(64);
  if (tick & 64) ratio = ratio.mul(new BN('18486176269077767396')).shrn(64);
  if (tick & 128) ratio = ratio.mul(new BN('18526121399127943904')).shrn(64);
  if (tick & 256) ratio = ratio.mul(new BN('18606151220093388560')).shrn(64);
  if (tick & 512) ratio = ratio.mul(new BN('18766697328019620032')).shrn(64);
  if (tick & 1024) ratio = ratio.mul(new BN('19089995656998392688')).shrn(64);
  if (tick & 2048) ratio = ratio.mul(new BN('19744342969342036992')).shrn(64);
  if (tick & 4096) ratio = ratio.mul(new BN('21082570671088890880')).shrn(64);
  if (tick & 8192) ratio = ratio.mul(new BN('23877027239886474240')).shrn(64);
  if (tick & 16384) ratio = ratio.mul(new BN('30652171879639855104')).shrn(64);
  if (tick & 32768) ratio = ratio.mul(new BN('50462168082356239360')).shrn(64);
  if (tick & 65536) ratio = ratio.mul(new BN('136757009941330165760')).shrn(64);
  if (tick & 131072) ratio = ratio.mul(new BN('1005195981313053343232')).shrn(64);
  if (tick & 262144) ratio = ratio.mul(new BN('54353303137758275584000')).shrn(64);
  
  return ratio;
}

function negativeTickToSqrtPriceX64(tick: number): BN {
  const absTick = Math.abs(tick);
  const sqrtPrice = positiveTickToSqrtPriceX64(absTick);
  
  // Invert: 2^128 / sqrtPrice
  const Q128 = new BN(1).shln(128);
  return Q128.div(sqrtPrice);
}

/**
 * Converts sqrt price X64 to tick index
 */
export function sqrtPriceX64ToTick(sqrtPriceX64: BN): number {
  // tick = log_{1.0001}(sqrtPrice^2)
  // = 2 * log_{1.0001}(sqrtPrice)
  // = 2 * log(sqrtPrice) / log(1.0001)
  
  const sqrtPriceNum = sqrtPriceX64.toNumber() / Math.pow(2, 64);
  const tick = Math.floor(Math.log(sqrtPriceNum * sqrtPriceNum) / Math.log(1.0001));
  return tick;
}

/**
 * Convert price to tick
 */
export function priceToTick(price: number): number {
  return Math.floor(Math.log(price) / Math.log(1.0001));
}

/**
 * Convert tick to price
 */
export function tickToPrice(tick: number): number {
  return Math.pow(1.0001, tick);
}

/**
 * Convert sqrt price X64 to actual price
 */
export function sqrtPriceX64ToPrice(sqrtPriceX64: BN, decimalsA: number, decimalsB: number): number {
  const sqrtPrice = sqrtPriceX64.toNumber() / Math.pow(2, 64);
  const price = sqrtPrice * sqrtPrice;
  return price * Math.pow(10, decimalsA - decimalsB);
}

/**
 * Convert price to sqrt price X64
 * Handles large numbers safely using string representation
 */
export function priceToSqrtPriceX64(price: number, decimalsA: number, decimalsB: number): BN {
  if (price <= 0) {
    return new BN(0);
  }
  
  const adjustedPrice = price / Math.pow(10, decimalsA - decimalsB);
  const sqrtPrice = Math.sqrt(adjustedPrice);
  
  // Use BigInt for large number arithmetic, then convert to BN
  // 2^64 is too large for regular number, so we use string
  const TWO_POW_64 = BigInt('18446744073709551616'); // 2^64
  const sqrtPriceScaled = BigInt(Math.floor(sqrtPrice * 1e18)) * TWO_POW_64 / BigInt(1e18);
  
  return new BN(sqrtPriceScaled.toString());
}

/**
 * Align tick to tick spacing
 */
export function alignTickToSpacing(tick: number, tickSpacing: number, roundUp: boolean): number {
  if (roundUp) {
    return Math.ceil(tick / tickSpacing) * tickSpacing;
  }
  return Math.floor(tick / tickSpacing) * tickSpacing;
}

/**
 * Get default tick range for a pool based on volatility
 */
export function getDefaultTickRange(currentTick: number, tickSpacing: number, rangePercent: number = 50): { tickLower: number; tickUpper: number } {
  // Convert percentage to ticks
  // price change = 1.0001^(tick change) - 1
  // tick change = log(1 + percent) / log(1.0001)
  
  const lowerPercent = rangePercent / 100;
  const upperPercent = rangePercent / 100;
  
  const ticksLower = Math.floor(Math.log(1 - lowerPercent) / Math.log(1.0001));
  const ticksUpper = Math.ceil(Math.log(1 + upperPercent) / Math.log(1.0001));
  
  return {
    tickLower: alignTickToSpacing(currentTick + ticksLower, tickSpacing, false),
    tickUpper: alignTickToSpacing(currentTick + ticksUpper, tickSpacing, true),
  };
}

export { LOG_B_2_X64, Q64 };
