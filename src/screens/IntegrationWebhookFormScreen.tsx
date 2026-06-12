// IntegrationWebhookFormScreen — POZ-DEV-463
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { colors, spacing, radius, typography } from '../theme';
import { listWebhooksV2, saveWebhookV2, WEBHOOK_EVENTS } from '../services/enterpriseIntegrations';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'IntegrationWebhookForm'>;

export default function IntegrationWebhookFormScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const id = route.params?.webhookId;
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [event, setEvent] = useState<string>(WEBHOOK_EVENTS[0]);
  const [secret, setSecret] = useState('');

  useEffect(() => {
    (async () => {
      if (!id) return;
      const all = await listWebhooksV2();
      const w = all.find(x => x.id === id);
      if (w) { setName(w.name); setUrl(w.url); setEvent(w.event); setSecret(w.secret || ''); }
    })();
  }, [id]);

  const save = async () => {
    if (!name.trim() || !url.trim()) { Alert.alert('Eksik', 'Ad ve URL gerekli'); return; }
    await saveWebhookV2({ id, name: name.trim(), url: url.trim(), event, secret: secret.trim() || undefined });
    nav.goBack();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <View>
          <Text style={s.l}>Ad *</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Webhook adı" placeholderTextColor={colors.text.faint} style={s.input} />
        </View>
        <View>
          <Text style={s.l}>URL *</Text>
          <TextInput value={url} onChangeText={setUrl} placeholder="https://" placeholderTextColor={colors.text.faint} autoCapitalize="none" style={s.input} />
        </View>
        <View>
          <Text style={s.l}>Olay</Text>
          <View style={s.chips}>
            {WEBHOOK_EVENTS.map(e => (
              <TouchableOpacity key={e} onPress={() => setEvent(e)} style={[s.chip, event === e && { backgroundColor: '#eab308' }]}>
                <Text style={[s.chipT, event === e && { color: '#fff' }]}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View>
          <Text style={s.l}>Secret (imzalama)</Text>
          <TextInput value={secret} onChangeText={setSecret} placeholder="opsiyonel" placeholderTextColor={colors.text.faint} autoCapitalize="none" secureTextEntry style={s.input} />
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
  input: { backgroundColor: colors.bg.secondary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, fontSize: typography.sm },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#eab308', backgroundColor: colors.bg.secondary },
  chipT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  save: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#22c55e', padding: spacing.md, borderRadius: radius.md },
  saveT: { color: '#fff', fontSize: typography.sm, fontWeight: '800' },
});
