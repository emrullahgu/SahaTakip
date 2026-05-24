// CustomerNotificationPrefsScreen — POZ-DEV-410
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, CustomerNotificationPref } from '../types';
import { getCustomerNotifPref, saveCustomerNotifPref } from '../services/customerExperience';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'CustomerNotificationPrefs'>;

export default function CustomerNotificationPrefsScreen() {
  const navigation = useNavigation<Nav>();
  const { customerId } = useRoute<R>().params;
  const [pref, setPref] = useState<CustomerNotificationPref | null>(null);

  const load = useCallback(async () => { setPref(await getCustomerNotifPref(customerId)); }, [customerId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!pref) return <SafeAreaView style={s.safe}><Text style={s.empty}>Yükleniyor...</Text></SafeAreaView>;

  const set = <K extends keyof CustomerNotificationPref>(k: K, v: CustomerNotificationPref[K]) => setPref(p => p ? { ...p, [k]: v } : p);
  const save = async () => { if (pref) { await saveCustomerNotifPref(pref); navigation.goBack(); } };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}>
        <Text style={s.section}>Kanallar</Text>
        <Tog l="E-posta" v={pref.emailEnabled} on={v => set('emailEnabled', v)} />
        <Tog l="SMS" v={pref.smsEnabled} on={v => set('smsEnabled', v)} />
        <Tog l="WhatsApp" v={pref.whatsappEnabled} on={v => set('whatsappEnabled', v)} />
        <Tog l="Mobil push" v={pref.pushEnabled} on={v => set('pushEnabled', v)} />

        <Text style={s.section}>Bildirim Konuları</Text>
        <Tog l="Aylık rapor" v={pref.monthlyReport} on={v => set('monthlyReport', v)} />
        <Tog l="Servis tamamlandı" v={pref.serviceCompleted} on={v => set('serviceCompleted', v)} />
        <Tog l="Teklif gönderildi" v={pref.quoteSent} on={v => set('quoteSent', v)} />
        <Tog l="Ödeme hatırlatma" v={pref.paymentReminder} on={v => set('paymentReminder', v)} />

        <TouchableOpacity style={s.saveBtn} onPress={save}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={s.saveT}>Kaydet</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Tog({ l, v, on }: { l: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <View style={s.tog}>
      <Text style={s.togT}>{l}</Text>
      <Switch value={v} onValueChange={on} trackColor={{ false: '#334155', true: '#06b6d4' }} thumbColor="#fff" />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  section: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.sm },
  tog: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, marginBottom: 6 },
  togT: { color: colors.text.primary, fontSize: typography.sm },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: '#22c55e', padding: spacing.md, borderRadius: radius.md, marginTop: spacing.lg },
  saveT: { color: '#fff', fontSize: typography.md, fontWeight: '700' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 60 },
});
