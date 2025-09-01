import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TRADING_COLORS } from '@/constants/trading';

interface PnLDisplayProps {
  value: number;
  percent?: number;
  size?: 'small' | 'medium' | 'large';
}

export function PnLDisplay({ value, percent, size = 'medium' }: PnLDisplayProps) {
  const isProfit = value >= 0;
  const color = isProfit ? TRADING_COLORS.profit : TRADING_COLORS.loss;
  
  const fontSize = size === 'small' ? 14 : size === 'large' ? 24 : 18;

  return (
    <View style={styles.container}>
      <Text style={[styles.value, { color, fontSize }]}>
        {isProfit ? '+' : ''}${Math.abs(value).toFixed(2)}
      </Text>
      {percent !== undefined && (
        <Text style={[styles.percent, { color, fontSize: fontSize * 0.7 }]}>
          ({isProfit ? '+' : ''}{percent.toFixed(2)}%)
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontWeight: '600',
  },
  percent: {
    fontWeight: '400',
  },
});