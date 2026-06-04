// AiQuoteDraftDetailScreen — Faz 41
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect, RouteProp } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { AiQuoteDraft, RootStackParamList } from '../types';
import { getQuoteDraft, setQuoteDraftStatus } from '../services/aiAssistant';

type R = RouteProp<RootStackParamList, 'AiQuoteDraftDetail'>;

export default function AiQuoteDraftDetailScreen() {
  const route = useRoute<R>();
  const nav = useNavigation();
  const [draft, setDraft] = useState<AiQuoteDraft | null>(null);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    try { const d = await getQuoteDraft(route.params.draftId); setDraft(d || null); }
    finally { setLoaded(true); }
  }, [route.params.draftId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const action = async (status: 'approved' | 'rejected') => {
    Alert.alert(status === 'approved' ? 'Onayla' : 'Reddet', 'Emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Evet', onPress: async () => { await setQuoteDraftStatus(route.params.draftId, status); nav.goBack(); } },
    ]);
  };

  if (!loaded) return <SafeAreaView style={s.safe}><ActivityIndicator style={{ marginTop: 48 }} color={colors.text.muted} /></SafeAreaView>;
  if (!draft) return <SafeAreaView style={s.safe}><Text style={s.empty}>Taslak bulunamadı.</Text></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 60 }}>
        <View style={s.card}>
          <Text style={s.h}>Müşteri</Text>
          <Text style={s.v}>{draft.customerName}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.h}>Keşif Notu</Text>
          <Text style={s.v}>{draft.surveyText}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.h}>Kalemler</Text>
          {draft.items.map((it, i) => (
            <View key={i} style={s.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.itCode}>{it.pozCode}</Text>
                <Text style={s.itName}>{it.pozName}</Text>
              </View>
              <Text style={s.itQty}>{it.qty} × ₺{it.unitPrice.toLocaleString('tr-TR')}</Text>
              <Text style={s.itTot}>₺{(it.qty * it.unitPrice).toLocaleString('tr-TR')}</Text>
            </View>
          ))}
          <View style={s.total}>
            <Text style={s.tLbl}>Toplam</Text>
            <Text style={s.tVal}>₺{draft.totalAmount.toLocaleString('tr-TR')}</Text>
          </View>
        </View>
        {draft.status === 'draft' && (
          <View style={s.actions}>
            <TouchableOpacity style={[s.btn, { backgroundColor: '#ef4444' }]} onPress={() => action('rejected')}>
              <Ionicons name="close" size={18} color="#fff" />
              <Text style={s.btnT}>Reddet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { backgroundColor: '#22c55e' }]} onPress={() => action('approved')}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={s.btnT}>Onayla</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  h: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginBottom: 4 },
  v: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  itCode: { color: '#0ea5e9', fontSize: typography.xs, fontWeight: '700' },
  itName: { color: colors.text.primary, fontSize: typography.sm },
  itQty: { color: colors.text.muted, fontSize: typography.xs },
  itTot: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', minWidth: 80, textAlign: 'right' },
  total: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 2, borderTopColor: colors.border.primary },
  tLbl: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  tVal: { color: '#22c55e', fontSize: typography.lg, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.sm, borderRadius: radius.sm },
  btnT: { color: '#fff', fontWeight: '700' },
});
