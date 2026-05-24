// PortalUsersScreen — POZ-DEV-401
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, PortalUser } from '../types';
import { listPortalUsers, deletePortalUser, setPortalUserStatus, PORTAL_STATUS_LABEL, PORTAL_STATUS_COLOR } from '../services/customerExperience';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function PortalUsersScreen() {
  const navigation = useNavigation<Nav>();
  const [users, setUsers] = useState<PortalUser[]>([]);
  const load = useCallback(async () => { setUsers(await listPortalUsers()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleStatus = (u: PortalUser) => {
    Alert.alert('Durum', PORTAL_STATUS_LABEL[u.status], [
      { text: 'Aktif', onPress: async () => { await setPortalUserStatus(u.id, 'active'); load(); } },
      { text: 'Davet', onPress: async () => { await setPortalUserStatus(u.id, 'invited'); load(); } },
      { text: 'Askıya Al', onPress: async () => { await setPortalUserStatus(u.id, 'suspended'); load(); } },
      { text: 'İptal', style: 'cancel' },
    ]);
  };
  const remove = (id: string) => {
    Alert.alert('Silinsin mi?', 'Bu kullanıcı kalıcı silinecek.', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deletePortalUser(id); load(); } },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={users}
        keyExtractor={u => u.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 120 }}
        ListEmptyComponent={<Text style={s.empty}>Henüz portal kullanıcısı yok. + ile ekleyin.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('PortalUserForm', { userId: item.id })} onLongPress={() => remove(item.id)}>
            <View style={[s.dot, { backgroundColor: PORTAL_STATUS_COLOR[item.status] }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.fullName}</Text>
              <Text style={s.sub}>{item.email}{item.phone ? ` · ${item.phone}` : ''}</Text>
              <View style={s.tags}>
                <TouchableOpacity onPress={() => toggleStatus(item)}>
                  <Text style={[s.tag, { backgroundColor: PORTAL_STATUS_COLOR[item.status] + '33', color: PORTAL_STATUS_COLOR[item.status] }]}>{PORTAL_STATUS_LABEL[item.status]}</Text>
                </TouchableOpacity>
                {item.canApproveQuotes && <Text style={[s.tag, { backgroundColor: '#22c55e22', color: '#22c55e' }]}>Onay Yetkisi</Text>}
                {item.canViewReports && <Text style={[s.tag, { backgroundColor: '#a855f722', color: '#a855f7' }]}>Rapor</Text>}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('PortalUserForm')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: spacing.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tag: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 80 },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center', elevation: 4 },
});
