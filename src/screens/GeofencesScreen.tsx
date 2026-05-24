// ====================================================================
// GeofencesScreen — POZ-DEV-017
// Bölge (daire) listesi + ekleme/silme
// ====================================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert,
  Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';

import { colors, spacing, radius, typography, brand } from '../theme';
import { geofencesRepo, Geofence } from '../services/data/geofencesRepo';
import { requestAndGetPosition } from '../services/location';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';

export default function GeofencesScreen() {
  const [list, setList] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [radius_, setRadius] = useState('100');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const load = async () => {
    setLoading(true);
    setList(await geofencesRepo.list());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startAdd = async () => {
    setAdding(true);
    const pos = await requestAndGetPosition();
    if (pos) setCoords({ lat: pos.latitude, lng: pos.longitude });
  };

  const saveFence = async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Bölge adı zorunlu');
      return;
    }
    if (!coords) {
      Alert.alert('Hata', 'Konum bekleniyor');
      return;
    }
    const r = parseInt(radius_, 10);
    if (!r || r < 10) {
      Alert.alert('Hata', 'Yarıçap en az 10 metre olmalı');
      return;
    }
    await geofencesRepo.add({
      name: name.trim(),
      centerLat: coords.lat,
      centerLng: coords.lng,
      radiusM: r,
    });
    setAdding(false);
    setName('');
    setRadius('100');
    setCoords(null);
    await load();
  };

  const remove = (g: Geofence) => {
    Alert.alert('Sil', `"${g.name}" bölgesini silmek istiyor musun?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await geofencesRepo.delete(g.id);
          load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Add Form */}
      {adding ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Yeni Bölge</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Bölge adı (örn: Müşteri Sahası A)"
            placeholderTextColor={colors.text.faint}
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={radius_}
              onChangeText={setRadius}
              keyboardType="number-pad"
              placeholder="Yarıçap (m)"
              placeholderTextColor={colors.text.faint}
            />
            <View style={[styles.coordBox]}>
              <Text style={styles.coordTxt}>
                {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Konum alınıyor...'}
              </Text>
            </View>
          </View>
          {coords && (
            <MapView
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
              style={styles.miniMap}
              initialRegion={{
                latitude: coords.lat,
                longitude: coords.lng,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
            >
              <Marker coordinate={{ latitude: coords.lat, longitude: coords.lng }} />
              <Circle
                center={{ latitude: coords.lat, longitude: coords.lng }}
                radius={parseInt(radius_, 10) || 100}
                strokeColor={brand.green}
                fillColor="rgba(16,185,129,0.15)"
              />
            </MapView>
          )}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => setAdding(false)}>
              <Text style={styles.btnGhostTxt}>Vazgeç</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={saveFence}>
              <Text style={styles.btnSaveTxt}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addBtn} onPress={startAdd} activeOpacity={0.85}>
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.addTxt}>Yeni Bölge (Konumumu Kullan)</Text>
        </TouchableOpacity>
      )}

      {/* List */}
      {loading ? (
        <ActivityIndicator color={brand.green} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          {...FLATLIST_DEFAULTS}
          data={list}
          keyExtractor={g => g.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
          ListEmptyComponent={
            <EmptyState
              icon="locate-outline"
              title="Tanımlı bölge yok"
              subtitle="Yeni bir bölge eklemek için üstteki butona basın."
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardMeta}>
                  {item.centerLat.toFixed(5)}, {item.centerLng.toFixed(5)}  •  R: {item.radiusM} m
                </Text>
              </View>
              <TouchableOpacity onPress={() => remove(item)} style={styles.delBtn}>
                <Ionicons name="trash" size={18} color="#dc2626" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  form: { padding: spacing.md, gap: spacing.sm, backgroundColor: colors.bg.secondary },
  formTitle: { color: colors.text.primary, fontWeight: '900', fontSize: typography.md },
  input: {
    backgroundColor: colors.bg.card, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 10,
    color: colors.text.primary, fontSize: typography.sm,
  },
  coordBox: { flex: 1, justifyContent: 'center', padding: spacing.sm, backgroundColor: colors.bg.card, borderRadius: radius.sm },
  coordTxt: { color: colors.text.muted, fontSize: typography.xs },
  miniMap: { height: 180, borderRadius: radius.md, overflow: 'hidden' },
  btn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center' },
  btnGhost: { backgroundColor: colors.bg.card },
  btnGhostTxt: { color: colors.text.primary, fontWeight: '700' },
  btnSave: { backgroundColor: brand.green },
  btnSaveTxt: { color: '#fff', fontWeight: '800' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: brand.green, margin: spacing.md, padding: spacing.md, borderRadius: radius.md,
  },
  addTxt: { color: '#fff', fontWeight: '800' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg.card, padding: spacing.md, borderRadius: radius.md,
  },
  cardName: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  cardMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  delBtn: { padding: spacing.sm },
});
