// PhotoAnalysisScreen — POZ-DEV-091
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { colors, spacing, radius, typography } from '../theme';
import { analyzePhoto, SEVERITY_COLOR_AI, SEVERITY_LABEL_TR } from '../services/ai';
import { DamageAnalysis } from '../types';

export default function PhotoAnalysisScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DamageAnalysis | null>(null);

  const pickFrom = async (source: 'camera' | 'library') => {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin gerekli', 'Devam için izin verin.');
      return;
    }
    const res = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ['images'] });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setImageUri(res.assets[0].uri);
      setResult(null);
    }
  };

  const onAnalyze = async () => {
    if (!imageUri) { Alert.alert('Eksik', 'Önce fotoğraf seçin.'); return; }
    setLoading(true);
    try {
      const r = await analyzePhoto(imageUri, context.trim() || undefined);
      setResult(r);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Hata';
      Alert.alert('Hata', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {imageUri ? (
          <View style={styles.imageBox}>
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
            <TouchableOpacity style={styles.removeBtn} onPress={() => { setImageUri(null); setResult(null); }}>
              <Ionicons name="close-circle" size={28} color="#dc2626" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={48} color={colors.text.faint} />
            <Text style={styles.phText}>Fotoğraf seçin</Text>
          </View>
        )}

        <View style={styles.pickerRow}>
          <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: '#0ea5e9' }]} onPress={() => pickFrom('camera')}>
            <Ionicons name="camera-outline" size={18} color="#fff" />
            <Text style={styles.pickerText}>Kamera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.pickerBtn, { backgroundColor: '#8b5cf6' }]} onPress={() => pickFrom('library')}>
            <Ionicons name="images-outline" size={18} color="#fff" />
            <Text style={styles.pickerText}>Galeri</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Bağlam (opsiyonel)</Text>
        <TextInput
          style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
          multiline
          value={context}
          onChangeText={setContext}
          placeholder="ör. Yangın sonrası pano fotoğrafı"
          placeholderTextColor={colors.text.faint}
        />

        <TouchableOpacity style={[styles.analyzeBtn, (!imageUri || loading) && { opacity: 0.5 }]} onPress={onAnalyze} disabled={!imageUri || loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="scan-outline" size={18} color="#fff" />}
          <Text style={styles.analyzeText}>{loading ? 'Analiz ediliyor…' : 'AI ile Analiz Et'}</Text>
        </TouchableOpacity>

        {result && (
          <View style={[styles.resultCard, { borderColor: SEVERITY_COLOR_AI[result.severity] }]}>
            <View style={styles.resultHead}>
              <View style={[styles.sevBadge, { backgroundColor: SEVERITY_COLOR_AI[result.severity] }]}>
                <Text style={styles.sevText}>{SEVERITY_LABEL_TR[result.severity]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.confidence}>Güven: %{result.confidence}</Text>
                {result.estimatedCost ? (
                  <Text style={styles.cost}>Tahmini Maliyet: ₺{result.estimatedCost.toLocaleString('tr-TR')}</Text>
                ) : null}
              </View>
              {result.source === 'demo' && (
                <View style={styles.demoBadge}>
                  <Ionicons name="flask-outline" size={11} color="#b45309" />
                  <Text style={styles.demoText}>YEREL DEMO</Text>
                </View>
              )}
            </View>
            {result.source === 'demo' && (
              <Text style={styles.demoNote}>
                AI sağlayıcı tanımlı değil — bu sonuç anahtar kelime tabanlı yerel tahmindir. Gerçek görsel analizi için AI Ayarları'ndan bir sağlayıcı ekleyin.
              </Text>
            )}

            <Text style={styles.sectionT}>Bulgular</Text>
            {result.findings.map((f, i) => (
              <View key={i} style={styles.bulletRow}>
                <Ionicons name="alert-circle-outline" size={14} color="#f59e0b" />
                <Text style={styles.bullet}>{f}</Text>
              </View>
            ))}

            <Text style={styles.sectionT}>Öneriler</Text>
            {result.recommendations.map((r, i) => (
              <View key={i} style={styles.bulletRow}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#22c55e" />
                <Text style={styles.bullet}>{r}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  imageBox: { position: 'relative', borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.primary },
  image: { width: '100%', height: 240, backgroundColor: colors.bg.secondary },
  removeBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: colors.bg.primary, borderRadius: 14 },
  placeholder: { padding: spacing.xl, borderWidth: 1, borderColor: colors.border.primary, borderStyle: 'dashed', borderRadius: radius.md, backgroundColor: colors.bg.secondary, alignItems: 'center', gap: 8, height: 240, justifyContent: 'center' },
  phText: { color: colors.text.muted },
  pickerRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  pickerBtn: { flex: 1, flexDirection: 'row', paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 6 },
  pickerText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  label: { color: colors.text.muted, fontSize: typography.xs, marginTop: spacing.md, marginBottom: 6, fontWeight: '700' },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: colors.text.primary, fontSize: typography.sm },
  analyzeBtn: { flexDirection: 'row', backgroundColor: '#ec4899', paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.lg },
  analyzeText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  resultCard: { marginTop: spacing.lg, padding: spacing.md, borderWidth: 2, borderRadius: radius.md, backgroundColor: colors.bg.secondary },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.sm },
  sevBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  sevText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  confidence: { color: colors.text.muted, fontSize: typography.xs },
  cost: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', marginTop: 2 },
  demoBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fef3c7', borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  demoText: { color: '#b45309', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  demoNote: { color: colors.text.muted, fontSize: typography.xs, lineHeight: 16, marginBottom: spacing.sm, fontStyle: 'italic' },
  sectionT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '800', marginTop: spacing.sm, marginBottom: 4 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
  bullet: { flex: 1, color: colors.text.primary, fontSize: typography.sm, lineHeight: 18 },
});
