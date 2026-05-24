// BroadcastMessageScreen — POZ-DEV-179 Manuel bildirim gönderici
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { NotificationChannel, RootStackParamList } from '../types';
import { emitEvent } from '../services/notifications';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CHANNELS: { kind: NotificationChannel; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { kind: 'push',     label: 'Push',     icon: 'notifications-outline', color: '#0ea5e9' },
  { kind: 'email',    label: 'E-posta',  icon: 'mail-outline',          color: '#8b5cf6' },
  { kind: 'sms',      label: 'SMS',      icon: 'chatbox-outline',       color: '#22c55e' },
  { kind: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp',         color: '#10b981' },
];

export default function BroadcastMessageScreen() {
  const nav = useNavigation<Nav>();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selected, setSelected] = useState<NotificationChannel[]>(['push']);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const toggle = (k: NotificationChannel) => {
    setSelected(prev => prev.includes(k) ? prev.filter(c => c !== k) : [...prev, k]);
  };

  const onSend = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Eksik', 'Başlık ve mesaj zorunludur.');
      return;
    }
    if (selected.length === 0) {
      Alert.alert('Eksik', 'En az bir kanal seçin.');
      return;
    }
    setSending(true);
    try {
      const res = await emitEvent('custom', title.trim(), message.trim(), {
        channels: selected,
        recipient: recipient.trim() || undefined,
      });
      const parts = Object.entries(res.dispatch).map(([ch, r]) => `${ch}: ${r?.ok ? '✓' : '✗'}`);
      setLastResult(parts.join(' · '));
      Alert.alert('Gönderildi', `Bildirim oluşturuldu.\n${parts.join('\n')}`, [
        { text: 'Akışı Aç', onPress: () => nav.navigate('Notifications') },
        { text: 'Tamam' },
      ]);
      setTitle('');
      setMessage('');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Bildirim gönderilemedi');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="megaphone-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Manuel Bildirim</Text>
            <Text style={styles.heroSub}>Özel mesaj yayını</Text>
          </View>
        </View>

        <Text style={styles.label}>Başlık</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Bildirim başlığı"
          placeholderTextColor={colors.text.faint}
          maxLength={80}
        />

        <Text style={styles.label}>Mesaj</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={message}
          onChangeText={setMessage}
          placeholder="Mesaj içeriği"
          placeholderTextColor={colors.text.faint}
          multiline
          maxLength={500}
        />
        <Text style={styles.helper}>{message.length}/500</Text>

        <Text style={styles.label}>Alıcı (opsiyonel)</Text>
        <TextInput
          style={styles.input}
          value={recipient}
          onChangeText={setRecipient}
          placeholder="E-posta / telefon (boş bırakılırsa tercih ekranındaki adres)"
          placeholderTextColor={colors.text.faint}
        />

        <Text style={styles.label}>Kanallar</Text>
        <View style={styles.chRow}>
          {CHANNELS.map(c => {
            const on = selected.includes(c.kind);
            return (
              <TouchableOpacity
                key={c.kind}
                style={[styles.chBtn, on ? { backgroundColor: c.color, borderColor: c.color } : { borderColor: c.color }]}
                onPress={() => toggle(c.kind)}
                activeOpacity={0.85}
              >
                <Ionicons name={c.icon} size={16} color={on ? '#fff' : c.color} />
                <Text style={[styles.chText, { color: on ? '#fff' : c.color }]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.sendBtn, sending && { opacity: 0.6 }]}
          onPress={onSend}
          disabled={sending}
          activeOpacity={0.85}
        >
          {sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="paper-plane-outline" size={18} color="#fff" />}
          <Text style={styles.sendText}>{sending ? 'Gönderiliyor…' : 'Gönder'}</Text>
        </TouchableOpacity>

        {lastResult && (
          <View style={styles.resultCard}>
            <Ionicons name="information-circle-outline" size={16} color="#0ea5e9" />
            <Text style={styles.resultText}>{lastResult}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.xs },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#ec4899', borderRadius: radius.md, marginBottom: spacing.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  label: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginTop: spacing.sm, marginBottom: 4 },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, padding: spacing.sm, color: colors.text.primary, fontSize: typography.sm },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  helper: { color: colors.text.faint, fontSize: 10, alignSelf: 'flex-end', marginTop: 2 },
  chRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1.5, backgroundColor: colors.bg.secondary },
  chText: { fontSize: typography.xs, fontWeight: '700' },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ec4899', paddingVertical: 14, borderRadius: radius.md, marginTop: spacing.lg },
  sendText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  resultCard: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: '#0ea5e9', borderRadius: radius.md, marginTop: spacing.sm },
  resultText: { color: colors.text.muted, fontSize: typography.xs, flex: 1 },
});
