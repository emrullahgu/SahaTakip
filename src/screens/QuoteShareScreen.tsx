// QuoteShareScreen — POZ-DEV-135 Paylaşılabilir teklif kabul linki
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';
import { useAppContext } from '../context/AppContext';

type Nav = NativeStackNavigationProp<RootStackParamList, 'QuoteShare'>;
type Rt = RouteProp<RootStackParamList, 'QuoteShare'>;

const TL = (n: number) => `${Math.round(n).toLocaleString('tr-TR')} ₺`;
const SHARE_BASE = 'https://sahatakip.app/q/';

export default function QuoteShareScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { quotes, generateQuoteShareToken } = useAppContext();
  const quote = useMemo(() => quotes.find(q => q.id === route.params.quoteId), [quotes, route.params.quoteId]);

  const [token, setToken] = useState<string | null>(quote?.shareToken ?? null);

  if (!quote) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}><Text style={styles.emptyText}>Teklif bulunamadı.</Text></View>
      </SafeAreaView>
    );
  }

  const link = token ? `${SHARE_BASE}${token}` : '';

  const generate = () => {
    const t = generateQuoteShareToken(quote.id);
    if (t) setToken(t);
    else Alert.alert('Hata', 'Paylaşım anahtarı oluşturulamadı.');
  };

  const shareLink = async () => {
    if (!link) return;
    try {
      await Share.share({
        title: `Teklif ${quote.number}`,
        message: `${quote.customerName} için ${quote.number} numaralı teklifimizi inceleyip onaylayabilirsiniz:\n${link}`,
      });
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Paylaşım başarısız.');
    }
  };

  const openLocal = () => {
    if (!token) return;
    nav.navigate('QuoteAccept', { token });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="share-social-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{quote.number}</Text>
            <Text style={styles.heroSub}>{quote.customerName} • {TL(quote.grandTotal)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Paylaşım Anahtarı</Text>
          {token ? (
            <Text style={styles.token} selectable>{token}</Text>
          ) : (
            <Text style={styles.muted}>Henüz oluşturulmadı</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Paylaşılabilir Link</Text>
          {link ? (
            <Text style={styles.link} selectable>{link}</Text>
          ) : (
            <Text style={styles.muted}>Önce anahtar oluşturun</Text>
          )}
        </View>

        {!token && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#0ea5e9' }]} onPress={generate} activeOpacity={0.85}>
            <Ionicons name="key-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Paylaşım Anahtarı Oluştur</Text>
          </TouchableOpacity>
        )}

        {!!token && (
          <>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#22c55e' }]} onPress={shareLink} activeOpacity={0.85}>
              <Ionicons name="share-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Link Paylaş</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#8b5cf6' }]} onPress={openLocal} activeOpacity={0.85}>
              <Ionicons name="eye-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Kabul Ekranını Aç</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.hint}>
          Bu anahtar müşterinizin teklifi inceleyip imzalı kabul vermesi için kullanılır. Anahtar bir kez oluşturulur ve tekliften silinmez.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.md },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#0ea5e9', borderRadius: radius.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: spacing.xs },
  label: { color: colors.text.muted, fontWeight: '700', fontSize: typography.xs },
  token: { color: colors.text.primary, fontSize: typography.sm, fontFamily: 'monospace' as any },
  link: { color: '#0ea5e9', fontSize: typography.sm },
  muted: { color: colors.text.faint, fontSize: typography.xs },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: spacing.md, borderRadius: radius.md },
  btnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  hint: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center', marginTop: spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyText: { color: colors.text.muted },
});
