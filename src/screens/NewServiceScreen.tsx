import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  Alert,
  Modal,
  FlatList,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';

import { colors, spacing, radius, typography } from '../theme';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { SERVICE_CATALOG, MATERIAL_CATALOG, MATERIAL_CATEGORIES, MATERIAL_BRANDS } from '../data/initialData';
import { loadOverrides, applyOverrides, loadCustomProducts, type OverrideMap } from '../services/catalogOverrides';
import { getFxRates, liveUnitPriceTry, FX_FALLBACK, type FxRates } from '../services/fx';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { localDateISO } from '../utils/date';
import { resizeForUpload } from '../utils/image';
import { matchesAnyField } from '../utils/search';
import type { MaterialCatalogItem } from '../types';
import { createApproval } from '../services/governance';
import { newUuid } from '../services/data/repository';
import { uploadPhoto } from '../services/photoUpload';
import { Customer, SelectedMaterial, ServiceCatalogItem, TabParamList, RootStackParamList } from '../types';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'NewService'>,
  NativeStackNavigationProp<RootStackParamList>
>;

// Malzeme satış marjı: teklif tutarında malzeme maliyeti bu katsayıyla çarpılır
// (maliyet × 1.25 = satış). Tek yerden yönetilsin diye sabit (sihirli sayı değil).
const MATERIAL_MARKUP = 1.25;

export default function NewServiceScreen() {
  const navigation = useNavigation<NavProp>();
  const { addWorkOrder, addCustomer, customers, toast } = useAppContext();
  const { profile, user } = useAuth();
  const engineerName =
    profile?.full_name ||
    (user as any)?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Saha';

  const [selectedClient, setSelectedClient] = useState<string>(customers[0]?.shortName ?? '');
  const [selectedService, setSelectedService] = useState<ServiceCatalogItem>(
    SERVICE_CATALOG[0] ?? { id: 'custom', name: 'Saha Servisi', price: 0, estCost: 0 }
  );
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([]);
  const [catOverrides, setCatOverrides] = useState<OverrideMap>({});
  const [customProds, setCustomProds] = useState<MaterialCatalogItem[]>([]);
  // Canlı TCMB kuru — yabancı para (EUR/USD) ürünleri bugünün kuruyla TL'ye çevirmek için.
  const [fx, setFx] = useState<FxRates>(FX_FALLBACK);
  React.useEffect(() => {
    loadOverrides().then(setCatOverrides);
    loadCustomProducts().then(setCustomProds);
    getFxRates().then(setFx).catch(() => { /* fallback zaten yüklü */ });
  }, []);
  // Usta iş öncesi/sonrası İSTEDİĞİ KADAR foto yükleyebilir (çoklu).
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [formPhoto, setFormPhoto] = useState<string | null>(null);
  const [otherCost, setOtherCost] = useState('');
  // Teklif özetindeki Hizmet ve Malzeme bedelleri elle düzenlenebilir (boş = hesaplanan).
  const [serviceFeeOverride, setServiceFeeOverride] = useState('');
  const [materialFeeOverride, setMaterialFeeOverride] = useState('');
  const [notes, setNotes] = useState('');
  // Çift kayıt koruması: foto yüklemeleri birkaç saniye sürebiliyor; bu sırada
  // butona tekrar basılınca aynı iş emri 2 kez oluşuyordu. submittingRef senkron
  // koruma (hızlı çift dokunuş), submitting state buton görünümü içindir.
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  // Arama: TextInput'a bağlı anlık `searchInput`, 250ms debounce ile `materialSearch`'e
  // düşer. Önceden her tuş basışı 13k+ kalemi filtreleyip UI'ı bloke ediyordu.
  const [searchInput, setSearchInput] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  React.useEffect(() => {
    const t = setTimeout(() => setMaterialSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);
  const [materialCategory, setMaterialCategory] = useState<string | null>(null);
  const [materialBrand, setMaterialBrand] = useState<string | null>(null);
  const [showAllMatCats, setShowAllMatCats] = useState(false);
  const [showAllMatBrands, setShowAllMatBrands] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ shortName: '', title: '', phone: '' });

  const filteredCustomers = useMemo(() => {
    const q = clientSearch.trim();
    if (!q) return customers;
    // Aksan-toleranslı + kelime-bazlı: "ege boru" / "EGE BORU" / "egeboru" eşleşir.
    return customers.filter(c => matchesAnyField([c.shortName, c.title, c.taxNumber, c.phone], q));
  }, [customers, clientSearch]);

  const filteredMaterials = useMemo(() => {
    const q = materialSearch.trim();
    let base = [...customProds, ...applyOverrides(MATERIAL_CATALOG, catOverrides)];
    if (materialCategory) base = base.filter(m => m.category === materialCategory);
    if (materialBrand) base = base.filter(m => m.brand === materialBrand);
    if (q) {
      // Aksan-toleranslı + kelime-bazlı arama: "kontaktor" → "Kontaktör",
      // "siemens kontaktor" gibi çok kelimeli sorgular sıra şartı olmadan eşleşir.
      base = base.filter(m => matchesAnyField([m.name, m.code, m.brand, m.category], q));
    }
    // Performans: ilk 400 sonuç yeterli (FlatList zaten lazy render eder).
    return base.slice(0, 400);
  }, [materialSearch, materialCategory, materialBrand, catOverrides, customProds]);

  const handleCreateCustomer = () => {
    const shortName = newCustomer.shortName.trim();
    if (!shortName) {
      Alert.alert('Eksik bilgi', 'En azından müşterinin kısa adını giriniz.');
      return;
    }
    const dup = customers.find(
      c => c.shortName.toLocaleLowerCase('tr-TR') === shortName.toLocaleLowerCase('tr-TR'),
    );
    if (dup) {
      setSelectedClient(dup.shortName);
      setShowNewCustomer(false);
      setShowClientPicker(false);
      return;
    }
    const c: Customer = {
      id: newUuid(),
      shortName,
      title: newCustomer.title.trim() || shortName,
      phone: newCustomer.phone.trim() || undefined,
    };
    addCustomer(c);
    setSelectedClient(c.shortName);
    setNewCustomer({ shortName: '', title: '', phone: '' });
    setShowNewCustomer(false);
    setShowClientPicker(false);
  };

  const updateMaterialQty = (id: string, delta: number) => {
    setSelectedMaterials(prev => {
      const next = prev.map(m => (m.id === id ? { ...m, qty: m.qty + delta } : m));
      return next.filter(m => m.qty > 0);
    });
  };

  // Miktarı doğrudan yaz (ör. 300 mt) — tek tek +/- ile artırmaya gerek kalmadan.
  // Düzenleme sırasında 0/boşa izin verilir; satır silinmez (çöp kutusu siler).
  const setMaterialQty = (id: string, raw: string) => {
    const n = Math.max(0, Math.floor(Number(String(raw).replace(/[^0-9]/g, '')) || 0));
    setSelectedMaterials(prev => prev.map(m => (m.id === id ? { ...m, qty: n } : m)));
  };

  const updateMaterialDiscount = (id: string, pct: number) => {
    const safe = Math.max(0, Math.min(100, isFinite(pct) ? pct : 0));
    setSelectedMaterials(prev =>
      prev.map(m => (m.id === id ? { ...m, discountPct: safe } : m)),
    );
  };

  // Manuel (katalogda olmayan) malzeme — saha personeli tek tek katalogdan seçmek
  // istemezse adı + fiyatı kendi yazar.
  const isManualMat = (id: string) => id.startsWith('MANUAL-');
  const addManualMaterial = () => {
    const id = 'MANUAL-' + newUuid();
    setSelectedMaterials(prev => [...prev, { id, name: '', price: 0, qty: 1, discountPct: 0 }]);
  };
  const updateMaterialName = (id: string, name: string) =>
    setSelectedMaterials(prev => prev.map(m => (m.id === id ? { ...m, name } : m)));
  const updateMaterialPrice = (id: string, price: number) =>
    setSelectedMaterials(prev => prev.map(m => (m.id === id ? { ...m, price: Math.max(0, isFinite(price) ? price : 0) } : m)));

  const lineTotal = (m: SelectedMaterial) =>
    m.price * m.qty * (1 - (m.discountPct ?? 0) / 100);

  // ----- Teklif özeti bileşenleri (TEK kaynak: hem özet render hem handleSubmit) -----
  // Hizmet ve Malzeme bedelleri elle düzenlenebilir; override boşsa hesaplanan kullanılır.
  const rawMaterialCost = selectedMaterials.reduce((s, m) => s + lineTotal(m), 0);
  const defaultServiceFee = selectedService?.price ?? 0;
  const defaultMaterialFee = Math.round(rawMaterialCost * MATERIAL_MARKUP);
  const effServiceFee = serviceFeeOverride.trim() !== '' ? (parseFloat(serviceFeeOverride) || 0) : defaultServiceFee;
  const effMaterialFee = materialFeeOverride.trim() !== '' ? (parseFloat(materialFeeOverride) || 0) : defaultMaterialFee;
  const effExtraCost = parseFloat(otherCost) || 0;
  // Teklif tek noktada yuvarlanır → quoteAmount ve profit aynı değerden türetilir (tutarlı).
  const calculatedQuote = Math.round(effServiceFee + effMaterialFee + effExtraCost);

  // Seçili malzemeleri id→kalem Map'ine al — katalog seçicide her satırda O(n)
  // `.find` yerine O(1) erişim (400 kalemlik listede belirgin fark).
  const selectedById = useMemo(
    () => new Map(selectedMaterials.map(m => [m.id, m])),
    [selectedMaterials],
  );

  // Para biçimi: 2 ondalık (₺ önekli). Yuvarlama yerine kuruş gösterilir ki
  // birim/iskonto farkı net görünsün (ör. ₺13,57 — eski "₺14" karışıklığı düzeldi).
  const fmtTL = (n: number) =>
    `₺${(isFinite(n) ? n : 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const pickPhoto = async (type: 'before' | 'after' | 'form') => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('İzin Gerekli', 'Fotoğraf çekmek için kamera izni gereklidir.');
          return;
        }
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Yüklemeden önce küçült (bellek + mobil veri tasarrufu).
        const { uri } = await resizeForUpload(result.assets[0].uri, { maxWidth: 1600, compress: 0.7 });
        if (type === 'before') setBeforePhotos(prev => [...prev, uri]);
        else if (type === 'after') setAfterPhotos(prev => [...prev, uri]);
        else setFormPhoto(uri);
      }
    } catch (err: any) {
      console.warn('[pickPhoto]', err);
      // Web'de kamera yoksa galeriyi açmayı teklif et
      if (Platform.OS === 'web') {
        pickFromGallery(type);
      } else {
        Alert.alert('Hata', 'Kamera başlatılamadı: ' + err.message);
      }
    }
  };

  const pickFromGallery = async (type: 'before' | 'after' | 'form') => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('İzin Gerekli', 'Galeri erişimi için izin gereklidir.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Yüklemeden önce küçült (bellek + mobil veri tasarrufu).
        const { uri } = await resizeForUpload(result.assets[0].uri, { maxWidth: 1600, compress: 0.7 });
        if (type === 'before') setBeforePhotos(prev => [...prev, uri]);
        else if (type === 'after') setAfterPhotos(prev => [...prev, uri]);
        else setFormPhoto(uri);
      }
    } catch (err: any) {
      console.warn('[pickFromGallery]', err);
      Alert.alert('Hata', 'Galeri açılamadı: ' + err.message);
    }
  };

  const showPhotoOptions = (type: 'before' | 'after' | 'form') => {
    // Web'de Alert.alert çoklu butonu desteklemediği için doğrudan galeri/dosya seçiciyi aç.
    if (Platform.OS === 'web') {
      pickFromGallery(type);
      return;
    }
    Alert.alert('Fotoğraf Ekle', 'Kaynak seçin', [
      { text: 'Kamera', onPress: () => pickPhoto(type) },
      { text: 'Galeri', onPress: () => pickFromGallery(type) },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  // Çoklu foto ızgarası: mevcut fotolar (sil butonlu) + "Foto Ekle" karosu.
  // Usta öncesi/sonrası İSTEDİĞİ KADAR foto ekleyebilir.
  const renderPhotoGrid = (
    photos: string[],
    setPhotos: React.Dispatch<React.SetStateAction<string[]>>,
    type: 'before' | 'after',
  ) => (
    <View style={styles.photoGrid}>
      {photos.map((uri, idx) => (
        <View key={`${type}-${idx}`} style={styles.photoThumbWrap}>
          <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
          <TouchableOpacity
            style={styles.removePhotoThumb}
            onPress={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
          >
            <Ionicons name="close-circle" size={20} color={colors.rose.default} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={styles.photoAddTile} onPress={() => showPhotoOptions(type)} activeOpacity={0.8}>
        <Ionicons name="camera-outline" size={26} color={colors.text.faint} />
        <Text style={styles.photoAddText}>Foto Ekle</Text>
      </TouchableOpacity>
    </View>
  );

  const addMaterial = (mat: (typeof MATERIAL_CATALOG)[0]) => {
    setSelectedMaterials(prev => {
      const existing = prev.find(m => m.id === mat.id);
      if (existing) {
        return prev.map(m => m.id === mat.id ? { ...m, qty: m.qty + 1 } : m);
      }
      // NOT: Katalog `price` zaten tedarikçi iskontosu uygulanmış (yabancı parada
      // TL'ye çevrilmiş) NET fiyattır. Tedarikçi iskontosunu satıra TEKRAR uygulama
      // (eski sürüm çift-iskonto yapıyordu). Satır iskontosu mühendisin EK indirimi
      // içindir → 0'dan başlar. Yabancı para fiyatını BUGÜNÜN TCMB kuruyla hesapla.
      const cur = (mat.currency || 'TL').toUpperCase();
      const isForeign = cur !== 'TL' && cur !== 'TRY';
      const unit = liveUnitPriceTry(mat, fx);
      return [...prev, {
        id: mat.id, name: mat.name, price: unit, qty: 1, discountPct: 0,
        currency: mat.currency,
        listPrice: mat.listPrice,
        supplierDiscount: typeof mat.discountRate === 'number' ? mat.discountRate : undefined,
        fxRate: isForeign ? (cur === 'EUR' ? fx.EUR : cur === 'USD' ? fx.USD : undefined) : undefined,
      }];
    });
  };

  const decrementMaterial = (id: string) => {
    setSelectedMaterials(prev => {
      const existing = prev.find(m => m.id === id);
      if (!existing) return prev;
      if (existing.qty <= 1) return prev.filter(m => m.id !== id);
      return prev.map(m => m.id === id ? { ...m, qty: m.qty - 1 } : m);
    });
  };

  const removeMaterial = (id: string) => {
    setSelectedMaterials(prev => prev.filter(m => m.id !== id));
  };

  const handleSubmit = async () => {
    if (!selectedClient) {
      Alert.alert('Müşteri Seçin', 'Devam etmek için bir müşteri seçin.');
      return;
    }
    // Çift kayıt koruması: zaten gönderiliyorsa tekrar başlatma.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
    // Fotoğraflar artık opsiyonel — saha hızlı kayıt için engel olmaz.

    // Teklif bileşenleri yukarıda hesaplandı (düzenlenebilir hizmet/malzeme/yol).
    const materialCost = rawMaterialCost;          // ham malzeme maliyeti (kâr/maliyet takibi)
    const laborCost = selectedService.estCost;
    const extraCost = effExtraCost;
    const totalCost = laborCost + materialCost + extraCost;
    const profit = calculatedQuote - totalCost;    // calculatedQuote zaten yuvarlı → tutarlı

    const workOrderId = `KOB-DRAFT-${Date.now().toString().slice(-4)}`;

    // Fotoğrafları Supabase Storage'a yükle (çoklu). Hata olursa lokal URI fallback.
    const uploadFolder = `work-orders/${workOrderId}`;
    const uploadAll = async (uris: string[]): Promise<string[]> => {
      const out: string[] = [];
      for (const u of uris) {
        try { out.push(await uploadPhoto(u, uploadFolder)); }
        catch (e: any) { console.warn('[wo.photo.upload]', e); out.push(u); } // hata → lokal URI fallback
      }
      return out;
    };
    const beforeUrls = await uploadAll(beforePhotos);
    const afterUrls = await uploadAll(afterPhotos);
    let formUrl = formPhoto || undefined;
    try {
      if (formPhoto) formUrl = await uploadPhoto(formPhoto, uploadFolder);
    } catch (e: any) {
      Alert.alert('Foto yüklenemedi (form)', e?.message ?? 'Bilinmeyen hata');
    }

    addWorkOrder({
      id: workOrderId,
      client: selectedClient,
      serviceName: selectedService.name,
      date: localDateISO(),
      engineer: engineerName,
      // Boş bırakılmış manuel kalemleri (ad girilmemiş) ele.
      materials: selectedMaterials.filter(m => m.qty > 0 && (!isManualMat(m.id) || (m.name || '').trim().length > 0)),
      otherCost: extraCost,
      laborCost,
      materialCost,
      quoteAmount: Math.round(calculatedQuote),
      profit: Math.round(profit),
      status: 'Onay Bekliyor',
      beforePhoto: beforeUrls[0] || '',
      afterPhoto: afterUrls[0] || '',
      beforePhotos: beforeUrls,
      afterPhotos: afterUrls,
      formPhoto: formUrl,
      notes: notes || 'Saha bakımı tamamlandı, gerilim testleri yapıldı.',
    });

    // Yönetici onay havuzuna ApprovalRequest olarak da düşür
    try {
      await createApproval({
        kind: 'other',
        title: `Servis Raporu Onayı: ${selectedClient}`,
        description: `${selectedService.name} – Teklif ₺${Math.round(calculatedQuote).toLocaleString('tr-TR')}`,
        resource: 'work_order',
        resourceId: workOrderId,
        requestedByName: engineerName,
        payload: {
          client: selectedClient,
          materialCost,
          laborCost,
          extraCost,
          quoteAmount: Math.round(calculatedQuote),
        },
      });
    } catch (e) {
      console.warn('[approval.create]', e);
    }

    // Başarı/hata bildirimi addWorkOrder içindeki toast'tan gelir (gerçek kayıt
    // sonucuna göre) — burada koşulsuz "Gönderildi" Alert'i kaldırıldı.

    // Reset form
    setBeforePhotos([]);
    setAfterPhotos([]);
    setFormPhoto(null);
    setSelectedMaterials([]);
    setOtherCost('');
    setNotes('');
    navigation.navigate('Services');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Yeni Servis Raporu</Text>
          <Text style={styles.subtitle}>Fotoğraflı doğrulama ve malzeme hakediş formu</Text>
        </View>

        {/* Step 1: Customer */}
        <Text style={styles.stepLabel}>1. Müşteri Seçin</Text>
        <TouchableOpacity
          style={styles.picker}
          onPress={() => setShowClientPicker(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.pickerValue}>{selectedClient || 'Müşteri seçin…'}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.text.muted} />
        </TouchableOpacity>

        {/* Step 2: Before Photos (çoklu — istediğin kadar) */}
        <Text style={styles.stepLabel}>2. İş Öncesi Fotoğraflar (Before){beforePhotos.length ? ` · ${beforePhotos.length}` : ''}</Text>
        {renderPhotoGrid(beforePhotos, setBeforePhotos, 'before')}

        {/* Step 3: Service Selection */}
        <Text style={styles.stepLabel}>3. Yapılan Ana Hizmet</Text>
        <TouchableOpacity
          style={styles.picker}
          onPress={() => setShowServicePicker(true)}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.pickerValue} numberOfLines={1}>
              {selectedService.name}
            </Text>
            <Text style={styles.pickerSub}>
              Teklif: ₺{selectedService.price.toLocaleString('tr-TR')}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color={colors.text.muted} />
        </TouchableOpacity>

        {/* Step 4: Materials */}
        <Text style={styles.stepLabel}>4. Kullanılan Sarf Malzemeler</Text>
        <View style={styles.fxBanner}>
          <Ionicons name="swap-horizontal" size={12} color={colors.text.muted} />
          <Text style={styles.fxBannerText}>
            {`Kur: € ${fx.EUR.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} · $ ${fx.USD.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} · ${fx.source === 'TCMB' ? `TCMB ${fx.date}` : fx.source === 'cache' ? `TCMB ${fx.date} (önbellek)` : 'varsayılan kur'}`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addMaterialBtn}
          onPress={() => { setSearchInput(''); setMaterialSearch(''); setShowMaterialPicker(true); }}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.emerald.default} />
          <Text style={styles.addMaterialBtnText}>
            Malzeme Ekle{MATERIAL_CATALOG.length > 0 ? ` (${MATERIAL_CATALOG.length} katalog kaydı)` : ''}
          </Text>
          <Ionicons name="search-outline" size={16} color={colors.text.muted} />
        </TouchableOpacity>
        {/* Katalogda olmayan ürünü elle ekle */}
        <TouchableOpacity
          style={styles.manualMaterialBtn}
          onPress={addManualMaterial}
          activeOpacity={0.85}
        >
          <Ionicons name="create-outline" size={18} color={colors.indigo.default} />
          <Text style={styles.manualMaterialBtnText}>Manuel Malzeme Ekle (ad + fiyat yaz)</Text>
        </TouchableOpacity>

        {selectedMaterials.length > 0 ? (
          <View style={styles.selectedMaterials}>
            {selectedMaterials.map(m => {
              const disc = m.discountPct ?? 0;
              const unitNet = m.price * (1 - disc / 100);
              const line = lineTotal(m);
              // Fiyatın nereden geldiğini şeffaf göster ("şu ne oluyor?" sorusuna cevap):
              // yabancı parada kaynak döviz + tedarikçi iskontosu + kullanılan TCMB kuru;
              // TL'de liste fiyatı + tedarikçi iskontosu.
              const curU = (m.currency || 'TL').toUpperCase();
              const isForeign = curU !== 'TL' && curU !== 'TRY';
              let originInfo = '';
              if (isForeign && m.listPrice) {
                const net = m.listPrice * (1 - (m.supplierDiscount ?? 0) / 100);
                const rate = (m.fxRate ?? 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
                originInfo = `Kaynak: ${m.listPrice} ${curU}${m.supplierDiscount ? ` −%${m.supplierDiscount}` : ''} × kur ${rate} (TCMB)`;
              } else if (m.supplierDiscount && m.listPrice) {
                originInfo = `Liste ₺${m.listPrice} · tedarikçi ind. %${m.supplierDiscount}`;
              }
              return (
                <View key={m.id} style={styles.matRow}>
                  <View style={{ flex: 1 }}>
                    {isManualMat(m.id) ? (
                      <>
                        <TextInput
                          style={styles.manualNameInput}
                          value={m.name}
                          onChangeText={v => updateMaterialName(m.id, v)}
                          placeholder="Malzeme/ürün adı"
                          placeholderTextColor={colors.text.faint}
                        />
                        <View style={styles.discRow}>
                          <Text style={styles.discLabel}>Birim ₺</Text>
                          <TextInput
                            style={styles.discInput}
                            value={m.price ? String(m.price) : ''}
                            onChangeText={v => updateMaterialPrice(m.id, parseFloat(v.replace(',', '.')) || 0)}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor={colors.text.faint}
                            selectTextOnFocus
                          />
                          <Text style={[styles.matPrice, { marginLeft: 8 }]}>= {fmtTL(line)}</Text>
                        </View>
                      </>
                    ) : (
                    <>
                    <Text style={styles.matName} numberOfLines={2}>{m.name}</Text>
                    <Text style={styles.matPrice}>
                      {fmtTL(line)}
                      <Text style={styles.matPriceMuted}>
                        {`  (birim ${fmtTL(unitNet)}${disc > 0 ? ` · ek ind. %${disc}` : ''})`}
                      </Text>
                    </Text>
                    {!!originInfo && <Text style={styles.matOrigin}>{originInfo}</Text>}
                    </>
                    )}
                    <View style={styles.discRow}>
                      <Text style={styles.discLabel}>{isManualMat(m.id) ? 'İskonto %' : 'Ek İskonto %'}</Text>
                      <TextInput
                        style={styles.discInput}
                        value={String(disc)}
                        onChangeText={v => updateMaterialDiscount(m.id, parseFloat(v.replace(',', '.')) || 0)}
                        keyboardType="decimal-pad"
                        maxLength={5}
                        selectTextOnFocus
                      />
                    </View>
                  </View>
                  <View style={styles.qtyBox}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateMaterialQty(m.id, -1)}>
                      <Ionicons name="remove" size={16} color={colors.text.primary} />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.qtyVal}
                      value={String(m.qty)}
                      onChangeText={v => setMaterialQty(m.id, v)}
                      keyboardType="number-pad"
                      selectTextOnFocus
                      maxLength={6}
                      textAlign="center"
                    />
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateMaterialQty(m.id, 1)}>
                      <Ionicons name="add" size={16} color={colors.text.primary} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => removeMaterial(m.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.rose.default} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.materialHint}>Henüz malzeme eklemediniz. Yukarıdaki butona dokunup arayarak hızlıca seçin.</Text>
        )}

        {/* Step 5: After Photos (çoklu — istediğin kadar) */}
        <Text style={styles.stepLabel}>5. İş Sonrası Fotoğraflar (After){afterPhotos.length ? ` · ${afterPhotos.length}` : ''}</Text>
        {renderPhotoGrid(afterPhotos, setAfterPhotos, 'after')}

        {/* Step 6: Servis Formu Fotoğrafı (opsiyonel) */}
        <Text style={styles.stepLabel}>6. Servis Formu Fotoğrafı (opsiyonel)</Text>
        {formPhoto ? (
          <View style={styles.photoContainer}>
            <Image source={{ uri: formPhoto }} style={styles.photo} resizeMode="cover" />
            <TouchableOpacity
              style={styles.removePhoto}
              onPress={() => setFormPhoto(null)}
            >
              <Ionicons name="close-circle" size={24} color={colors.rose.default} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.photoUpload}
            onPress={() => showPhotoOptions('form')}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={32} color={colors.text.faint} />
            <Text style={styles.photoUploadText}>Kağıt Servis Formunu Çek / Yükle</Text>
          </TouchableOpacity>
        )}

        {/* Step 7: Extra Cost & Notes */}
        <Text style={styles.stepLabel}>7. Yol / Yemek Masrafı (₺)</Text>
        <TextInput
          style={styles.input}
          placeholder="Örn: 500"
          placeholderTextColor={colors.text.faint}
          keyboardType="numeric"
          value={otherCost}
          onChangeText={setOtherCost}
        />

        <Text style={styles.stepLabel}>8. Rapor Notu</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Saha notlarınızı yazın..."
          placeholderTextColor={colors.text.faint}
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
        />

        {/* Summary */}
        {(selectedMaterials.length > 0 || selectedService) && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Otomatik Teklif Özeti</Text>
            <Text style={styles.summaryHint}>Tutarlara dokunup elle değiştirebilirsiniz (boş = otomatik hesap).</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Hizmet Bedeli</Text>
              <View style={styles.summaryEditWrap}>
                <Text style={styles.summaryCurrency}>₺</Text>
                <TextInput
                  style={styles.summaryInput}
                  keyboardType="numeric"
                  value={serviceFeeOverride}
                  onChangeText={setServiceFeeOverride}
                  placeholder={defaultServiceFee.toLocaleString('tr-TR')}
                  placeholderTextColor={colors.text.faint}
                />
              </View>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Malzeme (+%25 marj)</Text>
              <View style={styles.summaryEditWrap}>
                <Text style={styles.summaryCurrency}>₺</Text>
                <TextInput
                  style={styles.summaryInput}
                  keyboardType="numeric"
                  value={materialFeeOverride}
                  onChangeText={setMaterialFeeOverride}
                  placeholder={defaultMaterialFee.toLocaleString('tr-TR')}
                  placeholderTextColor={colors.text.faint}
                />
              </View>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Yol / Yemek Masrafı</Text>
              <View style={styles.summaryEditWrap}>
                <Text style={styles.summaryCurrency}>₺</Text>
                <TextInput
                  style={styles.summaryInput}
                  keyboardType="numeric"
                  value={otherCost}
                  onChangeText={setOtherCost}
                  placeholder="0"
                  placeholderTextColor={colors.text.faint}
                />
              </View>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Hesaplanan Teklif</Text>
              <Text style={styles.summaryTotalVal}>
                ₺{calculatedQuote.toLocaleString('tr-TR')}
              </Text>
            </View>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator size="small" color={colors.bg.primary} />
            : <Ionicons name="send" size={16} color={colors.bg.primary} />}
          <Text style={styles.submitBtnText}>{submitting ? 'GÖNDERİLİYOR…' : 'İŞİ ONAYA GÖNDER'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Client Picker Modal */}
      <Modal
        visible={showClientPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowClientPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '85%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Müşteri Seçin</Text>
              <TouchableOpacity
                style={styles.modalAddBtn}
                onPress={() => setShowNewCustomer(v => !v)}
              >
                <Ionicons
                  name={showNewCustomer ? 'remove-circle-outline' : 'add-circle-outline'}
                  size={16}
                  color="#fff"
                />
                <Text style={styles.modalAddBtnText}>
                  {showNewCustomer ? 'Kapat' : 'Yeni Müşteri'}
                </Text>
              </TouchableOpacity>
            </View>

            {showNewCustomer && (
              <View style={styles.newCustomerBox}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Kısa ad (zorunlu)"
                  placeholderTextColor={colors.text.faint}
                  value={newCustomer.shortName}
                  onChangeText={t => setNewCustomer(s => ({ ...s, shortName: t }))}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Resmi ünvan (opsiyonel)"
                  placeholderTextColor={colors.text.faint}
                  value={newCustomer.title}
                  onChangeText={t => setNewCustomer(s => ({ ...s, title: t }))}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Telefon (opsiyonel)"
                  placeholderTextColor={colors.text.faint}
                  keyboardType="phone-pad"
                  value={newCustomer.phone}
                  onChangeText={t => setNewCustomer(s => ({ ...s, phone: t }))}
                />
                <TouchableOpacity style={styles.saveCustomerBtn} onPress={handleCreateCustomer}>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text style={styles.saveCustomerBtnText}>Kaydet ve Seç</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={16} color={colors.text.muted} />
              <TextInput
                style={styles.searchInputInline}
                placeholder="Müşteri ara (ad, ünvan, vergi no, telefon)"
                placeholderTextColor={colors.text.faint}
                value={clientSearch}
                onChangeText={setClientSearch}
                autoCapitalize="none"
              />
              {clientSearch.length > 0 && (
                <TouchableOpacity onPress={() => setClientSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.text.muted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              {...FLATLIST_DEFAULTS}
              data={filteredCustomers}
              keyExtractor={c => c.id}
              style={{ maxHeight: 320 }}
              ListEmptyComponent={
                <Text style={[styles.modalItemSub, { textAlign: 'center', marginVertical: spacing.lg }]}>
                  {customers.length === 0
                    ? 'Henüz müşteri yok. Yukarıdaki “Yeni Müşteri” butonunu kullanın.'
                    : 'Arama sonucu boş.'}
                </Text>
              }
              renderItem={({ item: c }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => { setSelectedClient(c.shortName); setShowClientPicker(false); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemText} numberOfLines={1}>{c.shortName}</Text>
                    {c.title && c.title !== c.shortName && (
                      <Text style={styles.modalItemSub} numberOfLines={1}>{c.title}</Text>
                    )}
                  </View>
                  {selectedClient === c.shortName && (
                    <Ionicons name="checkmark" size={16} color={colors.emerald.default} />
                  )}
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowClientPicker(false)}
            >
              <Text style={styles.modalCancelText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Service Picker Modal */}
      <Modal
        visible={showServicePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowServicePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Hizmet Seçin</Text>
            {SERVICE_CATALOG.length === 0 && (
              <Text style={styles.modalItemSub}>Hizmet kataloğu boş. Varsayılan “Saha Servisi” kullanılacak.</Text>
            )}
            <ScrollView style={{ maxHeight: '70%' }}>
              {SERVICE_CATALOG.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.modalItem}
                  onPress={() => { setSelectedService(s); setShowServicePicker(false); }}
                >
                  <View style={{ flex: 1, flexShrink: 1 }}>
                    <Text
                      style={[styles.modalItemText, { color: colors.text.primary }]}
                      numberOfLines={2}
                    >
                      {s.name}
                    </Text>
                    <Text style={styles.modalItemSub}>
                      ₺{s.price.toLocaleString('tr-TR')}
                    </Text>
                  </View>
                  {selectedService.id === s.id && (
                    <Ionicons name="checkmark" size={16} color={colors.emerald.default} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowServicePicker(false)}
            >
              <Text style={styles.modalCancelText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Material Picker Modal */}
      <Modal
        visible={showMaterialPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMaterialPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>
              Malzeme / Ürün Seçin ({MATERIAL_CATALOG.length.toLocaleString('tr-TR')} kayıt)
            </Text>

            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={16} color={colors.text.muted} />
              <TextInput
                style={styles.searchInputInline}
                placeholder="Ad, kod, marka veya kategori"
                placeholderTextColor={colors.text.faint}
                value={searchInput}
                onChangeText={setSearchInput}
                autoCapitalize="none"
              />
              {searchInput.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchInput(''); setMaterialSearch(''); }}>
                  <Ionicons name="close-circle" size={16} color={colors.text.muted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Kategori chipleri */}
            <View style={styles.filterLabelRow}>
              <Text style={styles.filterLabel}>Kategori {materialCategory ? `· ${materialCategory}` : ''}</Text>
              <TouchableOpacity onPress={() => setShowAllMatCats(v => !v)} style={styles.toggleBtn}>
                <Text style={styles.toggleText}>{showAllMatCats ? 'Daralt ▲' : `Tümü (${MATERIAL_CATEGORIES.length}) ▼`}</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.chipWrap, !showAllMatCats && styles.chipWrapCollapsed]}>
              <TouchableOpacity
                onPress={() => setMaterialCategory(null)}
                style={[styles.chip, !materialCategory && styles.chipActive]}
              >
                <Text style={[styles.chipText, !materialCategory && styles.chipTextActive]}>Tüm Kategoriler</Text>
              </TouchableOpacity>
              {MATERIAL_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setMaterialCategory(materialCategory === cat ? null : cat)}
                  style={[styles.chip, materialCategory === cat && styles.chipActive]}
                >
                  <Text style={[styles.chipText, materialCategory === cat && styles.chipTextActive]} numberOfLines={1}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Marka chipleri */}
            <View style={styles.filterLabelRow}>
              <Text style={styles.filterLabel}>Marka {materialBrand ? `· ${materialBrand}` : ''}</Text>
              <TouchableOpacity onPress={() => setShowAllMatBrands(v => !v)} style={styles.toggleBtn}>
                <Text style={styles.toggleText}>{showAllMatBrands ? 'Daralt ▲' : `Tümü (${MATERIAL_BRANDS.length}) ▼`}</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.chipWrap, !showAllMatBrands && styles.chipWrapCollapsed]}>
              <TouchableOpacity
                onPress={() => setMaterialBrand(null)}
                style={[styles.chip, !materialBrand && styles.chipActive]}
              >
                <Text style={[styles.chipText, !materialBrand && styles.chipTextActive]}>Tüm Markalar</Text>
              </TouchableOpacity>
              {MATERIAL_BRANDS.map(b => (
                <TouchableOpacity
                  key={b}
                  onPress={() => setMaterialBrand(materialBrand === b ? null : b)}
                  style={[styles.chip, materialBrand === b && styles.chipActive]}
                >
                  <Text style={[styles.chipText, materialBrand === b && styles.chipTextActive]} numberOfLines={1}>
                    {b}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FlatList
              {...FLATLIST_DEFAULTS}
              data={filteredMaterials}
              keyExtractor={m => m.id}
              style={{ maxHeight: 420 }}
              ListEmptyComponent={
                <Text style={[styles.modalItemSub, { textAlign: 'center', marginVertical: spacing.lg }]}>
                  Arama sonucu boş.
                </Text>
              }
              renderItem={({ item: m }) => {
                const inList = selectedById.get(m.id);
                const tags = [m.brand, m.category].filter(Boolean).join(' · ');
                // Yabancı parada CANLI TCMB kuruyla TL fiyatı göster (bayat baked fiyat değil).
                const livePrice = liveUnitPriceTry(m, fx);
                const priceLabel = m.currency && m.currency !== 'TL' && m.currency !== 'TRY' && m.listPrice
                  ? `${fmtTL(livePrice)}  (${m.listPrice} ${m.currency})`
                  : fmtTL(livePrice);
                return (
                  <View style={styles.modalItem}>
                    <TouchableOpacity
                      style={{ flex: 1, flexShrink: 1 }}
                      onPress={() => addMaterial(m)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.modalItemText} numberOfLines={2}>{m.name}</Text>
                      {!!tags && <Text style={styles.modalItemSub} numberOfLines={1}>{tags}</Text>}
                      <Text style={styles.modalItemSub}>{priceLabel}</Text>
                    </TouchableOpacity>
                    {inList ? (
                      <View style={styles.qtyStepper}>
                        <TouchableOpacity
                          style={styles.qtyStepBtn}
                          onPress={() => decrementMaterial(m.id)}
                          hitSlop={8}
                        >
                          <Ionicons name="remove" size={18} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.qtyStepText}>{inList.qty}</Text>
                        <TouchableOpacity
                          style={styles.qtyStepBtn}
                          onPress={() => addMaterial(m)}
                          hitSlop={8}
                        >
                          <Ionicons name="add" size={18} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => addMaterial(m)} hitSlop={8}>
                        <Ionicons name="add-circle" size={28} color={colors.emerald.default} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />

            <TouchableOpacity
              style={styles.modalDone}
              onPress={() => setShowMaterialPicker(false)}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.modalDoneText}>
                Tamam{selectedMaterials.length > 0 ? ` (${selectedMaterials.length} kalem)` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  header: { marginBottom: spacing.lg },
  title: { fontSize: typography.xl, color: colors.text.primary, fontWeight: '900' },
  subtitle: { fontSize: typography.xs, color: colors.text.muted, marginTop: 3 },
  stepLabel: {
    fontSize: typography.xs,
    color: colors.text.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    padding: spacing.md,
    gap: spacing.sm,
  },
  pickerValue: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.sm,
    fontWeight: '700',
  },
  pickerSub: { color: colors.emerald.default, fontSize: typography.xs, marginTop: 2 },
  photoContainer: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.emerald.default,
    height: 140,
    position: 'relative',
  },
  photo: { width: '100%', height: '100%' },
  removePhoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
  },
  photoUpload: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border.secondary,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  photoUploadText: {
    fontSize: typography.xs,
    color: colors.text.faint,
    fontWeight: '600',
  },
  // Çoklu foto ızgarası (öncesi/sonrası)
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoThumbWrap: {
    width: 96, height: 96, borderRadius: radius.md, overflow: 'hidden',
    borderWidth: 1.5, borderColor: colors.emerald.default, position: 'relative',
  },
  photoThumb: { width: '100%', height: '100%' },
  removePhotoThumb: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10,
  },
  photoAddTile: {
    width: 96, height: 96, borderRadius: radius.md,
    backgroundColor: colors.bg.secondary, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: colors.border.secondary, justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  photoAddText: { fontSize: 10, color: colors.text.faint, fontWeight: '700' },
  materialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  materialBtn: {
    width: '47%',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    padding: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
  },
  materialBtnName: {
    flex: 1,
    fontSize: typography.xs,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  materialBtnPrice: {
    fontSize: typography.xs,
    color: colors.emerald.default,
    fontWeight: '700',
  },
  selectedMaterials: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  matRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  matName: { flex: 1, fontSize: typography.xs, color: colors.text.secondary, fontWeight: '600' },
  matPrice: { fontSize: typography.xs, color: colors.emerald.default, fontWeight: '700', marginTop: 2 },
  matPriceMuted: { fontSize: 10, color: colors.text.muted, fontWeight: '500' },
  matOrigin: { fontSize: 10, color: colors.text.faint, fontWeight: '500', marginTop: 1 },
  fxBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.bg.card, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border.primary },
  fxBannerText: { fontSize: 10, color: colors.text.muted, fontWeight: '600' },
  discRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  discLabel: { fontSize: 11, color: colors.text.muted, fontWeight: '600' },
  discInput: {
    minWidth: 56,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    color: colors.text.primary,
    fontSize: typography.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    color: colors.text.primary,
    fontSize: typography.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  textarea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  summary: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    padding: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  summaryTitle: {
    fontSize: typography.xs,
    color: colors.text.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 3 },
  summaryLabel: { fontSize: typography.sm, color: colors.text.muted, flexShrink: 1, marginRight: spacing.sm },
  summaryVal: { fontSize: typography.sm, color: colors.text.secondary, fontWeight: '600' },
  summaryHint: { fontSize: typography.xs, color: colors.text.faint, marginBottom: 6 },
  summaryEditWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    paddingHorizontal: 8,
    minWidth: 130,
  },
  summaryCurrency: { fontSize: typography.sm, color: colors.text.muted, marginRight: 2 },
  summaryInput: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.text.primary,
    fontWeight: '700',
    textAlign: 'right',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
    paddingTop: spacing.sm,
    marginTop: 4,
  },
  summaryTotalLabel: { fontSize: typography.sm, color: colors.emerald.default, fontWeight: '700' },
  summaryTotalVal: {
    fontSize: typography.md,
    color: colors.emerald.default,
    fontWeight: '900',
  },
  submitBtn: {
    backgroundColor: colors.indigo.default,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    shadowColor: colors.indigo.default,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnText: { color: '#fff', fontSize: typography.base, fontWeight: '900', letterSpacing: 0.5 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: colors.border.primary,
  },
  modalTitle: {
    fontSize: typography.md,
    color: colors.text.primary,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    gap: spacing.sm,
  },
  modalItemText: { fontSize: typography.sm, color: colors.text.primary, fontWeight: '600' },
  modalItemSub: { fontSize: typography.xs, color: colors.emerald.default, marginTop: 2 },
  modalCancel: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  modalCancelText: { color: colors.rose.default, fontSize: typography.sm, fontWeight: '700' },
  addMaterialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  addMaterialBtnText: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.sm,
    fontWeight: '700',
  },
  manualMaterialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.indigo.bg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.indigo.border,
    borderStyle: 'dashed',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  manualMaterialBtnText: {
    flex: 1,
    color: colors.indigo.default,
    fontSize: typography.xs,
    fontWeight: '700',
  },
  manualNameInput: {
    backgroundColor: colors.bg.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    color: colors.text.primary,
    fontSize: typography.sm,
    fontWeight: '600',
  },
  materialHint: {
    color: colors.text.muted,
    fontSize: typography.xs,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.primary,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.primary,
    overflow: 'hidden',
  },
  qtyBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyVal: {
    minWidth: 44,
    paddingHorizontal: 4,
    paddingVertical: 2,
    textAlign: 'center',
    color: colors.text.primary,
    fontSize: typography.sm,
    fontWeight: '700',
  },
  qtyBadge: {
    backgroundColor: colors.emerald.default,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  qtyBadgeText: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.full,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  qtyStepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.emerald.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyStepText: {
    minWidth: 22,
    textAlign: 'center',
    color: colors.text.primary,
    fontSize: typography.sm,
    fontWeight: '800',
  },
  filterLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 },
  filterLabel: { color: colors.text.faint, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 1 },
  toggleBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  toggleText: { color: colors.emerald.default, fontSize: 11, fontWeight: '700' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', paddingVertical: 2 },
  chipWrapCollapsed: { maxHeight: 36, overflow: 'hidden' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bg.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
    maxWidth: 220,
  },
  chipActive: {
    backgroundColor: colors.emerald.default,
    borderColor: colors.emerald.default,
  },
  chipText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.emerald.default,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modalAddBtnText: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  newCustomerBox: {
    backgroundColor: colors.bg.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    color: colors.text.primary,
    fontSize: typography.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  saveCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.indigo.default,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  saveCustomerBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInputInline: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.sm,
  },
  modalDone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.emerald.default,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  modalDoneText: { color: '#fff', fontSize: typography.sm, fontWeight: '800' },
});
