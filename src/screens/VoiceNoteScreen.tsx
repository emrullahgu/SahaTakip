// src/screens/VoiceNoteScreen.tsx
// Saha ses notu → Whisper transkript → AI özet + aksiyon maddeleri.
// POZ-DEV-102

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, TextInput, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  startAudioRecording, stopAudioRecording, isAudioSupported,
  isAudioRecording,
} from '../services/audioRecorder';
import { aiVoice, type VoiceResult } from '../services/aiRouter';
import { aiErrorAlert } from '../services/aiErrorHandler';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

async function uriToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const r = await fetch(uri);
    const blob = await r.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

export default function VoiceNoteScreen() {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [contextNote, setContextNote] = useState('');
  const [saved, setSaved] = useState(false);
  const { user } = useAuth();
  const startRef = useRef(0);
  const tickRef = useRef<any>(null);
  const supported = isAudioSupported();

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (isAudioRecording()) stopAudioRecording().catch(() => {});
  }, []);

  const onStart = async () => {
    if (!supported) {
      Alert.alert('Desteklenmiyor', 'Ses kaydı bu cihazda desteklenmiyor.');
      return;
    }
    try {
      await startAudioRecording();
      setRecording(true);
      setResult(null);
      setElapsed(0);
      startRef.current = Date.now();
      tickRef.current = setInterval(() => setElapsed(Date.now() - startRef.current), 200);
    } catch (e: any) {
      Alert.alert('Kayıt Hatası', e?.message ?? String(e));
    }
  };

  const onStop = async () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    try {
      const rec = await stopAudioRecording();
      setRecording(false);
      setProcessing(true);

      const b64 = await uriToBase64(rec.uri);
      const mime = Platform.OS === 'web' ? 'audio/webm' : 'audio/m4a';
      const filename = Platform.OS === 'web' ? 'note.webm' : 'note.m4a';

      const r = await aiVoice({
        audio_base64: b64,
        mime,
        filename,
        language: 'tr',
        context: contextNote.trim() || undefined,
        summarize: true,
      });
      setResult(r);
      setSaved(false);

      // Veritabanına kaydet (voice_reports tablosu)
      try {
        const { error: insertErr } = await supabase.from('voice_reports').insert({
          transcript: r.transcript,
          summary: r.summary ?? null,
          action_items: r.action_items ?? [],
          created_by: user?.id ?? null,
        });
        if (!insertErr) setSaved(true);
        else console.warn('voice_reports insert error:', insertErr);
      } catch (saveErr) {
        console.warn('voice_reports kayıt hatası:', saveErr);
      }
    } catch (e: any) {
      const a = aiErrorAlert(e);
      Alert.alert(a.title, a.message);
      setRecording(false);
    } finally {
      setProcessing(false);
    }
  };

  const onCancel = async () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    try { await stopAudioRecording(); } catch { /* ignore */ }
    setRecording(false);
    setElapsed(0);
  };

  const sentimentColor = result?.sentiment === 'olumlu' ? brand.green
    : result?.sentiment === 'olumsuz' ? '#ef4444' : colors.text.muted;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Ses Notu Asistanı</Text>
          <Text style={styles.sub}>Sahada konuş — AI metne çevirsin, özetlesin, aksiyon çıkarsın.</Text>
        </View>

        <Text style={styles.label}>Bağlam (opsiyonel)</Text>
        <TextInput
          style={styles.contextInput}
          placeholder="Ör: Müşteri Acme A.Ş. tesisinde kombi servisi"
          placeholderTextColor={colors.text.faint}
          value={contextNote}
          onChangeText={setContextNote}
          multiline
        />

        <View style={styles.recCard}>
          {!recording && !processing ? (
            <TouchableOpacity style={[styles.recBtn, !supported && { opacity: 0.5 }]} onPress={onStart} disabled={!supported}>
              <Ionicons name="mic" size={36} color="#fff" />
              <Text style={styles.recBtnText}>Kaydı Başlat</Text>
            </TouchableOpacity>
          ) : recording ? (
            <>
              <View style={styles.recPulse}>
                <Ionicons name="radio-button-on" size={48} color="#ef4444" />
              </View>
              <Text style={styles.timer}>{formatDuration(elapsed)}</Text>
              <View style={styles.recRow}>
                <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#6b7280' }]} onPress={onCancel}>
                  <Ionicons name="close" size={16} color="#fff" />
                  <Text style={styles.smallBtnText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smallBtn, { backgroundColor: brand.green }]} onPress={onStop}>
                  <Ionicons name="stop" size={16} color="#fff" />
                  <Text style={styles.smallBtnText}>Durdur & Analiz Et</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={brand.green} />
              <Text style={styles.processingText}>Whisper transkribe ediyor…</Text>
            </>
          )}
        </View>

        {!supported && (
          <View style={styles.warn}>
            <Ionicons name="warning-outline" size={14} color="#f59e0b" />
            <Text style={styles.warnText}>
              Mikrofon erişimi yok. Native build (EAS) gerekebilir veya tarayıcı izni verin.
            </Text>
          </View>
        )}

        {result && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Ionicons name="document-text" size={16} color={brand.green} />
              <Text style={styles.resultTitle}>Transkript</Text>
              <Text style={styles.resultMeta}>· {result.language} · {Math.round(result.duration)}s</Text>
              {saved && (
                <View style={[styles.sentBadge, { backgroundColor: brand.green }]}>
                  <Text style={styles.sentText}>Kaydedildi</Text>
                </View>
              )}
            </View>
            <Text style={styles.transcript}>{result.transcript}</Text>

            {result.summary && (
              <>
                <View style={styles.resultHeader}>
                  <Ionicons name="sparkles" size={16} color="#8b5cf6" />
                  <Text style={styles.resultTitle}>Özet</Text>
                  <View style={[styles.sentBadge, { backgroundColor: sentimentColor }]}>
                    <Text style={styles.sentText}>{result.sentiment}</Text>
                  </View>
                </View>
                <Text style={styles.summary}>{result.summary}</Text>
              </>
            )}

            {!!result.action_items?.length && (
              <>
                <View style={styles.resultHeader}>
                  <Ionicons name="checkbox-outline" size={16} color="#f59e0b" />
                  <Text style={styles.resultTitle}>Yapılacaklar</Text>
                </View>
                {result.action_items.map((a, i) => (
                  <View key={i} style={styles.actionRow}>
                    <Text style={styles.actionBullet}>•</Text>
                    <Text style={styles.actionText}>{a}</Text>
                  </View>
                ))}
              </>
            )}

            {!!(result.key_entities?.customers?.length
              || result.key_entities?.products?.length
              || result.key_entities?.dates?.length
              || result.key_entities?.amounts?.length) && (
              <>
                <View style={styles.resultHeader}>
                  <Ionicons name="key-outline" size={16} color={brand.blue} />
                  <Text style={styles.resultTitle}>Anahtar Bilgiler</Text>
                </View>
                {!!result.key_entities?.customers?.length && (
                  <Text style={styles.entityRow}><Text style={styles.entityKey}>Müşteri:</Text> {result.key_entities.customers.join(', ')}</Text>
                )}
                {!!result.key_entities?.products?.length && (
                  <Text style={styles.entityRow}><Text style={styles.entityKey}>Ürün:</Text> {result.key_entities.products.join(', ')}</Text>
                )}
                {!!result.key_entities?.dates?.length && (
                  <Text style={styles.entityRow}><Text style={styles.entityKey}>Tarih:</Text> {result.key_entities.dates.join(', ')}</Text>
                )}
                {!!result.key_entities?.amounts?.length && (
                  <Text style={styles.entityRow}><Text style={styles.entityKey}>Tutar:</Text> {result.key_entities.amounts.join(', ')}</Text>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  header: { marginBottom: spacing.md },
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  label: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginBottom: 6, marginTop: spacing.sm },
  contextInput: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, padding: spacing.sm, color: colors.text.primary, fontSize: typography.sm, minHeight: 60, textAlignVertical: 'top' },
  recCard: { marginTop: spacing.lg, padding: spacing.xl, borderRadius: radius.lg, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, alignItems: 'center', gap: 12 },
  recBtn: { backgroundColor: '#ef4444', paddingVertical: 24, paddingHorizontal: 32, borderRadius: 100, alignItems: 'center', gap: 6 },
  recBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  recPulse: { padding: 12 },
  timer: { color: colors.text.primary, fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  recRow: { flexDirection: 'row', gap: 8 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md },
  smallBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  processingText: { color: colors.text.muted, fontSize: typography.sm },
  warn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, padding: spacing.sm, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: radius.sm },
  warnText: { flex: 1, color: '#f59e0b', fontSize: 11 },
  resultCard: { marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  resultTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  resultMeta: { color: colors.text.faint, fontSize: 11 },
  sentBadge: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  sentText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  transcript: { color: colors.text.primary, fontSize: typography.sm, lineHeight: 20, padding: spacing.sm, backgroundColor: colors.bg.primary, borderRadius: radius.sm },
  summary: { color: colors.text.primary, fontSize: typography.sm, lineHeight: 20, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  actionBullet: { color: '#f59e0b', fontWeight: '800' },
  actionText: { flex: 1, color: colors.text.primary, fontSize: typography.sm },
  entityRow: { color: colors.text.primary, fontSize: typography.sm, lineHeight: 20 },
  entityKey: { color: brand.blue, fontWeight: '700' },
});
