export interface SolanaTransaction {
  transaction: {
    signatures?: string[];
    message: {
      accountKeys: (string | { pubkey: string })[];
      instructions: any[];
    };
  };
  meta?: {
    err?: any;
    fee?: number;
    preBalances?: number[];
    postBalances?: number[];
    innerInstructions?: any[];
    logMessages?: string[];
  };
}

export interface PerformanceSample {
  numTransactions: number;
  samplePeriodSecs: number;
  slot: number;
}

export interface VoteAccount {
  nodePubkey: string;
  activatedStake: number;
  commission: number;
}

export interface NetworkStats {
  tps: number;
  blockHeight: number;
  solPrice: number;
  validators: number;
  peakTps: number;
  hourlyTransactions: number;
  totalAnalyzed: number;
}

export interface WalletInfo {
  address: string;
  name: string;
  balance?: number;
  usdValue?: number;
}

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  supply?: number;
  formattedSupply?: string;
}

export interface BigTransaction {
  amount: number;
  signature: string;
  type: string;
  timestamp: number;
  blockTime?: number;
}

export interface ChartDataPoint {
  time: string;
  value: number;
}

export interface FeeDataPoint {
  time: string;
  avg: number;
  max: number;
}

export interface TransactionTypeStats {
  Transfer: number;
  Swap: number;
  NFT: number;
  Token: number;
  DeFi: number;
  Stake: number;
  Vote: number;
  Other: number;
}

export type TransactionType = keyof TransactionTypeStats;

export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'CNY' | 'INR' | 'KRW' | 'SGD' | 'BRL';

export interface CurrencySymbols {
  [key: string]: string;
}

export interface RpcResponse<T> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

export interface PriceResponse {
  price?: number;
  data?: {
    rates?: {
      [key: string]: number;
    };
  };
  solana?: {
    usd: number;
  };
}

export interface LocationResponse {
  country_code: string;
  country_name: string;
}

import { Chart } from 'chart.js';

export interface ChartInstances {
  tpsChart: Chart | null;
  txTypesChart: Chart | null;
  priceChart: Chart | null;
  activityChart: Chart | null;
  blockTimeChart: Chart | null;
  feeChart: Chart | null;
}

export interface HTMLElementWithTextContent {
  textContent: string;
}

declare global {
  interface Window {
    reinitializeChartsForTheme: () => void;
    toggleTheme: () => void;
    recentFees: number[];
    testChart?: Chart;
    testPieChart?: Chart;
  }
}
