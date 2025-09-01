import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { TRADING_COLORS } from '@/constants/trading';
import { useTradingContext } from '@/hooks/use-trading-context';
import { ActionCard } from '@/components/ActionCard';
import { Timeframe, ActionPrompt, UserActionType } from '@/types/trading';
import { ArrowLeft, BarChart3, Wifi, WifiOff } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { isConnected, onWsStatus, connectWs } from '@/services/ws-client';
import { usePricePolling } from '@/services/price-poll';

export default function ChartScreen() {
  const { symbol: symbolParam } = useLocalSearchParams<{ symbol: string }>();
  const { 
    settings, 
    connectionStatus, 
    riskStatus, 
    tradingLocked,
    watchlist 
  } = useTradingContext();
  
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('5m');
  const [currentPrompt, setCurrentPrompt] = useState<ActionPrompt | null>(null);
  const [marketData, setMarketData] = useState<{
    price: number;
    change: number;
    changePercent: number;
    delayed?: boolean;
  } | null>(null);
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [wsHealthy, setWsHealthy] = useState(false);
  
  const promptTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  
  // Use polling fallback when WebSocket is not connected
  const { price: polledPrice } = usePricePolling(
    symbolParam || '',
    wsStatus !== 'connected',
    settings.restApiUrl
  );

  // Find symbol in watchlist or registry
  const symbolInfo = watchlist.find(s => s.symbol === symbolParam);
  const registryInfo = symbolInfo?.registry;

  // WebSocket message handler
  const handleWebSocketMessage = React.useCallback((message: any) => {
    if (message.type === 'price' && message.symbol === symbolParam) {
      setMarketData(prev => ({
        price: message.price,
        change: prev ? message.price - prev.price : 0,
        changePercent: prev ? ((message.price - prev.price) / prev.price) * 100 : 0,
        delayed: false
      }));
    } else if (message.type === 'bar' && message.symbol === symbolParam) {
      // Handle bar data if needed
      console.log('Received bar data:', message.bar);
    } else if (message.type === 'action_prompt' && message.symbol === symbolParam) {
      setCurrentPrompt(message.payload);
    }
  }, [symbolParam]);

  // WebSocket status handler
  const handleWebSocketStatus = React.useCallback((status: 'connected' | 'connecting' | 'disconnected') => {
    setWsStatus(status);
    setWsHealthy(status === 'connected');
    
    // Log status changes for debugging
    console.log(`WebSocket status changed to: ${status}`);
  }, []);

  // WebSocket error handler - simplified
  const handleWebSocketError = React.useCallback((error: any) => {
    // Only log meaningful errors, not browser WebSocket events
    if (error && typeof error === 'string') {
      console.log('WebSocket error:', error);
    }
    setWsHealthy(false);
  }, []);

  // Update market data from polling when WebSocket is not available
  useEffect(() => {
    if (polledPrice && wsStatus !== 'connected') {
      setMarketData(prev => ({
        price: polledPrice,
        change: prev ? polledPrice - prev.price : 0,
        changePercent: prev ? ((polledPrice - prev.price) / prev.price) * 100 : 0,
        delayed: true
      }));
    }
  }, [polledPrice, wsStatus]);

  const startPromptGeneration = React.useCallback(() => {
    if (tradingLocked) return;

    const generatePrompt = () => {
      const actions: ActionPrompt['action'][] = ['BUY', 'SELL', 'TP', 'FLATTEN', 'WAIT'];
      const action = actions[Math.floor(Math.random() * actions.length)];
      
      if (action === 'WAIT') {
        setCurrentPrompt(null);
      } else {
        const basePrice = marketData?.price || 100;
        const entry = basePrice + (Math.random() - 0.5) * 2;
        const stopDistance = 0.5 + Math.random() * 1.5;
        const stop = action === 'BUY' ? entry - stopDistance : entry + stopDistance;
        const targetDistance = 1 + Math.random() * 2;
        const target1 = action === 'BUY' ? entry + targetDistance : entry - targetDistance;
        const target2 = action === 'BUY' ? entry + targetDistance * 1.5 : entry - targetDistance * 1.5;

        const prompt: ActionPrompt = {
          symbol: symbolParam || 'UNKNOWN',
          tf: selectedTimeframe,
          action,
          entry,
          stop,
          targets: [target1, target2],
          confidence: 0.6 + Math.random() * 0.4,
          rationale: `${selectedTimeframe} confluence detected with strong momentum and volume confirmation`,
          risk_suggestion: {
            contracts: Math.floor(settings.riskPerTrade / Math.abs(entry - stop)),
            risk_usd: Math.round(Math.abs(entry - stop) * 10)
          },
          barEndsInSec: 30 + Math.floor(Math.random() * 90)
        };

        setCurrentPrompt(prompt);
      }

      // Generate next prompt in 15-45 seconds
      promptTimeoutRef.current = setTimeout(generatePrompt, 15000 + Math.random() * 30000) as ReturnType<typeof setTimeout>;
    };

    // Start first prompt after 5 seconds
    promptTimeoutRef.current = setTimeout(generatePrompt, 5000) as ReturnType<typeof setTimeout>;
  }, [tradingLocked, marketData?.price, selectedTimeframe, symbolParam, settings.riskPerTrade]);

  useEffect(() => {
    if (!symbolParam) return;

    // Set up WebSocket status listener
    const unsubscribeStatus = onWsStatus(handleWebSocketStatus);
    
    // Connect to WebSocket
    if (settings.wsApiUrl) {
      connectWs(settings.wsApiUrl);
    }
    
    // Start generating action prompts
    startPromptGeneration();

    return () => {
      // Clean up status listener
      unsubscribeStatus();
      
      if (promptTimeoutRef.current) {
        clearTimeout(promptTimeoutRef.current);
      }
    };
  }, [symbolParam, settings.wsApiUrl, handleWebSocketStatus, startPromptGeneration]);



  const handleUserAction = async (action: UserActionType, price?: number) => {
    console.log('User action:', action, 'at price:', price);
    
    // Log the action
    try {
      if (settings.restApiUrl && connectionStatus.api) {
        await fetch(`${settings.restApiUrl}/user-action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: symbolParam,
            action,
            price,
            prompt_id: currentPrompt?.symbol + '_' + Date.now()
          })
        });
      }
    } catch (error) {
      console.error('Failed to log user action:', error);
    }

    // Clear current prompt after action
    if (action !== 'skip') {
      setCurrentPrompt(null);
      Alert.alert(
        'Action Recorded',
        `${action.toUpperCase()} action logged for ${symbolParam}${price ? ` at $${price.toFixed(2)}` : ''}`
      );
    }
  };

  const getTradingViewUrl = () => {
    if (!registryInfo?.provider_codes.tradingview) {
      return null;
    }

    const tvSymbol = registryInfo.provider_codes.tradingview;
    const interval = selectedTimeframe === '1m' ? '1' : selectedTimeframe === '5m' ? '5' : '15';
    
    return `https://www.tradingview.com/embed-widget/advanced-chart/?symbol=${tvSymbol}&interval=${interval}&theme=dark&style=1&locale=en&toolbar_bg=%23f1f3f6&enable_publishing=false&hide_top_toolbar=true&hide_legend=true&save_image=false&calendar=false&hide_volume=true&support_host=https%3A%2F%2Fwww.tradingview.com`;
  };

  const timeframes: Timeframe[] = ['1m', '5m', '15m'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={TRADING_COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.symbolHeader}>
          <Text style={styles.symbolTitle}>{symbolParam}</Text>
          <Text style={styles.symbolSubtitle}>
            {registryInfo?.display || symbolInfo?.name || 'Unknown Symbol'}
          </Text>
        </View>

        <View style={styles.connectionStatus}>
          {wsHealthy ? (
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, { backgroundColor: TRADING_COLORS.success }]} />
              <Wifi size={16} color={TRADING_COLORS.success} />
            </View>
          ) : wsStatus === 'connecting' ? (
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, { backgroundColor: TRADING_COLORS.warning }]} />
              <Wifi size={16} color={TRADING_COLORS.warning} />
            </View>
          ) : (
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, { backgroundColor: TRADING_COLORS.textSecondary }]} />
              <WifiOff size={16} color={TRADING_COLORS.textSecondary} />
            </View>
          )}
        </View>
      </View>

      {/* Market Data */}
      {marketData && (
        <View style={styles.marketData}>
          <View style={styles.priceInfo}>
            <Text style={styles.price}>${marketData.price.toFixed(2)}</Text>
            <View style={styles.changeInfo}>
              <Text style={[
                styles.change,
                { color: marketData.change >= 0 ? TRADING_COLORS.profit : TRADING_COLORS.loss }
              ]}>
                {marketData.change >= 0 ? '+' : ''}${marketData.change.toFixed(2)} ({marketData.changePercent.toFixed(2)}%)
              </Text>
              {marketData.delayed && (
                <Text style={styles.delayedBadge}>POLLING FALLBACK</Text>
              )}
              {!wsHealthy && !marketData.delayed && wsStatus === 'connecting' && (
                <Text style={styles.delayedBadge}>CONNECTING...</Text>
              )}
              {!wsHealthy && !marketData.delayed && wsStatus === 'disconnected' && (
                <Text style={styles.delayedBadge}>DISCONNECTED</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Timeframe Selector */}
      <View style={styles.timeframeSelector}>
        {timeframes.map(tf => (
          <TouchableOpacity
            key={tf}
            style={[
              styles.timeframeButton,
              selectedTimeframe === tf && styles.timeframeButtonActive
            ]}
            onPress={() => setSelectedTimeframe(tf)}
          >
            <Text style={[
              styles.timeframeText,
              selectedTimeframe === tf && styles.timeframeTextActive
            ]}>
              {tf}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Action Card */}
        <ActionCard
          prompt={currentPrompt}
          onAction={handleUserAction}
          disabled={tradingLocked || riskStatus.maxTradesReached}
        />

        {/* Chart */}
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <BarChart3 size={20} color={TRADING_COLORS.text} />
            <Text style={styles.chartTitle}>Live Chart</Text>
            <View style={styles.chartHeaderRight}>
              <Text style={styles.chartTimeframe}>{selectedTimeframe}</Text>
              {wsHealthy ? (
                <View style={[styles.statusDot, { backgroundColor: TRADING_COLORS.success }]} />
              ) : marketData?.delayed ? (
                <View style={[styles.statusDot, { backgroundColor: TRADING_COLORS.warning }]} />
              ) : (
                <View style={[styles.statusDot, { backgroundColor: TRADING_COLORS.textSecondary }]} />
              )}
            </View>
          </View>

          {getTradingViewUrl() ? (
            <WebView
              source={{ uri: getTradingViewUrl()! }}
              style={styles.chart}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              scalesPageToFit={Platform.OS === 'android'}
            />
          ) : (
            <View style={styles.chartPlaceholder}>
              <BarChart3 size={48} color={TRADING_COLORS.textSecondary} />
              <Text style={styles.chartPlaceholderText}>
                Chart not available for {symbolParam}
              </Text>
              <Text style={styles.chartPlaceholderSubtext}>
                TradingView integration required
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TRADING_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TRADING_COLORS.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  symbolHeader: {
    flex: 1,
  },
  symbolTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TRADING_COLORS.text,
  },
  symbolSubtitle: {
    fontSize: 14,
    color: TRADING_COLORS.textSecondary,
  },
  connectionStatus: {
    padding: 8,
  },
  marketData: {
    backgroundColor: TRADING_COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TRADING_COLORS.border,
  },
  priceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: TRADING_COLORS.text,
  },
  changeInfo: {
    alignItems: 'flex-end',
    gap: 4,
  },
  change: {
    fontSize: 16,
    fontWeight: '600',
  },
  delayedBadge: {
    fontSize: 10,
    color: TRADING_COLORS.warning,
    backgroundColor: TRADING_COLORS.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  timeframeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: TRADING_COLORS.border,
  },
  timeframeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: TRADING_COLORS.surfaceLight,
  },
  timeframeButtonActive: {
    backgroundColor: TRADING_COLORS.primary,
  },
  timeframeText: {
    fontSize: 14,
    fontWeight: '600',
    color: TRADING_COLORS.textSecondary,
  },
  timeframeTextActive: {
    color: TRADING_COLORS.text,
  },
  content: {
    flex: 1,
  },
  chartContainer: {
    backgroundColor: TRADING_COLORS.surface,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TRADING_COLORS.border,
    overflow: 'hidden',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TRADING_COLORS.border,
    gap: 8,
  },
  chartTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: TRADING_COLORS.text,
  },
  chartHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartTimeframe: {
    fontSize: 14,
    color: TRADING_COLORS.textSecondary,
    backgroundColor: TRADING_COLORS.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  chart: {
    height: 400,
    backgroundColor: TRADING_COLORS.background,
  },
  chartPlaceholder: {
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  chartPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: TRADING_COLORS.textSecondary,
  },
  chartPlaceholderSubtext: {
    fontSize: 14,
    color: TRADING_COLORS.textSecondary,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});