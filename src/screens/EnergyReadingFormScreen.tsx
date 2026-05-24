// EnergyReadingFormScreen — POZ-DEV-083 (sayaç + pano) + POZ-DEV-084 (trafo + GES)
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAppContext } from '../context/AppContext';
import { createReading, getReading, updateReading, READING_KINDS } from '../services/energyReadings';
import { getAsset } from '../services/assets';
import { EnergyReading, EnergyReadingKind, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EnergyReadingForm'>;
type RP = RouteProp<RootStackParamList, 'EnergyReadingForm'>;

export default function EnergyReadingFormScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RP>();
  const { employees } = useAppContext();
  const readingId = route.params?.readingId;
  const initialAssetId = route.params?.assetId;

  const [editing, setEditing] = useState<EnergyReading | null>(null);
  const [kind, setKind] = useState<EnergyReadingKind>(route.params?.kind || 'meter');
  const [assetId, setAssetId] = useState<string | undefined>(initialAssetId);
  const [assetName, setAssetName] = useState<string>('');
  const [inspectorId, setInspectorId] = useState<string | undefined>();
  const [v, setV] = useState<Partial<EnergyReading>>({});
  const [notes, setNotes] = useState('');

  useEffect(() => {
    (async () => {
      if (readingId) {
        const r = await getReading(readingId);
        if (r) {
          setEditing(r);
          setKind(r.kind);
          setAssetId(r.assetId);
          setAssetName(r.assetName || '');
          setInspectorId(r.inspectorId);
          setV(r);
          setNotes(r.notes || '');
        }
      } else if (initialAssetId) {
        const a = await getAsset(initialAssetId);
        if (a) setAssetName(a.name);
      }
    })();
  }, [readingId, initialAssetId]);

  const set = (patch: Partial<EnergyReading>) => setV({ ...v, ...patch });
  const num = (s: string | undefined) => {
    if (s === undefined || s === '') return undefined;
    const n = Number(String(s).replace(',', '.'));
    return Number.isFinite(n) ? n : undefined;
  };

  const onSave = async () => {
    const insp = employees.find(e => e.id === inspectorId);
    const payload = {
      ...v,
      kind,
      assetId,
      assetName: assetName || undefined,
      inspectorId,
      inspectorName: insp?.name,
      date: v.date || new Date().toISOString(),
      notes: notes.trim() || undefined,
    } as Omit<EnergyReading, 'id' | 'createdAt'>;
    if (editing) {
      await updateReading(editing.id, payload);
    } else {
      await createReading(payload);
    }
    Alert.alert('Kayıt', 'Ölçüm kaydedildi.', [{ text: 'Tamam', onPress: () => nav.goBack() }]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Tip</Text>
        <View style={styles.grid}>
          {READING_KINDS.map(k => {
            const active = k.value === kind;
            return (
              <TouchableOpacity key={k.value} style={[styles.btn, active && styles.btnActive]} onPress={() => setKind(k.value)}>
                <Ionicons name={k.icon as any} size={13} color={active ? '#fff' : colors.text.muted} />
                <Text style={[styles.btnText, active && styles.btnTextActive]}>{k.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {assetName ? (
          <View style={styles.assetBadge}>
            <Ionicons name="cube-outline" size={14} color={brand.green} />
            <Text style={styles.assetText}>{assetName}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Operatör</Text>
        <View style={styles.grid}>
          {employees.map(e => {
            const active = e.id === inspectorId;
            return (
              <TouchableOpacity key={e.id} style={[styles.btn, active && styles.btnActive]} onPress={() => setInspectorId(e.id)}>
                <Text style={[styles.btnText, active && styles.btnTextActive]}>{e.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {kind === 'meter' && (
          <>
            <SectionTitle title="Sayaç Değerleri" icon="speedometer-outline" />
            <NumField label="Aktif Endeks (kWh)" value={v.meterActiveKwh} onChange={x => set({ meterActiveKwh: num(x) })} />
            <NumField label="Reaktif Endeks (kVArh)" value={v.meterReactiveKvarh} onChange={x => set({ meterReactiveKvarh: num(x) })} />
            <NumField label="Talep / Demand (kW)" value={v.meterDemandKw} onChange={x => set({ meterDemandKw: num(x) })} />
          </>
        )}

        {kind === 'panel' && (
          <>
            <SectionTitle title="Pano Ölçüm" icon="grid-outline" />
            <NumField label="L1 Gerilim (V)" value={v.panelVoltageL1} onChange={x => set({ panelVoltageL1: num(x) })} />
            <NumField label="L2 Gerilim (V)" value={v.panelVoltageL2} onChange={x => set({ panelVoltageL2: num(x) })} />
            <NumField label="L3 Gerilim (V)" value={v.panelVoltageL3} onChange={x => set({ panelVoltageL3: num(x) })} />
            <NumField label="L1 Akım (A)" value={v.panelCurrentL1} onChange={x => set({ panelCurrentL1: num(x) })} />
            <NumField label="L2 Akım (A)" value={v.panelCurrentL2} onChange={x => set({ panelCurrentL2: num(x) })} />
            <NumField label="L3 Akım (A)" value={v.panelCurrentL3} onChange={x => set({ panelCurrentL3: num(x) })} />
            <NumField label="Cos φ" value={v.panelPowerFactor} onChange={x => set({ panelPowerFactor: num(x) })} />
            <NumField label="Sıcaklık (°C)" value={v.panelTempC} onChange={x => set({ panelTempC: num(x) })} />
          </>
        )}

        {kind === 'transformer' && (
          <>
            <SectionTitle title="Trafo Bakım" icon="flash-outline" />
            <NumField label="Yağ Sıcaklığı (°C)" value={v.trafoOilTempC} onChange={x => set({ trafoOilTempC: num(x) })} />
            <NumField label="Sargı Sıcaklığı (°C)" value={v.trafoWindingTempC} onChange={x => set({ trafoWindingTempC: num(x) })} />
            <Text style={styles.label}>Yağ Seviyesi</Text>
            <View style={styles.grid}>
              {(['low','normal','high'] as const).map(s => {
                const active = v.trafoOilLevel === s;
                return (
                  <TouchableOpacity key={s} style={[styles.btn, active && styles.btnActive]} onPress={() => set({ trafoOilLevel: s })}>
                    <Text style={[styles.btnText, active && styles.btnTextActive]}>
                      {s === 'low' ? 'Düşük' : s === 'normal' ? 'Normal' : 'Yüksek'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.label}>Silika Jel Rengi</Text>
            <View style={styles.grid}>
              {(['blue','pink','mixed'] as const).map(s => {
                const active = v.trafoSilicaGel === s;
                return (
                  <TouchableOpacity key={s} style={[styles.btn, active && styles.btnActive]} onPress={() => set({ trafoSilicaGel: s })}>
                    <Text style={[styles.btnText, active && styles.btnTextActive]}>
                      {s === 'blue' ? 'Mavi' : s === 'pink' ? 'Pembe' : 'Karışık'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <SwitchRow label="Buchholz rölesi OK" value={!!v.trafoBuchholzOk} onChange={b => set({ trafoBuchholzOk: b })} />
            <SwitchRow label="Topraklama OK" value={!!v.trafoGroundingOk} onChange={b => set({ trafoGroundingOk: b })} />
          </>
        )}

        {kind === 'ges' && (
          <>
            <SectionTitle title="GES Saha Ölçüm" icon="sunny-outline" />
            <NumField label="DC Gerilim (V)" value={v.gesDcVoltage} onChange={x => set({ gesDcVoltage: num(x) })} />
            <NumField label="AC Gerilim (V)" value={v.gesAcVoltage} onChange={x => set({ gesAcVoltage: num(x) })} />
            <NumField label="Anlık Güç (kW)" value={v.gesPowerKw} onChange={x => set({ gesPowerKw: num(x) })} />
            <NumField label="Toplam Enerji (kWh)" value={v.gesEnergyTotalKwh} onChange={x => set({ gesEnergyTotalKwh: num(x) })} />
            <NumField label="Işınım (W/m²)" value={v.gesIrradiance} onChange={x => set({ gesIrradiance: num(x) })} />
            <NumField label="Panel Sıcaklığı (°C)" value={v.gesPanelTempC} onChange={x => set({ gesPanelTempC: num(x) })} />
          </>
        )}

        <Text style={styles.label}>Notlar</Text>
        <TextInput
          style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
          multiline value={notes} onChangeText={setNotes}
          placeholder="Açıklama" placeholderTextColor={colors.text.faint}
        />

        <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
          <Ionicons name="save-outline" size={16} color="#fff" />
          <Text style={styles.saveText}>{editing ? 'Güncelle' : 'Kaydet'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: string) => void }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input} keyboardType="decimal-pad"
        value={value === undefined ? '' : String(value)}
        onChangeText={onChange}
        placeholder="0" placeholderTextColor={colors.text.faint}
      />
    </>
  );
}

function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (b: boolean) => void }) {
  return (
    <View style={styles.swRow}>
      <Text style={styles.swLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.border.primary, true: brand.green }} />
    </View>
  );
}

function SectionTitle({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={styles.sectTitle}>
      <Ionicons name={icon as any} size={14} color={brand.green} />
      <Text style={styles.sectTitleText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  label: { color: colors.text.muted, fontSize: typography.xs, marginTop: spacing.sm, marginBottom: 4 },
  input: {
    backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary,
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10,
    color: colors.text.primary, fontSize: typography.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary,
  },
  btnActive: { backgroundColor: brand.blueLight, borderColor: brand.blueLight },
  btnText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  btnTextActive: { color: '#fff' },
  assetBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.emerald.bg, borderWidth: 1, borderColor: colors.emerald.border,
    borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6, marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  assetText: { color: brand.green, fontSize: typography.xs, fontWeight: '700' },
  swRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary,
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, marginTop: 6,
  },
  swLabel: { color: colors.text.primary, fontSize: typography.sm },
  sectTitle: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg, marginBottom: 4,
  },
  sectTitleText: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  saveBtn: {
    flexDirection: 'row', backgroundColor: brand.green, paddingVertical: 12,
    borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: spacing.lg,
  },
  saveText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
});
