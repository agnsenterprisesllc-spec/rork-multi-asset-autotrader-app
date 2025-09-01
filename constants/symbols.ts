import { SymbolRegistry } from '@/types/trading';

export const SYMBOL_REGISTRY_SEED: SymbolRegistry[] = [
  // Futures (CME/Globex)
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
    session: 'CME_GLOBEX',
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
    session: 'CME_GLOBEX',
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
  // Agricultural Futures
  {
    symbol: 'ZC',
    class: 'futures',
    display: 'Corn',
    provider_codes: {
      tradingview: 'CBOT:ZC1!'
    },
    tick_size: 0.25,
    point_value: 12.5,
    contract_size: 'FUT',
    session: 'CBOT',
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'ZW',
    class: 'futures',
    display: 'Wheat',
    provider_codes: {
      tradingview: 'CBOT:ZW1!'
    },
    tick_size: 0.25,
    point_value: 12.5,
    contract_size: 'FUT',
    session: 'CBOT',
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'ZS',
    class: 'futures',
    display: 'Soybeans',
    provider_codes: {
      tradingview: 'CBOT:ZS1!'
    },
    tick_size: 0.25,
    point_value: 12.5,
    contract_size: 'FUT',
    session: 'CBOT',
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'ZM',
    class: 'futures',
    display: 'Soy Meal',
    provider_codes: {
      tradingview: 'CBOT:ZM1!'
    },
    tick_size: 0.1,
    point_value: 10,
    contract_size: 'FUT',
    session: 'CBOT',
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'ZL',
    class: 'futures',
    display: 'Soy Oil',
    provider_codes: {
      tradingview: 'CBOT:ZL1!'
    },
    tick_size: 0.01,
    point_value: 6,
    contract_size: 'FUT',
    session: 'CBOT',
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'ZO',
    class: 'futures',
    display: 'Oats',
    provider_codes: {
      tradingview: 'CBOT:ZO1!'
    },
    tick_size: 0.25,
    point_value: 12.5,
    contract_size: 'FUT',
    session: 'CBOT',
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'LE',
    class: 'futures',
    display: 'Live Cattle',
    provider_codes: {
      tradingview: 'CME:LE1!'
    },
    tick_size: 0.025,
    point_value: 10,
    contract_size: 'FUT',
    session: 'CME',
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'GF',
    class: 'futures',
    display: 'Feeder Cattle',
    provider_codes: {
      tradingview: 'CME:GF1!'
    },
    tick_size: 0.025,
    point_value: 12.5,
    contract_size: 'FUT',
    session: 'CME',
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'HE',
    class: 'futures',
    display: 'Lean Hogs',
    provider_codes: {
      tradingview: 'CME:HE1!'
    },
    tick_size: 0.025,
    point_value: 10,
    contract_size: 'FUT',
    session: 'CME',
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'DC',
    class: 'futures',
    display: 'Class III Milk',
    provider_codes: {
      tradingview: 'CME:DC1!'
    },
    tick_size: 0.01,
    point_value: 200,
    contract_size: 'FUT',
    session: 'CME',
    default_timeframes: ['1m', '5m', '15m']
  },
  // Equities/ETFs
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
    display: 'Apple',
    provider_codes: {
      tradingview: 'NASDAQ:AAPL',
      polygon: 'AAPL'
    },
    tick_size: 0.01,
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'TSLA',
    class: 'equity',
    display: 'Tesla',
    provider_codes: {
      tradingview: 'NASDAQ:TSLA',
      polygon: 'TSLA'
    },
    tick_size: 0.01,
    default_timeframes: ['1m', '5m', '15m']
  },
  {
    symbol: 'NVDA',
    class: 'equity',
    display: 'NVIDIA',
    provider_codes: {
      tradingview: 'NASDAQ:NVDA',
      polygon: 'NVDA'
    },
    tick_size: 0.01,
    default_timeframes: ['1m', '5m', '15m']
  },
  // FX
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
  },
  // Crypto
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
  }
];

export const getSymbolByCode = (symbol: string): SymbolRegistry | undefined => {
  return SYMBOL_REGISTRY_SEED.find(s => s.symbol.toLowerCase() === symbol.toLowerCase());
};

export const searchSymbols = (query: string): SymbolRegistry[] => {
  const q = query.toLowerCase();
  return SYMBOL_REGISTRY_SEED.filter(s => 
    s.symbol.toLowerCase().includes(q) || 
    s.display.toLowerCase().includes(q)
  );
};

export const getSymbolsByClass = (assetClass: string): SymbolRegistry[] => {
  return SYMBOL_REGISTRY_SEED.filter(s => s.class === assetClass);
};