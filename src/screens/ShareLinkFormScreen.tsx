// ShareLinkFormScreen — POZ-DEV-404
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, ShareLinkResource } from '../types';
import { getShareLink, saveShareLink, LINK_RESOURCE_LABEL } from '../services/customerExperience';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'ShareLinkForm'>;

const RESOURCES: ShareLinkResource[] = ['quote', 'work_order', 'report', 'document'];

export default function ShareLinkFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const linkId = route.params?.linkId;

  const [title, setTitle] = useState('');
  const [resource, setResource] = useState<ShareLinkResource>('quote');
  const [resourceId, setResourceId] = useState('');
  const [expiresDays, setExpiresDays] = useState('7');
  const [maxOpens, setMaxOpens] = useState('');
  const [password, setPassword] = useState('');
  const [customerId, setCustomerId] = useState('');

  useEffect(() => {
    if (!linkId) return;
    (async () => {
      const l = await getShareLink(linkId);
      if (l) {
        setTitle(l.title); setResource(l.resource); setResourceId(l.resourceId);
        if (l.expiresAt) {
          const days = Math.round((new Date(l.expiresAt).getTime() - Date.now()) / 86400000);
          setExpiresDays(String(Math.max(0, days)));
        }
        setMaxOpens(l.maxOpens ? String(l.maxOpens) : '');
        setPassword(l.password || '');
        setCustomerId(l.customerId || '');
      }
    })();
  }, [linkId]);

  const save = async () => {
    if (!title.trim() || !resourceId.trim()) { Alert.alert('Eksik', 'Başlık ve kaynak ID gerekli.'); return; }
    const days = parseInt(expiresDays, 10);
    const expiresAt = !isNaN(days) && days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : undefined;
    await saveShareLink({
      id: linkId, title: title.trim(), resource, resourceId: resourceId.trim(), expiresAt,
      maxOpens: maxOpens.trim() ? parseInt(maxOpens, 10) : undefined,
      password: password.trim() || undefined,
      customerId: customerId.trim() || undefined,
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}>
        <Text style={s.label}>Başlık *</Text>
        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Teklif 2024-001 paylaşımı" placeholderTextColor={colors.text.faint} />
        <Text style={s.label}>Kaynak Türü</Text>
        <View style={s.chips}>
          {RESOURCES.map(r => (
            <TouchableOpacity key={r} onPress={() => setResource(r)} style={[s.chip, resource === r && s.chipOn]}>
              <Text style={[s.chipT, resource === r && s.chipTOn]}>{LINK_RESOURCE_LABEL[r]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.label}>Kaynak ID *</Text>
        <TextInput style={s.input} value={resourceId} onChangeText={setResourceId} placeholder="quote_id veya iş emri id" placeholderTextColor={colors.text.faint} />
        <Text style={s.label}>Süre (gün, 0 = süresiz)</Text>
        <TextInput style={s.input} value={expiresDays} onChangeText={setExpiresDays} keyboardType="number-pad" />
        <Text style={s.label}>Max Açılım (boş = sınırsız)</Text>
        <TextInput style={s.input} value={maxOpens} onChangeText={setMaxOpens} keyboardType="number-pad" />
        <Text style={s.label}>Şifre (opsiyonel)</Text>
        <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="4-8 karakter" placeholderTextColor={colors.text.faint} />
        <Text style={s.label}>Müşteri ID (opsiyonel)</Text>
        <TextInput style={s.input} value={customerId} onChangeText={setCustomerId} />

        <TouchableOpacity style={s.saveBtn} onPress={save}>
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
  label: { color: colors.text.muted, fontSize: typography.sm, marginTop: spacing.sm, marginBottom: 4, fontWeight: '600' },
  input: { backgroundColor: colors.bg.secondary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, fontSize: typography.base },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipOn: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  chipT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '600' },
  chipTOn: { color: '#fff' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: '#22c55e', padding: spacing.md, borderRadius: radius.md, marginTop: spacing.lg },
  saveT: { color: '#fff', fontSize: typography.md, fontWeight: '700' },
});
