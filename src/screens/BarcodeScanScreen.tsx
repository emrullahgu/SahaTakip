// BarcodeScanScreen — POZ-DEV-057
// Malzeme barkod tarama: bulunan kod ile MaterialForm/StockMovement'a yönlendir.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { findByBarcode } from '../services/materials';
import { RootStackParamList } from '../types';
import EmptyState from '../components/EmptyState';

type Nav = NativeStackNavigationProp<RootStackParamList, 'BarcodeScan'>;
type Rt = RouteProp<RootStackParamList, 'BarcodeScan'>;

export default function BarcodeScanScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const mode = route.params?.mode ?? 'material-lookup';

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) requestPermission();
  }, [permission]);

  const onScan = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    const material = await findByBarcode(data);

    if (!material) {
      Alert.alert(
        'Bulunamadı',
        `"${data}" koduyla malzeme bulunamadı. Yeni malzeme oluşturmak ister misiniz?`,
        [
          { text: 'Vazgeç', style: 'cancel', onPress: () => setScanned(false) },
          {
            text: 'Oluştur',
            onPress: () => {
              navigation.replace('MaterialForm');
            },
          },
        ],
      );
      return;
    }

    if (mode === 'material-lookup') {
      navigation.replace('MaterialForm', { materialId: material.id });
    } else if (mode === 'stock-in') {
      navigation.replace('StockMovement', { kind: 'giris', materialId: material.id });
    } else if (mode === 'stock-out') {
      navigation.replace('StockMovement', { kind: 'cikis', materialId: material.id });
    }
  };

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState
          icon="camera-outline"
          title="Kamera İzni Gerekli"
          subtitle="Barkod taraması için kamera izni gerekiyor."
          actionLabel="İzin Ver"
          onAction={requestPermission}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'],
          }}
          onBarcodeScanned={scanned ? undefined : onScan}
        />
        <View style={styles.overlay}>
          <View style={styles.scanBox} />
          <Text style={styles.hint}>
            {mode === 'stock-in'
              ? 'Giriş yapılacak barkodu okutun'
              : mode === 'stock-out'
              ? 'Çıkış yapılacak barkodu okutun'
              : 'Malzeme barkodunu okutun'}
          </Text>
          {scanned && (
            <TouchableOpacity
              style={styles.againBtn}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.againText}>Tekrar Tara</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  cameraWrap: { flex: 1, position: 'relative' },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  scanBox: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: brand.green,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
  },
  hint: {
    color: '#fff',
    marginTop: spacing.lg,
    fontSize: typography.sm,
    fontWeight: '700',
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowRadius: 4,
        textShadowOffset: { width: 0, height: 1 },
      },
      android: {
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowRadius: 4,
        textShadowOffset: { width: 0, height: 1 },
      },
      web: {
        textShadow: '0px 1px 4px rgba(0, 0, 0, 0.6)',
      } as any,
    }),
  },
  againBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: brand.green,
    borderRadius: radius.full,
  },
  againText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  permBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: 8 },
  permTitle: { color: '#fff', fontSize: typography.md, fontWeight: '800' },
  permText: { color: colors.text.faint, fontSize: typography.sm, textAlign: 'center' },
  permBtn: {
    marginTop: spacing.md,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: brand.green,
    borderRadius: radius.full,
  },
  permBtnTxt: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
});
