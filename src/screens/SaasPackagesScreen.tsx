// Faz 50 — SaasPackagesScreen (POZ-DEV-204)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listSaasPackages, SAAS_FEATURE_LABEL } from '../services/saas';
import type { SaasPackage } from '../types';

const fmtTL = (n: number) => `₺${n.toLocaleString('tr-TR')}`;

export default function SaasPackagesScreen() {
  const [items, setItems] = useState<SaasPackage[]>([]);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  useFocusEffect(useCallback(() => { (async () => setItems(await listSaasPackages()))(); }, []));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.toggleRow}>
          <TouchableOpacity onPress={() => setCycle('monthly')} style={[s.toggleBtn, cycle === 'monthly' && s.toggleActive]}>
            <Text style={[s.toggleT, cycle === 'monthly' && s.toggleTActive]}>Aylık</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCycle('yearly')} style={[s.toggleBtn, cycle === 'yearly' && s.toggleActive]}>
            <Text style={[s.toggleT, cycle === 'yearly' && s.toggleTActive]}>Yıllık</Text>
            <Text style={s.saveT}>%17 indirim</Text>
          </TouchableOpacity>
        </View>

        {items.map(p => {
          const price = cycle === 'monthly' ? p.monthlyPrice : p.yearlyPrice;
          return (
            <View key={p.code} style={[s.card, { borderColor: p.color }, p.popular && { borderWidth: 2 }]}>
              {p.popular && (
                <View style={[s.popular, { backgroundColor: p.color }]}>
                  <Ionicons name="star" size={12} color="#fff" />
                  <Text style={s.popularT}>EN POPÜLER</Text>
                </View>
              )}
              <Text style={[s.name, { color: p.color }]}>{p.name}</Text>
              <View style={s.priceRow}>
                <Text style={s.price}>{fmtTL(price)}</Text>
                <Text style={s.cycle}>/ {cycle === 'monthly' ? 'ay' : 'yıl'}</Text>
              </View>
              <View style={s.limitsRow}>
                <View style={s.limit}><Ionicons name="people" size={14} color={colors.text.muted} /><Text style={s.limitT}>{p.maxUsers === 999 ? 'Sınırsız' : p.maxUsers} kullanıcı</Text></View>
                <View style={s.limit}><Ionicons name="clipboard" size={14} color={colors.text.muted} /><Text style={s.limitT}>{p.maxWorkOrdersMonth === 999999 ? 'Sınırsız' : `${p.maxWorkOrdersMonth}/ay`} iş emri</Text></View>
                <View style={s.limit}><Ionicons name="cloud" size={14} color={colors.text.muted} /><Text style={s.limitT}>{p.maxStorageGb === 999 ? 'Sınırsız' : `${p.maxStorageGb} GB`} depolama</Text></View>
                <View style={s.limit}><Ionicons name="sparkles" size={14} color={colors.text.muted} /><Text style={s.limitT}>{p.maxAiTokensMonth === 999999 ? 'Sınırsız' : `${(p.maxAiTokensMonth / 1000).toFixed(0)}K`} AI token</Text></View>
              </View>
              <View style={s.divider} />
              {p.features.map(f => (
                <View key={f.code} style={s.featureRow}>
                  <Ionicons
                    name={f.included ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={f.included ? '#22c55e' : '#64748b'}
                  />
                  <Text style={[s.feature, !f.included && { color: colors.text.faint, textDecorationLine: 'line-through' }]}>
                    {SAAS_FEATURE_LABEL[f.code] || f.code}{f.limit ? ` (${f.limit})` : ''}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.md },
  toggleRow: { flexDirection: 'row', backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: 4, gap: 4 },
  toggleBtn: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center', gap: 2 },
  toggleActive: { backgroundColor: '#0ea5e9' },
  toggleT: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  toggleTActive: { color: '#fff' },
  saveT: { color: '#22c55e', fontSize: typography.xs, fontWeight: '700' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, gap: 6 },
  popular: { position: 'absolute', top: -10, right: spacing.md, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  popularT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  name: { fontSize: typography.xl, fontWeight: '800' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  price: { color: colors.text.primary, fontSize: typography.xxl, fontWeight: '800' },
  cycle: { color: colors.text.muted, fontSize: typography.sm },
  limitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 4 },
  limit: { flexDirection: 'row', alignItems: 'center', gap: 4, width: '47%' },
  limitT: { color: colors.text.muted, fontSize: typography.xs },
  divider: { height: 1, backgroundColor: colors.border.primary, marginVertical: 6 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  feature: { color: colors.text.primary, fontSize: typography.sm },
});
