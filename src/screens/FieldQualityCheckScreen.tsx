// Faz 42 — FieldQualityCheckScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList } from '../types';
import { getQCForJob, saveQC } from '../services/fieldOps';

type R = RouteProp<RootStackParamList, 'FieldQualityCheck'>;

function Stars({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <View style={s.starWrap}>
      <Text style={s.starLabel}>{label}</Text>
      <View style={s.starRow}>
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity key={n} onPress={() => onChange(n)}>
            <Ionicons name={n <= value ? 'star' : 'star-outline'} size={32} color="#eab308" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function FieldQualityCheckScreen() {
  const route = useRoute<R>();
  const nav = useNavigation();
  const [cust, setCust] = useState(0);
  const [work, setWork] = useState(0);
  const [clean, setClean] = useState(0);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    const q = await getQCForJob(route.params.jobId);
    if (q) { setCust(q.customerScore || 0); setWork(q.workScore || 0); setClean(q.cleanlinessScore || 0); setNotes(q.notes || ''); }
  }, [route.params.jobId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const passed = cust >= 3 && work >= 3 && clean >= 3;

  const onSave = async () => {
    if (cust === 0 || work === 0 || clean === 0) {
      Alert.alert('Eksik', 'Tüm puanları girin.');
      return;
    }
    await saveQC({ jobId: route.params.jobId, customerScore: cust, workScore: work, cleanlinessScore: clean, notes, passed, reviewedBy: 'Saha Personeli' });
    Alert.alert('Kayıt', passed ? 'Kalite kontrolü geçti ✅' : 'Kalite kontrolü düşük puan ⚠️', [{ text: 'Tamam', onPress: () => nav.goBack() }]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <View style={[s.banner, { backgroundColor: passed ? '#22c55e' : '#f59e0b' }]}>
          <Ionicons name={passed ? 'checkmark-circle' : 'warning'} size={26} color="#fff" />
          <Text style={s.bannerT}>{passed ? 'Kalite Onayı OK' : 'Düşük puanlar var'}</Text>
        </View>
        <Stars value={cust} onChange={setCust} label="Müşteri Memnuniyeti" />
        <Stars value={work} onChange={setWork} label="İş Kalitesi" />
        <Stars value={clean} onChange={setClean} label="Temizlik" />
        <View>
          <Text style={s.starLabel}>Notlar</Text>
          <TextInput style={s.input} value={notes} onChangeText={setNotes} placeholder="Yorum ekleyin..." placeholderTextColor={colors.text.faint} multiline />
        </View>
        <TouchableOpacity style={s.saveBtn} onPress={onSave}>
          <Ionicons name="save" size={20} color="#fff" />
          <Text style={s.saveBtnT}>Kaydet</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
  bannerT: { color: '#fff', fontSize: typography.md, fontWeight: '800' },
  starWrap: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: spacing.sm },
  starLabel: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  starRow: { flexDirection: 'row', gap: 4, justifyContent: 'center' },
  input: { backgroundColor: colors.bg.secondary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, minHeight: 80, marginTop: 4 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#0ea5e9', padding: spacing.md, borderRadius: radius.md },
  saveBtnT: { color: '#fff', fontSize: typography.md, fontWeight: '800' },
});
