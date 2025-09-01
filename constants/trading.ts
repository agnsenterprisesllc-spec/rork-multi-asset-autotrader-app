import { SymbolRegistry, Timeframe } from '@/types/trading';
import { DEFAULT_REST, DEFAULT_WS } from '@/constants/env';

export const TRADING_COLORS = {
  profit: '#00D964',
  loss: '#FF3B30',
  warning: '#FF9500',
  primary: '#007AFF',
  background: '#000000',
  surface: '#1C1C1E',
  surfaceLight: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#38383A',
  success: '#34C759',
  danger: '#FF453A',
} as const;

export const DEFAULT_SETTINGS: {
  restApiUrl: string;
  wsApiUrl: string;
  dailyLossCap: number;
  dailyProfitCap: number;
  maxTradesPerDay: number;
  riskPerTrade: number;
  maxConcurrentPositions: number;
  voiceEnabled: boolean;
  soundEnabled: boolean;
  pushEnabled: boolean;
  confluenceThreshold: number;
  signalEngine: {
    enableSignals: boolean;
    timeframes: Timeframe[];
    minLookbackBars: number;
    confluenceThreshold: number;
  };
} = {
  restApiUrl: DEFAULT_REST,
  wsApiUrl: DEFAULT_WS,
  dailyLossCap: -200,
  dailyProfitCap: 7500,
  maxTradesPerDay: 4,
  riskPerTrade: 50,
  maxConcurrentPositions: 1,
  voiceEnabled: false,
  soundEnabled: true,
  pushEnabled: true,
  confluenceThreshold: 70,
  signalEngine: {
    enableSignals: true,
    timeframes: ['1m', '5m', '15m'] as Timeframe[],
    minLookbackBars: 50,
    confluenceThreshold: 35,
  },
};

export const INDICATORS = [
  'EMA(9)',
  'EMA(20)',
  'EMA(50)',
  'EMA(200)',
  'VWAP',
  'RSI(14)',
  'MACD(12,26,9)',
  'ATR(14)',
  'Donchian(20)',
  'Donchian(55)',
  'Bollinger Bands',
  'Volume Z-Score',
] as const;

export const STRATEGIES = [
  'Pullback to EMA',
  'Range Breakout',
  'VWAP Reversion',
] as const;

export const ACTION_COLORS = {
  BUY: TRADING_COLORS.profit,
  SELL: TRADING_COLORS.loss,
  TP: TRADING_COLORS.warning,
  FLATTEN: TRADING_COLORS.danger,
  WAIT: TRADING_COLORS.textSecondary,
} as const;

export const SYMBOL_REGISTRY: SymbolRegistry[] = [
  {
    symbol: 'GC',
    class: 'futures',
    display: 'Gold Futures',
    provider_codes: {
      tradingview: 'COMEX:GC1!',
      projectx: 'GC'
    },
    tick_size: 0.1,
    point_value: 100,
    contract_size: 'FUT',
    session: 'COMEX',
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'MGC',
    class: 'futures',
    display: 'Micro Gold',
    provider_codes: {
      tradingview: 'COMEX:MGC1!',
      projectx: 'MGC'
    },
    tick_size: 0.1,
    point_value: 10,
    contract_size: 'FUT',
    session: 'COMEX',
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'ES',
    class: 'futures',
    display: 'E-mini S&P 500',
    provider_codes: {
      tradingview: 'CME_MINI:ES1!',
      projectx: 'ES'
    },
    tick_size: 0.25,
    point_value: 50,
    contract_size: 'FUT',
    session: 'CME_GLOBEX',
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'MES',
    class: 'futures',
    display: 'Micro E-mini S&P 500',
    provider_codes: {
      tradingview: 'CME_MINI:MES1!',
      projectx: 'MES'
    },
    tick_size: 0.25,
    point_value: 5,
    contract_size: 'FUT',
    session: 'CME_GLOBEX',
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'NQ',
    class: 'futures',
    display: 'E-mini Nasdaq',
    provider_codes: {
      tradingview: 'CME_MINI:NQ1!'
    },
    tick_size: 0.25,
    point_value: 20,
    contract_size: 'FUT',
    session: 'CME_GLOBEX',
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'MNQ',
    class: 'futures',
    display: 'Micro E-mini Nasdaq',
    provider_codes: {
      tradingview: 'CME_MINI:MNQ1!'
    },
    tick_size: 0.25,
    point_value: 2,
    contract_size: 'FUT',
    session: 'CME_GLOBEX',
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'CL',
    class: 'futures',
    display: 'Crude Oil',
    provider_codes: {
      tradingview: 'NYMEX:CL1!'
    },
    tick_size: 0.01,
    point_value: 1000,
    contract_size: 'FUT',
    session: 'NYMEX',
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'MCL',
    class: 'futures',
    display: 'Micro Crude Oil',
    provider_codes: {
      tradingview: 'NYMEX:MCL1!'
    },
    tick_size: 0.01,
    point_value: 100,
    contract_size: 'FUT',
    session: 'NYMEX',
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'SPY',
    class: 'equity',
    display: 'SPDR S&P 500',
    provider_codes: {
      tradingview: 'AMEX:SPY',
      polygon: 'SPY'
    },
    tick_size: 0.01,
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'QQQ',
    class: 'equity',
    display: 'Invesco QQQ',
    provider_codes: {
      tradingview: 'NASDAQ:QQQ',
      polygon: 'QQQ'
    },
    tick_size: 0.01,
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'AAPL',
    class: 'equity',
    display: 'Apple Inc.',
    provider_codes: {
      tradingview: 'NASDAQ:AAPL',
      polygon: 'AAPL'
    },
    tick_size: 0.01,
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'NVDA',
    class: 'equity',
    display: 'NVIDIA Corporation',
    provider_codes: {
      tradingview: 'NASDAQ:NVDA',
      polygon: 'NVDA'
    },
    tick_size: 0.01,
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'TSLA',
    class: 'equity',
    display: 'Tesla Inc.',
    provider_codes: {
      tradingview: 'NASDAQ:TSLA',
      polygon: 'TSLA'
    },
    tick_size: 0.01,
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'BTCUSD',
    class: 'crypto',
    display: 'Bitcoin / USD',
    provider_codes: {
      tradingview: 'COINBASE:BTCUSD',
      coinbase: 'BTC-USD'
    },
    tick_size: 0.01,
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'ETHUSD',
    class: 'crypto',
    display: 'Ethereum / USD',
    provider_codes: {
      tradingview: 'COINBASE:ETHUSD',
      coinbase: 'ETH-USD'
    },
    tick_size: 0.01,
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'EURUSD',
    class: 'fx',
    display: 'EUR/USD',
    provider_codes: {
      tradingview: 'OANDA:EURUSD',
      oanda: 'EUR_USD'
    },
    tick_size: 0.00001,
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'GBPUSD',
    class: 'fx',
    display: 'GBP/USD',
    provider_codes: {
      tradingview: 'OANDA:GBPUSD',
      oanda: 'GBP_USD'
    },
    tick_size: 0.00001,
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'USDJPY',
    class: 'fx',
    display: 'USD/JPY',
    provider_codes: {
      tradingview: 'OANDA:USDJPY',
      oanda: 'USD_JPY'
    },
    tick_size: 0.001,
    default_timeframes: ['1m', '5m', '15m']
  }
];

export const MOCK_SYMBOLS: {
  id: string;
  symbol: string;
  name: string;
  assetClass: string;
  broker: string;
}[] = [
  { id: '1', symbol: 'AAPL', name: 'Apple Inc.', assetClass: 'equity', broker: 'webull' },
  { id: '2', symbol: 'TSLA', name: 'Tesla Inc.', assetClass: 'equity', broker: 'webull' },
  { id: '3', symbol: 'GC', name: 'Gold Futures', assetClass: 'futures', broker: 'topstep' },
  { id: '4', symbol: 'MGC', name: 'Micro Gold', assetClass: 'futures', broker: 'topstep' },
  { id: '5', symbol: 'BTCUSD', name: 'Bitcoin', assetClass: 'crypto', broker: 'coinbase' },
  { id: '6', symbol: 'ETHUSD', name: 'Ethereum', assetClass: 'crypto', broker: 'coinbase' },
  { id: '7', symbol: 'EURUSD', name: 'Euro/US Dollar', assetClass: 'fx', broker: 'oanda' },
  { id: '8', symbol: 'GBPUSD', name: 'British Pound/US Dollar', assetClass: 'fx', broker: 'oanda' },
];