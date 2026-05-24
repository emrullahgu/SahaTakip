// BulkSelectionBar — POZ-DEV-096 floating bottom bar for multi-select actions
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';

export interface BulkActionItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  destructive?: boolean;
}

interface Props {
  count: number;
  actions: BulkActionItem[];
  onAction: (key: string) => void;
  onClear: () => void;
}

export default function BulkSelectionBar({ count, actions, onAction, onClear }: Props) {
  if (count === 0) return null;
  return (
    <View style={styles.bar}>
      <TouchableOpacity onPress={onClear} style={styles.clearBtn}>
        <Ionicons name="close" size={18} color={colors.text.primary} />
      </TouchableOpacity>
      <Text style={styles.countText}>{count} seçili</Text>
      <View style={styles.actions}>
        {actions.map(a => (
          <TouchableOpacity
            key={a.key}
            style={[styles.actionBtn, { backgroundColor: a.destructive ? '#dc2626' : (a.color || '#6366f1') }]}
            onPress={() => onAction(a.key)}
          >
            <Ionicons name={a.icon} size={14} color="#fff" />
            <Text style={styles.actionText}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  clearBtn: { padding: 4 },
  countText: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  actions: { flexDirection: 'row', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.sm },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 11 },
});
