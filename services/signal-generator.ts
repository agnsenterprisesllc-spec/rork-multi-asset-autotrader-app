import { ActionPrompt, ActionType, Timeframe } from '@/types/trading';

export class SignalGenerator {
  private callbacks: Map<string, (prompt: ActionPrompt) => void> = new Map();
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map();

  subscribe(symbol: string, callback: (prompt: ActionPrompt) => void): void {
    this.callbacks.set(symbol, callback);
    this.startGenerating(symbol);
  }

  unsubscribe(symbol: string): void {
    this.callbacks.delete(symbol);
    const interval = this.intervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(symbol);
    }
  }

  private startGenerating(symbol: string): void {
    // Clear existing interval if any
    const existingInterval = this.intervals.get(symbol);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Generate signals every 15-45 seconds
    const interval = setInterval(() => {
      this.generateSignal(symbol);
    }, 15000 + Math.random() * 30000);

    this.intervals.set(symbol, interval);

    // Generate first signal after 5 seconds
    setTimeout(() => this.generateSignal(symbol), 5000);
  }

  private generateSignal(symbol: string): void {
    const callback = this.callbacks.get(symbol);
    if (!callback) return;

    const actions: ActionType[] = ['BUY', 'SELL', 'TP', 'FLATTEN', 'WAIT'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    if (action === 'WAIT') {
      return; // Skip this cycle
    }

    const basePrice = this.getBasePrice(symbol);
    const entry = basePrice + (Math.random() - 0.5) * basePrice * 0.02; // ±2% variation
    const stopDistance = entry * 0.01; // 1% stop loss
    const stop = action === 'BUY' ? entry - stopDistance : entry + stopDistance;
    const targetDistance1 = entry * 0.015; // 1.5% target
    const targetDistance2 = entry * 0.025; // 2.5% target
    const target1 = action === 'BUY' ? entry + targetDistance1 : entry - targetDistance1;
    const target2 = action === 'BUY' ? entry + targetDistance2 : entry - targetDistance2;

    const timeframes: Timeframe[] = ['1m', '5m', '15m'];
    const tf = timeframes[Math.floor(Math.random() * timeframes.length)];

    const prompt: ActionPrompt = {
      symbol,
      tf,
      action,
      entry: Number(entry.toFixed(2)),
      stop: Number(stop.toFixed(2)),
      targets: [Number(target1.toFixed(2)), Number(target2.toFixed(2))],
      confidence: 0.6 + Math.random() * 0.4,
      rationale: this.generateRationale(action, tf),
      risk_suggestion: {
        contracts: Math.floor(50 / Math.abs(entry - stop)),
        risk_usd: Math.round(Math.abs(entry - stop) * 10)
      },
      barEndsInSec: 30 + Math.floor(Math.random() * 90)
    };

    callback(prompt);
  }

  private getBasePrice(symbol: string): number {
    // Return realistic base prices for different symbols
    const prices: Record<string, number> = {
      'BTCUSD': 45000,
      'ETHUSD': 2800,
      'AAPL': 180,
      'TSLA': 250,
      'SPY': 450,
      'QQQ': 380,
      'GC': 2000,
      'MGC': 2000,
      'ES': 4500,
      'NQ': 15000,
      'CL': 75,
      'EURUSD': 1.08,
      'GBPUSD': 1.25,
      'USDJPY': 150
    };

    return prices[symbol] || 100;
  }

  private generateRationale(action: ActionType, tf: Timeframe): string {
    const rationales = {
      BUY: [
        `${tf} uptrend, pullback to EMA20, RSI oversold recovery`,
        `Breakout above resistance with volume confirmation on ${tf}`,
        `VWAP support hold, momentum building on ${tf}`,
        `Double bottom pattern, bullish divergence on RSI ${tf}`
      ],
      SELL: [
        `${tf} downtrend, rejection at EMA50, RSI overbought`,
        `Breakdown below support with volume spike on ${tf}`,
        `VWAP resistance rejection, momentum fading on ${tf}`,
        `Double top pattern, bearish divergence on MACD ${tf}`
      ],
      TP: [
        'Target reached, take partial profits',
        'Resistance level hit, secure gains',
        'Risk/reward achieved, lock in profits'
      ],
      FLATTEN: [
        'Stop loss triggered, exit position',
        'Market conditions changed, close all',
        'Risk management, flatten exposure'
      ],
      WAIT: [
        'Consolidation phase, wait for breakout',
        'Mixed signals, stay on sidelines'
      ]
    };

    const options = rationales[action] || rationales.WAIT;
    return options[Math.floor(Math.random() * options.length)];
  }

  cleanup(): void {
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
    this.callbacks.clear();
  }
}

// Singleton instance
export const signalGenerator = new SignalGenerator();

// Convenience exports
export const { subscribe, unsubscribe } = signalGenerator;