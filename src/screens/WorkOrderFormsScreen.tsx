// WorkOrderFormsScreen — POZ-DEV-052
// İş emrine bağlı doldurulmuş formların listesi + yeni form doldurma.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { listResponsesByWorkOrder } from '../services/formResponses';
import { listTemplates, ensureSeeded } from '../services/formTemplates';
import { FormResponse, FormTemplate, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'WorkOrderForms'>;
type Rt = RouteProp<RootStackParamList, 'WorkOrderForms'>;

export default function WorkOrderFormsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { workOrderId } = route.params;

  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(async () => {
    await ensureSeeded();
    const [rs, ts] = await Promise.all([
      listResponsesByWorkOrder(workOrderId),
      listTemplates(),
    ]);
    setResponses(rs);
    setTemplates(ts);
  }, [workOrderId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const pickAndFill = (tpl: FormTemplate) => {
    setPickerOpen(false);
    navigation.navigate('FormFill', { templateId: tpl.id, workOrderId });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.toolbar}>
        <Text style={styles.title}>İş Emri Formları ({responses.length})</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => setPickerOpen(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.newBtnText}>Form Doldur</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {responses.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={42} color={colors.text.faint} />
            <Text style={styles.emptyText}>Henüz form doldurulmamış.</Text>
          </View>
        ) : (
          responses.map(r => (
            <TouchableOpacity
              key={r.id}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('FormResponseDetail', { responseId: r.id })
              }
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: colors.emerald.bg, borderColor: colors.emerald.border },
                ]}
              >
                <Ionicons name="checkmark-done-outline" size={18} color={brand.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{r.templateName}</Text>
                <Text style={styles.cardMeta}>
                  Rev #{r.revision} · {new Date(r.updatedAt).toLocaleString('tr-TR')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Şablon Seç</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <Ionicons name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              {templates.length === 0 ? (
                <Text style={styles.muted}>Şablon yok. Önce şablon oluşturun.</Text>
              ) : (
                templates.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.tplRow}
                    onPress={() => pickAndFill(t)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tplName}>{t.name}</Text>
                      <Text style={styles.tplMeta}>
                        {t.category} · {t.fields.length} alan
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => {
                setPickerOpen(false);
                navigation.navigate('FormTemplates');
              }}
            >
              <Ionicons name="settings-outline" size={14} color={brand.green} />
              <Text style={styles.manageText}>Şablonları Yönet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  title: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: brand.green,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 80 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.muted, fontSize: typography.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  cardMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.lg,
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  tplRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  tplName: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  tplMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  muted: { color: colors.text.faint, fontStyle: 'italic', paddingVertical: 14 },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: brand.green,
    borderRadius: radius.md,
  },
  manageText: { color: brand.green, fontSize: typography.xs, fontWeight: '800' },
});
