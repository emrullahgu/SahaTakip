// Faz 45 — SafetyChecklistsScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { SafetyChecklist, SafetyChecklistItem } from '../types';
import { listChecklists, createChecklist } from '../services/quality';

const TEMPLATES: { title: string; items: string[] }[] = [
  { title: 'Yüksekte Çalışma Öncesi', items: ['Emniyet kemeri kontrolü', 'İskele sağlamlığı', 'Hava koşulu uygunluğu', 'İlk yardım çantası', 'Ekipman muayene tarihi'] },
  { title: 'Elektrik Pano Müdahale', items: ['Enerji kesimi', 'Topraklama kontrolü', 'KKD (eldiven, gözlük)', 'Kilit-Etiket sistemi'] },
  { title: 'Kapalı Alan Girişi', items: ['Gaz ölçümü', 'Havalandırma', 'İletişim sağlama', 'Acil çıkış planı'] },
];

export default function SafetyChecklistsScreen() {
  const [items, setItems] = useState<SafetyChecklist[]>([]);
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState<SafetyChecklist | null>(null);

  const [tpl, setTpl] = useState(0);
  const [location, setLocation] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [chkItems, setChkItems] = useState<SafetyChecklistItem[]>([]);

  const load = useCallback(async () => { setItems(await listChecklists()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openModal = () => {
    setTpl(0);
    setLocation(''); setPerformedBy('');
    setChkItems(TEMPLATES[0].items.map((t, i) => ({ id: `i${i}`, text: t, checked: false })));
    setModal(true);
  };

  const pickTpl = (idx: number) => {
    setTpl(idx);
    setChkItems(TEMPLATES[idx].items.map((t, i) => ({ id: `i${i}`, text: t, checked: false })));
  };

  const toggle = (id: string) => setChkItems(chkItems.map(c => c.id === id ? { ...c, checked: !c.checked } : c));

  const onSave = async () => {
    if (!location.trim() || !performedBy.trim()) { Alert.alert('Eksik', 'Lokasyon ve uygulayan gerekli.'); return; }
    await createChecklist(TEMPLATES[tpl].title, location, performedBy, chkItems);
    setModal(false); load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => {
          const c = item.passed ? '#22c55e' : '#ef4444';
          return (
            <TouchableOpacity style={[s.card, { borderLeftColor: c }]} onPress={() => setDetail(item)}>
              <View style={[s.scoreBadge, { backgroundColor: c }]}>
                <Text style={s.scoreV}>{item.score}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{item.title}</Text>
                <Text style={s.meta}>{item.location} · {item.performedBy}</Text>
                <Text style={s.t}>{new Date(item.performedAt).toLocaleString('tr-TR')}</Text>
              </View>
              <View style={[s.passBadge, { backgroundColor: c }]}>
                <Text style={s.passT}>{item.passed ? 'GEÇTİ' : 'KALDI'}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={s.empty}>Kontrol kaydı yok.</Text>}
      />
      <TouchableOpacity style={s.fab} onPress={openModal}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={s.modalBack}>
          <View style={s.modal}>
            <Text style={s.mTitle}>Yeni Kontrol Listesi</Text>
            <ScrollView style={{ maxHeight: 500 }}>
              <Text style={s.lbl}>Şablon</Text>
              <View style={s.row}>
                {TEMPLATES.map((t, i) => (
                  <TouchableOpacity key={t.title} style={[s.pill, tpl === i && { backgroundColor: '#f59e0b' }]} onPress={() => pickTpl(i)}>
                    <Text style={[s.pillT, tpl === i && s.pillTOn]}>{t.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={s.input} value={location} onChangeText={setLocation} placeholder="Lokasyon" placeholderTextColor={colors.text.faint} />
              <TextInput style={s.input} value={performedBy} onChangeText={setPerformedBy} placeholder="Uygulayan" placeholderTextColor={colors.text.faint} />
              <Text style={s.lbl}>Kontrol Maddeleri</Text>
              {chkItems.map(it => (
                <TouchableOpacity key={it.id} style={s.chkRow} onPress={() => toggle(it.id)}>
                  <Ionicons name={it.checked ? 'checkbox' : 'square-outline'} size={22} color={it.checked ? '#22c55e' : colors.text.muted} />
                  <Text style={[s.chkT, it.checked && { color: colors.text.primary }]}>{it.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={s.actions}>
              <TouchableOpacity style={[s.act, { backgroundColor: colors.bg.primary }]} onPress={() => setModal(false)}>
                <Text style={s.actT}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.act, { backgroundColor: '#f59e0b' }]} onPress={onSave}>
                <Text style={s.actT}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <View style={s.modalBack}>
          <View style={s.modal}>
            <Text style={s.mTitle}>{detail?.title}</Text>
            <Text style={s.mSub}>{detail?.location} · {detail?.performedBy}</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {detail?.items.map(it => (
                <View key={it.id} style={s.chkRow}>
                  <Ionicons name={it.checked ? 'checkmark-circle' : 'close-circle'} size={22} color={it.checked ? '#22c55e' : '#ef4444'} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.chkT}>{it.text}</Text>
                    {it.note && <Text style={s.note}>Not: {it.note}</Text>}
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={[s.act, { backgroundColor: '#f59e0b' }]} onPress={() => setDetail(null)}>
              <Text style={s.actT}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  scoreBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  scoreV: { color: '#fff', fontSize: typography.md, fontWeight: '800' },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  t: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
  passBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  passT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 56, height: 56, borderRadius: 28, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.md },
  modal: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  mTitle: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  mSub: { color: colors.text.muted, fontSize: typography.xs },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, marginBottom: 6 },
  lbl: { color: colors.text.muted, fontSize: typography.xs, marginTop: 6, marginBottom: 4, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary },
  pillT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  pillTOn: { color: '#fff' },
  chkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  chkT: { color: colors.text.muted, fontSize: typography.sm, flex: 1 },
  note: { color: '#f59e0b', fontSize: typography.xs, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  act: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  actT: { color: '#fff', fontWeight: '800' },
});
