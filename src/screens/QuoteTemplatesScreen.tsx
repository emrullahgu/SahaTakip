// ====================================================================
// QuoteTemplatesScreen — POZ-DEV-041
// ====================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, brand } from '../theme';
import { QuoteTemplate, RootStackParamList, Quote, QuoteLine } from '../types';
import {
  listQuoteTemplates,
  deleteQuoteTemplate,
  templateToLines,
  upsertQuoteTemplate,
} from '../services/quoteTemplates';
import { useAppContext, calcQuoteTotals } from '../context/AppContext';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function QuoteTemplatesScreen() {
  const navigation = useNavigation<NavProp>();
  const { addQuote, generateQuoteNumber, showToast, quotes } = useAppContext();
  const [list, setList] = useState<QuoteTemplate[]>([]);

  // New-template modal state
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [defaultTitle, setDefaultTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [sourceQuoteId, setSourceQuoteId] = useState<string | null>(null);
  const [showQuotePicker, setShowQuotePicker] = useState(false);

  const resetForm = () => {
    setName(''); setCategory(''); setDefaultTitle(''); setNotes(''); setSourceQuoteId(null);
  };

  const handleSaveTemplate = async () => {
    if (!name.trim()) {
      Alert.alert('Eksik', 'Şablon adı giriniz.');
      return;
    }
    let lines: Omit<QuoteLine, 'lineNo'>[] = [];
    if (sourceQuoteId) {
      const src = quotes.find(q => q.id === sourceQuoteId);
      if (src) lines = src.lines.map(({ lineNo, ...rest }) => rest);
    }
    const t: QuoteTemplate = {
      id: `tpl-${Date.now()}`,
      name: name.trim(),
      category: category.trim() || undefined,
      defaultTitle: defaultTitle.trim() || undefined,
      notes: notes.trim() || undefined,
      lines,
    };
    await upsertQuoteTemplate(t);
    showToast(`${t.name} şablonu eklendi (${lines.length} kalem).`);
    setShowNew(false);
    resetForm();
    reload();
  };

  const reload = async () => setList(await listQuoteTemplates());
  useEffect(() => {
    reload();
  }, []);

  const useTemplate = (t: QuoteTemplate) => {
    const lines = templateToLines(t);
    const totals = calcQuoteTotals(lines);
    const number = generateQuoteNumber();
    const q: Quote = {
      id: `q-${Date.now()}`,
      number,
      customerName: '',
      customerTitle: '',
      title: t.defaultTitle || t.name,
      date: new Date().toISOString().slice(0, 10),
      engineer: '',
      lines,
      status: 'Taslak',
      notes: t.notes,
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      grandTotal: totals.grandTotal,
      templateId: t.id,
    };
    addQuote(q);
    showToast(`${t.name} şablonu kullanıldı.`);
    navigation.navigate('NewQuote', { quoteId: q.id });
  };

  const remove = (id: string) => {
    Alert.alert('Sil?', 'Bu şablon silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteQuoteTemplate(id);
          reload();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 12 }}>
      <View style={styles.topBar}>
        <Text style={styles.helper}>
          Şablonu seçtiğinizde yeni bir teklif oluşturulup içine kalemler doldurulur.
        </Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => setShowNew(true)} activeOpacity={0.85}>
          <Ionicons name="add-circle" size={16} color="#fff" />
          <Text style={styles.newBtnText}>Yeni Şablon</Text>
        </TouchableOpacity>
      </View>
      {list.length === 0 && <Text style={styles.empty}>Şablon yok.</Text>}
      {list.map(t => (
        <View key={t.id} style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t.name}</Text>
            {t.category && <Text style={styles.cat}>{t.category}</Text>}
            <Text style={styles.meta}>{t.lines.length} kalem</Text>
            {t.notes && <Text style={styles.notes} numberOfLines={2}>{t.notes}</Text>}
          </View>
          <View style={{ gap: 6 }}>
            <TouchableOpacity style={styles.useBtn} onPress={() => useTemplate(t)}>
              <Ionicons name="add-circle-outline" size={16} color={colors.bg.primary} />
              <Text style={styles.useText}>Kullan</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => remove(t.id)} style={{ alignSelf: 'center' }}>
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* NEW TEMPLATE MODAL */}
      <Modal visible={showNew} transparent animationType="slide" onRequestClose={() => setShowNew(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Şablon</Text>
              <TouchableOpacity onPress={() => { setShowNew(false); resetForm(); }}>
                <Ionicons name="close" size={22} color={colors.text.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }}>
              <Text style={styles.fieldLabel}>Şablon Adı *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Örn: Kompanzasyon Standart"
                placeholderTextColor={colors.text.faint}
              />

              <Text style={styles.fieldLabel}>Kategori</Text>
              <TextInput
                style={styles.input}
                value={category}
                onChangeText={setCategory}
                placeholder="Örn: Kompanzasyon / YG / Kablo Tava"
                placeholderTextColor={colors.text.faint}
              />

              <Text style={styles.fieldLabel}>Varsayılan Teklif Başlığı</Text>
              <TextInput
                style={styles.input}
                value={defaultTitle}
                onChangeText={setDefaultTitle}
                placeholder="Şablon kullanıldığında otomatik başlık"
                placeholderTextColor={colors.text.faint}
              />

              <Text style={styles.fieldLabel}>Notlar</Text>
              <TextInput
                style={[styles.input, { minHeight: 70 }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Şablon açıklaması (opsiyonel)"
                placeholderTextColor={colors.text.faint}
                multiline
              />

              <Text style={styles.fieldLabel}>Kalemler</Text>
              <TouchableOpacity
                style={styles.sourcePicker}
                onPress={() => setShowQuotePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text-outline" size={16} color={brand.green} />
                <Text style={styles.sourcePickerText}>
                  {sourceQuoteId
                    ? `Kaynak teklif: ${quotes.find(q => q.id === sourceQuoteId)?.number ?? sourceQuoteId} (${quotes.find(q => q.id === sourceQuoteId)?.lines.length ?? 0} kalem)`
                    : 'Mevcut tekliften kalem kopyala (opsiyonel)'}
                </Text>
                {sourceQuoteId && (
                  <TouchableOpacity onPress={() => setSourceQuoteId(null)} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.text.faint} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
              <Text style={styles.helperSmall}>
                Kalem seçmezseniz boş bir şablon oluşturulur (sonra düzenleyebilirsiniz).
              </Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowNew(false); resetForm(); }}
              >
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTemplate}>
                <Ionicons name="save-outline" size={16} color="#fff" />
                <Text style={styles.saveBtnText}>Şablonu Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QUOTE PICKER MODAL */}
      <Modal visible={showQuotePicker} transparent animationType="slide" onRequestClose={() => setShowQuotePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Kaynak Teklif Seç</Text>
              <TouchableOpacity onPress={() => setShowQuotePicker(false)}>
                <Ionicons name="close" size={22} color={colors.text.muted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={quotes}
              keyExtractor={q => q.id}
              ListEmptyComponent={() => (
                <Text style={styles.empty}>Henüz teklif yok.</Text>
              )}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.quoteItem}
                  onPress={() => {
                    setSourceQuoteId(item.id);
                    setShowQuotePicker(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{item.number} · {item.customerName}</Text>
                    <Text style={styles.meta} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.meta}>{item.lines.length} kalem · ₺{item.grandTotal?.toLocaleString('tr-TR')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.text.faint} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
  helper: { color: colors.text.muted, fontSize: 12, flex: 1 },
  helperSmall: { color: colors.text.faint, fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: brand.green, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 30 },
  card: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: colors.bg.secondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.primary,
    marginBottom: 10,
    gap: 12,
  },
  title: { color: colors.text.primary, fontWeight: '800', fontSize: 14 },
  cat: { color: brand.green, fontSize: 11, fontWeight: '700', marginTop: 2 },
  meta: { color: colors.text.muted, fontSize: 11, marginTop: 4 },
  notes: { color: colors.text.secondary, fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  useBtn: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: brand.green,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  useText: { color: colors.bg.primary, fontWeight: '800', fontSize: 12 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bg.primary,
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
    padding: 16, maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.primary, marginBottom: 10,
  },
  modalTitle: { color: colors.text.primary, fontWeight: '800', fontSize: 16 },
  fieldLabel: { color: colors.text.secondary, fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1, borderColor: colors.border.primary,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    color: colors.text.primary, fontSize: 13,
  },
  sourcePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1, borderColor: colors.border.primary,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12,
  },
  sourcePickerText: { color: colors.text.primary, fontSize: 12, flex: 1 },
  quoteItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.primary,
  },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    backgroundColor: colors.bg.secondary, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border.primary,
  },
  cancelBtnText: { color: colors.text.primary, fontWeight: '700', fontSize: 13 },
  saveBtn: {
    flex: 2, flexDirection: 'row', gap: 6, paddingVertical: 12, borderRadius: 8,
    backgroundColor: brand.green, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
