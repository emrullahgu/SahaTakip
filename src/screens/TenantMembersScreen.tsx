// TenantMembersScreen — Faz 40
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, TenantMember } from '../types';
import { listMembers, addMember, removeMember } from '../services/platform';

type R = RouteProp<RootStackParamList, 'TenantMembers'>;
const ROLES: TenantMember['role'][] = ['owner', 'admin', 'manager', 'staff'];
const ROLE_LABEL: Record<TenantMember['role'], string> = { owner: 'Sahip', admin: 'Yönetici', manager: 'Müdür', staff: 'Personel' };
const ROLE_COLOR: Record<TenantMember['role'], string> = { owner: '#a855f7', admin: '#ef4444', manager: '#0ea5e9', staff: '#64748b' };

export default function TenantMembersScreen() {
  const r = useRoute<R>();
  const tenantId = r.params?.tenantId || 't1';
  const [items, setItems] = useState<TenantMember[]>([]);
  const [modal, setModal] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TenantMember['role']>('staff');

  const load = useCallback(async () => { setItems(await listMembers(tenantId)); }, [tenantId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const add = async () => {
    if (!email.trim()) { Alert.alert('Eksik', 'E-posta gerekli'); return; }
    await addMember(tenantId, email.trim(), role);
    setEmail(''); setRole('staff'); setModal(false); load();
  };

  const remove = (id: string) => Alert.alert('Çıkar', 'Üye çıkarılsın mı?', [
    { text: 'Vazgeç' }, { text: 'Çıkar', style: 'destructive', onPress: async () => { await removeMember(id); load(); } },
  ]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={s.empty}>Üye yok.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity onLongPress={() => remove(item.id)} style={s.card}>
            <View style={s.row}>
              <Ionicons name="person-circle-outline" size={32} color={ROLE_COLOR[item.role]} />
              <View style={{ flex: 1 }}>
                <Text style={s.n}>{item.email}</Text>
                <Text style={s.sub}>{new Date(item.joinedAt).toLocaleDateString('tr-TR')}</Text>
              </View>
              <View style={[s.b, { backgroundColor: ROLE_COLOR[item.role] }]}>
                <Text style={s.bT}>{ROLE_LABEL[item.role]}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={() => setModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={s.mWrap}>
          <View style={s.mBox}>
            <Text style={s.mT}>Yeni Üye</Text>
            <TextInput value={email} onChangeText={setEmail} placeholder="E-posta" placeholderTextColor={colors.text.faint} autoCapitalize="none" style={s.input} />
            <View style={s.chips}>
              {ROLES.map(rr => (
                <TouchableOpacity key={rr} onPress={() => setRole(rr)} style={[s.chip, role === rr && { backgroundColor: ROLE_COLOR[rr] }]}>
                  <Text style={[s.chipT, role === rr && { color: '#fff' }]}>{ROLE_LABEL[rr]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity onPress={() => setModal(false)} style={[s.mBtn, { backgroundColor: '#64748b' }]}><Text style={s.mBtnT}>Vazgeç</Text></TouchableOpacity>
              <TouchableOpacity onPress={add} style={[s.mBtn, { backgroundColor: '#22c55e' }]}><Text style={s.mBtnT}>Ekle</Text></TouchableOpacity>
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
  b: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  bT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center' },
  mWrap: { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' },
  mBox: { backgroundColor: colors.bg.secondary, padding: spacing.lg, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: spacing.sm },
  mT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, fontSize: typography.sm },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#64748b' },
  chipT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  mBtn: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  mBtnT: { color: '#fff', fontWeight: '800' },
});
