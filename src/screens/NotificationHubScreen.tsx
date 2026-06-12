// NotificationHubScreen — POZ-DEV-177 Bildirim & İletişim merkez
import React, { useEffect, useState } from 'react';
import { localDateISO } from '../utils/date';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';
import { listNotifications, unreadCount } from '../services/notifications';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Tile {
  key: keyof RootStackParamList;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  poz?: string;
}

const TILES: Tile[] = [
  { key: 'Notifications',            label: 'Bildirim Akışı',  desc: 'Geçmiş bildirimler',      icon: 'notifications-outline', color: '#0ea5e9', poz: 'POZ-DEV-072' },
  { key: 'NotificationPreferences',  label: 'Tercihler',        desc: 'Kanal & olay ayarı',     icon: 'options-outline',       color: '#22c55e', poz: 'POZ-DEV-077' },
  { key: 'NotificationStats',        label: 'İstatistik',       desc: 'Kanal & olay dağılımı',  icon: 'bar-chart-outline',     color: '#f59e0b', poz: 'POZ-DEV-178' },
  { key: 'BroadcastMessage',         label: 'Manuel Bildirim', desc: 'Özel mesaj gönder',       icon: 'megaphone-outline',     color: '#ec4899', poz: 'POZ-DEV-179' },
];

export default function NotificationHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const tileWidth = (Math.min(width, 1200) - spacing.lg * 2 - (cols - 1) * spacing.md) / cols;

  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [today, setToday] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [all, un] = await Promise.all([listNotifications(), unreadCount()]);
        const todayStr = localDateISO();
        setTotal(all.length);
        setUnread(un);
        setToday(all.filter(n => (n.createdAt || '').slice(0, 10) === todayStr).length);
      } catch {}
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="notifications-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Bildirim & İletişim</Text>
            <Text style={styles.heroSub}>Push, e-posta, SMS, WhatsApp</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Pill label={`Toplam: ${total}`} color="#0ea5e9" icon="albums-outline" />
          <Pill label={`Okunmamış: ${unread}`} color={unread > 0 ? '#ef4444' : '#22c55e'} icon="mail-unread-outline" />
          <Pill label={`Bugün: ${today}`} color="#f59e0b" icon="today-outline" />
        </View>

        <View style={[styles.grid, { maxWidth: 1200, alignSelf: 'center', width: '100%' }]}>
          {TILES.map(t => (
            <TouchableOpacity
              key={String(t.key)}
              style={[styles.tile, { width: tileWidth }]}
              onPress={() => nav.navigate(t.key as never)}
              activeOpacity={0.85}
            >
              <View style={[styles.tileIcon, { backgroundColor: t.color }]}>
                <Ionicons name={t.icon} size={22} color="#fff" />
              </View>
              <Text style={styles.tileLabel}>{t.label}</Text>
              <Text style={styles.tileDesc}>{t.desc}</Text>
              {t.poz && <Text style={styles.tilePoz}>{t.poz}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Pill({ label, color, icon }: { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.pill, { borderColor: color, backgroundColor: color + '22' }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.md },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#a855f7', borderRadius: radius.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  statusRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  tileIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileLabel: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  tileDesc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tilePoz: { color: colors.text.faint, fontSize: 10, marginTop: 6, fontWeight: '700' },
});
