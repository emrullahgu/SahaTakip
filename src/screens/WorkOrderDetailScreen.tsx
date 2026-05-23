// ====================================================================
// WorkOrderDetailScreen — FAZ 3 (POZ-DEV-024..035 entegrasyonu)
// İş emrinin durumu, önceliği, atama, zamanlama, timer, medya kontrolü.
// ====================================================================

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, brand } from '../theme';
import { RootStackParamList, WorkOrderPriority, WorkOrder } from '../types';
import { useAppContext } from '../context/AppContext';
import {
  NEXT_STATUS,
  statusColor,
  priorityColor,
  isSlaBreached,
  slaRemainingMs,
  formatRemaining,
  totalLabourMinutes,
} from '../services/workOrderFlow';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkOrderDetail'>;

const PRIORITIES: WorkOrderPriority[] = ['Normal', 'Yüksek', 'Acil'];

export default function WorkOrderDetailScreen({ route, navigation }: Props) {
  const { workOrderId } = route.params;
  const {
    workOrders,
    employees,
    updateWorkOrderStatus,
    assignWorkOrder,
    respondAssignment,
    transferWorkOrder,
    setWorkOrderPriority,
    setWorkOrderSchedule,
    startWorkTimer,
    stopWorkTimer,
  } = useAppContext();

  const wo = workOrders.find(w => w.id === workOrderId);
  const [showAssign, setShowAssign] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [plannedStart, setPlannedStart] = useState(wo?.plannedStart ?? '');
  const [plannedEnd, setPlannedEnd] = useState(wo?.plannedEnd ?? '');
  const [slaHours, setSlaHours] = useState(String(wo?.slaHours ?? ''));

  if (!wo) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>İş emri bulunamadı.</Text>
      </View>
    );
  }

  const allowed = NEXT_STATUS[wo.status] ?? [];
  const breached = isSlaBreached(wo);
  const remaining = slaRemainingMs(wo);
  const minutes = totalLabourMinutes(wo.timeLogs);
  const isRunning = !!wo.timeLogs?.some(l => !l.endAt);

  const askReject = () => {
    Alert.prompt?.(
      'Reddetme nedeni',
      'Görevi neden reddediyorsunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: text => respondAssignment(wo.id, false, text || 'Belirtilmedi'),
        },
      ],
      'plain-text',
    );
    // iOS olmayanlar için fallback — basit reddet
    if (!Alert.prompt) {
      respondAssignment(wo.id, false, rejectReason || 'Belirtilmedi');
    }
  };

  const saveSchedule = () => {
    setWorkOrderSchedule(
      wo.id,
      plannedStart || undefined,
      plannedEnd || undefined,
      slaHours ? Number(slaHours) : undefined,
    );
    Alert.alert('Kaydedildi', 'Planlama güncellendi.');
  };

  return (
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <View style={styles.card}>
        <Text style={styles.title}>{wo.serviceName}</Text>
        <Text style={styles.subtitle}>{wo.client}</Text>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: statusColor(wo.status) }]}>
            <Text style={styles.badgeText}>{wo.status}</Text>
          </View>
          {wo.priority && (
            <View style={[styles.badge, { backgroundColor: priorityColor(wo.priority) }]}>
              <Ionicons name="flame-outline" size={12} color="#fff" />
              <Text style={styles.badgeText}> {wo.priority}</Text>
            </View>
          )}
          {wo.assignmentStatus && wo.assignmentStatus !== 'Atanmadı' && (
            <View style={[styles.badge, { backgroundColor: '#334155' }]}>
              <Text style={styles.badgeText}>{wo.assignmentStatus}</Text>
            </View>
          )}
        </View>

        {wo.assignedToName && (
          <Text style={styles.assignText}>
            <Ionicons name="person" size={12} color={colors.text.muted} /> {wo.assignedToName}
          </Text>
        )}

        {remaining != null && (
          <View style={[styles.slaRow, breached && { backgroundColor: '#7f1d1d' }]}>
            <Ionicons name="time-outline" size={14} color="#fff" />
            <Text style={styles.slaText}>
              {breached ? 'SLA aşıldı: ' : 'SLA kalan: '}
              {formatRemaining(remaining)}
            </Text>
          </View>
        )}
      </View>

      {/* STATUS FLOW */}
      {allowed.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Durum Değiştir</Text>
          <View style={styles.chipRow}>
            {allowed.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, { borderColor: statusColor(s) }]}
                onPress={() => updateWorkOrderStatus(wo.id, s)}
              >
                <Text style={[styles.chipText, { color: statusColor(s) }]}>→ {s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* FAZ 5 — POZ-DEV-047 Müşteri puanı */}
      {wo.status === 'Tamamlandı' && (
        <TouchableOpacity
          style={styles.ratingCta}
          onPress={() => navigation.navigate('JobRating', { workOrderId: wo.id })}
          activeOpacity={0.85}
        >
          <Ionicons name="star-outline" size={18} color="#fff" />
          <Text style={styles.ratingCtaText}>Müşteri Memnuniyet Puanı Al</Text>
        </TouchableOpacity>
      )}

      {/* FAZ 6 — POZ-DEV-052 Formlar */}
      <TouchableOpacity
        style={styles.formsCta}
        onPress={() => navigation.navigate('WorkOrderForms', { workOrderId: wo.id })}
        activeOpacity={0.85}
      >
        <Ionicons name="clipboard-outline" size={18} color="#fff" />
        <Text style={styles.formsCtaText}>Formlar / Kontrol Listeleri</Text>
      </TouchableOpacity>

      {/* FAZ 7 — POZ-DEV-059 İş emrinde malzeme kullanımı */}
      <TouchableOpacity
        style={styles.materialsCta}
        onPress={() =>
          navigation.navigate('StockMovement', {
            kind: 'is-emri',
            workOrderId: wo.id,
          })
        }
        activeOpacity={0.85}
      >
        <Ionicons name="cube-outline" size={18} color="#fff" />
        <Text style={styles.materialsCtaText}>Malzeme Kullanımı</Text>
      </TouchableOpacity>

      {/* PRIORITY */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Öncelik</Text>
        <View style={styles.chipRow}>
          {PRIORITIES.map(p => (
            <TouchableOpacity
              key={p}
              style={[
                styles.chip,
                { borderColor: priorityColor(p) },
                wo.priority === p && { backgroundColor: priorityColor(p) },
              ]}
              onPress={() => setWorkOrderPriority(wo.id, p)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: wo.priority === p ? '#fff' : priorityColor(p) },
                ]}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* SCHEDULE / SLA */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Planlama (SLA)</Text>
        <Text style={styles.label}>Planlanan Başlangıç (ISO)</Text>
        <TextInput
          style={styles.input}
          value={plannedStart}
          onChangeText={setPlannedStart}
          placeholder="2026-05-25T09:00:00"
          placeholderTextColor={colors.text.muted}
        />
        <Text style={styles.label}>Planlanan Bitiş (ISO)</Text>
        <TextInput
          style={styles.input}
          value={plannedEnd}
          onChangeText={setPlannedEnd}
          placeholder="2026-05-25T17:00:00"
          placeholderTextColor={colors.text.muted}
        />
        <Text style={styles.label}>SLA Saat</Text>
        <TextInput
          style={styles.input}
          value={slaHours}
          onChangeText={setSlaHours}
          keyboardType="number-pad"
          placeholder="8"
          placeholderTextColor={colors.text.muted}
        />
        <TouchableOpacity style={styles.primaryBtn} onPress={saveSchedule}>
          <Text style={styles.primaryBtnText}>Planlamayı Kaydet</Text>
        </TouchableOpacity>
      </View>

      {/* ASSIGNMENT */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Atama</Text>
        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={() => setShowAssign(s => !s)}
        >
          <Ionicons name="people-outline" size={16} color={brand.green} />
          <Text style={styles.outlineBtnText}>
            {showAssign ? 'Listeyi gizle' : wo.assignedToId ? 'Devret / Değiştir' : 'Personel Ata'}
          </Text>
        </TouchableOpacity>
        {showAssign &&
          employees.map(emp => (
            <TouchableOpacity
              key={emp.id}
              style={styles.empRow}
              onPress={() => {
                if (wo.assignedToId) transferWorkOrder(wo.id, emp.id, emp.name);
                else assignWorkOrder(wo.id, emp.id, emp.name);
                setShowAssign(false);
              }}
            >
              <Text style={styles.empName}>{emp.name}</Text>
              <Text style={styles.empRole}>{emp.role}</Text>
            </TouchableOpacity>
          ))}

        {wo.assignmentStatus === 'Atandı' && (
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.smallBtn, { backgroundColor: brand.green }]}
              onPress={() => respondAssignment(wo.id, true)}
            >
              <Text style={styles.smallBtnText}>Kabul Et</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallBtn, { backgroundColor: '#dc2626' }]}
              onPress={askReject}
            >
              <Text style={styles.smallBtnText}>Reddet</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* TIMER */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Süre Takibi</Text>
        <Text style={styles.metricText}>
          Toplam: {Math.floor(minutes / 60)}s {minutes % 60}dk
          {wo.actualLaborMinutes != null && ` (kayıt: ${wo.actualLaborMinutes}dk)`}
        </Text>
        {isRunning ? (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#dc2626' }]}
            onPress={() => stopWorkTimer(wo.id)}
          >
            <Ionicons name="stop-circle-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Süreyi Durdur</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => startWorkTimer(wo.id)}>
            <Ionicons name="play-circle-outline" size={18} color={colors.bg.primary} />
            <Text style={styles.primaryBtnText}>Süreyi Başlat</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* COST SUMMARY */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Maliyet</Text>
        <KV k="İşçilik" v={wo.laborCost} />
        <KV k="Malzeme" v={wo.materialCost} />
        <KV k="Diğer" v={wo.otherCost} />
        <KV k="Teklif" v={wo.quoteAmount} />
        <KV k="Kâr" v={wo.profit} highlight />
      </View>

      <TouchableOpacity
        style={[styles.outlineBtn, { margin: 16 }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.outlineBtnText}>← Geri</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function KV({ k, v, highlight }: { k: string; v: number; highlight?: boolean }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={[styles.kvVal, highlight && { color: brand.green, fontWeight: '700' }]}>
        {v.toLocaleString('tr-TR')} ₺
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: {
    margin: 12,
    padding: 16,
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  title: { color: colors.text.primary, fontSize: 17, fontWeight: '700' },
  subtitle: { color: colors.text.muted, fontSize: 13, marginTop: 2 },
  sectionTitle: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  assignText: { color: colors.text.muted, fontSize: 12, marginTop: 8 },
  slaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  slaText: { color: '#fff', fontSize: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  ratingCta: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#eab308',
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingCtaText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  formsCta: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#1e40af',
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  formsCtaText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  materialsCta: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#0891b2',
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  materialsCtaText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  label: { color: colors.text.muted, fontSize: 12, marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: colors.bg.primary,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: brand.green,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  primaryBtnText: { color: colors.bg.primary, fontWeight: '700' },
  outlineBtn: {
    flexDirection: 'row',
    borderColor: brand.green,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  outlineBtnText: { color: brand.green, fontWeight: '700' },
  empRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  empName: { color: colors.text.primary, fontWeight: '600' },
  empRole: { color: colors.text.muted, fontSize: 12 },
  row: { flexDirection: 'row', gap: 8, marginTop: 12 },
  smallBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  smallBtnText: { color: '#fff', fontWeight: '700' },
  metricText: { color: colors.text.primary, fontSize: 14, marginBottom: 8 },
  kv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  kvKey: { color: colors.text.muted, fontSize: 13 },
  kvVal: { color: colors.text.primary, fontSize: 13 },
});
