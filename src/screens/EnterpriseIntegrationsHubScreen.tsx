// EnterpriseIntegrationsHubScreen — POZ-DEV-453
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { colors, spacing, radius, typography } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tile = { key: keyof RootStackParamList; label: string; icon: any; color: string };

const TILES: Tile[] = [
  { key: 'ErpConnections', label: 'ERP Bağlantıları', icon: 'server-outline', color: '#ef4444' },
  { key: 'ErpSyncJobs', label: 'Senkron Geçmişi', icon: 'sync-outline', color: '#0ea5e9' },
  { key: 'ErpCustomers', label: 'Cari Eşleme', icon: 'people-outline', color: '#a855f7' },
  { key: 'ErpStock', label: 'Stok Eşleme', icon: 'cube-outline', color: '#06b6d4' },
  { key: 'ErpInvoiceDrafts', label: 'Fatura Taslakları', icon: 'document-outline', color: '#f59e0b' },
  { key: 'QuoteToOrder', label: 'Tekliften Sipariş', icon: 'cart-outline', color: '#22c55e' },
  { key: 'CrmConnections', label: 'CRM Bağlantıları', icon: 'briefcase-outline', color: '#ec4899' },
  { key: 'IntegrationWebhooks', label: 'Webhooks', icon: 'flash-outline', color: '#eab308' },
  { key: 'IntegrationApiKeys', label: 'API Anahtarları', icon: 'key-outline', color: '#10b981' },
  { key: 'ApiUsageLogs', label: 'API Kullanım Log', icon: 'analytics-outline', color: '#6366f1' },
  { key: 'IntegrationErrors', label: 'Hata Kayıtları', icon: 'warning-outline', color: '#dc2626' },
  { key: 'IntegrationHealth', label: 'Sağlık Durumu', icon: 'pulse-outline', color: '#84cc16' },
];

export default function EnterpriseIntegrationsHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <View style={s.hero}>
          <Ionicons name="git-network-outline" size={52} color="#3b82f6" />
          <Text style={s.heroT}>Kurumsal Entegrasyonlar</Text>
          <Text style={s.heroD}>ERP, CRM, Webhook, API ve dış servisleri tek panelden yönet.</Text>
        </View>
        <View style={s.grid}>
          {TILES.map(t => (
            <TouchableOpacity key={t.key as string} onPress={() => nav.navigate(t.key as any)} style={[s.tile, { backgroundColor: t.color + '22', borderColor: t.color, width: `${100 / cols - 1}%` }]}>
              <Ionicons name={t.icon} size={28} color={t.color} />
              <Text style={s.tileT}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  hero: { alignItems: 'center', backgroundColor: '#3b82f622', padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: '#3b82f6', marginBottom: spacing.md },
  heroT: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '800', marginTop: spacing.sm },
  heroD: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  tile: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  tileT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700', textAlign: 'center' },
});
