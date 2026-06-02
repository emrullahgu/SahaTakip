import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radius, typography } from '../theme';
import { useAppContext } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import Toast from '../components/Toast';
import EmptyState from '../components/EmptyState';
import { WorkOrder } from '../types';
import { FLATLIST_DEFAULTS } from '../utils/perf';

export default function ServicesScreen() {
  const { workOrders, toast } = useAppContext();
  const [searchText, setSearchText] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);

  const filtered = workOrders.filter(
    o =>
      o.client.toLowerCase().includes(searchText.toLowerCase()) ||
      o.serviceName.toLowerCase().includes(searchText.toLowerCase()) ||
      o.id.toLowerCase().includes(searchText.toLowerCase())
  );

  const total = workOrders.length;
  const completed = workOrders.filter(w => w.status === 'Faturalandırıldı').length;
  const pending = workOrders.filter(w => w.status === 'Onay Bekliyor').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {toast && <Toast toast={toast} />}
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Servislerim</Text>
          <Text style={styles.subtitle}>Hazırladığınız servis raporları</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.text.faint} />
          <TextInput
            style={styles.searchInput}
            placeholder="Müşteri, servis veya rapor no ara..."
            placeholderTextColor={colors.text.faint}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{total}</Text>
            <Text style={styles.statLbl}>Toplam Rapor</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: colors.emerald.default }]}>{completed}</Text>
            <Text style={styles.statLbl}>Faturalandı</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: colors.amber.default }]}>{pending}</Text>
            <Text style={styles.statLbl}>Onay Bekliyor</Text>
          </View>
        </View>

        {/* List */}
        <FlatList
          {...FLATLIST_DEFAULTS}
          data={filtered}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setSelectedOrder(item)}
              activeOpacity={0.85}
            >
              <View style={styles.cardLeft}>
                <View style={styles.cardIcon}>
                  <Ionicons name="document-text" size={20} color={colors.emerald.default} />
                </View>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardId}>{item.id}</Text>
                <Text style={styles.cardClient} numberOfLines={1}>{item.client}</Text>
                <Text style={styles.cardService} numberOfLines={1}>{item.serviceName}</Text>
                <Text style={styles.cardDate}>{item.date}</Text>
              </View>
              <View style={styles.cardRight}>
                <StatusBadge status={item.status} small />
                <Text style={styles.cardAmount}>₺{item.quoteAmount.toLocaleString('tr-TR')}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.text.faint} />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="document-outline"
              title="Rapor bulunamadı"
              subtitle="Hazırladığınız servis raporları burada listelenir."
            />
          }
        />
      </View>

      {/* Detail Modal */}
      <Modal
        visible={!!selectedOrder}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedOrder(null)}
      >
        {selectedOrder && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalId}>{selectedOrder.id}</Text>
                  <Text style={styles.modalClient}>{selectedOrder.client}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                  <Ionicons name="close-circle" size={28} color={colors.text.muted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Photos */}
                <View style={styles.photosRow}>
                  <View style={styles.photoBox}>
                    <Text style={styles.photoLabel}>İŞ ÖNCESİ</Text>
                    <Image
                      source={{ uri: selectedOrder.beforePhoto }}
                      style={styles.photoImg}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={styles.photoBox}>
                    <Text style={styles.photoLabel}>İŞ SONRASI</Text>
                    <Image
                      source={{ uri: selectedOrder.afterPhoto }}
                      style={styles.photoImg}
                      resizeMode="cover"
                    />
                  </View>
                </View>

                {/* Cost Breakdown */}
                <View style={styles.costGrid}>
                  <View style={styles.costItem}>
                    <Text style={styles.costLabel}>Malzeme</Text>
                    <Text style={styles.costVal}>
                      ₺{selectedOrder.materialCost.toLocaleString('tr-TR')}
                    </Text>
                  </View>
                  <View style={styles.costItem}>
                    <Text style={styles.costLabel}>İşçilik</Text>
                    <Text style={styles.costVal}>
                      ₺{selectedOrder.laborCost.toLocaleString('tr-TR')}
                    </Text>
                  </View>
                  <View style={styles.costItem}>
                    <Text style={styles.costLabel}>Saha Gid.</Text>
                    <Text style={styles.costVal}>
                      ₺{selectedOrder.otherCost.toLocaleString('tr-TR')}
                    </Text>
                  </View>
                  <View style={styles.costItem}>
                    <Text style={[styles.costLabel, { color: colors.emerald.default }]}>
                      Teklif
                    </Text>
                    <Text style={[styles.costVal, { color: colors.emerald.default, fontWeight: '900' }]}>
                      ₺{selectedOrder.quoteAmount.toLocaleString('tr-TR')}
                    </Text>
                  </View>
                </View>

                {/* Notes */}
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Mühendis Notu</Text>
                  <Text style={styles.notesText}>{selectedOrder.notes}</Text>
                </View>

                {/* Materials List */}
                {selectedOrder.materials.length > 0 && (
                  <View style={styles.matList}>
                    <Text style={styles.notesLabel}>Kullanılan Malzemeler</Text>
                    {selectedOrder.materials.map((m, i) => {
                      const disc = m.discountPct ?? 0;
                      const line = m.price * m.qty * (1 - disc / 100);
                      return (
                        <View key={i} style={styles.matItem}>
                          <Text style={styles.matItemName} numberOfLines={3}>
                            • {m.name} (x{m.qty}){disc > 0 ? `  · −%${disc}` : ''}
                          </Text>
                          <Text style={styles.matItemPrice} numberOfLines={1}>
                            ₺{Math.round(line).toLocaleString('tr-TR')}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedOrder(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.closeBtnText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  container: { flex: 1, paddingHorizontal: spacing.lg },
  header: { paddingTop: spacing.lg, marginBottom: spacing.md },
  title: { fontSize: typography.xl, color: colors.text.primary, fontWeight: '900' },
  subtitle: { fontSize: typography.xs, color: colors.text.muted, marginTop: 2 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: typography.sm },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: typography.lg, color: colors.text.primary, fontWeight: '800' },
  statLbl: { fontSize: 9, color: colors.text.faint, marginTop: 2 },
  list: { paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.primary,
    gap: spacing.md,
  },
  cardLeft: {},
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.emerald.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { flex: 1 },
  cardId: { fontSize: typography.xs, color: colors.text.faint, fontWeight: '600' },
  cardClient: { fontSize: typography.sm, color: colors.text.primary, fontWeight: '700' },
  cardService: { fontSize: typography.xs, color: colors.text.muted, marginTop: 1 },
  cardDate: { fontSize: typography.xs, color: colors.text.faint, marginTop: 3 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  cardAmount: {
    fontSize: typography.xs,
    color: colors.emerald.default,
    fontWeight: '700',
    marginTop: 4,
  },
  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.md },
  emptyText: { fontSize: typography.sm, color: colors.text.faint },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: 36,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: colors.border.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  modalId: { fontSize: typography.xs, color: colors.text.faint, fontWeight: '600' },
  modalClient: { fontSize: typography.lg, color: colors.text.primary, fontWeight: '900', marginTop: 3 },
  photosRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  photoBox: { flex: 1 },
  photoLabel: {
    fontSize: 9,
    color: colors.text.faint,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  photoImg: { width: '100%', height: 110, borderRadius: radius.md, backgroundColor: colors.bg.card },
  costGrid: {
    flexDirection: 'row',
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  costItem: { flex: 1, alignItems: 'center' },
  costLabel: { fontSize: 9, color: colors.text.faint, fontWeight: '700', marginBottom: 3 },
  costVal: { fontSize: typography.xs, color: colors.text.secondary, fontWeight: '700' },
  notesBox: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  notesLabel: {
    fontSize: typography.xs,
    color: colors.text.muted,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesText: { fontSize: typography.sm, color: colors.text.secondary, lineHeight: 20, fontStyle: 'italic' },
  matList: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  matItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 3, gap: spacing.sm },
  matItemName: { flex: 1, flexShrink: 1, fontSize: typography.xs, color: colors.text.secondary },
  matItemPrice: { flexShrink: 0, fontSize: typography.xs, color: colors.emerald.default, fontWeight: '700', textAlign: 'right' },
  closeBtn: {
    backgroundColor: colors.emerald.default,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  closeBtnText: { color: colors.bg.primary, fontWeight: '800', fontSize: typography.sm },
});
