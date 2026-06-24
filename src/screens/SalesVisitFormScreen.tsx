// SalesVisitFormScreen — POZ-DEV-089
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAppContext } from '../context/AppContext';
import {
  createVisit, getVisit, updateVisit, OUTCOME_LABEL, OUTCOME_COLOR,
} from '../services/salesVisits';
import { RootStackParamList, SalesVisit, SalesVisitOutcome } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SalesVisitForm'>;
type RP = RouteProp<RootStackParamList, 'SalesVisitForm'>;

const OUTCOMES: SalesVisitOutcome[] = ['opportunity', 'follow_up', 'won', 'lost', 'no_interest'];

export default function SalesVisitFormScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RP>();
  const { customers, employees } = useAppContext();
  const visitId = route.params?.visitId;
  const initialCustomerId = route.params?.customerId;

  const [editing, setEditing] = useState<SalesVisit | null>(null);
  const [customerId, setCustomerId] = useState<string | undefined>(initialCustomerId);
  const [salespersonId, setSalespersonId] = useState<string | undefined>();
  const [outcome, setOutcome] = useState<SalesVisitOutcome>('opportunity');
  const [purpose, setPurpose] = useState('');
  const [summary, setSummary] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [nextStepDate, setNextStepDate] = useState('');
  const [estimatedAmount, setEstimatedAmount] = useState('');
  const [compName, setCompName] = useState('');
  const [compProducts, setCompProducts] = useState('');
  const [compPricing, setCompPricing] = useState('');
  const [compNotes, setCompNotes] = useState('');

  useEffect(() => {
    (async () => {
      if (!visitId) return;
      const v = await getVisit(visitId);
      if (!v) return;
      setEditing(v);
      setCustomerId(v.customerId);
      setSalespersonId(v.salespersonId);
      setOutcome(v.outcome);
      setPurpose(v.purpose || '');
      setSummary(v.summary || '');
      setNextStep(v.nextStep || '');
      setNextStepDate(v.nextStepDate || '');
      setEstimatedAmount(v.estimatedAmount !== undefined ? String(v.estimatedAmount) : '');
      if (v.competitor) {
        setCompName(v.competitor.name || '');
        setCompProducts(v.competitor.products || '');
        setCompPricing(v.competitor.pricing || '');
        setCompNotes(v.competitor.notes || '');
      }
    })();
  }, [visitId]);

  const onSave = async () => {
    if (!customerId) { Alert.alert('Eksik', 'Müşteri seçin.'); return; }
    const customer = customers.find(c => c.id === customerId);
    if (!customer) { Alert.alert('Hata', 'Müşteri bulunamadı.'); return; }
    const salesperson = employees.find(e => e.id === salespersonId);
    const amt = estimatedAmount ? Number(estimatedAmount.replace(',', '.')) : undefined;

    const payload = {
      customerId,
      customerName: customer.title || customer.shortName,
      visitDate: editing?.visitDate || new Date().toISOString(),
      salespersonId,
      salespersonName: salesperson?.name,
      outcome,
      purpose: purpose.trim() || undefined,
      summary: summary.trim() || undefined,
      nextStep: nextStep.trim() || undefined,
      nextStepDate: nextStepDate.trim() || undefined,
      estimatedAmount: Number.isFinite(amt) ? amt : undefined,
      competitor: compName.trim() ? {
        name: compName.trim(),
        products: compProducts.trim() || undefined,
        pricing: compPricing.trim() || undefined,
        notes: compNotes.trim() || undefined,
      } : undefined,
    } as Omit<SalesVisit, 'id' | 'createdAt'>;

    if (editing) {
      await updateVisit(editing.id, payload);
    } else {
      await createVisit(payload);
    }
    nav.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Müşteri *</Text>
        <View style={styles.grid}>
          {customers.map(c => {
            const active = c.id === customerId;
            return (
              <TouchableOpacity key={c.id} style={[styles.btn, active && styles.btnActive]} onPress={() => setCustomerId(c.id)}>
                <Text style={[styles.btnText, active && styles.btnTextActive]}>{c.shortName}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Satış Temsilcisi</Text>
        <View style={styles.grid}>
          {employees.map(e => {
            const active = e.id === salespersonId;
            return (
              <TouchableOpacity key={e.id} style={[styles.btn, active && styles.btnActive]} onPress={() => setSalespersonId(e.id)}>
                <Text style={[styles.btnText, active && styles.btnTextActive]}>{e.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Sonuç</Text>
        <View style={styles.grid}>
          {OUTCOMES.map(o => {
            const active = outcome === o;
            return (
              <TouchableOpacity
                key={o}
                style={[styles.btn, { borderColor: OUTCOME_COLOR[o] }, active && { backgroundColor: OUTCOME_COLOR[o] }]}
                onPress={() => setOutcome(o)}
              >
                <Text style={[styles.btnText, active && styles.btnTextActive]}>{OUTCOME_LABEL[o]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Ziyaret Amacı</Text>
        <TextInput style={styles.input} value={purpose} onChangeText={setPurpose} placeholder="ör. Kompanzasyon teklifi sunumu" placeholderTextColor={colors.text.faint} />

        <Text style={styles.label}>Özet</Text>
        <TextInput
          style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
          multiline value={summary} onChangeText={setSummary}
          placeholder="Görüşme notları" placeholderTextColor={colors.text.faint}
        />

        <Text style={styles.label}>Sonraki Adım</Text>
        <TextInput style={styles.input} value={nextStep} onChangeText={setNextStep} placeholder="ör. Teknik teklif gönder" placeholderTextColor={colors.text.faint} />

        <Text style={styles.label}>Sonraki Adım Tarihi</Text>
        <TextInput style={styles.input} value={nextStepDate} onChangeText={setNextStepDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.text.faint} />

        <Text style={styles.label}>Tahmini Bütçe (₺)</Text>
        <TextInput style={styles.input} value={estimatedAmount} onChangeText={setEstimatedAmount} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.text.faint} />

        <View style={styles.compSection}>
          <View style={styles.compHeader}>
            <Ionicons name="business-outline" size={14} color="#f59e0b" />
            <Text style={styles.compTitle}>Rakip Bilgisi</Text>
          </View>

          <Text style={styles.label}>Rakip Firma</Text>
          <TextInput style={styles.input} value={compName} onChangeText={setCompName} placeholder="Firma adı" placeholderTextColor={colors.text.faint} />

          <Text style={styles.label}>Ürün/Hizmet</Text>
          <TextInput style={styles.input} value={compProducts} onChangeText={setCompProducts} placeholderTextColor={colors.text.faint} />

          <Text style={styles.label}>Fiyatlama</Text>
          <TextInput style={styles.input} value={compPricing} onChangeText={setCompPricing} placeholderTextColor={colors.text.faint} />

          <Text style={styles.label}>Notlar</Text>
          <TextInput
            style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
            multiline value={compNotes} onChangeText={setCompNotes}
            placeholderTextColor={colors.text.faint}
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
          <Ionicons name="save-outline" size={16} color="#fff" />
          <Text style={styles.saveText}>{editing ? 'Güncelle' : 'Kaydet'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  label: { color: colors.text.muted, fontSize: typography.xs, marginTop: spacing.sm, marginBottom: 4 },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: colors.text.primary, fontSize: typography.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  btn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  btnActive: { backgroundColor: brand.blueLight, borderColor: brand.blueLight },
  btnText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  btnTextActive: { color: '#fff' },
  compSection: { marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', backgroundColor: 'rgba(245, 158, 11, 0.06)' },
  compHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  compTitle: { color: '#f59e0b', fontWeight: '800', fontSize: typography.sm },
  saveBtn: { flexDirection: 'row', backgroundColor: brand.green, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.lg },
  saveText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
});
