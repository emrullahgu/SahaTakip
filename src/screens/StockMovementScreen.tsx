// StockMovementScreen — POZ-DEV-055, 059
// Stok hareketi: giriş / çıkış / transfer / sayım / iş emri.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { listMaterials } from '../services/materials';
import { listWarehouses } from '../services/warehouses';
import { addMovement, getBalance } from '../services/stock';
import {
  Material,
  Warehouse,
  StockMovementKind,
  RootStackParamList,
} from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'StockMovement'>;
type Rt = RouteProp<RootStackParamList, 'StockMovement'>;

const KIND_LABEL: Record<StockMovementKind, string> = {
  giris: 'Giriş',
  cikis: 'Çıkış',
  transfer: 'Transfer',
  'is-emri': 'İş Emri Kullanımı',
  sayim: 'Sayım',
};

export default function StockMovementScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const presetKind = route.params?.kind ?? 'giris';
  const presetMaterialId = route.params?.materialId;
  const presetWorkOrderId = route.params?.workOrderId;

  const [kind, setKind] = useState<StockMovementKind>(presetKind);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [materialId, setMaterialId] = useState<string | undefined>(presetMaterialId);
  const [fromId, setFromId] = useState<string | undefined>();
  const [toId, setToId] = useState<string | undefined>();
  const [qty, setQty] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [note, setNote] = useState('');
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);

  const [matPickerOpen, setMatPickerOpen] = useState(false);
  const [fromPickerOpen, setFromPickerOpen] = useState(false);
  const [toPickerOpen, setToPickerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setMaterials(await listMaterials());
      setWarehouses(await listWarehouses());
    })();
  }, []);

  const material = useMemo(
    () => materials.find(m => m.id === materialId),
    [materials, materialId],
  );
  const fromW = warehouses.find(w => w.id === fromId);
  const toW = warehouses.find(w => w.id === toId);

  // Bakiye göstergesi
  useEffect(() => {
    (async () => {
      if (materialId && fromId) {
        setCurrentBalance(await getBalance(materialId, fromId));
      } else {
        setCurrentBalance(null);
      }
    })();
  }, [materialId, fromId]);

  const needFrom = kind === 'cikis' || kind === 'transfer' || kind === 'is-emri' || kind === 'sayim';
  const needTo = kind === 'giris' || kind === 'transfer';

  const save = async () => {
    if (!material) {
      Alert.alert('Eksik', 'Malzeme seçin.');
      return;
    }
    const q = Number(qty.replace(',', '.'));
    if (!q || q <= 0) {
      Alert.alert('Eksik', 'Geçerli miktar girin.');
      return;
    }
    if (needFrom && !fromId) {
      Alert.alert('Eksik', 'Çıkış yapılacak depo/zimmet seçin.');
      return;
    }
    if (needTo && !toId) {
      Alert.alert('Eksik', 'Hedef depo/zimmet seçin.');
      return;
    }
    if (kind === 'transfer' && fromId === toId) {
      Alert.alert('Hata', 'Kaynak ve hedef aynı olamaz.');
      return;
    }

    await addMovement({
      kind,
      materialId: material.id,
      materialName: material.name,
      materialUnit: material.unit,
      fromWarehouseId: needFrom ? fromId : undefined,
      toWarehouseId: needTo ? toId : undefined,
      qty: q,
      unitPrice: unitPrice ? Number(unitPrice.replace(',', '.')) : undefined,
      workOrderId: presetWorkOrderId,
      note: note.trim() || undefined,
    });

    Alert.alert('Tamam', 'Stok hareketi kaydedildi.');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>Hareket Türü</Text>
          <View style={styles.chipRow}>
            {(['giris', 'cikis', 'transfer', 'is-emri', 'sayim'] as StockMovementKind[]).map(k => (
              <TouchableOpacity
                key={k}
                style={[styles.chip, kind === k && styles.chipActive]}
                onPress={() => setKind(k)}
              >
                <Text style={[styles.chipText, kind === k && styles.chipTextActive]}>
                  {KIND_LABEL[k]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Malzeme *</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setMatPickerOpen(true)}
          >
            <Text style={styles.selectorText}>
              {material ? `${material.name} (${material.code})` : 'Malzeme seç…'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.text.muted} />
          </TouchableOpacity>

          {needFrom && (
            <>
              <Text style={styles.label}>
                {kind === 'sayim' ? 'Sayım Yapılan Depo *' : 'Kaynak Depo/Zimmet *'}
              </Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setFromPickerOpen(true)}
              >
                <Text style={styles.selectorText}>
                  {fromW ? fromW.name : 'Seç…'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.text.muted} />
              </TouchableOpacity>
              {currentBalance !== null && (
                <Text style={styles.balanceHint}>
                  Mevcut bakiye: {currentBalance} {material?.unit ?? ''}
                </Text>
              )}
            </>
          )}

          {needTo && (
            <>
              <Text style={styles.label}>Hedef Depo/Zimmet *</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setToPickerOpen(true)}
              >
                <Text style={styles.selectorText}>{toW ? toW.name : 'Seç…'}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.text.muted} />
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.label}>
            {kind === 'sayim' ? 'Yeni Bakiye *' : 'Miktar *'}
          </Text>
          <TextInput
            value={qty}
            onChangeText={setQty}
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.text.faint}
            keyboardType="decimal-pad"
          />

          {(kind === 'giris' || kind === 'cikis') && (
            <>
              <Text style={styles.label}>Birim Fiyat</Text>
              <TextInput
                value={unitPrice}
                onChangeText={setUnitPrice}
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.text.faint}
                keyboardType="decimal-pad"
              />
            </>
          )}

          <Text style={styles.label}>Not</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
            placeholder="Açıklama"
            placeholderTextColor={colors.text.faint}
            multiline
          />

          <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.85}>
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.saveText}>Kaydet</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Material picker */}
      <PickerModal
        visible={matPickerOpen}
        onClose={() => setMatPickerOpen(false)}
        title="Malzeme seç"
        items={materials.map(m => ({
          id: m.id,
          label: m.name,
          subLabel: `${m.code} · ${m.unit}`,
        }))}
        onPick={id => {
          setMaterialId(id);
          setMatPickerOpen(false);
        }}
      />

      {/* From picker */}
      <PickerModal
        visible={fromPickerOpen}
        onClose={() => setFromPickerOpen(false)}
        title="Kaynak"
        items={warehouses.map(w => ({
          id: w.id,
          label: w.name,
          subLabel:
            w.kind === 'depo' ? 'Depo' : w.kind === 'arac' ? 'Araç' : 'Personel',
        }))}
        onPick={id => {
          setFromId(id);
          setFromPickerOpen(false);
        }}
      />

      {/* To picker */}
      <PickerModal
        visible={toPickerOpen}
        onClose={() => setToPickerOpen(false)}
        title="Hedef"
        items={warehouses.map(w => ({
          id: w.id,
          label: w.name,
          subLabel:
            w.kind === 'depo' ? 'Depo' : w.kind === 'arac' ? 'Araç' : 'Personel',
        }))}
        onPick={id => {
          setToId(id);
          setToPickerOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

interface PickerItem {
  id: string;
  label: string;
  subLabel?: string;
}

function PickerModal({
  visible,
  onClose,
  title,
  items,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: PickerItem[];
  onPick: (id: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBg} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.text.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 400 }}>
            {items.length === 0 ? (
              <Text style={{ color: colors.text.muted, padding: spacing.md }}>
                Kayıt yok.
              </Text>
            ) : (
              items.map(it => (
                <TouchableOpacity
                  key={it.id}
                  style={styles.modalRow}
                  onPress={() => onPick(it.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalRowLabel}>{it.label}</Text>
                    {it.subLabel ? (
                      <Text style={styles.modalRowSub}>{it.subLabel}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 100 },
  label: {
    color: colors.text.muted,
    fontSize: typography.xs,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.bg.secondary,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: typography.sm,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectorText: { color: colors.text.primary, fontSize: typography.sm },
  balanceHint: {
    color: colors.text.muted,
    fontSize: typography.xs,
    marginTop: 4,
    marginLeft: 4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.bg.secondary,
  },
  chipActive: { backgroundColor: brand.green, borderColor: brand.green },
  chipText: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: brand.green,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.lg,
  },
  saveText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.bg.primary,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  modalRowLabel: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  modalRowSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
});
