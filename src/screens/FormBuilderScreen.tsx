// FormBuilderScreen — POZ-DEV-050
// Şablon meta + alan ekle/sil/sırala/düzenle.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  getTemplate,
  upsertTemplate,
  newEmptyTemplate,
  newField,
} from '../services/formTemplates';
import {
  FormTemplate,
  FormField,
  FormFieldType,
  FormTemplateCategory,
  RootStackParamList,
} from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FormBuilder'>;
type Rt = RouteProp<RootStackParamList, 'FormBuilder'>;

const FIELD_TYPES: { type: FormFieldType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'text', label: 'Metin', icon: 'text-outline' },
  { type: 'number', label: 'Sayı', icon: 'calculator-outline' },
  { type: 'date', label: 'Tarih', icon: 'calendar-outline' },
  { type: 'select', label: 'Seçim', icon: 'list-outline' },
  { type: 'multiselect', label: 'Çoklu Seçim', icon: 'checkbox-outline' },
  { type: 'checkbox', label: 'Onay', icon: 'checkmark-circle-outline' },
  { type: 'photo', label: 'Fotoğraf', icon: 'image-outline' },
  { type: 'signature', label: 'İmza', icon: 'create-outline' },
  { type: 'rating', label: 'Puan', icon: 'star-outline' },
  { type: 'note', label: 'Not', icon: 'document-text-outline' },
];

const CATEGORIES: FormTemplateCategory[] = [
  'Denetim',
  'Bakım',
  'Arıza Tespit',
  'Montaj',
  'Teslimat',
  'Diğer',
];

export default function FormBuilderScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const editingId = route.params?.templateId;
  const isEdit = !!editingId;

  const [tpl, setTpl] = useState<FormTemplate>(newEmptyTemplate());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      if (isEdit && editingId) {
        const t = await getTemplate(editingId);
        if (t) setTpl(t);
      }
      setLoaded(true);
    })();
  }, [isEdit, editingId]);

  const update = <K extends keyof FormTemplate>(k: K, v: FormTemplate[K]) =>
    setTpl(prev => ({ ...prev, [k]: v }));

  const addField = (type: FormFieldType) => {
    setTpl(prev => ({ ...prev, fields: [...prev.fields, newField(type)] }));
  };

  const updateField = (id: string, patch: Partial<FormField>) => {
    setTpl(prev => ({
      ...prev,
      fields: prev.fields.map(f => (f.id === id ? { ...f, ...patch } : f)),
    }));
  };

  const removeField = (id: string) => {
    setTpl(prev => ({ ...prev, fields: prev.fields.filter(f => f.id !== id) }));
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    setTpl(prev => {
      const next = [...prev.fields];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      const tmp = next[idx];
      next[idx] = next[j];
      next[j] = tmp;
      return { ...prev, fields: next };
    });
  };

  const save = async () => {
    if (!tpl.name.trim()) {
      Alert.alert('Eksik', 'Şablon adı girin.');
      return;
    }
    if (tpl.fields.length === 0) {
      Alert.alert('Eksik', 'En az bir alan ekleyin.');
      return;
    }
    if (tpl.fields.some(f => !f.label.trim())) {
      Alert.alert('Eksik', 'Tüm alanların etiketi olmalı.');
      return;
    }
    await upsertTemplate(tpl);
    Alert.alert('Kaydedildi', 'Şablon kaydedildi.', [
      { text: 'Tamam', onPress: () => navigation.goBack() },
    ]);
  };

  if (!loaded) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loading}>Yükleniyor…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>Şablon Adı *</Text>
          <TextInput
            value={tpl.name}
            onChangeText={t => update('name', t)}
            style={styles.input}
            placeholder="Örn: Aylık Bakım Formu"
            placeholderTextColor={colors.text.faint}
          />

          <Text style={styles.label}>Kategori</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, tpl.category === c && styles.chipActive]}
                onPress={() => update('category', c)}
              >
                <Text
                  style={[styles.chipText, tpl.category === c && styles.chipTextActive]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Açıklama</Text>
          <TextInput
            value={tpl.description ?? ''}
            onChangeText={t => update('description', t)}
            style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
            placeholder="Kısa açıklama"
            placeholderTextColor={colors.text.faint}
            multiline
          />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Alanlar ({tpl.fields.length})</Text>
          </View>

          {tpl.fields.map((f, idx) => (
            <FieldEditor
              key={f.id}
              field={f}
              index={idx}
              total={tpl.fields.length}
              onChange={patch => updateField(f.id, patch)}
              onRemove={() => removeField(f.id)}
              onMove={dir => moveField(idx, dir)}
            />
          ))}

          <Text style={styles.label}>Yeni alan ekle</Text>
          <View style={styles.addGrid}>
            {FIELD_TYPES.map(ft => (
              <TouchableOpacity
                key={ft.type}
                style={styles.addBtn}
                onPress={() => addField(ft.type)}
                activeOpacity={0.85}
              >
                <Ionicons name={ft.icon} size={16} color={brand.green} />
                <Text style={styles.addBtnText}>{ft.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.85}>
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>
              {isEdit ? 'Güncelle' : 'Şablonu Kaydet'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldEditor({
  field,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  field: FormField;
  index: number;
  total: number;
  onChange: (patch: Partial<FormField>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const meta = FIELD_TYPES.find(ft => ft.type === field.type);
  const hasOptions = field.type === 'select' || field.type === 'multiselect';
  return (
    <View style={styles.fieldCard}>
      <View style={styles.fieldHead}>
        <Ionicons
          name={meta?.icon ?? 'help-outline'}
          size={16}
          color={colors.text.muted}
        />
        <Text style={styles.fieldType}>{meta?.label ?? field.type}</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => onMove(-1)}
          disabled={index === 0}
          style={[styles.iconBtn, index === 0 && { opacity: 0.3 }]}
        >
          <Ionicons name="arrow-up" size={14} color={colors.text.secondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onMove(1)}
          disabled={index === total - 1}
          style={[styles.iconBtn, index === total - 1 && { opacity: 0.3 }]}
        >
          <Ionicons name="arrow-down" size={14} color={colors.text.secondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onRemove} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={14} color={colors.rose.default} />
        </TouchableOpacity>
      </View>

      <TextInput
        value={field.label}
        onChangeText={t => onChange({ label: t })}
        style={styles.input}
        placeholder="Etiket *"
        placeholderTextColor={colors.text.faint}
      />

      <View style={styles.reqRow}>
        <TouchableOpacity
          style={[styles.reqBtn, field.required && styles.reqBtnActive]}
          onPress={() => onChange({ required: !field.required })}
        >
          <Ionicons
            name={field.required ? 'checkbox' : 'square-outline'}
            size={14}
            color={field.required ? brand.green : colors.text.muted}
          />
          <Text style={styles.reqText}>Zorunlu</Text>
        </TouchableOpacity>
      </View>

      {hasOptions && (
        <TextInput
          value={(field.options ?? []).join(', ')}
          onChangeText={t =>
            onChange({
              options: t
                .split(',')
                .map(s => s.trim())
                .filter(Boolean),
            })
          }
          style={styles.input}
          placeholder="Seçenekler (virgülle ayır)"
          placeholderTextColor={colors.text.faint}
        />
      )}

      <TextInput
        value={field.helpText ?? ''}
        onChangeText={t => onChange({ helpText: t })}
        style={styles.input}
        placeholder="Yardım metni (opsiyonel)"
        placeholderTextColor={colors.text.faint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  loading: { color: colors.text.muted, padding: spacing.lg },
  content: { padding: spacing.lg, paddingBottom: 100, gap: spacing.sm },
  label: {
    color: colors.text.muted,
    fontSize: typography.xs,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.bg.secondary,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: typography.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
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
  sectionHeader: { marginTop: spacing.lg },
  sectionTitle: {
    color: colors.text.primary,
    fontWeight: '800',
    fontSize: typography.sm,
    marginBottom: spacing.sm,
  },
  fieldCard: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 8,
    marginBottom: spacing.sm,
  },
  fieldHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldType: { color: colors.text.secondary, fontSize: typography.xs, fontWeight: '700' },
  iconBtn: { padding: 6 },
  reqRow: { flexDirection: 'row' },
  reqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  reqBtnActive: { borderColor: brand.green, backgroundColor: colors.emerald.bg },
  reqText: { color: colors.text.secondary, fontSize: typography.xs, fontWeight: '700' },
  addGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: brand.green,
    backgroundColor: colors.emerald.bg,
  },
  addBtnText: { color: brand.green, fontSize: typography.xs, fontWeight: '800' },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: brand.green,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.lg,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
});
