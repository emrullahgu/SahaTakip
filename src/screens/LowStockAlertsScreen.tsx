// LowStockAlertsScreen — POZ-DEV-157 Minimum stok altındaki malzemeler
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';
import { lowStockAlerts, LowStockRow } from '../services/stock';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function LowStockAlertsScreen() {
  const nav = useNavigation<Nav>();
  const [rows, setRows] = useState<LowStockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await lowStockAlerts();
      setRows(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color="#ef4444" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={rows}
        keyExtractor={r => r.material.id}
        renderItem={({ item }) => {
          const min = item.material.minStock || 0;
          const pct = min > 0 ? Math.min(100, (item.totalQty / min) * 100) : 0;
          const sev = item.totalQty <= 0 ? '#ef4444' : item.totalQty < min * 0.5 ? '#f59e0b' : '#fb923c';
          return (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.85}
              onPress={() => nav.navigate('MaterialForm', { materialId: item.material.id })}
            >
              <View style={[styles.iconBox, { backgroundColor: sev + '22', borderColor: sev }]}>
                <Ionicons name="warning" size={20} color={sev} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.code}>{item.material.code}</Text>
                <Text style={styles.name} numberOfLines={1}>{item.material.name}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: sev }]} />
                </View>
                <Text style={styles.meta}>
                  {item.totalQty} / {min} {item.material.unit} · <Text style={{ color: sev, fontWeight: '800' }}>{item.shortage} {item.material.unit} eksik</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.actBtn, { backgroundColor: '#22c55e' }]}
                onPress={() => nav.navigate('StockMovement', { kind: 'giris', materialId: item.material.id })}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={14} color="#fff" />
                <Text style={styles.actText}>Giriş</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons name="warning-outline" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Düşük Stok Uyarıları</Text>
              <Text style={styles.heroSub}>{rows.length} malzeme minimum stok altında</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={42} color="#22c55e" />
            <Text style={styles.emptyText}>Tüm stoklar yeterli</Text>
            <Text style={styles.emptySub}>Minimum altında malzeme yok.</Text>
          </View>
        }
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.text.muted} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.xs },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#ef4444', borderRadius: radius.md, marginBottom: spacing.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, marginBottom: spacing.xs },
  iconBox: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  code: { color: '#0ea5e9', fontWeight: '800', fontSize: typography.xs },
  name: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm, marginTop: 2 },
  barTrack: { height: 4, backgroundColor: colors.bg.primary, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
  meta: { color: colors.text.muted, fontSize: 11, marginTop: 4 },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm },
  actText: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyText: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  emptySub: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
});
