// ConflictResolverScreen — POZ-DEV-383 Çakışma çözüm ekranı
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { getOp, resolveConflict } from '../services/offline';
import type { OfflineOperation, RootStackParamList } from '../types';
import EmptyState from '../components/EmptyState';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ConflictResolver'>;
type R = RouteProp<RootStackParamList, 'ConflictResolver'>;

export default function ConflictResolverScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const [op, setOp] = useState<OfflineOperation | undefined>();

  const load = useCallback(async () => { setOp(await getOp(route.params.opId)); }, [route.params.opId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!op) {
    return (
      <SafeAreaView style={s.safe}>
        <EmptyState icon="help-circle-outline" title="İşlem bulunamadı" subtitle="Bu işlem ID'sine sahip bir offline kayıt yok." />
      </SafeAreaView>
    );
  }
  if (op.status !== 'conflict') {
    return (
      <SafeAreaView style={s.safe}>
        <EmptyState icon="checkmark-circle-outline" title="Çakışma yok" subtitle="Bu işlemde herhangi bir veri çakışması bulunmuyor." iconColor="#22c55e" />
      </SafeAreaView>
    );
  }

  const choose = async (side: 'local' | 'remote') => {
    await resolveConflict(op.id, side);
    Alert.alert('Çözüldü', side === 'local' ? 'Yerel kullanılacak.' : 'Sunucu sürümü alındı.');
    nav.goBack();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.banner}>
          <Ionicons name="warning-outline" size={22} color="#a855f7" />
          <Text style={s.bannerT}>Yerel ve sunucu sürümleri farklı. Hangisini saklayacağını seç.</Text>
        </View>

        <View style={s.card}>
          <View style={s.cardHead}>
            <Ionicons name="phone-portrait-outline" size={18} color="#0ea5e9" />
            <Text style={[s.cardT, { color: '#0ea5e9' }]}>Yerel (Offline)</Text>
          </View>
          <Text style={s.code}>{JSON.stringify(op.payload, null, 2)}</Text>
        </View>

        <View style={s.card}>
          <View style={s.cardHead}>
            <Ionicons name="cloud-outline" size={18} color="#f59e0b" />
            <Text style={[s.cardT, { color: '#f59e0b' }]}>Sunucu</Text>
          </View>
          <Text style={s.code}>{JSON.stringify(op.conflictRemote || {}, null, 2)}</Text>
        </View>

        <View style={s.actions}>
          <TouchableOpacity style={[s.actBtn, { backgroundColor: '#0ea5e9' }]} onPress={() => choose('local')}>
            <Ionicons name="phone-portrait-outline" size={18} color="#fff" />
            <Text style={s.actTxt}>Yereli Kullan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actBtn, { backgroundColor: '#f59e0b' }]} onPress={() => choose('remote')}>
            <Ionicons name="cloud-outline" size={18} color="#fff" />
            <Text style={s.actTxt}>Sunucuyu Al</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  content: { padding: spacing.md, gap: spacing.md },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: '#a855f722', borderRadius: radius.md, borderWidth: 1, borderColor: '#a855f7' },
  bannerT: { color: colors.text.primary, fontSize: typography.sm, flex: 1 },
  card: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border.primary },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  cardT: { fontSize: typography.sm, fontWeight: '800' },
  code: { color: colors.text.primary, fontSize: 11, fontFamily: 'Courier' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.md, borderRadius: radius.md },
  actTxt: { color: '#fff', fontWeight: '800', fontSize: typography.md },
});
