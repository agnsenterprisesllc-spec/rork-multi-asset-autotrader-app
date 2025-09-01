import React, { useState } from 'react';
import { 
  FlatList, 
  View, 
  Text, 
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TRADING_COLORS } from '@/constants/trading';
import { useTradingContext } from '@/hooks/use-trading-context';
import { Signal, ActionType } from '@/types/trading';
import { TrendingUp, TrendingDown, Clock, Activity, MoreVertical, Zap } from 'lucide-react-native';
import { ModeBadge } from '@/components/ModeBadge';

export default function SignalsScreen() {
  const { signals, mode, manualTrade, tradingLocked, watchlist, settings } = useTradingContext();
  const [refreshing, setRefreshing] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testSymbol, setTestSymbol] = useState('');
  const [testSide, setTestSide] = useState<'BUY' | 'SELL'>('BUY');

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleEmitTestSignal = async () => {
    if (!testSymbol.trim()) {
      Alert.alert('Error', 'Please enter a symbol');
      return;
    }

    try {
      const response = await fetch(`${settings.restApiUrl}/signals/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: testSymbol.toUpperCase(), side: testSide })
      });
      
      if (response.ok) {
        const result = await response.json();
        Alert.alert('Success', `Test signal emitted for ${testSymbol}`);
        setShowTestModal(false);
        setTestSymbol('');
      } else {
        Alert.alert('Error', 'Failed to emit test signal');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error during test signal emission');
    }
  };

  const handleExecute = (signal: Signal) => {
    if (!tradingLocked && !signal.executed) {
      manualTrade(signal.symbol, signal.side);
    }
  };

  const renderSignal = ({ item }: { item: Signal }) => {
    const time = new Date(item.timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    return (
      <View style={styles.signalCard}>
        <View style={styles.signalHeader}>
          <View style={styles.signalInfo}>
            <Text style={styles.symbol}>{item.symbol}</Text>
            <View style={styles.signalMeta}>
              <Clock size={12} color={TRADING_COLORS.textSecondary} />
              <Text style={styles.time}>{time}</Text>
              <Text style={styles.timeframe}>{item.timeframe}</Text>
            </View>
          </View>
          <View style={styles.signalRight}>
            <View style={styles.scoreContainer}>
              <Activity size={16} color={TRADING_COLORS.primary} />
              <Text style={styles.score}>{item.confluenceScore.toFixed(0)}</Text>
            </View>
            <View style={[styles.sideBadge, { 
              backgroundColor: item.side === 'buy' ? TRADING_COLORS.profit : TRADING_COLORS.loss 
            }]}>
              {item.side === 'buy' ? 
                <TrendingUp size={14} color={TRADING_COLORS.text} /> :
                <TrendingDown size={14} color={TRADING_COLORS.text} />
              }
              <Text style={styles.sideText}>{item.side.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.signalBody}>
          <Text style={styles.strategy}>{item.strategy}</Text>
          <Text style={styles.rationale}>{item.rationale}</Text>
          
          <View style={styles.indicators}>
            {item.indicators.map((indicator, idx) => (
              <View key={idx} style={styles.indicatorChip}>
                <Text style={styles.indicatorText}>{indicator}</Text>
              </View>
            ))}
          </View>
        </View>

        {!item.executed && mode !== 'signals' && (
          <TouchableOpacity 
            style={[styles.executeButton, tradingLocked && styles.disabledButton]}
            onPress={() => handleExecute(item)}
            disabled={tradingLocked || item.executed}
          >
            <Text style={styles.executeText}>Execute Trade</Text>
          </TouchableOpacity>
        )}

        {item.executed && (
          <View style={styles.executedBadge}>
            <Text style={styles.executedText}>✓ Executed</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Signals</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => setShowTestModal(true)}
          >
            <MoreVertical size={20} color={TRADING_COLORS.textSecondary} />
          </TouchableOpacity>
          <ModeBadge mode={mode} />
        </View>
      </View>

      <FlatList
        data={signals}
        renderItem={renderSignal}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={TRADING_COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Activity size={48} color={TRADING_COLORS.textSecondary} />
            <Text style={styles.emptyText}>No signals yet</Text>
            <Text style={styles.emptySubtext}>
              Requires ≥ {settings.signalEngine.minLookbackBars} bars on {settings.signalEngine.timeframes.join('/')}
            </Text>
          </View>
        }
      />

      {/* Test Signal Modal */}
      <Modal
        visible={showTestModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Emit Test Signal</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Symbol</Text>
              <TextInput
                style={styles.input}
                value={testSymbol}
                onChangeText={setTestSymbol}
                placeholder="Enter symbol (e.g., BTCUSD)"
                placeholderTextColor={TRADING_COLORS.textSecondary}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Side</Text>
              <View style={styles.sideSelector}>
                {(['BUY', 'SELL'] as const).map(side => (
                  <TouchableOpacity
                    key={side}
                    style={[
                      styles.sideOption,
                      testSide === side && styles.sideOptionActive,
                      side === 'BUY' ? styles.sideOptionBuy : styles.sideOptionSell
                    ]}
                    onPress={() => setTestSide(side)}
                  >
                    {side === 'BUY' ? 
                      <TrendingUp size={16} color={TRADING_COLORS.text} /> :
                      <TrendingDown size={16} color={TRADING_COLORS.text} />
                    }
                    <Text style={[
                      styles.sideText,
                      testSide === side && styles.sideTextActive
                    ]}>
                      {side}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonCancel} 
                onPress={() => setShowTestModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButtonConfirm} 
                onPress={handleEmitTestSignal}
              >
                <Zap size={16} color={TRADING_COLORS.text} />
                <Text style={styles.modalButtonTextConfirm}>Emit Signal</Text>
              </TouchableOpacity>
            </View>
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TRADING_COLORS.text,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  signalCard: {
    backgroundColor: TRADING_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TRADING_COLORS.border,
  },
  signalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  signalInfo: {
    gap: 4,
  },
  symbol: {
    fontSize: 18,
    fontWeight: '700',
    color: TRADING_COLORS.text,
  },
  signalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  time: {
    fontSize: 12,
    color: TRADING_COLORS.textSecondary,
  },
  timeframe: {
    fontSize: 12,
    color: TRADING_COLORS.textSecondary,
    backgroundColor: TRADING_COLORS.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  signalRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  score: {
    fontSize: 16,
    fontWeight: '700',
    color: TRADING_COLORS.primary,
  },
  sideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sideText: {
    fontSize: 12,
    fontWeight: '700',
    color: TRADING_COLORS.text,
  },
  signalBody: {
    gap: 8,
  },
  strategy: {
    fontSize: 14,
    fontWeight: '600',
    color: TRADING_COLORS.text,
  },
  rationale: {
    fontSize: 13,
    color: TRADING_COLORS.textSecondary,
    lineHeight: 18,
  },
  indicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  indicatorChip: {
    backgroundColor: TRADING_COLORS.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  indicatorText: {
    fontSize: 11,
    color: TRADING_COLORS.textSecondary,
  },
  executeButton: {
    backgroundColor: TRADING_COLORS.primary,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  executeText: {
    color: TRADING_COLORS.text,
    fontWeight: '600',
  },
  executedBadge: {
    backgroundColor: TRADING_COLORS.success,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
    opacity: 0.8,
  },
  executedText: {
    color: TRADING_COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: TRADING_COLORS.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: TRADING_COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: TRADING_COLORS.surface,
    borderRadius: 12,
    padding: 20,
    margin: 20,
    minWidth: 300,
    borderWidth: 1,
    borderColor: TRADING_COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TRADING_COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    color: TRADING_COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: TRADING_COLORS.surfaceLight,
    padding: 12,
    borderRadius: 6,
    color: TRADING_COLORS.text,
    fontSize: 14,
  },
  sideSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  sideOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: TRADING_COLORS.border,
  },
  sideOptionBuy: {
    backgroundColor: TRADING_COLORS.profit + '10',
  },
  sideOptionSell: {
    backgroundColor: TRADING_COLORS.loss + '10',
  },
  sideOptionActive: {
    borderColor: TRADING_COLORS.primary,
  },
  sideText: {
    fontSize: 14,
    fontWeight: '600',
    color: TRADING_COLORS.textSecondary,
  },
  sideTextActive: {
    color: TRADING_COLORS.text,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: TRADING_COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: TRADING_COLORS.border,
    alignItems: 'center',
  },
  modalButtonConfirm: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: TRADING_COLORS.primary,
  },
  modalButtonTextCancel: {
    fontSize: 14,
    fontWeight: '600',
    color: TRADING_COLORS.textSecondary,
  },
  modalButtonTextConfirm: {
    fontSize: 14,
    fontWeight: '600',
    color: TRADING_COLORS.text,
  },
});