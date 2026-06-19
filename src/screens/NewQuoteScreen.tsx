import React, { useState, useMemo } from 'react';
import { localDateISO } from '../utils/date';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  Alert,
  Switch,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resizeForUpload } from '../utils/image';
import { uploadPhoto } from '../services/photoUpload';
import { HIT_SLOP_8 } from '../utils/a11y';
import { formatTRY } from '../utils/money';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAppContext, calcLineTotal, calcQuoteTotals } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Quote, QuoteLine, Customer, RootStackParamList, MaterialCatalogItem } from '../types';
import {
  POZ_CATALOG,
  POZ_CATEGORIES,
  PozItem,
  PozCategory,
  DEFAULT_OVERHEAD,
  DEFAULT_PROFIT,
  DEFAULT_VAT,
} from '../data/pozCatalog';
import { listRecentPozes, recordQuoteLines, RecentPoz } from '../services/recentPozes';
import { MATERIAL_CATALOG, MATERIAL_CATEGORIES, MATERIAL_BRANDS } from '../data/initialData';
import { loadOverrides, applyOverrides, loadCustomProducts, type OverrideMap } from '../services/catalogOverrides';
import { newUuid } from '../services/data/repository';
import { upsertMaterial } from '../services/materials';
import { listPricingRules, applyPricingRules, type BrandPricingRule } from '../services/productPricing';
import { matchesAnyField } from '../utils/search';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'NewQuote'>;
type NewQuoteRoute = RouteProp<RootStackParamList, 'NewQuote'>;

export default function NewQuoteScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<NewQuoteRoute>();
  const editingQuoteId = route.params?.quoteId;
  const prefill = route.params?.prefill;
  const { customers, quotes, addQuote, updateQuote, generateQuoteNumber, toast } = useAppContext();
  const editingQuote = React.useMemo(
    () => (editingQuoteId ? quotes.find(q => q.id === editingQuoteId) : undefined),
    [editingQuoteId, quotes],
  );
  const { profile, user } = useAuth();
  const engineerName =
    profile?.full_name ||
    (user as any)?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Saha';

  const [customer, setCustomer] = useState<Customer | null>(() => {
    if (editingQuote) {
      return (
        customers.find(
          c => c.shortName === editingQuote.customerName || c.title === editingQuote.customerTitle,
        ) ?? null
      );
    }
    // AI taslağından gelen müşteri adıyla mevcut kaydı eşle (varsa).
    if (prefill?.customerName) {
      const n = prefill.customerName.trim().toLocaleLowerCase('tr-TR');
      return customers.find(c =>
        (c.shortName || '').toLocaleLowerCase('tr-TR') === n ||
        (c.title || '').toLocaleLowerCase('tr-TR') === n,
      ) ?? null;
    }
    return null;
  });
  const [title, setTitle] = useState(editingQuote?.title ?? prefill?.title ?? '');
  const [notes, setNotes] = useState(editingQuote?.notes ?? prefill?.notes ?? '');
  const [lines, setLines] = useState<QuoteLine[]>(editingQuote?.lines ?? prefill?.lines ?? []);
  const [images, setImages] = useState<string[]>(editingQuote?.images ?? []);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [recents, setRecents] = useState<RecentPoz[]>([]);
  const [showRecents, setShowRecents] = useState(false);

  // Teklife görsel ekle: galeriden seç → küçült → storage'a yükle → public URL'i listeye ekle.
  // URL saklanır (base64 DB'yi şişirmesin); PDF'e ve ekrana basılır.
  const addImage = async () => {
    if (uploadingImg) return;
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      setUploadingImg(true);
      const { uri } = await resizeForUpload(res.assets[0].uri, { maxWidth: 1600, compress: 0.7 });
      const url = await uploadPhoto(uri, 'quotes');
      setImages(prev => [...prev, url]);
    } catch (e: any) {
      Alert.alert('Görsel eklenemedi', e?.message || 'Yükleme başarısız. İnternet bağlantınızı kontrol edin.');
    } finally {
      setUploadingImg(false);
    }
  };
  const removeImage = (url: string) => setImages(prev => prev.filter(u => u !== url));

  // Modal state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showPozModal, setShowPozModal] = useState(false);
  const [pozCategory, setPozCategory] = useState<PozCategory | 'Tümü'>('Tümü');
  const [pozSearch, setPozSearch] = useState('');

  // Ürün katağundan kalem ekleme
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState<string | null>(null);
  const [productBrand, setProductBrand] = useState<string | null>(null);
  const [showAllProductCats, setShowAllProductCats] = useState(false);
  const [showAllProductBrands, setShowAllProductBrands] = useState(false);
  // Toplu fiyat/iskonto kuralları — ürün eklerken indirimli fiyatı yansıtmak için.
  const [productRules, setProductRules] = useState<BrandPricingRule[]>([]);
  const [catOverrides, setCatOverrides] = useState<OverrideMap>({});
  const [customProds, setCustomProds] = useState<MaterialCatalogItem[]>([]);

  React.useEffect(() => {
    listRecentPozes().then(setRecents);
    listPricingRules().then(setProductRules);
    loadOverrides().then(setCatOverrides);
    loadCustomProducts().then(setCustomProds);
  }, []);

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: editingQuote ? 'Teklifi Düzenle' : 'Yeni Teklif' });
  }, [navigation, editingQuote]);

  const totals = useMemo(() => calcQuoteTotals(lines), [lines]);

  const addPozLine = (poz: PozItem) => {
    const newLine: QuoteLine = {
      id: newUuid(),
      lineNo: lines.length + 1,
      pozId: poz.id,
      pozName: poz.name,
      unit: poz.unit,
      quantity: 1,
      materialPrice: poz.materialPrice,
      installPrice: poz.installPrice,
      dismantlePrice: poz.dismantlePrice ?? 0,
      withDismantle: false,
      overheadPct: poz.defaultOverhead,
      profitPct: poz.defaultProfit,
      vatPct: poz.vatRate,
      discountPct: 0,
    };
    setLines(prev => [...prev, newLine]);
    setShowPozModal(false);
    setPozSearch('');
  };

  const updateLine = (idx: number, patch: Partial<QuoteLine>) => {
    setLines(prev => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const removeLine = (idx: number) => {
    setLines(prev => prev.filter((_, i) => i !== idx).map((l, i) => ({ ...l, lineNo: i + 1 })));
  };

  const handleSave = async () => {
    if (!customer) {
      Alert.alert('Eksik bilgi', 'Lütfen müşteri seçiniz.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Eksik bilgi', 'Lütfen teklif başlığı giriniz.');
      return;
    }
    if (lines.length === 0) {
      Alert.alert('Eksik bilgi', 'En az bir kalem ekleyiniz.');
      return;
    }
    if (editingQuote) {
      const updated: Quote = {
        ...editingQuote,
        customerName: customer.shortName,
        customerTitle: customer.title,
        title,
        engineer: editingQuote.engineer || engineerName,
        lines,
        notes,
        images,
        subtotal: totals.subtotal,
        vatTotal: totals.vatTotal,
        grandTotal: totals.grandTotal,
        revision: (editingQuote.revision ?? 0) + 1,
      };
      // Kayıt başarısını bekle: başarısızsa ekrandan ÇIKMA (önceden kullanıcı
      // revizyon kaydedildi sanıp çıkıyordu ama DB'de değişmemişti — Req#3).
      const res = await updateQuote(updated);
      if (!res.ok) { Alert.alert('Kaydedilemedi', res.error || 'Teklif güncellenemedi.'); return; }
      recordQuoteLines(lines);
      navigation.goBack();
      return;
    }
    const number = generateQuoteNumber();
    const quote: Quote = {
      id: newUuid(),
      number,
      customerName: customer.shortName,
      customerTitle: customer.title,
      title,
      date: localDateISO(),
      engineer: engineerName,
      lines,
      status: 'Taslak',
      notes,
      images,
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      grandTotal: totals.grandTotal,
    };
    const res = await addQuote(quote);
    if (!res.ok) { Alert.alert('Kaydedilemedi', res.error || 'Teklif oluşturulamadı.'); return; }
    recordQuoteLines(lines);
    navigation.goBack();
  };

  const filteredPoz = useMemo(
    () =>
      POZ_CATALOG.filter(p => {
        const matchCat = pozCategory === 'Tümü' || p.category === pozCategory;
        // Aksan-toleranslı + kelime-bazlı (kontaktor → Kontaktör; sıra serbest).
        const matchSearch = matchesAnyField([p.name, p.id], pozSearch);
        return matchCat && matchSearch;
      }),
    [pozCategory, pozSearch]
  );

  // Müşteri arama (ad/unvan/vergi no/telefon — aksan-toleranslı)
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim();
    if (!q) return customers;
    return customers.filter(c => matchesAnyField([c.shortName, c.title, c.taxNumber, c.phone], q));
  }, [customers, customerSearch]);

  // 13K+ ürünlük katalog filtresi her tuş vuruşunda değil, yazım durunca çalışsın
  // (debounce) — Android'de arama gecikmesini önler. TextInput value'su hızlı kalır.
  const debouncedProductSearch = useDebouncedValue(productSearch, 250);
  const filteredProducts = useMemo(() => {
    const q = debouncedProductSearch.trim();
    let base = [...customProds, ...applyOverrides(MATERIAL_CATALOG, catOverrides)];
    if (productCategory) base = base.filter(m => m.category === productCategory);
    if (productBrand) base = base.filter(m => m.brand === productBrand);
    if (q) {
      // Aksan-toleranslı + kelime-bazlı ürün araması (kontaktor → Kontaktör).
      base = base.filter(m => matchesAnyField([m.name, m.code, m.brand, m.category], q));
    }
    // Toplu fiyat/iskonto kurallarını uygula → eklenecek fiyat indirimli gelir.
    return applyPricingRules(base.slice(0, 400), productRules);
  }, [debouncedProductSearch, productCategory, productBrand, productRules, catOverrides, customProds]);

  const addProductLine = (p: typeof MATERIAL_CATALOG[number]) => {
    const newLine: QuoteLine = {
      id: newUuid(),
      lineNo: lines.length + 1,
      pozId: p.code ? `PRD-${p.code}` : `PRD-${p.id}`,
      pozName: p.name,
      unit: 'Ad',
      quantity: 1,
      materialPrice: p.price,
      installPrice: 0,
      dismantlePrice: 0,
      withDismantle: false,
      overheadPct: DEFAULT_OVERHEAD,
      profitPct: DEFAULT_PROFIT,
      vatPct: DEFAULT_VAT,
      discountPct: 0,
    };
    setLines(prev => [...prev, newLine]);
    setShowProductModal(false);
    setProductSearch('');
  };

  const addManualLine = () => {
    const newLine: QuoteLine = {
      id: newUuid(),
      lineNo: lines.length + 1,
      pozId: `MANUAL-${newUuid().slice(0, 8)}`,
      pozName: '',
      unit: 'Ad',
      quantity: 1,
      materialPrice: 0,
      installPrice: 0,
      dismantlePrice: 0,
      withDismantle: false,
      overheadPct: DEFAULT_OVERHEAD,
      profitPct: DEFAULT_PROFIT,
      vatPct: DEFAULT_VAT,
      discountPct: 0,
    };
    setLines(prev => [...prev, newLine]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* iOS'ta klavye Notlar/manuel fiyat girişinde save bar'ı ve aktif input'u
          örtüyordu (CustomerFormScreen'deki kanıtlanmış desen). Android'de
          undefined → mevcut window-resize davranışı korunur. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* === MÜŞTERİ === */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>1. Müşteri</Text>
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => {
              setCustomerSearch('');
              setShowCustomerModal(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="business-outline" size={18} color={brand.green} />
            <Text style={[styles.pickerText, !customer && { color: colors.text.faint }]} numberOfLines={1}>
              {customer ? customer.shortName : 'Müşteri seçiniz...'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text.faint} />
          </TouchableOpacity>
          {customer && (
            <Text style={styles.customerSub} numberOfLines={2}>{customer.title}</Text>
          )}
        </View>

        {/* === BAŞLIK === */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>2. Teklif Başlığı</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: S.NO.0184 Kompanzasyon Panosu Revizyon İşleri"
            placeholderTextColor={colors.text.faint}
            value={title}
            onChangeText={setTitle}
            multiline
          />
        </View>

        {/* === KALEMLER === */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>3. Kalemler ({lines.length})</Text>
          <View style={styles.addLineBtnRow}>
            <TouchableOpacity
              style={styles.addLineBtn}
              onPress={() => navigation.navigate('QuoteTemplates')}
              activeOpacity={0.8}
            >
              <Ionicons name="copy-outline" size={14} color={brand.green} />
              <Text style={styles.addLineBtnText}>Şablon</Text>
            </TouchableOpacity>
            {recents.length > 0 && (
              <TouchableOpacity
                style={styles.addLineBtn}
                onPress={() => setShowRecents(s => !s)}
                activeOpacity={0.8}
              >
                <Ionicons name="time-outline" size={14} color={brand.green} />
                <Text style={styles.addLineBtnText}>Son ({recents.length})</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.addLineBtn}
              onPress={() => setShowProductModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="cube-outline" size={14} color={brand.green} />
              <Text style={styles.addLineBtnText}>Ürün</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addLineBtn}
              onPress={() => setShowPozModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={16} color={brand.green} />
              <Text style={styles.addLineBtnText}>Poz Ekle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addLineBtn, styles.addLineBtnManual]}
              onPress={addManualLine}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={14} color={colors.amber.default} />
              <Text style={[styles.addLineBtnText, { color: colors.amber.default }]}>Manuel Kalem</Text>
            </TouchableOpacity>
          </View>

          {showRecents && (
            <View style={{ gap: 6, marginBottom: 8 }}>
              {recents.slice(0, 8).map(r => (
                <TouchableOpacity
                  key={r.pozId}
                  style={styles.recentItem}
                  onPress={() => {
                    const newLine: QuoteLine = {
                      id: newUuid(),
                      lineNo: lines.length + 1,
                      pozId: r.pozId,
                      pozName: r.pozName,
                      unit: r.unit,
                      quantity: 1,
                      materialPrice: r.materialPrice,
                      installPrice: r.installPrice,
                      dismantlePrice: r.dismantlePrice,
                      withDismantle: false,
                      // Katalog varsayılanlarıyla tutarlı (önceden 5/10/20 sabitti →
                      // aynı POZ recents'ten eklenince farklı toplam çıkıyordu).
                      overheadPct: DEFAULT_OVERHEAD,
                      profitPct: DEFAULT_PROFIT,
                      vatPct: DEFAULT_VAT,
                      discountPct: 0,
                    };
                    setLines(prev => [...prev, newLine]);
                  }}
                >
                  <Text style={styles.recentPoz}>{r.pozId}</Text>
                  <Text style={styles.recentName} numberOfLines={1}>
                    {r.pozName}
                  </Text>
                  <Text style={styles.recentCount}>x{r.count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {lines.length === 0 ? (
            <View style={styles.emptyLines}>
              <Ionicons name="list-outline" size={32} color={colors.text.faint} />
              <Text style={styles.emptyLinesText}>
                Henüz kalem yok. Katalogdan eklemek için "Poz Ekle" / "Ürün", elle girmek için "Manuel Kalem" düğmesini kullanın.
              </Text>
            </View>
          ) : (
            lines.map((line, idx) => (
              <LineCard
                key={line.id ?? `${line.pozId}-${line.lineNo}`}
                line={line}
                onUpdate={patch => updateLine(idx, patch)}
                onRemove={() => removeLine(idx)}
              />
            ))
          )}
        </View>

        {/* === NOTLAR === */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>4. Notlar</Text>
          <TextInput
            style={[styles.input, { minHeight: 70 }]}
            placeholder="Ödeme koşulları, geçerlilik süresi, ek bilgiler..."
            placeholderTextColor={colors.text.faint}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        {/* === GÖRSELLER === */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>5. Görseller ({images.length})</Text>
          <Text style={styles.imgHint}>Teklife eklenen görseller PDF'in sonuna basılır ve müşteriye gönderilir.</Text>
          <View style={styles.imgGrid}>
            {images.map(url => (
              <View key={url} style={styles.imgThumbWrap}>
                <Image source={{ uri: url }} style={styles.imgThumb} resizeMode="cover" />
                <TouchableOpacity style={styles.imgRemove} onPress={() => removeImage(url)} hitSlop={HIT_SLOP_8}>
                  <Ionicons name="close-circle" size={22} color={colors.rose.default} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.imgAddBtn} onPress={addImage} disabled={uploadingImg} activeOpacity={0.8}>
              {uploadingImg
                ? <ActivityIndicator color={brand.blue} />
                : <><Ionicons name="image-outline" size={26} color={brand.blue} /><Text style={styles.imgAddText}>Görsel Ekle</Text></>}
            </TouchableOpacity>
          </View>
        </View>

        {/* === TOPLAM === */}
        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalRowLabel}>Ara Toplam (KDV Hariç)</Text>
            <Text style={styles.totalRowValue}>
              {formatTRY(totals.subtotal)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalRowLabel}>KDV Toplamı</Text>
            <Text style={styles.totalRowValue}>
              {formatTRY(totals.vatTotal)}
            </Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandLabel}>GENEL TOPLAM</Text>
            <Text style={styles.grandValue}>
              {formatTRY(totals.grandTotal)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* SAVE BAR */}
      <View style={styles.saveBar}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.cancelBtnText}>İptal</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={styles.saveBtnText}>{editingQuote ? 'Değişiklikleri Kaydet' : 'Teklifi Kaydet'}</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>

      {/* CUSTOMER MODAL */}
      <Modal
        visible={showCustomerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Müşteri Seç</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <TouchableOpacity
                  style={styles.newCustomerBtn}
                  onPress={() => {
                    setShowCustomerModal(false);
                    navigation.navigate('CustomerForm');
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.newCustomerBtnText}>Yeni Müşteri</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowCustomerModal(false)} hitSlop={HIT_SLOP_8}>
                  <Ionicons name="close" size={22} color={colors.text.muted} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.modalSearch}>
              <Ionicons name="search-outline" size={16} color={colors.text.faint} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Müşteri adı, unvan, vergi no veya telefon..."
                placeholderTextColor={colors.text.faint}
                value={customerSearch}
                onChangeText={setCustomerSearch}
                autoCorrect={false}
              />
              {customerSearch.length > 0 && (
                <TouchableOpacity onPress={() => setCustomerSearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.text.faint} />
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              data={filteredCustomers}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={() => (
                <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                  <Ionicons name="people-outline" size={40} color={colors.text.faint} />
                  <Text style={{ color: colors.text.muted, marginTop: spacing.sm, fontSize: typography.sm }}>
                    {customerSearch.trim()
                      ? `"${customerSearch.trim()}" için müşteri bulunamadı.`
                      : 'Henüz müşteri yok. Yukarıdan "Yeni Müşteri" ekleyin.'}
                  </Text>
                </View>
              )}
              keyExtractor={c => c.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.customerItem}
                  onPress={() => {
                    setCustomer(item);
                    setShowCustomerModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerName}>{item.shortName}</Text>
                    <Text style={styles.customerTitle} numberOfLines={1}>{item.title}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.text.faint} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* POZ MODAL */}
      <Modal
        visible={showPozModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPozModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { height: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Poz Seç ({POZ_CATALOG.length} kalem)</Text>
              <TouchableOpacity onPress={() => setShowPozModal(false)} hitSlop={HIT_SLOP_8}>
                <Ionicons name="close" size={22} color={colors.text.muted} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.modalSearch}>
              <Ionicons name="search-outline" size={16} color={colors.text.faint} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Poz adı veya numarası..."
                placeholderTextColor={colors.text.faint}
                value={pozSearch}
                onChangeText={setPozSearch}
              />
            </View>

            {/* Category chips */}
            <View style={styles.chipWrap}>
              {(['Tümü', ...POZ_CATEGORIES] as const).map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.catChip, pozCategory === c && styles.catChipActive]}
                  onPress={() => setPozCategory(c)}
                >
                  <Text style={[styles.catChipText, pozCategory === c && styles.catChipTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FlatList
              data={filteredPoz}
              keyExtractor={p => p.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pozItem}
                  onPress={() => addPozLine(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.pozItemLeft}>
                    <Text style={styles.pozItemId}>{item.id}</Text>
                    <Text style={styles.pozItemName} numberOfLines={2}>{item.name}</Text>
                    <View style={styles.pozPriceRow}>
                      <Text style={styles.pozPriceTxt}>
                        Malz: ₺{item.materialPrice.toLocaleString('tr-TR')}
                      </Text>
                      <Text style={styles.pozPriceTxt}>
                        Montaj: ₺{item.installPrice.toLocaleString('tr-TR')}
                      </Text>
                      {item.dismantlePrice ? (
                        <Text style={[styles.pozPriceTxt, { color: colors.amber.default }]}>
                          Dem: ₺{item.dismantlePrice.toLocaleString('tr-TR')}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.pozAddBtn}>
                    <Ionicons name="add" size={20} color={brand.green} />
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.noResults}>Sonuç bulunamadı.</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* ÜRÜN MODAL — ürünler.json katalogu */}
      <Modal
        visible={showProductModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { height: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Ürün Seç ({MATERIAL_CATALOG.length.toLocaleString('tr-TR')} ürün)
              </Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)} hitSlop={HIT_SLOP_8}>
                <Ionicons name="close" size={22} color={colors.text.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearch}>
              <Ionicons name="search-outline" size={16} color={colors.text.faint} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Ad, kod, marka veya kategori..."
                placeholderTextColor={colors.text.faint}
                value={productSearch}
                onChangeText={setProductSearch}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.filterLabelRow}>
              <Text style={styles.filterLabel}>Kategori {productCategory ? `· ${productCategory}` : ''}</Text>
              <TouchableOpacity onPress={() => setShowAllProductCats(v => !v)} style={styles.toggleBtn}>
                <Text style={styles.toggleText}>{showAllProductCats ? 'Daralt ▲' : `Tümü (${MATERIAL_CATEGORIES.length}) ▼`}</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.chipWrap, !showAllProductCats && styles.chipWrapCollapsed]}>
              <TouchableOpacity
                style={[styles.catChip, !productCategory && styles.catChipActive]}
                onPress={() => setProductCategory(null)}
              >
                <Text style={[styles.catChipText, !productCategory && styles.catChipTextActive]}>Tüm Kategoriler</Text>
              </TouchableOpacity>
              {MATERIAL_CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.catChip, productCategory === c && styles.catChipActive]}
                  onPress={() => setProductCategory(productCategory === c ? null : c)}
                >
                  <Text style={[styles.catChipText, productCategory === c && styles.catChipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.filterLabelRow}>
              <Text style={styles.filterLabel}>Marka {productBrand ? `· ${productBrand}` : ''}</Text>
              <TouchableOpacity onPress={() => setShowAllProductBrands(v => !v)} style={styles.toggleBtn}>
                <Text style={styles.toggleText}>{showAllProductBrands ? 'Daralt ▲' : `Tümü (${MATERIAL_BRANDS.length}) ▼`}</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.chipWrap, !showAllProductBrands && styles.chipWrapCollapsed]}>
              <TouchableOpacity
                style={[styles.catChip, !productBrand && styles.catChipActive]}
                onPress={() => setProductBrand(null)}
              >
                <Text style={[styles.catChipText, !productBrand && styles.catChipTextActive]}>Tüm Markalar</Text>
              </TouchableOpacity>
              {MATERIAL_BRANDS.map(b => (
                <TouchableOpacity
                  key={b}
                  style={[styles.catChip, productBrand === b && styles.catChipActive]}
                  onPress={() => setProductBrand(productBrand === b ? null : b)}
                >
                  <Text style={[styles.catChipText, productBrand === b && styles.catChipTextActive]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <FlatList
              data={filteredProducts}
              keyExtractor={p => p.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const tags = [item.brand, item.category].filter(Boolean).join(' · ');
                const priceLabel = item.currency && item.currency !== 'TL' && item.currency !== 'TRY' && item.listPrice
                  ? `₺${item.price.toLocaleString('tr-TR')} (${item.listPrice} ${item.currency})`
                  : `₺${item.price.toLocaleString('tr-TR')}`;
                return (
                  <TouchableOpacity
                    style={styles.pozItem}
                    onPress={() => addProductLine(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.pozItemLeft}>
                      {!!item.code && <Text style={styles.pozItemId}>{item.code}</Text>}
                      <Text style={styles.pozItemName} numberOfLines={2}>{item.name}</Text>
                      {!!tags && <Text style={styles.pozPriceTxt}>{tags}</Text>}
                      <View style={styles.pozPriceRow}>
                        <Text style={styles.pozPriceTxt}>{priceLabel}</Text>
                      </View>
                    </View>
                    <View style={styles.pozAddBtn}>
                      <Ionicons name="add" size={20} color={brand.green} />
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.noResults}>Sonuç bulunamadı.</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ====================================================================
// LINE CARD — 4 sütunlu fiyat editörü
// ====================================================================
function LineCard({
  line,
  onUpdate,
  onRemove,
}: {
  line: QuoteLine;
  onUpdate: (patch: Partial<QuoteLine>) => void;
  onRemove: () => void;
}) {
  const isManualLine = line.pozId.startsWith('MANUAL-');
  const [expanded, setExpanded] = useState(false);
  // Mevcut not varsa (kullanıcı açıklaması veya ⚠ sistem uyarısı) açıklama alanı açık başlasın.
  const [showNote, setShowNote] = useState(!!(line.notes && line.notes.trim()));
  const [manualPricing, setManualPricing] = useState(isManualLine);
  const [editingName, setEditingName] = useState(isManualLine && !line.pozName);
  const [saving, setSaving] = useState(false);
  const { toast: ctxToast, showToast } = useAppContext();
  const calc = calcLineTotal(line);

  const updateNum = (key: keyof QuoteLine, v: string) => {
    const n = parseFloat(v.replace(',', '.')) || 0;
    onUpdate({ [key]: n } as Partial<QuoteLine>);
  };

  const handleSaveToCatalog = async () => {
    if (!line.pozName.trim()) {
      Alert.alert('Eksik', 'Önce kalem adı giriniz.');
      return;
    }
    try {
      setSaving(true);
      await upsertMaterial({
        id: newUuid(),
        code: line.pozId.replace(/^(MANUAL|PRD)-/, ''),
        name: line.pozName.trim(),
        unit: line.unit,
        price: line.materialPrice,
        createdAt: new Date().toISOString(),
      } as any);
      showToast(`"${line.pozName}" kataloğa kaydedildi.`);
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={lineStyles.card}>
      {/* HEADER */}
      <View style={lineStyles.header}>
        <View style={lineStyles.lineNoCircle}>
          <Text style={lineStyles.lineNoText}>{line.lineNo}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={lineStyles.pozId}>{line.pozId}</Text>
          {editingName ? (
            <TextInput
              style={[lineStyles.pozName, lineStyles.pozNameInput]}
              value={line.pozName}
              onChangeText={v => onUpdate({ pozName: v })}
              onBlur={() => setEditingName(false)}
              placeholder="Kalem adı giriniz…"
              placeholderTextColor={colors.text.faint}
              autoFocus
              multiline
            />
          ) : (
            <TouchableOpacity onPress={() => setEditingName(true)} activeOpacity={0.7}>
              <Text style={lineStyles.pozName} numberOfLines={2}>
                {line.pozName || 'Kalem adı giriniz…'}
                <Text style={{ color: colors.text.faint, fontSize: 11 }}>  ✎</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={onRemove} style={lineStyles.removeBtn}>
          <Ionicons name="trash-outline" size={14} color={colors.rose.default} />
        </TouchableOpacity>
      </View>

      {/* MANUEL FİYAT TOGGLE + KATALOĞA KAYDET */}
      <View style={lineStyles.manualBar}>
        <View style={lineStyles.dismantleLeft}>
          <Ionicons
            name={manualPricing ? 'create' : 'lock-closed'}
            size={14}
            color={manualPricing ? colors.amber.default : colors.text.faint}
          />
          <Text style={lineStyles.dismantleLabel}>
            {manualPricing ? 'Manuel fiyat (sen belirle)' : 'Katalog fiyatı (kilitli)'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={[lineStyles.saveCatalogBtn, saving && { opacity: 0.5 }]}
            onPress={handleSaveToCatalog}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-upload-outline" size={12} color={colors.indigo.light} />
            <Text style={lineStyles.saveCatalogText}>{saving ? '…' : 'Kataloğa'}</Text>
          </TouchableOpacity>
          <Switch
            value={manualPricing}
            onValueChange={setManualPricing}
            trackColor={{ false: colors.bg.card, true: colors.amber.default }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* MIKTAR + BİRİM */}
      <View style={lineStyles.qtyRow}>
        <Text style={lineStyles.qtyLabel}>Miktar:</Text>
        <TextInput
          style={lineStyles.qtyInput}
          value={String(line.quantity)}
          onChangeText={v => updateNum('quantity', v)}
          keyboardType="decimal-pad"
        />
        <TextInput
          style={[lineStyles.qtyInput, { width: 44, marginLeft: 4 }]}
          value={line.unit}
          onChangeText={v => onUpdate({ unit: v })}
          placeholder="Ad"
          placeholderTextColor={colors.text.faint}
        />
        <View style={{ flex: 1 }} />
        <Text style={lineStyles.subTotalLabel}>Satır Top:</Text>
        <Text style={lineStyles.subTotalValue}>
          {formatTRY(calc.total)}
        </Text>
      </View>

      {/* 4 SÜTUN — KOMPAKT GÖRÜNÜM */}
      <View style={lineStyles.columnsGrid}>
        <PriceCol
          label="Malzeme B.F."
          value={line.materialPrice}
          onChange={v => updateNum('materialPrice', v)}
          color={colors.text.secondary}
          disabled={!manualPricing}
        />
        <PriceCol
          label="Montaj B.F."
          value={line.installPrice}
          onChange={v => updateNum('installPrice', v)}
          color={brand.green}
          disabled={!manualPricing}
        />
        <PriceCol
          label="Demontaj B.F."
          value={line.dismantlePrice}
          onChange={v => updateNum('dismantlePrice', v)}
          color={colors.amber.default}
          disabled={!manualPricing || !line.withDismantle}
        />
        <PercentCol
          label="G. Gider %"
          value={line.overheadPct}
          onChange={v => updateNum('overheadPct', v)}
        />
      </View>

      {/* DEMONTAJ TOGGLE */}
      <View style={lineStyles.dismantleRow}>
        <View style={lineStyles.dismantleLeft}>
          <Ionicons
            name={line.withDismantle ? 'checkbox' : 'square-outline'}
            size={18}
            color={line.withDismantle ? brand.green : colors.text.faint}
          />
          <TouchableOpacity onPress={() => onUpdate({ withDismantle: !line.withDismantle })} activeOpacity={0.7}>
            <Text style={lineStyles.dismantleLabel}>Demontaj dahil mi?</Text>
          </TouchableOpacity>
        </View>
        <Switch
          value={line.withDismantle}
          onValueChange={v => onUpdate({ withDismantle: v })}
          trackColor={{ false: colors.bg.card, true: brand.green }}
          thumbColor="#fff"
        />
      </View>

      {/* EXPANDABLE — Kâr / KDV / İskonto */}
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={lineStyles.expandBtn} activeOpacity={0.7}>
        <Text style={lineStyles.expandText}>
          {expanded ? '▼ Detayları gizle' : '▶ Kâr / KDV / İskonto'}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={lineStyles.expandSection}>
          <View style={lineStyles.columnsGrid}>
            <PercentCol
              label="Kâr %"
              value={line.profitPct}
              onChange={v => updateNum('profitPct', v)}
              color={colors.emerald.default}
            />
            <PercentCol
              label="KDV %"
              value={line.vatPct}
              onChange={v => updateNum('vatPct', v)}
              color={colors.indigo.light}
            />
            <PercentCol
              label="İskonto %"
              value={line.discountPct}
              onChange={v => updateNum('discountPct', v)}
              color={colors.rose.default}
            />
            <View style={lineStyles.col} />
          </View>

          {/* Breakdown */}
          <View style={lineStyles.breakdown}>
            <BreakRow label="Birim toplam (Mlz+Mnt+Dem)" value={calc.unitBase} />
            <BreakRow label={`× Miktar (${line.quantity})`} value={calc.lineRaw} />
            {line.discountPct > 0 && <BreakRow label={`İskonto sonrası`} value={calc.afterDiscount} />}
            <BreakRow label="Genel gider sonrası" value={calc.withOverhead} />
            <BreakRow label="Kâr sonrası (KDV Hariç)" value={calc.withProfit} highlight />
            <BreakRow label={`KDV (%${line.vatPct})`} value={calc.vat} />
            <BreakRow label="KDV DAHİL TOPLAM" value={calc.total} bold />
          </View>
        </View>
      )}

      {/* AÇIKLAMA (opsiyonel) — "+ Açıklama ekle" ile açılır. Müşteri teklif PDF'inde
          kalemin altında görünür; sistem uyarıları (⚠) PDF'e basılmaz. */}
      {showNote ? (
        <View style={lineStyles.noteWrap}>
          <View style={lineStyles.noteHeader}>
            <Ionicons name="document-text-outline" size={13} color={colors.text.muted} />
            <Text style={lineStyles.noteLabel}>Açıklama</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => { setShowNote(false); onUpdate({ notes: undefined }); }} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.text.faint} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={lineStyles.noteInput}
            value={line.notes ?? ''}
            onChangeText={v => onUpdate({ notes: v })}
            placeholder="Bu kaleme dair açıklama / not (müşteri teklifinde görünür)…"
            placeholderTextColor={colors.text.faint}
            multiline
          />
        </View>
      ) : (
        <TouchableOpacity onPress={() => setShowNote(true)} style={lineStyles.addNoteBtn} activeOpacity={0.7} hitSlop={6}>
          <Ionicons name="add-circle-outline" size={15} color={brand.green} />
          <Text style={lineStyles.addNoteText}>Açıklama ekle</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function PriceCol({
  label,
  value,
  onChange,
  color,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <View style={lineStyles.col}>
      <Text style={lineStyles.colLabel}>{label}</Text>
      <TextInput
        style={[
          lineStyles.colInput,
          { color: color || colors.text.primary, opacity: disabled ? 0.4 : 1 },
        ]}
        value={String(value)}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        editable={!disabled}
      />
      <Text style={lineStyles.colSub}>₺</Text>
    </View>
  );
}

function PercentCol({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
  color?: string;
}) {
  return (
    <View style={lineStyles.col}>
      <Text style={lineStyles.colLabel}>{label}</Text>
      <TextInput
        style={[lineStyles.colInput, { color: color || colors.text.primary }]}
        value={String(value)}
        onChangeText={onChange}
        keyboardType="decimal-pad"
      />
      <Text style={lineStyles.colSub}>%</Text>
    </View>
  );
}

function BreakRow({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: number;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <View style={lineStyles.breakRow}>
      <Text
        style={[
          lineStyles.breakLabel,
          bold && { color: colors.text.primary, fontWeight: '800' },
          highlight && { color: colors.emerald.default, fontWeight: '700' },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          lineStyles.breakValue,
          bold && { color: colors.emerald.default, fontWeight: '900', fontSize: typography.sm },
          highlight && { color: colors.emerald.default, fontWeight: '800' },
        ]}
      >
        {formatTRY(value)}
      </Text>
    </View>
  );
}

const lineStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  pozNameInput: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minHeight: 32,
  },
  manualBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  saveCatalogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.indigo.bg,
    borderColor: colors.indigo.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  saveCatalogText: {
    fontSize: 10,
    color: colors.indigo.light,
    fontWeight: '700',
  },
  header: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, alignItems: 'flex-start' },
  lineNoCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: brand.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineNoText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  pozId: { fontSize: 10, color: colors.text.faint, fontWeight: '700' },
  pozName: { fontSize: typography.sm, color: colors.text.primary, fontWeight: '700', marginTop: 2, lineHeight: 16 },
  removeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.rose.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.sm },
  qtyLabel: { fontSize: 10, color: colors.text.muted, fontWeight: '600' },
  qtyInput: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: colors.text.primary,
    fontSize: typography.xs,
    fontWeight: '700',
    width: 60,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  qtyUnit: { fontSize: 10, color: colors.text.faint, marginLeft: 2 },
  subTotalLabel: { fontSize: 10, color: colors.text.faint, fontWeight: '600' },
  subTotalValue: { fontSize: typography.sm, color: colors.emerald.default, fontWeight: '900', marginLeft: 4 },

  columnsGrid: { flexDirection: 'row', gap: 4 },
  col: { flex: 1 },
  colLabel: { fontSize: 10, color: colors.text.faint, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  colInput: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  colSub: { fontSize: 10, color: colors.text.faint, textAlign: 'right', marginTop: 1 },

  dismantleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  dismantleLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dismantleLabel: { fontSize: typography.xs, color: colors.text.secondary, fontWeight: '600' },

  expandBtn: { marginTop: spacing.sm, alignSelf: 'center' },
  expandText: { fontSize: 10, color: brand.green, fontWeight: '700' },

  addNoteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, marginTop: 2, alignSelf: 'flex-start' },
  addNoteText: { color: brand.green, fontSize: typography.xs, fontWeight: '800' },
  noteWrap: { marginTop: 8 },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  noteLabel: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  noteInput: {
    backgroundColor: colors.bg.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
    fontSize: typography.sm,
    minHeight: 54,
    textAlignVertical: 'top',
  },

  expandSection: { marginTop: spacing.sm },
  breakdown: {
    marginTop: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: 4,
  },
  breakRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakLabel: { fontSize: 10, color: colors.text.muted },
  breakValue: { fontSize: 10, color: colors.text.secondary, fontVariant: ['tabular-nums'] },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 100 },

  imgHint: { fontSize: typography.xs, color: colors.text.faint, marginBottom: spacing.sm },
  imgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  imgThumbWrap: { position: 'relative' },
  imgThumb: { width: 88, height: 88, borderRadius: radius.md, backgroundColor: colors.bg.secondary },
  imgRemove: { position: 'absolute', top: -8, right: -8, backgroundColor: colors.bg.primary, borderRadius: 12 },
  imgAddBtn: { width: 88, height: 88, borderRadius: radius.md, borderWidth: 1.5, borderColor: brand.blue, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2 },
  imgAddText: { fontSize: typography.xs, color: brand.blue, fontWeight: '700' },

  section: { marginBottom: spacing.lg },
  sectionLabel: {
    fontSize: typography.xs,
    color: colors.text.muted,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addLineBtnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm,
  },
  addLineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.emerald.bg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.emerald.border,
  },
  addLineBtnText: { color: brand.green, fontSize: typography.xs, fontWeight: '800' },
  addLineBtnManual: {
    backgroundColor: colors.amber.bg,
    borderColor: colors.amber.default,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  recentPoz: { color: brand.green, fontWeight: '800', fontSize: 11, width: 70 },
  recentName: { flex: 1, color: colors.text.primary, fontSize: 12 },
  recentCount: { color: colors.text.muted, fontSize: 11, fontWeight: '700' },

  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  pickerText: { flex: 1, color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  customerSub: { fontSize: typography.xs, color: colors.text.muted, marginTop: 4, paddingHorizontal: 4 },

  input: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text.primary,
    fontSize: typography.sm,
    minHeight: 48,
  },

  emptyLines: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  emptyLinesText: { color: colors.text.faint, fontSize: typography.sm, textAlign: 'center' },

  totalsCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.emerald.border,
    marginTop: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  totalRowLabel: { fontSize: typography.xs, color: colors.text.muted, fontWeight: '600' },
  totalRowValue: { fontSize: typography.sm, color: colors.text.secondary, fontWeight: '700' },
  grandTotalRow: {
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  grandLabel: { fontSize: typography.sm, color: colors.text.primary, fontWeight: '800' },
  grandValue: { fontSize: typography.xl, color: colors.emerald.default, fontWeight: '900' },

  saveBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.bg.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  cancelBtnText: { color: colors.text.muted, fontWeight: '700' },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: brand.green,
    borderRadius: radius.md,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },

  // === MODAL ===
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    height: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  modalTitle: { fontSize: typography.md, color: colors.text.primary, fontWeight: '800' },
  newCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.emerald.default,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  newCustomerBtnText: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },

  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  customerName: { fontSize: typography.sm, color: colors.text.primary, fontWeight: '700' },
  customerTitle: { fontSize: typography.xs, color: colors.text.muted, marginTop: 2 },

  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginBottom: spacing.sm,
  },
  modalSearchInput: { flex: 1, color: colors.text.primary, fontSize: typography.sm, paddingVertical: 2 },

  catRow: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  filterLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 },
  filterLabel: { color: colors.text.faint, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 1 },
  toggleBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  toggleText: { color: '#10b981', fontSize: 11, fontWeight: '700' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', paddingVertical: 2 },
  chipWrapCollapsed: { maxHeight: 34, overflow: 'hidden' },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.md,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  catChipActive: { backgroundColor: brand.blue, borderColor: brand.blue },
  catChipText: { fontSize: 10, color: colors.text.muted, fontWeight: '600' },
  catChipTextActive: { color: '#fff', fontWeight: '800' },

  pozItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  pozItemLeft: { flex: 1 },
  pozItemId: { fontSize: 10, color: colors.text.faint, fontWeight: '700' },
  pozItemName: { fontSize: typography.xs, color: colors.text.primary, fontWeight: '700', marginTop: 2, lineHeight: 15 },
  pozPriceRow: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  pozPriceTxt: { fontSize: 10, color: colors.text.muted, fontWeight: '600' },
  pozAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.emerald.bg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.emerald.border,
  },

  noResults: { textAlign: 'center', padding: spacing.xl, color: colors.text.faint, fontSize: typography.xs },
});
