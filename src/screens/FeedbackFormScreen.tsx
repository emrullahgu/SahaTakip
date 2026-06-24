// FeedbackFormScreen — POZ-DEV-334 Geri bildirim oluştur/düzenle
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, FeedbackCategory } from '../types';
import { getFeedback, saveFeedback, FEEDBACK_CATEGORY_LABEL, FEEDBACK_CATEGORY_COLOR } from '../services/feedback';
import { useAuth } from '../context/AuthContext';
import { getEnvironmentInfo } from '../services/performance';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FeedbackForm'>;
type R = RouteProp<RootStackParamList, 'FeedbackForm'>;

const CATEGORIES: FeedbackCategory[] = ['bug', 'feature', 'ui', 'performance', 'other'];

export default function FeedbackFormScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const entryId = route.params?.entryId;
  const { profile } = useAuth();
  const env = getEnvironmentInfo();

  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [screen, setScreen] = useState('');

  useEffect(() => {
    if (entryId) {
      (async () => {
        const e = await getFeedback(entryId);
        if (e) {
          setCategory(e.category);
          setTitle(e.title);
          setMessage(e.message);
          setRating(e.rating || 0);
          setScreen(e.screen || '');
        }
      })();
    }
  }, [entryId]);

  const onSave = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Eksik', 'Başlık ve mesaj zorunlu.');
      return;
    }
    await saveFeedback({
      id: entryId,
      category,
      title: title.trim(),
      message: message.trim(),
      rating: rating > 0 ? rating : undefined,
      screen: screen.trim() || undefined,
      authorId: profile?.id,
      authorName: profile?.full_name || undefined,
      appVersion: env.appVersion,
    });
    nav.goBack();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.label}>Kategori</Text>
        <View style={s.chipRow}>
          {CATEGORIES.map(c => (
            <TouchableOpacity key={c} style={[s.chip, category === c && { backgroundColor: FEEDBACK_CATEGORY_COLOR[c], borderColor: FEEDBACK_CATEGORY_COLOR[c] }]} onPress={() => setCategory(c)}>
              <Text style={[s.chipT, category === c && { color: '#fff' }]}>{FEEDBACK_CATEGORY_LABEL[c]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Başlık</Text>
        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Kısa başlık" placeholderTextColor={colors.text.faint} />

        <Text style={s.label}>Mesaj</Text>
        <TextInput style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]} value={message} onChangeText={setMessage} placeholder="Detaylı açıklama..." placeholderTextColor={colors.text.faint} multiline />

        <Text style={s.label}>İlgili ekran (opsiyonel)</Text>
        <TextInput style={s.input} value={screen} onChangeText={setScreen} placeholder="örn. TasksScreen" placeholderTextColor={colors.text.faint} />

        <Text style={s.label}>Memnuniyet</Text>
        <View style={s.starRow}>
          {[1, 2, 3, 4, 5].map(i => (
            <TouchableOpacity key={i} onPress={() => setRating(rating === i ? 0 : i)}>
              <Ionicons name={i <= rating ? 'star' : 'star-outline'} size={28} color="#f59e0b" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={onSave}>
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={s.saveT}>Kaydet</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 80 },
  label: { color: colors.text.muted, fontSize: typography.xs, marginTop: spacing.sm },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.text.primary, fontSize: typography.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '600' },
  starRow: { flexDirection: 'row', gap: 6 },
  saveBtn: { marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#22c55e', padding: spacing.md, borderRadius: radius.md },
  saveT: { color: '#fff', fontWeight: '700', fontSize: typography.md },
});
