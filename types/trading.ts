export type TradingMode = 'signals' | 'paper' | 'live';

export type AssetClass = 'futures' | 'equity' | 'fx' | 'crypto' | 'index';

export type Timeframe = '1m' | '5m' | '15m';

export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';

export type OrderSide = 'buy' | 'sell';

export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'rejected';

export type BrokerType = 'webull' | 'topstep' | 'coinbase' | 'oanda';

export type ActionType = 'BUY' | 'SELL' | 'TP' | 'FLATTEN' | 'WAIT';

export type UserActionType = 'i_bought' | 'i_sold' | 'tp' | 'flatten' | 'skip';

export interface SymbolRegistry {
  symbol: string;
  class: AssetClass;
  display: string;
  provider_codes: {
    tradingview?: string;
    polygon?: string;
    coinbase?: string;
    oanda?: string;
    projectx?: string;
  };
  tick_size: number;
  point_value?: number;
  contract_size?: string;
  session?: string;
  default_timeframes: Timeframe[];
}

export interface Symbol {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  broker: BrokerType;
  autoTrade: boolean;
  manualTrade: boolean;
  registry?: SymbolRegistry;
}

export interface Signal {
  id: string;
  timestamp: Date;
  symbol: string;
  timeframe: Timeframe;
  side: OrderSide;
  strategy: string;
  indicators: string[];
  rationale: string;
  confluenceScore: number;
  executed: boolean;
}

export interface ActionPrompt {
  symbol: string;
  tf: Timeframe;
  action: ActionType;
  entry: number;
  stop: number;
  targets: number[];
  confidence: number;
  rationale: string;
  risk_suggestion: {
    contracts: number;
    risk_usd: number;
  };
  barEndsInSec: number;
}

export interface UserAction {
  id: string;
  timestamp: Date;
  symbol: string;
  action: UserActionType;
  price?: number;
  prompt_id?: string;
}

export interface Position {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  pnl: number;
  pnlPercent: number;
  openTime: Date;
}

export interface Trade {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  entryTime: Date;
  exitTime?: Date;
  pnl: number;
  pnlPercent: number;
  rMultiple: number;
  strategy: string;
  user_action?: UserActionType;
  prompt_id?: string;
}

export interface RiskStatus {
  dailyPnL: number;
  dailyPnLPercent: number;
  tradesCount: number;
  maxTradesReached: boolean;
  dailyLossCapReached: boolean;
  dailyProfitCapReached: boolean;
  tradingLocked: boolean;
  accountBalance: number;
  buyingPower: number;
}

export interface BrokerCredentials {
  webull?: {
    apiKey: string;
    apiSecret: string;
  };
  topstep?: {
    apiKey: string;
    apiSecret: string;
  };
  coinbase?: {
    apiKey: string;
    apiSecret: string;
  };
  oanda?: {
    apiKey: string;
    accountId: string;
  };
}

export interface SignalEngineConfig {
  enableSignals: boolean;
  timeframes: Timeframe[];
  minLookbackBars: number;
  confluenceThreshold: number;
}

export interface AppSettings {
  restApiUrl: string;
  wsApiUrl: string;
  tradingViewApiKey: string;
  brokerCredentials: BrokerCredentials;
  dailyLossCap: number;
  dailyProfitCap: number;
  maxTradesPerDay: number;
  riskPerTrade: number;
  maxConcurrentPositions: number;
  voiceEnabled: boolean;
  soundEnabled: boolean;
  pushEnabled: boolean;
  confluenceThreshold: number;
  signalEngine: SignalEngineConfig;
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
  provider: string;
  delayed?: boolean;
}

export interface ChartData {
  symbol: string;
  timeframe: Timeframe;
  bars: {
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
  indicators?: Record<string, number[]>;
}

export interface ConnectionStatus {
  api: boolean;
  websocket: boolean;
  webull: boolean;
  topstep: boolean;
  coinbase: boolean;
  oanda: boolean;
  tradingView: boolean;
}