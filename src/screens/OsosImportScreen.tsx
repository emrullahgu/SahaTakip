// OsosImportScreen — POZ-DEV-248 CSV içe aktar (meterNo,readingAt,activeImport,activeExport,demand)
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { bulkImportReadings } from '../services/osos';
import EmptyState from '../components/EmptyState';

const SAMPLE = `meterNo,readingAt,activeImportKwh,activeExportKwh,peakDemandKw
M-1001,2025-01-15T08:00:00Z,12450.5,0,42.3
M-1002,2025-01-15T08:00:00Z,9831.2,1230.0,38.1`;

export default function OsosImportScreen() {
  const nav = useNavigation();
  const [text, setText] = useState('');

  const rows = useMemo(() => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const header = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).filter(l => l.trim()).map(l => {
      const cols = l.split(',').map(c => c.trim());
      const obj: Record<string, string> = {};
      header.forEach((h, i) => { obj[h] = cols[i] || ''; });
      return {
        meterNo: obj.meterNo || '',
        readingAt: obj.readingAt || new Date().toISOString(),
        activeImportKwh: Number(obj.activeImportKwh) || 0,
        activeExportKwh: obj.activeExportKwh ? Number(obj.activeExportKwh) : 0,
        reactiveImportKvarh: obj.reactiveImportKvarh ? Number(obj.reactiveImportKvarh) : 0,
        reactiveExportKvarh: obj.reactiveExportKvarh ? Number(obj.reactiveExportKvarh) : 0,
        demandKw: obj.demandKw ? Number(obj.demandKw) : (obj.peakDemandKw ? Number(obj.peakDemandKw) : undefined),
        source: 'osos_import' as const,
      };
    }).filter(r => r.meterNo);
  }, [text]);

  const onImport = async () => {
    if (rows.length === 0) return Alert.alert('Boş', 'İçe aktarılacak satır yok');
    await bulkImportReadings(rows);
    Alert.alert('Tamam', `${rows.length} kayıt içe aktarıldı`, [{ text: 'OK', onPress: () => nav.goBack() }]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#eab308" />
          <Text style={s.infoText}>CSV başlık satırı: meterNo,readingAt,activeImportKwh,activeExportKwh,peakDemandKw</Text>
        </View>
        <TouchableOpacity onPress={() => setText(SAMPLE)} style={s.sampleBtn}>
          <Text style={s.sampleText}>Örnek doldur</Text>
        </TouchableOpacity>
        <TextInput
          style={s.area}
          value={text}
          onChangeText={setText}
          multiline
          placeholder="CSV içeriğini buraya yapıştırın..."
          placeholderTextColor={colors.text.faint}
        />
        {text.length === 0 ? (
          <EmptyState
            icon="cloud-upload-outline"
            title="Veri yapıştırın"
            subtitle="Excel'den kopyaladığınız CSV verilerini buraya yapıştırarak toplu yükleme yapabilirsiniz."
            actionLabel="Örnek Doldur"
            onAction={() => setText(SAMPLE)}
          />
        ) : (
          <>
            <Text style={s.preview}>Önizleme: {rows.length} satır</Text>
            {rows.slice(0, 5).map((r, i) => (
              <View key={i} style={s.previewRow}>
                <Text style={s.prevTitle}>{r.meterNo}</Text>
                <Text style={s.prevMeta}>{r.activeImportKwh} kWh @ {r.readingAt}</Text>
              </View>
            ))}
            <TouchableOpacity style={s.importBtn} onPress={onImport} disabled={rows.length === 0}>
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
              <Text style={s.importText}>İçe Aktar ({rows.length})</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.sm },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: spacing.md, backgroundColor: '#eab30822', borderWidth: 1, borderColor: '#eab30855', borderRadius: radius.md },
  infoText: { color: colors.text.primary, fontSize: typography.xs, flex: 1 },
  sampleBtn: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  sampleText: { color: '#eab308', fontSize: typography.xs, fontWeight: '700' },
  area: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, padding: spacing.md, minHeight: 200, color: colors.text.primary, fontSize: typography.xs, textAlignVertical: 'top', fontFamily: 'Courier' },
  preview: { color: colors.text.muted, fontSize: typography.xs, marginTop: spacing.sm },
  previewRow: { padding: 8, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  prevTitle: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  prevMeta: { color: colors.text.muted, fontSize: 10 },
  importBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#22c55e', paddingVertical: 14, borderRadius: radius.md, marginTop: spacing.md },
  importText: { color: '#fff', fontWeight: '800' },
});
