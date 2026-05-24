// Faz 49 — SecDevicesScreen (POZ-DEV-195)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listDevices, revokeDevice } from '../services/secCenter';
import type { SecDevice } from '../types';

const deviceIcon = (os: string) => {
  if (/iOS|macOS/i.test(os)) return 'logo-apple';
  if (/Android/i.test(os)) return 'logo-android';
  if (/Windows/i.test(os)) return 'logo-windows';
  if (/Linux/i.test(os)) return 'terminal';
  return 'help-circle';
};

const isForeign = (location: string) => !/TR$/i.test(location);

export default function SecDevicesScreen() {
  const [list, setList] = useState<SecDevice[]>([]);

  const load = useCallback(async () => setList(await listDevices()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const revoke = (d: SecDevice) => {
    Alert.alert('Oturumu kapat', `${d.device} cihazından çıkış yapılsın mı?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Kapat', style: 'destructive', onPress: async () => { await revokeDevice(d.id); load(); } },
    ]);
  };

  const grouped = list.reduce<Record<string, SecDevice[]>>((acc, d) => {
    (acc[d.userName] ||= []).push(d);
    return acc;
  }, {});

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <Ionicons name="phone-portrait" size={36} color="#a855f7" />
          <View style={{ flex: 1 }}>
            <Text style={s.heroT}>{list.length} aktif oturum</Text>
            <Text style={s.heroS}>{Object.keys(grouped).length} kullanıcı</Text>
          </View>
        </View>

        {Object.entries(grouped).map(([user, devices]) => (
          <View key={user} style={s.userBlock}>
            <Text style={s.user}>{user}</Text>
            {devices.map(d => {
              const foreign = isForeign(d.location);
              return (
                <View key={d.id} style={[s.card, d.current && { borderColor: '#22c55e' }, foreign && !d.current && { borderColor: '#ef4444' }]}>
                  <View style={s.row}>
                    <Ionicons name={deviceIcon(d.os) as any} size={24} color={d.current ? '#22c55e' : foreign ? '#ef4444' : colors.text.primary} />
                    <View style={{ flex: 1 }}>
                      <View style={s.titleRow}>
                        <Text style={s.dev}>{d.device}</Text>
                        {d.current && <View style={s.curPill}><Text style={s.curT}>BU CİHAZ</Text></View>}
                        {foreign && !d.current && <Ionicons name="warning" size={14} color="#ef4444" />}
                      </View>
                      <Text style={s.os}>{d.os}</Text>
                      <Text style={s.meta}>{d.ip} · {d.location}</Text>
                      <Text style={s.meta}>Son: {new Date(d.lastSeen).toLocaleString('tr-TR')}</Text>
                    </View>
                    {!d.current && (
                      <TouchableOpacity style={s.revBtn} onPress={() => revoke(d)}>
                        <Ionicons name="log-out" size={14} color="#fff" />
                        <Text style={s.revT}>Çıkış</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#a855f722', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#a855f7' },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroS: { color: colors.text.muted, fontSize: typography.sm },
  userBlock: { gap: 6, marginTop: spacing.sm },
  user: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '800', textTransform: 'uppercase' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dev: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  curPill: { backgroundColor: '#22c55e', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  curT: { color: '#fff', fontSize: 9, fontWeight: '800' },
  os: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  revBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.sm },
  revT: { color: '#fff', fontSize: typography.xs, fontWeight: '800' },
});
