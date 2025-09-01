import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TRADING_COLORS } from '@/constants/trading';
import { TradingMode } from '@/types/trading';

interface ModeBadgeProps {
  mode: TradingMode;
}

export function ModeBadge({ mode }: ModeBadgeProps) {
  const getColor = () => {
    switch (mode) {
      case 'live':
        return TRADING_COLORS.danger;
      case 'paper':
        return TRADING_COLORS.warning;
      case 'signals':
        return TRADING_COLORS.primary;
    }
  };

  return (
    <View style={[styles.badge, { backgroundColor: getColor() }]}>
      <Text style={styles.text}>{mode.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  text: {
    color: TRADING_COLORS.text,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});