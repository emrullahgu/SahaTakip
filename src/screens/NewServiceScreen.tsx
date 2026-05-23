import React, { useState } from 'react';
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
import Toast from '../components/Toast';
import { SERVICE_CATALOG, MATERIAL_CATALOG, CLIENTS } from '../data/initialData';
import { SelectedMaterial, ServiceCatalogItem, TabParamList, RootStackParamList } from '../types';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'NewService'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function NewServiceScreen() {
  const navigation = useNavigation<NavProp>();
  const { addWorkOrder, toast } = useAppContext();

  const [selectedClient, setSelectedClient] = useState(CLIENTS[0]);
  const [selectedService, setSelectedService] = useState<ServiceCatalogItem>(SERVICE_CATALOG[0]);
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([]);
  const [beforePhoto, setBeforePhoto] = useState<string | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<string | null>(null);
  const [otherCost, setOtherCost] = useState('');
  const [notes, setNotes] = useState('');

  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showServicePicker, setShowServicePicker] = useState(false);

  const pickPhoto = async (type: 'before' | 'after') => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf çekmek için kamera izni gereklidir.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      if (type === 'before') setBeforePhoto(result.assets[0].uri);
      else setAfterPhoto(result.assets[0].uri);
    }
  };

  const pickFromGallery = async (type: 'before' | 'after') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Galeri erişimi için izin gereklidir.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      if (type === 'before') setBeforePhoto(result.assets[0].uri);
      else setAfterPhoto(result.assets[0].uri);
    }
  };

  const showPhotoOptions = (type: 'before' | 'after') => {
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

  const handleSubmit = () => {
    if (!beforePhoto || !afterPhoto) {
      Alert.alert('Eksik Fotoğraf', 'Rapor için hem Öncesi hem Sonrası fotoğrafı zorunludur.');
      return;
    }

    const materialCost = selectedMaterials.reduce((s, m) => s + m.price * m.qty, 0);
    const laborCost = selectedService.estCost;
    const extraCost = parseFloat(otherCost) || 0;
    const calculatedQuote = selectedService.price + materialCost * 1.25;
    const totalCost = laborCost + materialCost + extraCost;
    const profit = calculatedQuote - totalCost;

    addWorkOrder({
      id: `KOB-DRAFT-${Date.now().toString().slice(-4)}`,
      client: selectedClient,
      serviceName: selectedService.name,
      date: new Date().toISOString().split('T')[0],
      engineer: 'Test MÜHENDİS',
      materials: [...selectedMaterials],
      otherCost: extraCost,
      laborCost,
      materialCost,
      quoteAmount: Math.round(calculatedQuote),
      profit: Math.round(profit),
      status: 'Onay Bekliyor',
      beforePhoto,
      afterPhoto,
      notes: notes || 'Saha bakımı tamamlandı, gerilim testleri yapıldı.',
    });

    // Reset form
    setBeforePhoto(null);
    setAfterPhoto(null);
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
          <Text style={styles.pickerValue}>{selectedClient}</Text>
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
        <View style={styles.materialGrid}>
          {MATERIAL_CATALOG.map(m => (
            <TouchableOpacity
              key={m.id}
              style={styles.materialBtn}
              onPress={() => addMaterial(m)}
              activeOpacity={0.7}
            >
              <Text style={styles.materialBtnName} numberOfLines={2}>
                + {m.name}
              </Text>
              <Text style={styles.materialBtnPrice}>{m.price}₺</Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedMaterials.length > 0 && (
          <View style={styles.selectedMaterials}>
            {selectedMaterials.map(m => (
              <View key={m.id} style={styles.matRow}>
                <Text style={styles.matName} numberOfLines={1}>
                  {m.name} (x{m.qty})
                </Text>
                <Text style={styles.matPrice}>₺{(m.price * m.qty).toLocaleString('tr-TR')}</Text>
                <TouchableOpacity onPress={() => removeMaterial(m.id)}>
                  <Ionicons name="close-circle-outline" size={18} color={colors.rose.default} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
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

        {/* Step 6: Extra Cost & Notes */}
        <Text style={styles.stepLabel}>6. Yol / Yemek Masrafı (₺)</Text>
        <TextInput
          style={styles.input}
          placeholder="Örn: 500"
          placeholderTextColor={colors.text.faint}
          keyboardType="numeric"
          value={otherCost}
          onChangeText={setOtherCost}
        />

        <Text style={styles.stepLabel}>7. Rapor Notu</Text>
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
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Müşteri Seçin</Text>
            {CLIENTS.map(c => (
              <TouchableOpacity
                key={c}
                style={styles.modalItem}
                onPress={() => { setSelectedClient(c); setShowClientPicker(false); }}
              >
                <Text style={styles.modalItemText}>{c}</Text>
                {selectedClient === c && (
                  <Ionicons name="checkmark" size={16} color={colors.emerald.default} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowClientPicker(false)}
            >
              <Text style={styles.modalCancelText}>İptal</Text>
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
});
