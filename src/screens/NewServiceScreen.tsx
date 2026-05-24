import React, { useMemo, useState } from 'react';
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
import Toast from '../components/Toast';
import { SERVICE_CATALOG, MATERIAL_CATALOG } from '../data/initialData';
import { createApproval } from '../services/governance';
import { uploadPhoto } from '../services/photoUpload';
import { Customer, SelectedMaterial, ServiceCatalogItem, TabParamList, RootStackParamList } from '../types';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'NewService'>,
  NativeStackNavigationProp<RootStackParamList>
>;

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
  const [beforePhoto, setBeforePhoto] = useState<string | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<string | null>(null);
  const [formPhoto, setFormPhoto] = useState<string | null>(null);
  const [otherCost, setOtherCost] = useState('');
  const [notes, setNotes] = useState('');

  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ shortName: '', title: '', phone: '' });

  const filteredCustomers = useMemo(() => {
    const q = clientSearch.trim().toLocaleLowerCase('tr-TR');
    if (!q) return customers;
    return customers.filter(c =>
      (c.shortName || '').toLocaleLowerCase('tr-TR').includes(q) ||
      (c.title || '').toLocaleLowerCase('tr-TR').includes(q) ||
      (c.taxNumber || '').includes(q) ||
      (c.phone || '').includes(q),
    );
  }, [customers, clientSearch]);

  const filteredMaterials = useMemo(() => {
    const q = materialSearch.trim().toLocaleLowerCase('tr-TR');
    if (!q) return MATERIAL_CATALOG;
    return MATERIAL_CATALOG.filter(m =>
      (m.name || '').toLocaleLowerCase('tr-TR').includes(q),
    );
  }, [materialSearch]);

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
      id: `C-${Date.now()}`,
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

  const pickPhoto = async (type: 'before' | 'after' | 'form') => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf çekmek için kamera izni gereklidir.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      if (type === 'before') setBeforePhoto(result.assets[0].uri);
      else if (type === 'after') setAfterPhoto(result.assets[0].uri);
      else setFormPhoto(result.assets[0].uri);
    }
  };

  const pickFromGallery = async (type: 'before' | 'after' | 'form') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Galeri erişimi için izin gereklidir.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      if (type === 'before') setBeforePhoto(result.assets[0].uri);
      else if (type === 'after') setAfterPhoto(result.assets[0].uri);
      else setFormPhoto(result.assets[0].uri);
    }
  };

  const showPhotoOptions = (type: 'before' | 'after' | 'form') => {
    Alert.alert('Fotoğraf Ekle', 'Kaynak seçin', [
      { text: 'Kamera', onPress: () => pickPhoto(type) },
      { text: 'Galeri', onPress: () => pickFromGallery(type) },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  const addMaterial = (mat: (typeof MATERIAL_CATALOG)[0]) => {
    setSelectedMaterials(prev => {
      const existing = prev.find(m => m.id === mat.id);
      if (existing) {
        return prev.map(m => m.id === mat.id ? { ...m, qty: m.qty + 1 } : m);
      }
      return [...prev, { ...mat, qty: 1 }];
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
    // Fotoğraflar artık opsiyonel — saha hızlı kayıt için engel olmaz.

    const materialCost = selectedMaterials.reduce((s, m) => s + m.price * m.qty, 0);
    const laborCost = selectedService.estCost;
    const extraCost = parseFloat(otherCost) || 0;
    const calculatedQuote = selectedService.price + materialCost * 1.25;
    const totalCost = laborCost + materialCost + extraCost;
    const profit = calculatedQuote - totalCost;

    const workOrderId = `KOB-DRAFT-${Date.now().toString().slice(-4)}`;

    // Fotoğrafları Supabase Storage'a yükle (varsa). Hata olursa lokal URI fallback.
    let beforeUrl = beforePhoto || '';
    let afterUrl = afterPhoto || '';
    let formUrl = formPhoto || undefined;
    const uploadFolder = `work-orders/${workOrderId}`;
    try {
      if (beforePhoto) beforeUrl = await uploadPhoto(beforePhoto, uploadFolder);
    } catch (e: any) {
      Alert.alert('Foto yüklenemedi (öncesi)', e?.message ?? 'Bilinmeyen hata');
    }
    try {
      if (afterPhoto) afterUrl = await uploadPhoto(afterPhoto, uploadFolder);
    } catch (e: any) {
      Alert.alert('Foto yüklenemedi (sonrası)', e?.message ?? 'Bilinmeyen hata');
    }
    try {
      if (formPhoto) formUrl = await uploadPhoto(formPhoto, uploadFolder);
    } catch (e: any) {
      Alert.alert('Foto yüklenemedi (form)', e?.message ?? 'Bilinmeyen hata');
    }

    addWorkOrder({
      id: workOrderId,
      client: selectedClient,
      serviceName: selectedService.name,
      date: new Date().toISOString().split('T')[0],
      engineer: engineerName,
      materials: [...selectedMaterials],
      otherCost: extraCost,
      laborCost,
      materialCost,
      quoteAmount: Math.round(calculatedQuote),
      profit: Math.round(profit),
      status: 'Onay Bekliyor',
      beforePhoto: beforeUrl,
      afterPhoto: afterUrl,
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

    Alert.alert('Gönderildi', 'Servis raporu yönetici onay havuzuna düştü.');

    // Reset form
    setBeforePhoto(null);
    setAfterPhoto(null);
    setFormPhoto(null);
    setSelectedMaterials([]);
    setOtherCost('');
    setNotes('');
    navigation.navigate('Services');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {toast && <Toast toast={toast} />}
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

        {/* Step 2: Before Photo */}
        <Text style={styles.stepLabel}>2. İş Öncesi Fotoğraf (Before)</Text>
        {beforePhoto ? (
          <View style={styles.photoContainer}>
            <Image source={{ uri: beforePhoto }} style={styles.photo} resizeMode="cover" />
            <TouchableOpacity
              style={styles.removePhoto}
              onPress={() => setBeforePhoto(null)}
            >
              <Ionicons name="close-circle" size={24} color={colors.rose.default} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.photoUpload}
            onPress={() => showPhotoOptions('before')}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-outline" size={32} color={colors.text.faint} />
            <Text style={styles.photoUploadText}>Öncesi Fotoğrafı Çek / Yükle</Text>
          </TouchableOpacity>
        )}

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
        <TouchableOpacity
          style={styles.addMaterialBtn}
          onPress={() => { setMaterialSearch(''); setShowMaterialPicker(true); }}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.emerald.default} />
          <Text style={styles.addMaterialBtnText}>
            Malzeme Ekle{MATERIAL_CATALOG.length > 0 ? ` (${MATERIAL_CATALOG.length} katalog kaydı)` : ''}
          </Text>
          <Ionicons name="search-outline" size={16} color={colors.text.muted} />
        </TouchableOpacity>

        {selectedMaterials.length > 0 ? (
          <View style={styles.selectedMaterials}>
            {selectedMaterials.map(m => (
              <View key={m.id} style={styles.matRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.matName} numberOfLines={2}>{m.name}</Text>
                  <Text style={styles.matPrice}>₺{(m.price * m.qty).toLocaleString('tr-TR')}</Text>
                </View>
                <View style={styles.qtyBox}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => updateMaterialQty(m.id, -1)}>
                    <Ionicons name="remove" size={16} color={colors.text.primary} />
                  </TouchableOpacity>
                  <Text style={styles.qtyVal}>{m.qty}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => updateMaterialQty(m.id, 1)}>
                    <Ionicons name="add" size={16} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => removeMaterial(m.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={colors.rose.default} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.materialHint}>Henüz malzeme eklemediniz. Yukarıdaki butona dokunup arayarak hızlıca seçin.</Text>
        )}

        {/* Step 5: After Photo */}
        <Text style={styles.stepLabel}>5. İş Sonrası Fotoğraf (After)</Text>
        {afterPhoto ? (
          <View style={styles.photoContainer}>
            <Image source={{ uri: afterPhoto }} style={styles.photo} resizeMode="cover" />
            <TouchableOpacity
              style={styles.removePhoto}
              onPress={() => setAfterPhoto(null)}
            >
              <Ionicons name="close-circle" size={24} color={colors.rose.default} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.photoUpload}
            onPress={() => showPhotoOptions('after')}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-outline" size={32} color={colors.text.faint} />
            <Text style={styles.photoUploadText}>Sonrası Fotoğrafı Çek / Yükle</Text>
          </TouchableOpacity>
        )}

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
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Hizmet Bedeli</Text>
              <Text style={styles.summaryVal}>
                ₺{selectedService.price.toLocaleString('tr-TR')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Malzeme (+%25 marj)</Text>
              <Text style={styles.summaryVal}>
                ₺{Math.round(
                  selectedMaterials.reduce((s, m) => s + m.price * m.qty, 0) * 1.25
                ).toLocaleString('tr-TR')}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Hesaplanan Teklif</Text>
              <Text style={styles.summaryTotalVal}>
                ₺{Math.round(
                  selectedService.price +
                  selectedMaterials.reduce((s, m) => s + m.price * m.qty, 0) * 1.25
                ).toLocaleString('tr-TR')}
              </Text>
            </View>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          <Ionicons name="send" size={16} color={colors.bg.primary} />
          <Text style={styles.submitBtnText}>İŞİ ONAYA GÖNDER</Text>
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
              data={filteredCustomers}
              keyExtractor={c => c.id}
              keyboardShouldPersistTaps="handled"
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
            {SERVICE_CATALOG.map(s => (
              <TouchableOpacity
                key={s.id}
                style={styles.modalItem}
                onPress={() => { setSelectedService(s); setShowServicePicker(false); }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalItemText} numberOfLines={2}>{s.name}</Text>
                  <Text style={styles.modalItemSub}>
                    ₺{s.price.toLocaleString('tr-TR')}
                  </Text>
                </View>
                {selectedService.id === s.id && (
                  <Ionicons name="checkmark" size={16} color={colors.emerald.default} />
                )}
              </TouchableOpacity>
            ))}
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
          <View style={[styles.modalBox, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Malzeme Seçin</Text>

            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={16} color={colors.text.muted} />
              <TextInput
                style={styles.searchInputInline}
                placeholder="Malzeme adında ara"
                placeholderTextColor={colors.text.faint}
                value={materialSearch}
                onChangeText={setMaterialSearch}
                autoCapitalize="none"
              />
              {materialSearch.length > 0 && (
                <TouchableOpacity onPress={() => setMaterialSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.text.muted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredMaterials}
              keyExtractor={m => m.id}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 380 }}
              ListEmptyComponent={
                <Text style={[styles.modalItemSub, { textAlign: 'center', marginVertical: spacing.lg }]}>
                  Arama sonucu boş.
                </Text>
              }
              renderItem={({ item: m }) => {
                const inList = selectedMaterials.find(x => x.id === m.id);
                return (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => addMaterial(m)}
                    activeOpacity={0.75}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalItemText} numberOfLines={2}>{m.name}</Text>
                      <Text style={styles.modalItemSub}>₺{m.price.toLocaleString('tr-TR')}</Text>
                    </View>
                    {inList ? (
                      <View style={styles.qtyBadge}>
                        <Text style={styles.qtyBadgeText}>x{inList.qty}</Text>
                      </View>
                    ) : (
                      <Ionicons name="add-circle" size={20} color={colors.emerald.default} />
                    )}
                  </TouchableOpacity>
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
  },
  matName: { flex: 1, fontSize: typography.xs, color: colors.text.secondary, fontWeight: '600' },
  matPrice: { fontSize: typography.xs, color: colors.emerald.default, fontWeight: '700' },
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
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: typography.sm, color: colors.text.muted },
  summaryVal: { fontSize: typography.sm, color: colors.text.secondary, fontWeight: '600' },
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
  modalItemText: { flex: 1, fontSize: typography.sm, color: colors.text.primary, fontWeight: '600' },
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
    minWidth: 24,
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
