// IntegrationApiKeysScreen — POZ-DEV-465
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { IntegrationApiKey } from '../types';
import { listApiKeysV2, createApiKeyV2, revokeApiKeyV2, deleteApiKeyV2 } from '../services/enterpriseIntegrations';

const SCOPES = ['read', 'write', 'admin', 'webhook'];

export default function IntegrationApiKeysScreen() {
  const [items, setItems] = useState<IntegrationApiKey[]>([]);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>(['read']);

  const load = useCallback(async () => { setItems(await listApiKeysV2()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = (sc: string) => setSelected(s => s.includes(sc) ? s.filter(x => x !== sc) : [...s, sc]);
  const create = async () => {
    if (!name.trim()) { Alert.alert('Eksik', 'Ad gerekli'); return; }
    await createApiKeyV2(name.trim(), selected);
    setName(''); setSelected(['read']); setModal(false); load();
  };
  const revoke = (id: string) => Alert.alert('İptal', 'Anahtar iptal edilsin mi?', [
    { text: 'Vazgeç' }, { text: 'İptal Et', style: 'destructive', onPress: async () => { await revokeApiKeyV2(id); load(); } },
  ]);
  const remove = (id: string) => Alert.alert('Sil', 'Silinsin mi?', [
    { text: 'Vazgeç' }, { text: 'Sil', style: 'destructive', onPress: async () => { await deleteApiKeyV2(id); load(); } },
  ]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={s.empty}>API anahtarı yok.</Text>}
        renderItem={({ item }) => {
          const masked = item.key.substring(0, 8) + '••••' + item.key.substring(item.key.length - 4);
          return (
            <TouchableOpacity onLongPress={() => remove(item.id)} style={s.card}>
              <View style={s.row}>
                <Ionicons name="key-outline" size={20} color={item.isActive ? '#10b981' : '#64748b'} />
                <View style={{ flex: 1 }}>
                  <Text style={s.n}>{item.name}</Text>
                  <Text style={s.key}>{masked}</Text>
                </View>
                {item.isActive ? (
                  <TouchableOpacity onPress={() => revoke(item.id)} style={[s.btn, { backgroundColor: '#ef4444' }]}>
                    <Text style={s.btnT}>İptal</Text>
                  </TouchableOpacity>
                ) : <Text style={s.revoked}>İptalli</Text>}
              </View>
              <View style={s.scopes}>
                {item.scopes.map(sc => <Text key={sc} style={s.sc}>{sc}</Text>)}
              </View>
              <Text style={s.sub}>{item.usageCount} kullanım{item.lastUsedAt ? ' · son: ' + new Date(item.lastUsedAt).toLocaleString('tr-TR') : ''}</Text>
            </TouchableOpacity>
          );
        }}
      />
      <TouchableOpacity style={s.fab} onPress={() => setModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={s.mWrap}>
          <View style={s.mBox}>
            <Text style={s.mT}>Yeni API Anahtarı</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Ad" placeholderTextColor={colors.text.faint} style={s.input} />
            <View style={s.chips}>
              {SCOPES.map(sc => (
                <TouchableOpacity key={sc} onPress={() => toggle(sc)} style={[s.chip, selected.includes(sc) && { backgroundColor: '#10b981' }]}>
                  <Text style={[s.chipT, selected.includes(sc) && { color: '#fff' }]}>{sc}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity onPress={() => setModal(false)} style={[s.mBtn, { backgroundColor: '#64748b' }]}><Text style={s.mBtnT}>Vazgeç</Text></TouchableOpacity>
              <TouchableOpacity onPress={create} style={[s.mBtn, { backgroundColor: '#22c55e' }]}><Text style={s.mBtnT}>Oluştur</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  key: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2, fontFamily: 'monospace' },
  btn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  btnT: { color: '#fff', fontSize: 10, fontWeight: '700' },
  revoked: { color: '#ef4444', fontSize: 10, fontWeight: '700' },
  scopes: { flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  sc: { color: '#10b981', fontSize: 9, fontWeight: '800', backgroundColor: '#10b98122', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  mWrap: { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' },
  mBox: { backgroundColor: colors.bg.secondary, padding: spacing.lg, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: spacing.sm },
  mT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, fontSize: typography.sm },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#10b981' },
  chipT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  mBtn: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  mBtnT: { color: '#fff', fontWeight: '800' },
});
