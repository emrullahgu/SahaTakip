// BordroScreen — Birleşik bordro. Herkes KENDİ bordrosunu görür + PDF indirir;
// yönetici/müdür HERKESİ görür, mesai/maaş/avans düzenler, tek tek ve toplu PDF indirir.
// Kolonlar: İsim · TC · Anlaşılan net · Gün · Mesai · Hakediş · Avans · Prim · Resmi · Ek · Toplam.
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Modal, Pressable, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography, brand } from '../theme';
import { RootStackParamList, Bordro, BordroStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import {
  bordroForPeriod, saveBordro, deleteBordro, draftFor, bordroTotals, currentPeriod, recentPeriods,
  BORDRO_STATUS_LABEL, BORDRO_STATUS_COLOR,
} from '../services/bordro';
import { fmtTRY } from '../services/bordroEngine';
import { exportBordroSingle, exportBordroBulk } from '../services/bordroPdf';
import { newUuid } from '../services/data/repository';
import EmptyState from '../components/EmptyState';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'Bordro'>;
const HS = { top: 8, bottom: 8, left: 8, right: 8 };

export default function BordroScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { profile, user, isDemoMode } = useAuth();
  const { employees } = useAppContext();
  const role = profile?.role ?? (isDemoMode ? 'admin' : 'field');
  const isManager = isDemoMode || role === 'admin' || role === 'manager';

  const [period, setPeriod] = useState(route.params?.period || currentPeriod());
  const [rows, setRows] = useState<Bordro[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Bordro | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try { setRows(await bordroForPeriod(period)); }
    finally { setLoading(false); }
  }, [period]);
  useFocusEffect(useCallback(() => { setLoading(true); refresh(); }, [refresh]));

  const onAddEmployee = (emp: { id: string; name: string; monthlyWage?: number }) => {
    setPickOpen(false);
    setEditing(draftFor(emp.id, emp.name, period, emp.monthlyWage || 0));
  };

  // Kayıtlı personel olmasa da elle yeni kişi ekle (ad/TC editörde girilir).
  const onAddManual = () => {
    setPickOpen(false);
    setEditing(draftFor(newUuid(), '', period, 0));
  };

  const onSave = async (b: Bordro) => {
    setBusy(true);
    try { await saveBordro(b); setEditing(null); await refresh(); }
    catch (e: any) { Alert.alert('Kaydedilemedi', e?.message || 'Hata'); await refresh(); } // ekranı gerçek DB durumuyla hizala
    finally { setBusy(false); }
  };

  const onDelete = (b: Bordro) => {
    Alert.alert('Bordroyu sil', `${b.fullName} — ${b.period} bordrosu silinecek.`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { try { await deleteBordro(b.id); refresh(); } catch (e: any) { Alert.alert('Silinemedi', e?.message || 'Hata'); } } },
    ]);
  };

  const exportOne = async (b: Bordro) => { try { await exportBordroSingle(b); } catch (e: any) { Alert.alert('PDF hata', e?.message || 'Oluşturulamadı'); } };
  const exportAll = async () => { if (!rows.length) return; try { await exportBordroBulk(period, rows); } catch (e: any) { Alert.alert('PDF hata', e?.message || 'Oluşturulamadı'); } };

  // Henüz bordrosu girilmemiş personeller (manager ekleme listesi)
  const inPeriod = new Set(rows.map(r => r.employeeId));
  const addable = employees.filter(e => !inPeriod.has(e.id));

  const PeriodBar = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.periodBar}>
      {recentPeriods(12).map(p => (
        <TouchableOpacity key={p} style={[s.periodChip, p === period && s.periodChipSel]} onPress={() => { setLoading(true); setPeriod(p); }}>
          <Text style={[s.periodText, p === period && s.periodTextSel]}>{p}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  if (loading) {
    return <SafeAreaView style={s.safe} edges={['bottom']}><View style={s.center}><ActivityIndicator color={brand.green} /></View></SafeAreaView>;
  }

  // ── Çalışan görünümü (kendi bordrosu) ──
  if (!isManager) {
    // GİZLİLİK: çevrimiçi RLS zaten yalnız kendi satırını döndürür; yine de isimle eşleştir
    // (çevrimdışı bayat cache başka kişinin verisini içerirse yanlış PII gösterilmesin).
    const norm = (x?: string | null) => (x || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
    const myName = norm(profile?.full_name);
    const mine = (myName ? rows.find(r => norm(r.fullName) === myName) : undefined) || (rows.length === 1 ? rows[0] : undefined);
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        {PeriodBar}
        <ScrollView contentContainerStyle={s.content}>
          {!mine ? (
            <EmptyState icon="receipt-outline" title="Bordro yok" description={`${period} dönemi için bordronuz henüz girilmemiş. Yöneticinizle görüşün.`} />
          ) : (
            <SelfCard b={mine} onPdf={() => exportOne(mine)} />
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Yönetici görünümü (herkes, düzenlenebilir tablo) ──
  const grand = rows.reduce((sum, b) => sum + bordroTotals(b).total, 0);
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {PeriodBar}
      <View style={s.actionBar}>
        <Text style={s.countText}>{rows.length} personel · Net toplam {fmtTRY(grand)}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={s.smallBtn} onPress={exportAll} disabled={!rows.length}><Ionicons name="download-outline" size={15} color="#fff" /><Text style={s.smallBtnText}>Toplu PDF</Text></TouchableOpacity>
          <TouchableOpacity style={[s.smallBtn, { backgroundColor: brand.blue }]} onPress={() => setPickOpen(true)}><Ionicons name="add" size={16} color="#fff" /><Text style={s.smallBtnText}>Personel</Text></TouchableOpacity>
        </View>
      </View>

      {rows.length === 0 ? (
        <EmptyState icon="receipt-outline" title="Bordro yok" description={`${period} için bordro girilmemiş. "Personel" ile ekleyin.`} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            {/* Başlık */}
            <View style={[s.tr, s.thead]}>
              <Text style={[s.th, s.cName]}>İsim Soyisim</Text>
              <Text style={[s.th, s.cTc]}>TC</Text>
              <Text style={[s.th, s.cNum]}>Anlaşılan</Text>
              <Text style={[s.th, s.cDay]}>Gün</Text>
              <Text style={[s.th, s.cNum]}>Mesai</Text>
              <Text style={[s.th, s.cNum]}>Hakediş</Text>
              <Text style={[s.th, s.cNum]}>Avans</Text>
              <Text style={[s.th, s.cNum]}>Prim</Text>
              <Text style={[s.th, s.cNum]}>Resmi</Text>
              <Text style={[s.th, s.cNum]}>Ek ödeme</Text>
              <Text style={[s.th, s.cTot]}>Toplam</Text>
              <Text style={[s.th, s.cAct]}>İşlem</Text>
            </View>
            <ScrollView style={{ maxHeight: 9999 }}>
              {rows.map(b => {
                const t = bordroTotals(b);
                return (
                  <TouchableOpacity key={b.id} style={s.tr} onPress={() => setEditing(b)} activeOpacity={0.7}>
                    <Text style={[s.td, s.cName]} numberOfLines={1}>{b.fullName}</Text>
                    <Text style={[s.td, s.cTc]} numberOfLines={1}>{b.nationalId || '—'}</Text>
                    <Text style={[s.td, s.cNum]}>{fmtTRY(b.agreedNet)}</Text>
                    <Text style={[s.td, s.cDay]}>{b.workedDays}</Text>
                    <Text style={[s.td, s.cNum]}>{fmtTRY(t.overtimePay)}</Text>
                    <Text style={[s.td, s.cNum]}>{fmtTRY(t.hakedis)}</Text>
                    <Text style={[s.td, s.cNum]}>{fmtTRY(b.advance)}</Text>
                    <Text style={[s.td, s.cNum]}>{fmtTRY(b.bonus)}</Text>
                    <Text style={[s.td, s.cNum]}>{fmtTRY(b.officialSalary)}</Text>
                    <Text style={[s.td, s.cNum]}>{fmtTRY(b.extraPayment)}</Text>
                    <Text style={[s.td, s.cTot]}>{fmtTRY(t.total)}</Text>
                    <View style={[s.cAct, { flexDirection: 'row', gap: 10, justifyContent: 'center' }]}>
                      <TouchableOpacity onPress={() => exportOne(b)} hitSlop={HS}><Ionicons name="download-outline" size={17} color={colors.indigo.default} /></TouchableOpacity>
                      <TouchableOpacity onPress={() => onDelete(b)} hitSlop={HS}><Ionicons name="trash-outline" size={16} color={colors.rose.default} /></TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </ScrollView>
      )}

      {/* Personel seçici */}
      <Modal visible={pickOpen} transparent animationType="slide" onRequestClose={() => setPickOpen(false)}>
        <Pressable style={s.modalBg} onPress={() => setPickOpen(false)}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <Text style={s.sheetTitle}>Personel ekle — {period}</Text>
            {/* Her zaman erişilebilir: elle yeni kişi (kayıtlı personel olmasa da çalışır) */}
            <TouchableOpacity style={[s.pickRow, { borderBottomWidth: 1, borderBottomColor: colors.border.secondary }]} onPress={onAddManual} activeOpacity={0.7}>
              <Ionicons name="add-circle" size={24} color={brand.green} />
              <View style={{ flex: 1 }}>
                <Text style={[s.pickName, { color: brand.green }]}>Yeni kişi ekle (manuel)</Text>
                <Text style={s.pickRole}>Ad, TC ve maaş bir sonraki ekranda girilir</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.faint} />
            </TouchableOpacity>
            <ScrollView style={{ maxHeight: 340 }}>
              {employees.length === 0 ? (
                <Text style={s.muted}>Kayıtlı personel yok. Yukarıdan "manuel" ile ekleyin.</Text>
              ) : addable.length === 0 ? (
                <Text style={s.muted}>Tüm kayıtlı personel bu döneme eklendi. Yeni kişi için "manuel" kullanın.</Text>
              ) : addable.map(e => (
                <TouchableOpacity key={e.id} style={s.pickRow} onPress={() => onAddEmployee(e)} activeOpacity={0.7}>
                  <Ionicons name="person-circle-outline" size={22} color={colors.text.muted} />
                  <View style={{ flex: 1 }}><Text style={s.pickName}>{e.name}</Text><Text style={s.pickRole}>{e.role}</Text></View>
                  <Ionicons name="add-circle-outline" size={20} color={brand.green} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {editing && (
        <BordroEditor b={editing} busy={busy} onClose={() => setEditing(null)} onSave={onSave} />
      )}
    </SafeAreaView>
  );
}

function SelfCard({ b, onPdf }: { b: Bordro; onPdf: () => void }) {
  const t = bordroTotals(b);
  const Row = ({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) => (
    <View style={s.selfRow}><Text style={s.selfLabel}>{label}</Text><Text style={[s.selfVal, strong && { fontWeight: '900', fontSize: typography.md }, color ? { color } : null]}>{value}</Text></View>
  );
  return (
    <View style={s.selfCard}>
      <View style={s.selfHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.selfName}>{b.fullName}</Text>
          <Text style={s.selfPeriod}>{b.period}{b.nationalId ? ` · TC: ${b.nationalId}` : ''}</Text>
        </View>
        <View style={[s.statusPill, { backgroundColor: BORDRO_STATUS_COLOR[b.status] + '22', borderColor: BORDRO_STATUS_COLOR[b.status] }]}>
          <Text style={[s.statusText, { color: BORDRO_STATUS_COLOR[b.status] }]}>{BORDRO_STATUS_LABEL[b.status]}</Text>
        </View>
      </View>
      <Row label="Anlaşılan net" value={fmtTRY(b.agreedNet)} />
      <Row label="Çalışılan gün" value={`${b.workedDays} gün`} />
      <Row label="Mesai" value={`${b.overtimeHours} sa · ${fmtTRY(t.overtimePay)}`} />
      <Row label="Pazar/Tatil farkı" value={fmtTRY(t.sundayHolidayPay)} />
      <Row label="Prim" value={fmtTRY(b.bonus)} />
      <Row label="Gider" value={fmtTRY(b.expense)} />
      <Row label="Ek ödeme" value={fmtTRY(b.extraPayment)} />
      <View style={s.selfDivider} />
      <Row label="Hakediş toplam" value={fmtTRY(t.hakedis)} strong />
      <Row label="Gelmedi kesintisi" value={`− ${fmtTRY(t.absentDeduction)}`} color={colors.rose.default} />
      <Row label="Avans" value={`− ${fmtTRY(b.advance)}`} color={colors.rose.default} />
      <View style={s.selfDivider} />
      <Row label="NET ÖDENECEK" value={fmtTRY(t.total)} strong color={brand.green} />
      <Row label="Resmi maaş (bilgi)" value={fmtTRY(b.officialSalary)} />
      <TouchableOpacity style={s.pdfBtn} onPress={onPdf} activeOpacity={0.85}>
        <Ionicons name="download-outline" size={18} color="#fff" /><Text style={s.pdfBtnText}>Bordromu PDF indir</Text>
      </TouchableOpacity>
    </View>
  );
}

const STATUSES: BordroStatus[] = ['taslak', 'onaylandi', 'odendi'];
function BordroEditor({ b, busy, onClose, onSave }: { b: Bordro; busy: boolean; onClose: () => void; onSave: (b: Bordro) => void }) {
  const [d, setD] = useState<Bordro>(b);
  const t = bordroTotals(d);
  const set = (patch: Partial<Bordro>) => setD(prev => ({ ...prev, ...patch }));
  const numField = (label: string, key: keyof Bordro, suffix?: string) => (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}{suffix ? ` (${suffix})` : ''}</Text>
      <TextInput style={s.fieldInput} keyboardType="numeric" value={String((d[key] as number) ?? 0)} onChangeText={tx => set({ [key]: parseFloat(tx.replace(',', '.')) || 0 } as any)} placeholderTextColor={colors.text.faint} />
    </View>
  );
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.modalBg} onPress={onClose}>
        <Pressable style={s.editor} onPress={e => e.stopPropagation()}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={s.editorHead}>
              <Text style={s.editorTitle}>{b.fullName || 'Bordro'} · {b.period}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={HS}><Ionicons name="close" size={22} color={colors.text.muted} /></TouchableOpacity>
            </View>

            <View style={s.field}><Text style={s.fieldLabel}>İsim Soyisim</Text>
              <TextInput style={s.fieldInput} value={d.fullName} onChangeText={tx => set({ fullName: tx })} placeholderTextColor={colors.text.faint} /></View>
            <View style={s.field}><Text style={s.fieldLabel}>TC Kimlik No</Text>
              <TextInput style={s.fieldInput} keyboardType="numeric" value={d.nationalId} onChangeText={tx => set({ nationalId: tx })} maxLength={11} placeholderTextColor={colors.text.faint} /></View>

            <View style={s.fieldRow}>{numField('Anlaşılan net', 'agreedNet', '₺')}{numField('Çalışılan gün', 'workedDays')}</View>
            <View style={s.fieldRow}>{numField('Mesai', 'overtimeHours', 'saat')}{numField('Pazar/Tatil', 'sundayHolidayDays', 'gün')}</View>
            <View style={s.fieldRow}>{numField('Gelmedi', 'absentDays', 'gün')}{numField('Avans', 'advance', '₺')}</View>
            <View style={s.fieldRow}>{numField('Prim', 'bonus', '₺')}{numField('Gider', 'expense', '₺')}</View>
            <View style={s.fieldRow}>{numField('Resmi maaş', 'officialSalary', '₺')}{numField('Ek ödeme', 'extraPayment', '₺')}</View>

            <Text style={s.fieldLabel}>Durum</Text>
            <View style={s.statusRow}>
              {STATUSES.map(st => (
                <TouchableOpacity key={st} style={[s.statusChoice, d.status === st && { backgroundColor: BORDRO_STATUS_COLOR[st] + '22', borderColor: BORDRO_STATUS_COLOR[st] }]} onPress={() => set({ status: st })}>
                  <Text style={[s.statusChoiceText, d.status === st && { color: BORDRO_STATUS_COLOR[st] }]}>{BORDRO_STATUS_LABEL[st]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Canlı hesap */}
            <View style={s.calcBox}>
              <View style={s.calcRow}><Text style={s.calcLabel}>Mesai ödemesi</Text><Text style={s.calcVal}>{fmtTRY(t.overtimePay)}</Text></View>
              <View style={s.calcRow}><Text style={s.calcLabel}>Pazar/Tatil farkı</Text><Text style={s.calcVal}>{fmtTRY(t.sundayHolidayPay)}</Text></View>
              <View style={s.calcRow}><Text style={s.calcLabel}>Hakediş toplam</Text><Text style={[s.calcVal, { fontWeight: '800' }]}>{fmtTRY(t.hakedis)}</Text></View>
              <View style={s.calcRow}><Text style={s.calcLabel}>Gelmedi kesintisi</Text><Text style={[s.calcVal, { color: colors.rose.default }]}>− {fmtTRY(t.absentDeduction)}</Text></View>
              <View style={s.calcRow}><Text style={[s.calcLabel, { fontWeight: '900' }]}>NET TOPLAM</Text><Text style={[s.calcVal, { fontWeight: '900', color: brand.green, fontSize: typography.md }]}>{fmtTRY(t.total)}</Text></View>
            </View>

            <TouchableOpacity style={s.saveBtn} onPress={() => onSave(d)} disabled={busy} activeOpacity={0.85}>
              {busy ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark" size={20} color="#fff" /><Text style={s.saveBtnText}>Kaydet</Text></>}
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.text.muted, padding: spacing.md },
  content: { padding: spacing.lg, paddingBottom: 90 },
  periodBar: { gap: 8, padding: spacing.md },
  periodChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  periodChipSel: { backgroundColor: brand.blue, borderColor: brand.blue },
  periodText: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  periodTextSel: { color: '#fff' },
  actionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: 8, flexWrap: 'wrap' },
  countText: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: brand.green, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.full },
  smallBtnText: { color: '#fff', fontSize: typography.xs, fontWeight: '800' },
  // tablo
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.primary },
  thead: { backgroundColor: colors.bg.secondary, borderBottomWidth: 1 },
  th: { color: colors.text.muted, fontSize: 10, fontWeight: '800', paddingVertical: 9, paddingHorizontal: 6 },
  td: { color: colors.text.primary, fontSize: typography.xs, paddingVertical: 11, paddingHorizontal: 6, textAlign: 'right' },
  cName: { width: 120, textAlign: 'left' }, cTc: { width: 92, textAlign: 'left' }, cDay: { width: 44, textAlign: 'center' },
  cNum: { width: 86 }, cTot: { width: 100, fontWeight: '900', color: brand.green }, cAct: { width: 64 },
  // self card
  selfCard: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.lg, padding: spacing.lg },
  selfHead: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  selfName: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '900' },
  selfPeriod: { color: colors.text.muted, fontSize: typography.sm, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1 },
  statusText: { fontSize: typography.xs, fontWeight: '800' },
  selfRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  selfLabel: { color: colors.text.muted, fontSize: typography.base },
  selfVal: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  selfDivider: { height: 1, backgroundColor: colors.border.primary, marginVertical: 6 },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: brand.blue, paddingVertical: 13, borderRadius: radius.md, marginTop: spacing.lg },
  pdfBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.base },
  // modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing.xxl },
  sheetTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginBottom: spacing.md },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.primary },
  pickName: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  pickRole: { color: colors.text.muted, fontSize: typography.xs },
  editor: { backgroundColor: colors.bg.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing.xxl, maxHeight: '92%' },
  editorHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  editorTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', flex: 1 },
  field: { flex: 1, marginTop: spacing.sm },
  fieldRow: { flexDirection: 'row', gap: spacing.md },
  fieldLabel: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginBottom: 5, marginTop: spacing.sm },
  fieldInput: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.text.primary, fontSize: typography.base },
  statusRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  statusChoice: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary },
  statusChoiceText: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  calcBox: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg, gap: 4 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between' },
  calcLabel: { color: colors.text.muted, fontSize: typography.sm },
  calcVal: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: brand.green, paddingVertical: 14, borderRadius: radius.md, marginTop: spacing.lg },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.md },
});
