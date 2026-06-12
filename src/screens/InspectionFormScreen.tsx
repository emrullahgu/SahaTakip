// InspectionFormScreen — POZ-DEV-087 (denetim) + POZ-DEV-088 (kalite puanlama)
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAppContext } from '../context/AppContext';
import { getAsset } from '../services/assets';
import {
  createInspection, createNonconformity, getInspection, updateInspection,
  buildItemsFromTemplate, computeScore,
  INSPECTION_TEMPLATES, INSPECTION_TYPE_LABEL,
} from '../services/inspections';
import {
  Inspection, InspectionItem, InspectionItemStatus, InspectionType,
  NonconformitySeverity, RootStackParamList,
} from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'InspectionForm'>;
type RP = RouteProp<RootStackParamList, 'InspectionForm'>;

const TYPES: InspectionType[] = ['audit', 'safety', 'quality', 'commissioning', 'periodic'];

export default function InspectionFormScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RP>();
  const { customers, employees } = useAppContext();
  const inspectionId = route.params?.inspectionId;
  const initialAssetId = route.params?.assetId;

  const [editing, setEditing] = useState<Inspection | null>(null);
  const [type, setType] = useState<InspectionType>(route.params?.type || 'audit');
  const [title, setTitle] = useState(INSPECTION_TEMPLATES[route.params?.type || 'audit'].title);
  const [items, setItems] = useState<InspectionItem[]>(buildItemsFromTemplate(route.params?.type || 'audit'));
  const [assetId, setAssetId] = useState<string | undefined>(initialAssetId);
  const [assetName, setAssetName] = useState<string>('');
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [inspectorId, setInspectorId] = useState<string | undefined>();
  const [notes, setNotes] = useState('');

  useEffect(() => {
    (async () => {
      if (inspectionId) {
        const ins = await getInspection(inspectionId);
        if (ins) {
          setEditing(ins);
          setType(ins.type);
          setTitle(ins.title);
          setItems(ins.items);
          setAssetId(ins.assetId);
          setAssetName(ins.assetName || '');
          setCustomerId(ins.customerId);
          setInspectorId(ins.inspectorId);
          setNotes(ins.notes || '');
        }
      } else if (initialAssetId) {
        const a = await getAsset(initialAssetId);
        if (a) {
          setAssetName(a.name);
          if (a.customerId) setCustomerId(a.customerId);
        }
      }
    })();
  }, [inspectionId, initialAssetId]);

  const onTypeChange = (t: InspectionType) => {
    setType(t);
    if (!inspectionId) {
      setTitle(INSPECTION_TEMPLATES[t].title);
      setItems(buildItemsFromTemplate(t));
    }
  };

  const cycle = (i: InspectionItem): InspectionItemStatus => {
    if (i.status === 'ok') return 'fail';
    if (i.status === 'fail') return 'na';
    return 'ok';
  };

  const updateItem = (id: string, patch: Partial<InspectionItem>) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)));
  };

  const score = computeScore(items);

  const onSave = async (status: 'draft' | 'completed') => {
    const customer = customers.find(c => c.id === customerId);
    const inspector = employees.find(e => e.id === inspectorId);
    const payload = {
      type,
      title: title.trim() || INSPECTION_TEMPLATES[type].title,
      items,
      assetId,
      assetName: assetName || undefined,
      customerId,
      customerName: customer ? (customer.title || customer.shortName) : undefined,
      inspectorId,
      inspectorName: inspector?.name,
      date: new Date().toISOString(),
      status,
      notes: notes.trim() || undefined,
    } as Omit<Inspection, 'id' | 'createdAt' | 'score'>;

    let saved: Inspection;
    if (editing) {
      const upd = await updateInspection(editing.id, { ...payload });
      if (!upd) return;
      saved = upd;
    } else {
      saved = await createInspection(payload);
    }

    // Failures → otomatik uygunsuzluk
    if (status === 'completed') {
      const failures = items.filter(it => it.status === 'fail');
      for (const f of failures) {
        const sev: NonconformitySeverity =
          type === 'safety' ? 'high' :
          type === 'commissioning' ? 'high' : 'medium';
        await createNonconformity({
          inspectionId: saved.id,
          assetId,
          customerId,
          customerName: customer ? (customer.title || customer.shortName) : undefined,
          description: f.question + (f.note ? ' — ' + f.note : ''),
          severity: sev,
        });
      }
      Alert.alert(
        'Denetim Tamamlandı',
        `Skor: ${saved.score}/100\nOluşan uygunsuzluk: ${failures.length}`,
        [{ text: 'Tamam', onPress: () => nav.goBack() }],
      );
    } else {
      nav.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Anlık Skor</Text>
          <Text style={[styles.scoreValue, { color: score >= 80 ? brand.green : score >= 60 ? '#f59e0b' : colors.rose.default }]}>
            {score}/100
          </Text>
        </View>

        <Text style={styles.label}>Tip</Text>
        <View style={styles.grid}>
          {TYPES.map(t => {
            const active = t === type;
            return (
              <TouchableOpacity key={t} style={[styles.btn, active && styles.btnActive]} onPress={() => onTypeChange(t)}>
                <Text style={[styles.btnText, active && styles.btnTextActive]}>{INSPECTION_TYPE_LABEL[t]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Başlık</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor={colors.text.faint} />

        {assetName ? (
          <View style={styles.assetBadge}>
            <Ionicons name="cube-outline" size={14} color={brand.green} />
            <Text style={styles.assetText}>{assetName}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Müşteri</Text>
        <View style={styles.grid}>
          <TouchableOpacity style={[styles.btn, !customerId && styles.btnActive]} onPress={() => setCustomerId(undefined)}>
            <Text style={[styles.btnText, !customerId && styles.btnTextActive]}>—</Text>
          </TouchableOpacity>
          {customers.map(c => {
            const active = c.id === customerId;
            return (
              <TouchableOpacity key={c.id} style={[styles.btn, active && styles.btnActive]} onPress={() => setCustomerId(c.id)}>
                <Text style={[styles.btnText, active && styles.btnTextActive]}>{c.shortName}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Denetçi</Text>
        <View style={styles.grid}>
          {employees.map(e => {
            const active = e.id === inspectorId;
            return (
              <TouchableOpacity key={e.id} style={[styles.btn, active && styles.btnActive]} onPress={() => setInspectorId(e.id)}>
                <Text style={[styles.btnText, active && styles.btnTextActive]}>{e.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Kontrol Listesi</Text>
        {items.map((it, idx) => {
          const c = it.status === 'ok' ? brand.green : it.status === 'fail' ? colors.rose.default : colors.text.faint;
          const icon = it.status === 'ok' ? 'checkmark-circle' : it.status === 'fail' ? 'close-circle' : 'remove-circle-outline';
          const lbl = it.status === 'ok' ? 'OK' : it.status === 'fail' ? 'UYGUNSUZ' : 'YOK';
          return (
            <View key={it.id} style={styles.itemRow}>
              <TouchableOpacity
                style={[styles.statusBtn, { backgroundColor: c + '22', borderColor: c }]}
                onPress={() => updateItem(it.id, { status: cycle(it) })}
              >
                <Ionicons name={icon as any} size={16} color={c} />
                <Text style={[styles.statusLbl, { color: c }]}>{lbl}</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemQ}>{idx + 1}. {it.question}</Text>
                {it.status === 'fail' && (
                  <TextInput
                    style={[styles.input, { marginTop: 4 }]}
                    value={it.note || ''}
                    onChangeText={t => updateItem(it.id, { note: t })}
                    placeholder="Uygunsuzluk notu"
                    placeholderTextColor={colors.text.faint}
                  />
                )}
              </View>
            </View>
          );
        })}

        <Text style={styles.label}>Genel Notlar</Text>
        <TextInput
          style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
          multiline value={notes} onChangeText={setNotes} placeholderTextColor={colors.text.faint}
        />

        <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.lg }}>
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary }]} onPress={() => onSave('draft')}>
            <Ionicons name="save-outline" size={16} color={colors.text.primary} />
            <Text style={[styles.saveText, { color: colors.text.primary }]}>Taslak</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={() => onSave('completed')}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
            <Text style={styles.saveText}>Tamamla</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Tamamlandığında uygun olmayan maddeler otomatik uygunsuzluk olarak kaydedilir.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  scoreCard: {
    backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary,
    borderRadius: radius.md, padding: spacing.lg, alignItems: 'center',
  },
  scoreLabel: { color: colors.text.muted, fontSize: typography.xs },
  scoreValue: { fontSize: typography.xxl, fontWeight: '800', marginTop: 4 },
  label: { color: colors.text.muted, fontSize: typography.xs, marginTop: spacing.sm, marginBottom: 4 },
  input: {
    backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary,
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10,
    color: colors.text.primary, fontSize: typography.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  btn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary,
  },
  btnActive: { backgroundColor: brand.blueLight, borderColor: brand.blueLight },
  btnText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  btnTextActive: { color: '#fff' },
  assetBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.emerald.bg, borderWidth: 1, borderColor: colors.emerald.border,
    borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6, marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  assetText: { color: brand.green, fontSize: typography.xs, fontWeight: '700' },
  itemRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'flex-start' },
  statusBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: radius.md, borderWidth: 1, minWidth: 88,
  },
  statusLbl: { fontSize: 10, fontWeight: '800' },
  itemQ: { color: colors.text.primary, fontSize: typography.sm },
  saveBtn: {
    flex: 1, flexDirection: 'row', backgroundColor: brand.green, paddingVertical: 12,
    borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  saveText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  hint: { color: colors.text.faint, fontSize: 11, marginTop: spacing.sm, textAlign: 'center' },
});
