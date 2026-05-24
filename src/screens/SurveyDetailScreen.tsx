// SurveyDetailScreen — POZ-DEV-409
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, SatisfactionSurvey } from '../types';
import { getSurvey, completeSurvey, saveSurvey, SURVEY_STATUS_LABEL, SURVEY_STATUS_COLOR } from '../services/customerExperience';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'SurveyDetail'>;

function StarRow({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <View style={s.starBlock}>
      <Text style={s.label}>{label}</Text>
      <View style={s.starRow}>
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity key={n} onPress={() => onChange(value === n ? 0 : n)}>
            <Ionicons name={n <= value ? 'star' : 'star-outline'} size={26} color="#f59e0b" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function SurveyDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { surveyId } = useRoute<R>().params;
  const [survey, setSurvey] = useState<SatisfactionSurvey | undefined>();
  const [ov, setOv] = useState(0);
  const [tm, setTm] = useState(0);
  const [pr, setPr] = useState(0);
  const [cm, setCm] = useState(0);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    const sv = await getSurvey(surveyId);
    if (sv) {
      setSurvey(sv);
      setOv(sv.ratingOverall || 0); setTm(sv.ratingTimeliness || 0);
      setPr(sv.ratingProfessionalism || 0); setCm(sv.ratingCommunication || 0);
      setNotes(sv.comments || '');
    }
  }, [surveyId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!survey) return <SafeAreaView style={s.safe}><Text style={s.empty}>Anket bulunamadı.</Text></SafeAreaView>;

  const complete = async () => {
    if (!ov) { Alert.alert('Eksik', 'Genel puan zorunlu.'); return; }
    await completeSurvey(survey.id, { ratingOverall: ov, ratingTimeliness: tm, ratingProfessionalism: pr, ratingCommunication: cm, comments: notes.trim() || undefined });
    navigation.goBack();
  };
  const decline = async () => {
    await saveSurvey({ ...survey, status: 'declined' });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}>
        <View style={s.hero}>
          <View style={[s.icoBox, { backgroundColor: SURVEY_STATUS_COLOR[survey.status] + '33' }]}>
            <Ionicons name="happy-outline" size={32} color={SURVEY_STATUS_COLOR[survey.status]} />
          </View>
          <Text style={s.title}>Memnuniyet Anketi</Text>
          <Text style={s.sub}>Müşteri {survey.customerId}{survey.workOrderId ? ` · WO ${survey.workOrderId}` : ''}</Text>
          <Text style={[s.tag, { backgroundColor: SURVEY_STATUS_COLOR[survey.status] + '33', color: SURVEY_STATUS_COLOR[survey.status] }]}>{SURVEY_STATUS_LABEL[survey.status]}</Text>
        </View>

        <StarRow label="Genel Memnuniyet *" value={ov} onChange={setOv} />
        <StarRow label="Zamanında Teslim" value={tm} onChange={setTm} />
        <StarRow label="Profesyonellik" value={pr} onChange={setPr} />
        <StarRow label="İletişim" value={cm} onChange={setCm} />

        <Text style={s.label}>Yorumlar</Text>
        <TextInput style={[s.input, { minHeight: 80 }]} value={notes} onChangeText={setNotes} multiline placeholder="serbest metin..." placeholderTextColor={colors.text.faint} />

        {survey.status !== 'completed' && (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            <TouchableOpacity style={[s.btn, { backgroundColor: '#22c55e', flex: 1 }]} onPress={complete}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" /><Text style={s.btnT}>Tamamla</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { backgroundColor: '#ef4444', flex: 1 }]} onPress={decline}>
              <Ionicons name="close-circle-outline" size={16} color="#fff" /><Text style={s.btnT}>Reddet</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  hero: { backgroundColor: colors.bg.secondary, padding: spacing.lg, borderRadius: radius.lg, alignItems: 'center', marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border.primary },
  icoBox: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  sub: { color: colors.text.muted, fontSize: typography.sm, marginTop: 4 },
  tag: { marginTop: 8, fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  starBlock: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, marginBottom: 6, borderWidth: 1, borderColor: colors.border.primary },
  starRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  label: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '600' },
  input: { backgroundColor: colors.bg.secondary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, fontSize: typography.sm },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: spacing.sm, borderRadius: radius.sm },
  btnT: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 60 },
});
