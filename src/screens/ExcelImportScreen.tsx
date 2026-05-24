// ExcelImportScreen — POZ-DEV-103 CSV/TSV içe aktarma
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import { IMPORT_FIELDS, listImportHistory, parseCsvOrTsv, saveImportResult, validateImport } from '../services/integrations';
import { ImportResult, ImportType } from '../types';

const TYPE_LABEL: Record<ImportType, string> = {
  customers: 'Müşteriler',
  poz: 'POZ Kataloğu',
  employees: 'Personel',
};
const TYPE_ICON: Record<ImportType, keyof typeof import('@expo/vector-icons/build/Ionicons').default.glyphMap> = {
  customers: 'business-outline',
  poz: 'list-outline',
  employees: 'people-outline',
};
const TYPES: ImportType[] = ['customers', 'poz', 'employees'];

function fmt(iso: string): string { try { return new Date(iso).toLocaleString('tr-TR'); } catch { return iso; } }

export default function ExcelImportScreen() {
  const [type, setType] = useState<ImportType>('customers');
  const [text, setText] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [history, setHistory] = useState<ImportResult[]>([]);

  const refresh = useCallback(async () => { setHistory(await listImportHistory()); }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const fields = useMemo(() => IMPORT_FIELDS[type], [type]);

  const sample = useMemo(() => {
    const headers = fields.map(f => f.label).join('\t');
    const rows: Record<ImportType, string[]> = {
      customers: ['ACME Ltd\tACME Limited\t1234567890\t02161234567\tinfo@acme.tr\tİstanbul'],
      poz: ['EL.001\tKablo çekimi\tm\t45.50'],
      employees: ['Ali Yılmaz\tElektrik teknisyeni\t35000\t1500'],
    };
    return headers + '\n' + rows[type].join('\n');
  }, [fields, type]);

  const onValidate = async () => {
    if (text.trim().length === 0) { Alert.alert('Eksik', 'İçeri aktarılacak veri girin.'); return; }
    const { headers, rows } = parseCsvOrTsv(text);
    if (headers.length === 0 || rows.length === 0) { Alert.alert('Hata', 'CSV/TSV ayrıştırılamadı.'); return; }
    const r = validateImport(type, headers, rows);
    setResult(r);
    await saveImportResult(r);
    await refresh();
  };

  const loadSample = () => setText(sample);
  const clearAll = () => { setText(''); setResult(null); };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.typeRow}>
          {TYPES.map(t => {
            const active = t === type;
            return (
              <TouchableOpacity key={t} style={[styles.typeChip, active && styles.typeChipActive]} onPress={() => { setType(t); setResult(null); }}>
                <Ionicons name={TYPE_ICON[t]} size={14} color={active ? '#fff' : colors.text.muted} />
                <Text style={[styles.typeChipText, active && { color: '#fff' }]}>{TYPE_LABEL[t]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={14} color="#16a34a" />
          <Text style={styles.infoText}>
            Excel'de A1 sütun başlıkları, sonraki satırlarda veri olacak şekilde tüm hücreleri seçip kopyalayın ve aşağıya yapıştırın. Tab veya virgül ayraçlı veri kabul edilir.
          </Text>
        </View>

        <Text style={styles.fLabel}>Beklenen Sütunlar</Text>
        <View style={styles.colsRow}>
          {fields.map(f => (
            <View key={f.key} style={[styles.colPill, f.required && { borderColor: brand.green }]}>
              <Text style={[styles.colText, f.required && { color: brand.green }]}>{f.label}{f.required ? ' *' : ''}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.smallBtn} onPress={loadSample}>
            <Ionicons name="document-text-outline" size={14} color={colors.text.muted} />
            <Text style={styles.smallBtnText}>Örnek Yükle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallBtn} onPress={clearAll}>
            <Ionicons name="close-outline" size={14} color={colors.text.muted} />
            <Text style={styles.smallBtnText}>Temizle</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.input, { minHeight: 180, textAlignVertical: 'top', fontFamily: undefined }]}
          multiline
          value={text}
          onChangeText={setText}
          placeholder={"Excel'den kopyaladığınız hücreleri buraya yapıştırın..."}
          placeholderTextColor={colors.text.faint}
        />

        <TouchableOpacity style={styles.primaryBtn} onPress={onValidate}>
          <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>Doğrula & İçe Aktar</Text>
        </TouchableOpacity>

        {result && (
          <View style={[styles.resultCard, { borderColor: result.errors.length > 0 ? '#f59e0b' : '#16a34a' }]}>
            <Text style={styles.resultTitle}>Sonuç · {TYPE_LABEL[result.type]}</Text>
            <View style={styles.metricsRow}>
              <Metric label="Toplam" value={result.rowsTotal} color={colors.text.primary} />
              <Metric label="Alındı" value={result.rowsImported} color="#16a34a" />
              <Metric label="Atlandı" value={result.rowsSkipped} color="#f59e0b" />
              <Metric label="Hata" value={result.errors.length} color="#dc2626" />
            </View>
            {result.errors.length > 0 && (
              <View style={{ marginTop: spacing.sm }}>
                <Text style={styles.errorTitle}>Hatalar ({result.errors.length})</Text>
                {result.errors.slice(0, 10).map((e, i) => (
                  <Text key={i} style={styles.errorRow}>• Satır {e.row}: {e.message}</Text>
                ))}
                {result.errors.length > 10 && <Text style={styles.errorRow}>… ve {result.errors.length - 10} hata daha</Text>}
              </View>
            )}
          </View>
        )}

        <Text style={styles.sectionTitle}>Geçmiş ({history.length})</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>Henüz içe aktarım yok.</Text>
        ) : history.slice(0, 10).map((r, i) => (
          <View key={i} style={styles.historyCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.historyTitle}>{TYPE_LABEL[r.type]}</Text>
              <Text style={styles.historyMeta}>{fmt(r.importedAt)}</Text>
            </View>
            <Text style={styles.historyStat}>
              <Text style={{ color: '#16a34a' }}>{r.rowsImported}</Text>
              <Text style={{ color: colors.text.faint }}> / {r.rowsTotal}</Text>
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  typeRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.md },
  typeChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  typeChipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  typeChipText: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  infoBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', padding: spacing.sm, backgroundColor: 'rgba(22,163,74,0.08)', borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(22,163,74,0.25)', marginBottom: spacing.md },
  infoText: { flex: 1, color: '#86efac', fontSize: 11, lineHeight: 15 },
  fLabel: { color: colors.text.muted, fontSize: typography.xs, marginTop: spacing.sm, marginBottom: 6, fontWeight: '700' },
  colsRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginBottom: spacing.sm },
  colPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  colText: { color: colors.text.muted, fontSize: 11, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  smallBtnText: { color: colors.text.muted, fontSize: 11, fontWeight: '700' },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 10, color: colors.text.primary, fontSize: typography.xs },
  primaryBtn: { flexDirection: 'row', backgroundColor: '#16a34a', paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.md },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  resultCard: { marginTop: spacing.md, padding: spacing.md, borderWidth: 1, borderRadius: radius.md, backgroundColor: colors.bg.secondary },
  resultTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md, marginBottom: spacing.sm },
  metricsRow: { flexDirection: 'row', gap: 6 },
  metric: { flex: 1, alignItems: 'center', padding: 8, borderRadius: radius.sm, backgroundColor: colors.bg.primary },
  metricValue: { fontSize: typography.lg, fontWeight: '800' },
  metricLabel: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  errorTitle: { color: '#dc2626', fontSize: typography.xs, fontWeight: '700', marginBottom: 4 },
  errorRow: { color: colors.text.muted, fontSize: 11, marginVertical: 1 },
  sectionTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  emptyText: { color: colors.text.muted, textAlign: 'center', padding: spacing.md },
  historyCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, marginBottom: 6 },
  historyTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  historyMeta: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
  historyStat: { fontSize: typography.sm, fontWeight: '800' },
});
