// FormTemplatesScreen — POZ-DEV-049, 050, 051
// Mevcut tüm form şablonlarını listeler; admin yeni oluşturabilir / düzenleyebilir / silebilir.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  listTemplates,
  deleteTemplate,
  ensureSeeded,
} from '../services/formTemplates';
import { FormTemplate, FormTemplateCategory, RootStackParamList } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FormTemplates'>;

const CATEGORIES: (FormTemplateCategory | 'Tümü')[] = [
  'Tümü',
  'Denetim',
  'Bakım',
  'Arıza Tespit',
  'Montaj',
  'Teslimat',
  'Diğer',
];

const CAT_ICON: Record<FormTemplateCategory, keyof typeof Ionicons.glyphMap> = {
  Denetim: 'shield-checkmark-outline',
  Bakım: 'construct-outline',
  'Arıza Tespit': 'warning-outline',
  Montaj: 'hammer-outline',
  Teslimat: 'cube-outline',
  Diğer: 'document-text-outline',
};

export default function FormTemplatesScreen() {
  const navigation = useNavigation<Nav>();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [filter, setFilter] = useState<(typeof CATEGORIES)[number]>('Tümü');

  const load = useCallback(async () => {
    await ensureSeeded();
    const list = await listTemplates();
    setTemplates(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered =
    filter === 'Tümü' ? templates : templates.filter(t => t.category === filter);

  const onDelete = (tpl: FormTemplate) => {
    Alert.alert(
      'Şablonu Sil',
      `"${tpl.name}" şablonu silinsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await deleteTemplate(tpl.id);
            load();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.toolbar}>
        <Text style={styles.title}>Form Şablonları ({templates.length})</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => navigation.navigate('FormBuilder')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.newBtnText}>Yeni</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {CATEGORIES.map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, filter === c && styles.chipActive]}
            onPress={() => setFilter(c)}
          >
            <Text style={[styles.chipText, filter === c && styles.chipTextActive]}>
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={t => t.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="Henüz şablon yok"
            subtitle="Bu kategoriye uygun form şablonu bulunamadı."
            actionLabel="+ Yeni Şablon"
            onAction={() => navigation.navigate('FormBuilder')}
          />
        }
        renderItem={({ item: t }) => (
          <TouchableOpacity
            key={t.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('FormBuilder', { templateId: t.id })}
          >
            <View style={styles.cardHead}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: colors.indigo.bg, borderColor: colors.indigo.border },
                ]}
              >
                <Ionicons
                  name={CAT_ICON[t.category] ?? 'document-text-outline'}
                  size={18}
                  color={brand.blueLight}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{t.name || '(adsız şablon)'}</Text>
                <Text style={styles.cardMeta}>
                  {t.category} · {t.fields.length} alan
                  {t.isSeed ? ' · Hazır' : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onDelete(t)}
                style={styles.delBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={18} color={colors.rose.default} />
              </TouchableOpacity>
            </View>
            {t.description ? <Text style={styles.cardDesc}>{t.description}</Text> : null}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: brand.green,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  filterRow: {
    paddingHorizontal: spacing.lg,
    gap: 8,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.bg.secondary,
  },
  chipActive: { backgroundColor: brand.green, borderColor: brand.green },
  chipText: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  listContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: 80 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.muted, fontSize: typography.sm },
  card: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 6,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  cardMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  cardDesc: { color: colors.text.secondary, fontSize: typography.xs },
  delBtn: { padding: 6 },
});
