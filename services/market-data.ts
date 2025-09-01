import { MarketData, SymbolRegistry, Timeframe } from '@/types/trading';

export interface MarketDataProvider {
  name: string;
  subscribe(symbol: string, timeframe: Timeframe): Promise<void>;
  unsubscribe(symbol: string): void;
  isConnected(): boolean;
  getLastPrice(symbol: string): number | null;
  onData(symbol: string, callback: (data: MarketData) => void): void;
}

export class CoinbaseProvider implements MarketDataProvider {
  name = 'coinbase';
  private ws: WebSocket | null = null;
  private subscriptions = new Set<string>();
  private prices = new Map<string, number>();
  private callbacks = new Map<string, (data: MarketData) => void>();

  async subscribe(symbol: string, timeframe: Timeframe): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    const coinbaseSymbol = this.mapSymbol(symbol);
    if (!coinbaseSymbol) return;

    if (!this.subscriptions.has(coinbaseSymbol)) {
      this.subscriptions.add(coinbaseSymbol);
      this.ws?.send(JSON.stringify({
        type: 'subscribe',
        product_ids: [coinbaseSymbol],
        channels: ['ticker']
      }));
    }
  }

  unsubscribe(symbol: string): void {
    const coinbaseSymbol = this.mapSymbol(symbol);
    if (!coinbaseSymbol) return;

    if (this.subscriptions.has(coinbaseSymbol)) {
      this.subscriptions.delete(coinbaseSymbol);
      this.ws?.send(JSON.stringify({
        type: 'unsubscribe',
        product_ids: [coinbaseSymbol],
        channels: ['ticker']
      }));
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getLastPrice(symbol: string): number | null {
    const coinbaseSymbol = this.mapSymbol(symbol);
    return coinbaseSymbol ? this.prices.get(coinbaseSymbol) || null : null;
  }

  onData(symbol: string, callback: (data: MarketData) => void): void {
    this.callbacks.set(symbol, callback);
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
      
      this.ws.onopen = () => {
        console.log('Coinbase WebSocket connected');
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('Coinbase WebSocket error:', error);
        reject(error);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ticker') {
            this.handleTicker(data);
          }
        } catch (error) {
          console.error('Error parsing Coinbase message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('Coinbase WebSocket disconnected');
        setTimeout(() => this.reconnect(), 5000);
      };
    });
  }

  private reconnect(): void {
    if (this.subscriptions.size > 0) {
      this.connect().catch(console.error);
    }
  }

  private handleTicker(data: any): void {
    const price = parseFloat(data.price);
    const change = parseFloat(data.price) - parseFloat(data.open_24h);
    const changePercent = (change / parseFloat(data.open_24h)) * 100;

    this.prices.set(data.product_id, price);

    const symbol = this.unmapSymbol(data.product_id);
    if (symbol) {
      const marketData: MarketData = {
        symbol,
        price,
        change,
        changePercent,
        volume: parseFloat(data.volume_24h),
        timestamp: new Date(),
        provider: 'coinbase'
      };

      const callback = this.callbacks.get(symbol);
      if (callback) {
        callback(marketData);
      }
    }
  }

  private mapSymbol(symbol: string): string | null {
    const mapping: Record<string, string> = {
      'BTCUSD': 'BTC-USD',
      'ETHUSD': 'ETH-USD'
    };
    return mapping[symbol] || null;
  }

  private unmapSymbol(coinbaseSymbol: string): string | null {
    const mapping: Record<string, string> = {
      'BTC-USD': 'BTCUSD',
      'ETH-USD': 'ETHUSD'
    };
    return mapping[coinbaseSymbol] || null;
  }
}

export class SimulatedProvider implements MarketDataProvider {
  name = 'simulated';
  private subscriptions = new Map<string, ReturnType<typeof setInterval>>();
  private prices = new Map<string, number>();
  private callbacks = new Map<string, (data: MarketData) => void>();

  async subscribe(symbol: string, timeframe: Timeframe): Promise<void> {
    if (this.subscriptions.has(symbol)) return;

    // Initialize with a base price
    const basePrice = this.getBasePrice(symbol);
    this.prices.set(symbol, basePrice);

    // Start simulated price updates
    const interval = setInterval(() => {
      this.generatePriceUpdate(symbol);
    }, 2000 + Math.random() * 3000); // Random interval 2-5 seconds

    this.subscriptions.set(symbol, interval);
  }

  unsubscribe(symbol: string): void {
    const interval = this.subscriptions.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.subscriptions.delete(symbol);
      this.prices.delete(symbol);
    }
  }

  isConnected(): boolean {
    return true; // Simulated provider is always "connected"
  }

  getLastPrice(symbol: string): number | null {
    return this.prices.get(symbol) || null;
  }

  onData(symbol: string, callback: (data: MarketData) => void): void {
    this.callbacks.set(symbol, callback);
  }

  private getBasePrice(symbol: string): number {
    const basePrices: Record<string, number> = {
      'GC': 2450.0,
      'MGC': 2450.0,
      'ES': 5800.0,
      'MES': 5800.0,
      'NQ': 20000.0,
      'MNQ': 20000.0,
      'CL': 85.0,
      'ZC': 450.0,
      'ZW': 550.0,
      'ZS': 1200.0,
      'ZM': 350.0,
      'ZL': 45.0,
      'ZO': 350.0,
      'LE': 180.0,
      'GF': 250.0,
      'HE': 75.0,
      'DC': 20.0,
      'SPY': 580.0,
      'QQQ': 500.0,
      'AAPL': 230.0,
      'TSLA': 250.0,
      'NVDA': 140.0,
      'EURUSD': 1.0850,
      'GBPUSD': 1.2650,
      'USDJPY': 155.50,
      'BTCUSD': 95000.0,
      'ETHUSD': 3500.0
    };
    return basePrices[symbol] || 100.0;
  }

  private generatePriceUpdate(symbol: string): void {
    const currentPrice = this.prices.get(symbol) || this.getBasePrice(symbol);
    
    // Generate realistic price movement
    const volatility = this.getVolatility(symbol);
    const change = (Math.random() - 0.5) * volatility * currentPrice;
    const newPrice = Math.max(0.01, currentPrice + change);
    
    this.prices.set(symbol, newPrice);

    const changePercent = (change / currentPrice) * 100;
    const volume = Math.random() * 1000000;

    const marketData: MarketData = {
      symbol,
      price: newPrice,
      change,
      changePercent,
      volume,
      timestamp: new Date(),
      provider: 'simulated',
      delayed: true
    };

    const callback = this.callbacks.get(symbol);
    if (callback) {
      callback(marketData);
    }
  }

  private getVolatility(symbol: string): number {
    const volatilities: Record<string, number> = {
      'GC': 0.002,
      'MGC': 0.002,
      'ES': 0.001,
      'MES': 0.001,
      'NQ': 0.0015,
      'MNQ': 0.0015,
      'CL': 0.003,
      'ZC': 0.002,
      'ZW': 0.002,
      'ZS': 0.002,
      'ZM': 0.003,
      'ZL': 0.003,
      'ZO': 0.003,
      'LE': 0.002,
      'GF': 0.002,
      'HE': 0.003,
      'DC': 0.004,
      'SPY': 0.001,
      'QQQ': 0.0015,
      'AAPL': 0.002,
      'TSLA': 0.004,
      'NVDA': 0.003,
      'EURUSD': 0.0005,
      'GBPUSD': 0.0005,
      'USDJPY': 0.0005,
      'BTCUSD': 0.01,
      'ETHUSD': 0.015
    };
    return volatilities[symbol] || 0.002;
  }
}

export class MarketDataService {
  private providers: Map<string, MarketDataProvider> = new Map();
  private subscriptions: Map<string, string> = new Map(); // symbol -> provider name
  private callbacks: Map<string, (data: MarketData) => void> = new Map();

  constructor() {
    // Initialize providers
    this.providers.set('coinbase', new CoinbaseProvider());
    this.providers.set('simulated', new SimulatedProvider());
  }

  async subscribe(symbol: string, registry: SymbolRegistry, timeframe: Timeframe = '1m'): Promise<void> {
    console.log(`Subscribing to ${symbol} data...`);
    
    let provider: MarketDataProvider | null = null;
    let providerName = '';

    // Choose provider based on symbol registry
    if (registry.provider_codes.coinbase && registry.class === 'crypto') {
      provider = this.providers.get('coinbase') || null;
      providerName = 'coinbase';
    } else {
      // Fallback to simulated for all other symbols
      provider = this.providers.get('simulated') || null;
      providerName = 'simulated';
    }

    if (!provider) {
      console.error(`No provider available for ${symbol}`);
      return;
    }

    // Set up data callback
    provider.onData(symbol, (data: MarketData) => {
      const callback = this.callbacks.get(symbol);
      if (callback) {
        callback(data);
      }
    });

    try {
      await provider.subscribe(symbol, timeframe);
      this.subscriptions.set(symbol, providerName);
      console.log(`Successfully subscribed to ${symbol} via ${providerName}`);
    } catch (error) {
      console.error(`Failed to subscribe to ${symbol}:`, error);
      // Fallback to simulated
      if (providerName !== 'simulated') {
        const simProvider = this.providers.get('simulated') || null;
        if (simProvider) {
          simProvider.onData(symbol, (data: MarketData) => {
            const callback = this.callbacks.get(symbol);
            if (callback) {
              callback(data);
            }
          });
          await simProvider.subscribe(symbol, timeframe);
          this.subscriptions.set(symbol, 'simulated');
          console.log(`Fallback: subscribed to ${symbol} via simulated`);
        }
      }
    }
  }

  unsubscribe(symbol: string): void {
    const providerName = this.subscriptions.get(symbol);
    if (providerName) {
      const provider = this.providers.get(providerName);
      if (provider) {
        provider.unsubscribe(symbol);
      }
      this.subscriptions.delete(symbol);
      this.callbacks.delete(symbol);
    }
  }

  onData(symbol: string, callback: (data: MarketData) => void): void {
    this.callbacks.set(symbol, callback);
  }

  getLastPrice(symbol: string): number | null {
    const providerName = this.subscriptions.get(symbol);
    if (providerName) {
      const provider = this.providers.get(providerName);
      return provider?.getLastPrice(symbol) || null;
    }
    return null;
  }

  isConnected(symbol: string): boolean {
    const providerName = this.subscriptions.get(symbol);
    if (providerName) {
      const provider = this.providers.get(providerName);
      return provider?.isConnected() || false;
    }
    return false;
  }

  getProviderName(symbol: string): string | null {
    return this.subscriptions.get(symbol) || null;
  }
}

export const marketDataService = new MarketDataService();