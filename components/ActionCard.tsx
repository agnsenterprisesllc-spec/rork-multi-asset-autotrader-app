import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { TRADING_COLORS, ACTION_COLORS } from '@/constants/trading';
import { ActionPrompt, UserActionType } from '@/types/trading';
import { TrendingUp, TrendingDown, Target, Square, Clock } from 'lucide-react-native';

interface ActionCardProps {
  prompt: ActionPrompt | null;
  onAction: (action: UserActionType, price?: number) => void;
  disabled?: boolean;
}

export function ActionCard({ prompt, onAction, disabled = false }: ActionCardProps) {
  if (!prompt || prompt.action === 'WAIT') {
    return (
      <View style={[styles.container, styles.waitContainer]}>
        <View style={styles.waitContent}>
          <Clock size={24} color={TRADING_COLORS.textSecondary} />
          <Text style={styles.waitText}>Analyzing market conditions...</Text>
          <Text style={styles.waitSubtext}>Waiting for confluence signal</Text>
        </View>
      </View>
    );
  }

  const actionColor = ACTION_COLORS[prompt.action];
  const isLong = prompt.action === 'BUY';
  const isShort = prompt.action === 'SELL';
  const isTakeProfit = prompt.action === 'TP';
  const isFlatten = prompt.action === 'FLATTEN';

  const getActionIcon = () => {
    switch (prompt.action) {
      case 'BUY':
        return <TrendingUp size={32} color={TRADING_COLORS.text} />;
      case 'SELL':
        return <TrendingDown size={32} color={TRADING_COLORS.text} />;
      case 'TP':
        return <Target size={32} color={TRADING_COLORS.text} />;
      case 'FLATTEN':
        return <Square size={32} color={TRADING_COLORS.text} />;
      default:
        return null;
    }
  };

  const getActionButtons = () => {
    if (isLong || isShort) {
      return (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: actionColor }, disabled && styles.disabledButton]}
            onPress={() => onAction(isLong ? 'i_bought' : 'i_sold', prompt.entry)}
            disabled={disabled}
          >
            <Text style={styles.actionButtonText}>
              I {isLong ? 'BOUGHT' : 'SOLD'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.skipButton, disabled && styles.disabledButton]}
            onPress={() => onAction('skip')}
            disabled={disabled}
          >
            <Text style={styles.skipButtonText}>SKIP</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isTakeProfit) {
      return (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: actionColor }, disabled && styles.disabledButton]}
            onPress={() => onAction('tp', prompt.targets[0])}
            disabled={disabled}
          >
            <Text style={styles.actionButtonText}>TAKE PROFIT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.skipButton, disabled && styles.disabledButton]}
            onPress={() => onAction('skip')}
            disabled={disabled}
          >
            <Text style={styles.skipButtonText}>HOLD</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isFlatten) {
      return (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: actionColor }, disabled && styles.disabledButton]}
            onPress={() => onAction('flatten', prompt.entry)}
            disabled={disabled}
          >
            <Text style={styles.actionButtonText}>FLATTEN NOW</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.skipButton, disabled && styles.disabledButton]}
            onPress={() => onAction('skip')}
            disabled={disabled}
          >
            <Text style={styles.skipButtonText}>IGNORE</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { borderColor: actionColor }]}>
      <View style={styles.header}>
        <View style={styles.symbolInfo}>
          <Text style={styles.symbol}>{prompt.symbol}</Text>
          <Text style={styles.timeframe}>{prompt.tf}</Text>
        </View>
        <View style={styles.confidence}>
          <Text style={styles.confidenceText}>{Math.round(prompt.confidence * 100)}%</Text>
        </View>
      </View>

      <View style={styles.actionHeader}>
        {getActionIcon()}
        <Text style={[styles.actionText, { color: actionColor }]}>
          {prompt.action}
        </Text>
      </View>

      <View style={styles.priceInfo}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Entry:</Text>
          <Text style={styles.priceValue}>${prompt.entry.toFixed(2)}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Stop:</Text>
          <Text style={[styles.priceValue, { color: TRADING_COLORS.loss }]}>
            ${prompt.stop.toFixed(2)}
          </Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Targets:</Text>
          <Text style={[styles.priceValue, { color: TRADING_COLORS.profit }]}>
            ${prompt.targets.map(t => t.toFixed(2)).join(', ')}
          </Text>
        </View>
      </View>

      <View style={styles.riskInfo}>
        <Text style={styles.riskText}>
          Risk: ${prompt.risk_suggestion.risk_usd} • {prompt.risk_suggestion.contracts} contracts
        </Text>
      </View>

      <Text style={styles.rationale}>{prompt.rationale}</Text>

      {getActionButtons()}

      <View style={styles.timer}>
        <Text style={styles.timerText}>Bar ends in {prompt.barEndsInSec}s</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: TRADING_COLORS.surface,
    borderRadius: 16,
    padding: 20,
    margin: 16,
    borderWidth: 2,
    borderColor: TRADING_COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  waitContainer: {
    borderColor: TRADING_COLORS.border,
    alignItems: 'center',
    paddingVertical: 32,
  },
  waitContent: {
    alignItems: 'center',
    gap: 8,
  },
  waitText: {
    fontSize: 16,
    fontWeight: '600',
    color: TRADING_COLORS.text,
  },
  waitSubtext: {
    fontSize: 14,
    color: TRADING_COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  symbolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  symbol: {
    fontSize: 20,
    fontWeight: '700',
    color: TRADING_COLORS.text,
  },
  timeframe: {
    fontSize: 14,
    color: TRADING_COLORS.textSecondary,
    backgroundColor: TRADING_COLORS.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  confidence: {
    backgroundColor: TRADING_COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: '700',
    color: TRADING_COLORS.text,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  actionText: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
  },
  priceInfo: {
    gap: 8,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: TRADING_COLORS.textSecondary,
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: TRADING_COLORS.text,
  },
  riskInfo: {
    backgroundColor: TRADING_COLORS.surfaceLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  riskText: {
    fontSize: 14,
    color: TRADING_COLORS.textSecondary,
    textAlign: 'center',
  },
  rationale: {
    fontSize: 14,
    color: TRADING_COLORS.text,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: TRADING_COLORS.text,
    letterSpacing: 1,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TRADING_COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: TRADING_COLORS.border,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: TRADING_COLORS.textSecondary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  timer: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 12,
    color: TRADING_COLORS.textSecondary,
  },
});