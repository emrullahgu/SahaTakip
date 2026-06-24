// DepartmentFormScreen — POZ-DEV-353
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { listDepartments, saveDepartment } from '../services/governance';
import type { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'DepartmentForm'>;
type R = RouteProp<RootStackParamList, 'DepartmentForm'>;

export default function DepartmentFormScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const id = route.params?.departmentId;
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | undefined>();
  const [managerId, setManagerId] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      if (!id) return;
      const all = await listDepartments();
      const d = all.find(x => x.id === id);
      if (d) { setName(d.name); setParentId(d.parentId); setManagerId(d.managerId); }
    })();
  }, [id]);

  const save = async () => {
    if (!name.trim()) { Alert.alert('Eksik', 'Departman adı zorunlu.'); return; }
    await saveDepartment({ id, name: name.trim(), parentId, managerId });
    nav.goBack();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.label}>Departman Adı *</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Saha Operasyon" placeholderTextColor={colors.text.faint} />

        <Text style={s.label}>Üst Departman ID (opsiyonel)</Text>
        <TextInput style={s.input} value={parentId || ''} onChangeText={t => setParentId(t || undefined)} placeholder="dept_xxx" placeholderTextColor={colors.text.faint} />

        <Text style={s.label}>Yönetici Kullanıcı ID (opsiyonel)</Text>
        <TextInput style={s.input} value={managerId || ''} onChangeText={t => setManagerId(t || undefined)} placeholder="user_xxx" placeholderTextColor={colors.text.faint} />

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
