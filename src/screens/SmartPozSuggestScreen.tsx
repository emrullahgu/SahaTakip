// SmartPozSuggestScreen — POZ-DEV-090
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { suggestPozFromDescription } from '../services/ai';
import { PozSuggestion, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SmartPozSuggest'>;
type RP = RouteProp<RootStackParamList, 'SmartPozSuggest'>;

function scoreColor(s: number): string {
  if (s >= 70) return brand.green;
  if (s >= 40) return '#f59e0b';
  return '#ef4444';
}

export default function SmartPozSuggestScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RP>();
  const [desc, setDesc] = useState(route.params?.description || '');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PozSuggestion[]>([]);

  const onSuggest = async () => {
    if (!desc.trim()) { Alert.alert('Eksik', 'İş tanımı girin.'); return; }
    setLoading(true);
    try {
      const r = await suggestPozFromDescription(desc.trim());
      setResults(r);
      if (r.length === 0) Alert.alert('Sonuç yok', 'Bu tanıma uygun POZ bulunamadı.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Bilinmeyen hata';
      Alert.alert('Hata', msg);
    } finally {
      setLoading(false);
    }
  };

  const examples = [
    'Kompanzasyon panosu eski, harmonik filtresi gerekli',
    'Trafo bakımı, yağ analizi ve buchholz rölesi kontrolü',
    'GES inverter arıza, panel temizliği lazım',
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>İş tanımı / problem</Text>
        <TextInput
          style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
          multiline
          value={desc}
          onChangeText={setDesc}
          placeholder="ör. Trafo merkezinde yağ kaçağı tespit edildi, dielektrik test gerekli..."
          placeholderTextColor={colors.text.faint}
        />

        <Text style={styles.exHint}>Örnekler:</Text>
        <View style={styles.exRow}>
          {examples.map(ex => (
            <TouchableOpacity key={ex} style={styles.exChip} onPress={() => setDesc(ex)}>
              <Text style={styles.exText} numberOfLines={1}>{ex}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={onSuggest} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="sparkles-outline" size={18} color="#fff" />}
          <Text style={styles.btnText}>{loading ? 'Analiz ediliyor…' : 'POZ Öner'}</Text>
        </TouchableOpacity>

        {results.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Öneriler ({results.length})</Text>
            {results.map(r => (
              <TouchableOpacity
                key={r.pozId}
                style={styles.card}
                onPress={() => nav.navigate('NewQuote' as never)}
                onLongPress={() => Alert.alert(r.name, r.reason || '—')}
              >
                <View style={[styles.scoreBadge, { backgroundColor: scoreColor(r.score) + '22', borderColor: scoreColor(r.score) }]}>
                  <Text style={[styles.scoreText, { color: scoreColor(r.score) }]}>%{r.score}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{r.name}</Text>
                  <Text style={styles.cardSub}>{r.pozId} · {r.unit}</Text>
                  {r.reason ? <Text style={styles.reason} numberOfLines={2}>↪ {r.reason}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.price}>₺{r.unitPrice.toLocaleString('tr-TR')}</Text>
                  <Text style={styles.priceSub}>birim</Text>
                </View>
              </TouchableOpacity>
            ))}
            <Text style={styles.tip}>↪ Tıklayın: yeni teklif oluştur. Basılı tutun: gerekçe.</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  label: { color: colors.text.muted, fontSize: typography.xs, marginBottom: 6, fontWeight: '700' },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: colors.text.primary, fontSize: typography.sm },
  exHint: { color: colors.text.faint, fontSize: 11, marginTop: spacing.md, marginBottom: 4 },
  exRow: { gap: 4 },
  exChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary, marginBottom: 4 },
  exText: { color: colors.text.muted, fontSize: 11 },
  btn: { flexDirection: 'row', backgroundColor: '#8b5cf6', paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.lg },
  btnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  sectionTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, marginBottom: spacing.sm },
  scoreBadge: { width: 56, paddingVertical: 6, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  scoreText: { fontSize: typography.sm, fontWeight: '800' },
  cardTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  cardSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  reason: { color: '#a78bfa', fontSize: 11, marginTop: 4 },
  price: { color: brand.green, fontSize: typography.sm, fontWeight: '800' },
  priceSub: { color: colors.text.faint, fontSize: 10 },
  tip: { color: colors.text.faint, fontSize: 11, textAlign: 'center', marginTop: spacing.sm },
});
