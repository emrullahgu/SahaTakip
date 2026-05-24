// RegionsScreen — POZ-DEV-354
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { listRegions, deleteRegion } from '../services/governance';
import type { Region, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Regions'>;

export default function RegionsScreen() {
  const nav = useNavigation<Nav>();
  const [items, setItems] = useState<Region[]>([]);

  const load = useCallback(async () => { setItems(await listRegions()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onDelete = (r: Region) => {
    Alert.alert('Sil', `"${r.name}" silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteRegion(r.id); load(); } },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 80 }}
        ListEmptyComponent={<Text style={s.empty}>Henüz bölge yok.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => nav.navigate('RegionForm', { regionId: item.id })}>
            <View style={s.iconWrap}><Ionicons name="map-outline" size={22} color="#06b6d4" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.t}>{item.name}</Text>
              <Text style={s.sub}>{item.code ? `Kod: ${item.code} · ` : ''}{(item.cities || []).length} şehir</Text>
            </View>
            <TouchableOpacity onPress={() => onDelete(item)} hitSlop={10}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={() => nav.navigate('RegionForm')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#06b6d422', alignItems: 'center', justifyContent: 'center' },
  t: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#06b6d4', alignItems: 'center', justifyContent: 'center', elevation: 6 },
});
