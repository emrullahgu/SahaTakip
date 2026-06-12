// RegionFormScreen — POZ-DEV-355
import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { listRegions, saveRegion } from '../services/governance';
import type { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'RegionForm'>;
type R = RouteProp<RootStackParamList, 'RegionForm'>;

export default function RegionFormScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const id = route.params?.regionId;
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [citiesTxt, setCitiesTxt] = useState('');

  useEffect(() => {
    (async () => {
      if (!id) return;
      const all = await listRegions();
      const r = all.find(x => x.id === id);
      if (r) { setName(r.name); setCode(r.code || ''); setCitiesTxt((r.cities || []).join(', ')); }
    })();
  }, [id]);

  const save = async () => {
    if (!name.trim()) { Alert.alert('Eksik', 'Bölge adı zorunlu.'); return; }
    const cities = citiesTxt.split(',').map(s => s.trim()).filter(Boolean);
    await saveRegion({ id, name: name.trim(), code: code.trim() || undefined, cities });
    nav.goBack();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.label}>Bölge Adı *</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Marmara" placeholderTextColor={colors.text.faint} />

        <Text style={s.label}>Kod (opsiyonel)</Text>
        <TextInput style={s.input} value={code} onChangeText={setCode} placeholder="MAR" placeholderTextColor={colors.text.faint} />

        <Text style={s.label}>Şehirler (virgülle)</Text>
        <TextInput style={s.input} value={citiesTxt} onChangeText={setCitiesTxt} placeholder="İstanbul, Kocaeli, Bursa" placeholderTextColor={colors.text.faint} multiline />

        <TouchableOpacity style={s.saveBtn} onPress={save}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={s.saveTxt}>Kaydet</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, gap: spacing.sm },
  label: { color: colors.text.muted, fontSize: typography.sm, marginTop: spacing.sm },
  input: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.md, color: colors.text.primary, borderWidth: 1, borderColor: colors.border.primary },
  saveBtn: { marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#22c55e', borderRadius: radius.md, padding: spacing.md },
  saveTxt: { color: '#fff', fontWeight: '800', fontSize: typography.md },
});
