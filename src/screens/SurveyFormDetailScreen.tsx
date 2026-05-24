// Faz 43 — SurveyFormDetailScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { SurveyForm, SurveyItemKind, RootStackParamList } from '../types';
import { getSurvey, addSurveyItem, removeSurveyItem, surveyTotal, KIND_LABEL, KIND_ICON, KIND_COLOR } from '../services/smartQuote';

type R = RouteProp<RootStackParamList, 'SurveyFormDetail'>;
const KINDS: SurveyItemKind[] = ['product', 'cable', 'panel', 'service', 'labor'];

export default function SurveyFormDetailScreen() {
  const route = useRoute<R>();
  const [sv, setSv] = useState<SurveyForm | null>(null);
  const [modal, setModal] = useState(false);
  const [kind, setKind] = useState<SurveyItemKind>('product');
  const [desc, setDesc] = useState('');
  const [unit, setUnit] = useState('adet');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');

  const load = useCallback(async () => { const s = await getSurvey(route.params.surveyId); setSv(s || null); }, [route.params.surveyId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onAdd = async () => {
    if (!desc.trim()) return;
    await addSurveyItem(route.params.surveyId, { kind, description: desc, unit, qty: Number(qty) || 1, unitPrice: Number(price) || 0 });
    setDesc(''); setQty('1'); setPrice('');
    setModal(false); load();
  };

  if (!sv) return <SafeAreaView style={s.safe}><Text style={s.empty}>Yükleniyor...</Text></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.header}>
        <Text style={s.h1}>{sv.title}</Text>
        <Text style={s.h2}>{sv.customerName}</Text>
        <Text style={s.tot}>Toplam: ₺{surveyTotal(sv).toLocaleString('tr-TR')}</Text>
      </View>
      <FlatList
        data={sv.items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 90 }}
        ListEmptyComponent={<Text style={s.empty}>Kalem ekleyin.</Text>}
        renderItem={({ item }) => (
          <View style={[s.card, { borderLeftColor: KIND_COLOR[item.kind] }]}>
            <Ionicons name={KIND_ICON[item.kind] as any} size={22} color={KIND_COLOR[item.kind]} />
            <View style={{ flex: 1 }}>
              <Text style={s.itDesc}>{item.description}</Text>
              <Text style={s.itK}>{KIND_LABEL[item.kind]} · {item.qty} {item.unit} × ₺{(item.unitPrice || 0).toLocaleString('tr-TR')}</Text>
            </View>
            <Text style={s.itT}>₺{(item.qty * (item.unitPrice || 0)).toLocaleString('tr-TR')}</Text>
            <TouchableOpacity onPress={() => Alert.alert('Sil', 'Silinsin mi?', [{ text: 'Vazgeç' }, { text: 'Sil', style: 'destructive', onPress: async () => { await removeSurveyItem(route.params.surveyId, item.id); load(); } }])}>
              <Ionicons name="trash" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={() => setModal(true)}><Ionicons name="add" size={28} color="#fff" /></TouchableOpacity>
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={s.mw}><ScrollView style={s.mbox} contentContainerStyle={{ gap: spacing.sm }}>
          <Text style={s.mt}>Kalem Ekle</Text>
          <Text style={s.lbl}>Tip</Text>
          <View style={s.kindRow}>
            {KINDS.map(k => (
              <TouchableOpacity key={k} style={[s.kindBtn, kind === k && { backgroundColor: KIND_COLOR[k], borderColor: KIND_COLOR[k] }]} onPress={() => setKind(k)}>
                <Text style={[s.kindT, kind === k && { color: '#fff' }]}>{KIND_LABEL[k]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={s.input} value={desc} onChangeText={setDesc} placeholder="Açıklama" placeholderTextColor={colors.text.faint} />
          <View style={s.row}>
            <TextInput style={[s.input, { flex: 1 }]} value={unit} onChangeText={setUnit} placeholder="Birim" placeholderTextColor={colors.text.faint} />
            <TextInput style={[s.input, { flex: 1 }]} value={qty} onChangeText={setQty} placeholder="Adet" keyboardType="numeric" placeholderTextColor={colors.text.faint} />
            <TextInput style={[s.input, { flex: 1 }]} value={price} onChangeText={setPrice} placeholder="Birim ₺" keyboardType="numeric" placeholderTextColor={colors.text.faint} />
          </View>
          <View style={s.row}>
            <TouchableOpacity style={[s.mb, { backgroundColor: '#475569' }]} onPress={() => setModal(false)}><Text style={s.mbT}>Vazgeç</Text></TouchableOpacity>
            <TouchableOpacity style={[s.mb, { backgroundColor: '#0ea5e9' }]} onPress={onAdd}><Text style={s.mbT}>Ekle</Text></TouchableOpacity>
          </View>
        </ScrollView></View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  header: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  h1: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  h2: { color: colors.text.muted, fontSize: typography.sm, marginTop: 2 },
  tot: { color: '#22c55e', fontSize: typography.md, fontWeight: '800', marginTop: 6 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  itDesc: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  itK: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  itT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800', minWidth: 80, textAlign: 'right' },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  mw: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  mbox: { backgroundColor: colors.bg.secondary, padding: spacing.md, maxHeight: '85%' },
  mt: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  lbl: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  kindBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  kindT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', gap: spacing.sm },
  mb: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  mbT: { color: '#fff', fontWeight: '700' },
});
