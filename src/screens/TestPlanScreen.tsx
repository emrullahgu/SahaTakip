// TestPlanScreen — POZ-DEV-339 Kritik akış kontrol listesi (manuel test rehberi)
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';

interface Check { id: string; label: string }
interface Section { title: string; icon: string; color: string; items: Check[] }

const PLAN: Section[] = [
  {
    title: 'Auth & Profil', icon: 'log-in-outline', color: '#0ea5e9',
    items: [
      { id: 'a1', label: 'Email/şifre ile giriş çalışıyor' },
      { id: 'a2', label: 'Yeni kayıt + email doğrulama' },
      { id: 'a3', label: 'Şifre sıfırlama (email link)' },
      { id: 'a4', label: 'Oturum içi şifre değiştirme' },
      { id: 'a5', label: 'Profil bilgisi güncelleme' },
      { id: 'a6', label: 'Çıkış yapınca AuthFlow’a dönüş' },
    ],
  },
  {
    title: 'Teklif Akışı', icon: 'document-text-outline', color: '#8b5cf6',
    items: [
      { id: 't1', label: 'Yeni teklif (klasik + hızlı POZ)' },
      { id: 't2', label: 'YG Trafo teklifi oluştur + PDF' },
      { id: 't3', label: 'GES teklifi oluştur + onay' },
      { id: 't4', label: 'Teklif paylaşım linki + token' },
    ],
  },
  {
    title: 'İş Emri', icon: 'briefcase-outline', color: '#22c55e',
    items: [
      { id: 'w1', label: 'İş emri oluşturma + atama' },
      { id: 'w2', label: 'Kanban sürükle-bırak durum değişimi' },
      { id: 'w3', label: 'SLA ihlal bildirimi tetiklenir' },
      { id: 'w4', label: 'Form doldurma + işe bağlama' },
    ],
  },
  {
    title: 'Stok & Araç', icon: 'cube-outline', color: '#f59e0b',
    items: [
      { id: 's1', label: 'Malzeme giriş/çıkış hareketi' },
      { id: 's2', label: 'Düşük stok uyarısı' },
      { id: 's3', label: 'Araç yakıt logu + maliyet özeti' },
    ],
  },
  {
    title: 'Bordro & Puantaj', icon: 'wallet-outline', color: '#f43f5e',
    items: [
      { id: 'p1', label: 'Puantaj girişi (gün + mesai)' },
      { id: 'p2', label: 'Bordro çalıştırma + detay listeleme' },
    ],
  },
  {
    title: 'Görev & Takvim', icon: 'calendar-outline', color: '#a855f7',
    items: [
      { id: 'g1', label: 'Görev detay → yorum + mention' },
      { id: 'g2', label: 'Görev → ek dosya bağlantısı' },
      { id: 'g3', label: 'Takvim ay görünümü + günlük etkinlikler' },
      { id: 'g4', label: 'Etkinlik oluşturunca davet bildirimi' },
    ],
  },
  {
    title: 'Kalite', icon: 'ribbon-outline', color: '#6366f1',
    items: [
      { id: 'q1', label: 'Crash raporları görünüyor' },
      { id: 'q2', label: 'Geri bildirim formu kayıt eder' },
      { id: 'q3', label: 'Performans örnekleri toplanıyor' },
      { id: 'q4', label: 'Release notes güncel' },
    ],
  },
];

const KEY = 'testplan_state_v1';

export default function TestPlanScreen() {
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) setDone(JSON.parse(raw));
    })();
  }, []);

  const toggle = async (id: string) => {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  };

  const reset = async () => {
    setDone({});
    await AsyncStorage.removeItem(KEY);
  };

  const total = PLAN.reduce((a, s) => a + s.items.length, 0);
  const completed = Object.values(done).filter(Boolean).length;
  const pct = Math.round((completed / total) * 100);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.progressCard}>
          <Text style={s.progT}>{completed} / {total} adım tamam ({pct}%)</Text>
          <View style={s.progTrack}>
            <View style={[s.progFill, { width: `${pct}%` }]} />
          </View>
          <TouchableOpacity style={s.resetBtn} onPress={reset}>
            <Ionicons name="refresh" size={14} color="#fff" />
            <Text style={s.resetT}>Sıfırla</Text>
          </TouchableOpacity>
        </View>

        {PLAN.map(section => (
          <View key={section.title} style={s.card}>
            <View style={[s.sectionHead, { backgroundColor: section.color + '22', borderColor: section.color }]}>
              <Ionicons name={section.icon as never} size={18} color={section.color} />
              <Text style={[s.sectionT, { color: section.color }]}>{section.title}</Text>
            </View>
            {section.items.map(it => (
              <TouchableOpacity key={it.id} style={s.checkRow} onPress={() => toggle(it.id)}>
                <Ionicons name={done[it.id] ? 'checkbox' : 'square-outline'} size={20} color={done[it.id] ? '#22c55e' : colors.text.muted} />
                <Text style={[s.checkT, done[it.id] && { textDecorationLine: 'line-through', color: colors.text.muted }]}>{it.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 80 },
  progressCard: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 8 },
  progT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  progTrack: { height: 10, backgroundColor: colors.bg.primary, borderRadius: 5, overflow: 'hidden' },
  progFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 5 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md },
  resetT: { color: '#fff', fontWeight: '700', fontSize: typography.xs },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, alignSelf: 'flex-start' },
  sectionT: { fontSize: typography.sm, fontWeight: '700' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 4 },
  checkT: { color: colors.text.primary, fontSize: typography.sm, flex: 1 },
});
