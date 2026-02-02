# Cetus Liquidity Simulator

A web-based tool to simulate liquidity provision on **Cetus DEX** (Concentrated Liquidity Market Maker on Sui blockchain).

## Features

- 🔢 **Impermanent Loss Calculator** - Simulate IL for various price scenarios
- 📊 **APY Estimation** - Calculate expected returns from trading fees
- ⚠️ **Risk Assessment** - Evaluate out-of-range and volatility risks
- 📈 **Interactive Charts** - Visualize IL vs price change scenarios
- 🎯 **Price Range Selection** - Configure tick-based liquidity ranges

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Charts**: Chart.js + react-chartjs-2
- **Math**: BN.js for big number operations
- **SDK**: Cetus CLMM SDK for pool interactions

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/        # React UI components
│   ├── Header.tsx
│   ├── PoolSelector.tsx
│   ├── PoolStats.tsx
│   ├── LiquidityInput.tsx
│   ├── SimulationResults.tsx
│   └── ILChart.tsx
├── utils/            # Calculation utilities
│   ├── tickMath.ts   # Tick <-> Price conversions
│   ├── liquidityMath.ts  # Liquidity calculations
│   └── simulation.ts # IL & APY calculations
├── types/            # TypeScript interfaces
│   └── index.ts
├── App.tsx           # Main application
└── main.tsx          # Entry point
```

## Key Concepts

### CLMM (Concentrated Liquidity Market Maker)

Unlike traditional AMMs where liquidity is spread across all prices, CLMM allows LPs to concentrate liquidity within specific price ranges for higher capital efficiency.

### Impermanent Loss Formula

For CLMM positions:
- **In Range**: IL follows concentrated liquidity formula
- **Out of Range**: Position converts 100% to one token

```
IL = (Value_in_Pool / Value_if_HODL) - 1
```

### APY Calculation

```
Daily Yield = (Daily Fees / Position Value)
APY = (1 + Daily Yield)^365 - 1
```

## Cetus SDK Integration

The simulator uses Cetus SDK functions:

```typescript
import { CetusClmmSDK, ClmmPoolUtil, TickMath } from '@cetusprotocol/cetus-sui-clmm-sdk';

// Get pool data
const pool = await sdk.Pool.getPool(poolId);

// Calculate liquidity from amounts
const liquidity = ClmmPoolUtil.estimateLiquidityFromCoinAmounts(
  currentSqrtPrice,
  sqrtPriceLower,
  sqrtPriceUpper,
  amountA,
  amountB
);

// Get amounts from liquidity at new price
const { coinA, coinB } = ClmmPoolUtil.getCoinAmountFromLiquidity(
  liquidity,
  newSqrtPrice,
  tickLower,
  tickUpper
);
```

## Hackathon Notes

This project is designed as an educational MVP for:
- DeFi newcomers to understand CLMM risks
- Traders to simulate strategies before deployment
- Cetus ecosystem growth and user education

### Future Enhancements

- [ ] Real-time pool data from Sui RPC
- [ ] zkLogin wallet integration
- [ ] Historical backtesting with price data
- [ ] Mobile responsive design improvements
- [ ] Multi-position comparison

## Disclaimer

This is an educational tool for simulation purposes only. Not financial advice. Always DYOR (Do Your Own Research) before providing liquidity.

## License

MIT

## Resources

- [Cetus Protocol](https://www.cetus.zone/)
- [Cetus SDK Docs](https://cetus-1.gitbook.io/)
- [Sui Network](https://sui.io/)
