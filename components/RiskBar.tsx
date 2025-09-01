import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TRADING_COLORS } from '@/constants/trading';

interface RiskBarProps {
  label: string;
  current: number;
  max: number;
  showPercent?: boolean;
  color?: string;
}

export function RiskBar({ label, current, max, showPercent = false, color }: RiskBarProps) {
  const percent = Math.min((Math.abs(current) / Math.abs(max)) * 100, 100);
  const isNearLimit = percent > 80;
  const barColor = color || (isNearLimit ? TRADING_COLORS.danger : TRADING_COLORS.primary);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {current < 0 ? '-' : ''}${Math.abs(current).toFixed(0)} / ${Math.abs(max).toFixed(0)}
        </Text>
      </View>
      <View style={styles.barContainer}>
        <View style={[styles.barFill, { width: `${percent}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: TRADING_COLORS.textSecondary,
    fontSize: 13,
  },
  value: {
    color: TRADING_COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  barContainer: {
    height: 6,
    backgroundColor: TRADING_COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
});