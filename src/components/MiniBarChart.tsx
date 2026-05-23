// MiniBarChart.tsx — POZ-DEV-069
// Saf RN View tabanlı yatay bar chart (extra bağımlılık gerektirmez).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography, brand } from '../theme';
import type { ReportBucket } from '../types';

interface Props {
  data: ReportBucket[];
  formatValue?: (n: number) => string;
  barColor?: string;
  maxRows?: number;
  emptyText?: string;
}

export default function MiniBarChart({
  data,
  formatValue = n => n.toLocaleString('tr-TR'),
  barColor = brand.green,
  maxRows = 10,
  emptyText = 'Veri yok',
}: Props) {
  const rows = data.slice(0, maxRows);
  const max = Math.max(1, ...rows.map(r => r.value));

  if (!rows.length) {
    return <Text style={styles.empty}>{emptyText}</Text>;
  }

  return (
    <View style={styles.container}>
      {rows.map(r => {
        const ratio = Math.max(0.02, r.value / max);
        return (
          <View key={r.label} style={styles.row}>
            <Text style={styles.label} numberOfLines={1}>
              {r.label}
            </Text>
            <View style={styles.barWrap}>
              <View
                style={[styles.bar, { width: `${ratio * 100}%`, backgroundColor: barColor }]}
              />
            </View>
            <Text style={styles.value}>{formatValue(r.value)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: {
    width: '32%',
    color: colors.text.primary,
    fontSize: typography.xs,
    fontWeight: '600',
  },
  barWrap: {
    flex: 1,
    height: 14,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  bar: { height: '100%', borderRadius: radius.full },
  value: {
    minWidth: 70,
    textAlign: 'right',
    color: colors.text.primary,
    fontSize: typography.xs,
    fontWeight: '700',
  },
  empty: {
    color: colors.text.muted,
    fontSize: typography.xs,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
});
