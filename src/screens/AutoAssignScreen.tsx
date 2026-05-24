// AutoAssignScreen — POZ-DEV-128 En yakın personele otomatik atama UI
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, WorkOrder } from '../types';
import { useAppContext } from '../context/AppContext';
import { findNearestEmployees, CandidateEmployee } from '../services/nearestAssign';
import { requestAndGetPosition } from '../services/location';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AutoAssign'>;
type Rt = RouteProp<RootStackParamList, 'AutoAssign'>;

export default function AutoAssignScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const initialWoId = route.params?.workOrderId;

  const { workOrders, employees, assignWorkOrder } = useAppContext();

  const assignableWOs = useMemo(
    () => workOrders.filter(w => w.status !== 'Tamamlandı' && w.status !== 'İptal'),
    [workOrders],
  );

  const [selectedId, setSelectedId] = useState<string | undefined>(initialWoId);
  const selectedWO: WorkOrder | undefined = useMemo(
    () => workOrders.find(w => w.id === selectedId),
    [workOrders, selectedId],
  );

  const [target, setTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [candidates, setCandidates] = useState<CandidateEmployee[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchLocation = async () => {
    setLoadingLoc(true);
    try {
      const pos = await requestAndGetPosition();
      if (pos) setTarget({ lat: pos.latitude, lng: pos.longitude });
      else Alert.alert('Konum', 'Konum alınamadı. İzin verildi mi?');
    } finally {
      setLoadingLoc(false);
    }
  };

  useEffect(() => { fetchLocation(); }, []);

  const search = async () => {
    if (!target) {
      Alert.alert('Konum', 'Önce hedef konumu belirleyin.');
      return;
    }
    setSearching(true);
    try {
      const list = await findNearestEmployees(target.lat, target.lng, 8);
      setCandidates(list);
      if (list.length === 0) {
        Alert.alert('Sonuç', 'Aktif konum sinyali olan personel bulunamadı.');
      }
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Arama başarısız.');
    } finally {
      setSearching(false);
    }
  };

  const employeeName = (userId: string): string => {
    const e = employees.find(emp => emp.id === userId);
    return e?.name || userId.slice(0, 12);
  };

  const onAssign = (c: CandidateEmployee) => {
    if (!selectedWO) return;
    const name = employeeName(c.userId);
    Alert.alert(
      'Atamayı onayla',
      `${selectedWO.serviceName} işini ${name} kişisine atamak istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ata',
          onPress: () => {
            assignWorkOrder(selectedWO.id, c.userId, name);
            Alert.alert('Atandı', `${name} kişisine atandı.`);
            nav.goBack();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="flash-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Otomatik Atama</Text>
            <Text style={styles.heroSub}>Hedef konuma en yakın personeli öner</Text>
          </View>
        </View>

        {/* WO seçici */}
        <View style={styles.card}>
          <Text style={styles.label}>İş Emri</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
            {assignableWOs.length === 0 ? (
              <Text style={styles.empty}>Atanabilir iş emri yok</Text>
            ) : assignableWOs.map(w => {
              const sel = w.id === selectedId;
              return (
                <TouchableOpacity
                  key={w.id}
                  style={[styles.chip, sel && styles.chipActive]}
                  onPress={() => setSelectedId(w.id)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, sel && styles.chipTextActive]} numberOfLines={1}>{w.serviceName}</Text>
                  <Text style={[styles.chipSub, sel && styles.chipTextActive]} numberOfLines={1}>{w.client}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Hedef konum */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Hedef Konum (cihaz GPS)</Text>
            <TouchableOpacity style={styles.btnSmall} onPress={fetchLocation} disabled={loadingLoc}>
              {loadingLoc ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="refresh" size={14} color="#fff" />}
              <Text style={styles.btnSmallText}>Yenile</Text>
            </TouchableOpacity>
          </View>
          {target ? (
            <Text style={styles.targetText}>{target.lat.toFixed(5)}, {target.lng.toFixed(5)}</Text>
          ) : (
            <Text style={styles.empty}>Konum alınmadı</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.searchBtn, (!target || !selectedWO) && styles.searchBtnDisabled]}
          onPress={search}
          disabled={!target || !selectedWO || searching}
          activeOpacity={0.85}
        >
          {searching ? <ActivityIndicator color="#fff" /> : <Ionicons name="search" size={18} color="#fff" />}
          <Text style={styles.searchBtnText}>En Yakın Personeli Bul</Text>
        </TouchableOpacity>

        {/* Aday listesi */}
        {candidates.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.label}>Adaylar ({candidates.length})</Text>
            {candidates.map((c, idx) => (
              <View key={c.userId} style={styles.candidateRow}>
                <View style={[styles.rankBadge, { backgroundColor: idx === 0 ? '#22c55e' : '#64748b' }]}>
                  <Text style={styles.rankText}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.candidateName}>{employeeName(c.userId)}</Text>
                  <Text style={styles.candidateMeta}>
                    {(c.distanceM / 1000).toFixed(2)} km {c.updatedAt ? `• ${new Date(c.updatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </Text>
                </View>
                <TouchableOpacity style={styles.assignBtn} onPress={() => onAssign(c)} activeOpacity={0.85}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                  <Text style={styles.assignBtnText}>Ata</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.md },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#f59e0b', borderRadius: radius.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: spacing.sm },
  label: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.primary, maxWidth: 200 },
  chipActive: { borderColor: '#0ea5e9', backgroundColor: '#0ea5e922' },
  chipText: { color: colors.text.primary, fontWeight: '700', fontSize: typography.xs },
  chipSub: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  chipTextActive: { color: '#0ea5e9' },
  empty: { color: colors.text.faint, fontSize: typography.xs },
  targetText: { color: colors.text.primary, fontSize: typography.sm, fontFamily: 'monospace' as any },
  btnSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, backgroundColor: '#0ea5e9' },
  btnSmallText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  searchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: spacing.md, borderRadius: radius.md, backgroundColor: '#f59e0b' },
  searchBtnDisabled: { opacity: 0.4 },
  searchBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  candidateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.primary },
  rankBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rankText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  candidateName: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  candidateMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  assignBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: '#22c55e' },
  assignBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
});
