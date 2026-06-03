// OsosAutomationScreen — POZ-DEV-250
// Günlük OSOS otomasyonu: alarm kuralları, alıcı kanalları, planlı tetikleme,
// "Şimdi çalıştır" + son çalıştırma özeti + açık alarm listesi.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type {
  OsosAlarm, OsosAlarmRule, OsosAlarmKind, OsosAlarmSeverity, OsosAutoReportConfig,
  OsosDailySummary,
} from '../types';
import {
  listAlarmRules, upsertAlarmRule, deleteAlarmRule,
  listAlarms, acknowledgeAlarm, acknowledgeAllAlarms,
  getAutoReportConfig, saveAutoReportConfig,
  runDailyAutomation, listDailySummaries, buildDailyReportText, generateDailySummary,
} from '../services/osos';

const KIND_LABELS: Record<OsosAlarmKind, string> = {
  no_reading: 'Okuma yok',
  demand_exceeded: 'Demand eşiği',
  consumption_spike: 'Tüketim sıçraması (%)',
  consumption_drop: 'Tüketim düşüşü (%)',
  reverse_flow: 'Ters akış (veriş)',
  meter_offline: 'Sayaç çevrimdışı',
};
const SEVERITIES: OsosAlarmSeverity[] = ['info', 'warning', 'critical'];
const SEV_COLOR: Record<OsosAlarmSeverity, string> = {
  info: '#0ea5e9', warning: '#f59e0b', critical: '#ef4444',
};

export default function OsosAutomationScreen() {
  const [rules, setRules] = useState<OsosAlarmRule[]>([]);
  const [alarms, setAlarms] = useState<OsosAlarm[]>([]);
  const [cfg, setCfg] = useState<OsosAutoReportConfig | null>(null);
  const [lastSummary, setLastSummary] = useState<OsosDailySummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [waInput, setWaInput] = useState('');
  const [spaceInput, setSpaceInput] = useState('');

  const refresh = useCallback(async () => {
    const [r, a, c, ds] = await Promise.all([
      listAlarmRules(),
      listAlarms({ unacknowledgedOnly: true }),
      getAutoReportConfig(),
      listDailySummaries(),
    ]);
    setRules(r);
    setAlarms(a);
    setCfg(c);
    setLastSummary(ds[0] ?? null);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const persistCfg = async (next: OsosAutoReportConfig) => {
    setCfg(next);
    await saveAutoReportConfig(next);
  };

  const onRunNow = async () => {
    if (!cfg) return;
    setBusy(true);
    try {
      const res = await runDailyAutomation({ force: true });
      Alert.alert(
        'Otomasyon çalıştırıldı',
        `Yeni alarm: ${res.newAlarms}\nAçık alarm: ${res.openAlarms}\n` +
        (res.delivered
          ? (res.delivered.ok ? '✔ Dağıtım başarılı' : '⚠ Dağıtımda hata var')
          : 'Dağıtım kapalı / alıcı yok'),
      );
      refresh();
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  const onPreview = async () => {
    if (!cfg) return;
    // Önizleme yan etkisiz olmalı: günlük özeti yalnızca hesaplar (generateDailySummary),
    // runDailyAutomation gibi raporu kanallara GÖNDERMEZ.
    const summary = lastSummary ?? (await generateDailySummary());
    const open = await listAlarms({ unacknowledgedOnly: true });
    Alert.alert('Rapor önizleme', buildDailyReportText(summary, open, cfg.includeAlarms));
  };

  const addEmail = async () => {
    if (!cfg || !emailInput.trim()) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailInput.trim())) return Alert.alert('Geçersiz e-posta');
    if (cfg.emails.includes(emailInput.trim())) { setEmailInput(''); return; }
    await persistCfg({ ...cfg, emails: [...cfg.emails, emailInput.trim()] });
    setEmailInput('');
  };
  const addWa = async () => {
    if (!cfg || !waInput.trim()) return;
    if (cfg.whatsapps.includes(waInput.trim())) { setWaInput(''); return; }
    await persistCfg({ ...cfg, whatsapps: [...cfg.whatsapps, waInput.trim()] });
    setWaInput('');
  };
  const addSpace = async () => {
    if (!cfg || !spaceInput.trim()) return;
    if (cfg.gchatSpaces.includes(spaceInput.trim())) { setSpaceInput(''); return; }
    await persistCfg({ ...cfg, gchatSpaces: [...cfg.gchatSpaces, spaceInput.trim()] });
    setSpaceInput('');
  };

  const removeFrom = async (field: 'emails' | 'whatsapps' | 'gchatSpaces', val: string) => {
    if (!cfg) return;
    await persistCfg({ ...cfg, [field]: cfg[field].filter(v => v !== val) } as OsosAutoReportConfig);
  };

  const toggleRule = async (rule: OsosAlarmRule) => {
    await upsertAlarmRule({ ...rule, enabled: !rule.enabled });
    refresh();
  };
  const setRuleThreshold = async (rule: OsosAlarmRule, text: string) => {
    const n = Number(text);
    if (!isFinite(n)) return;
    await upsertAlarmRule({ ...rule, threshold: n });
    refresh();
  };
  const cycleSeverity = async (rule: OsosAlarmRule) => {
    const i = SEVERITIES.indexOf(rule.severity);
    const next = SEVERITIES[(i + 1) % SEVERITIES.length];
    await upsertAlarmRule({ ...rule, severity: next });
    refresh();
  };
  const removeRule = async (rule: OsosAlarmRule) => {
    Alert.alert('Sil', `"${KIND_LABELS[rule.kind]}" kuralı silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteAlarmRule(rule.id); refresh(); } },
    ]);
  };
  const addRule = async (kind: OsosAlarmKind) => {
    await upsertAlarmRule({
      enabled: true, kind, severity: 'warning',
      threshold: kind === 'demand_exceeded' ? 100 : 50,
      windowHours: kind === 'no_reading' ? 24 : undefined,
      note: KIND_LABELS[kind],
    });
    refresh();
  };

  const criticalCount = useMemo(() => alarms.filter(a => a.severity === 'critical').length, [alarms]);
  const lastRunLabel = cfg?.lastRunAt ? new Date(cfg.lastRunAt).toLocaleString('tr-TR') : 'Henüz çalışmadı';

  if (!cfg) {
    return <SafeAreaView style={s.safe}><Text style={s.muted}>Yükleniyor…</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        {/* HERO */}
        <View style={s.hero}>
          <View style={s.heroIcon}><Ionicons name="flash-outline" size={26} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroT}>OSOS Otomasyon</Text>
            <Text style={s.heroS}>Günlük alarm + rapor otomatik dağıtım</Text>
          </View>
        </View>

        {/* DURUM */}
        <View style={s.statusRow}>
          <Pill color="#0ea5e9" icon="time-outline" label={`Son: ${lastRunLabel}`} />
          <Pill color="#ef4444" icon="alert-circle-outline" label={`Kritik: ${criticalCount}`} />
          <Pill color="#f59e0b" icon="notifications-outline" label={`Açık: ${alarms.length}`} />
        </View>

        {/* AKSİYONLAR */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#22c55e' }]} onPress={onRunNow} disabled={busy}>
            <Ionicons name="play" size={16} color="#fff" />
            <Text style={s.btnT}>{busy ? 'Çalışıyor…' : 'Şimdi Çalıştır'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#0ea5e9' }]} onPress={onPreview}>
            <Ionicons name="eye-outline" size={16} color="#fff" />
            <Text style={s.btnT}>Rapor Önizle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary }]}
            onPress={async () => { const n = await acknowledgeAllAlarms('me'); Alert.alert('Onaylandı', `${n} alarm kapatıldı`); refresh(); }}>
            <Ionicons name="checkmark-done" size={16} color={colors.text.primary} />
            <Text style={[s.btnT, { color: colors.text.primary }]}>Tümünü Onayla</Text>
          </TouchableOpacity>
        </View>

        {/* PLANLAMA */}
        <Section title="Planlama">
          <Row label="Otomatik dağıtım açık">
            <Switch value={cfg.enabled} onValueChange={v => persistCfg({ ...cfg, enabled: v })} />
          </Row>
          <Row label="Tetik saati (0-23)">
            <TextInput
              style={s.smallInput}
              keyboardType="numeric"
              value={String(cfg.hourOfDay)}
              onChangeText={t => {
                const n = Math.max(0, Math.min(23, Number(t) || 0));
                persistCfg({ ...cfg, hourOfDay: n });
              }}
            />
          </Row>
          <Row label="Rapora alarmları ekle">
            <Switch value={cfg.includeAlarms} onValueChange={v => persistCfg({ ...cfg, includeAlarms: v })} />
          </Row>
        </Section>

        {/* ALICILAR */}
        <Section title="Alıcılar — E-posta">
          <ChipList items={cfg.emails} onRemove={v => removeFrom('emails', v)} color="#3b82f6" />
          <View style={s.addRow}>
            <TextInput style={s.input} placeholder="ornek@firma.com" placeholderTextColor={colors.text.faint}
              value={emailInput} onChangeText={setEmailInput} autoCapitalize="none" keyboardType="email-address" />
            <TouchableOpacity style={s.addBtn} onPress={addEmail}><Ionicons name="add" size={16} color="#fff" /></TouchableOpacity>
          </View>
        </Section>

        <Section title="Alıcılar — WhatsApp">
          <ChipList items={cfg.whatsapps} onRemove={v => removeFrom('whatsapps', v)} color="#22c55e" />
          <View style={s.addRow}>
            <TextInput style={s.input} placeholder="+905xx..." placeholderTextColor={colors.text.faint}
              value={waInput} onChangeText={setWaInput} keyboardType="phone-pad" />
            <TouchableOpacity style={s.addBtn} onPress={addWa}><Ionicons name="add" size={16} color="#fff" /></TouchableOpacity>
          </View>
        </Section>

        <Section title="Alıcılar — Google Chat Space">
          <ChipList items={cfg.gchatSpaces} onRemove={v => removeFrom('gchatSpaces', v)} color="#a855f7" />
          <View style={s.addRow}>
            <TextInput style={s.input} placeholder="default veya OPERASYON" placeholderTextColor={colors.text.faint}
              value={spaceInput} onChangeText={setSpaceInput} autoCapitalize="none" />
            <TouchableOpacity style={s.addBtn} onPress={addSpace}><Ionicons name="add" size={16} color="#fff" /></TouchableOpacity>
          </View>
        </Section>

        {/* KURALLAR */}
        <Section title={`Alarm Kuralları (${rules.length})`}>
          {rules.map(r => (
            <View key={r.id} style={s.ruleCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Switch value={r.enabled} onValueChange={() => toggleRule(r)} />
                <View style={{ flex: 1 }}>
                  <Text style={s.ruleTitle}>{KIND_LABELS[r.kind]}</Text>
                  {r.note && <Text style={s.ruleNote}>{r.note}</Text>}
                </View>
                <TouchableOpacity onPress={() => cycleSeverity(r)} style={[s.sevPill, { backgroundColor: SEV_COLOR[r.severity] + '22', borderColor: SEV_COLOR[r.severity] }]}>
                  <Text style={[s.sevPillT, { color: SEV_COLOR[r.severity] }]}>{r.severity}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeRule(r)} style={s.iconBtn}>
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
              {(r.kind === 'demand_exceeded' || r.kind === 'consumption_spike' || r.kind === 'consumption_drop' || r.kind === 'reverse_flow') && (
                <View style={s.thRow}>
                  <Text style={s.muted}>Eşik:</Text>
                  <TextInput style={s.smallInput} keyboardType="numeric" defaultValue={String(r.threshold ?? '')}
                    onEndEditing={e => setRuleThreshold(r, e.nativeEvent.text)} />
                  <Text style={s.muted}>{r.kind === 'demand_exceeded' ? 'kW' : r.kind === 'reverse_flow' ? 'kWh' : '%'}</Text>
                </View>
              )}
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {(Object.keys(KIND_LABELS) as OsosAlarmKind[]).map(k => (
              <TouchableOpacity key={k} style={s.addRuleBtn} onPress={() => addRule(k)}>
                <Ionicons name="add" size={12} color="#0ea5e9" />
                <Text style={s.addRuleT}>{KIND_LABELS[k]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* AÇIK ALARMLAR */}
        <Section title={`Açık Alarmlar (${alarms.length})`}>
          {alarms.length === 0 && <Text style={s.muted}>Tüm sistemler temiz.</Text>}
          {alarms.slice(0, 25).map(a => (
            <View key={a.id} style={[s.alarmCard, { borderLeftColor: SEV_COLOR[a.severity] }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.alarmTitle}>{a.meterNo} · {KIND_LABELS[a.kind]}</Text>
                <Text style={s.alarmMsg}>{a.message}</Text>
                <Text style={s.alarmMeta}>{new Date(a.detectedAt).toLocaleString('tr-TR')}</Text>
              </View>
              <TouchableOpacity onPress={async () => { await acknowledgeAlarm(a.id, 'me'); refresh(); }} style={s.iconBtn}>
                <Ionicons name="checkmark" size={16} color="#22c55e" />
              </TouchableOpacity>
            </View>
          ))}
        </Section>

        {/* GÜNLÜK ÖZET */}
        {lastSummary && (
          <Section title={`Günlük Özet — ${lastSummary.date}`}>
            <Text style={s.kv}>Aktif sayaç: <Text style={s.kvV}>{lastSummary.meterCount}</Text></Text>
            <Text style={s.kv}>Okuma: <Text style={s.kvV}>{lastSummary.totalReadings}</Text></Text>
            <Text style={s.kv}>Çekiş: <Text style={s.kvV}>{lastSummary.totalImportKwh.toLocaleString('tr-TR')} kWh</Text></Text>
            <Text style={s.kv}>Veriş: <Text style={s.kvV}>{lastSummary.totalExportKwh.toLocaleString('tr-TR')} kWh</Text></Text>
            <Text style={s.kv}>Tepe demand: <Text style={s.kvV}>{lastSummary.peakDemandKw.toFixed(1)} kW</Text></Text>
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionT}>{title}</Text>
      {children}
    </View>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <View>{children}</View>
    </View>
  );
}
function Pill({ label, color, icon }: { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[s.pill, { borderColor: color, backgroundColor: color + '22' }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[s.pillT, { color }]}>{label}</Text>
    </View>
  );
}
function ChipList({ items, onRemove, color }: { items: string[]; onRemove: (v: string) => void; color: string }) {
  if (!items.length) return <Text style={s.muted}>Henüz alıcı eklenmedi.</Text>;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {items.map(v => (
        <View key={v} style={[s.chip, { borderColor: color, backgroundColor: color + '18' }]}>
          <Text style={[s.chipT, { color }]} numberOfLines={1}>{v}</Text>
          <TouchableOpacity onPress={() => onRemove(v)}><Ionicons name="close" size={12} color={color} /></TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.md },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#eab308', borderRadius: radius.md },
  heroIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroT: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroS: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  statusRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  pillT: { fontSize: 11, fontWeight: '700' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.sm },
  btnT: { color: '#fff', fontWeight: '700', fontSize: typography.xs },
  section: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, gap: 8 },
  sectionT: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { color: colors.text.primary, fontSize: typography.xs },
  smallInput: { backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 6, color: colors.text.primary, minWidth: 60, textAlign: 'right' },
  input: { flex: 1, backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 8, color: colors.text.primary, fontSize: typography.xs },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  addBtn: { backgroundColor: '#eab308', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, maxWidth: 220 },
  chipT: { fontSize: 11, fontWeight: '700' },
  ruleCard: { padding: spacing.sm, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, gap: 6, backgroundColor: colors.bg.primary },
  ruleTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.xs },
  ruleNote: { color: colors.text.muted, fontSize: 11, marginTop: 2 },
  sevPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, borderWidth: 1 },
  sevPillT: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  iconBtn: { padding: 6, borderRadius: radius.sm },
  thRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addRuleBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, borderColor: '#0ea5e9', backgroundColor: '#0ea5e922' },
  addRuleT: { color: '#0ea5e9', fontSize: 10, fontWeight: '700' },
  alarmCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.sm, borderRadius: radius.sm, borderLeftWidth: 4, backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary },
  alarmTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.xs },
  alarmMsg: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  alarmMeta: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
  kv: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  kvV: { color: colors.text.primary, fontWeight: '700' },
  muted: { color: colors.text.muted, fontSize: typography.xs },
});
