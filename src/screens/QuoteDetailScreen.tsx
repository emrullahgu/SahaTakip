import React, { useState } from 'react';
import { localDateISO } from '../utils/date';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Share, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAppContext, calcLineTotal } from '../context/AppContext';
import { RootStackParamList, QuoteStatus, Quote } from '../types';
import EmptyState from '../components/EmptyState';
import { generateAndShareQuotePdf } from '../services/pdf';
import { sendQuoteEmail } from '../services/quoteEmail';
import { newUuid } from '../services/data/repository';

type DetailRoute = RouteProp<RootStackParamList, 'QuoteDetail'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

const NEXT_STATUS: Record<QuoteStatus, QuoteStatus | null> = {
  'Taslak': 'Onay Bekliyor',
  'Onay Bekliyor': 'Müşteriye Gönderildi',
  'Müşteriye Gönderildi': 'Kabul Edildi',
  'Kabul Edildi': 'Faturalandırıldı',
  'Reddedildi': null,
  'Faturalandırıldı': null,
};

const ALL_STATUSES: QuoteStatus[] = [
  'Taslak',
  'Onay Bekliyor',
  'Müşteriye Gönderildi',
  'Kabul Edildi',
  'Reddedildi',
  'Faturalandırıldı',
];

export default function QuoteDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<DetailRoute>();
  const { quotes, setQuoteStatus, deleteQuote, toast, showToast, acceptQuoteAndCreateWorkOrder, generateQuoteShareToken, addQuote, generateQuoteNumber } = useAppContext();
  const quote = quotes.find(q => q.id === route.params.quoteId);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  if (!quote) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <EmptyState
            icon="document-text-outline"
            title="Teklif bulunamadı"
            subtitle="Teklif silinmiş veya henüz yüklenmemiş olabilir."
            actionLabel="Geri Dön"
            onAction={() => navigation.goBack()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const nextStatus = NEXT_STATUS[quote.status];
  const canEdit = true; // Revize/düzenleme her durumda açık; faturalandırılmış teklif düzenlenirse revizyon oluşur.

  const handleCopy = async () => {
    const copy: Quote = {
      ...quote,
      id: newUuid(),
      number: generateQuoteNumber(),
      status: 'Taslak',
      date: localDateISO(),
      revision: 0,
      generatedWorkOrderId: undefined,
      title: `${quote.title} (Kopya)`,
      lines: (quote.lines ?? []).map(l => ({ ...l })),
    };
    // Kayıt başarısını bekle: başarısızsa navigate ETME (önceden boş/yok teklife
    // gidiliyordu) — kullanıcı dürüstçe bilgilendirilir.
    const res = await addQuote(copy);
    if (!res.ok) { showToast('Teklif kopyalanamadı: ' + (res.error || 'bilinmeyen hata'), 'error'); return; }
    showToast('Teklif kopyalandı. Taslak olarak açılıyor.');
    navigation.replace('QuoteDetail', { quoteId: copy.id });
  };

  const handleSetStatus = async (s: QuoteStatus) => {
    // 'Kabul Edildi'yi doğrudan set etmek iş emri oluşturmaz: teklif kabul
    // görünür ama arkasında iş emri yoktur (Req#3 dürüstlük ihlali + yönetici
    // boru hattı kırılır). Bu durumda gerçek kabul akışını çalıştır.
    if (s === 'Kabul Edildi' && !quote.generatedWorkOrderId) {
      setShowStatusModal(false);
      Alert.alert(
        'Teklifi kabul et',
        `${quote.number} kabul edilip otomatik iş emri oluşturulsun mu?`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Kabul Et',
            onPress: () => {
              const woId = acceptQuoteAndCreateWorkOrder(quote.id, quote.engineer);
              if (woId) showToast(`Kabul edildi · İş emri: ${woId}`);
            },
          },
        ],
      );
      return;
    }
    setShowStatusModal(false);
    // Başarı toast'ı yalnız DB yazımı başarılıysa (Req#3) — önceden koşulsuz "güncellendi"
    // gösteriliyordu, DB reddetse bile kullanıcı değişmiş sanıyordu.
    const res = await setQuoteStatus(quote.id, s);
    if (!res.ok) { showToast('Durum güncellenemedi: ' + (res.error || 'bilinmeyen hata'), 'error'); return; }
    showToast(`Durum güncellendi: ${s}`);
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: canEdit
        ? () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('NewQuote', { quoteId: quote.id })}
              style={styles.headerEditBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={16} color={brand.green} />
              <Text style={styles.headerEditBtnText}>Revize Et</Text>
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [navigation, quote.id, canEdit]);

  const handleDelete = () => {
    Alert.alert('Teklifi Sil', 'Bu teklifi silmek istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          deleteQuote(quote.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.card}>
          <Text style={styles.number}>{quote.number}</Text>
          <Text style={styles.title}>{quote.title}</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{quote.status}</Text>
          </View>
          <View style={styles.metaGrid}>
            <Meta label="Müşteri" value={quote.customerName} />
            <Meta label="Tarih" value={quote.date} />
            <Meta label="Mühendis" value={quote.engineer} />
            <Meta label="Kalem Sayısı" value={String(quote.lines.length)} />
          </View>
          {canEdit && (
            <TouchableOpacity
              style={styles.reviseHeaderBtn}
              onPress={() => navigation.navigate('NewQuote', { quoteId: quote.id })}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={16} color="#fff" />
              <Text style={styles.reviseHeaderBtnText}>
                Revize Et {quote.revision ? `(rev ${quote.revision})` : ''}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Lines */}
        <Text style={styles.sectionLabel}>Kalemler</Text>
        {quote.lines.map((line, idx) => {
          const calc = calcLineTotal(line);
          return (
            <View key={idx} style={styles.lineCard}>
              <View style={styles.lineHeader}>
                <View style={styles.lineNoCircle}>
                  <Text style={styles.lineNoText}>{line.lineNo}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.linePozId}>{line.pozName || 'Kalem'}</Text>
                </View>
              </View>
              <View style={styles.lineMeta}>
                <Text style={styles.lineMetaTxt}>
                  {line.quantity} {line.unit} × ₺{(line.materialPrice + line.installPrice + (line.withDismantle ? line.dismantlePrice : 0)).toLocaleString('tr-TR')}
                </Text>
                <Text style={styles.lineTotal}>
                  ₺{calc.total.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Totals */}
        <View style={[styles.card, { marginTop: spacing.lg }]}>
          <Row label="Ara Toplam (KDV Hariç)" value={quote.subtotal} />
          <Row label="KDV Toplamı" value={quote.vatTotal} />
          <View style={styles.divider} />
          <Row label="GENEL TOPLAM" value={quote.grandTotal} bold />
        </View>

        {quote.notes ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Notlar</Text>
            <Text style={styles.notes}>{quote.notes}</Text>
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          {/* Revize Et — her durumda görünür; tüm alanları NewQuote'ta düzenlersin */}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('NewQuote', { quoteId: quote.id })}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={styles.editBtnText}>
              Revize Et {quote.revision ? `(rev ${quote.revision})` : ''}
            </Text>
          </TouchableOpacity>

          {/* Kopyala — faturalanan/reddedilen/her teklif yeni taslak olarak kopyalanabilir */}
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={handleCopy}
            activeOpacity={0.85}
          >
            <Ionicons name="copy-outline" size={18} color={brand.green} />
            <Text style={styles.copyBtnText}>Yeni Taslak Olarak Kopyala</Text>
          </TouchableOpacity>

          {/* Durum değiştir — herhangi bir aşamaya taşı (geri al / ileri al) */}
          <TouchableOpacity
            style={styles.statusBtn}
            onPress={() => setShowStatusModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="swap-horizontal-outline" size={18} color={colors.indigo.light} />
            <Text style={styles.statusBtnText}>Durumu Değiştir ({quote.status})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pdfBtn, pdfLoading && { opacity: 0.6 }]}
            onPress={async () => {
              if (!quote) return;
              setPdfLoading(true);
              try {
                await generateAndShareQuotePdf(quote);
                showToast('PDF oluşturuldu');
              } catch (e: any) {
                Alert.alert('PDF hatası', e?.message ?? 'PDF oluşturulamadı.');
              } finally {
                setPdfLoading(false);
              }
            }}
            disabled={pdfLoading}
            activeOpacity={0.85}
          >
            {pdfLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={18} color="#fff" />
                <Text style={styles.pdfBtnText}>PDF Oluştur & Paylaş</Text>
              </>
            )}
          </TouchableOpacity>

          {nextStatus && (
            <TouchableOpacity
              style={styles.advanceBtn}
              onPress={() => handleSetStatus(nextStatus)}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-forward-circle" size={18} color="#fff" />
              <Text style={styles.advanceBtnText}>{nextStatus}'e Geçir</Text>
            </TouchableOpacity>
          )}

          {/* FAZ 4 — E-posta gönder */}
          <TouchableOpacity
            style={styles.emailBtn}
            onPress={async () => {
              Alert.prompt?.(
                'E-posta adresi',
                'Teklifi göndereceğiniz adres:',
                async (email?: string) => {
                  if (!email) return;
                  const res = await sendQuoteEmail(quote, email);
                  showToast(
                    res.ok
                      ? res.mode === 'edge'
                        ? 'E-posta gönderildi.'
                        : 'Mail uygulaması açıldı.'
                      : 'Gönderilemedi.',
                    res.ok ? 'success' : 'error',
                  );
                },
                'plain-text',
              );
              if (!Alert.prompt) {
                const r = await sendQuoteEmail(quote, 'musteri@ornek.com');
                showToast(r.ok ? 'Mail uygulaması açıldı.' : 'Gönderilemedi.', r.ok ? 'success' : 'error');
              }
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="mail-outline" size={16} color="#fff" />
            <Text style={styles.emailBtnText}>E-posta ile Gönder</Text>
          </TouchableOpacity>

          {/* FAZ 4 — Revizyonlar */}
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => navigation.navigate('QuoteRevisions', { quoteId: quote.id })}
            activeOpacity={0.8}
          >
            <Ionicons name="layers-outline" size={16} color={brand.green} />
            <Text style={styles.linkBtnText}>
              Revizyon Geçmişi {quote.revision ? `(${quote.revision})` : ''}
            </Text>
          </TouchableOpacity>

          {/* AI Ajan — bu teklif üzerinde otonom çalış */}
          <TouchableOpacity
            style={[styles.linkBtn, { backgroundColor: '#7c3aed1a', borderColor: '#7c3aed' }]}
            onPress={() => navigation.navigate('AgentConsole', {
              initialGoal:
                `Teklif ${quote.number} (id: ${quote.id}) için profesyonel bir açıklama yaz: ` +
                `kapsam, varsayımlar, hariç tutulanlar, garanti (TSE/EMO standartları), ` +
                `ödeme koşulu, teslim süresi. Gerekirse web'de ilgili standartları araştır ve ` +
                `\`update_quote_notes\` ile teklife yaz.`,
              autoStart: false,
            })}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={16} color="#7c3aed" />
            <Text style={[styles.linkBtnText, { color: '#7c3aed' }]}>
              AI Ajan: Açıklamayı otomatik doldur
            </Text>
          </TouchableOpacity>

          {/* FAZ 4 — Müşteri kabul linki paylaş (POZ-DEV-040) */}
          {quote.status !== 'Reddedildi' && quote.status !== 'Faturalandırıldı' && !quote.generatedWorkOrderId && (
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={async () => {
                const token = generateQuoteShareToken(quote.id);
                if (!token) {
                  showToast('Link oluşturulamadı.', 'error');
                  return;
                }
                const url = `https://sahatakip.app/quote/${token}`;
                const deepLink = `sahatakip://quote-accept/${token}`;
                const message =
                  `Sayın ${quote.customerTitle || quote.customerName},\n\n` +
                  `${quote.number} numaralı teklifimizi aşağıdaki linkten inceleyip onaylayabilirsiniz:\n\n` +
                  `${url}\n\n` +
                  `Mobil uygulama linki: ${deepLink}\n\n` +
                  `Tutar: ${quote.grandTotal.toLocaleString('tr-TR')} ₺`;
                try {
                  await Share.share({
                    title: `Teklif ${quote.number}`,
                    message,
                    ...(Platform.OS === 'ios' ? { url } : {}),
                  });
                  showToast('Kabul linki paylaşıldı.');
                } catch (e: any) {
                  showToast(e?.message ?? 'Paylaşılamadı.', 'error');
                }
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="share-social-outline" size={16} color="#fff" />
              <Text style={styles.shareBtnText}>
                {quote.shareToken ? 'Kabul Linkini Tekrar Paylaş' : 'Müşteri Kabul Linki Oluştur ve Paylaş'}
              </Text>
            </TouchableOpacity>
          )}

          {/* FAZ 4 — Kabul + iş emri oluştur */}
          {(quote.status === 'Müşteriye Gönderildi' || quote.status === 'Onay Bekliyor') && (
            <TouchableOpacity
              style={[styles.advanceBtn, { backgroundColor: colors.emerald.default }]}
              onPress={() => {
                Alert.alert(
                  'Teklifi kabul et',
                  `${quote.number} kabul edilip otomatik iş emri oluşturulsun mu?`,
                  [
                    { text: 'Vazgeç', style: 'cancel' },
                    {
                      text: 'Kabul Et',
                      onPress: () => {
                        const woId = acceptQuoteAndCreateWorkOrder(quote.id, quote.engineer);
                        if (woId) {
                          Alert.alert('Tamam', `İş emri: ${woId}`);
                        }
                      },
                    },
                  ],
                );
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-done-circle" size={18} color="#fff" />
              <Text style={styles.advanceBtnText}>Kabul + İş Emri Oluştur</Text>
            </TouchableOpacity>
          )}

          {quote.generatedWorkOrderId && (
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() =>
                navigation.navigate('WorkOrderDetail', {
                  workOrderId: quote.generatedWorkOrderId!,
                })
              }
              activeOpacity={0.8}
            >
              <Ionicons name="briefcase-outline" size={16} color={brand.green} />
              <Text style={styles.linkBtnText}>Üretilmiş İş Emri: {quote.generatedWorkOrderId}</Text>
            </TouchableOpacity>
          )}

          {quote.status !== 'Reddedildi' && quote.status !== 'Faturalandırıldı' && (
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => handleSetStatus('Reddedildi')}
              activeOpacity={0.85}
            >
              <Text style={styles.rejectBtnText}>Reddedildi olarak işaretle</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.85}>
            <Ionicons name="trash-outline" size={16} color={colors.rose.default} />
            <Text style={styles.deleteBtnText}>Teklifi Sil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* DURUM DEĞİŞTİR MODAL */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}
        >
          <View style={styles.statusSheet}>
            <Text style={styles.statusSheetTitle}>Durumu Seç</Text>
            <Text style={styles.statusSheetSub}>
              Teklifi istediğin aşamaya taşı (geri al / ileri al).
            </Text>
            {ALL_STATUSES.map(s => {
              const active = s === quote.status;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusOption, active && styles.statusOptionActive]}
                  onPress={() => handleSetStatus(s)}
                  disabled={active}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={active ? brand.green : colors.text.muted}
                  />
                  <Text style={[styles.statusOptionText, active && { color: brand.green, fontWeight: '800' }]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.statusCancel}
              onPress={() => setShowStatusModal(false)}
            >
              <Text style={styles.statusCancelText}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && { color: colors.text.primary, fontWeight: '800' }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.rowValue,
          bold && { color: colors.emerald.default, fontSize: typography.lg, fontWeight: '900' },
        ]}
      >
        ₺{value.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 40 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.text.muted },

  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  number: { fontSize: 11, color: colors.text.faint, fontWeight: '700', letterSpacing: 0.5 },
  title: { fontSize: typography.lg, color: colors.text.primary, fontWeight: '900', marginTop: 4 },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.emerald.bg,
    borderColor: colors.emerald.border,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  statusText: { fontSize: 10, color: colors.emerald.default, fontWeight: '800' },

  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md, gap: spacing.md },
  metaItem: { minWidth: '45%' },
  metaLabel: { fontSize: 9, color: colors.text.faint, fontWeight: '700', textTransform: 'uppercase' },
  metaValue: { fontSize: typography.xs, color: colors.text.primary, fontWeight: '700', marginTop: 2 },

  sectionLabel: {
    fontSize: typography.xs,
    color: colors.text.muted,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },

  lineCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  lineHeader: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  lineNoCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: brand.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineNoText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  linePozId: { fontSize: 9, color: colors.text.faint, fontWeight: '700' },
  linePozName: { fontSize: typography.xs, color: colors.text.primary, fontWeight: '700', marginTop: 2 },
  lineMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  lineMetaTxt: { fontSize: 10, color: colors.text.muted },
  lineTotal: { fontSize: typography.xs, color: colors.emerald.default, fontWeight: '900' },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: typography.xs, color: colors.text.muted, fontWeight: '600' },
  rowValue: { fontSize: typography.sm, color: colors.text.secondary, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border.primary, marginVertical: spacing.sm },

  notes: { fontSize: typography.xs, color: colors.text.secondary, lineHeight: 18 },

  actions: { gap: spacing.sm, marginTop: spacing.md },
  reviseHeaderBtn: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: brand.green,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  reviseHeaderBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  headerEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: brand.green,
    backgroundColor: colors.emerald?.bg ?? 'rgba(16,185,129,0.12)',
    marginRight: spacing.sm,
  },
  headerEditBtnText: { color: brand.green, fontWeight: '800', fontSize: typography.xs },
  editBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: brand.green,
    borderRadius: radius.md,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  pdfBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: brand.blue,
    borderRadius: radius.md,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  advanceBtn: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: brand.green,
    borderRadius: radius.md,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  advanceBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  rejectBtn: {
    backgroundColor: colors.rose.bg,
    borderColor: colors.rose.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rejectBtnText: { color: colors.rose.default, fontWeight: '700', fontSize: typography.xs },
  deleteBtn: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: { color: colors.rose.default, fontWeight: '700', fontSize: typography.xs },
  copyBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.emerald.bg,
    borderWidth: 1,
    borderColor: brand.green,
    borderRadius: radius.md,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyBtnText: { color: brand.green, fontWeight: '800', fontSize: typography.sm },
  statusBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.indigo.bg,
    borderWidth: 1,
    borderColor: colors.indigo.light,
    borderRadius: radius.md,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBtnText: { color: colors.indigo.light, fontWeight: '800', fontSize: typography.sm },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  statusSheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.bg.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 8,
  },
  statusSheetTitle: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  statusSheetSub: { color: colors.text.muted, fontSize: typography.xs, marginBottom: spacing.sm },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  statusOptionActive: { backgroundColor: colors.emerald.bg, borderColor: brand.green },
  statusOptionText: { color: colors.text.primary, fontSize: typography.sm },
  statusCancel: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  statusCancelText: { color: colors.text.muted, fontWeight: '700' },
  emailBtn: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.indigo.default,
    paddingVertical: 11,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailBtnText: { color: '#fff', fontWeight: '700', fontSize: typography.xs },
  shareBtn: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.blue.default,
    paddingVertical: 11,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: typography.xs },
  linkBtn: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: brand.green,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkBtnText: { color: brand.green, fontWeight: '700', fontSize: typography.xs },
});
