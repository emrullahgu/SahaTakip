// ExternalApiKeysScreen — 3. parti servis anahtarlarını yönetir (cihazda saklanır).
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { colors, spacing, radius, typography } from '../theme';
import {
  ExternalApiKeys,
  getExternalApiKeys,
  setExternalApiKeys,
} from '../services/externalApiKeys';

interface FieldDef {
  key: keyof ExternalApiKeys;
  label: string;
  placeholder?: string;
  secret?: boolean;
  multiline?: boolean;
}

interface SectionDef {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  help: string;
  fields: FieldDef[];
}

const SECTIONS: SectionDef[] = [
  {
    title: 'Google Maps',
    icon: 'map-outline',
    color: '#0ea5e9',
    help: 'console.cloud.google.com → Maps JavaScript API anahtarı.',
    fields: [{ key: 'googleMapsKey', label: 'API Key', placeholder: 'AIza...', secret: true }],
  },
  {
    title: 'Resend (E-posta)',
    icon: 'mail-outline',
    color: '#16a34a',
    help: 'resend.com adresinden API key alın.',
    fields: [
      { key: 'resendApiKey', label: 'API Key', placeholder: 're_...', secret: true },
      { key: 'resendFromEmail', label: 'Gönderen E-posta', placeholder: 'no-reply@firma.com' },
    ],
  },
  {
    title: 'Netgsm (SMS)',
    icon: 'chatbubble-ellipses-outline',
    color: '#f59e0b',
    help: 'netgsm.com.tr API erişim bilgileri.',
    fields: [
      { key: 'netgsmUsername', label: 'Kullanıcı Adı', placeholder: '8501234567' },
      { key: 'netgsmPassword', label: 'Şifre', placeholder: '••••', secret: true },
      { key: 'netgsmHeader', label: 'Başlık', placeholder: 'FIRMA' },
    ],
  },
  {
    title: 'WhatsApp Business (Meta)',
    icon: 'logo-whatsapp',
    color: '#25d366',
    help: 'developers.facebook.com → WhatsApp → Access Token + Phone Number ID.',
    fields: [
      { key: 'whatsappToken', label: 'Access Token', placeholder: 'EAAG...', secret: true },
      { key: 'whatsappPhoneId', label: 'Phone Number ID', placeholder: '1234567890' },
    ],
  },
  {
    title: 'E-Fatura',
    icon: 'document-text-outline',
    color: '#8b5cf6',
    help: 'Entegrasyon sağlayıcısı API anahtarı.',
    fields: [{ key: 'einvoiceApiKey', label: 'API Key', placeholder: '...', secret: true }],
  },
  {
    title: 'ERP',
    icon: 'cube-outline',
    color: '#dc2626',
    help: 'Logo / Netsis / Mikro REST API.',
    fields: [
      { key: 'erpBaseUrl', label: 'Base URL', placeholder: 'https://erp.firma.com/api' },
      { key: 'erpApiKey', label: 'API Key', placeholder: '...', secret: true },
    ],
  },
  {
    title: 'AWS S3 / Yedek',
    icon: 'cloud-outline',
    color: '#475569',
    help: 'Yedekleme ve dosya saklama için S3 uyumlu hesap.',
    fields: [
      { key: 's3AccessKey', label: 'Access Key', placeholder: 'AKIA...' },
      { key: 's3Secret', label: 'Secret', placeholder: '...', secret: true },
      { key: 's3Bucket', label: 'Bucket', placeholder: 'sahatakip-backups' },
      { key: 's3Region', label: 'Region', placeholder: 'eu-central-1' },
    ],
  },
];

export default function ExternalApiKeysScreen() {
  const nav = useNavigation();
  const [data, setData] = useState<ExternalApiKeys>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const d = await getExternalApiKeys();
      setData(d);
      setLoading(false);
    })();
  }, []);

  const update = (key: keyof ExternalApiKeys, v: string) => {
    setData(prev => ({ ...prev, [key]: v }));
  };

  const toggleVisible = (k: string) => {
    setVisible(prev => ({ ...prev, [k]: !prev[k] }));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await setExternalApiKeys(data);
      Alert.alert('Kaydedildi', 'API anahtarları cihazda güvenle saklandı.');
      nav.goBack();
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Kaydetme başarısız.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.muted}>Yükleniyor…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.warn}>
          <Ionicons name="lock-closed-outline" size={16} color="#f59e0b" />
          <Text style={styles.warnText}>
            Anahtarlar yalnızca bu cihazda (AsyncStorage / localStorage) saklanır. Sunucu tarafı
            işlemler için Supabase secrets kullanın.
          </Text>
        </View>

        {SECTIONS.map(section => (
          <View key={section.title} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: section.color + '22', borderColor: section.color + '55' }]}>
                <Ionicons name={section.icon} size={18} color={section.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{section.title}</Text>
                <Text style={styles.cardHelp}>{section.help}</Text>
              </View>
            </View>

            {section.fields.map(field => {
              const value = (data[field.key] as string | undefined) || '';
              const isVisible = !field.secret || visible[field.key];
              return (
                <View key={field.key} style={styles.field}>
                  <Text style={styles.label}>{field.label}</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={value}
                      onChangeText={t => update(field.key, t)}
                      placeholder={field.placeholder}
                      placeholderTextColor={colors.text.faint}
                      secureTextEntry={field.secret && !isVisible}
                      autoCapitalize="none"
                      autoCorrect={false}
                      multiline={field.multiline}
                    />
                    {field.secret && (
                      <TouchableOpacity style={styles.eyeBtn} onPress={() => toggleVisible(field.key)}>
                        <Ionicons
                          name={isVisible ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color={colors.text.muted}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={onSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={styles.saveText}>{saving ? 'Kaydediliyor…' : 'Tümünü Kaydet'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.text.muted, fontSize: typography.sm },
  content: { padding: spacing.lg, paddingBottom: 80 },
  warn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: colors.amber.bg,
    borderColor: colors.amber.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  warnText: { flex: 1, color: colors.amber.default, fontSize: typography.xs, lineHeight: 18 },
  card: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  cardHelp: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  field: { marginBottom: spacing.sm },
  label: { color: colors.text.secondary, fontSize: typography.xs, fontWeight: '700', marginBottom: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    backgroundColor: colors.bg.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text.primary,
    fontSize: typography.sm,
  },
  eyeBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.bg.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.emerald.default,
    paddingVertical: 14,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  saveText: { color: '#fff', fontWeight: '800', fontSize: typography.md },
});
