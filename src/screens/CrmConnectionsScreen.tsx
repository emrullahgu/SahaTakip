// CrmConnectionsScreen — POZ-DEV-461
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { CrmConnection, CrmProvider } from '../types';
import { listCrmConnections, saveCrmConnection, deleteCrmConnection, importCrmContacts, CRM_LABEL, STATUS_COLOR, STATUS_LABEL } from '../services/enterpriseIntegrations';

const PROVIDERS: CrmProvider[] = ['hubspot', 'salesforce', 'zoho', 'pipedrive', 'custom'];

export default function CrmConnectionsScreen() {
  const [items, setItems] = useState<CrmConnection[]>([]);
  const [modal, setModal] = useState(false);
  const [provider, setProvider] = useState<CrmProvider>('hubspot');
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');

  const load = useCallback(async () => { setItems(await listCrmConnections()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    if (!name.trim()) { Alert.alert('Eksik', 'Ad gerekli'); return; }
    await saveCrmConnection({ provider, name: name.trim(), apiKey: apiKey.trim() || undefined });
    setName(''); setApiKey(''); setModal(false); load();
  };

  const importNow = async (id: string) => {
    const r = await importCrmContacts(id);
    Alert.alert('İçe Aktarım', `${r} kişi içe alındı.`);
    load();
  };

  const remove = (id: string) => Alert.alert('Sil', 'Silinsin mi?', [
    { text: 'Vazgeç' }, { text: 'Sil', style: 'destructive', onPress: async () => { await deleteCrmConnection(id); load(); } },
  ]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={s.empty}>CRM bağlantısı yok.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity onLongPress={() => remove(item.id)} style={s.card}>
            <View style={s.row}>
              <Ionicons name="briefcase-outline" size={20} color="#ec4899" />
              <View style={{ flex: 1 }}>
                <Text style={s.n}>{item.name}</Text>
                <Text style={s.sub}>{CRM_LABEL[item.provider]} · {item.importedContacts} kişi</Text>
              </View>
              <View style={[s.st, { borderColor: STATUS_COLOR[item.status] }]}>
                <Text style={[s.stT, { color: STATUS_COLOR[item.status] }]}>{STATUS_LABEL[item.status]}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => importNow(item.id)} style={s.btn}>
              <Ionicons name="cloud-download-outline" size={14} color="#fff" />
              <Text style={s.btnT}>İçe Aktar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={() => setModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={s.mWrap}>
          <View style={s.mBox}>
            <Text style={s.mT}>Yeni CRM Bağlantısı</Text>
            <View style={s.chips}>
              {PROVIDERS.map(p => (
                <TouchableOpacity key={p} onPress={() => setProvider(p)} style={[s.chip, provider === p && { backgroundColor: '#ec4899' }]}>
                  <Text style={[s.chipT, provider === p && { color: '#fff' }]}>{CRM_LABEL[p]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput value={name} onChangeText={setName} placeholder="Ad" placeholderTextColor={colors.text.faint} style={s.input} />
            <TextInput value={apiKey} onChangeText={setApiKey} placeholder="API Key" placeholderTextColor={colors.text.faint} autoCapitalize="none" secureTextEntry style={s.input} />
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity onPress={() => setModal(false)} style={[s.mBtn, { backgroundColor: '#64748b' }]}><Text style={s.mBtnT}>Vazgeç</Text></TouchableOpacity>
              <TouchableOpacity onPress={save} style={[s.mBtn, { backgroundColor: '#22c55e' }]}><Text style={s.mBtnT}>Kaydet</Text></TouchableOpacity>
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
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  st: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  stT: { fontSize: 10, fontWeight: '800' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ec4899', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, alignSelf: 'flex-start', marginTop: 6 },
  btnT: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#ec4899', alignItems: 'center', justifyContent: 'center' },
  mWrap: { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' },
  mBox: { backgroundColor: colors.bg.secondary, padding: spacing.lg, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: spacing.sm },
  mT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#ec4899' },
  chipT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, fontSize: typography.sm },
  mBtn: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  mBtnT: { color: '#fff', fontWeight: '800' },
});
