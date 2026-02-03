/**
 * CLMM (Concentrated Liquidity) Math Utilities
 * 
 * PENTING: Rumus AMM tradisional (2√d/(1+d) - 1) TIDAK BERLAKU untuk CLMM!
 * 
 * Perbedaan Utama AMM V2 vs CLMM (Cetus/V3):
 * - V2: Liquidity selalu aktif di seluruh kurva harga (0 hingga ∞)
 * - CLMM: Liquidity hanya aktif dalam range [Pa, Pb]
 * 
 * Amplifikasi IL di CLMM:
 * - Range sempit = IL bisa 3-10x lebih tinggi dari V2
 * - Jika harga keluar range, posisi menjadi 100% satu token
 * - IL bisa mendekati -100% lebih cepat dibanding V2
 * 
 * Faktor amplifikasi ≈ 1 / (1 - 1/√n) dimana n = √(Pb/Pa)
 */

/**
 * Menghitung faktor amplifikasi IL berdasarkan lebar range
 * Range lebih sempit = amplifikasi lebih tinggi
 * 
 * @param priceLower - Batas bawah range (Pa)
 * @param priceUpper - Batas atas range (Pb)
 * @returns Faktor amplifikasi (1 = sama dengan V2, >1 = lebih buruk)
 */
export function calculateAmplificationFactor(priceLower: number, priceUpper: number): number {
  // n = √(Pb/Pa) - mengukur lebar range
  const n = Math.sqrt(priceUpper / priceLower);
  
  // Faktor amplifikasi ≈ 1 / (1 - 1/√n)
  // Untuk range sangat lebar (n → ∞), faktor → 1 (sama dengan V2)
  // Untuk range sempit, faktor meningkat drastis
  const amplification = 1 / (1 - 1 / Math.sqrt(n));
  
  return Math.max(1, amplification); // Minimal 1
}

/**
 * Rumus IL AMM Standar (V2) - untuk perbandingan
 * IL = 2√k / (1+k) - 1
 * dimana k = new_price / old_price
 */
export function calculateV2_IL(priceRatio: number): number {
  if (priceRatio <= 0) return 0;
  const sqrtK = Math.sqrt(priceRatio);
  return ((2 * sqrtK) / (1 + priceRatio) - 1) * 100;
}

/**
 * Rumus derivasi lengkap untuk IL CLMM di range [p_a, p_b]
 * Berdasarkan formula:
 * 
 * IL_{a,b}(k) = IL(k) × (√k + 1/√k - 2) / [√k(1 - 1/√n) + 1/√k(√n - 1) - (√n - 1/√n)]
 * 
 * dimana:
 * - k = P'/P (price ratio, harga baru / harga awal)
 * - n = √(Pb/Pa) (ukuran lebar range)
 * - IL(k) = 2√k/(1+k) - 1 (formula IL V2 standar)
 * 
 * Catatan: Rumus ini hanya berlaku saat harga DALAM range.
 * Jika harga keluar range, gunakan perhitungan value-based.
 * 
 * @param priceRatio k = P'/P
 * @param priceLower Pa
 * @param priceUpper Pb
 * @returns IL dalam persentase (negatif = loss)
 */
export function calculateCLMM_IL_Analytical(
  priceRatio: number,  // k = P'/P
  priceLower: number,  // Pa
  priceUpper: number   // Pb
): number {
  if (priceRatio <= 0 || priceLower <= 0 || priceUpper <= 0) return 0;
  if (priceRatio === 1) return 0; // No price change = no IL
  
  const k = priceRatio;
  const sqrtK = Math.sqrt(k);
  
  // n = √(Pb/Pa) - range width factor
  const n = Math.sqrt(priceUpper / priceLower);
  const sqrtN = Math.sqrt(n);
  
  // IL V2 standar (dalam decimal, bukan persen)
  const ilV2 = (2 * sqrtK) / (1 + k) - 1;
  
  // Numerator: √k + 1/√k - 2
  const numerator = sqrtK + (1 / sqrtK) - 2;
  
  // Denominator: √k(1 - 1/√n) + 1/√k(√n - 1) - (√n - 1/√n)
  const denominator = 
    sqrtK * (1 - 1 / sqrtN) + 
    (1 / sqrtK) * (sqrtN - 1) - 
    (sqrtN - 1 / sqrtN);
  
  // Avoid division by zero
  if (Math.abs(denominator) < 1e-10) {
    return ilV2 * 100; // Fallback to V2 IL
  }
  
  // IL CLMM = IL(k) × (numerator / denominator)
  const ilCLMM = ilV2 * (numerator / denominator);
  
  return ilCLMM * 100; // Convert to percentage
}

/**
 * Menghitung jumlah Token A (X) dan Token B (Y) yang dimiliki user
 * berdasarkan harga saat ini (P) relatif terhadap Range (Pa, Pb) dan Liquidity (L).
 * 
 * Rumus berdasarkan Uniswap V3 Whitepaper:
 * - x = L * (1/√P - 1/√Pb)  untuk token A
 * - y = L * (√P - √Pa)      untuk token B
 */
/**
 * Menghitung jumlah Token X (amount0) dan Token Y (amount1) yang dimiliki user
 * berdasarkan harga saat ini (P) relatif terhadap Range (Pa, Pb) dan Liquidity (L).
 * 
 * PENTING - Sesuai Cetus CLMM Mechanics:
 * - If P < P_low: position holds only token Y (amount1)
 * - If P > P_high: position holds only token X (amount0)
 * - If P_low ≤ P ≤ P_high: position holds both tokens
 * 
 * Token X = base token (coin_a), Token Y = quote token (coin_b)
 * 
 * Rumus berdasarkan Uniswap V3 / Cetus CLMM:
 * - x = L * (1/√P - 1/√Pb)  untuk token X (amount0)
 * - y = L * (√P - √Pa)      untuk token Y (amount1)
 */
export function getAmountsForLiquidity(
  sqrtPrice: number,      // √P (current price)
  sqrtPriceLower: number, // √Pa (lower bound)
  sqrtPriceUpper: number, // √Pb (upper bound)
  liquidity: number       // L
): { amount0: number; amount1: number } {
  let amount0 = 0; // Token X
  let amount1 = 0; // Token Y

  // Case 1: Harga saat ini di BAWAH Range (P < Pa)
  // Sesuai Cetus docs: "position holds only token Y"
  // User memegang 100% Token Y (quote token)
  if (sqrtPrice <= sqrtPriceLower) {
    amount0 = 0;
    amount1 = liquidity * (sqrtPriceUpper - sqrtPriceLower);
  }
  // Case 2: Harga saat ini di ATAS Range (P > Pb)
  // Sesuai Cetus docs: "position holds only token X"
  // User memegang 100% Token X (base token)
  else if (sqrtPrice >= sqrtPriceUpper) {
    amount0 = liquidity * (1 / sqrtPriceLower - 1 / sqrtPriceUpper);
    amount1 = 0;
  }
  // Case 3: Harga di DALAM Range (Pa ≤ P ≤ Pb)
  // User memegang campuran Token X dan Y
  else {
    amount0 = liquidity * (1 / sqrtPrice - 1 / sqrtPriceUpper);
    amount1 = liquidity * (sqrtPrice - sqrtPriceLower);
  }

  return { amount0, amount1 };
}

/**
 * Menghitung Liquidity (L) dari jumlah token dan range harga
 * Ini adalah inverse dari getAmountsForLiquidity
 */
export function getLiquidityFromAmounts(
  sqrtPrice: number,
  sqrtPriceLower: number,
  sqrtPriceUpper: number,
  amount0: number, // Token A amount
  amount1: number  // Token B amount
): number {
  let liquidity0 = 0;
  let liquidity1 = 0;

  // Price below range - only token A
  if (sqrtPrice <= sqrtPriceLower) {
    const denominator = 1 / sqrtPriceLower - 1 / sqrtPriceUpper;
    liquidity0 = denominator > 0 ? amount0 / denominator : 0;
    return liquidity0;
  }
  // Price above range - only token B
  else if (sqrtPrice >= sqrtPriceUpper) {
    const denominator = sqrtPriceUpper - sqrtPriceLower;
    liquidity1 = denominator > 0 ? amount1 / denominator : 0;
    return liquidity1;
  }
  // Price in range - use minimum of both
  else {
    const denom0 = 1 / sqrtPrice - 1 / sqrtPriceUpper;
    const denom1 = sqrtPrice - sqrtPriceLower;
    
    liquidity0 = denom0 > 0 ? amount0 / denom0 : Infinity;
    liquidity1 = denom1 > 0 ? amount1 / denom1 : Infinity;
    
    return Math.min(liquidity0, liquidity1);
  }
}

/**
 * Menghitung Impermanent Loss (IL) untuk CLMM
 * 
 * Menggunakan pendekatan VALUE-BASED yang akurat:
 * IL = V_pool / V_hold - 1
 * 
 * dimana:
 * - V_hold = nilai jika HODL (jumlah token tetap, harga berubah)
 * - V_pool = nilai di pool (jumlah token berubah karena rebalancing)
 * 
 * Untuk validasi, bisa dibandingkan dengan rumus analitik:
 * IL_{a,b}(k) = IL(k) × (√k + 1/√k - 2) / [√k(1 - 1/√n) + 1/√k(√n - 1) - (√n - 1/√n)]
 * 
 * PERBEDAAN UTAMA dari AMM tradisional:
 * - Jika harga keluar range, posisi menjadi 100% satu aset
 * - IL bisa mendekati -100% jika P' sangat jauh dari range
 */
export interface CLMMILResult {
  ilPercentage: number;
  valueHold: number;
  valuePool: number;
  initialAmountA: number;
  initialAmountB: number;
  finalAmountA: number;
  finalAmountB: number;
  isOutOfRange: boolean;
  outOfRangeDirection: 'below' | 'above' | 'in-range';
}

export function calculateCLMM_IL(
  entryPrice: number,    // Harga saat masuk LP
  targetPrice: number,   // Harga target untuk simulasi
  priceLower: number,    // Batas bawah range
  priceUpper: number,    // Batas atas range
  amountAInitial: number, // Jumlah Token A awal (dalam unit token, sudah normalized)
  amountBInitial: number  // Jumlah Token B awal
): CLMMILResult {
  // Validate inputs
  if (priceLower >= priceUpper) {
    throw new Error('Price lower must be less than price upper');
  }
  if (entryPrice <= 0 || targetPrice <= 0) {
    throw new Error('Prices must be positive');
  }

  // 1. Calculate sqrt prices
  const sqrtEntry = Math.sqrt(entryPrice);
  const sqrtTarget = Math.sqrt(targetPrice);
  const sqrtLower = Math.sqrt(priceLower);
  const sqrtUpper = Math.sqrt(priceUpper);

  // 2. Calculate liquidity dari initial amounts pada entry price
  const liquidity = getLiquidityFromAmounts(
    sqrtEntry,
    sqrtLower,
    sqrtUpper,
    amountAInitial,
    amountBInitial
  );
  
  // Validate liquidity
  if (liquidity <= 0 || !isFinite(liquidity)) {
    // Return zero IL if we can't calculate liquidity
    return {
      ilPercentage: 0,
      valueHold: (amountAInitial * targetPrice) + amountBInitial,
      valuePool: (amountAInitial * targetPrice) + amountBInitial,
      initialAmountA: amountAInitial,
      initialAmountB: amountBInitial,
      finalAmountA: amountAInitial,
      finalAmountB: amountBInitial,
      isOutOfRange: false,
      outOfRangeDirection: 'in-range',
    };
  }

  // 3. Calculate actual initial amounts (might differ from input due to ratio)
  const initialPos = getAmountsForLiquidity(sqrtEntry, sqrtLower, sqrtUpper, liquidity);
  
  // 4. Calculate final amounts at target price
  const finalPos = getAmountsForLiquidity(sqrtTarget, sqrtLower, sqrtUpper, liquidity);

  // 5. Calculate values in quote asset (Token B / USD terms)
  // Value If Hold: Keep original tokens, don't LP
  const valueHold = (initialPos.amount0 * targetPrice) + initialPos.amount1;
  
  // Value If Pool: Tokens after CLMM rebalancing
  const valuePool = (finalPos.amount0 * targetPrice) + finalPos.amount1;

  // 6. Impermanent Loss percentage
  const ilPercentage = valueHold > 0 ? ((valuePool - valueHold) / valueHold) * 100 : 0;

  // 7. Determine out-of-range status
  let outOfRangeDirection: 'below' | 'above' | 'in-range' = 'in-range';
  if (targetPrice < priceLower) {
    outOfRangeDirection = 'below';
  } else if (targetPrice > priceUpper) {
    outOfRangeDirection = 'above';
  }

  return {
    ilPercentage,
    valueHold,
    valuePool,
    initialAmountA: initialPos.amount0,
    initialAmountB: initialPos.amount1,
    finalAmountA: finalPos.amount0,
    finalAmountB: finalPos.amount1,
    isOutOfRange: outOfRangeDirection !== 'in-range',
    outOfRangeDirection,
  };
}

/**
 * Generate IL curve data untuk charting
 * Mensimulasikan IL untuk berbagai skenario harga
 * Termasuk perbandingan dengan V2 IL
 */
export interface ILCurvePoint {
  priceChange: number;    // Persentase perubahan harga
  targetPrice: number;    // Harga target absolut
  ilPercentage: number;   // CLMM IL dalam persen (negatif = loss)
  ilV2Percentage: number; // V2 IL untuk perbandingan
  amplificationFactor: number; // Berapa kali lebih buruk dari V2
  valueHold: number;      // Value jika HODL
  valuePool: number;      // Value di pool
  isOutOfRange: boolean;
  outOfRangeDirection: 'below' | 'above' | 'in-range';
}

export function generateILCurve(
  currentPrice: number,
  priceLower: number,
  priceUpper: number,
  amountA: number,
  amountB: number,
  priceChangeRange: { min: number; max: number; steps: number } = { min: -80, max: 200, steps: 50 }
): ILCurvePoint[] {
  const curve: ILCurvePoint[] = [];
  const { min, max, steps } = priceChangeRange;
  const stepSize = (max - min) / steps;

  // Hitung faktor amplifikasi untuk range ini
  const baseAmplification = calculateAmplificationFactor(priceLower, priceUpper);

  for (let i = 0; i <= steps; i++) {
    const priceChangePercent = min + (i * stepSize);
    const targetPrice = currentPrice * (1 + priceChangePercent / 100);
    
    // Skip invalid prices
    if (targetPrice <= 0) continue;

    try {
      const result = calculateCLMM_IL(
        currentPrice,
        targetPrice,
        priceLower,
        priceUpper,
        amountA,
        amountB
      );

      // Hitung V2 IL untuk perbandingan
      const priceRatio = targetPrice / currentPrice;
      const ilV2 = calculateV2_IL(priceRatio);
      
      // Note: Untuk validasi rumus, bisa gunakan calculateCLMM_IL_Analytical()
      // yang mengimplementasikan formula:
      // IL_{a,b}(k) = IL(k) × (√k + 1/√k - 2) / [√k(1-1/√n) + 1/√k(√n-1) - (√n-1/√n)]
      // Nilai tersebut seharusnya mendekati result.ilPercentage saat dalam range
      
      // Gunakan value-based IL (lebih akurat untuk semua kasus termasuk out-of-range)
      const ilFinal = result.ilPercentage;
      
      // Hitung actual amplification (berapa kali lebih buruk dari V2)
      // Untuk out-of-range, amplifikasi bisa sangat tinggi
      let actualAmplification = baseAmplification;
      if (ilV2 !== 0) {
        actualAmplification = Math.abs(ilFinal / ilV2);
      }
      if (result.isOutOfRange) {
        // Out of range = amplifikasi lebih ekstrem
        actualAmplification = Math.max(actualAmplification, baseAmplification * 2);
      }

      curve.push({
        priceChange: priceChangePercent,
        targetPrice,
        ilPercentage: result.ilPercentage,
        ilV2Percentage: ilV2,
        amplificationFactor: actualAmplification,
        valueHold: result.valueHold,
        valuePool: result.valuePool,
        isOutOfRange: result.isOutOfRange,
        outOfRangeDirection: result.outOfRangeDirection,
      });
    } catch (e) {
      // Skip errors for edge cases
    }
  }

  return curve;
}

/**
 * Compare CLMM IL vs Standard AMM IL
 * Untuk menunjukkan perbedaan antara concentrated vs full-range liquidity
 */
export function calculateStandardAMM_IL(priceRatio: number): number {
  // Formula AMM V2: IL = 2√k / (1+k) - 1
  // where k = new_price / old_price
  if (priceRatio <= 0) return 0;
  const sqrtK = Math.sqrt(priceRatio);
  return ((2 * sqrtK) / (1 + priceRatio) - 1) * 100;
}

/**
 * Cetus Protocol Fee Constants
 * Sesuai dokumentasi: https://cetus-1.gitbook.io/cetus-docs/clmm/fees
 * 
 * Protocol fee = 20% dari swap fees
 * LP mendapat = 80% dari swap fees
 */
export const CETUS_PROTOCOL_FEE_RATE = 0.20; // 20% to protocol
export const CETUS_LP_FEE_SHARE = 0.80; // 80% to LPs

/**
 * Cetus Fee Tiers
 * 16 fee tiers yang tersedia di Cetus CLMM
 */
export const CETUS_FEE_TIERS = [
  0.0001, 0.0002, 0.0003, 0.0004, 0.0005, // 0.01% - 0.05%
  0.001, 0.0015, 0.002, 0.0025, 0.003,    // 0.1% - 0.3%
  0.004, 0.006, 0.008, 0.01, 0.02, 0.04   // 0.4% - 4%
];

/**
 * Calculate estimated APY from fees
 * Dengan adjustment untuk concentrated liquidity dan protocol fee
 * 
 * Sesuai Cetus docs:
 * - Swap fees distributed proportionally to in-range liquidity
 * - Protocol takes 20%, LP gets 80%
 */
export function calculateCLMMAPY(
  dailyVolume: number,
  feeRate: number,
  positionValueUSD: number,
  totalPoolTVL: number,
  priceRangeWidth: number // sebagai ratio (priceUpper - priceLower) / currentPrice
): { apy: number; dailyFees: number; capitalEfficiency: number; protocolFee: number } {
  if (positionValueUSD <= 0 || totalPoolTVL <= 0) {
    return { apy: 0, dailyFees: 0, capitalEfficiency: 1, protocolFee: 0 };
  }

  // Capital efficiency multiplier (narrower range = higher efficiency)
  // Approximate: if range is 10% of full range, efficiency is ~10x
  const capitalEfficiency = priceRangeWidth > 0 ? Math.min(1 / priceRangeWidth, 100) : 1;

  // Share of pool's active liquidity
  const effectiveShare = (positionValueUSD / totalPoolTVL) * capitalEfficiency;
  
  // Total swap fees generated
  const totalSwapFees = dailyVolume * feeRate * Math.min(effectiveShare, 1);
  
  // Protocol takes 20%, LP gets 80% (sesuai Cetus docs)
  const protocolFee = totalSwapFees * CETUS_PROTOCOL_FEE_RATE;
  const dailyFees = totalSwapFees * CETUS_LP_FEE_SHARE;
  
  // APY with daily compounding
  const dailyYield = dailyFees / positionValueUSD;
  const apy = (Math.pow(1 + dailyYield, 365) - 1) * 100;

  return {
    apy: Math.min(apy, 100000), // Cap at 100,000%
    dailyFees,
    capitalEfficiency,
    protocolFee,
  };
}

/**
 * Rebalancing Simulator
 * Menghitung biaya dan potensi keuntungan dari rebalancing posisi
 */
export interface RebalanceScenario {
  newPriceLower: number;
  newPriceUpper: number;
  gasCostUSD: number;
  newAPY: number;
  breakEvenDays: number;
  recommendation: 'recommended' | 'neutral' | 'not-recommended';
  reason: string;
}

export function simulateRebalance(
  currentPrice: number,
  oldPriceLower: number,
  oldPriceUpper: number,
  newPriceLower: number,
  newPriceUpper: number,
  positionValueUSD: number,
  dailyVolume: number,
  feeRate: number,
  totalPoolTVL: number,
  gasCostSUI: number = 0.01,
  suiPriceUSD: number = 1.25
): RebalanceScenario {
  const gasCostUSD = gasCostSUI * suiPriceUSD * 2; // 2 transactions: remove + add

  // Calculate old APY
  const oldRangeWidth = (oldPriceUpper - oldPriceLower) / currentPrice;
  const oldAPY = calculateCLMMAPY(dailyVolume, feeRate, positionValueUSD, totalPoolTVL, oldRangeWidth);

  // Calculate new APY
  const newRangeWidth = (newPriceUpper - newPriceLower) / currentPrice;
  const newAPY = calculateCLMMAPY(dailyVolume, feeRate, positionValueUSD, totalPoolTVL, newRangeWidth);

  // Calculate break-even
  const dailyGain = newAPY.dailyFees - oldAPY.dailyFees;
  const breakEvenDays = dailyGain > 0 ? gasCostUSD / dailyGain : Infinity;

  // Recommendation logic
  let recommendation: 'recommended' | 'neutral' | 'not-recommended' = 'neutral';
  let reason = '';

  const isInNewRange = currentPrice >= newPriceLower && currentPrice <= newPriceUpper;
  const wasOutOfRange = currentPrice < oldPriceLower || currentPrice > oldPriceUpper;

  if (!isInNewRange) {
    recommendation = 'not-recommended';
    reason = 'Current price is outside the new range. Position will not earn fees.';
  } else if (wasOutOfRange && isInNewRange) {
    recommendation = 'recommended';
    reason = 'Rebalancing will bring your position back in range to earn fees.';
  } else if (breakEvenDays < 7) {
    recommendation = 'recommended';
    reason = `Higher APY pays off gas cost in ${breakEvenDays.toFixed(1)} days.`;
  } else if (breakEvenDays > 30) {
    recommendation = 'not-recommended';
    reason = `Gas cost takes ${breakEvenDays.toFixed(0)} days to recover. Not worth it.`;
  } else {
    recommendation = 'neutral';
    reason = `Break-even in ${breakEvenDays.toFixed(1)} days. Consider your risk tolerance.`;
  }

  return {
    newPriceLower,
    newPriceUpper,
    gasCostUSD,
    newAPY: newAPY.apy,
    breakEvenDays,
    recommendation,
    reason,
  };
}
/**
 * Fee-Based Liquidity Mining Calculator
 * Sesuai dokumentasi: https://cetus-1.gitbook.io/cetus-docs/clmm/liquidity-mining
 * 
 * Mining rewards didistribusikan berdasarkan kontribusi fee aktual,
 * bukan hanya berdasarkan TVL. Ini memastikan LP yang menyediakan
 * liquidity efektif mendapat reward lebih besar.
 * 
 * Key principles:
 * 1. Hanya posisi in-range yang bisa earn fees dan mining rewards
 * 2. Rewards proporsional terhadap share of fees generated
 * 3. Inactive positions TIDAK dilute rewards dari active positions
 */
export interface MiningRewardsResult {
  dailyMiningRewards: number;      // Mining rewards per day (in reward token)
  dailyMiningRewardsUSD: number;   // Mining rewards in USD
  feeContributionShare: number;    // % share of pool fees you generated
  totalAPR: number;                // Fee APY + Mining APR
  miningAPR: number;               // Mining rewards only APR
  feeAPR: number;                  // Trading fees only APR
  isActive: boolean;               // Is position currently in range
  effectivenessScore: number;      // 0-100, how effective is your position
}

export function calculateMiningRewards(
  positionValueUSD: number,
  totalPoolTVL: number,
  dailyVolume: number,
  feeRate: number,
  currentPrice: number,
  priceLower: number,
  priceUpper: number,
  dailyMiningRewardsPool: number,  // Total mining rewards for this pool per day
  rewardTokenPriceUSD: number = 1  // Price of reward token (e.g., CETUS)
): MiningRewardsResult {
  // Check if position is in range
  const isActive = currentPrice >= priceLower && currentPrice <= priceUpper;
  
  if (!isActive || positionValueUSD <= 0 || totalPoolTVL <= 0) {
    return {
      dailyMiningRewards: 0,
      dailyMiningRewardsUSD: 0,
      feeContributionShare: 0,
      totalAPR: 0,
      miningAPR: 0,
      feeAPR: 0,
      isActive,
      effectivenessScore: 0,
    };
  }
  
  // Calculate capital efficiency based on range width
  const rangeWidth = (priceUpper - priceLower) / currentPrice;
  const capitalEfficiency = Math.min(1 / rangeWidth, 100);
  
  // Calculate effective liquidity share
  const effectiveShare = (positionValueUSD / totalPoolTVL) * capitalEfficiency;
  const clampedShare = Math.min(effectiveShare, 1);
  
  // Calculate fee contribution (how much fees you generated)
  const totalPoolFees = dailyVolume * feeRate;
  const yourFeeContribution = totalPoolFees * clampedShare;
  const feeContributionShare = totalPoolFees > 0 ? (yourFeeContribution / totalPoolFees) * 100 : 0;
  
  // Fee-based mining: rewards proportional to fee contribution
  // This is the key difference from TVL-based mining
  const dailyMiningRewards = dailyMiningRewardsPool * clampedShare;
  const dailyMiningRewardsUSD = dailyMiningRewards * rewardTokenPriceUSD;
  
  // Calculate APRs
  const dailyFees = yourFeeContribution * CETUS_LP_FEE_SHARE;
  const feeAPR = positionValueUSD > 0 ? (dailyFees * 365 / positionValueUSD) * 100 : 0;
  const miningAPR = positionValueUSD > 0 ? (dailyMiningRewardsUSD * 365 / positionValueUSD) * 100 : 0;
  const totalAPR = feeAPR + miningAPR;
  
  // Effectiveness score (0-100)
  // Based on: position in range, capital efficiency, proximity to current price
  const distanceToLower = (currentPrice - priceLower) / currentPrice;
  const distanceToUpper = (priceUpper - currentPrice) / currentPrice;
  const centeredness = 1 - Math.abs(distanceToLower - distanceToUpper) / 2;
  const efficiencyScore = Math.min(capitalEfficiency / 10, 10); // Max 10 points for efficiency
  const effectivenessScore = Math.min(100, centeredness * 50 + efficiencyScore * 5);
  
  return {
    dailyMiningRewards,
    dailyMiningRewardsUSD,
    feeContributionShare,
    totalAPR,
    miningAPR,
    feeAPR,
    isActive,
    effectivenessScore,
  };
}

/**
 * IL Warning Thresholds
 * Berdasarkan risk assessment untuk membantu user mengambil keputusan
 */
export interface ILWarning {
  level: 'info' | 'warning' | 'danger';
  message: string;
  recommendation: string;
}

export function getILWarnings(
  ilPercentage: number,
  isOutOfRange: boolean,
  outOfRangeDirection: 'below' | 'above' | 'in-range',
  rangeWidth: number,
  feeAPR: number
): ILWarning[] {
  const warnings: ILWarning[] = [];
  
  // Out of range warning
  if (isOutOfRange) {
    warnings.push({
      level: 'danger',
      message: outOfRangeDirection === 'below' 
        ? '⚠️ Price is BELOW your range. Position holds 100% quote token (Token Y). NO FEES earned.'
        : '⚠️ Price is ABOVE your range. Position holds 100% base token (Token X). NO FEES earned.',
      recommendation: 'Consider rebalancing to a new range around current price to resume earning fees.',
    });
  }
  
  // High IL warning
  if (ilPercentage < -10) {
    const breakEvenDays = feeAPR > 0 ? Math.abs(ilPercentage) / (feeAPR / 365) : Infinity;
    warnings.push({
      level: ilPercentage < -20 ? 'danger' : 'warning',
      message: `📉 Impermanent Loss: ${ilPercentage.toFixed(2)}%. This is ${Math.abs(ilPercentage / 5.57).toFixed(1)}x worse than AMM V2.`,
      recommendation: breakEvenDays < 30 
        ? `Fees may recover IL in ~${Math.ceil(breakEvenDays)} days if price stays in range.`
        : 'IL is significant. Consider if potential fees justify the risk.',
    });
  }
  
  // Narrow range warning
  if (rangeWidth < 0.1) {
    warnings.push({
      level: 'warning',
      message: '⚡ Very narrow range (<10%). High capital efficiency but high IL risk.',
      recommendation: 'Price movements of just 5% could push you out of range. Monitor frequently.',
    });
  }
  
  // Wide range info
  if (rangeWidth > 1) {
    warnings.push({
      level: 'info',
      message: '📊 Wide range (>100%). Lower IL risk but also lower fee APR.',
      recommendation: 'Consider narrowing range for higher returns if you can monitor actively.',
    });
  }
  
  return warnings;
}

/**
 * Position Health Score
 * Menilai kesehatan posisi LP secara keseluruhan
 */
export interface PositionHealth {
  score: number;           // 0-100
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  factors: {
    inRangeScore: number;       // 0-30 points
    ilScore: number;            // 0-25 points
    feeEarningScore: number;    // 0-25 points
    capitalEfficiencyScore: number; // 0-20 points
  };
  summary: string;
}

export function calculatePositionHealth(
  currentPrice: number,
  priceLower: number,
  priceUpper: number,
  ilPercentage: number,
  feeAPR: number,
  daysInPosition: number = 30
): PositionHealth {
  // 1. In-range score (0-30 points)
  const isInRange = currentPrice >= priceLower && currentPrice <= priceUpper;
  const distanceToEdge = isInRange 
    ? Math.min((currentPrice - priceLower) / currentPrice, (priceUpper - currentPrice) / currentPrice)
    : 0;
  const inRangeScore = isInRange ? Math.min(30, 15 + distanceToEdge * 150) : 0;
  
  // 2. IL score (0-25 points)
  // IL of 0% = 25 points, IL of -50% = 0 points
  const ilScore = Math.max(0, 25 + (ilPercentage / 2));
  
  // 3. Fee earning score (0-25 points)
  // Based on if fees can recover IL
  const estimatedFeesEarned = (feeAPR / 365) * daysInPosition;
  const netReturn = ilPercentage + estimatedFeesEarned;
  const feeEarningScore = netReturn >= 0 ? 25 : Math.max(0, 25 + netReturn);
  
  // 4. Capital efficiency score (0-20 points)
  const rangeWidth = (priceUpper - priceLower) / currentPrice;
  const capitalEfficiency = 1 / rangeWidth;
  const capitalEfficiencyScore = Math.min(20, capitalEfficiency * 2);
  
  // Total score
  const score = Math.round(inRangeScore + ilScore + feeEarningScore + capitalEfficiencyScore);
  
  // Status
  let status: PositionHealth['status'];
  if (score >= 80) status = 'excellent';
  else if (score >= 60) status = 'good';
  else if (score >= 40) status = 'fair';
  else if (score >= 20) status = 'poor';
  else status = 'critical';
  
  // Summary
  let summary: string;
  if (!isInRange) {
    summary = 'Position is out of range and not earning fees. Consider rebalancing.';
  } else if (ilPercentage < -20) {
    summary = 'High impermanent loss. Monitor closely and consider rebalancing if IL continues.';
  } else if (feeAPR > Math.abs(ilPercentage * 12)) {
    summary = 'Position is healthy. Fee earnings should outpace IL over time.';
  } else {
    summary = 'Position is active. Keep monitoring price movements.';
  }
  
  return {
    score,
    status,
    factors: {
      inRangeScore: Math.round(inRangeScore),
      ilScore: Math.round(ilScore),
      feeEarningScore: Math.round(feeEarningScore),
      capitalEfficiencyScore: Math.round(capitalEfficiencyScore),
    },
    summary,
  };
}