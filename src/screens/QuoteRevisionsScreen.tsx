// ====================================================================
// QuoteRevisionsScreen — POZ-DEV-038
// ====================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, brand } from '../theme';
import { RootStackParamList, QuoteRevision } from '../types';
import { listRevisions } from '../services/quoteRevisions';
import { useAppContext } from '../context/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'QuoteRevisions'>;

export default function QuoteRevisionsScreen({ route, navigation }: Props) {
  const { quoteId } = route.params;
  const { quotes, updateQuote, showToast } = useAppContext();
  const [revs, setRevs] = useState<QuoteRevision[]>([]);
  const quote = quotes.find(q => q.id === quoteId);

  useEffect(() => {
    listRevisions(quoteId).then(setRevs);
  }, [quoteId]);

  const restore = (rev: QuoteRevision) => {
    Alert.alert(
      'Geri yükle',
      `Revizyon #${rev.revision} bu teklifin üzerine yazılacak. Devam edilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Geri Yükle',
          onPress: () => {
            updateQuote(rev.snapshot);
            showToast(`Revizyon #${rev.revision} geri yüklendi.`);
            navigation.goBack();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{quote?.number ?? quoteId}</Text>
        <Text style={styles.sub}>Revizyon Geçmişi</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 12 }}>
        {revs.length === 0 && (
          <Text style={styles.empty}>Henüz revizyon yok.</Text>
        )}
        {revs.map(r => (
          <View key={r.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.revTitle}>#{r.revision}</Text>
              <Text style={styles.revDate}>{r.createdAt.slice(0, 16).replace('T', ' ')}</Text>
            </View>
            <Text style={styles.amount}>
              {r.snapshot.grandTotal.toLocaleString('tr-TR')} ₺
            </Text>
            <Text style={styles.lineCount}>{r.snapshot.lines.length} kalem</Text>
            {r.reason && <Text style={styles.reason}>{r.reason}</Text>}
            <TouchableOpacity style={styles.restoreBtn} onPress={() => restore(r)}>
              <Ionicons name="refresh-outline" size={14} color={brand.green} />
              <Text style={styles.restoreText}>Bu revizyonu geri yükle</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  title: { color: colors.text.primary, fontSize: 18, fontWeight: '800' },
  sub: { color: colors.text.muted, fontSize: 12, marginTop: 2 },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 30 },
  card: {
    padding: 14,
    marginBottom: 10,
    backgroundColor: colors.bg.secondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  revTitle: { color: brand.green, fontSize: 16, fontWeight: '800' },
  revDate: { color: colors.text.muted, fontSize: 11 },
  amount: { color: colors.text.primary, fontSize: 16, fontWeight: '700', marginTop: 6 },
  lineCount: { color: colors.text.muted, fontSize: 12, marginTop: 2 },
  reason: { color: colors.text.secondary, fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  restoreBtn: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: brand.green,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreText: { color: brand.green, fontWeight: '700', fontSize: 12 },
});
