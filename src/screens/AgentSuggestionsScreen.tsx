// screens/AgentSuggestionsScreen.tsx
// AI ajanın bulduğu sistem önerileri/tespitleri burada listelenir.
// Kullanıcı her birini "Uygulandı/Reddedildi" olarak işaretleyebilir veya silebilir.

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import { suggestionStore, type AgentSuggestion } from '../services/agent/suggestionStore';

const SEV_COLOR: Record<AgentSuggestion['severity'], string> = {
  low: '#22c55e',
  medium: '#fbbf24',
  high: '#f97316',
  critical: '#dc2626',
};

const STATUS_LABEL: Record<NonNullable<AgentSuggestion['status']>, string> = {
  new: 'Yeni',
  reviewing: 'İnceleniyor',
  applied: 'Uygulandı',
  dismissed: 'Reddedildi',
};

const AgentSuggestionsScreen: React.FC = () => {
  const [items, setItems] = useState<AgentSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setItems(await suggestionStore.list());
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const setStatus = useCallback(
    async (id: string, status: NonNullable<AgentSuggestion['status']>) => {
      await suggestionStore.update(id, { status });
      reload();
    },
    [reload],
  );

  const remove = useCallback(
    (id: string) => {
      const doDelete = async () => {
        await suggestionStore.remove(id);
        reload();
      };
      if (Platform.OS === 'web') {
        // eslint-disable-next-line no-alert
        if (window.confirm('Bu öneri silinsin mi?')) doDelete();
        return;
      }
      Alert.alert('Sil', 'Bu öneri silinsin mi?', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: doDelete },
      ]);
    },
    [reload],
  );

  const clearAll = useCallback(() => {
    const doClear = async () => {
      await suggestionStore.clear();
      reload();
    };
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm('Tüm öneriler silinsin mi?')) doClear();
      return;
    }
    Alert.alert('Tümünü sil', 'Tüm öneriler silinsin mi?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: doClear },
    ]);
  }, [reload]);

  return (
    <SafeAreaView style={st.root} edges={['top', 'left', 'right']}>
      <View style={st.header}>
        <Ionicons name="bulb" size={22} color={colors.emerald.default} />
        <Text style={st.title}>Sistem Önerileri</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={reload} style={st.iconBtn}>
          <Ionicons name="refresh" size={20} color={colors.text.primary} />
        </TouchableOpacity>
        {items.length > 0 ? (
          <TouchableOpacity onPress={clearAll} style={st.iconBtn}>
            <Ionicons name="trash" size={20} color="#dc2626" />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md }}
        ListEmptyComponent={
          <View style={st.empty}>
            <Ionicons name="sparkles-outline" size={32} color={colors.text.muted} />
            <Text style={st.emptyText}>
              {loading ? 'Yükleniyor...' : 'Henüz öneri yok. Ajan konsoluna gidip "Sistemi analiz et" deyin.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={st.card}>
            <View style={st.cardHeader}>
              <View style={[st.sevDot, { backgroundColor: SEV_COLOR[item.severity] }]} />
              <Text style={st.cardTitle}>{item.title}</Text>
            </View>
            <View style={st.meta}>
              <Text style={st.metaText}>{item.category}</Text>
              <Text style={st.metaDot}>·</Text>
              <Text style={st.metaText}>{item.severity}</Text>
              <Text style={st.metaDot}>·</Text>
              <Text style={st.metaText}>{STATUS_LABEL[item.status ?? 'new']}</Text>
              <Text style={st.metaDot}>·</Text>
              <Text style={st.metaText}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
            </View>
            <Text style={st.desc}>{item.description}</Text>
            {item.suggestedAction ? (
              <Text style={st.action}>→ {item.suggestedAction}</Text>
            ) : null}
            {item.evidence ? (
              <Text style={st.evidence}>{JSON.stringify(item.evidence).slice(0, 240)}</Text>
            ) : null}
            <View style={st.cardActions}>
              <TouchableOpacity
                style={[st.actBtn, st.actApply]}
                onPress={() => setStatus(item.id, 'applied')}
                disabled={item.status === 'applied'}
              >
                <Text style={st.actBtnText}>Uygulandı</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.actBtn, st.actDismiss]}
                onPress={() => setStatus(item.id, 'dismissed')}
                disabled={item.status === 'dismissed'}
              >
                <Text style={st.actBtnText}>Reddet</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.actBtn, st.actDel]} onPress={() => remove(item.id)}>
                <Ionicons name="trash-outline" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.primary,
  },
  title: { ...typography.h3, color: colors.text.primary },
  iconBtn: { padding: 6 },
  empty: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyText: { color: colors.text.muted, textAlign: 'center' },
  card: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sevDot: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: { color: colors.text.primary, fontWeight: '700', flex: 1, fontSize: typography.md },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  metaText: { color: colors.text.muted, fontSize: typography.xs },
  metaDot: { color: colors.text.faint, fontSize: typography.xs },
  desc: { color: colors.text.primary, marginTop: spacing.sm, fontSize: typography.sm, lineHeight: 18 },
  action: { color: colors.emerald.default, marginTop: 6, fontSize: typography.sm, fontWeight: '600' },
  evidence: {
    color: colors.text.faint,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    marginTop: 6,
    padding: 6,
    backgroundColor: colors.bg.primary,
    borderRadius: radius.sm,
  },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actApply: { backgroundColor: '#22c55e' },
  actDismiss: { backgroundColor: '#64748b' },
  actDel: { backgroundColor: '#dc2626', paddingHorizontal: 10 },
  actBtnText: { color: '#fff', fontWeight: '600', fontSize: typography.xs },
});

export default AgentSuggestionsScreen;
