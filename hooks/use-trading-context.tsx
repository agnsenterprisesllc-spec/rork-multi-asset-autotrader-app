import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { 
  TradingMode, 
  Signal, 
  Position, 
  Trade, 
  RiskStatus, 
  AppSettings, 
  ConnectionStatus,
  Symbol,
  OrderSide,
  ActionPrompt,
  UserAction,
  UserActionType
} from '@/types/trading';
import { DEFAULT_SETTINGS, MOCK_SYMBOLS, STRATEGIES, INDICATORS, SYMBOL_REGISTRY } from '@/constants/trading';
import { SYMBOL_REGISTRY_SEED, searchSymbols as searchSymbolsInRegistry } from '@/constants/symbols';
import { marketDataService } from '@/services/market-data';
import { MarketData, SymbolRegistry } from '@/types/trading';
import { wsClient } from '@/services/ws-client';

const STORAGE_KEYS = {
  SETTINGS: 'trading_settings',
  MODE: 'trading_mode',
  WATCHLIST: 'watchlist',
  TRADES: 'trades_history',
  TRADING_LOCKED: 'trading_locked',
  USER_ACTIONS: 'user_actions',
  SYMBOL_REGISTRY: 'symbol_registry',
};

export const [TradingProvider, useTradingContext] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<TradingMode>('paper');
  const [signals, setSignals] = useState<Signal[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [watchlist, setWatchlist] = useState<Symbol[]>([]);
  const [tradingLocked, setTradingLocked] = useState(false);
  const [userActions, setUserActions] = useState<UserAction[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<ActionPrompt | null>(null);
  const [symbolRegistry, setSymbolRegistry] = useState<SymbolRegistry[]>(SYMBOL_REGISTRY_SEED);
  const [marketData, setMarketData] = useState<Map<string, MarketData>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    api: false,
    websocket: false,
    webull: false,
    topstep: false,
    coinbase: false,
    oanda: false,
    tradingView: false,
  });
  const [settings, setSettings] = useState<AppSettings>({
    ...DEFAULT_SETTINGS,
    tradingViewApiKey: '',
    brokerCredentials: {},
  });
  
  const signalIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const priceIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Load persisted data
  const { data: persistedSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return stored ? JSON.parse(stored) : null;
    },
  });

  const { data: persistedMode } = useQuery({
    queryKey: ['mode'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.MODE);
      return stored || 'paper';
    },
  });

  const { data: persistedWatchlist } = useQuery({
    queryKey: ['watchlist'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.WATCHLIST);
      if (stored) return JSON.parse(stored);
      
      // Default watchlist with registry info
      return MOCK_SYMBOLS.slice(0, 4).map(s => {
        const registryEntry = SYMBOL_REGISTRY.find(r => r.symbol === s.symbol);
        return {
          ...s,
          autoTrade: false,
          manualTrade: true,
          registry: registryEntry,
        };
      });
    },
  });

  const { data: persistedLocked } = useQuery({
    queryKey: ['tradingLocked'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.TRADING_LOCKED);
      return stored === 'true';
    },
  });

  const { data: persistedUserActions } = useQuery({
    queryKey: ['userActions'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER_ACTIONS);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const { data: persistedRegistry } = useQuery({
    queryKey: ['symbolRegistry'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SYMBOL_REGISTRY);
      return stored ? JSON.parse(stored) : SYMBOL_REGISTRY_SEED;
    },
  });

  // Apply persisted data
  useEffect(() => {
    if (persistedSettings) {
      setSettings(prev => ({
        ...prev,
        ...persistedSettings,
        signalEngine: {
          ...DEFAULT_SETTINGS.signalEngine,
          ...persistedSettings.signalEngine,
        },
      }));
    }
  }, [persistedSettings]);

  useEffect(() => {
    if (persistedMode) setMode(persistedMode as TradingMode);
  }, [persistedMode]);

  useEffect(() => {
    if (persistedWatchlist) setWatchlist(persistedWatchlist);
  }, [persistedWatchlist]);

  useEffect(() => {
    if (persistedLocked !== undefined) setTradingLocked(persistedLocked);
  }, [persistedLocked]);

  useEffect(() => {
    if (persistedUserActions) setUserActions(persistedUserActions);
  }, [persistedUserActions]);

  useEffect(() => {
    if (persistedRegistry) setSymbolRegistry(persistedRegistry);
  }, [persistedRegistry]);

  // Save settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: AppSettings) => {
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
      return newSettings;
    },
    onSuccess: (newSettings) => {
      setSettings(newSettings);
      // Update WebSocket client with new URL
      wsClient.updateUrl(newSettings.wsApiUrl);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  // Save mode
  const saveModeMutation = useMutation({
    mutationFn: async (newMode: TradingMode) => {
      await AsyncStorage.setItem(STORAGE_KEYS.MODE, newMode);
      return newMode;
    },
    onSuccess: (newMode) => {
      setMode(newMode);
      queryClient.invalidateQueries({ queryKey: ['mode'] });
    },
  });

  // Save watchlist
  const saveWatchlistMutation = useMutation({
    mutationFn: async (newWatchlist: Symbol[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(newWatchlist));
      return newWatchlist;
    },
    onSuccess: (newWatchlist) => {
      setWatchlist(newWatchlist);
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  // Save trading locked state
  const saveTradingLockedMutation = useMutation({
    mutationFn: async (locked: boolean) => {
      await AsyncStorage.setItem(STORAGE_KEYS.TRADING_LOCKED, locked.toString());
      return locked;
    },
    onSuccess: (locked) => {
      setTradingLocked(locked);
      queryClient.invalidateQueries({ queryKey: ['tradingLocked'] });
    },
  });

  // Save user actions
  const saveUserActionsMutation = useMutation({
    mutationFn: async (actions: UserAction[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ACTIONS, JSON.stringify(actions));
      return actions;
    },
    onSuccess: (actions) => {
      setUserActions(actions);
      queryClient.invalidateQueries({ queryKey: ['userActions'] });
    },
  });

  // Save symbol registry
  const saveSymbolRegistryMutation = useMutation({
    mutationFn: async (registry: SymbolRegistry[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.SYMBOL_REGISTRY, JSON.stringify(registry));
      return registry;
    },
    onSuccess: (registry) => {
      setSymbolRegistry(registry);
      queryClient.invalidateQueries({ queryKey: ['symbolRegistry'] });
    },
  });

  // Close position
  const closePosition = useCallback((position: Position, exitPrice: number) => {
    const pnl = (exitPrice - position.entryPrice) * position.quantity * (position.side === 'buy' ? 1 : -1);
    const pnlPercent = (pnl / (position.entryPrice * position.quantity)) * 100;
    const rMultiple = pnl / settings.riskPerTrade;

    const trade: Trade = {
      id: Date.now().toString(),
      symbol: position.symbol,
      side: position.side,
      quantity: position.quantity,
      entryPrice: position.entryPrice,
      exitPrice,
      entryTime: position.openTime,
      exitTime: new Date(),
      pnl,
      pnlPercent,
      rMultiple,
      strategy: 'Manual',
    };

    setTrades(prev => [trade, ...prev]);
    setPositions(prev => prev.filter(p => p.id !== position.id));
  }, [settings]);

  // Execute signal (create position)
  const executeSignal = useCallback((signal: Signal) => {
    if (tradingLocked || positions.length >= settings.maxConcurrentPositions) return;

    const price = 100 + Math.random() * 50;
    const position: Position = {
      id: Date.now().toString(),
      symbol: signal.symbol,
      side: signal.side,
      quantity: Math.floor(settings.riskPerTrade / price),
      entryPrice: price,
      currentPrice: price,
      stopLoss: signal.side === 'buy' ? price * 0.98 : price * 1.02,
      takeProfit: signal.side === 'buy' ? price * 1.03 : price * 0.97,
      pnl: 0,
      pnlPercent: 0,
      openTime: new Date(),
    };

    setPositions(prev => [...prev, position]);
    setSignals(prev => 
      prev.map(s => s.id === signal.id ? { ...s, executed: true } : s)
    );
  }, [tradingLocked, positions, settings]);

  // Update position prices (simulated)
  const updatePositions = useCallback(() => {
    setPositions(prev => prev.map(pos => {
      const priceChange = (Math.random() - 0.5) * 2;
      const newPrice = pos.currentPrice + priceChange;
      const pnl = (newPrice - pos.entryPrice) * pos.quantity * (pos.side === 'buy' ? 1 : -1);
      const pnlPercent = (pnl / (pos.entryPrice * pos.quantity)) * 100;

      // Check stop loss or take profit
      if (pos.side === 'buy') {
        if (newPrice <= pos.stopLoss || newPrice >= pos.takeProfit) {
          closePosition(pos, newPrice);
          return pos;
        }
      } else {
        if (newPrice >= pos.stopLoss || newPrice <= pos.takeProfit) {
          closePosition(pos, newPrice);
          return pos;
        }
      }

      return { ...pos, currentPrice: newPrice, pnl, pnlPercent };
    }));
  }, [closePosition]);



  // Test connections
  const testConnections = useCallback(async () => {
    const newStatus = { ...connectionStatus };
    
    // Test REST API
    try {
      const response = await fetch(`${settings.restApiUrl}/health`);
      newStatus.api = response.ok;
    } catch {
      newStatus.api = false;
    }

    // Test WebSocket using centralized client
    try {
      wsClient.updateUrl(settings.wsApiUrl);
      wsClient.connect();
      
      // Wait a moment to see if connection succeeds
      await new Promise(resolve => setTimeout(resolve, 1000));
      newStatus.websocket = wsClient.getStatus() === 'connected';
    } catch {
      newStatus.websocket = false;
    }

    // Test broker connections (simulated based on credentials)
    newStatus.webull = !!settings.brokerCredentials.webull?.apiKey;
    newStatus.topstep = !!settings.brokerCredentials.topstep?.apiKey;
    newStatus.coinbase = !!settings.brokerCredentials.coinbase?.apiKey;
    newStatus.oanda = !!settings.brokerCredentials.oanda?.apiKey;
    newStatus.tradingView = !!settings.tradingViewApiKey;

    setConnectionStatus(newStatus);
    return newStatus;
  }, [settings, connectionStatus]);

  // Generate mock signals
  const generateSignal = useCallback(() => {
    if (tradingLocked || mode === 'signals') return;

    const symbol = watchlist[Math.floor(Math.random() * watchlist.length)];
    if (!symbol || !symbol.autoTrade) return;

    const strategy = STRATEGIES[Math.floor(Math.random() * STRATEGIES.length)];
    const side: OrderSide = Math.random() > 0.5 ? 'buy' : 'sell';
    const timeframe = ['1m', '5m', '15m'][Math.floor(Math.random() * 3)] as '1m' | '5m' | '15m';
    
    const signal: Signal = {
      id: Date.now().toString(),
      timestamp: new Date(),
      symbol: symbol.symbol,
      timeframe,
      side,
      strategy,
      indicators: INDICATORS.slice(0, Math.floor(Math.random() * 4) + 2),
      rationale: `${strategy} setup detected with strong confluence`,
      confluenceScore: 60 + Math.random() * 40,
      executed: false,
    };

    setSignals(prev => [signal, ...prev].slice(0, 50));

    // Auto-execute if score > 80 and auto-trade enabled
    if (signal.confluenceScore > 80 && symbol.autoTrade && !tradingLocked) {
      executeSignal(signal);
    }
  }, [watchlist, mode, tradingLocked, executeSignal]);

  // Kill switch
  const killSwitch = useCallback(() => {
    // Close all positions
    positions.forEach(pos => {
      closePosition(pos, pos.currentPrice);
    });
    
    // Lock trading
    saveTradingLockedMutation.mutate(true);
    
    // Stop intervals
    if (signalIntervalRef.current) clearInterval(signalIntervalRef.current);
    if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
    
    Alert.alert('Kill Switch Activated', 'All positions closed and trading locked');
  }, [positions, closePosition, saveTradingLockedMutation.mutate]);

  // Calculate risk status
  const riskStatus = useMemo<RiskStatus>(() => {
    const todaysTrades = trades.filter(t => {
      const today = new Date();
      return t.exitTime?.toDateString() === today.toDateString();
    });

    const dailyPnL = todaysTrades.reduce((sum, t) => sum + t.pnl, 0) +
                     positions.reduce((sum, p) => sum + p.pnl, 0);
    const accountBalance = 10000; // Mock balance
    const dailyPnLPercent = (dailyPnL / accountBalance) * 100;

    return {
      dailyPnL,
      dailyPnLPercent,
      tradesCount: todaysTrades.length,
      maxTradesReached: todaysTrades.length >= settings.maxTradesPerDay,
      dailyLossCapReached: dailyPnL <= settings.dailyLossCap,
      dailyProfitCapReached: dailyPnL >= settings.dailyProfitCap,
      tradingLocked,
      accountBalance,
      buyingPower: accountBalance - positions.reduce((sum, p) => sum + p.entryPrice * p.quantity, 0),
    };
  }, [trades, positions, settings, tradingLocked]);

  // Check risk limits
  useEffect(() => {
    if (riskStatus.dailyLossCapReached || riskStatus.dailyProfitCapReached) {
      killSwitch();
      Alert.alert(
        'Risk Limit Reached',
        riskStatus.dailyLossCapReached 
          ? `Daily loss cap of $${Math.abs(settings.dailyLossCap)} reached`
          : `Daily profit cap of $${settings.dailyProfitCap} reached`,
      );
    }
  }, [riskStatus.dailyLossCapReached, riskStatus.dailyProfitCapReached, settings.dailyLossCap, settings.dailyProfitCap, killSwitch]);



  // Manual trade
  const manualTrade = useCallback((symbol: string, side: OrderSide) => {
    if (tradingLocked || riskStatus.maxTradesReached) {
      Alert.alert('Trading Restricted', 'Cannot place trade due to risk limits');
      return;
    }

    const signal: Signal = {
      id: Date.now().toString(),
      timestamp: new Date(),
      symbol,
      timeframe: '5m',
      side,
      strategy: 'Manual',
      indicators: [],
      rationale: 'Manual trade',
      confluenceScore: 100,
      executed: false,
    };

    setSignals(prev => [signal, ...prev]);
    executeSignal(signal);
  }, [tradingLocked, riskStatus.maxTradesReached, executeSignal]);

  // Log user action
  const logUserAction = useCallback((action: UserActionType, symbol: string, price?: number, promptId?: string) => {
    const userAction: UserAction = {
      id: Date.now().toString(),
      timestamp: new Date(),
      symbol,
      action,
      price,
      prompt_id: promptId,
    };

    const updatedActions = [userAction, ...userActions].slice(0, 1000); // Keep last 1000 actions
    saveUserActionsMutation.mutate(updatedActions);

    console.log('User action logged:', userAction);
  }, [userActions, saveUserActionsMutation.mutate]);

  // Search symbols in registry
  const searchSymbols = useCallback((query: string) => {
    if (!query.trim()) return symbolRegistry;
    return searchSymbolsInRegistry(query);
  }, [symbolRegistry]);

  // Add symbol to registry
  const addToRegistry = useCallback((symbolData: SymbolRegistry) => {
    const exists = symbolRegistry.find(s => s.symbol === symbolData.symbol);
    if (exists) return;

    const updatedRegistry = [...symbolRegistry, symbolData];
    saveSymbolRegistryMutation.mutate(updatedRegistry);
  }, [symbolRegistry, saveSymbolRegistryMutation.mutate]);

  // Add symbol to watchlist with registry lookup
  const addToWatchlist = useCallback(async (symbol: string) => {
    const registryEntry = symbolRegistry.find(r => r.symbol === symbol);
    if (!registryEntry) {
      Alert.alert('Symbol Not Found', 'Please add this symbol to the registry first');
      return;
    }

    const exists = watchlist.find(w => w.symbol === symbol);
    if (exists) {
      Alert.alert('Already Added', 'This symbol is already in your watchlist');
      return;
    }

    const newSymbol: Symbol = {
      id: Date.now().toString(),
      symbol: registryEntry.symbol,
      name: registryEntry.display,
      assetClass: registryEntry.class,
      broker: 'webull', // Default broker
      autoTrade: false,
      manualTrade: true,
      registry: registryEntry,
    };

    const updatedWatchlist = [...watchlist, newSymbol];
    saveWatchlistMutation.mutate(updatedWatchlist);

    // Subscribe to market data
    try {
      await marketDataService.subscribe(symbol, registryEntry);
      marketDataService.onData(symbol, (data: MarketData) => {
        setMarketData(prev => new Map(prev.set(symbol, data)));
      });
      console.log(`Subscribed to market data for ${symbol}`);
    } catch (error) {
      console.error(`Failed to subscribe to market data for ${symbol}:`, error);
    }
  }, [symbolRegistry, watchlist, saveWatchlistMutation.mutate]);

  // Subscribe to market data for watchlist symbols
  useEffect(() => {
    const subscribeToWatchlist = async () => {
      for (const symbol of watchlist) {
        if (symbol.registry) {
          try {
            await marketDataService.subscribe(symbol.symbol, symbol.registry);
            marketDataService.onData(symbol.symbol, (data: MarketData) => {
              setMarketData(prev => new Map(prev.set(symbol.symbol, data)));
            });
          } catch (error) {
            console.error(`Failed to subscribe to ${symbol.symbol}:`, error);
          }
        }
      }
    };

    subscribeToWatchlist();

    return () => {
      // Cleanup subscriptions
      watchlist.forEach(symbol => {
        marketDataService.unsubscribe(symbol.symbol);
      });
    };
  }, [watchlist]);

  // Start/stop signal generation
  useEffect(() => {
    if (mode !== 'signals' && !tradingLocked) {
      signalIntervalRef.current = setInterval(generateSignal, 10000) as ReturnType<typeof setInterval>;
      priceIntervalRef.current = setInterval(updatePositions, 2000) as ReturnType<typeof setInterval>;
    }

    return () => {
      if (signalIntervalRef.current) clearInterval(signalIntervalRef.current);
      if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
    };
  }, [mode, tradingLocked, generateSignal, updatePositions]);

  return {
    mode,
    setMode: saveModeMutation.mutate,
    signals,
    positions,
    trades,
    watchlist,
    setWatchlist: saveWatchlistMutation.mutate,
    settings,
    setSettings: saveSettingsMutation.mutate,
    connectionStatus,
    testConnections,
    riskStatus,
    tradingLocked,
    setTradingLocked: saveTradingLockedMutation.mutate,
    killSwitch,
    manualTrade,
    closePosition,
    userActions,
    logUserAction,
    currentPrompt,
    setCurrentPrompt,
    symbolRegistry,
    searchSymbols,
    addToRegistry,
    addToWatchlist,
    marketData,
  };
});

// Helper hooks
export function useActivePositions() {
  const { positions } = useTradingContext();
  return positions;
}

export function useTodaysTrades() {
  const { trades } = useTradingContext();
  const today = new Date().toDateString();
  return useMemo(
    () => trades.filter(t => t.exitTime?.toDateString() === today),
    [trades, today]
  );
}

export function useRecentSignals(limit = 10) {
  const { signals } = useTradingContext();
  return useMemo(() => signals.slice(0, limit), [signals, limit]);
}