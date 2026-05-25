import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import { ToastMessage } from '../types';

interface ToastProps {
  toast: ToastMessage;
}

export default function Toast({ toast }: ToastProps) {
  const isSuccess = toast.type === 'success';
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isSuccess ? colors.emerald.dark : colors.rose.default },
      ]}
    >
      <Ionicons
        name={isSuccess ? 'checkmark-circle' : 'warning'}
        size={18}
        color="#fff"
      />
      <Text style={styles.message} numberOfLines={3}>
        {toast.message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
    elevation: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
      } as any,
    }),
  },
  message: {
    flex: 1,
    color: '#fff',
    fontSize: typography.sm,
    fontWeight: '600',
    lineHeight: 18,
  },
});
