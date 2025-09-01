import { SymbolRegistry, Timeframe } from '@/types/trading';

export interface ApiStatus {
  status: string;
  engine: {
    running: boolean;
    enable_signals: boolean;
    timeframes: Timeframe[];
    min_lookback_bars: number;
    confluence_threshold: number;
    loaded_symbols: string[];
  };
  feeds: {
    ws: boolean;
    rest: boolean;
  };
}

export interface TestSignalRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
}

export interface BackfillRequest {
  symbol: string;
  lookback_minutes: number;
}

export interface SymbolSearchResponse {
  symbols: SymbolRegistry[];
}

export class ApiService {
  constructor(private baseUrl: string) {}

  async getStatus(): Promise<ApiStatus> {
    const response = await fetch(`${this.baseUrl}/status`);
    if (!response.ok) throw new Error('Failed to get status');
    return response.json();
  }

  async testSignal(request: TestSignalRequest): Promise<{ emitted: boolean }> {
    const response = await fetch(`${this.baseUrl}/signals/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    if (!response.ok) throw new Error('Failed to emit test signal');
    return response.json();
  }

  async backfillSymbol(request: BackfillRequest): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/symbols/backfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    if (!response.ok) throw new Error('Failed to backfill symbol');
    return response.json();
  }

  async searchSymbols(query: string): Promise<SymbolSearchResponse> {
    const response = await fetch(`${this.baseUrl}/symbols/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to search symbols');
    return response.json();
  }

  async addSymbol(symbol: SymbolRegistry): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/symbols/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(symbol)
    });
    if (!response.ok) throw new Error('Failed to add symbol');
    return response.json();
  }

  async getSymbolsList(): Promise<{ symbols: SymbolRegistry[] }> {
    const response = await fetch(`${this.baseUrl}/symbols/list`);
    if (!response.ok) throw new Error('Failed to get symbols list');
    return response.json();
  }

  async setActiveSymbol(symbol: string, timeframe: Timeframe): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, timeframe })
    });
    if (!response.ok) throw new Error('Failed to set active symbol');
    return response.json();
  }

  async logUserAction(action: string, price?: number): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/user-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, price })
    });
    if (!response.ok) throw new Error('Failed to log user action');
    return response.json();
  }

  async getRiskStatus(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/risk`);
    if (!response.ok) throw new Error('Failed to get risk status');
    return response.json();
  }

  async setTradingLock(locked: boolean): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locked })
    });
    if (!response.ok) throw new Error('Failed to set trading lock');
    return response.json();
  }

  async getJournal(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/journal`);
    if (!response.ok) throw new Error('Failed to get journal');
    return response.json();
  }

  async getJournalCsv(date?: string): Promise<string> {
    const url = date ? `${this.baseUrl}/journal.csv?date=${date}` : `${this.baseUrl}/journal.csv`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to get journal CSV');
    return response.text();
  }
}

export const createApiService = (baseUrl: string) => new ApiService(baseUrl);