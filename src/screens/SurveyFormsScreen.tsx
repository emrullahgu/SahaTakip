// Faz 43 — SurveyFormsScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { SurveyForm, RootStackParamList } from '../types';
import { listSurveys, createSurvey, surveyTotal } from '../services/smartQuote';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SurveyFormsScreen() {
  const [items, setItems] = useState<SurveyForm[]>([]);
  const [modal, setModal] = useState(false);
  const [cust, setCust] = useState('');
  const [title, setTitle] = useState('');
  const nav = useNavigation<Nav>();
  const load = useCallback(async () => { setItems(await listSurveys()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onAdd = async () => {
    if (!cust.trim() || !title.trim()) return;
    const sv = await createSurvey(cust, title);
    setCust(''); setTitle(''); setModal(false);
    load();
    nav.navigate('SurveyFormDetail', { surveyId: sv.id });
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 90 }}
        ListEmptyComponent={<Text style={s.empty}>Keşif yok. FAB ile ekleyin.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => nav.navigate('SurveyFormDetail', { surveyId: item.id })}>
            <Ionicons name="clipboard" size={22} color="#0ea5e9" />
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.sub}>{item.customerName} · {item.items.length} kalem</Text>
              <Text style={s.tm}>{new Date(item.updatedAt).toLocaleString('tr-TR')}</Text>
            </View>
            <Text style={s.tot}>₺{surveyTotal(item).toLocaleString('tr-TR')}</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={() => setModal(true)}><Ionicons name="add" size={28} color="#fff" /></TouchableOpacity>
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={s.mw}><View style={s.mbox}>
          <Text style={s.mt}>Yeni Keşif</Text>
          <TextInput style={s.input} value={cust} onChangeText={setCust} placeholder="Müşteri adı" placeholderTextColor={colors.text.faint} />
          <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Keşif başlığı" placeholderTextColor={colors.text.faint} />
          <View style={s.row}>
            <TouchableOpacity style={[s.mb, { backgroundColor: '#475569' }]} onPress={() => setModal(false)}><Text style={s.mbT}>Vazgeç</Text></TouchableOpacity>
            <TouchableOpacity style={[s.mb, { backgroundColor: '#0ea5e9' }]} onPress={onAdd}><Text style={s.mbT}>Ekle</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tm: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
  tot: { color: '#22c55e', fontSize: typography.sm, fontWeight: '800' },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  mw: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.md },
  mbox: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  mt: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', gap: spacing.sm },
  mb: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  mbT: { color: '#fff', fontWeight: '700' },
});
