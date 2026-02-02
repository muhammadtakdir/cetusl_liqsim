import BN from 'bn.js';

// Pool info dari Cetus
export interface PoolInfo {
  poolId: string;
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  currentSqrtPrice: BN;
  currentPrice: number;
  liquidity: BN;
  tickSpacing: number;
  feeRate: number;
  volume24h: number;
  tvl: number;
}

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  logoUrl?: string;
}

export interface SimulationInput {
  poolId: string;
  amountA: number;
  amountB: number;
  tickLower: number;
  tickUpper: number;
  priceRangeLower: number;
  priceRangeUpper: number;
}

export interface SimulationResult {
  liquidity: BN;
  initialValueUSD: number;
  ilByPriceChange: ILDataPoint[];
  estimatedAPY: number;
  dailyFees: number;
  yearlyFees: number;
  risks: RiskAssessment;
  breakEvenDays: number;
}

export interface ILDataPoint {
  priceChange: number; // -50% to +100%
  newPrice: number;
  impermanentLoss: number;
  valueIfHold: number;
  valueInPool: number;
}

export interface RiskAssessment {
  outOfRangeRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  volatilityRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  ilRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  warnings: string[];
}

export interface HistoricalData {
  timestamp: number;
  price: number;
  volume: number;
  fees: number;
}

// Popular pools di Cetus Mainnet
export const POPULAR_POOLS = [
  {
    id: '0x2e041f3fd93646dcc877f783c1f2b7fa62d30271bdef1f21ef002cebf857bded',
    name: 'SUI/USDC',
    tokenA: { symbol: 'SUI', name: 'Sui', decimals: 9, address: '0x2::sui::SUI' },
    tokenB: { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN' },
    feeRate: 0.003,
    tickSpacing: 60,
  },
  {
    id: '0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688630',
    name: 'USDC/USDT',
    tokenA: { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN' },
    tokenB: { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN' },
    feeRate: 0.0001,
    tickSpacing: 1,
  },
  {
    id: '0x0254747f5ca059a1972cd7f6016485d51392a3fde608107b93bbaebea550f703',
    name: 'WETH/USDC',
    tokenA: { symbol: 'WETH', name: 'Wrapped ETH', decimals: 8, address: '0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN' },
    tokenB: { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN' },
    feeRate: 0.003,
    tickSpacing: 60,
  },
];
