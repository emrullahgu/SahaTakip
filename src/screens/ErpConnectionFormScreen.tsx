// ErpConnectionFormScreen — POZ-DEV-455
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, ErpVendor } from '../types';
import { colors, spacing, radius, typography } from '../theme';
import { listConnections, saveConnection, ERP_VENDOR_LABEL, ERP_VENDOR_COLOR } from '../services/enterpriseIntegrations';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'ErpConnectionForm'>;

const VENDORS: ErpVendor[] = ['logo', 'mikro', 'netsis', 'custom'];

export default function ErpConnectionFormScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const id = route.params?.connectionId;
  const [vendor, setVendor] = useState<ErpVendor>('logo');
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    (async () => {
      if (!id) return;
      const all = await listConnections();
      const c = all.find(x => x.id === id);
      if (c) { setVendor(c.vendor); setName(c.name); setBaseUrl(c.baseUrl || ''); setApiKey(c.apiKey || ''); }
    })();
  }, [id]);

  const save = async () => {
    if (!name.trim()) { Alert.alert('Eksik', 'Ad gerekli'); return; }
    await saveConnection({ id, vendor, name: name.trim(), baseUrl: baseUrl.trim() || undefined, apiKey: apiKey.trim() || undefined });
    nav.goBack();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <View>
          <Text style={s.l}>ERP Sağlayıcısı</Text>
          <View style={s.chips}>
            {VENDORS.map(v => (
              <TouchableOpacity key={v} onPress={() => setVendor(v)} style={[s.chip, { borderColor: ERP_VENDOR_COLOR[v] }, vendor === v && { backgroundColor: ERP_VENDOR_COLOR[v] }]}>
                <Text style={[s.chipT, vendor === v && { color: '#fff' }]}>{ERP_VENDOR_LABEL[v]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View>
          <Text style={s.l}>Ad *</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Bağlantı adı" placeholderTextColor={colors.text.faint} style={s.input} />
        </View>
        <View>
          <Text style={s.l}>Base URL</Text>
          <TextInput value={baseUrl} onChangeText={setBaseUrl} placeholder="https://" placeholderTextColor={colors.text.faint} autoCapitalize="none" style={s.input} />
        </View>
        <View>
          <Text style={s.l}>API Anahtarı</Text>
          <TextInput value={apiKey} onChangeText={setApiKey} placeholder="sk_..." placeholderTextColor={colors.text.faint} autoCapitalize="none" secureTextEntry style={s.input} />
        </View>
        <TouchableOpacity onPress={save} style={s.save}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={s.saveT}>Kaydet</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  l: { color: colors.text.muted, fontSize: typography.xs, marginBottom: 6 },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, backgroundColor: colors.bg.secondary },
  chipT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  input: { backgroundColor: colors.bg.secondary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, fontSize: typography.sm },
  save: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#22c55e', padding: spacing.md, borderRadius: radius.md, marginTop: spacing.sm },
  saveT: { color: '#fff', fontSize: typography.sm, fontWeight: '800' },
});
