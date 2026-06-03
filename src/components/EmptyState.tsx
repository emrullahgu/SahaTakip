// EmptyState.tsx — POZ-DEV-317 Standart boş durum bileşeni (modern)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import { a11yButton } from '../utils/a11y';
import FadeInView from './FadeInView';
import PressableScale from './PressableScale';

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
  iconColor = colors.emerald.default,
}: Props) {
  const sub = subtitle ?? description;
  return (
    <FadeInView style={s.container}>
      {/* Yumuşak daire içinde ikon — modern "icon chip" */}
      <View style={[s.iconWrap, { backgroundColor: iconColor + '1A', borderColor: iconColor + '33' }]}>
        <Ionicons name={icon} size={40} color={iconColor} />
      </View>
      <Text style={s.title}>{title}</Text>
      {sub ? <Text style={s.subtitle}>{sub}</Text> : null}
      {actionLabel && onAction ? (
        <PressableScale style={[s.button, { backgroundColor: iconColor }]} onPress={onAction} {...a11yButton(actionLabel)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.buttonText}>{actionLabel.replace(/^\+\s*/, '')}</Text>
        </PressableScale>
      ) : null}
    </FadeInView>
  );
}

const s = StyleSheet.create({
  container: { padding: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text.primary,
    fontSize: typography.lg,
    fontWeight: '800',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.text.muted,
    fontSize: typography.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: typography.base },
});
