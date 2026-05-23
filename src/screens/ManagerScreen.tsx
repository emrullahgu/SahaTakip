import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList } from '../types';
import { useAppContext } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import Toast from '../components/Toast';
import { WorkOrder } from '../types';
import {
  generateAndShareAttendancePdf,
  generateAndShareAttendanceCsv,
} from '../services/pdf';

type ManagerTab = 'dashboard' | 'approvals' | 'puantaj' | 'arsiv';

const TABS: { key: ManagerTab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Özet', icon: 'bar-chart-outline' },
  { key: 'approvals', label: 'Onaylar', icon: 'checkmark-circle-outline' },
  { key: 'puantaj', label: 'Puantaj', icon: 'calendar-outline' },
  { key: 'arsiv', label: 'Arşiv', icon: 'folder-outline' },
];

const ARCHIVE_YEARS = ['Hepsi', '2026', '2025', '2024', '2023'];
const ATTENDANCE_DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function ManagerScreen() {
  const {
    workOrders,
    employees,
    toast,
    approveReport,
    clientAccept,
    toggleAttendance,
    updateWage,
  } = useAppContext();

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeTab, setActiveTab] = useState<ManagerTab>('dashboard');
  const [archiveYear, setArchiveYear] = useState('Hepsi');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiResult, setAiResult] = useState<{ summary: string; insights: string[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Metrics
  const invoiced = workOrders.filter(w => w.status === 'Faturalandırıldı');
  const totalRevenue = invoiced.reduce((s, w) => s + w.quoteAmount, 0);
  const totalCost = invoiced.reduce((s, w) => s + w.laborCost + w.materialCost + w.otherCost, 0);
  const totalProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const pendingApprovals = workOrders.filter(w => w.status === 'Onay Bekliyor' || w.status === 'Teklif Gönderildi');

  const filteredArchive = workOrders.filter(o => {
    const matchYear = archiveYear === 'Hepsi' || o.date.startsWith(archiveYear);
    const matchSearch =
      o.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.engineer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchYear && matchSearch;
  });

  const runAiAnalysis = () => {
    setAiLoading(true);
    setTimeout(() => {
      setAiResult({
        summary: `Yapay Zeka 3 yıllık veriyi analiz etti. Ortalama kâr marjı %${margin.toFixed(1)} ile dengeli bir grafik izliyor.`,
        insights: [
          'Malzeme katsayısını %1.30\'a revize ederseniz kârlılık %4.1 artacaktır.',
          'En yüksek kapatma performansı Test MÜHENDİS\'te — prim hakedişe yansıtılabilir.',
          'Aksa Enerji işlerinde lojistik maliyet yüksek; uzak iş teklif şablonuna seyahat kalemi ekleyin.',
        ],
      });
      setAiLoading(false);
    }, 1800);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {toast && <Toast toast={toast} />}

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={t.icon as any}
              size={16}
              color={activeTab === t.key ? colors.emerald.default : colors.text.faint}
            />
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
            {t.key === 'approvals' && pendingApprovals.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingApprovals.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* TAB: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Hızlı İşlemler */}
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => navigation.navigate('BulkAssign')}
              activeOpacity={0.85}
            >
              <Ionicons name="people-outline" size={18} color="#fff" />
              <Text style={styles.quickText}>Toplu Atama</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: colors.indigo.default }]}
              onPress={() => navigation.navigate('RecurringTasks')}
              activeOpacity={0.85}
            >
              <Ionicons name="repeat-outline" size={18} color="#fff" />
              <Text style={styles.quickText}>Periyodik Görevler</Text>
            </TouchableOpacity>
          </View>

          {/* FAZ 7 — Stok / Malzeme / Zimmet kısayolları */}
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: '#0891b2' }]}
              onPress={() => navigation.navigate('Stock')}
              activeOpacity={0.85}
            >
              <Ionicons name="cube-outline" size={18} color="#fff" />
              <Text style={styles.quickText}>Stok</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: '#0d9488' }]}
              onPress={() => navigation.navigate('Warehouses')}
              activeOpacity={0.85}
            >
              <Ionicons name="business-outline" size={18} color="#fff" />
              <Text style={styles.quickText}>Depo & Zimmet</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: '#a855f7' }]}
              onPress={() => navigation.navigate('Assignments')}
              activeOpacity={0.85}
            >
              <Ionicons name="people-outline" size={18} color="#fff" />
              <Text style={styles.quickText}>Zimmet Listesi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: '#7c3aed' }]}
              onPress={() => navigation.navigate('Materials')}
              activeOpacity={0.85}
            >
              <Ionicons name="layers-outline" size={18} color="#fff" />
              <Text style={styles.quickText}>Malzemeler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: '#dc2626' }]}
              onPress={() => navigation.navigate('Vehicles')}
              activeOpacity={0.85}
            >
              <Ionicons name="car-outline" size={18} color="#fff" />
              <Text style={styles.quickText}>Araçlar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: '#0ea5e9' }]}
              onPress={() => navigation.navigate('Dashboard')}
              activeOpacity={0.85}
            >
              <Ionicons name="speedometer-outline" size={18} color="#fff" />
              <Text style={styles.quickText}>Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: '#6366f1' }]}
              onPress={() => navigation.navigate('Reports')}
              activeOpacity={0.85}
            >
              <Ionicons name="document-text-outline" size={18} color="#fff" />
              <Text style={styles.quickText}>Raporlar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: '#ef4444' }]}
              onPress={() => navigation.navigate('Sla')}
              activeOpacity={0.85}
            >
              <Ionicons name="alarm-outline" size={18} color="#fff" />
              <Text style={styles.quickText}>SLA / Geciken</Text>
            </TouchableOpacity>
          </View>
          {/* KPI Cards */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Toplam Ciro</Text>
              <Text style={[styles.kpiValue, { color: colors.emerald.default }]}>
                ₺{totalRevenue.toLocaleString('tr-TR')}
              </Text>
              <Text style={styles.kpiSub}>Faturalandırılan toplam</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Operasyon Maliyeti</Text>
              <Text style={[styles.kpiValue, { color: colors.text.secondary }]}>
                ₺{totalCost.toLocaleString('tr-TR')}
              </Text>
              <Text style={styles.kpiSub}>İşçilik + malzeme + yol</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Net Kâr</Text>
              <Text style={[styles.kpiValue, { color: colors.amber.default }]}>
                ₺{totalProfit.toLocaleString('tr-TR')}
              </Text>
              <Text style={[styles.kpiSub, { color: colors.emerald.default }]}>
                Marj: %{margin.toFixed(1)}
              </Text>
            </View>
          </View>

          {/* Year Performance Bars */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3 Yıllık Performans</Text>
            {[
              { year: '2024', ciro: 240000, margin: 52 },
              { year: '2025', ciro: 380000, margin: 61 },
              { year: '2026 (Aktif)', ciro: totalRevenue, margin: Math.round(margin) },
            ].map((row, i) => (
              <View key={i} style={styles.barRow}>
                <Text style={styles.barYear}>{row.year}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.min(row.margin, 100)}%`,
                        backgroundColor: i === 2 ? colors.amber.default : colors.emerald.default,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>
                  ₺{row.ciro.toLocaleString('tr-TR')} · %{row.margin}
                </Text>
              </View>
            ))}
          </View>

          {/* AI Analysis */}
          <View style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <Text style={styles.aiTitle}>🧠 Yapay Zeka İş Analizi</Text>
              <TouchableOpacity
                style={[styles.aiBtn, aiLoading && { opacity: 0.5 }]}
                onPress={runAiAnalysis}
                disabled={aiLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.aiBtnText}>
                  {aiLoading ? 'Analiz Ediliyor...' : 'Analiz Başlat'}
                </Text>
              </TouchableOpacity>
            </View>

            {aiResult ? (
              <View style={styles.aiResult}>
                <Text style={styles.aiSummary}>"{aiResult.summary}"</Text>
                {aiResult.insights.map((ins, i) => (
                  <View key={i} style={styles.insightRow}>
                    <Text style={styles.insightNum}>#{i + 1}</Text>
                    <Text style={styles.insightText}>{ins}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.aiEmpty}>
                <Text style={styles.aiEmptyText}>
                  3 yıllık verileri analiz etmek için "Analiz Başlat" butonuna basın.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* TAB: APPROVALS */}
      {activeTab === 'approvals' && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>Teklif Onay Havuzu</Text>
          <Text style={styles.pageSubtitle}>
            Saha personelinin gönderdiği servis raporları. Onayınız ile müşteriye teklif iletilir.
          </Text>

          {pendingApprovals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.text.faint} />
              <Text style={styles.emptyTitle}>Bekleyen onay yok</Text>
              <Text style={styles.emptyDesc}>
                Tüm raporlar işlendi veya henüz yeni rapor gönderilmedi.
              </Text>
            </View>
          ) : (
            pendingApprovals.map(order => {
              const cost = order.laborCost + order.materialCost + order.otherCost;
              const m = ((order.quoteAmount - cost) / order.quoteAmount) * 100;
              return (
                <ApprovalCard
                  key={order.id}
                  order={order}
                  margin={m}
                  onApprove={() => approveReport(order.id)}
                  onClientAccept={() => clientAccept(order.id)}
                />
              );
            })
          )}
        </ScrollView>
      )}

      {/* TAB: PUANTAJ */}
      {activeTab === 'puantaj' && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>Puantaj & Hakediş</Text>
          <Text style={styles.pageSubtitle}>
            Günlük durumu değiştirmek için ilgili güne dokunun.
          </Text>

          {/* POZ-DEV-022: Rapor butonları */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            <TouchableOpacity
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                backgroundColor: colors.indigo.default, padding: spacing.sm, borderRadius: radius.md,
              }}
              onPress={() => {
                const ym = new Date().toISOString().slice(0, 7);
                generateAndShareAttendancePdf(employees, ym).catch(() => {});
              }}
            >
              <Ionicons name="document-text" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: typography.xs }}>
                PDF Rapor
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                backgroundColor: colors.emerald.default, padding: spacing.sm, borderRadius: radius.md,
              }}
              onPress={() => {
                const ym = new Date().toISOString().slice(0, 7);
                generateAndShareAttendanceCsv(employees, ym).catch(() => {});
              }}
            >
              <Ionicons name="grid" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: typography.xs }}>
                Excel / CSV
              </Text>
            </TouchableOpacity>
          </View>

          {employees.map(emp => {
            const weekly = Math.round(emp.daysWorked * emp.dailyRate);
            return (
              <View key={emp.id} style={styles.empCard}>
                <TouchableOpacity
                  style={styles.empHeader}
                  onPress={() => navigation.navigate('EmployeeDetail', { employeeId: emp.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.empAvatar}>
                    <Text style={styles.empAvatarText}>
                      {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.empName}>{emp.name}</Text>
                    <Text style={styles.empRole}>{emp.role}</Text>
                  </View>
                  <View style={styles.empWage}>
                    <Text style={styles.empWageVal}>₺{weekly.toLocaleString('tr-TR')}</Text>
                    <Text style={styles.empWageSub}>{emp.daysWorked} gün hakediş</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
                </TouchableOpacity>

                {/* Attendance */}
                <View style={styles.attendanceRow}>
                  {ATTENDANCE_DAYS.map(day => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayBtn,
                        {
                          backgroundColor:
                            emp.attendance[day] === 'Geldi' ? colors.emerald.bg :
                            emp.attendance[day] === 'İzinli' ? colors.amber.bg :
                            emp.attendance[day] === 'Raporlu' ? colors.indigo.bg :
                            colors.rose.bg,
                          borderColor:
                            emp.attendance[day] === 'Geldi' ? colors.emerald.border :
                            emp.attendance[day] === 'İzinli' ? colors.amber.border :
                            emp.attendance[day] === 'Raporlu' ? colors.indigo.border :
                            colors.rose.border,
                        },
                      ]}
                      onPress={() => toggleAttendance(emp.id, day, emp.attendance[day])}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dayLabel}>{day}</Text>
                      <Text
                        style={[
                          styles.dayStatus,
                          {
                            color:
                              emp.attendance[day] === 'Geldi' ? colors.emerald.default :
                              emp.attendance[day] === 'İzinli' ? colors.amber.default :
                              emp.attendance[day] === 'Raporlu' ? colors.indigo.default :
                              colors.rose.default,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {emp.attendance[day] === 'Geldi' ? '✓' :
                         emp.attendance[day] === 'İzinli' ? 'İzin' :
                         emp.attendance[day] === 'Raporlu' ? 'Rap' : '✗'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Monthly Wage Input */}
                <View style={styles.wageRow}>
                  <Text style={styles.wageLabel}>Aylık Maaş:</Text>
                  <TextInput
                    style={styles.wageInput}
                    value={String(emp.monthlyWage)}
                    onChangeText={v => updateWage(emp.id, parseInt(v) || 0)}
                    keyboardType="numeric"
                  />
                  <Text style={styles.wageCurrency}>₺</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* TAB: ARŞİV */}
      {activeTab === 'arsiv' && (
        <View style={[styles.scroll, { flex: 1 }]}>
          {/* Filter Row */}
          <View style={styles.archiveFilters}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.yearRow}>
                {ARCHIVE_YEARS.map(y => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.yearBtn, archiveYear === y && styles.yearBtnActive]}
                    onPress={() => setArchiveYear(y)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.yearBtnText, archiveYear === y && styles.yearBtnTextActive]}>
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.archiveSearch}>
              <Ionicons name="search-outline" size={14} color={colors.text.faint} />
              <TextInput
                style={styles.archiveSearchInput}
                placeholder="Müşteri, mühendis veya iş..."
                placeholderTextColor={colors.text.faint}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          <FlatList
            data={filteredArchive}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.archiveList}
            renderItem={({ item }) => (
              <View style={styles.archiveCard}>
                <View style={styles.archiveCardLeft}>
                  <Text style={styles.archiveId}>{item.id}</Text>
                  <Text style={styles.archiveClient} numberOfLines={1}>{item.client}</Text>
                  <Text style={styles.archiveService} numberOfLines={1}>{item.serviceName}</Text>
                  <Text style={styles.archiveEngineer}>{item.engineer} · {item.date}</Text>
                </View>
                <View style={styles.archiveCardRight}>
                  <Text style={styles.archiveAmount}>
                    ₺{item.quoteAmount.toLocaleString('tr-TR')}
                  </Text>
                  <StatusBadge status={item.status} small />
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="folder-open-outline" size={48} color={colors.text.faint} />
                <Text style={styles.emptyTitle}>Kayıt bulunamadı</Text>
              </View>
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

// Approval Card Component
function ApprovalCard({
  order,
  margin,
  onApprove,
  onClientAccept,
}: {
  order: WorkOrder;
  margin: number;
  onApprove: () => void;
  onClientAccept: () => void;
}) {
  return (
    <View style={approvalStyles.card}>
      {/* Header */}
      <View style={approvalStyles.header}>
        <View>
          <Text style={approvalStyles.id}>{order.id}</Text>
          <Text style={approvalStyles.client}>{order.client}</Text>
          <Text style={approvalStyles.engineer}>Teknisyen: {order.engineer}</Text>
        </View>
        <StatusBadge status={order.status} />
      </View>

      {/* Photos */}
      <View style={approvalStyles.photos}>
        <View style={approvalStyles.photoBox}>
          <Text style={approvalStyles.photoLabel}>ÖNCESİ</Text>
          <Image
            source={{ uri: order.beforePhoto }}
            style={approvalStyles.photo}
            resizeMode="cover"
          />
        </View>
        <View style={approvalStyles.photoBox}>
          <Text style={approvalStyles.photoLabel}>SONRASI</Text>
          <Image
            source={{ uri: order.afterPhoto }}
            style={approvalStyles.photo}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Costs */}
      <View style={approvalStyles.costs}>
        <View style={approvalStyles.costItem}>
          <Text style={approvalStyles.costLbl}>Malzeme</Text>
          <Text style={approvalStyles.costVal}>
            ₺{order.materialCost.toLocaleString('tr-TR')}
          </Text>
        </View>
        <View style={approvalStyles.costItem}>
          <Text style={approvalStyles.costLbl}>İşçilik</Text>
          <Text style={approvalStyles.costVal}>
            ₺{order.laborCost.toLocaleString('tr-TR')}
          </Text>
        </View>
        <View style={approvalStyles.costItem}>
          <Text style={approvalStyles.costLbl}>Yol/Diğer</Text>
          <Text style={approvalStyles.costVal}>
            ₺{order.otherCost.toLocaleString('tr-TR')}
          </Text>
        </View>
        <View style={approvalStyles.costItem}>
          <Text style={[approvalStyles.costLbl, { color: colors.emerald.default }]}>Teklif</Text>
          <Text style={[approvalStyles.costVal, { color: colors.emerald.default, fontWeight: '900' }]}>
            ₺{order.quoteAmount.toLocaleString('tr-TR')}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={approvalStyles.footer}>
        <Text style={approvalStyles.margin}>Tahmini Kâr: %{margin.toFixed(1)}</Text>
        {order.status === 'Onay Bekliyor' ? (
          <TouchableOpacity style={approvalStyles.approveBtn} onPress={onApprove} activeOpacity={0.8}>
            <Text style={approvalStyles.approveBtnText}>Onayla & Müşteriye Gönder</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={approvalStyles.invoiceBtn} onPress={onClientAccept} activeOpacity={0.8}>
            <Text style={approvalStyles.invoiceBtnText}>Müşteri Onayladı (Fatura)</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const approvalStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  id: {
    fontSize: typography.xs,
    color: colors.text.faint,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  client: { fontSize: typography.md, color: colors.text.primary, fontWeight: '800', marginTop: 2 },
  engineer: { fontSize: typography.xs, color: colors.text.muted, marginTop: 2 },
  photos: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  photoBox: { flex: 1 },
  photoLabel: {
    fontSize: 9,
    color: colors.text.faint,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  photo: {
    width: '100%',
    height: 100,
    borderRadius: radius.md,
    backgroundColor: colors.bg.card,
  },
  costs: {
    flexDirection: 'row',
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  costItem: { flex: 1, alignItems: 'center' },
  costLbl: { fontSize: 9, color: colors.text.faint, fontWeight: '700', marginBottom: 3 },
  costVal: { fontSize: typography.xs, color: colors.text.secondary, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  margin: { fontSize: typography.xs, color: colors.text.muted },
  approveBtn: {
    backgroundColor: colors.emerald.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  approveBtnText: { color: colors.bg.primary, fontSize: typography.xs, fontWeight: '800' },
  invoiceBtn: {
    backgroundColor: colors.indigo.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  invoiceBtnText: { color: '#fff', fontSize: typography.xs, fontWeight: '800' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.emerald.default,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickText: { color: '#fff', fontWeight: '700' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.bg.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    paddingHorizontal: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: 3,
    position: 'relative',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.emerald.default,
  },
  tabText: { fontSize: typography.xs - 1, color: colors.text.faint, fontWeight: '600' },
  tabTextActive: { color: colors.emerald.default },
  badge: {
    position: 'absolute',
    top: 4,
    right: 6,
    backgroundColor: colors.amber.default,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, color: colors.bg.primary, fontWeight: '900' },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 32 },
  pageTitle: { fontSize: typography.lg, color: colors.text.primary, fontWeight: '900', marginBottom: 4 },
  pageSubtitle: { fontSize: typography.xs, color: colors.text.muted, marginBottom: spacing.lg, lineHeight: 17 },
  kpiGrid: { gap: spacing.md, marginBottom: spacing.xl },
  kpiCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  kpiLabel: { fontSize: typography.xs, color: colors.text.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  kpiValue: { fontSize: typography.xxxl, fontWeight: '900', marginTop: 4 },
  kpiSub: { fontSize: typography.xs, color: colors.text.faint, marginTop: 4 },
  section: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    marginBottom: spacing.xl,
  },
  sectionTitle: { fontSize: typography.xs, color: colors.text.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.md },
  barRow: { marginBottom: spacing.md },
  barYear: { fontSize: typography.xs, color: colors.text.secondary, fontWeight: '700', marginBottom: 5 },
  barTrack: {
    height: 10,
    backgroundColor: colors.bg.card,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 4,
  },
  barFill: { height: '100%', borderRadius: 5 },
  barLabel: { fontSize: typography.xs, color: colors.text.faint },
  aiCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.emerald.border,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  aiTitle: { fontSize: typography.sm, color: colors.emerald.default, fontWeight: '800' },
  aiBtn: {
    backgroundColor: colors.emerald.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  aiBtnText: { color: colors.bg.primary, fontSize: typography.xs, fontWeight: '800' },
  aiResult: { gap: spacing.md },
  aiSummary: {
    fontSize: typography.xs,
    color: colors.text.secondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  insightRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  insightNum: { fontSize: typography.sm, color: colors.emerald.default, fontWeight: '800' },
  insightText: { flex: 1, fontSize: typography.xs, color: colors.text.secondary, lineHeight: 17 },
  aiEmpty: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border.secondary,
  },
  aiEmptyText: { fontSize: typography.xs, color: colors.text.faint, textAlign: 'center', lineHeight: 18 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: spacing.md },
  emptyTitle: { fontSize: typography.sm, color: colors.text.faint, fontWeight: '600' },
  emptyDesc: { fontSize: typography.xs, color: colors.text.faint, textAlign: 'center', lineHeight: 18, paddingHorizontal: 24 },
  empCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  empHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  empAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg.card,
    borderWidth: 1.5,
    borderColor: colors.emerald.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empAvatarText: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  empName: { fontSize: typography.sm, color: colors.text.primary, fontWeight: '700' },
  empRole: { fontSize: typography.xs, color: colors.text.muted, marginTop: 1 },
  empWage: { alignItems: 'flex-end' },
  empWageVal: { fontSize: typography.md, color: colors.emerald.default, fontWeight: '900' },
  empWageSub: { fontSize: 9, color: colors.text.faint, marginTop: 2 },
  attendanceRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.md,
  },
  dayBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: radius.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  dayLabel: { fontSize: 8, color: colors.text.muted, fontWeight: '600', marginBottom: 2 },
  dayStatus: { fontSize: 9, fontWeight: '800' },
  wageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  wageLabel: { fontSize: typography.xs, color: colors.text.muted, fontWeight: '600', flex: 1 },
  wageInput: {
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.sm,
    color: colors.text.primary,
    fontSize: typography.sm,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    width: 80,
    textAlign: 'right',
  },
  wageCurrency: { fontSize: typography.sm, color: colors.text.muted },
  archiveFilters: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  yearRow: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.md },
  yearBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  yearBtnActive: { backgroundColor: colors.emerald.default, borderColor: colors.emerald.default },
  yearBtnText: { fontSize: typography.xs, color: colors.text.muted, fontWeight: '600' },
  yearBtnTextActive: { color: colors.bg.primary },
  archiveSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  archiveSearchInput: { flex: 1, color: colors.text.primary, fontSize: typography.sm },
  archiveList: { paddingHorizontal: spacing.lg, paddingBottom: 24 },
  archiveCard: {
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
  archiveCardLeft: { flex: 1 },
  archiveId: { fontSize: typography.xs, color: colors.text.faint, fontWeight: '600' },
  archiveClient: { fontSize: typography.sm, color: colors.text.primary, fontWeight: '700' },
  archiveService: { fontSize: typography.xs, color: colors.text.muted, marginTop: 1 },
  archiveEngineer: { fontSize: typography.xs, color: colors.text.faint, marginTop: 2 },
  archiveCardRight: { alignItems: 'flex-end', gap: 6 },
  archiveAmount: { fontSize: typography.sm, color: colors.emerald.default, fontWeight: '800' },
});
