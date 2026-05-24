// Faz 46 — AssetQrScreen (QR display + scan mock)
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { EqAsset } from '../types';
import { listEqAssets, EQ_TYPE_COLOR, EQ_TYPE_ICON, EQ_TYPE_LABEL } from '../services/equipment';

// Generate a deterministic 16x16 grid pattern from a string (pseudo-QR visual)
const grid16 = (payload: string): boolean[][] => {
  const arr: boolean[][] = Array.from({ length: 16 }, () => Array(16).fill(false));
  let h = 0;
  for (let i = 0; i < payload.length; i++) h = (h * 31 + payload.charCodeAt(i)) | 0;
  let s = Math.abs(h) || 1;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      // Finder patterns in corners
      const inFinder = (y < 4 && (x < 4 || x > 11)) || (y > 11 && x < 4);
      if (inFinder) {
        arr[y][x] = (y === 0 || y === 3 || x === 0 || x === 3 || (y > 0 && y < 3 && x > 0 && x < 3));
      } else {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        arr[y][x] = (s % 100) < 48;
      }
    }
  }
  return arr;
};

export default function AssetQrScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const presetId = route.params?.assetId as string | undefined;
  const [assets, setAssets] = useState<EqAsset[]>([]);
  const [selected, setSelected] = useState<EqAsset | null>(null);
  const [scanning, setScanning] = useState(false);

  const load = useCallback(async () => {
    const list = await listEqAssets();
    setAssets(list);
    if (presetId) {
      const a = list.find(x => x.id === presetId);
      if (a) setSelected(a);
    } else if (!selected && list.length) setSelected(list[0]);
  }, [presetId, selected]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pattern = selected ? grid16(selected.qrPayload) : null;

  const mockScan = () => {
    setScanning(true);
    setTimeout(() => {
      const pick = assets[Math.floor(Math.random() * assets.length)];
      setScanning(false);
      if (pick) {
        Alert.alert('QR Okundu', `${pick.code} · ${pick.name}\nServis karnesine gidiliyor...`, [
          { text: 'İptal', style: 'cancel' },
          { text: 'Aç', onPress: () => nav.navigate('ServiceCard', { assetId: pick.id }) },
        ]);
      }
    }, 1200);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <TouchableOpacity style={s.scanBtn} onPress={mockScan} disabled={scanning}>
          <Ionicons name={scanning ? 'scan-circle' : 'scan'} size={28} color="#fff" />
          <Text style={s.scanT}>{scanning ? 'Taranıyor…' : 'QR Kod Okut'}</Text>
        </TouchableOpacity>

        <Text style={s.section}>Varlık Seç</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {assets.map(a => (
            <TouchableOpacity key={a.id} onPress={() => setSelected(a)} style={[s.aPill, selected?.id === a.id && { backgroundColor: EQ_TYPE_COLOR[a.type] }]}>
              <Ionicons name={EQ_TYPE_ICON[a.type] as any} size={14} color={selected?.id === a.id ? '#fff' : EQ_TYPE_COLOR[a.type]} />
              <Text style={[s.aPillT, selected?.id === a.id && { color: '#fff' }]}>{a.code}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selected && pattern && (
          <View style={s.qrCard}>
            <Text style={s.qrTitle}>{selected.code} · {selected.name}</Text>
            <Text style={s.qrSub}>{EQ_TYPE_LABEL[selected.type]} · {selected.brand} {selected.model}</Text>
            <View style={s.qrBox}>
              {pattern.map((row, y) => (
                <View key={y} style={{ flexDirection: 'row' }}>
                  {row.map((on, x) => (
                    <View key={x} style={[s.cell, { backgroundColor: on ? '#000' : '#fff' }]} />
                  ))}
                </View>
              ))}
            </View>
            <Text style={s.qrPayload}>{selected.qrPayload}</Text>
            <TouchableOpacity style={s.goBtn} onPress={() => nav.navigate('ServiceCard', { assetId: selected.id })}>
              <Ionicons name="document-text" size={16} color="#fff" />
              <Text style={s.goBtnT}>Servis Karnesi</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const CELL = 14;
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#22c55e', padding: spacing.md, borderRadius: radius.md },
  scanT: { color: '#fff', fontSize: typography.md, fontWeight: '800' },
  section: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginTop: 8 },
  aPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.bg.secondary, borderRadius: 14, marginRight: 6, borderWidth: 1, borderColor: colors.border.primary },
  aPillT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  qrCard: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border.primary, gap: 8 },
  qrTitle: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  qrSub: { color: colors.text.muted, fontSize: typography.xs },
  qrBox: { padding: 8, backgroundColor: '#fff', borderRadius: 8 },
  cell: { width: CELL, height: CELL },
  qrPayload: { color: colors.text.faint, fontSize: 10, fontFamily: 'monospace' },
  goBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#14b8a6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  goBtnT: { color: '#fff', fontWeight: '800' },
});
