// AssetFormScreen — POZ-DEV-086
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAppContext } from '../context/AppContext';
import { createAsset, getAsset, updateAsset, ASSET_TYPES } from '../services/assets';
import { Asset, AssetType, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AssetForm'>;
type RP = RouteProp<RootStackParamList, 'AssetForm'>;

export default function AssetFormScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RP>();
  const { customers } = useAppContext();
  const assetId = route.params?.assetId;
  const initialCustomerId = route.params?.customerId;

  const [editing, setEditing] = useState<Asset | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<AssetType>('meter');
  const [customerId, setCustomerId] = useState<string | undefined>(initialCustomerId);
  const [serialNo, setSerialNo] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [power, setPower] = useState('');
  const [installDate, setInstallDate] = useState('');
  const [warrantyEnd, setWarrantyEnd] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    if (!assetId) return;
    const a = await getAsset(assetId);
    if (!a) return;
    setEditing(a);
    setName(a.name);
    setCode(a.code || '');
    setType(a.type);
    setCustomerId(a.customerId);
    setSerialNo(a.serialNo || '');
    setManufacturer(a.manufacturer || '');
    setModel(a.model || '');
    setPower(a.power || '');
    setInstallDate(a.installDate || '');
    setWarrantyEnd(a.warrantyEnd || '');
    setLocation(a.location || '');
    setNotes(a.notes || '');
  }, [assetId]);
  useEffect(() => { load(); }, [load]);

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert('Eksik', 'Cihaz adı zorunlu.');
      return;
    }
    const customer = customers.find(c => c.id === customerId);
    const payload = {
      name: name.trim(),
      code: code.trim() || undefined,
      type,
      customerId,
      customerName: customer ? (customer.title || customer.shortName) : undefined,
      serialNo: serialNo.trim() || undefined,
      manufacturer: manufacturer.trim() || undefined,
      model: model.trim() || undefined,
      power: power.trim() || undefined,
      installDate: installDate.trim() || undefined,
      warrantyEnd: warrantyEnd.trim() || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    if (editing) {
      await updateAsset(editing.id, payload);
    } else {
      await createAsset(payload);
    }
    nav.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Cihaz Adı *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="ör. Trafo TR-1" placeholderTextColor={colors.text.faint} />

        <Text style={styles.label}>QR / Kod</Text>
        <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="ASSET-001" placeholderTextColor={colors.text.faint} />

        <Text style={styles.label}>Tip</Text>
        <View style={styles.grid}>
          {ASSET_TYPES.map(t => {
            const active = t.value === type;
            return (
              <TouchableOpacity
                key={t.value}
                style={[styles.typeBtn, active && styles.typeBtnActive]}
                onPress={() => setType(t.value)}
              >
                <Ionicons name={t.icon as any} size={14} color={active ? '#fff' : colors.text.muted} />
                <Text style={[styles.typeText, active && styles.typeTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Müşteri</Text>
        <View style={styles.grid}>
          <TouchableOpacity style={[styles.typeBtn, !customerId && styles.typeBtnActive]} onPress={() => setCustomerId(undefined)}>
            <Text style={[styles.typeText, !customerId && styles.typeTextActive]}>—</Text>
          </TouchableOpacity>
          {customers.map(c => {
            const active = c.id === customerId;
            return (
              <TouchableOpacity key={c.id} style={[styles.typeBtn, active && styles.typeBtnActive]} onPress={() => setCustomerId(c.id)}>
                <Text style={[styles.typeText, active && styles.typeTextActive]}>{c.shortName}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Field label="Seri No" value={serialNo} onChange={setSerialNo} />
        <Field label="Üretici" value={manufacturer} onChange={setManufacturer} />
        <Field label="Model" value={model} onChange={setModel} />
        <Field label="Güç" value={power} onChange={setPower} placeholder="ör. 1600 kVA" />
        <Field label="Kurulum Tarihi" value={installDate} onChange={setInstallDate} placeholder="YYYY-MM-DD" />
        <Field label="Garanti Bitiş" value={warrantyEnd} onChange={setWarrantyEnd} placeholder="YYYY-MM-DD" />
        <Field label="Konum / Yer" value={location} onChange={setLocation} />
        <Field label="Notlar" value={notes} onChange={setNotes} multiline />

        <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
          <Ionicons name="save-outline" size={16} color="#fff" />
          <Text style={styles.saveText}>{editing ? 'Güncelle' : 'Kaydet'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, placeholder, multiline }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline ? { minHeight: 60, textAlignVertical: 'top' } : null]}
        value={value} onChangeText={onChange} placeholder={placeholder || label}
        placeholderTextColor={colors.text.faint} multiline={multiline}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  label: { color: colors.text.muted, fontSize: typography.xs, marginTop: spacing.sm, marginBottom: 4 },
  input: {
    backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary,
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10,
    color: colors.text.primary, fontSize: typography.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary,
  },
  typeBtnActive: { backgroundColor: brand.blueLight, borderColor: brand.blueLight },
  typeText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  typeTextActive: { color: '#fff' },
  saveBtn: {
    flexDirection: 'row', backgroundColor: brand.green, paddingVertical: 12,
    borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: spacing.lg,
  },
  saveText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
});
