// EmptyState.tsx — POZ-DEV-317 Standart boş durum bileşeni
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import { a11yButton } from '../utils/a11y';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  /** Alias for `subtitle` (some legacy screens use this name) */
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  iconColor?: string;
}

export default function EmptyState({
  icon = 'document-outline',
  title,
  subtitle,
  description,
  actionLabel,
  onAction,
  iconColor = colors.text.muted,
}: Props) {
  const sub = subtitle ?? description;
  return (
    <View style={s.container}>
      <Ionicons name={icon} size={56} color={iconColor} />
      <Text style={s.title}>{title}</Text>
      {sub ? <Text style={s.subtitle}>{sub}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable style={s.button} onPress={onAction} {...a11yButton(actionLabel)}>
          <Text style={s.buttonText}>{actionLabel}</Text>
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
  subtitle: {
    color: colors.text.muted,
    fontSize: typography.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
    maxWidth: 360,
  },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.emerald.default,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: typography.base },
});
