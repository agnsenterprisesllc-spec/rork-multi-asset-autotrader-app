import React from 'react';
import { 
  ScrollView, 
  View, 
  Text, 
  StyleSheet,
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TRADING_COLORS } from '@/constants/trading';
import { useTradingContext, useTodaysTrades } from '@/hooks/use-trading-context';
import { RiskBar } from '@/components/RiskBar';
import { KillSwitch } from '@/components/KillSwitch';
import { PnLDisplay } from '@/components/PnLDisplay';
import { ModeBadge } from '@/components/ModeBadge';
import { Shield, AlertTriangle, Lock, Unlock, FileDown } from 'lucide-react-native';

export default function RiskScreen() {
  const { 
    mode,
    riskStatus, 
    settings, 
    tradingLocked, 
    setTradingLocked,
    killSwitch 
  } = useTradingContext();
  
  const todaysTrades = useTodaysTrades();

  const handleUnlock = () => {
    Alert.alert(
      'Unlock Trading',
      'Are you sure you want to unlock trading? Make sure risk conditions are resolved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unlock', 
          style: 'default',
          onPress: () => setTradingLocked(false)
        },
      ]
    );
  };

  const exportJournal = () => {
    // In a real app, this would generate and save a CSV file
    Alert.alert('Export Journal', `Exported ${todaysTrades.length} trades to journal.csv`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Risk Management</Text>
        <ModeBadge mode={mode} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Trading Status */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Shield size={20} color={TRADING_COLORS.primary} />
            <Text style={styles.cardTitle}>Trading Status</Text>
          </View>
          
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Status</Text>
              <View style={styles.statusValue}>
                {tradingLocked ? (
                  <>
                    <Lock size={16} color={TRADING_COLORS.danger} />
                    <Text style={[styles.statusText, { color: TRADING_COLORS.danger }]}>
                      LOCKED
                    </Text>
                  </>
                ) : (
                  <>
                    <Unlock size={16} color={TRADING_COLORS.success} />
                    <Text style={[styles.statusText, { color: TRADING_COLORS.success }]}>
                      ACTIVE
                    </Text>
                  </>
                )}
              </View>
            </View>
            
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Buying Power</Text>
              <Text style={styles.statusAmount}>
                ${riskStatus.buyingPower.toFixed(0)}
              </Text>
            </View>
          </View>

          {tradingLocked && (
            <TouchableOpacity style={styles.unlockButton} onPress={handleUnlock}>
              <Unlock size={16} color={TRADING_COLORS.text} />
              <Text style={styles.unlockText}>Unlock Trading</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Daily Limits */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <AlertTriangle size={20} color={TRADING_COLORS.warning} />
            <Text style={styles.cardTitle}>Daily Limits</Text>
          </View>
          
          <View style={styles.limitsGrid}>
            <RiskBar 
              label="Loss Cap"
              current={Math.min(0, riskStatus.dailyPnL)}
              max={settings.dailyLossCap}
              color={TRADING_COLORS.loss}
            />
            
            <RiskBar 
              label="Profit Cap"
              current={Math.max(0, riskStatus.dailyPnL)}
              max={settings.dailyProfitCap}
              color={TRADING_COLORS.profit}
            />
            
            <RiskBar 
              label="Trade Count"
              current={riskStatus.tradesCount}
              max={settings.maxTradesPerDay}
            />
            
            <View style={styles.limitInfo}>
              <Text style={styles.limitLabel}>Risk per Trade</Text>
              <Text style={styles.limitValue}>${settings.riskPerTrade}</Text>
            </View>
            
            <View style={styles.limitInfo}>
              <Text style={styles.limitLabel}>Max Positions</Text>
              <Text style={styles.limitValue}>{settings.maxConcurrentPositions}</Text>
            </View>
          </View>
        </View>

        {/* Today's Performance */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Performance</Text>
          
          <View style={styles.performanceGrid}>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceLabel}>P&L</Text>
              <PnLDisplay 
                value={riskStatus.dailyPnL} 
                percent={riskStatus.dailyPnLPercent}
                size="large"
              />
            </View>
            
            <View style={styles.performanceItem}>
              <Text style={styles.performanceLabel}>Trades</Text>
              <Text style={styles.performanceValue}>{todaysTrades.length}</Text>
            </View>
            
            <View style={styles.performanceItem}>
              <Text style={styles.performanceLabel}>Win Rate</Text>
              <Text style={styles.performanceValue}>
                {todaysTrades.length > 0 
                  ? `${((todaysTrades.filter(t => t.pnl > 0).length / todaysTrades.length) * 100).toFixed(0)}%`
                  : 'N/A'
                }
              </Text>
            </View>
            
            <View style={styles.performanceItem}>
              <Text style={styles.performanceLabel}>Avg R</Text>
              <Text style={styles.performanceValue}>
                {todaysTrades.length > 0 
                  ? (todaysTrades.reduce((sum, t) => sum + t.rMultiple, 0) / todaysTrades.length).toFixed(2)
                  : 'N/A'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Emergency Actions</Text>
          
          <View style={styles.actions}>
            <KillSwitch onPress={killSwitch} disabled={tradingLocked} />
            
            <TouchableOpacity style={styles.exportButton} onPress={exportJournal}>
              <FileDown size={20} color={TRADING_COLORS.text} />
              <Text style={styles.exportText}>Export Journal</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Risk Warnings */}
        {(riskStatus.dailyLossCapReached || riskStatus.dailyProfitCapReached || riskStatus.maxTradesReached) && (
          <View style={styles.warningCard}>
            <AlertTriangle size={20} color={TRADING_COLORS.warning} />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Risk Limits Reached</Text>
              {riskStatus.dailyLossCapReached && (
                <Text style={styles.warningText}>• Daily loss cap reached</Text>
              )}
              {riskStatus.dailyProfitCapReached && (
                <Text style={styles.warningText}>• Daily profit cap reached</Text>
              )}
              {riskStatus.maxTradesReached && (
                <Text style={styles.warningText}>• Maximum trades reached</Text>
              )}
            </View>
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TRADING_COLORS.text,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusItem: {
    gap: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: TRADING_COLORS.textSecondary,
  },
  statusValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusAmount: {
    fontSize: 20,
    fontWeight: '600',
    color: TRADING_COLORS.text,
  },
  unlockButton: {
    backgroundColor: TRADING_COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 12,
  },
  unlockText: {
    color: TRADING_COLORS.text,
    fontWeight: '600',
  },
  limitsGrid: {
    gap: 16,
  },
  limitInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: TRADING_COLORS.border,
  },
  limitLabel: {
    fontSize: 14,
    color: TRADING_COLORS.textSecondary,
  },
  limitValue: {
    fontSize: 14,
    fontWeight: '600',
    color: TRADING_COLORS.text,
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  performanceItem: {
    flex: 1,
    minWidth: '45%',
    gap: 4,
  },
  performanceLabel: {
    fontSize: 12,
    color: TRADING_COLORS.textSecondary,
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: '600',
    color: TRADING_COLORS.text,
  },
  actions: {
    gap: 12,
  },
  exportButton: {
    backgroundColor: TRADING_COLORS.surfaceLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
  },
  exportText: {
    color: TRADING_COLORS.text,
    fontWeight: '600',
  },
  warningCard: {
    backgroundColor: TRADING_COLORS.warning,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    opacity: 0.9,
  },
  warningContent: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TRADING_COLORS.text,
  },
  warningText: {
    fontSize: 12,
    color: TRADING_COLORS.text,
  },
});