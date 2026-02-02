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
export function getAmountsForLiquidity(
  sqrtPrice: number,      // √P (current price)
  sqrtPriceLower: number, // √Pa (lower bound)
  sqrtPriceUpper: number, // √Pb (upper bound)
  liquidity: number       // L
): { amount0: number; amount1: number } {
  let amount0 = 0;
  let amount1 = 0;

  // Case 1: Harga saat ini di BAWAH Range (P < Pa)
  // User memegang 100% Token A (aset yang 'lebih murah')
  if (sqrtPrice <= sqrtPriceLower) {
    amount0 = liquidity * (1 / sqrtPriceLower - 1 / sqrtPriceUpper);
    amount1 = 0;
  }
  // Case 2: Harga saat ini di ATAS Range (P > Pb)
  // User memegang 100% Token B
  else if (sqrtPrice >= sqrtPriceUpper) {
    amount0 = 0;
    amount1 = liquidity * (sqrtPriceUpper - sqrtPriceLower);
  }
  // Case 3: Harga di DALAM Range (Pa < P < Pb)
  // User memegang campuran Token A dan B
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
 * Calculate estimated APY from fees
 * Dengan adjustment untuk concentrated liquidity
 */
export function calculateCLMMAPY(
  dailyVolume: number,
  feeRate: number,
  positionValueUSD: number,
  totalPoolTVL: number,
  priceRangeWidth: number // sebagai ratio (priceUpper - priceLower) / currentPrice
): { apy: number; dailyFees: number; capitalEfficiency: number } {
  if (positionValueUSD <= 0 || totalPoolTVL <= 0) {
    return { apy: 0, dailyFees: 0, capitalEfficiency: 1 };
  }

  // Capital efficiency multiplier (narrower range = higher efficiency)
  // Approximate: if range is 10% of full range, efficiency is ~10x
  const capitalEfficiency = priceRangeWidth > 0 ? Math.min(1 / priceRangeWidth, 100) : 1;

  // Share of pool's active liquidity
  const effectiveShare = (positionValueUSD / totalPoolTVL) * capitalEfficiency;
  
  // Daily fees earned
  const dailyFees = dailyVolume * feeRate * Math.min(effectiveShare, 1);
  
  // APY with daily compounding
  const dailyYield = dailyFees / positionValueUSD;
  const apy = (Math.pow(1 + dailyYield, 365) - 1) * 100;

  return {
    apy: Math.min(apy, 100000), // Cap at 100,000%
    dailyFees,
    capitalEfficiency,
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
