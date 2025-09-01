import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TRADING_COLORS } from '@/constants/trading';

interface ConnectionIndicatorProps {
  connected: boolean;
  size?: number;
}

export function ConnectionIndicator({ connected, size = 8 }: ConnectionIndicatorProps) {
  return (
    <View 
      style={[
        styles.indicator, 
        { 
          width: size, 
          height: size,
          backgroundColor: connected ? TRADING_COLORS.success : TRADING_COLORS.textSecondary,
        }
      ]} 
    />
  );
}

const styles = StyleSheet.create({
  indicator: {
    borderRadius: 999,
  },
});