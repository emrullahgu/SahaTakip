// FormResponsesScreen — POZ-DEV-150 Tüm form yanıtları (filtre: şablon/iş emri)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, FormResponse, FormTemplate } from '../types';
import { listResponses } from '../services/formResponses';
import { listTemplates } from '../services/formTemplates';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteP = RouteProp<RootStackParamList, 'FormResponses'>;

export default function FormResponsesScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RouteP>();
  const filterTemplateId = route.params?.templateId;
  const filterWorkOrderId = route.params?.workOrderId;

  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [resps, tpls] = await Promise.all([listResponses(), listTemplates()]);
      setResponses(resps);
      setTemplates(tpls);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tplCategory = (templateId: string): string => {
    return templates.find(t => t.id === templateId)?.category || 'Diğer';
  };

  const filtered = useMemo(() => {
    let list = [...responses];
    if (filterTemplateId) list = list.filter(r => r.templateId === filterTemplateId);
    if (filterWorkOrderId) list = list.filter(r => r.workOrderId === filterWorkOrderId);
    if (search.trim()) {
      const q = search.toLocaleLowerCase('tr-TR');
      list = list.filter(r =>
        r.templateName.toLocaleLowerCase('tr-TR').includes(q) ||
        (r.filledBy || '').toLocaleLowerCase('tr-TR').includes(q) ||
        (r.workOrderId || '').toLocaleLowerCase('tr-TR').includes(q)
      );
    }
    list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return list;
  }, [responses, filterTemplateId, filterWorkOrderId, search]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color="#22c55e" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.text.muted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Şablon / kullanıcı / iş emri ara..."
          placeholderTextColor={colors.text.faint}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.text.faint} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={r => r.id}
        renderItem={({ item }) => {
          const cat = tplCategory(item.templateId);
          const cColor = categoryColor(cat);
          return (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.85}
              onPress={() => nav.navigate('FormResponseDetail', { responseId: item.id })}
            >
              <View style={[styles.catBadge, { backgroundColor: cColor }]}>
                <Text style={styles.catText}>{cat.slice(0, 1)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{item.templateName}</Text>
                <Text style={styles.meta}>
                  {cat} · v{item.revision} · {new Date(item.updatedAt).toLocaleDateString('tr-TR')}
                </Text>
                {(item.filledBy || item.workOrderId) ? (
                  <Text style={styles.metaSub} numberOfLines={1}>
                    {item.filledBy ? `👤 ${item.filledBy}` : ''}
                    {item.workOrderId ? ` · 🛠 ${item.workOrderId.slice(0, 8)}` : ''}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons name="list-outline" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Form Yanıtları</Text>
              <Text style={styles.heroSub}>
                {filtered.length} kayıt {filterTemplateId ? '· şablon filtreli' : ''}{filterWorkOrderId ? '· iş emri filtreli' : ''}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={42} color={colors.text.faint} />
            <Text style={styles.emptyText}>Form yanıtı yok</Text>
            <Text style={styles.emptySub}>Bir form doldurulduğunda burada görünür.</Text>
          </View>
        }
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.text.muted} />}
      />
    </SafeAreaView>
  );
}

function categoryColor(cat: string): string {
  switch (cat) {
    case 'Denetim': return '#0ea5e9';
    case 'Bakım': return '#22c55e';
    case 'Arıza Tespit': return '#ef4444';
    case 'Montaj': return '#8b5cf6';
    case 'Teslimat': return '#f59e0b';
    default: return '#64748b';
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.xs },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#22c55e', borderRadius: radius.md, marginBottom: spacing.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.bg.secondary, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: typography.sm, paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, marginBottom: spacing.xs },
  catBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  catText: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  name: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  metaSub: { color: colors.text.faint, fontSize: 11, marginTop: 2 },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyText: { color: colors.text.muted, fontWeight: '700', fontSize: typography.sm },
  emptySub: { color: colors.text.faint, fontSize: typography.xs, textAlign: 'center' },
});
