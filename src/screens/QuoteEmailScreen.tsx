// QuoteEmailScreen — POZ-DEV-134 Teklifi e-posta ile gönder (mailto + PDF)
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Sharing from 'expo-sharing';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';
import { useAppContext } from '../context/AppContext';
import { generateAndShareQuotePdf } from '../services/pdf';

type Nav = NativeStackNavigationProp<RootStackParamList, 'QuoteEmail'>;
type Rt = RouteProp<RootStackParamList, 'QuoteEmail'>;

const TL = (n: number) => `${Math.round(n).toLocaleString('tr-TR')} ₺`;

export default function QuoteEmailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { quotes, customers, updateQuote } = useAppContext();
  const quote = useMemo(() => quotes.find(q => q.id === route.params.quoteId), [quotes, route.params.quoteId]);
  const customer = useMemo(() => customers.find(c => c.shortName === quote?.customerName || c.title === quote?.customerName), [customers, quote]);

  const [to, setTo] = useState(customer?.email || '');
  const [subject, setSubject] = useState(quote ? `Teklif: ${quote.number} — ${quote.title}` : '');
  const [body, setBody] = useState(
    quote
      ? `Sayın ${quote.customerName},\n\n${quote.number} numaralı teklifimizi ekte gönderiyoruz.\n\nTeklif: ${quote.title}\nTarih: ${quote.date}\nGenel Toplam: ${TL(quote.grandTotal)}\n${quote.validUntil ? `Geçerlilik: ${quote.validUntil}\n` : ''}\nDeğerlendirmeniz için teşekkür ederiz.\n\nSaygılarımızla.`
      : '',
  );
  const [busy, setBusy] = useState(false);

  if (!quote) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}><Text style={styles.emptyText}>Teklif bulunamadı.</Text></View>
      </SafeAreaView>
    );
  }

  const openMailto = async () => {
    if (!to.trim()) { Alert.alert('Eksik', 'Alıcı e-posta adresi gerekli.'); return; }
    const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (!can && Platform.OS !== 'web') { Alert.alert('E-posta uygulaması yok', 'Cihazda bir e-posta uygulaması bulunamadı.'); return; }
      await Linking.openURL(url);
      markSent();
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'E-posta açılamadı.');
    }
  };

  const sharePdf = async () => {
    setBusy(true);
    try {
      const { uri } = await generateAndShareQuotePdf(quote);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: subject });
        markSent();
      }
    } catch (e: any) {
      Alert.alert('PDF Hatası', e?.message || 'PDF oluşturulamadı.');
    } finally {
      setBusy(false);
    }
  };

  const markSent = () => {
    if (quote.status === 'Taslak') {
      updateQuote({ ...quote, status: 'Müşteriye Gönderildi' });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="mail-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{quote.number}</Text>
            <Text style={styles.heroSub}>{quote.customerName} • {TL(quote.grandTotal)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Alıcı (E-posta)</Text>
          <TextInput style={styles.input} value={to} onChangeText={setTo} placeholder="ornek@firma.com" placeholderTextColor={colors.text.faint} keyboardType="email-address" autoCapitalize="none" />
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Konu</Text>
          <TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholderTextColor={colors.text.faint} />
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Mesaj</Text>
          <TextInput
            style={[styles.input, { minHeight: 180, textAlignVertical: 'top' }]}
            value={body}
            onChangeText={setBody}
            multiline
            placeholderTextColor={colors.text.faint}
          />
        </View>

        <TouchableOpacity style={[styles.btn, { backgroundColor: '#0ea5e9' }]} onPress={openMailto} activeOpacity={0.85}>
          <Ionicons name="mail" size={18} color="#fff" />
          <Text style={styles.btnText}>E-posta Uygulamasında Aç</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, { backgroundColor: '#22c55e' }]} onPress={sharePdf} disabled={busy} activeOpacity={0.85}>
          {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="document-attach" size={18} color="#fff" />}
          <Text style={styles.btnText}>PDF Oluştur & Paylaş</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          İpucu: E-posta uygulamasını açtıktan sonra PDF'i ekleyebilirsiniz veya doğrudan PDF'i paylaşma seçeneğini kullanarak e-posta uygulamasını seçin.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.md },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#8b5cf6', borderRadius: radius.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: spacing.xs },
  label: { color: colors.text.muted, fontWeight: '700', fontSize: typography.xs },
  input: { color: colors.text.primary, fontSize: typography.sm, padding: spacing.sm, backgroundColor: colors.bg.primary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: spacing.md, borderRadius: radius.md },
  btnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  hint: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center', marginTop: spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyText: { color: colors.text.muted },
});
