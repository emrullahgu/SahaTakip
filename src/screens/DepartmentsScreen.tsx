// DepartmentsScreen — POZ-DEV-352
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { listDepartments, deleteDepartment } from '../services/governance';
import type { Department, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Departments'>;

export default function DepartmentsScreen() {
  const nav = useNavigation<Nav>();
  const [items, setItems] = useState<Department[]>([]);

  const load = useCallback(async () => { setItems(await listDepartments()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onDelete = (d: Department) => {
    Alert.alert('Sil', `"${d.name}" silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteDepartment(d.id); load(); } },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 80 }}
        ListEmptyComponent={<Text style={s.empty}>Henüz departman yok.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => nav.navigate('DepartmentForm', { departmentId: item.id })}>
            <View style={s.iconWrap}><Ionicons name="business-outline" size={22} color="#0ea5e9" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.t}>{item.name}</Text>
              {item.parentId ? <Text style={s.sub}>Üst: {item.parentId}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => onDelete(item)} hitSlop={10}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={() => nav.navigate('DepartmentForm')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0ea5e922', alignItems: 'center', justifyContent: 'center' },
  t: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center', elevation: 6 },
});
