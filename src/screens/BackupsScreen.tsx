// BackupsScreen — Faz 40
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { PlatformBackup } from '../types';
import { listBackups, triggerBackup } from '../services/platform';

const STATUS_COLOR: Record<PlatformBackup['status'], string> = { success: '#22c55e', failed: '#ef4444', running: '#0ea5e9' };
const STATUS_LABEL: Record<PlatformBackup['status'], string> = { success: 'Başarılı', failed: 'Başarısız', running: 'Çalışıyor' };

export default function BackupsScreen() {
  const [items, setItems] = useState<PlatformBackup[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { setItems(await listBackups()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onTrigger = async () => {
    setBusy(true);
    try {
      const r = await triggerBackup();
      Alert.alert(r.status === 'success' ? 'Tamamlandı' : 'Hata', r.status === 'success' ? `${r.sizeMb} MB yedeklendi.` : (r.errorMessage || 'Bilinmeyen hata'));
      load();
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 90 }}
        renderItem={({ item }) => (
          <View style={[s.card, { borderLeftColor: STATUS_COLOR[item.status] }]}>
            <View style={s.row}>
              <Ionicons name={item.location === 'cloud' ? 'cloud-outline' : 'save-outline'} size={20} color={STATUS_COLOR[item.status]} />
              <View style={{ flex: 1 }}>
                <Text style={s.n}>{new Date(item.startedAt).toLocaleString('tr-TR')}</Text>
                <Text style={s.sub}>{item.sizeMb} MB · {item.location === 'cloud' ? 'Bulut' : 'Yerel'}{item.errorMessage ? ' · ' + item.errorMessage : ''}</Text>
              </View>
              <View style={[s.b, { backgroundColor: STATUS_COLOR[item.status] }]}>
                <Text style={s.bT}>{STATUS_LABEL[item.status]}</Text>
              </View>
            </View>
          </View>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={onTrigger} disabled={busy}>
        <Ionicons name={busy ? 'hourglass-outline' : 'cloud-upload-outline'} size={26} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  b: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  bT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center', elevation: 4 },
});
