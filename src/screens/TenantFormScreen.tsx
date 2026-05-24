// TenantFormScreen — Faz 40
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, PackagePlan, TenantStatus } from '../types';
import { colors, spacing, radius, typography } from '../theme';
import { listTenants, saveTenant, PLAN_LABEL, PLAN_COLOR, TENANT_STATUS_LABEL, TENANT_STATUS_COLOR } from '../services/platform';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'TenantForm'>;

const PLANS: PackagePlan[] = ['starter', 'pro', 'enterprise'];
const STATUSES: TenantStatus[] = ['active', 'trial', 'suspended', 'expired'];

export default function TenantFormScreen() {
  const nav = useNavigation<Nav>();
  const r = useRoute<R>();
  const id = r.params?.tenantId;
  const [name, setName] = useState('');
  const [plan, setPlan] = useState<PackagePlan>('starter');
  const [status, setStatus] = useState<TenantStatus>('trial');

  useEffect(() => { (async () => {
    if (!id) return;
    const t = (await listTenants()).find(x => x.id === id);
    if (t) { setName(t.name); setPlan(t.plan); setStatus(t.status); }
  })(); }, [id]);

  const save = async () => {
    if (!name.trim()) { Alert.alert('Eksik', 'Ad gerekli'); return; }
    await saveTenant({ id, name: name.trim(), plan, status });
    nav.goBack();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <View>
          <Text style={s.l}>Firma Adı *</Text>
          <TextInput value={name} onChangeText={setName} placeholder="ABC Mühendislik A.Ş." placeholderTextColor={colors.text.faint} style={s.input} />
        </View>
        <View>
          <Text style={s.l}>Paket</Text>
          <View style={s.chips}>
            {PLANS.map(p => (
              <TouchableOpacity key={p} onPress={() => setPlan(p)} style={[s.chip, { borderColor: PLAN_COLOR[p] }, plan === p && { backgroundColor: PLAN_COLOR[p] }]}>
                <Text style={[s.chipT, plan === p && { color: '#fff' }]}>{PLAN_LABEL[p]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View>
          <Text style={s.l}>Durum</Text>
          <View style={s.chips}>
            {STATUSES.map(st => (
              <TouchableOpacity key={st} onPress={() => setStatus(st)} style={[s.chip, { borderColor: TENANT_STATUS_COLOR[st] }, status === st && { backgroundColor: TENANT_STATUS_COLOR[st] }]}>
                <Text style={[s.chipT, status === st && { color: '#fff' }]}>{TENANT_STATUS_LABEL[st]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <TouchableOpacity onPress={save} style={s.save}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={s.saveT}>Kaydet</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  l: { color: colors.text.muted, fontSize: typography.xs, marginBottom: 6 },
  input: { backgroundColor: colors.bg.secondary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, fontSize: typography.sm },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, backgroundColor: colors.bg.secondary },
  chipT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  save: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#22c55e', padding: spacing.md, borderRadius: radius.md },
  saveT: { color: '#fff', fontSize: typography.sm, fontWeight: '800' },
});
