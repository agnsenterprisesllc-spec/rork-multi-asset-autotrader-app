import React, { useState } from 'react';
import { 
  FlatList, 
  View, 
  Text, 
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { TRADING_COLORS } from '@/constants/trading';
import { useTradingContext } from '@/hooks/use-trading-context';
import { Symbol } from '@/types/trading';
import { Plus, X, TrendingUp, TrendingDown, BarChart3, MoreVertical, Database } from 'lucide-react-native';
import { ModeBadge } from '@/components/ModeBadge';

export default function WatchlistScreen() {
  const { 
    watchlist, 
    setWatchlist, 
    mode, 
    manualTrade, 
    tradingLocked,
    searchSymbols,
    addToWatchlist,
    marketData,
    settings
  } = useTradingContext();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showChartMenu, setShowChartMenu] = useState<string | null>(null);
  const [backfillStatus, setBackfillStatus] = useState<Record<string, 'priming' | 'done'>>({});

  const searchResults = searchSymbols(searchQuery);
  const filteredSymbols = searchResults.filter(
    s => !watchlist.find(w => w.symbol === s.symbol)
  );

  const handleAddSymbol = (symbolData: typeof searchResults[0]) => {
    addToWatchlist(symbolData.symbol);
    setShowAddModal(false);
    setSearchQuery('');
  };

  const handleRemoveSymbol = (id: string) => {
    Alert.alert(
      'Remove Symbol',
      'Are you sure you want to remove this symbol?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => setWatchlist(watchlist.filter(s => s.id !== id))
        },
      ]
    );
  };

  const toggleAutoTrade = (id: string) => {
    setWatchlist(watchlist.map(s => 
      s.id === id ? { ...s, autoTrade: !s.autoTrade } : s
    ));
  };

  const handleTrade = (symbol: string, side: 'buy' | 'sell') => {
    if (!tradingLocked) {
      manualTrade(symbol, side);
    }
  };

  const handleOpenChart = (symbol: string) => {
    setShowChartMenu(null);
    router.push(`/chart/${symbol}`);
  };

  const handleBackfill24h = async (symbol: string) => {
    setShowChartMenu(null);
    setBackfillStatus(prev => ({ ...prev, [symbol]: 'priming' }));
    
    try {
      const response = await fetch(`${settings.restApiUrl}/symbols/backfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, lookback_minutes: 1440 })
      });
      
      if (response.ok) {
        Alert.alert('Success', `Rebuilt indicators for ${symbol} on 1m/5m/15m`);
        setBackfillStatus(prev => ({ ...prev, [symbol]: 'done' }));
        setTimeout(() => {
          setBackfillStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[symbol];
            return newStatus;
          });
        }, 3000);
      } else {
        Alert.alert('Error', 'Failed to backfill data');
        setBackfillStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[symbol];
          return newStatus;
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Network error during backfill');
      setBackfillStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[symbol];
        return newStatus;
      });
    }
  };

  const renderSymbol = ({ item }: { item: Symbol }) => {
    const data = marketData.get(item.symbol);
    const isDelayed = data?.delayed || false;
    const providerName = data?.provider || 'simulated';
    
    return (
    <View style={styles.symbolCard}>
      <View style={styles.symbolHeader}>
        <View style={styles.symbolInfo}>
          <View style={styles.symbolTitleRow}>
            <Text style={styles.symbol}>{item.symbol}</Text>
            <View style={styles.chartActions}>
              {backfillStatus[item.symbol] === 'priming' && (
                <View style={styles.primingBadge}>
                  <Text style={styles.primingText}>PRIMING</Text>
                </View>
              )}
              <TouchableOpacity 
                style={styles.chartMenuButton}
                onPress={() => setShowChartMenu(showChartMenu === item.symbol ? null : item.symbol)}
              >
                <MoreVertical size={16} color={TRADING_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          
          {showChartMenu === item.symbol && (
            <View style={styles.chartMenu}>
              <TouchableOpacity 
                style={styles.chartMenuItem}
                onPress={() => handleOpenChart(item.symbol)}
              >
                <BarChart3 size={16} color={TRADING_COLORS.text} />
                <Text style={styles.chartMenuText}>Open Chart</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.chartMenuItem}
                onPress={() => handleBackfill24h(item.symbol)}
              >
                <Database size={16} color={TRADING_COLORS.text} />
                <Text style={styles.chartMenuText}>Backfill 24h</Text>
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.symbolName}>{item.name}</Text>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: TRADING_COLORS.surfaceLight }]}>
              <Text style={styles.badgeText}>{item.assetClass}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: TRADING_COLORS.surfaceLight }]}>
              <Text style={styles.badgeText}>{item.broker}</Text>
            </View>
            {item.registry?.provider_codes.tradingview && (
              <View style={[styles.badge, { backgroundColor: TRADING_COLORS.primary }]}>
                <Text style={[styles.badgeText, { color: TRADING_COLORS.text }]}>TV</Text>
              </View>
            )}
            {isDelayed && (
              <View style={[styles.badge, { backgroundColor: TRADING_COLORS.warning }]}>
                <Text style={[styles.badgeText, { color: TRADING_COLORS.text }]}>DELAYED</Text>
              </View>
            )}
            <View style={[styles.badge, { backgroundColor: TRADING_COLORS.surfaceLight }]}>
              <Text style={styles.badgeText}>{providerName}</Text>
            </View>
          </View>
        </View>
        <View style={styles.priceContainer}>
          {data && (
            <>
              <Text style={styles.price}>${data.price.toFixed(2)}</Text>
              <Text style={[
                styles.change,
                { color: data.change >= 0 ? TRADING_COLORS.profit : TRADING_COLORS.loss }
              ]}>
                {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)} ({data.changePercent.toFixed(2)}%)
              </Text>
            </>
          )}
          <TouchableOpacity onPress={() => handleRemoveSymbol(item.id)}>
            <X size={20} color={TRADING_COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.autoTradeControl}>
          <Text style={styles.controlLabel}>Auto Trade</Text>
          <Switch
            value={item.autoTrade}
            onValueChange={() => toggleAutoTrade(item.id)}
            trackColor={{ 
              false: TRADING_COLORS.border, 
              true: TRADING_COLORS.primary 
            }}
            thumbColor={TRADING_COLORS.text}
          />
        </View>

        {mode !== 'signals' && (
          <View style={styles.tradeButtons}>
            <TouchableOpacity 
              style={[styles.buyButton, tradingLocked && styles.disabledButton]}
              onPress={() => handleTrade(item.symbol, 'buy')}
              disabled={tradingLocked}
            >
              <TrendingUp size={16} color={TRADING_COLORS.text} />
              <Text style={styles.buttonText}>BUY</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sellButton, tradingLocked && styles.disabledButton]}
              onPress={() => handleTrade(item.symbol, 'sell')}
              disabled={tradingLocked}
            >
              <TrendingDown size={16} color={TRADING_COLORS.text} />
              <Text style={styles.buttonText}>SELL</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Watchlist</Text>
        <View style={styles.headerRight}>
          <ModeBadge mode={mode} />
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Plus size={20} color={TRADING_COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={watchlist}
        renderItem={renderSymbol}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No symbols in watchlist</Text>
            <TouchableOpacity 
              style={styles.addFirstButton}
              onPress={() => setShowAddModal(true)}
            >
              <Plus size={20} color={TRADING_COLORS.text} />
              <Text style={styles.addFirstText}>Add Symbol</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Symbol</Text>
              <TouchableOpacity onPress={() => {
                setShowAddModal(false);
                setSearchQuery('');
              }}>
                <X size={24} color={TRADING_COLORS.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search symbols (ES, MGC, AAPL, BTCUSD, etc.)..."
              placeholderTextColor={TRADING_COLORS.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="characters"
            />

            <FlatList
              data={filteredSymbols}
              keyExtractor={item => item.symbol}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.symbolOption}
                  onPress={() => handleAddSymbol(item)}
                >
                  <View>
                    <Text style={styles.optionSymbol}>{item.symbol}</Text>
                    <Text style={styles.optionName}>{item.display}</Text>
                  </View>
                  <View style={styles.optionBadges}>
                    <Text style={styles.optionBadge}>{item.class}</Text>
                    {item.provider_codes.tradingview && (
                      <Text style={[styles.optionBadge, { backgroundColor: TRADING_COLORS.primary, color: TRADING_COLORS.text }]}>TV</Text>
                    )}
                    {item.provider_codes.coinbase && (
                      <Text style={[styles.optionBadge, { backgroundColor: TRADING_COLORS.success, color: TRADING_COLORS.text }]}>LIVE</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              style={styles.symbolsList}
            />
          </View>
        </View>
      </Modal>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TRADING_COLORS.text,
  },
  addButton: {
    backgroundColor: TRADING_COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  symbolCard: {
    backgroundColor: TRADING_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TRADING_COLORS.border,
  },
  symbolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  priceContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: TRADING_COLORS.text,
  },
  change: {
    fontSize: 12,
    fontWeight: '600',
  },
  symbolInfo: {
    flex: 1,
  },
  symbolTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chartButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: TRADING_COLORS.surfaceLight,
  },
  symbol: {
    fontSize: 18,
    fontWeight: '700',
    color: TRADING_COLORS.text,
  },
  symbolName: {
    fontSize: 13,
    color: TRADING_COLORS.textSecondary,
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    color: TRADING_COLORS.textSecondary,
    fontWeight: '600',
  },
  controls: {
    gap: 12,
  },
  autoTradeControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 14,
    color: TRADING_COLORS.text,
  },
  tradeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  buyButton: {
    flex: 1,
    backgroundColor: TRADING_COLORS.profit,
    paddingVertical: 10,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sellButton: {
    flex: 1,
    backgroundColor: TRADING_COLORS.loss,
    paddingVertical: 10,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: TRADING_COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: TRADING_COLORS.textSecondary,
  },
  addFirstButton: {
    backgroundColor: TRADING_COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addFirstText: {
    color: TRADING_COLORS.text,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: TRADING_COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: TRADING_COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TRADING_COLORS.text,
  },
  searchInput: {
    backgroundColor: TRADING_COLORS.surfaceLight,
    margin: 16,
    padding: 12,
    borderRadius: 8,
    color: TRADING_COLORS.text,
    fontSize: 16,
  },
  symbolsList: {
    flex: 1,
  },
  symbolOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: TRADING_COLORS.border,
  },
  optionSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: TRADING_COLORS.text,
  },
  optionName: {
    fontSize: 13,
    color: TRADING_COLORS.textSecondary,
    marginTop: 2,
  },
  optionBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  optionBadge: {
    fontSize: 11,
    color: TRADING_COLORS.textSecondary,
    backgroundColor: TRADING_COLORS.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontWeight: '600',
  },
  chartActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartMenuButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: TRADING_COLORS.surfaceLight,
  },
  chartMenu: {
    position: 'absolute',
    top: 30,
    right: 0,
    backgroundColor: TRADING_COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TRADING_COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  chartMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TRADING_COLORS.border,
  },
  chartMenuText: {
    fontSize: 14,
    color: TRADING_COLORS.text,
    fontWeight: '500',
  },
  primingBadge: {
    backgroundColor: TRADING_COLORS.warning + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: TRADING_COLORS.warning,
  },
  primingText: {
    fontSize: 10,
    color: TRADING_COLORS.warning,
    fontWeight: '600',
  },
});