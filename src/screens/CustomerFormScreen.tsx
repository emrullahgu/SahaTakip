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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAppContext } from '../context/AppContext';
import type { Customer, RootStackParamList } from '../types';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'CustomerForm'>;
type RouteProps = RouteProp<RootStackParamList, 'CustomerForm'>;

export default function CustomerFormScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { customers, addCustomer, updateCustomer } = useAppContext();

  const editingId = route.params?.customerId;
  const existing = editingId ? customers.find(c => c.id === editingId) : null;
  const isEdit = !!existing;

  const [form, setForm] = useState<Customer>(
    existing ?? {
      id: `C-${Date.now()}`,
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

  const handleSave = () => {
    if (!form.shortName.trim() || !form.title.trim()) {
      Alert.alert('Eksik bilgi', 'Kısa ad ve resmi ünvan zorunludur.');
      return;
    }
    if (isEdit) {
      updateCustomer(form);
    } else {
      addCustomer(form);
    }
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

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Ionicons name={isEdit ? 'save-outline' : 'add-circle-outline'} size={18} color="#fff" />
            <Text style={styles.saveBtnText}>{isEdit ? 'Güncelle' : 'Müşteri Ekle'}</Text>
          </TouchableOpacity>

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
});
