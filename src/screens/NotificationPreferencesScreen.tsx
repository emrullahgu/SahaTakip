// NotificationPreferencesScreen — POZ-DEV-077
// Kanal aç/kapat + olay × kanal matrisi + iletişim bilgileri.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  ALL_CHANNELS,
  ALL_EVENTS,
  loadPrefs,
  savePrefs,
  setChannelEnabled,
  toggleEventChannel,
  setContactField,
} from '../services/notificationPrefs';
import { registerForPushNotifications } from '../services/pushNotifications';
import { emitEvent } from '../services/notifications';
import {
  NotificationChannel,
  NotificationPreferences,
} from '../types';

const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  push: 'Push',
  email: 'E-posta',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
};

const CHANNEL_ICON: Record<NotificationChannel, keyof typeof import('@expo/vector-icons').Ionicons.glyphMap> = {
  push: 'notifications-outline',
  email: 'mail-outline',
  sms: 'chatbox-outline',
  whatsapp: 'logo-whatsapp',
};

export default function NotificationPreferencesScreen() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [busyToken, setBusyToken] = useState(false);

  useEffect(() => {
    loadPrefs().then(setPrefs);
  }, []);

  const refresh = useCallback(async () => {
    setPrefs(await loadPrefs());
  }, []);

  if (!prefs) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loading}>Yükleniyor…</Text>
      </SafeAreaView>
    );
  }

  const onToggleChannel = async (ch: NotificationChannel, value: boolean) => {
    const next = await setChannelEnabled(ch, value);
    setPrefs(next);
  };

  const onToggleEventChannel = async (
    event: typeof ALL_EVENTS[number]['type'],
    ch: NotificationChannel,
  ) => {
    const next = await toggleEventChannel(event, ch);
    setPrefs(next);
  };

  const onChangeContact = async (
    field: 'email' | 'phone' | 'whatsapp',
    value: string,
  ) => {
    setPrefs({ ...prefs, [field]: value });
  };

  const onSaveContact = async (field: 'email' | 'phone' | 'whatsapp') => {
    if (!prefs) return;
    const next = await setContactField(field, prefs[field] ?? '');
    setPrefs(next);
    Alert.alert('Kaydedildi');
  };

  const onRegisterPush = async () => {
    setBusyToken(true);
    try {
      const token = await registerForPushNotifications();
      if (!token) {
        Alert.alert(
          'Push',
          'Token alınamadı. Fiziksel cihaz ve bildirim izni gerekli.',
        );
      } else {
        await refresh();
        Alert.alert('Push', 'Token kaydedildi.');
      }
    } finally {
      setBusyToken(false);
    }
  };

  const onTestNotification = async () => {
    await emitEvent(
      'custom',
      'Test bildirimi',
      'Bu bir test bildirimidir.',
      { channels: ['push'] },
    );
    Alert.alert('Test', 'Test bildirimi gönderildi.');
  };

  const onResetDefaults = async () => {
    Alert.alert('Sıfırla', 'Tüm tercihler varsayılana dönsün mü?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sıfırla',
        style: 'destructive',
        onPress: async () => {
          const defaults: NotificationPreferences = {
            channelEnabled: { push: true, email: false, sms: false, whatsapp: false },
            eventChannels: {},
          };
          await savePrefs(defaults);
          await refresh();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Bildirim Tercihleri</Text>
        <Text style={styles.sub}>Kanal ve olay bazlı yönetim</Text>

        <Text style={styles.section}>Kanallar</Text>
        {ALL_CHANNELS.map(ch => (
          <View key={ch} style={styles.row}>
            <Ionicons name={CHANNEL_ICON[ch]} size={18} color={colors.text.primary} />
            <Text style={styles.rowLabel}>{CHANNEL_LABEL[ch]}</Text>
            <Switch
              value={prefs.channelEnabled[ch]}
              onValueChange={v => onToggleChannel(ch, v)}
              trackColor={{ false: colors.border.primary, true: brand.green }}
            />
          </View>
        ))}

        <Text style={styles.section}>İletişim Bilgileri</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Push Token</Text>
          <Text style={styles.tokenText} numberOfLines={1}>
            {prefs.pushToken ?? '—'}
          </Text>
          <TouchableOpacity
            style={styles.smallBtn}
            onPress={onRegisterPush}
            disabled={busyToken}
          >
            <Ionicons name="refresh" size={14} color="#fff" />
            <Text style={styles.smallBtnText}>
              {busyToken ? 'Çalışıyor…' : 'Token Al/Yenile'}
            </Text>
          </TouchableOpacity>
        </View>

        {(['email', 'phone', 'whatsapp'] as const).map(field => (
          <View key={field} style={styles.field}>
            <Text style={styles.fieldLabel}>
              {field === 'email' ? 'E-posta' : field === 'phone' ? 'Telefon' : 'WhatsApp'}
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={prefs[field] ?? ''}
                onChangeText={v => onChangeContact(field, v)}
                placeholder={field === 'email' ? 'ornek@firma.com' : '+90...'}
                placeholderTextColor={colors.text.faint}
                keyboardType={field === 'email' ? 'email-address' : 'phone-pad'}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.saveBtn} onPress={() => onSaveContact(field)}>
                <Text style={styles.saveBtnText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.section}>Olay × Kanal Matrisi</Text>
        <View style={styles.matrixHeader}>
          <Text style={[styles.matrixHead, { flex: 1 }]}>Olay</Text>
          {ALL_CHANNELS.map(ch => (
            <Text key={ch} style={styles.matrixHead}>{CHANNEL_LABEL[ch]}</Text>
          ))}
        </View>
        {ALL_EVENTS.map(ev => {
          const set = new Set(prefs.eventChannels[ev.type] ?? []);
          return (
            <View key={ev.type} style={styles.matrixRow}>
              <Text style={styles.matrixLabel}>{ev.label}</Text>
              {ALL_CHANNELS.map(ch => {
                const active = set.has(ch);
                return (
                  <TouchableOpacity
                    key={ch}
                    style={[styles.cell, active && styles.cellActive]}
                    onPress={() => onToggleEventChannel(ev.type, ch)}
                  >
                    <Ionicons
                      name={active ? 'checkmark' : 'remove'}
                      size={14}
                      color={active ? '#fff' : colors.text.muted}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        <TouchableOpacity style={styles.testBtn} onPress={onTestNotification}>
          <Ionicons name="flask-outline" size={16} color="#fff" />
          <Text style={styles.testBtnText}>Test Bildirimi Gönder</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetBtn} onPress={onResetDefaults}>
          <Ionicons name="refresh-outline" size={16} color={colors.rose.default} />
          <Text style={styles.resetBtnText}>Varsayılanlara Dön</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  loading: { color: colors.text.muted, padding: spacing.lg },
  content: { padding: spacing.lg, paddingBottom: 80 },
  title: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  section: {
    color: colors.text.primary,
    fontWeight: '800',
    fontSize: typography.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 6,
  },
  rowLabel: { color: colors.text.primary, fontSize: typography.sm, flex: 1 },
  field: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 6,
    gap: 6,
  },
  fieldLabel: { color: colors.text.muted, fontSize: typography.xs },
  tokenText: { color: colors.text.primary, fontSize: typography.xs },
  inputRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.text.primary,
    fontSize: typography.sm,
  },
  saveBtn: {
    backgroundColor: brand.blueLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: typography.xs },
  smallBtn: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: brand.green,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    gap: 6,
    alignItems: 'center',
  },
  smallBtnText: { color: '#fff', fontWeight: '700', fontSize: typography.xs },
  matrixHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    alignItems: 'center',
  },
  matrixHead: {
    color: colors.text.muted,
    fontSize: 10,
    width: 56,
    textAlign: 'center',
    fontWeight: '700',
  },
  matrixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  matrixLabel: { color: colors.text.primary, fontSize: typography.xs, flex: 1 },
  cell: {
    width: 56,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: {
    backgroundColor: brand.green,
    borderRadius: radius.sm,
  },
  testBtn: {
    flexDirection: 'row',
    backgroundColor: brand.blueLight,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.lg,
  },
  testBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  resetBtn: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.rose.default,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.sm,
  },
  resetBtnText: { color: colors.rose.default, fontWeight: '800', fontSize: typography.xs },
});
