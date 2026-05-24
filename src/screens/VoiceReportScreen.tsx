// VoiceReportScreen — POZ-DEV-092 (transkriptten özet + eylem)
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';

import { colors, spacing, radius, typography } from '../theme';
import { useAppContext } from '../context/AppContext';
import { deleteVoiceReport, listVoiceReports, summarizeTranscript } from '../services/ai';
import { RootStackParamList, VoiceReport } from '../types';

type RP = RouteProp<RootStackParamList, 'VoiceReport'>;

function fmt(iso: string): string { try { return new Date(iso).toLocaleString('tr-TR'); } catch { return iso; } }

export default function VoiceReportScreen() {
  const route = useRoute<RP>();
  const { customers } = useAppContext();
  const [transcript, setTranscript] = useState('');
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<VoiceReport[]>([]);

  const refresh = useCallback(async () => { setHistory(await listVoiceReports()); }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onProcess = async () => {
    if (transcript.trim().length < 20) { Alert.alert('Eksik', 'En az 20 karakter transkript girin.'); return; }
    setLoading(true);
    try {
      const c = customers.find(c => c.id === customerId);
      await summarizeTranscript(transcript.trim(), {
        customerName: c ? (c.title || c.shortName) : undefined,
        workOrderId: route.params?.workOrderId,
      });
      setTranscript('');
      await refresh();
      Alert.alert('Hazır', 'Özet oluşturuldu.');
    } catch (e: unknown) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = (id: string) => {
    Alert.alert('Sil', 'Rapor silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteVoiceReport(id); await refresh(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={14} color="#0ea5e9" />
          <Text style={styles.infoText}>
            Sesi cihazınızın diktasyon (mikrofon) tuşuyla metne çevirin, ardından buraya yapıştırın.
          </Text>
        </View>

        <Text style={styles.label}>Transkript</Text>
        <TextInput
          style={[styles.input, { minHeight: 140, textAlignVertical: 'top' }]}
          multiline
          value={transcript}
          onChangeText={setTranscript}
          placeholder="Klavyenin mikrofon simgesine basıp konuşun, ya da konuştuğunuzu buraya yazın..."
          placeholderTextColor={colors.text.faint}
        />

        {customers.length > 0 && (
          <>
            <Text style={styles.label}>Müşteri (opsiyonel)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              <TouchableOpacity style={[styles.cChip, !customerId && styles.cChipActive]} onPress={() => setCustomerId(undefined)}>
                <Text style={[styles.cChipText, !customerId && styles.cChipTextActive]}>—</Text>
              </TouchableOpacity>
              {customers.map(c => {
                const active = c.id === customerId;
                return (
                  <TouchableOpacity key={c.id} style={[styles.cChip, active && styles.cChipActive]} onPress={() => setCustomerId(c.id)}>
                    <Text style={[styles.cChipText, active && styles.cChipTextActive]}>{c.shortName}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={onProcess} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="document-text-outline" size={18} color="#fff" />}
          <Text style={styles.btnText}>{loading ? 'Özetleniyor…' : 'Özet + Eylem Çıkar'}</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Geçmiş Raporlar ({history.length})</Text>
        {history.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="mic-off-outline" size={36} color={colors.text.faint} />
            <Text style={styles.emptyText}>Henüz rapor yok.</Text>
          </View>
        ) : history.map(r => (
          <TouchableOpacity key={r.id} style={styles.card} onLongPress={() => onDelete(r.id)}>
            <Text style={styles.dateText}>{fmt(r.createdAt)}{r.customerName ? ` · ${r.customerName}` : ''}</Text>
            <Text style={styles.summary}>{r.summary}</Text>
            {r.actionItems.length > 0 && (
              <>
                <Text style={styles.acTitle}>Eylem Maddeleri ({r.actionItems.length})</Text>
                {r.actionItems.map((a, i) => (
                  <View key={i} style={styles.acRow}>
                    <Ionicons name="arrow-forward-circle-outline" size={14} color="#0ea5e9" />
                    <Text style={styles.acText}>{a}</Text>
                  </View>
                ))}
              </>
            )}
            <Text style={styles.transcriptHint} numberOfLines={2}>↪ {r.transcript}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  infoBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', padding: spacing.sm, backgroundColor: 'rgba(14,165,233,0.08)', borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(14,165,233,0.25)', marginBottom: spacing.md },
  infoText: { flex: 1, color: '#7dd3fc', fontSize: 11, lineHeight: 15 },
  label: { color: colors.text.muted, fontSize: typography.xs, marginTop: spacing.sm, marginBottom: 6, fontWeight: '700' },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: colors.text.primary, fontSize: typography.sm },
  cChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary, marginRight: 6 },
  cChipActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  cChipText: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  cChipTextActive: { color: '#fff' },
  btn: { flexDirection: 'row', backgroundColor: '#0ea5e9', paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.md },
  btnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  sectionTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, marginBottom: spacing.sm },
  dateText: { color: colors.text.faint, fontSize: 11, marginBottom: 6 },
  summary: { color: colors.text.primary, fontSize: typography.sm, lineHeight: 19 },
  acTitle: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginTop: spacing.sm, marginBottom: 4 },
  acRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 3 },
  acText: { flex: 1, color: colors.text.secondary, fontSize: typography.xs, lineHeight: 16 },
  transcriptHint: { color: colors.text.faint, fontSize: 11, fontStyle: 'italic', marginTop: spacing.sm },
  empty: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyText: { color: colors.text.muted },
});
