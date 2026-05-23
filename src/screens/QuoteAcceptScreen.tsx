// ====================================================================
// QuoteAcceptScreen — POZ-DEV-040
// Müşteri imzalı kabul ekranı. Paylaşılabilir token ile açılır.
// (MVP: deep link / Linking ile token route'a gelir; bulut paylaşımı opsiyonel.)
// ====================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, brand } from '../theme';
import { RootStackParamList } from '../types';
import { useAppContext, calcLineTotal } from '../context/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'QuoteAccept'>;

export default function QuoteAcceptScreen({ route, navigation }: Props) {
  const { token } = route.params;
  const { quotes, acceptQuoteAndCreateWorkOrder, showToast } = useAppContext();
  const quote = quotes.find(q => q.shareToken === token || q.id === token);

  const [signedBy, setSignedBy] = useState('');
  const [signatureText, setSignatureText] = useState('');

  if (!quote) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Bu link geçerli değil ya da teklif bulunamadı.</Text>
      </View>
    );
  }

  const submit = () => {
    if (!signedBy.trim() || !signatureText.trim()) {
      Alert.alert('Eksik', 'Lütfen ad ve imza (yazılı onay metni) girin.');
      return;
    }
    const woId = acceptQuoteAndCreateWorkOrder(quote.id, signedBy, signatureText);
    if (woId) {
      Alert.alert('Teşekkürler', `Teklif kabul edildi. İş emri: ${woId}`);
      showToast('Teklif kabul alındı.');
      navigation.goBack();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.banner}>
        <Ionicons name="shield-checkmark-outline" size={24} color={brand.green} />
        <Text style={styles.bannerText}>Resmi Teklif Kabul Formu</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Teklif No</Text>
        <Text style={styles.value}>{quote.number}</Text>

        <Text style={styles.label}>Müşteri</Text>
        <Text style={styles.value}>{quote.customerTitle || quote.customerName}</Text>

        <Text style={styles.label}>Konu</Text>
        <Text style={styles.value}>{quote.title}</Text>

        <Text style={styles.label}>Tarih</Text>
        <Text style={styles.value}>{quote.date}</Text>

        <Text style={styles.label}>Genel Toplam (KDV Dahil)</Text>
        <Text style={styles.grand}>{quote.grandTotal.toLocaleString('tr-TR')} ₺</Text>
      </View>

      <Text style={styles.section}>Kalemler ({quote.lines.length})</Text>
      {quote.lines.map((l, i) => {
        const calc = calcLineTotal(l);
        return (
          <View key={i} style={styles.lineRow}>
            <Text style={styles.linePoz}>
              {i + 1}. {l.pozId}
            </Text>
            <Text style={styles.lineName}>{l.pozName}</Text>
            <Text style={styles.lineQty}>
              {l.quantity} {l.unit} · {calc.withProfit.toLocaleString('tr-TR')} ₺
            </Text>
          </View>
        );
      })}

      <Text style={styles.section}>İmza</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Adınız Soyadınız</Text>
        <TextInput
          style={styles.input}
          value={signedBy}
          onChangeText={setSignedBy}
          placeholder="Ad Soyad"
          placeholderTextColor={colors.text.muted}
        />
        <Text style={styles.label}>Onay Metni / İmza</Text>
        <TextInput
          style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
          value={signatureText}
          onChangeText={setSignatureText}
          placeholder="Teklifi kabul ediyorum. (Ad Soyad)"
          placeholderTextColor={colors.text.muted}
          multiline
        />
        <Text style={styles.legal}>
          Yukarıdaki bilgileri onaylayarak {quote.grandTotal.toLocaleString('tr-TR')} ₺ tutarındaki
          teklifi kabul ediyorum.
        </Text>
        <TouchableOpacity style={styles.submitBtn} onPress={submit}>
          <Ionicons name="checkmark-circle-outline" size={18} color={colors.bg.primary} />
          <Text style={styles.submitText}>Teklifi Kabul Et</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 60 },
  banner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.bg.secondary,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: brand.green,
  },
  bannerText: { color: colors.text.primary, fontSize: 16, fontWeight: '800' },
  card: {
    padding: 14,
    backgroundColor: colors.bg.secondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.primary,
    marginBottom: 14,
  },
  label: { color: colors.text.muted, fontSize: 11, marginTop: 8 },
  value: { color: colors.text.primary, fontSize: 14, fontWeight: '600' },
  grand: { color: brand.green, fontSize: 22, fontWeight: '900', marginTop: 4 },
  section: { color: colors.text.secondary, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  lineRow: {
    padding: 10,
    backgroundColor: colors.bg.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.primary,
    marginBottom: 6,
  },
  linePoz: { color: brand.green, fontSize: 12, fontWeight: '800' },
  lineName: { color: colors.text.primary, fontSize: 13, marginTop: 2 },
  lineQty: { color: colors.text.muted, fontSize: 11, marginTop: 2 },
  input: {
    backgroundColor: colors.bg.primary,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    marginTop: 4,
  },
  legal: { color: colors.text.muted, fontSize: 11, marginTop: 10, fontStyle: 'italic' },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: brand.green,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  submitText: { color: colors.bg.primary, fontSize: 15, fontWeight: '800' },
});
