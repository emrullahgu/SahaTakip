// ====================================================================
// JobRatingScreen — POZ-DEV-047
// İş emri tamamlanınca açılır; 1..5 yıldız + yorum.
// ====================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, brand, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';
import { addRating } from '../services/customerRatings';
import { useAppContext } from '../context/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'JobRating'>;

export default function JobRatingScreen({ route, navigation }: Props) {
  const { workOrderId } = route.params;
  const { workOrders, customers, showToast } = useAppContext();
  const wo = workOrders.find(w => w.id === workOrderId);
  const customer = wo
    ? customers.find(c => c.shortName === wo.client || c.title === wo.client)
    : undefined;

  const [score, setScore] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [comment, setComment] = useState('');
  const [ratedBy, setRatedBy] = useState('');

  if (!wo) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>İş emri bulunamadı.</Text>
      </View>
    );
  }
  if (!customer) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>
          Müşteri kaydı bulunamadı. Önce müşteri kartı oluşturun.
        </Text>
      </View>
    );
  }

  const submit = async () => {
    if (!ratedBy.trim()) {
      Alert.alert('Eksik', 'Lütfen değerlendirenin adını girin.');
      return;
    }
    await addRating({
      customerId: customer.id,
      workOrderId: wo.id,
      score,
      comment: comment.trim() || undefined,
      ratedBy: ratedBy.trim(),
    });
    showToast(`Puan kaydedildi: ${score}/5`);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={styles.card}>
        <Text style={styles.title}>{customer.shortName}</Text>
        <Text style={styles.sub}>
          {wo.id} · {wo.serviceName}
        </Text>
      </View>

      <Text style={styles.section}>Memnuniyet Puanı</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity key={n} onPress={() => setScore(n as 1 | 2 | 3 | 4 | 5)}>
            <Ionicons
              name={n <= score ? 'star' : 'star-outline'}
              size={42}
              color={n <= score ? '#eab308' : colors.text.faint}
            />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.scoreLabel}>{score} / 5</Text>

      <Text style={styles.section}>Değerlendiren</Text>
      <TextInput
        style={styles.input}
        placeholder="Ad Soyad"
        placeholderTextColor={colors.text.faint}
        value={ratedBy}
        onChangeText={setRatedBy}
      />

      <Text style={styles.section}>Yorum (opsiyonel)</Text>
      <TextInput
        style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
        placeholder="İşçilik kalitesi, zamanında teslim, iletişim..."
        placeholderTextColor={colors.text.faint}
        value={comment}
        onChangeText={setComment}
        multiline
      />

      <TouchableOpacity style={styles.submitBtn} onPress={submit}>
        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
        <Text style={styles.submitText}>Puanı Kaydet</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: {
    padding: 12,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    marginBottom: 14,
  },
  title: { color: colors.text.primary, fontSize: 16, fontWeight: '800' },
  sub: { color: colors.text.muted, fontSize: 11, marginTop: 2 },
  section: { color: brand.green, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginTop: 14, marginBottom: 6 },
  starsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 },
  scoreLabel: { color: colors.text.primary, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  input: {
    backgroundColor: colors.bg.secondary,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: typography.sm,
  },
  submitBtn: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: brand.green,
    paddingVertical: 14,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  submitText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
});
