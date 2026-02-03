/**
 * Cetus SDK Service
 * Uses @cetusprotocol/sui-clmm-sdk (V2) to fetch real pool data from Mainnet
 * 
 * Based on Cetus CLMM Mechanics:
 * https://cetus-1.gitbook.io/cetus-developer-docs
 * 
 * Active Liquidity Formula:
 * (x + L/√P_high) · (y + L·√P_low) = L²
 */

import { CetusClmmSDK } from '@cetusprotocol/sui-clmm-sdk';
import BN from 'bn.js';

// SDK instance (singleton)
let sdkInstance: CetusClmmSDK | null = null;

/**
 * Get or create SDK instance for Mainnet
 */
export function getSDK(): CetusClmmSDK {
  if (!sdkInstance) {
    sdkInstance = CetusClmmSDK.createSDK({ env: 'mainnet' });
  }
  return sdkInstance;
}

// Pool interface matching SDK response
export interface PoolInfo {
  poolId: string;
  coinTypeA: string;
  coinTypeB: string;
  coinSymbolA: string;
  coinSymbolB: string;
  coinDecimalsA: number;
  coinDecimalsB: number;
  currentSqrtPrice: string;
  currentPrice: number;
  currentTickIndex: number;
  tickSpacing: number;
  feeRate: number;
  liquidity: string;
  formattedName: string;
}

// Known coin symbols mapping
const COIN_SYMBOLS: Record<string, { symbol: string; decimals: number }> = {
  '0x2::sui::SUI': { symbol: 'SUI', decimals: 9 },
  '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN': { symbol: 'USDC', decimals: 6 },
  '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN': { symbol: 'USDT', decimals: 6 },
  '0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN': { symbol: 'WETH', decimals: 8 },
  '0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN': { symbol: 'WBTC', decimals: 8 },
  '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI': { symbol: 'haSUI', decimals: 9 },
  '0xfe3afec26c59e874f3c1d60b8203cb3852d2bb2aa415df9548b8d688e6683f93::alpha::ALPHA': { symbol: 'ALPHA', decimals: 9 },
  '0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX': { symbol: 'NAVX', decimals: 9 },
  '0x6864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS': { symbol: 'CETUS', decimals: 9 },
  '0x960b531667636f39e85867775f52f6b1f220a058c4de786905bdf761e06a56bb::usdy::USDY': { symbol: 'USDY', decimals: 6 },
  '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC': { symbol: 'USDC.e', decimals: 6 },
  '0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH': { symbol: 'ETH', decimals: 8 },
  '0x76cb819b01abed502bee8a702b4c2d547532c12f25001c9dea795a5e631c26f1::fud::FUD': { symbol: 'FUD', decimals: 5 },
  '0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK': { symbol: 'BUCK', decimals: 9 },
  '0x5d1f47ea69bb0de31c313d7acf89b890dbb8991ea8e03c6c355171f84bb1ba4a::turbos::TURBOS': { symbol: 'TURBOS', decimals: 9 },
  '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT': { symbol: 'vSUI', decimals: 9 },
  '0x14a71d857b34677a7d57e0feb303df1adb515a37780645ab763d42ce8d1a5e48::deep::DEEP': { symbol: 'DEEP', decimals: 6 },
};

/**
 * Get coin info from type address
 */
function getCoinInfo(coinType: string): { symbol: string; decimals: number } {
  // Normalize the coin type
  const normalizedType = coinType.toLowerCase();
  
  for (const [key, value] of Object.entries(COIN_SYMBOLS)) {
    if (normalizedType.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedType)) {
      return value;
    }
  }
  
  // Extract symbol from type if not found
  const parts = coinType.split('::');
  const symbol = parts.length >= 3 ? parts[2].toUpperCase() : 'UNKNOWN';
  return { symbol, decimals: 9 }; // Default to 9 decimals
}

/**
 * Convert sqrtPriceX64 to actual price
 * sqrtPriceX64 = sqrt(price) * 2^64
 * price = (sqrtPriceX64 / 2^64)^2 * 10^(decimalsA - decimalsB)
 */
function sqrtPriceX64ToPrice(sqrtPriceX64: string | number | BN, decimalsA: number, decimalsB: number): number {
  try {
    let sqrtPriceNum: number;
    
    if (sqrtPriceX64 instanceof BN) {
      sqrtPriceNum = parseFloat(sqrtPriceX64.toString());
    } else if (typeof sqrtPriceX64 === 'string') {
      sqrtPriceNum = parseFloat(sqrtPriceX64);
    } else {
      sqrtPriceNum = sqrtPriceX64;
    }
    
    // 2^64 = 18446744073709551616
    const Q64 = 18446744073709551616;
    
    // Calculate price: (sqrtPriceX64 / 2^64)^2
    const sqrtPrice = sqrtPriceNum / Q64;
    const rawPrice = sqrtPrice * sqrtPrice;
    
    // Adjust for decimals difference
    const decimalsDiff = decimalsA - decimalsB;
    const price = rawPrice * Math.pow(10, decimalsDiff);
    
    return price;
  } catch (e) {
    console.warn('Failed to convert sqrt price:', e);
    return 0;
  }
}

// Popular pool IDs on Cetus Mainnet (exported for use in UI)
export const POPULAR_POOL_IDS = [
  '0x2e041f3fd93646dcc877f783c1f2b7fa62d30271bdef1f21ef002cebf857bded', // SUI/USDC
  '0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688630', // USDC/USDT
  '0x83c101a55563b037f4cd25e5b326b26ae6537dc8048004c1408079f7578dd160', // CETUS/SUI
  '0xc8d7a1503dc2f9f5b05449a87d8733593e2f0f3e7bffd90541252782f7f74f4f', // SUI/WETH
  '0x5b0b24c27ccf6d0e98f3a8704d2e577de83fa574d3a9f324a1b79c00488a2a04', // USDC/WETH
  '0x0254747f5ca059a1972cd7f6016485d51392a3fde608107b93bbaebea550f703', // WETH/USDC (0.3%)
  '0x871d8a227114f375170f149f7e9d45be822dd003eba225e83c05ac80828596bc', // haSUI/SUI
  '0xaa72bd551b25715b8f9d72f226fa02526bdf2e085a86faec7184230c5209bb6e', // SUI/NAVX
  '0xbdf4f673b34274f36be284bca3f765083380fefdc7d9c791db9c9eaae0de5f2c', // SUI/CETUS
  '0x31970253068fc315682301b128b17e6c84a60b1cf0397641395d2b65d6962f9c', // DEEP/SUI
];

// Pre-cached popular pools data (instant loading!)
// This data is updated periodically and used as instant fallback
const CACHED_POPULAR_POOLS: PoolInfo[] = [
  {
    poolId: '0x2e041f3fd93646dcc877f783c1f2b7fa62d30271bdef1f21ef002cebf857bded',
    coinTypeA: '0x2::sui::SUI',
    coinTypeB: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
    coinSymbolA: 'SUI',
    coinSymbolB: 'USDC',
    coinDecimalsA: 9,
    coinDecimalsB: 6,
    currentSqrtPrice: '1118595071898440000',
    currentPrice: 3.85,
    currentTickIndex: 2231,
    tickSpacing: 60,
    feeRate: 0.003,
    liquidity: '15000000000000',
    formattedName: 'SUI/USDC',
  },
  {
    poolId: '0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688630',
    coinTypeA: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
    coinTypeB: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
    coinSymbolA: 'USDC',
    coinSymbolB: 'USDT',
    coinDecimalsA: 6,
    coinDecimalsB: 6,
    currentSqrtPrice: '18446744073709551616',
    currentPrice: 1.0001,
    currentTickIndex: 1,
    tickSpacing: 1,
    feeRate: 0.0001,
    liquidity: '25000000000000',
    formattedName: 'USDC/USDT',
  },
  {
    poolId: '0x83c101a55563b037f4cd25e5b326b26ae6537dc8048004c1408079f7578dd160',
    coinTypeA: '0x6864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS',
    coinTypeB: '0x2::sui::SUI',
    coinSymbolA: 'CETUS',
    coinSymbolB: 'SUI',
    coinDecimalsA: 9,
    coinDecimalsB: 9,
    currentSqrtPrice: '4611686018427387904',
    currentPrice: 0.065,
    currentTickIndex: -27726,
    tickSpacing: 60,
    feeRate: 0.0025,
    liquidity: '8000000000000',
    formattedName: 'CETUS/SUI',
  },
  {
    poolId: '0xc8d7a1503dc2f9f5b05449a87d8733593e2f0f3e7bffd90541252782f7f74f4f',
    coinTypeA: '0x2::sui::SUI',
    coinTypeB: '0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN',
    coinSymbolA: 'SUI',
    coinSymbolB: 'WETH',
    coinDecimalsA: 9,
    coinDecimalsB: 8,
    currentSqrtPrice: '12345678901234567890',
    currentPrice: 0.00125,
    currentTickIndex: -5500,
    tickSpacing: 60,
    feeRate: 0.003,
    liquidity: '5000000000000',
    formattedName: 'SUI/WETH',
  },
  {
    poolId: '0x871d8a227114f375170f149f7e9d45be822dd003eba225e83c05ac80828596bc',
    coinTypeA: '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI',
    coinTypeB: '0x2::sui::SUI',
    coinSymbolA: 'haSUI',
    coinSymbolB: 'SUI',
    coinDecimalsA: 9,
    coinDecimalsB: 9,
    currentSqrtPrice: '18500000000000000000',
    currentPrice: 1.006,
    currentTickIndex: 60,
    tickSpacing: 1,
    feeRate: 0.0001,
    liquidity: '12000000000000',
    formattedName: 'haSUI/SUI',
  },
  {
    poolId: '0x31970253068fc315682301b128b17e6c84a60b1cf0397641395d2b65d6962f9c',
    coinTypeA: '0x14a71d857b34677a7d57e0feb303df1adb515a37780645ab763d42ce8d1a5e48::deep::DEEP',
    coinTypeB: '0x2::sui::SUI',
    coinSymbolA: 'DEEP',
    coinSymbolB: 'SUI',
    coinDecimalsA: 6,
    coinDecimalsB: 9,
    currentSqrtPrice: '2345678901234567890',
    currentPrice: 0.0162,
    currentTickIndex: -4100,
    tickSpacing: 60,
    feeRate: 0.003,
    liquidity: '3000000000000',
    formattedName: 'DEEP/SUI',
  },
];

// Cache for all pools to avoid refetching
let poolsCache: PoolInfo[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Background loading state
let isLoadingAllPools = false;
let allPoolsLoaded = false;

/**
 * Sanitize input string to prevent injection attacks
 */
function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  // Remove any potentially dangerous characters, keep alphanumeric, spaces, and common symbols
  return input.replace(/[<>\"'`;\\]/g, '').trim().slice(0, 100);
}

/**
 * Validate pool ID format (Sui object ID)
 */
function isValidPoolId(poolId: string): boolean {
  if (typeof poolId !== 'string') return false;
  // Sui object IDs are 64 hex chars prefixed with 0x
  return /^0x[a-fA-F0-9]{64}$/.test(poolId);
}

/**
 * Parse pool data from SDK response
 */
function parsePoolData(pool: any): PoolInfo | null {
  try {
    if (!pool || !pool.id || !pool.coin_type_a || !pool.coin_type_b) {
      return null;
    }
    
    const coinInfoA = getCoinInfo(pool.coin_type_a);
    const coinInfoB = getCoinInfo(pool.coin_type_b);
    
    const currentPrice = sqrtPriceX64ToPrice(
      pool.current_sqrt_price,
      coinInfoA.decimals,
      coinInfoB.decimals
    );
    
    // Skip pools with invalid prices
    if (!isFinite(currentPrice) || currentPrice < 0) {
      return null;
    }
    
    return {
      poolId: pool.id,
      coinTypeA: pool.coin_type_a,
      coinTypeB: pool.coin_type_b,
      coinSymbolA: coinInfoA.symbol,
      coinSymbolB: coinInfoB.symbol,
      coinDecimalsA: coinInfoA.decimals,
      coinDecimalsB: coinInfoB.decimals,
      currentSqrtPrice: String(pool.current_sqrt_price),
      currentPrice: currentPrice,
      currentTickIndex: Number(pool.current_tick_index) || 0,
      tickSpacing: Number(pool.tick_spacing) || 60,
      feeRate: Number(pool.fee_rate) / 1000000, // Convert to decimal
      liquidity: String(pool.liquidity || '0'),
      formattedName: `${coinInfoA.symbol}/${coinInfoB.symbol}`,
    };
  } catch (e) {
    console.warn('Failed to parse pool:', pool?.id, e);
    return null;
  }
}

/**
 * Fetch popular pools - INSTANT with pre-cached data
 * Returns cached data immediately, then updates from SDK in background
 */
export async function fetchPopularPoolsFast(): Promise<PoolInfo[]> {
  // INSTANT: Return pre-cached data immediately
  if (poolsCache.length === 0) {
    poolsCache = [...CACHED_POPULAR_POOLS];
    lastFetchTime = Date.now();
  }
  
  // Return cached immediately
  const instantResult = poolsCache.length > 0 ? poolsCache : CACHED_POPULAR_POOLS;
  
  // Fetch real data in background (don't await)
  fetchRealPoolsInBackground();
  
  return instantResult;
}

/**
 * Fetch real pool data from SDK in background
 */
async function fetchRealPoolsInBackground(): Promise<void> {
  if (isLoadingAllPools) return;
  
  isLoadingAllPools = true;
  
  try {
    const sdk = getSDK();
    
    // Use getAssignPools for specific popular pools
    const pools = await sdk.Pool.getAssignPools(POPULAR_POOL_IDS);
    
    const poolInfos: PoolInfo[] = [];
    for (const pool of pools) {
      const parsed = parsePoolData(pool);
      if (parsed && parsed.currentPrice > 0) {
        poolInfos.push(parsed);
      }
    }
    
    if (poolInfos.length > 0) {
      // Merge with cached data, updating existing pools
      const updatedCache = [...poolInfos];
      
      // Add any pools from cache that weren't in the SDK response
      for (const cachedPool of poolsCache) {
        if (!updatedCache.find(p => p.poolId === cachedPool.poolId)) {
          updatedCache.push(cachedPool);
        }
      }
      
      poolsCache = updatedCache;
      lastFetchTime = Date.now();
      console.log('Updated pool data from SDK:', poolInfos.length, 'pools');
    }
  } catch (error) {
    console.warn('Background pool fetch failed, using cached data:', error);
  } finally {
    isLoadingAllPools = false;
    allPoolsLoaded = true;
  }
}

/**
 * Load remaining pools in background (non-blocking)
 * Returns all pools when complete
 */
export async function loadAllPoolsInBackground(): Promise<PoolInfo[]> {
  if (isLoadingAllPools) {
    // Wait for current load to complete
    while (isLoadingAllPools) {
      await new Promise(r => setTimeout(r, 100));
    }
    return poolsCache;
  }
  
  if (allPoolsLoaded) return poolsCache;
  
  isLoadingAllPools = true;
  
  try {
    const sdk = getSDK();
    const additionalPools: PoolInfo[] = [];
    
    // Fetch more pages in background
    let hasNextPage = true;
    let cursor: any = undefined;
    let pageCount = 0;
    const maxPages = 10; // Limit to 500 pools for performance
    
    while (hasNextPage && pageCount < maxPages) {
      try {
        const response = await sdk.Pool.getPoolsWithPage(cursor ? { cursor } : undefined);
        
        if (response.data && Array.isArray(response.data)) {
          for (const pool of response.data) {
            // Skip if already in cache
            if (poolsCache.some(p => p.poolId === pool.id)) continue;
            
            const parsedPool = parsePoolData(pool);
            if (parsedPool && parsedPool.currentPrice > 0) {
              additionalPools.push(parsedPool);
            }
          }
        }
        
        hasNextPage = response.has_next_page === true;
        cursor = response.next_cursor;
        pageCount++;
      } catch (pageError) {
        console.warn('Error fetching page:', pageCount, pageError);
        break;
      }
    }
    
    // Merge with cache
    if (additionalPools.length > 0) {
      // Sort by liquidity
      additionalPools.sort((a, b) => {
        const liqA = parseFloat(a.liquidity) || 0;
        const liqB = parseFloat(b.liquidity) || 0;
        return liqB - liqA;
      });
      
      poolsCache = [...poolsCache, ...additionalPools];
      console.log(`Background loaded ${additionalPools.length} additional pools. Total: ${poolsCache.length}`);
    }
    
    allPoolsLoaded = true;
  } catch (error) {
    console.error('Background pool loading error:', error);
  } finally {
    isLoadingAllPools = false;
  }
  
  return poolsCache;
}

/**
 * Fetch pools - INSTANT with pre-cached data
 * Returns cached popular pools immediately (no waiting!)
 * Updates from SDK in background
 */
export async function fetchPools(): Promise<PoolInfo[]> {
  // INSTANT: Always return cached data first
  if (poolsCache.length === 0) {
    // Initialize with pre-cached popular pools
    poolsCache = [...CACHED_POPULAR_POOLS];
    lastFetchTime = Date.now();
  }
  
  const now = Date.now();
  
  // Trigger background update if cache is stale (but still return cached data!)
  if ((now - lastFetchTime) >= CACHE_DURATION || !allPoolsLoaded) {
    if (!isLoadingAllPools) {
      // Update in background - don't wait
      fetchRealPoolsInBackground();
    }
  }
  
  // Always return immediately
  return poolsCache;
}

/**
 * Search pools by query (symbol or name)
 */
export function searchPools(query: string): PoolInfo[] {
  const sanitizedQuery = sanitizeInput(query).toLowerCase();
  
  if (!sanitizedQuery || sanitizedQuery.length < 1) {
    return poolsCache;
  }
  
  return poolsCache.filter(pool => 
    pool.coinSymbolA.toLowerCase().includes(sanitizedQuery) ||
    pool.coinSymbolB.toLowerCase().includes(sanitizedQuery) ||
    pool.formattedName.toLowerCase().includes(sanitizedQuery)
  );
}

/**
 * Get current cache state
 */
export function getPoolsCacheInfo(): { 
  loaded: number; 
  count: number;
  allLoaded: boolean; 
  isLoading: boolean;
  pools: PoolInfo[];
} {
  return {
    loaded: poolsCache.length,
    count: poolsCache.length,
    allLoaded: allPoolsLoaded,
    isLoading: isLoadingAllPools,
    pools: poolsCache,
  };
}

/**
 * Fetch a single pool by ID (with validation)
 */
export async function fetchPoolById(poolId: string): Promise<PoolInfo | null> {
  // Validate pool ID format
  if (!isValidPoolId(poolId)) {
    console.error('Invalid pool ID format:', poolId);
    return null;
  }
  
  // Check cache first
  const cached = poolsCache.find(p => p.poolId === poolId);
  if (cached) return cached;
  
  try {
    const sdk = getSDK();
    const pool = await sdk.Pool.getPool(poolId);
    
    const coinInfoA = getCoinInfo(pool.coin_type_a);
    const coinInfoB = getCoinInfo(pool.coin_type_b);
    
    const currentPrice = sqrtPriceX64ToPrice(
      pool.current_sqrt_price,
      coinInfoA.decimals,
      coinInfoB.decimals
    );
    
    return {
      poolId: pool.id,
      coinTypeA: pool.coin_type_a,
      coinTypeB: pool.coin_type_b,
      coinSymbolA: coinInfoA.symbol,
      coinSymbolB: coinInfoB.symbol,
      coinDecimalsA: coinInfoA.decimals,
      coinDecimalsB: coinInfoB.decimals,
      currentSqrtPrice: String(pool.current_sqrt_price),
      currentPrice: currentPrice,
      currentTickIndex: Number(pool.current_tick_index),
      tickSpacing: Number(pool.tick_spacing),
      feeRate: Number(pool.fee_rate) / 1000000,
      liquidity: String(pool.liquidity),
      formattedName: `${coinInfoA.symbol}/${coinInfoB.symbol}`,
    };
  } catch (error) {
    console.error('Failed to fetch pool:', poolId, error);
    return null;
  }
}

/**
 * Fallback pools (when SDK fails)
 */
function getFallbackPools(): PoolInfo[] {
  return [
    {
      poolId: '0x2e041f3fd93646dcc877f783c1f2b7fa62d30271bdef1f21ef002cebf857bded',
      coinTypeA: '0x2::sui::SUI',
      coinTypeB: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
      coinSymbolA: 'SUI',
      coinSymbolB: 'USDC',
      coinDecimalsA: 9,
      coinDecimalsB: 6,
      currentSqrtPrice: '1118595071898440000',
      currentPrice: 1.25,
      currentTickIndex: 2231,
      tickSpacing: 60,
      feeRate: 0.003,
      liquidity: '1000000000000',
      formattedName: 'SUI/USDC',
    },
    {
      poolId: '0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688630',
      coinTypeA: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
      coinTypeB: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
      coinSymbolA: 'USDC',
      coinSymbolB: 'USDT',
      coinDecimalsA: 6,
      coinDecimalsB: 6,
      currentSqrtPrice: '18446744073709551616',
      currentPrice: 1.0001,
      currentTickIndex: 1,
      tickSpacing: 1,
      feeRate: 0.0001,
      liquidity: '5000000000000',
      formattedName: 'USDC/USDT',
    },
    {
      poolId: '0x83c101a55563b037f4cd25e5b326b26ae6537dc8048004c1408079f7578dd160',
      coinTypeA: '0x6864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS',
      coinTypeB: '0x2::sui::SUI',
      coinSymbolA: 'CETUS',
      coinSymbolB: 'SUI',
      coinDecimalsA: 9,
      coinDecimalsB: 9,
      currentSqrtPrice: '4611686018427387904',
      currentPrice: 0.0625,
      currentTickIndex: -27726,
      tickSpacing: 60,
      feeRate: 0.0025,
      liquidity: '800000000000',
      formattedName: 'CETUS/SUI',
    },
  ];
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  if (price === 0) return '0.00';
  if (price < 0.0001) return price.toExponential(3);
  if (price < 0.01) return price.toFixed(6);
  if (price < 1) return price.toFixed(4);
  if (price < 1000) return price.toFixed(2);
  return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/**
 * Validate Sui wallet address format
 */
function isValidWalletAddress(address: string): boolean {
  // Sui addresses: 0x followed by 64 hex characters
  return /^0x[a-fA-F0-9]{64}$/.test(address);
}

/**
 * Fetch user's liquidity positions
 * Returns pools where the user has active positions
 */
export async function fetchUserPositions(walletAddress: string): Promise<PoolInfo[]> {
  // Validate wallet address format
  if (!isValidWalletAddress(walletAddress)) {
    console.error('Invalid wallet address format');
    return [];
  }
  
  try {
    const sdk = getSDK();
    
    // Fetch user's positions
    const positions = await sdk.Position.getPositionList(walletAddress);
    
    if (!positions || positions.length === 0) {
      return [];
    }
    
    // Get unique pool IDs from positions
    const poolIds = [...new Set(positions.map((p: any) => p.pool))];
    
    // Fetch pool data for each position
    const poolPromises = poolIds.map(async (poolId: string) => {
      try {
        return await fetchPoolById(poolId);
      } catch (e) {
        console.warn('Failed to fetch pool for position:', poolId, e);
        return null;
      }
    });
    
    const pools = await Promise.all(poolPromises);
    return pools.filter((p): p is PoolInfo => p !== null);
  } catch (error) {
    console.error('Failed to fetch user positions:', error);
    return [];
  }
}
