import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAppContext } from '../context/AppContext';
import { useVisit } from '../context/VisitContext';
import { useHasRole } from '../components/RoleGuard';
import type { Customer, RootStackParamList } from '../types';
import { newUuid } from '../services/data/repository';
import { enrichOrganization, isApolloConfigured } from '../services/apollo';
import { vergiNo, phoneTR, email as emailValidator } from '../utils/validators';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'CustomerForm'>;
type RouteProps = RouteProp<RootStackParamList, 'CustomerForm'>;

export default function CustomerFormScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { customers, addCustomer, updateCustomer } = useAppContext();
  const { activeVisit, checkIn, checkOut, loading: visitLoading } = useVisit();
  const canSeeFinance = useHasRole(['admin', 'manager']);

  const editingId = route.params?.customerId;
  const existing = editingId ? customers.find(c => c.id === editingId) : null;
  const isEdit = !!existing;

  const [form, setForm] = useState<Customer>(
    existing ?? {
      id: newUuid(),
      shortName: '',
      title: '',
      taxNumber: '',
      taxOffice: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      contactPerson: '',
    }
  );

  const set = <K extends keyof Customer>(k: K, v: Customer[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const [enriching, setEnriching] = useState(false);
  const enrich = async () => {
    const name = (form.title || form.shortName || '').trim();
    if (!name) { Alert.alert('Apollo', 'Önce firma adını (kısa ad/ünvan) girin.'); return; }
    if (!(await isApolloConfigured())) { Alert.alert('Apollo', 'API anahtarı yok. Ayarlar → Harici API Anahtarları → Apollo.'); return; }
    // E-postadan domain çıkar (varsa daha güvenilir eşleşme)
    const domain = form.email && form.email.includes('@') ? form.email.split('@')[1] : undefined;
    setEnriching(true);
    try {
      const org = await enrichOrganization({ name, domain });
      if (!org) { Alert.alert('Apollo', 'Eşleşme bulunamadı.'); return; }
      // Yalnız BOŞ alanları doldur (kullanıcı verisini ezme).
      setForm(prev => ({
        ...prev,
        phone: prev.phone || org.phone || '',
        sector: prev.sector || org.industry || '',
        address: prev.address || org.location || '',
        city: prev.city || (org.location?.split(',')[0] || ''),
        source: prev.source || 'Apollo',
      }));
      Alert.alert('Apollo', `Bilgiler eklendi: ${[org.industry, org.phone, org.location].filter(Boolean).join(' · ') || org.name}`);
    } catch (e: any) {
      Alert.alert('Apollo hatası', e?.message || 'Zenginleştirme başarısız.');
    } finally { setEnriching(false); }
  };

  const handleSave = async () => {
    if (!form.shortName.trim() || !form.title.trim()) {
      Alert.alert('Eksik bilgi', 'Kısa ad ve resmi ünvan zorunludur.');
      return;
    }
    // Alan doğrulamaları (boş alanlar opsiyonel — validator boşta null döner)
    const fieldError = phoneTR(form.phone) || emailValidator(form.email) || vergiNo(form.taxNumber);
    if (fieldError) {
      Alert.alert('Geçersiz bilgi', fieldError);
      return;
    }
    // Mükerrer kontrolü
    const isDuplicate = customers.some(c =>
      c.id !== form.id &&
      (c.shortName.toLowerCase() === form.shortName.toLowerCase() ||
       (form.taxNumber && c.taxNumber === form.taxNumber))
    );
    if (isDuplicate) {
      Alert.alert('Uyarı', 'Bu kısa ad veya vergi numarası ile eşleşen başka bir müşteri zaten var.');
      return;
    }

    // Kayıt başarısını bekle: başarısızsa formu KAPATMA (önceden kullanıcı eklendi
    // sanıp çıkıyordu ama DB'de yoktu — Req#3). Hata toast'ı AppContext'ten gelir.
    const res = isEdit ? await updateCustomer(form) : await addCustomer(form);
    if (!res.ok) return;
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.section}>Temel Bilgiler</Text>

          <Field label="Kısa Ad *" value={form.shortName} onChangeText={v => set('shortName', v)} placeholder="EGEBORU" />
          <Field label="Resmi Ünvan *" value={form.title} onChangeText={v => set('title', v)} placeholder="ABC SANAYİ VE TİCARET A.Ş." multiline />

          <TouchableOpacity style={styles.enrichBtn} onPress={enrich} disabled={enriching} activeOpacity={0.85}>
            {enriching ? <ActivityIndicator color={colors.indigo.default} size="small" /> : <Ionicons name="planet-outline" size={16} color={colors.indigo.default} />}
            <Text style={styles.enrichText}>{enriching ? 'Apollo sorgulanıyor...' : "Apollo'dan Zenginleştir (telefon, sektör, adres)"}</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Müşteri Tipi</Text>
              <TouchableOpacity
                style={styles.inputWrap}
                onPress={() => {
                  Alert.alert('Tip Seç', '', [
                    { text: 'Potansiyel', onPress: () => set('type', 'Potansiyel') },
                    { text: 'Aktif', onPress: () => set('type', 'Aktif') },
                    { text: 'Pasif', onPress: () => set('type', 'Pasif') },
                    { text: 'Bayi', onPress: () => set('type', 'Bayi') },
                  ]);
                }}
              >
                <Text style={{ color: form.type ? colors.text.primary : colors.text.faint }}>
                  {form.type || 'Seçiniz...'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Sektör" value={form.sector ?? ''} onChangeText={v => set('sector', v)} placeholder="Enerji" />
            </View>
          </View>

          <Field label="İlgili Kişi" value={form.contactPerson ?? ''} onChangeText={v => set('contactPerson', v)} placeholder="Ahmet Yılmaz" />

          <Text style={styles.section}>İletişim</Text>
          <Field label="Telefon" value={form.phone ?? ''} onChangeText={v => set('phone', v)} placeholder="0532 000 00 00" keyboardType="phone-pad" icon="call-outline" />
          <Field label="E-posta" value={form.email ?? ''} onChangeText={v => set('email', v)} placeholder="info@firma.com" keyboardType="email-address" autoCapitalize="none" icon="mail-outline" />
          <Field label="Adres" value={form.address ?? ''} onChangeText={v => set('address', v)} placeholder="Tam adres" multiline icon="location-outline" />
          <Field label="Şehir" value={form.city ?? ''} onChangeText={v => set('city', v)} placeholder="İzmir" icon="business-outline" />

          <Text style={styles.section}>Vergi Bilgileri</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Field label="Vergi No" value={form.taxNumber ?? ''} onChangeText={v => set('taxNumber', v)} placeholder="1234567890" keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Vergi Dairesi" value={form.taxOffice ?? ''} onChangeText={v => set('taxOffice', v)} placeholder="Konak" />
            </View>
          </View>

          {canSeeFinance && (
            <>
              <Text style={styles.section}>Finansal Bilgiler</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Field label="Risk Limiti" value={String(form.riskLimit ?? '')} onChangeText={v => set('riskLimit', Math.max(0, parseFloat(v) || 0))} keyboardType="numeric" placeholder="0 ₺" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Mevcut Bakiye" value={String(form.currentBalance ?? '')} onChangeText={v => set('currentBalance', parseFloat(v) || 0)} keyboardType="numeric" placeholder="0 ₺" />
                </View>
              </View>
            </>
          )}

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Ionicons name={isEdit ? 'save-outline' : 'add-circle-outline'} size={18} color="#fff" />
            <Text style={styles.saveBtnText}>{isEdit ? 'Güncelle' : 'Müşteri Ekle'}</Text>
          </TouchableOpacity>

          {isEdit && (
            <View style={{ marginTop: spacing.md }}>
              {activeVisit?.customerId === form.id ? (
                <TouchableOpacity
                  style={[styles.visitBtn, { backgroundColor: colors.rose.default }]}
                  onPress={() => checkOut()}
                  disabled={visitLoading}
                >
                  <Ionicons name="log-out-outline" size={18} color="#fff" />
                  <Text style={styles.visitBtnText}>Ziyareti Sonlandır (Check-out)</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.visitBtn}
                  onPress={() => checkIn(form.id, form.shortName)}
                  disabled={visitLoading || !!activeVisit}
                >
                  <Ionicons name="location-outline" size={18} color="#fff" />
                  <Text style={styles.visitBtnText}>
                    {activeVisit ? 'Başka bir ziyarette...' : 'Ziyaret Başlat (Check-in)'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {isEdit && (
            <View style={styles.historySection}>
              <Text style={styles.section}>Ziyaret Geçmişi</Text>
              <View style={styles.historyCard}>
                <HistoryRow date="Bugün 09:45" action="Check-in Yapıldı" icon="enter-outline" color={brand.green} />
                <HistoryRow date="22 May 2026" action="Teklif Sunuldu" icon="document-text-outline" color={brand.blueLight} />
                <HistoryRow date="15 May 2026" action="Periyodik Bakım" icon="construct-outline" color={colors.amber.default} />
              </View>
            </View>
          )}

          {isEdit && (
            <View style={styles.linksGrid}>
              <LinkBtn
                icon="map-outline"
                label="Sahalar"
                onPress={() =>
                  navigation.navigate('CustomerSites', { customerId: form.id })
                }
              />
              <LinkBtn
                icon="attach-outline"
                label="Belgeler"
                onPress={() =>
                  navigation.navigate('CustomerDocuments', { customerId: form.id })
                }
              />
              <LinkBtn
                icon="time-outline"
                label="Geçmiş"
                onPress={() =>
                  navigation.navigate('CustomerHistory', { customerId: form.id })
                }
              />
              <LinkBtn
                icon="person-circle-outline"
                label="Müşteri Portalı"
                onPress={() =>
                  navigation.navigate('CustomerPortal', { customerId: form.id })
                }
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LinkBtn({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.linkBtn} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name={icon} size={18} color={brand.green} />
      <Text style={styles.linkBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function Field({
  label,
  icon,
  multiline,
  ...inputProps
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  multiline?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, multiline && { minHeight: 60, alignItems: 'flex-start' }]}>
        {icon && <Ionicons name={icon} size={16} color={colors.text.faint} style={{ marginTop: multiline ? 4 : 0 }} />}
        <TextInput
          style={[styles.input, multiline && { minHeight: 50, textAlignVertical: 'top' }]}
          placeholderTextColor={colors.text.faint}
          multiline={multiline}
          {...inputProps}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  section: {
    fontSize: typography.xs,
    color: brand.green,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  label: { fontSize: typography.xs, color: colors.text.muted, fontWeight: '700', marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  input: { flex: 1, color: colors.text.primary, fontSize: typography.sm, paddingVertical: 2 },
  enrichBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.indigo.bg,
    borderWidth: 1,
    borderColor: colors.indigo.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  enrichText: { flex: 1, color: colors.indigo.default, fontSize: typography.xs, fontWeight: '700' },
  saveBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: brand.green,
    borderRadius: radius.md,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  visitBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: brand.blue,
    borderRadius: radius.md,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  visitBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  linksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  linkBtn: {
    flexBasis: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: brand.green,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  linkBtnText: { color: brand.green, fontWeight: '800', fontSize: typography.xs },
  historySection: { marginTop: spacing.lg },
  historyCard: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.border.primary },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  historyIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  historyInfo: { flex: 1 },
  historyDate: { color: colors.text.faint, fontSize: 10, fontWeight: '600' },
  historyAction: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700', marginTop: 1 },
});

function HistoryRow({ date, action, icon, color }: { date: string; action: string; icon: any; color: string }) {
  return (
    <View style={styles.historyRow}>
      <View style={[styles.historyIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={styles.historyInfo}>
        <Text style={styles.historyDate}>{date}</Text>
        <Text style={styles.historyAction}>{action}</Text>
      </View>
    </View>
  );
}
