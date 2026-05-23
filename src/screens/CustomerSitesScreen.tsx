// ====================================================================
// CustomerSitesScreen — POZ-DEV-044
// Müşteriye bağlı saha/lokasyon listesi + CRUD.
// ====================================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, brand, spacing, radius, typography } from '../theme';
import { RootStackParamList, CustomerSite } from '../types';
import {
  listSitesByCustomer,
  upsertSite,
  deleteSite,
} from '../services/customerSites';
import { useAppContext } from '../context/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerSites'>;

export default function CustomerSitesScreen({ route }: Props) {
  const { customerId } = route.params;
  const { customers, showToast } = useAppContext();
  const customer = customers.find(c => c.id === customerId);
  const [sites, setSites] = useState<CustomerSite[]>([]);
  const [editing, setEditing] = useState<CustomerSite | null>(null);

  const reload = async () => setSites(await listSitesByCustomer(customerId));
  useEffect(() => {
    reload();
  }, [customerId]);

  const startNew = () =>
    setEditing({
      id: `site-${Date.now()}`,
      customerId,
      name: '',
      address: '',
      city: '',
      contactPerson: '',
      contactPhone: '',
      notes: '',
      createdAt: new Date().toISOString(),
    });

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      Alert.alert('Eksik', 'Saha adı boş olamaz.');
      return;
    }
    await upsertSite(editing);
    setEditing(null);
    reload();
    showToast('Saha kaydedildi.');
  };

  const remove = (id: string) =>
    Alert.alert('Sil?', 'Bu saha silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteSite(id);
          reload();
        },
      },
    ]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{customer?.shortName ?? 'Müşteri'}</Text>
          <Text style={styles.sub}>Sahalar / Lokasyonlar ({sites.length})</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={startNew}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Yeni</Text>
        </TouchableOpacity>
      </View>

      {editing && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Saha Bilgisi</Text>
          <TextInput
            style={styles.input}
            placeholder="Saha adı *"
            placeholderTextColor={colors.text.faint}
            value={editing.name}
            onChangeText={v => setEditing({ ...editing, name: v })}
          />
          <TextInput
            style={styles.input}
            placeholder="Adres"
            placeholderTextColor={colors.text.faint}
            value={editing.address}
            onChangeText={v => setEditing({ ...editing, address: v })}
            multiline
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Şehir"
              placeholderTextColor={colors.text.faint}
              value={editing.city}
              onChangeText={v => setEditing({ ...editing, city: v })}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="İlgili kişi"
              placeholderTextColor={colors.text.faint}
              value={editing.contactPerson}
              onChangeText={v => setEditing({ ...editing, contactPerson: v })}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Telefon"
            placeholderTextColor={colors.text.faint}
            value={editing.contactPhone}
            onChangeText={v => setEditing({ ...editing, contactPhone: v })}
            keyboardType="phone-pad"
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Enlem (lat)"
              placeholderTextColor={colors.text.faint}
              value={editing.lat?.toString() ?? ''}
              onChangeText={v =>
                setEditing({ ...editing, lat: v ? parseFloat(v) : undefined })
              }
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Boylam (lng)"
              placeholderTextColor={colors.text.faint}
              value={editing.lng?.toString() ?? ''}
              onChangeText={v =>
                setEditing({ ...editing, lng: v ? parseFloat(v) : undefined })
              }
              keyboardType="decimal-pad"
            />
          </View>
          <TextInput
            style={[styles.input, { minHeight: 60 }]}
            placeholder="Notlar"
            placeholderTextColor={colors.text.faint}
            value={editing.notes}
            onChangeText={v => setEditing({ ...editing, notes: v })}
            multiline
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.saveBtn} onPress={save}>
              <Text style={styles.saveBtnText}>Kaydet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)}>
              <Text style={styles.cancelBtnText}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {sites.length === 0 && !editing && (
        <Text style={styles.empty}>Bu müşteriye ait saha tanımı yok.</Text>
      )}

      {sites.map(s => (
        <View key={s.id} style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.siteName}>{s.name}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity onPress={() => setEditing(s)}>
                <Ionicons name="create-outline" size={18} color={brand.green} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => remove(s.id)}>
                <Ionicons name="trash-outline" size={18} color="#dc2626" />
              </TouchableOpacity>
            </View>
          </View>
          {s.address ? <Text style={styles.meta}>{s.address}</Text> : null}
          {s.city ? <Text style={styles.meta}>{s.city}</Text> : null}
          {s.contactPerson ? (
            <Text style={styles.meta}>
              👤 {s.contactPerson} {s.contactPhone ? `· ${s.contactPhone}` : ''}
            </Text>
          ) : null}
          {s.lat && s.lng ? (
            <Text style={styles.meta}>
              📍 {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
            </Text>
          ) : null}
          {s.notes ? <Text style={styles.notes}>{s.notes}</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  title: { color: colors.text.primary, fontSize: 18, fontWeight: '800' },
  sub: { color: colors.text.muted, fontSize: 12, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: brand.green,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: {
    padding: 12,
    marginBottom: 10,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    gap: 6,
  },
  cardTitle: { color: brand.green, fontWeight: '800', fontSize: typography.sm },
  input: {
    backgroundColor: colors.bg.primary,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: typography.sm,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: brand.green,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border.primary,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  cancelBtnText: { color: colors.text.secondary, fontWeight: '700', fontSize: typography.sm },
  siteName: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  meta: { color: colors.text.muted, fontSize: typography.xs },
  notes: { color: colors.text.secondary, fontSize: typography.xs, fontStyle: 'italic', marginTop: 4 },
});
