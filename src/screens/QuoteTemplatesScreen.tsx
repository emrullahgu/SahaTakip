// ====================================================================
// QuoteTemplatesScreen — POZ-DEV-041
// ====================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, brand } from '../theme';
import { QuoteTemplate, RootStackParamList, Quote } from '../types';
import {
  listQuoteTemplates,
  deleteQuoteTemplate,
  templateToLines,
} from '../services/quoteTemplates';
import { useAppContext, calcQuoteTotals } from '../context/AppContext';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function QuoteTemplatesScreen() {
  const navigation = useNavigation<NavProp>();
  const { addQuote, generateQuoteNumber, showToast } = useAppContext();
  const [list, setList] = useState<QuoteTemplate[]>([]);

  const reload = async () => setList(await listQuoteTemplates());
  useEffect(() => {
    reload();
  }, []);

  const useTemplate = (t: QuoteTemplate) => {
    const lines = templateToLines(t);
    const totals = calcQuoteTotals(lines);
    const number = generateQuoteNumber();
    const q: Quote = {
      id: `q-${Date.now()}`,
      number,
      customerName: '',
      customerTitle: '',
      title: t.defaultTitle || t.name,
      date: new Date().toISOString().slice(0, 10),
      engineer: '',
      lines,
      status: 'Taslak',
      notes: t.notes,
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      grandTotal: totals.grandTotal,
      templateId: t.id,
    };
    addQuote(q);
    showToast(`${t.name} şablonu kullanıldı.`);
    navigation.navigate('NewQuote', { quoteId: q.id });
  };

  const remove = (id: string) => {
    Alert.alert('Sil?', 'Bu şablon silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteQuoteTemplate(id);
          reload();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 12 }}>
      <Text style={styles.helper}>
        Şablonu seçtiğinizde yeni bir teklif oluşturulup içine kalemler doldurulur.
      </Text>
      {list.length === 0 && <Text style={styles.empty}>Şablon yok.</Text>}
      {list.map(t => (
        <View key={t.id} style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t.name}</Text>
            {t.category && <Text style={styles.cat}>{t.category}</Text>}
            <Text style={styles.meta}>{t.lines.length} kalem</Text>
            {t.notes && <Text style={styles.notes} numberOfLines={2}>{t.notes}</Text>}
          </View>
          <View style={{ gap: 6 }}>
            <TouchableOpacity style={styles.useBtn} onPress={() => useTemplate(t)}>
              <Ionicons name="add-circle-outline" size={16} color={colors.bg.primary} />
              <Text style={styles.useText}>Kullan</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => remove(t.id)} style={{ alignSelf: 'center' }}>
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  helper: { color: colors.text.muted, fontSize: 12, marginBottom: 10 },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 30 },
  card: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: colors.bg.secondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.primary,
    marginBottom: 10,
    gap: 12,
  },
  title: { color: colors.text.primary, fontWeight: '800', fontSize: 14 },
  cat: { color: brand.green, fontSize: 11, fontWeight: '700', marginTop: 2 },
  meta: { color: colors.text.muted, fontSize: 11, marginTop: 4 },
  notes: { color: colors.text.secondary, fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  useBtn: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: brand.green,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  useText: { color: colors.bg.primary, fontWeight: '800', fontSize: 12 },
});
