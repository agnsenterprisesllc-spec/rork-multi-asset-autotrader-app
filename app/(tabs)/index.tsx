import React, { useEffect } from 'react';
import { 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TRADING_COLORS } from '@/constants/trading';
import { useTradingContext, useActivePositions, useRecentSignals } from '@/hooks/use-trading-context';
import { ModeBadge } from '@/components/ModeBadge';
import { ConnectionIndicator } from '@/components/ConnectionIndicator';
import { PnLDisplay } from '@/components/PnLDisplay';
import { RiskBar } from '@/components/RiskBar';
import { ActionCard } from '@/components/ActionCard';
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react-native';
import { router } from 'expo-router';

export default function DashboardScreen() {
  const { 
    mode, 
    connectionStatus, 
    riskStatus, 
    settings,
    testConnections,
    manualTrade,
    tradingLocked,
    currentPrompt,
    logUserAction,
    watchlist,
    marketData
  } = useTradingContext();
  
  const positions = useActivePositions();
  const signals = useRecentSignals(5);
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    testConnections();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await testConnections();
    setRefreshing(false);
  }, [testConnections]);

  const handleQuickTrade = (side: 'buy' | 'sell') => {
    if (positions.length === 0) {
      Alert.alert('No Symbol', 'Add symbols to watchlist first');
      return;
    }
    const symbol = positions[0]?.symbol || 'AAPL';
    manualTrade(symbol, side);
  };

  const handleUserAction = (action: any, price?: number) => {
    if (currentPrompt) {
      logUserAction(action, currentPrompt.symbol, price, currentPrompt.symbol + '_' + Date.now());
    }
  };

  const handleSymbolTap = (symbol: string) => {
    router.push(`/chart/${symbol}`);
  };

  const isConnected = connectionStatus.api || connectionStatus.websocket;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>AutoTrader</Text>
          <ModeBadge mode={mode} />
        </View>
        <View style={styles.headerRight}>
          <ConnectionIndicator connected={isConnected} />
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={TRADING_COLORS.primary}
          />
        }
      >
        {/* Action Card */}
        <ActionCard
          prompt={currentPrompt}
          onAction={handleUserAction}
          disabled={tradingLocked || riskStatus.maxTradesReached}
        />
        {/* Account Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Summary</Text>
          <View style={styles.accountGrid}>
            <View style={styles.accountItem}>
              <Text style={styles.accountLabel}>Daily P&L</Text>
              <PnLDisplay 
                value={riskStatus.dailyPnL} 
                percent={riskStatus.dailyPnLPercent}
                size="large"
              />
            </View>
            <View style={styles.accountItem}>
              <Text style={styles.accountLabel}>Balance</Text>
              <Text style={styles.accountValue}>
                ${riskStatus.accountBalance.toFixed(0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Risk Metrics */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Risk Management</Text>
          <View style={styles.riskGrid}>
            <RiskBar 
              label="Daily Loss Cap"
              current={Math.min(0, riskStatus.dailyPnL)}
              max={settings.dailyLossCap}
              color={TRADING_COLORS.loss}
            />
            <RiskBar 
              label="Daily Profit Cap"
              current={Math.max(0, riskStatus.dailyPnL)}
              max={settings.dailyProfitCap}
              color={TRADING_COLORS.profit}
            />
            <RiskBar 
              label="Trades Today"
              current={riskStatus.tradesCount}
              max={settings.maxTradesPerDay}
            />
          </View>
          {tradingLocked && (
            <View style={styles.lockedBanner}>
              <Text style={styles.lockedText}>⚠️ Trading Locked</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Trade</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={[styles.buyButton, tradingLocked && styles.disabledButton]}
              onPress={() => handleQuickTrade('buy')}
              disabled={tradingLocked}
            >
              <TrendingUp size={20} color={TRADING_COLORS.text} />
              <Text style={styles.buttonText}>BUY</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sellButton, tradingLocked && styles.disabledButton]}
              onPress={() => handleQuickTrade('sell')}
              disabled={tradingLocked}
            >
              <TrendingDown size={20} color={TRADING_COLORS.text} />
              <Text style={styles.buttonText}>SELL</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Positions */}
        {positions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Active Positions ({positions.length})</Text>
            {positions.map(position => (
              <TouchableOpacity 
                key={position.id} 
                style={styles.positionItem}
                onPress={() => handleSymbolTap(position.symbol)}
              >
                <View style={styles.positionHeader}>
                  <Text style={styles.positionSymbol}>{position.symbol}</Text>
                  <Text style={[styles.positionSide, { 
                    color: position.side === 'buy' ? TRADING_COLORS.profit : TRADING_COLORS.loss 
                  }]}>
                    {position.side.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.positionDetails}>
                  <Text style={styles.positionText}>
                    {position.quantity} @ ${position.entryPrice.toFixed(2)}
                  </Text>
                  <PnLDisplay value={position.pnl} percent={position.pnlPercent} size="small" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Market Overview */}
        {watchlist.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Market Overview</Text>
            {watchlist.slice(0, 4).map(symbol => {
              const data = marketData.get(symbol.symbol);
              return (
                <TouchableOpacity 
                  key={symbol.id} 
                  style={styles.marketItem}
                  onPress={() => handleSymbolTap(symbol.symbol)}
                >
                  <View style={styles.marketHeader}>
                    <Text style={styles.marketSymbol}>{symbol.symbol}</Text>
                    <View style={styles.marketBadges}>
                      {data?.delayed && (
                        <Text style={styles.delayedBadge}>DELAYED</Text>
                      )}
                      <Text style={styles.providerBadge}>{data?.provider || 'sim'}</Text>
                    </View>
                  </View>
                  <View style={styles.marketDetails}>
                    <Text style={styles.marketName}>{symbol.name}</Text>
                    {data && (
                      <View style={styles.priceInfo}>
                        <Text style={styles.marketPrice}>${data.price.toFixed(2)}</Text>
                        <Text style={[
                          styles.marketChange,
                          { color: data.change >= 0 ? TRADING_COLORS.profit : TRADING_COLORS.loss }
                        ]}>
                          {data.change >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Recent Signals */}
        {signals.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Signals</Text>
            {signals.map(signal => (
              <TouchableOpacity 
                key={signal.id} 
                style={styles.signalItem}
                onPress={() => handleSymbolTap(signal.symbol)}
              >
                <View style={styles.signalHeader}>
                  <Text style={styles.signalSymbol}>{signal.symbol}</Text>
                  <View style={styles.signalScore}>
                    <Activity size={14} color={TRADING_COLORS.primary} />
                    <Text style={styles.scoreText}>{signal.confluenceScore.toFixed(0)}</Text>
                  </View>
                </View>
                <Text style={styles.signalStrategy}>{signal.strategy}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 20 }} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TRADING_COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TRADING_COLORS.text,
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: TRADING_COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TRADING_COLORS.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TRADING_COLORS.text,
    marginBottom: 16,
  },
  accountGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  accountItem: {
    gap: 4,
  },
  accountLabel: {
    fontSize: 12,
    color: TRADING_COLORS.textSecondary,
  },
  accountValue: {
    fontSize: 24,
    fontWeight: '600',
    color: TRADING_COLORS.text,
  },
  riskGrid: {
    gap: 16,
  },
  lockedBanner: {
    backgroundColor: TRADING_COLORS.danger,
    padding: 8,
    borderRadius: 6,
    marginTop: 12,
    alignItems: 'center',
  },
  lockedText: {
    color: TRADING_COLORS.text,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  buyButton: {
    flex: 1,
    backgroundColor: TRADING_COLORS.profit,
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sellButton: {
    flex: 1,
    backgroundColor: TRADING_COLORS.loss,
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: TRADING_COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  positionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TRADING_COLORS.border,
  },
  positionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  positionSymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: TRADING_COLORS.text,
  },
  positionSide: {
    fontSize: 12,
    fontWeight: '600',
  },
  positionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  positionText: {
    fontSize: 12,
    color: TRADING_COLORS.textSecondary,
  },
  signalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TRADING_COLORS.border,
  },
  signalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  signalSymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: TRADING_COLORS.text,
  },
  signalScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    fontSize: 12,
    color: TRADING_COLORS.primary,
    fontWeight: '600',
  },
  signalStrategy: {
    fontSize: 12,
    color: TRADING_COLORS.textSecondary,
  },
  marketItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TRADING_COLORS.border,
  },
  marketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  marketSymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: TRADING_COLORS.text,
  },
  marketBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  delayedBadge: {
    fontSize: 10,
    color: TRADING_COLORS.text,
    backgroundColor: TRADING_COLORS.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontWeight: '600',
  },
  providerBadge: {
    fontSize: 10,
    color: TRADING_COLORS.textSecondary,
    backgroundColor: TRADING_COLORS.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontWeight: '600',
  },
  marketDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  marketName: {
    fontSize: 12,
    color: TRADING_COLORS.textSecondary,
    flex: 1,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  marketPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: TRADING_COLORS.text,
  },
  marketChange: {
    fontSize: 12,
    fontWeight: '600',
  },
});