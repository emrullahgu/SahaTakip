// AssetDetailScreen — POZ-DEV-086
// Cihaz detayı + okumalar + bakım planları + denetimler + uygunsuzluklar
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { getAsset, deleteAsset, ASSET_TYPE_LABEL } from '../services/assets';
import { listByAsset as readingsByAsset, READING_KIND_LABEL } from '../services/energyReadings';
import { listByAsset as plansByAsset, MAINTENANCE_KIND_LABEL } from '../services/maintenancePlans';
import { listInspections, listNonconformities, INSPECTION_TYPE_LABEL, SEVERITY_COLOR, NC_STATUS_LABEL } from '../services/inspections';
import { Asset, EnergyReading, Inspection, MaintenancePlan, Nonconformity, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AssetDetail'>;
type RP = RouteProp<RootStackParamList, 'AssetDetail'>;

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('tr-TR'); } catch { return iso; }
}

export default function AssetDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RP>();
  const { assetId } = route.params;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [readings, setReadings] = useState<EnergyReading[]>([]);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [ncs, setNcs] = useState<Nonconformity[]>([]);

  const refresh = useCallback(async () => {
    const [a, rd, pl, ins, nc] = await Promise.all([
      getAsset(assetId),
      readingsByAsset(assetId),
      plansByAsset(assetId),
      listInspections(),
      listNonconformities(),
    ]);
    setAsset(a || null);
    setReadings(rd);
    setPlans(pl);
    setInspections(ins.filter(i => i.assetId === assetId));
    setNcs(nc.filter(n => n.assetId === assetId));
  }, [assetId]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  if (!asset) {
    return <SafeAreaView style={styles.safe}><Text style={styles.loading}>Yükleniyor…</Text></SafeAreaView>;
  }

  const onDelete = () => {
    Alert.alert('Sil', 'Cihaz silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => { await deleteAsset(asset.id); nav.goBack(); },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{asset.name}</Text>
          <Text style={styles.heroSub}>{ASSET_TYPE_LABEL[asset.type]}</Text>
          {asset.code ? <Text style={styles.heroBadge}>QR: {asset.code}</Text> : null}
        </View>

        <Info label="Müşteri" value={asset.customerName} />
        <Info label="Seri No" value={asset.serialNo} />
        <Info label="Üretici / Model" value={[asset.manufacturer, asset.model].filter(Boolean).join(' / ') || undefined} />
        <Info label="Güç" value={asset.power} />
        <Info label="Kurulum" value={fmtDate(asset.installDate)} />
        <Info label="Garanti Bitiş" value={fmtDate(asset.warrantyEnd)} />
        <Info label="Konum" value={asset.location} />
        {asset.notes ? <Info label="Notlar" value={asset.notes} /> : null}

        <View style={styles.actionsRow}>
          <ActionBtn icon="add-circle-outline" label="Ölçüm" color={brand.green}
            onPress={() => nav.navigate('EnergyReadingForm', { assetId: asset.id })} />
          <ActionBtn icon="construct-outline" label="Bakım" color="#0ea5e9"
            onPress={() => nav.navigate('MaintenancePlans', { assetId: asset.id })} />
          <ActionBtn icon="clipboard-outline" label="Denetim" color="#8b5cf6"
            onPress={() => nav.navigate('InspectionForm', { assetId: asset.id })} />
        </View>
        <View style={styles.actionsRow}>
          <ActionBtn icon="pencil-outline" label="Düzenle" color={brand.blueLight}
            onPress={() => nav.navigate('AssetForm', { assetId: asset.id })} />
          <ActionBtn icon="trash-outline" label="Sil" color={colors.rose.default} onPress={onDelete} />
        </View>

        <Section title={`Ölçümler (${readings.length})`} icon="speedometer-outline">
          {readings.length === 0 ? <Text style={styles.empty}>Kayıt yok.</Text> : readings.slice(0, 5).map(r => (
            <View key={r.id} style={styles.row}>
              <Text style={styles.rowTitle}>{READING_KIND_LABEL[r.kind]}</Text>
              <Text style={styles.rowSub}>{fmtDate(r.date)}</Text>
            </View>
          ))}
        </Section>

        <Section title={`Bakım Planları (${plans.length})`} icon="construct-outline">
          {plans.length === 0 ? <Text style={styles.empty}>Plan yok.</Text> : plans.map(p => (
            <View key={p.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{p.name}</Text>
                <Text style={styles.rowSub}>{MAINTENANCE_KIND_LABEL[p.kind]} · Her {p.frequencyDays} gün</Text>
              </View>
              <Text style={styles.rowDate}>{fmtDate(p.nextDueAt)}</Text>
            </View>
          ))}
        </Section>

        <Section title={`Denetimler (${inspections.length})`} icon="clipboard-outline">
          {inspections.length === 0 ? <Text style={styles.empty}>Denetim yok.</Text> : inspections.slice(0, 5).map(i => (
            <View key={i.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{i.title}</Text>
                <Text style={styles.rowSub}>{INSPECTION_TYPE_LABEL[i.type]} · {fmtDate(i.date)}</Text>
              </View>
              <Text style={[styles.score, { color: i.score >= 80 ? brand.green : i.score >= 60 ? '#f59e0b' : colors.rose.default }]}>{i.score}</Text>
            </View>
          ))}
        </Section>

        <Section title={`Uygunsuzluklar (${ncs.length})`} icon="warning-outline">
          {ncs.length === 0 ? <Text style={styles.empty}>Uygunsuzluk yok.</Text> : ncs.map(n => (
            <View key={n.id} style={styles.row}>
              <View style={[styles.severityDot, { backgroundColor: SEVERITY_COLOR[n.severity] }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{n.description}</Text>
                <Text style={styles.rowSub}>{NC_STATUS_LABEL[n.status]} · {fmtDate(n.createdAt)}</Text>
              </View>
            </View>
          ))}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ActionBtn({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: color }]} onPress={onPress}>
      <Ionicons name={icon as any} size={14} color="#fff" />
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={14} color={colors.text.muted} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  loading: { color: colors.text.muted, padding: spacing.lg },
  content: { padding: spacing.lg, paddingBottom: 80 },
  hero: {
    backgroundColor: colors.emerald.bg, padding: spacing.lg, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.emerald.border, alignItems: 'center', gap: 4,
  },
  heroTitle: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroSub: { color: colors.text.muted, fontSize: typography.sm },
  heroBadge: { color: brand.green, fontSize: typography.xs, fontWeight: '700', marginTop: 4 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border.primary,
  },
  infoLabel: { color: colors.text.muted, fontSize: typography.xs },
  infoValue: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  actionsRow: { flexDirection: 'row', gap: 6, marginTop: spacing.md },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 10, borderRadius: radius.md,
  },
  actionText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  section: { marginTop: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  sectionTitle: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', textTransform: 'uppercase' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border.primary,
  },
  rowTitle: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  rowSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  rowDate: { color: colors.text.muted, fontSize: typography.xs },
  score: { fontSize: typography.md, fontWeight: '800' },
  severityDot: { width: 10, height: 10, borderRadius: 5 },
  empty: { color: colors.text.faint, fontSize: typography.xs, paddingVertical: 6 },
});
