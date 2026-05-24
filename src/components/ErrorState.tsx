// ErrorState.tsx — POZ-DEV-318 Standart hata durumu bileşeni
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import { a11yButton } from '../utils/a11y';

interface Props {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export default function ErrorState({
  title = 'Bir sorun oluştu',
  message,
  onRetry,
  retryLabel = 'Tekrar Dene',
}: Props) {
  return (
    <View style={s.container}>
      <Ionicons name="alert-circle-outline" size={56} color="#f87171" />
      <Text style={s.title}>{title}</Text>
      {message ? <Text style={s.message}>{message}</Text> : null}
      {onRetry ? (
        <Pressable style={s.button} onPress={onRetry} {...a11yButton(retryLabel)}>
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={s.buttonText}>{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  title: {
    color: colors.text.primary,
    fontSize: typography.lg,
    fontWeight: '700',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  message: {
    color: colors.text.muted,
    fontSize: typography.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
    maxWidth: 360,
  },
  button: {
    marginTop: spacing.lg,
    backgroundColor: '#dc2626',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: typography.base },
});
