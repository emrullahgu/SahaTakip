// Faz 48 — CpDashboardScreen (POZ-DEV-182)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getCpDashboard, getCpBranding } from '../services/customerPortal';
import type { CpDashboardSummary, CpBrandingConfig } from '../types';

export default function CpDashboardScreen() {
  const nav = useNavigation<any>();
  const [d, setD] = useState<CpDashboardSummary | null>(null);
  const [brand, setBrand] = useState<CpBrandingConfig | null>(null);

  useFocusEffect(useCallback(() => {
    (async () => { setD(await getCpDashboard()); setBrand(await getCpBranding()); })();
  }, []));

  if (!d) return <SafeAreaView style={s.safe} />;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.header, { backgroundColor: (brand?.primaryColor ?? '#0ea5e9') + '22', borderColor: brand?.primaryColor ?? '#0ea5e9' }]}>
          <Text style={[s.welcome, { color: brand?.primaryColor ?? '#0ea5e9' }]}>{brand?.logoEmoji ?? '⚡'} Hoş geldiniz</Text>
          <Text style={s.cust}>{d.customerName}</Text>
          {d.lastVisit && <Text style={s.last}>Son giriş: {new Date(d.lastVisit).toLocaleString('tr-TR')}</Text>}
        </View>

        <View style={s.kpiGrid}>
          <TouchableOpacity style={[s.kpi, { borderColor: '#0ea5e9' }]} onPress={() => nav.navigate('CpWorkOrderTracking')}>
            <Ionicons name="construct" size={24} color="#0ea5e9" />
            <Text style={[s.kpiV, { color: '#0ea5e9' }]}>{d.openJobs}</Text>
            <Text style={s.kpiL}>Açık İş</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.kpi, { borderColor: '#f59e0b' }]} onPress={() => nav.navigate('CpQuoteApproval')}>
            <Ionicons name="document-text" size={24} color="#f59e0b" />
            <Text style={[s.kpiV, { color: '#f59e0b' }]}>{d.pendingQuotes}</Text>
            <Text style={s.kpiL}>Bekleyen Teklif</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.kpi, { borderColor: '#22c55e' }]} onPress={() => nav.navigate('CpDocumentArchive')}>
            <Ionicons name="folder-open" size={24} color="#22c55e" />
            <Text style={[s.kpiV, { color: '#22c55e' }]}>{d.unreadDocs}</Text>
            <Text style={s.kpiL}>Okunmamış Belge</Text>
          </TouchableOpacity>
          <View style={[s.kpi, { borderColor: '#ef4444' }]}>
            <Ionicons name="cash" size={24} color="#ef4444" />
            <Text style={[s.kpiV, { color: '#ef4444' }]}>₺{d.outstandingBalance.toLocaleString('tr-TR')}</Text>
            <Text style={s.kpiL}>Açık Bakiye</Text>
          </View>
        </View>

        <View style={s.satCard}>
          <Ionicons name="star" size={28} color="#facc15" />
          <View style={{ flex: 1 }}>
            <Text style={s.satL}>Memnuniyet Puanınız</Text>
            <Text style={s.satV}>{d.satisfactionScore.toFixed(1)} / 5.0</Text>
          </View>
          <TouchableOpacity style={s.satBtn} onPress={() => nav.navigate('CpSatisfaction')}>
            <Text style={s.satBtnT}>Geri Bildirim</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.section}>Hızlı Erişim</Text>
        <View style={s.qGrid}>
          <TouchableOpacity style={[s.qBtn, { backgroundColor: '#ef444422', borderColor: '#ef4444' }]} onPress={() => nav.navigate('CpServiceRequest')}>
            <Ionicons name="add-circle" size={20} color="#ef4444" />
            <Text style={s.qT}>Servis Talebi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.qBtn, { backgroundColor: '#f9731622', borderColor: '#f97316' }]} onPress={() => nav.navigate('CpNotifications')}>
            <Ionicons name="notifications" size={20} color="#f97316" />
            <Text style={s.qT}>Bildirimler</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.md },
  header: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, gap: 4 },
  welcome: { fontSize: typography.base, fontWeight: '700' },
  cust: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '800' },
  last: { color: colors.text.muted, fontSize: typography.xs },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: '2%' as any, rowGap: spacing.sm },
  kpi: { width: '49%', backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', gap: 4 },
  kpiV: { fontSize: typography.lg, fontWeight: '800' },
  kpiL: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  satCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  satL: { color: colors.text.muted, fontSize: typography.xs },
  satV: { color: '#facc15', fontSize: typography.lg, fontWeight: '800' },
  satBtn: { backgroundColor: '#facc15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm },
  satBtnT: { color: '#000', fontSize: typography.xs, fontWeight: '800' },
  section: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  qGrid: { flexDirection: 'row', gap: spacing.sm },
  qBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1 },
  qT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
});
