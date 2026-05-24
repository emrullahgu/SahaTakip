// FieldFavoritesScreen — POZ-DEV-385
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listFavorites, deleteFavorite, resetFavorites } from '../services/offline';
import type { OfflineFavorite } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';

export default function FieldFavoritesScreen() {
  const nav = useNavigation<any>();
  const [items, setItems] = useState<OfflineFavorite[]>([]);

  const load = useCallback(async () => { setItems(await listFavorites()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const doDelete = (f: OfflineFavorite) => {
    Alert.alert('Sil', `"${f.label}" favorilerden silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteFavorite(f.id); load(); } },
    ]);
  };

  const doReset = () => {
    Alert.alert('Sıfırla', 'Varsayılan favorilere dönülsün mü?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sıfırla', onPress: async () => { await resetFavorites(); load(); } },
    ]);
  };

  const launch = (f: OfflineFavorite) => {
    try { nav.navigate(f.route as never, f.params as never); }
    catch { Alert.alert('Hata', `"${f.route}" ekranı bulunamadı.`); }
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.toolbar}>
        <Text style={s.toolbarT}>{items.length} favori</Text>
        <TouchableOpacity style={s.btn} onPress={doReset}>
          <Ionicons name="refresh-outline" size={14} color="#fff" />
          <Text style={s.btnTxt}>Varsayılan</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items}
        keyExtractor={i => i.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.sm }}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 80 }}
        ListEmptyComponent={
          <EmptyState
            icon="star-outline"
            title="Henüz favori yok"
            subtitle="Sık kullandığınız ekranları buraya ekleyebilirsiniz."
            actionLabel="Varsayılanları Yükle"
            onAction={doReset}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.card, { borderLeftColor: item.color }]} onPress={() => launch(item)} onLongPress={() => doDelete(item)}>
            <View style={[s.iconWrap, { backgroundColor: item.color + '22' }]}>
              <Ionicons name={item.icon as never} size={28} color={item.color} />
            </View>
            <Text style={s.t}>{item.label}</Text>
            <Text style={s.sub}>{item.route}</Text>
          </TouchableOpacity>
        )}
      />
      <Text style={s.hint}>Uzun bas = sil</Text>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  toolbarT: { color: colors.text.muted, fontSize: typography.sm },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#8b5cf6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full },
  btnTxt: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { flex: 1, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, alignItems: 'center', gap: 6 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  t: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', textAlign: 'center' },
  sub: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  hint: { color: colors.text.faint, fontSize: typography.xs, textAlign: 'center', paddingBottom: spacing.md },
});
