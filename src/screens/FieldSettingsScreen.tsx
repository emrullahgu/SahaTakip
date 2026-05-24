// FieldSettingsScreen — POZ-DEV-386 Sade mod / tek el / GPS / pil
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import { getFieldPrefs, saveFieldPrefs } from '../services/offline';
import type { FieldUiPrefs, FieldModePref } from '../types';

const MODES: { key: FieldModePref; label: string; desc: string; icon: string }[] = [
  { key: 'auto', label: 'Otomatik', desc: 'Cihaza göre seç', icon: 'sparkles-outline' },
  { key: 'simple', label: 'Sade Mod', desc: 'Saha için minimal arayüz', icon: 'phone-portrait-outline' },
  { key: 'full', label: 'Tam Mod', desc: 'Tüm özellikler', icon: 'desktop-outline' },
];

export default function FieldSettingsScreen() {
  const [prefs, setPrefs] = useState<FieldUiPrefs | null>(null);

  useEffect(() => { (async () => setPrefs(await getFieldPrefs()))(); }, []);

  if (!prefs) return null;

  const update = async (patch: Partial<FieldUiPrefs>) => {
    const next = await saveFieldPrefs(patch);
    setPrefs(next);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.section}>Arayüz Modu</Text>
        <View style={s.modeRow}>
          {MODES.map(m => (
            <TouchableOpacity key={m.key} style={[s.modeBtn, prefs.mode === m.key && { borderColor: '#8b5cf6', backgroundColor: '#8b5cf722' }]} onPress={() => update({ mode: m.key })}>
              <Ionicons name={m.icon as never} size={22} color={prefs.mode === m.key ? '#8b5cf6' : colors.text.muted} />
              <Text style={[s.modeL, prefs.mode === m.key && { color: '#8b5cf6' }]}>{m.label}</Text>
              <Text style={s.modeD}>{m.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.section}>Tercihler</Text>
        <Toggle label="Tek elle kullanım" desc="Butonlar alta yaslanır" icon="hand-left-outline" value={prefs.oneHanded} onChange={v => update({ oneHanded: v })} />
        <Toggle label="Büyük butonlar" desc="Saha için ekstra dokunma alanı" icon="resize-outline" value={prefs.bigButtons} onChange={v => update({ bigButtons: v })} />
        <Toggle label="Düşük internet modu" desc="Resimleri sıkıştır, animasyonları kapat" icon="cellular-outline" value={prefs.lowBandwidth} onChange={v => update({ lowBandwidth: v })} />
        <Toggle label="GPS doğruluğu göster" desc="Harita ve konum ekranlarında ±metre" icon="locate-outline" value={prefs.showGpsAccuracy} onChange={v => update({ showGpsAccuracy: v })} />
        <Toggle label="Pil tasarrufu" desc="Arka plan senkronu azalt" icon="battery-charging-outline" value={prefs.batterySaver} onChange={v => update({ batterySaver: v })} />

        <Text style={s.footer}>Son güncelleme: {new Date(prefs.updatedAt).toLocaleString('tr-TR')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Toggle({ label, desc, icon, value, onChange }: { label: string; desc: string; icon: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={s.row}>
      <Ionicons name={icon as never} size={20} color={value ? '#22c55e' : colors.text.muted} />
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <Text style={s.t}>{label}</Text>
        <Text style={s.sub}>{desc}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: '#22c55e', false: '#475569' }} thumbColor="#fff" />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, gap: spacing.sm },
  section: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginTop: spacing.md, textTransform: 'uppercase', letterSpacing: 1 },
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  modeBtn: { flex: 1, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border.primary, alignItems: 'center', gap: 4 },
  modeL: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  modeD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  t: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  footer: { color: colors.text.faint, fontSize: typography.xs, textAlign: 'center', marginTop: spacing.lg },
});
