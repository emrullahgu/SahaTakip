// AiSettingsScreen — sağlayıcı + apiKey + model
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import { AI_PROVIDER_LABEL, getAiSettings, setAiSettings } from '../services/ai';
import { AiProvider, AiSettings } from '../types';

const PROVIDERS: AiProvider[] = ['mock', 'openai', 'claude', 'gemini'];

const HINTS: Record<AiProvider, { defaultModel: string; help: string }> = {
  mock: { defaultModel: '—', help: 'Tüm AI çıktıları yerel demo verisi olur. API gerekmez.' },
  openai: { defaultModel: 'gpt-4o-mini', help: 'platform.openai.com adresinden API anahtarı alın.' },
  claude: { defaultModel: 'claude-3-5-sonnet-20241022', help: 'console.anthropic.com adresinden API anahtarı alın.' },
  gemini: { defaultModel: 'gemini-1.5-flash', help: 'aistudio.google.com adresinden API anahtarı alın.' },
};

export default function AiSettingsScreen() {
  const nav = useNavigation();
  const [provider, setProvider] = useState<AiProvider>('mock');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await getAiSettings();
      setProvider(s.provider);
      setApiKey(s.apiKey || '');
      setModel(s.model || '');
    })();
  }, []);

  const onSave = async () => {
    const payload: AiSettings = {
      provider,
      apiKey: apiKey.trim() || undefined,
      model: model.trim() || undefined,
    };
    if (provider !== 'mock' && !payload.apiKey) {
      Alert.alert('Eksik', 'API anahtarı girin veya Demo sağlayıcısını seçin.');
      return;
    }
    await setAiSettings(payload);
    Alert.alert('Kaydedildi', 'AI ayarları güncellendi.');
    nav.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Sağlayıcı</Text>
        <View style={styles.providerGrid}>
          {PROVIDERS.map(p => {
            const active = provider === p;
            return (
              <TouchableOpacity key={p} style={[styles.pCard, active && styles.pCardActive]} onPress={() => setProvider(p)}>
                <Ionicons
                  name={p === 'openai' ? 'sparkles' : p === 'claude' ? 'flash' : p === 'gemini' ? 'planet-outline' : 'flask-outline'}
                  size={20}
                  color={active ? '#fff' : colors.text.muted}
                />
                <Text style={[styles.pName, active && styles.pNameActive]}>{AI_PROVIDER_LABEL[p]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.helpBox}>
          <Ionicons name="information-circle-outline" size={14} color="#a78bfa" />
          <Text style={styles.helpText}>{HINTS[provider].help}</Text>
        </View>

        {provider !== 'mock' && (
          <>
            <Text style={styles.label}>API Anahtarı</Text>
            <View style={styles.keyRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder={provider === 'openai' ? 'sk-...' : provider === 'claude' ? 'sk-ant-...' : 'AIza...'}
                placeholderTextColor={colors.text.faint}
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowKey(!showKey)}>
                <Ionicons name={showKey ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.text.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.note}>Anahtar yalnızca cihazda saklanır (AsyncStorage).</Text>

            <Text style={styles.label}>Model</Text>
            <TextInput
              style={styles.input}
              value={model}
              onChangeText={setModel}
              placeholder={HINTS[provider].defaultModel}
              placeholderTextColor={colors.text.faint}
              autoCapitalize="none"
            />
            <Text style={styles.note}>Boş bırakırsanız varsayılan model kullanılır.</Text>
          </>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
          <Ionicons name="save-outline" size={16} color="#fff" />
          <Text style={styles.saveText}>Kaydet</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  label: { color: colors.text.muted, fontSize: typography.xs, marginTop: spacing.md, marginBottom: 6, fontWeight: '700' },
  providerGrid: { flexDirection: 'row', gap: 6 },
  pCard: { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary, alignItems: 'center', gap: 6 },
  pCardActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  pName: { color: colors.text.primary, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  pNameActive: { color: '#fff' },
  helpBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', padding: spacing.sm, backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: radius.sm, marginTop: spacing.sm, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' },
  helpText: { flex: 1, color: '#a78bfa', fontSize: 11, lineHeight: 16 },
  keyRow: { flexDirection: 'row', gap: 6 },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: colors.text.primary, fontSize: typography.sm },
  eyeBtn: { width: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  note: { color: colors.text.faint, fontSize: 11, marginTop: 4 },
  saveBtn: { flexDirection: 'row', backgroundColor: brand.green, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.lg },
  saveText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
});
