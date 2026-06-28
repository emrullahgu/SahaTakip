// ====================================================================
// CheckinScannerScreen — POZ-DEV-020 (QR ile lokasyon check-in)
// expo-camera barcode scanner; QR formatı: SAHA:{site_code}[:{customer_id}]
// ====================================================================
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import { RootStackParamList } from '../types';
import { checkinsRepo } from '../services/data/checkinsRepo';
import { useAuth } from '../context/AuthContext';
import { requestAndGetPosition } from '../services/location';

export default function CheckinScannerScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? 'demo-user';
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'CheckinScanner'>>();
  const workOrderId = route.params?.workOrderId;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastSite, setLastSite] = useState<string | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) requestPermission();
  }, [permission]);

  // setTimeout cleanup: tarama penceresinde ekran kapanırsa unmount sonrası setState olmasın.
  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

  const onScan = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    // Beklenen format: SAHA:<code>[:<customerId>]
    const parts = data.split(':');
    if (parts[0] !== 'SAHA' || !parts[1]) {
      Alert.alert('Geçersiz QR', 'Saha kodu okunamadı. Beklenen format: SAHA:KOD');
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setScanned(false), 1500);
      return;
    }
    const siteCode = parts[1];
    const customerId = parts[2] ?? null;
    const pos = await requestAndGetPosition();
    const r = await checkinsRepo.create({
      userId,
      customerId,
      siteCode,
      method: 'qr',
      lat: pos?.latitude,
      lng: pos?.longitude,
      workOrderId,
    });
    if (r) {
      setLastSite(siteCode);
      const buttons: { text: string; onPress: () => void }[] = [
        { text: 'Tekrar Tara', onPress: () => setScanned(false) },
      ];
      // İş emrinden gelindiyse 'İşe Dön' ile geri dönüp 'Başladı'ya geçilebilir.
      if (workOrderId) buttons.unshift({ text: 'İşe Dön', onPress: () => navigation.goBack() });
      Alert.alert('Check-in başarılı', `Saha: ${siteCode}`, buttons);
    } else {
      setScanned(false);
    }
  };

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permBox}>
          <Ionicons name="camera-outline" size={56} color={colors.text.faint} />
          <Text style={styles.permTitle}>Kamera İzni Gerekli</Text>
          <Text style={styles.permText}>QR kod taraması için kamera izni gerekiyor.</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnTxt}>İzin Ver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : onScan}
        />
        <View style={styles.overlay}>
          <View style={styles.scanBox} />
          <Text style={styles.hint}>QR kodu çerçeve içine al</Text>
        </View>
      </View>
      {lastSite && (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={20} color={brand.green} />
          <Text style={styles.successTxt}>Son: {lastSite}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  cameraWrap: { flex: 1, position: 'relative' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanBox: { width: 240, height: 240, borderWidth: 3, borderColor: brand.green, borderRadius: radius.lg },
  hint: { color: '#fff', marginTop: spacing.md, fontWeight: '700' },
  permBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.bg.primary },
  permTitle: { color: colors.text.primary, fontWeight: '900', fontSize: typography.lg },
  permText: { color: colors.text.muted, textAlign: 'center' },
  permBtn: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 12, backgroundColor: brand.green, borderRadius: radius.md },
  permBtnTxt: { color: '#fff', fontWeight: '800' },
  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: spacing.md, backgroundColor: colors.bg.secondary,
  },
  successTxt: { color: colors.text.primary, fontWeight: '700' },
});
