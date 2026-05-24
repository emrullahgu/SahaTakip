// AppUpdateScreen — Uygulamayı kontrol et / güncelle
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import {
  checkForUpdate,
  getCurrentVersion,
  getLastCheck,
  getManifestUrl,
  setManifestUrl,
  startApkInstall,
  type UpdateCheckResult,
} from '../services/appUpdate';

export default function AppUpdateScreen() {
  const current = getCurrentVersion();
  const [manifestUrl, setManifestUrlState] = useState('');
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<UpdateCheckResult | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    (async () => {
      setManifestUrlState(await getManifestUrl());
      setLastCheck(await getLastCheck());
    })();
  }, []);

  const saveUrl = useCallback(async () => {
    await setManifestUrl(manifestUrl);
    Alert.alert('Kaydedildi', 'Güncelleme sunucu adresi kaydedildi.');
  }, [manifestUrl]);

  const handleCheck = useCallback(async () => {
    setChecking(true);
    setResult(null);
    try {
      const r = await checkForUpdate();
      setResult(r);
      setLastCheck(await getLastCheck());
    } finally {
      setChecking(false);
    }
  }, []);

  const handleInstall = useCallback(async () => {
    if (!result || result.status !== 'available') return;
    setInstalling(true);
    try {
      await startApkInstall(result.manifest.apkUrl);
      Alert.alert(
        'İndirme Başlatıldı',
        Platform.OS === 'android'
          ? 'APK indiriliyor. İndirme tamamlanınca bildirimden dokunup kurulumu onaylayın. "Bilinmeyen kaynaklara izin ver" uyarısı çıkabilir.'
          : 'Bağlantı tarayıcıda açıldı.'
      );
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'İndirme başlatılamadı.');
    } finally {
      setInstalling(false);
    }
  }, [result]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.headerCard}>
          <View style={[s.iconWrap, { backgroundColor: colors.emerald.bg }]}>
            <Ionicons name="cloud-download-outline" size={28} color={colors.emerald.default} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Uygulama Güncelleme</Text>
            <Text style={s.subtitle}>Mevcut sürüm: v{current}</Text>
            {lastCheck && (
              <Text style={s.muted}>
                Son kontrol: {new Date(lastCheck).toLocaleString('tr-TR')}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[s.primaryBtn, checking && s.btnDisabled]}
          onPress={handleCheck}
          disabled={checking}
          activeOpacity={0.85}
        >
          {checking ? (
            <ActivityIndicator color={colors.bg.primary} />
          ) : (
            <>
              <Ionicons name="refresh" size={18} color={colors.bg.primary} />
              <Text style={s.primaryBtnText}>Güncellemeyi Kontrol Et</Text>
            </>
          )}
        </TouchableOpacity>

        {result?.status === 'up-to-date' && (
          <View style={[s.resultBox, { borderColor: colors.emerald.border, backgroundColor: colors.emerald.bg }]}>
            <Ionicons name="checkmark-circle" size={22} color={colors.emerald.default} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={s.resultTitle}>Uygulama güncel</Text>
              <Text style={s.resultDesc}>
                Yüklü sürüm v{result.current}, sunucudaki son sürüm v{result.latest}.
              </Text>
            </View>
          </View>
        )}

        {result?.status === 'available' && (
          <View style={[s.resultBox, { borderColor: colors.amber.border, backgroundColor: colors.amber.bg }]}>
            <Ionicons name="cloud-download" size={22} color={colors.amber.default} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={s.resultTitle}>
                Yeni sürüm mevcut: v{result.latest}
              </Text>
              <Text style={s.resultDesc}>
                Mevcut: v{result.current}
                {result.manifest.notes ? `\n\n${result.manifest.notes}` : ''}
              </Text>
              <TouchableOpacity
                style={[s.installBtn, installing && s.btnDisabled]}
                onPress={handleInstall}
                disabled={installing}
                activeOpacity={0.85}
              >
                {installing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color="#fff" />
                    <Text style={s.installBtnText}>İndir ve Yükle</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {result?.status === 'error' && (
          <View style={[s.resultBox, { borderColor: colors.rose.border, backgroundColor: colors.rose.bg }]}>
            <Ionicons name="alert-circle" size={22} color={colors.rose.default} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={s.resultTitle}>Kontrol başarısız</Text>
              <Text style={s.resultDesc}>{result.message}</Text>
            </View>
          </View>
        )}

        <Text style={s.section}>Sunucu Ayarı (Opsiyonel)</Text>
        <Text style={s.help}>
          Varsayılan olarak <Text style={{ fontWeight: '600' }}>GitHub Releases</Text> kullanılır
          (emrullahgu/SahaTakip). Farklı bir manifest sunucusu kullanacaksanız JSON URL'sini girin.
        </Text>
        <TextInput
          style={s.input}
          placeholder="https://api.github.com/repos/emrullahgu/SahaTakip/releases/latest"
          placeholderTextColor={colors.text.faint}
          value={manifestUrl}
          onChangeText={setManifestUrlState}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <TouchableOpacity style={s.saveBtn} onPress={saveUrl} activeOpacity={0.85}>
          <Ionicons name="save-outline" size={16} color={colors.text.primary} />
          <Text style={s.saveBtnText}>Adresi Kaydet</Text>
        </TouchableOpacity>

        <View style={s.hintBox}>
          <Text style={s.hintTitle}>Otomatik GitHub Releases</Text>
          <Text style={s.hintNote}>
            Varsayılan kaynak:{' '}
            <Text style={{ fontWeight: '600' }}>github.com/emrullahgu/SahaTakip/releases/latest</Text>
            {'\n\n'}
            Yeni sürüm yayınlamak için GitHub'da bir release oluşturup APK dosyasını asset olarak
            ekleyin (örn. `sahatakip-1.0.1.apk`). Uygulama "Güncellemeyi Kontrol Et" dediğinizde
            tag'i (örn. v1.0.1) sürüm olarak okur ve `.apk` asset'ini indirir.
            {'\n\n'}
            Özel bir manifest sunucusu kullanmak isterseniz yukarıdaki alana JSON URL'sini girin
            (format: {'{'} "version": "1.0.1", "apkUrl": "...apk", "notes": "...", "mandatory": false {'}'}).
            {'\n\n'}
            Android'de APK indirme tamamlandıktan sonra bildirimden dokununca paket yükleyici açılır.
            İlk kullanımda "Bilinmeyen kaynaklara izin ver" ayarını onaylamanız gerekebilir.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.primary,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  subtitle: { color: colors.text.secondary, fontSize: typography.sm, marginTop: 2 },
  muted: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.emerald.default,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  primaryBtnText: { color: colors.bg.primary, fontWeight: '700', fontSize: typography.md },
  btnDisabled: { opacity: 0.6 },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  resultTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.base },
  resultDesc: { color: colors.text.secondary, fontSize: typography.sm, marginTop: 2 },
  installBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.amber.default,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  installBtnText: { color: '#1a1300', fontWeight: '700', fontSize: typography.base },
  section: {
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: typography.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  help: { color: colors.text.muted, fontSize: typography.sm, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.primary,
    color: colors.text.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    fontSize: typography.base,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  saveBtnText: { color: colors.text.primary, fontWeight: '600' },
  hintBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  hintTitle: { color: colors.text.primary, fontWeight: '700', marginBottom: spacing.xs },
  hintCode: {
    color: colors.text.secondary,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: typography.xs,
    marginBottom: spacing.sm,
  },
  hintNote: { color: colors.text.muted, fontSize: typography.xs, lineHeight: 16 },
});
