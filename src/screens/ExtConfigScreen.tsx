// Faz 57 — ExtConfigScreen (POZ-DEV-274)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { getExtIntegration, EXT_STATUS_COLOR, EXT_STATUS_LABEL, EXT_STATUS_ICON } from '../services/extensions';
import type { ExtIntegration, ExtField, RootStackParamList } from '../types';

type R = RouteProp<RootStackParamList, 'ExtConfig'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'ExtConfig'>;

export default function ExtConfigScreen() {
  const { params } = useRoute<R>();
  const nav = useNavigation<Nav>();
  const [it, setIt] = useState<ExtIntegration | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});

  useFocusEffect(useCallback(() => {
    (async () => {
      const i = await getExtIntegration(params.id);
      setIt(i ?? null);
      if (i) {
        const initial: Record<string, string | boolean> = {};
        i.fields.forEach(f => { initial[f.key] = f.kind === 'toggle' ? false : ''; });
        setValues(initial);
      }
    })();
  }, [params.id]));

  const set = (k: string, v: string | boolean) => setValues(prev => ({ ...prev, [k]: v }));

  if (!it) return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.empty}><Ionicons name="alert-circle" size={48} color={colors.text.muted} /><Text style={s.emptyT}>Entegrasyon bulunamadı</Text></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.hero, { borderColor: it.color }]}>
          <View style={[s.iconBig, { backgroundColor: it.color + '22' }]}>
            <Ionicons name={it.icon as any} size={36} color={it.color} />
          </View>
          <Text style={s.heroT}>{it.name}</Text>
          <View style={[s.statusPill, { borderColor: EXT_STATUS_COLOR[it.status] }]}>
            <Ionicons name={EXT_STATUS_ICON[it.status] as any} size={14} color={EXT_STATUS_COLOR[it.status]} />
            <Text style={[s.statusT, { color: EXT_STATUS_COLOR[it.status] }]}>{EXT_STATUS_LABEL[it.status]}</Text>
          </View>
          <Text style={s.heroD}>{it.description}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionT}>Faydalar</Text>
          {it.benefits.map((b, i) => (
            <View key={i} style={s.benefitRow}>
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
              <Text style={s.benefitT}>{b}</Text>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.sectionT}>Yapılandırma</Text>
          {it.fields.map(f => (
            <FieldRow key={f.key} field={f} value={values[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
        </View>

        <View style={s.actions}>
          <TouchableOpacity style={[s.btn, { backgroundColor: it.color }]} activeOpacity={0.85} onPress={() => Alert.alert('Test', `${it.name} bağlantı testi sahte ortamda başarılı.`)}>
            <Ionicons name="flash" size={18} color="#fff" />
            <Text style={s.btnT}>Bağlantıyı Test Et</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#22c55e' }]} activeOpacity={0.85} onPress={() => Alert.alert('Kaydedildi', `${it.name} ayarları kaydedildi (demo).`)}>
            <Ionicons name="save" size={18} color="#fff" />
            <Text style={s.btnT}>Kaydet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#3b82f6' }]} activeOpacity={0.85} onPress={() => nav.navigate('ExtLogs', { id: it.id })}>
            <Ionicons name="list" size={18} color="#fff" />
            <Text style={s.btnT}>Logları Gör</Text>
          </TouchableOpacity>
        </View>

        {it.docUrl && (
          <View style={s.docBox}>
            <Ionicons name="information-circle" size={16} color={colors.text.muted} />
            <Text style={s.docT}>Dokümantasyon: {it.docUrl}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FieldRow({ field, value, onChange }: { field: ExtField; value: string | boolean | undefined; onChange: (v: string | boolean) => void }) {
  if (field.kind === 'toggle') {
    return (
      <View style={s.fieldRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.fieldL}>{field.label}</Text>
          {field.description && <Text style={s.fieldHint}>{field.description}</Text>}
        </View>
        <Switch value={Boolean(value)} onValueChange={onChange} />
      </View>
    );
  }
  if (field.kind === 'select') {
    return (
      <View style={s.field}>
        <Text style={s.fieldL}>{field.label}</Text>
        <View style={s.optionsRow}>
          {field.options?.map(opt => {
            const active = value === opt;
            return (
              <TouchableOpacity key={opt} style={[s.optBtn, active && s.optBtnActive]} onPress={() => onChange(opt)} activeOpacity={0.8}>
                <Text style={[s.optT, active && s.optTActive]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {field.description && <Text style={s.fieldHint}>{field.description}</Text>}
      </View>
    );
  }
  return (
    <View style={s.field}>
      <Text style={s.fieldL}>{field.label}</Text>
      <TextInput
        style={s.input}
        value={typeof value === 'string' ? value : ''}
        onChangeText={onChange}
        placeholder={field.placeholder}
        placeholderTextColor={colors.text.muted}
        secureTextEntry={field.kind === 'password'}
        keyboardType={field.kind === 'number' ? 'numeric' : field.kind === 'url' ? 'url' : 'default'}
        autoCapitalize="none"
      />
      {field.description && <Text style={s.fieldHint}>{field.description}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.md },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  emptyT: { color: colors.text.muted, fontSize: typography.sm },
  hero: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', gap: spacing.sm },
  iconBig: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800', textAlign: 'center' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  statusT: { fontSize: typography.xs, fontWeight: '700' },
  section: { gap: spacing.sm, backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  sectionT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginBottom: 4 },
  benefitRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  benefitT: { color: colors.text.primary, fontSize: typography.xs, flex: 1 },
  field: { gap: 6 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fieldL: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  fieldHint: { color: colors.text.muted, fontSize: typography.xs, fontStyle: 'italic' },
  input: { backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 8, color: colors.text.primary, fontSize: typography.sm },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  optBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.primary },
  optBtnActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  optT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '600' },
  optTActive: { color: '#fff' },
  actions: { gap: spacing.sm },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: spacing.sm, borderRadius: radius.sm },
  btnT: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  docBox: { flexDirection: 'row', gap: 6, alignItems: 'center', padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  docT: { color: colors.text.muted, fontSize: typography.xs, flex: 1 },
});
