// TransformerProposalsScreen — POZ-DEV-219 YG Trafo teklif listesi
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, TransformerQuote } from '../types';
import { listTransformerQuotes, deleteTransformerQuote, TRANSFORMER_CUSTOMER_TYPE_LABEL } from '../services/transformerProposals';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function TransformerProposalsScreen() {
  const nav = useNavigation<Nav>();
  const [items, setItems] = useState<TransformerQuote[]>([]);
  const refresh = useCallback(async () => { setItems(await listTransformerQuotes()); }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items}
        keyExtractor={q => q.id}
        contentContainerStyle={s.content}
        ListHeaderComponent={
          <View style={s.headerRow}>
            <Text style={s.title}>YG Trafo Teklifleri</Text>
            <TouchableOpacity style={s.addBtn} onPress={() => nav.navigate('TransformerProposalForm')}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={s.addBtnText}>Yeni</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="flash-outline"
            title="Henüz teklif yok"
            subtitle="İşletme sorumlusu teklifi oluşturmak için Yeni butonuna basın."
            actionLabel="+ Yeni Teklif"
            onAction={() => nav.navigate('TransformerProposalForm')}
          />
        }
        renderItem={({ item: q }) => (
          <TouchableOpacity style={s.card} onPress={() => nav.navigate('TransformerProposalForm', { quoteId: q.id })}>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{q.customerName || 'Müşteri'}</Text>
              <Text style={s.cardMeta}>{q.input.unitCount}× {q.input.kvaPerUnit} kVA · {TRANSFORMER_CUSTOMER_TYPE_LABEL[q.input.customerType]} · {q.input.contractMonths} ay</Text>
              <Text style={s.price}>₺{q.totalFee.toLocaleString('tr-TR')}</Text>
              <Text style={s.cardMeta}>Aylık: ₺{q.monthlyFee.toLocaleString('tr-TR')}</Text>
            </View>
            <TouchableOpacity
              onPress={() => Alert.alert('Sil', 'Teklif silinsin mi?', [
                { text: 'Vazgeç', style: 'cancel' },
                { text: 'Sil', style: 'destructive', onPress: async () => { await deleteTransformerQuote(q.id); refresh(); } },
              ])}
              style={s.delBtn}
            >
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0ea5e9', paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.md },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: typography.sm },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: spacing.lg },
  card: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  cardTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  cardMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  price: { color: '#22c55e', fontWeight: '800', fontSize: typography.md, marginTop: 4 },
  delBtn: { padding: 8, borderRadius: radius.sm, backgroundColor: '#ef444422' },
});
