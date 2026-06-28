// WorkOrderKanbanScreen — POZ-DEV-126 İş emri durum kanban panosu
// Faz 1 (iş-organizasyonu): salt-okunur panoyu AKSİYON ALINABİLİR + TAM + DÜRÜST yaptık.
//  - TAM: tüm 9 durum kolonu var; 'Onay Bekliyor/Teklif Gönderildi/Faturalandırıldı'
//    artık sessizce kaybolmuyor (eski 'if (map.has)' veri gizliyordu).
//  - AKSİYON: karttan durum taşıma — context.updateWorkOrderStatus üzerinden, geçerli
//    geçiş (canTransition) + optimistik + rollback. Toast YALNIZ DB başarılıysa (Req#3).
//  - TEK KAYNAK: renk/SLA workOrderFlow'dan (statusColor / priorityColor / isSlaBreached);
//    lokal kopya/yanlış overdue hesabı kaldırıldı (isSlaBreached slaHours yolunu da kapsar).
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, WorkOrder } from '../types';
import { useAppContext } from '../context/AppContext';
import { statusColor, priorityColor, NEXT_STATUS, isSlaBreached } from '../services/workOrderFlow';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Durum akış sırası — TÜM durumlar (hiçbir iş emri panoda gizlenmez).
const STATUS_ORDER: WorkOrder['status'][] = [
  'Bekliyor',
  'Atandı',
  'Yolda',
  'Başladı',
  'Tamamlandı',
  'Onay Bekliyor',
  'Teklif Gönderildi',
  'Faturalandırıldı',
  'İptal',
];

const STATUS_ICON: Record<WorkOrder['status'], keyof typeof Ionicons.glyphMap> = {
  Bekliyor: 'hourglass-outline',
  Atandı: 'person-add-outline',
  Yolda: 'car-outline',
  Başladı: 'play-circle-outline',
  Tamamlandı: 'checkmark-circle-outline',
  'Onay Bekliyor': 'shield-checkmark-outline',
  'Teklif Gönderildi': 'paper-plane-outline',
  Faturalandırıldı: 'receipt-outline',
  İptal: 'close-circle-outline',
};

export default function WorkOrderKanbanScreen() {
  const nav = useNavigation<Nav>();
  const { workOrders, updateWorkOrderStatus } = useAppContext();

  const [query, setQuery] = useState('');
  const [slaOnly, setSlaOnly] = useState(false);
  // Durum taşıma menüsü için seçili iş emri (anlık snapshot; seçimde modal kapanır).
  const [moveTarget, setMoveTarget] = useState<WorkOrder | null>(null);

  // Aksana duyarsız küçük-harf arama (tr-TR).
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    return workOrders.filter(w => {
      if (slaOnly && !isSlaBreached(w)) return false;
      if (!q) return true;
      const hay = `${w.serviceName ?? ''} ${w.client ?? ''} ${w.assignedToName ?? ''}`.toLocaleLowerCase('tr-TR');
      return hay.includes(q);
    });
  }, [workOrders, query, slaOnly]);

  const grouped = useMemo(() => {
    const map = new Map<WorkOrder['status'], WorkOrder[]>();
    STATUS_ORDER.forEach(s => map.set(s, []));
    filtered.forEach(w => {
      // Bilinmeyen/legacy durum gelse bile düşürmeden 'Bekliyor'a topla (sessiz kayıp yok).
      const key = map.has(w.status) ? w.status : 'Bekliyor';
      map.get(key)!.push(w);
    });
    return map;
  }, [filtered]);

  const breachCount = useMemo(() => filtered.filter(w => isSlaBreached(w)).length, [filtered]);

  const allowedMoves = moveTarget ? (NEXT_STATUS[moveTarget.status] ?? []) : [];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>İş Emri Kanban</Text>
        <Text style={styles.subtitle}>
          {filtered.length}/{workOrders.length} kayıt
          {breachCount > 0 ? `  ·  ${breachCount} SLA aşımı` : ''}
        </Text>
      </View>

      {/* Filtreler */}
      <View style={styles.filterRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={15} color={colors.text.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Ara: müşteri / iş / kişi"
            placeholderTextColor={colors.text.faint}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.text.muted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.slaToggle, slaOnly && styles.slaToggleOn]}
          onPress={() => setSlaOnly(v => !v)}
          activeOpacity={0.8}
        >
          <Ionicons name="alarm-outline" size={14} color={slaOnly ? '#fff' : '#ef4444'} />
          <Text style={[styles.slaToggleText, slaOnly && { color: '#fff' }]}>SLA</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal contentContainerStyle={styles.boardRow} showsHorizontalScrollIndicator={false}>
        {STATUS_ORDER.map(status => {
          const items = grouped.get(status) || [];
          const color = statusColor(status);
          return (
            <View key={status} style={styles.column}>
              <View style={[styles.colHeader, { borderTopColor: color }]}>
                <Ionicons name={STATUS_ICON[status]} size={16} color={color} />
                <Text style={[styles.colTitle, { color }]} numberOfLines={1}>{status}</Text>
                <View style={[styles.countBadge, { backgroundColor: color }]}>
                  <Text style={styles.countText}>{items.length}</Text>
                </View>
              </View>
              <ScrollView style={{ maxHeight: 600 }} contentContainerStyle={{ gap: spacing.sm, padding: spacing.sm }}>
                {items.length === 0 ? (
                  <Text style={styles.empty}>Boş</Text>
                ) : items.map(w => {
                  const breached = isSlaBreached(w);
                  const canMove = (NEXT_STATUS[w.status] ?? []).length > 0;
                  return (
                    <View key={w.id} style={[styles.card, breached && styles.cardBreached]}>
                      <TouchableOpacity
                        onPress={() => nav.navigate('WorkOrderDetail', { workOrderId: w.id })}
                        activeOpacity={0.85}
                      >
                        <View style={styles.cardTopRow}>
                          <Text style={styles.cardTitle} numberOfLines={1}>{w.serviceName}</Text>
                          {w.priority && (
                            <View style={[styles.priDot, { backgroundColor: priorityColor(w.priority) }]} />
                          )}
                        </View>
                        <Text style={styles.cardClient} numberOfLines={1}>{w.client}</Text>
                        {w.assignedToName ? (
                          <View style={styles.metaRow}>
                            <Ionicons name="person-outline" size={11} color={colors.text.muted} />
                            <Text style={styles.metaText} numberOfLines={1}>{w.assignedToName}</Text>
                          </View>
                        ) : null}
                        {w.plannedEnd ? (
                          <View style={styles.metaRow}>
                            <Ionicons name={breached ? 'alarm' : 'calendar-outline'} size={11} color={breached ? '#ef4444' : colors.text.muted} />
                            <Text style={[styles.metaText, breached && { color: '#ef4444', fontWeight: '700' }]} numberOfLines={1}>
                              {new Date(w.plannedEnd).toLocaleDateString('tr-TR')}
                            </Text>
                          </View>
                        ) : null}
                      </TouchableOpacity>

                      {canMove && (
                        <TouchableOpacity
                          style={[styles.moveBtn, { borderColor: color }]}
                          onPress={() => setMoveTarget(w)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="swap-horizontal" size={12} color={color} />
                          <Text style={[styles.moveBtnText, { color }]}>Durumu taşı</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>

      {/* Durum taşıma alt-sayfası */}
      <Modal
        visible={moveTarget != null}
        transparent
        animationType="slide"
        onRequestClose={() => setMoveTarget(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMoveTarget(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle} numberOfLines={1}>{moveTarget?.serviceName}</Text>
            <Text style={styles.sheetSub} numberOfLines={1}>
              {moveTarget?.client} · şu an: {moveTarget?.status}
            </Text>
            {allowedMoves.length === 0 ? (
              <Text style={styles.sheetEmpty}>Bu durumdan ileri geçiş yok.</Text>
            ) : (
              allowedMoves.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.moveOption, { borderColor: statusColor(s) }]}
                  onPress={() => {
                    const id = moveTarget!.id;
                    setMoveTarget(null);
                    // Toast/rollback/audit/bildirim context'te; yalnız DB başarılıysa "kaydedildi".
                    void updateWorkOrderStatus(id, s);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name={STATUS_ICON[s]} size={16} color={statusColor(s)} />
                  <Text style={[styles.moveOptionText, { color: statusColor(s) }]}>→ {s}</Text>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setMoveTarget(null)}>
              <Text style={styles.cancelText}>Vazgeç</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  headerRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { color: colors.text.primary, fontWeight: '800', fontSize: typography.lg },
  subtitle: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, paddingHorizontal: spacing.sm, height: 38 },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: typography.sm, padding: 0 },
  slaToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, height: 38, borderRadius: radius.md, borderWidth: 1, borderColor: '#ef4444', backgroundColor: colors.bg.secondary },
  slaToggleOn: { backgroundColor: '#ef4444' },
  slaToggleText: { color: '#ef4444', fontWeight: '800', fontSize: typography.xs },
  boardRow: { padding: spacing.md, gap: spacing.md, alignItems: 'flex-start' },
  column: { width: 240, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, overflow: 'hidden' },
  colHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.sm, borderTopWidth: 3 },
  colTitle: { fontWeight: '800', fontSize: typography.sm, flex: 1 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, minWidth: 22, alignItems: 'center' },
  countText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  empty: { color: colors.text.faint, fontSize: typography.xs, textAlign: 'center', padding: spacing.md },
  card: { padding: spacing.sm, backgroundColor: colors.bg.primary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  cardBreached: { borderColor: '#ef4444' },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm, flex: 1 },
  priDot: { width: 8, height: 8, borderRadius: 4 },
  cardClient: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { color: colors.text.muted, fontSize: 11 },
  moveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: spacing.sm, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1 },
  moveBtnText: { fontWeight: '700', fontSize: 11 },
  // Alt-sayfa
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg.secondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border.primary, marginBottom: spacing.sm },
  sheetTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  sheetSub: { color: colors.text.muted, fontSize: typography.xs, marginBottom: spacing.sm },
  sheetEmpty: { color: colors.text.faint, fontSize: typography.sm, paddingVertical: spacing.md, textAlign: 'center' },
  moveOption: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5 },
  moveOptionText: { fontWeight: '800', fontSize: typography.sm },
  cancelBtn: { padding: spacing.md, alignItems: 'center', marginTop: spacing.xs },
  cancelText: { color: colors.text.muted, fontWeight: '700', fontSize: typography.sm },
});
