// PortalUserFormScreen — POZ-DEV-402
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Alert, KeyboardAvoidingView, Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList } from '../types';
import { getPortalUser, savePortalUser } from '../services/customerExperience';
import { email as emailValidator, phoneTR } from '../utils/validators';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'PortalUserForm'>;

export default function PortalUserFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const userId = route.params?.userId;
  const customerIdFromRoute = route.params?.customerId;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [customerId, setCustomerId] = useState(customerIdFromRoute || '');
  const [canViewQuotes, setCanViewQuotes] = useState(true);
  const [canViewWorkOrders, setCanViewWorkOrders] = useState(true);
  const [canViewReports, setCanViewReports] = useState(false);
  const [canApproveQuotes, setCanApproveQuotes] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const u = await getPortalUser(userId);
      if (u) {
        setFullName(u.fullName); setEmail(u.email); setPhone(u.phone || '');
        setCustomerId(u.customerId);
        setCanViewQuotes(u.canViewQuotes); setCanViewWorkOrders(u.canViewWorkOrders);
        setCanViewReports(u.canViewReports); setCanApproveQuotes(u.canApproveQuotes);
      }
    })();
  }, [userId]);

  const save = async () => {
    if (!fullName.trim() || !email.trim()) { Alert.alert('Eksik', 'Ad ve e-posta zorunlu.'); return; }
    const fieldError = emailValidator(email) || phoneTR(phone);
    if (fieldError) { Alert.alert('Geçersiz bilgi', fieldError); return; }
    await savePortalUser({ id: userId, fullName: fullName.trim(), email: email.trim(), phone: phone.trim() || undefined, customerId: customerId.trim() || 'unknown', canViewQuotes, canViewWorkOrders, canViewReports, canApproveQuotes });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}>
        <Text style={s.label}>Ad Soyad *</Text>
        <TextInput style={s.input} value={fullName} onChangeText={setFullName} placeholder="Ali Veli" placeholderTextColor={colors.text.faint} />
        <Text style={s.label}>E-posta *</Text>
        <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="ali@firma.com" placeholderTextColor={colors.text.faint} keyboardType="email-address" autoCapitalize="none" />
        <Text style={s.label}>Telefon</Text>
        <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="+90..." placeholderTextColor={colors.text.faint} keyboardType="phone-pad" />
        <Text style={s.label}>Müşteri ID</Text>
        <TextInput style={s.input} value={customerId} onChangeText={setCustomerId} placeholder="müşteri kayıt id" placeholderTextColor={colors.text.faint} />

        <Text style={[s.label, { marginTop: spacing.md }]}>İzinler</Text>
        <Toggle label="Teklif görme" value={canViewQuotes} onChange={setCanViewQuotes} />
        <Toggle label="İş emri görme" value={canViewWorkOrders} onChange={setCanViewWorkOrders} />
        <Toggle label="Rapor görme" value={canViewReports} onChange={setCanViewReports} />
        <Toggle label="Teklif onaylama" value={canApproveQuotes} onChange={setCanApproveQuotes} />

        <TouchableOpacity style={s.saveBtn} onPress={save}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={s.saveT}>Kaydet</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={s.tog}>
      <Text style={s.togT}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#334155', true: '#0ea5e9' }} thumbColor="#fff" />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  label: { color: colors.text.muted, fontSize: typography.sm, marginTop: spacing.sm, marginBottom: 4, fontWeight: '600' },
  input: { backgroundColor: colors.bg.secondary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, fontSize: typography.base },
  tog: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, marginBottom: 6, borderWidth: 1, borderColor: colors.border.primary },
  togT: { color: colors.text.primary, fontSize: typography.sm },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: '#22c55e', padding: spacing.md, borderRadius: radius.md, marginTop: spacing.lg },
  saveT: { color: '#fff', fontSize: typography.md, fontWeight: '700' },
});
