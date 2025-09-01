import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { TRADING_COLORS } from '@/constants/trading';
import * as Haptics from 'expo-haptics';

interface KillSwitchProps {
  onPress: () => void;
  disabled?: boolean;
}

export function KillSwitch({ onPress, disabled }: KillSwitchProps) {
  const handlePress = () => {
    if (disabled) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    Alert.alert(
      'KILL SWITCH',
      'This will close all positions and lock trading. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'CONFIRM', 
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onPress();
          }
        },
      ]
    );
  };

  return (
    <TouchableOpacity 
      style={[styles.button, disabled && styles.disabled]} 
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={styles.text}>KILL SWITCH</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: TRADING_COLORS.danger,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: TRADING_COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: TRADING_COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});