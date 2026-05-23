// FormResponseDetailScreen — POZ-DEV-053
// Tek bir form cevabını + revizyon geçmişini gösterir; düzenleme/silme.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  getResponse,
  listRevisionsByResponse,
  deleteResponse,
} from '../services/formResponses';
import { getTemplate } from '../services/formTemplates';
import {
  FormResponse,
  FormResponseRevision,
  FormTemplate,
  RootStackParamList,
} from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FormResponseDetail'>;
type Rt = RouteProp<RootStackParamList, 'FormResponseDetail'>;

export default function FormResponseDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { responseId } = route.params;

  const [resp, setResp] = useState<FormResponse | null>(null);
  const [tpl, setTpl] = useState<FormTemplate | null>(null);
  const [revs, setRevs] = useState<FormResponseRevision[]>([]);

  const load = useCallback(async () => {
    const r = await getResponse(responseId);
    setResp(r);
    if (r) {
      const t = await getTemplate(r.templateId);
      setTpl(t);
      const rv = await listRevisionsByResponse(r.id);
      setRevs(rv);
    }
  }, [responseId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onDelete = () => {
    if (!resp) return;
    Alert.alert('Sil', 'Bu form cevabı silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteResponse(resp.id);
          navigation.goBack();
        },
      },
    ]);
  };

  if (!resp) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loading}>Yükleniyor…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.title}>{resp.templateName}</Text>
          <Text style={styles.meta}>
            Rev #{resp.revision} · {new Date(resp.updatedAt).toLocaleString('tr-TR')}
          </Text>
          {resp.workOrderId ? (
            <Text style={styles.meta}>İş Emri: {resp.workOrderId}</Text>
          ) : null}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() =>
              navigation.navigate('FormFill', {
                templateId: resp.templateId,
                workOrderId: resp.workOrderId,
                responseId: resp.id,
              })
            }
          >
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={styles.editBtnText}>Düzenle / Revize Et</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.delBtn} onPress={onDelete}>
            <Ionicons name="trash-outline" size={16} color={colors.rose.default} />
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>Cevaplar</Text>
        {tpl ? (
          tpl.fields.map(f => {
            const v = resp.values[f.id];
            return (
              <View key={f.id} style={styles.row}>
                <Text style={styles.rowLabel}>{f.label}</Text>
                <ValueView field={f.type} value={v} />
              </View>
            );
          })
        ) : (
          <Text style={styles.muted}>(şablon bulunamadı)</Text>
        )}

        <Text style={styles.section}>Revizyon Geçmişi ({revs.length})</Text>
        {revs.map(r => (
          <View key={r.id} style={styles.revRow}>
            <View style={styles.revBadge}>
              <Text style={styles.revBadgeText}>#{r.revision}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.revText}>
                {new Date(r.editedAt).toLocaleString('tr-TR')}
              </Text>
              {r.reason ? <Text style={styles.revReason}>{r.reason}</Text> : null}
              {r.editedBy ? (
                <Text style={styles.revMeta}>{r.editedBy}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ValueView({ field, value }: { field: string; value: any }) {
  if (value === undefined || value === null || value === '') {
    return <Text style={styles.muted}>—</Text>;
  }
  if (field === 'photo' && typeof value === 'string') {
    return <Image source={{ uri: value }} style={styles.thumb} />;
  }
  if (field === 'signature') {
    return <Text style={styles.sigVal}>✍ {String(value)}</Text>;
  }
  if (field === 'rating') {
    const n = Number(value) || 0;
    return (
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Ionicons
            key={i}
            name={i <= n ? 'star' : 'star-outline'}
            size={14}
            color="#eab308"
          />
        ))}
      </View>
    );
  }
  if (field === 'checkbox') {
    return (
      <Text style={[styles.val, { color: value ? brand.green : colors.rose.default }]}>
        {value ? 'Evet' : 'Hayır'}
      </Text>
    );
  }
  if (Array.isArray(value)) {
    return <Text style={styles.val}>{value.join(', ')}</Text>;
  }
  return <Text style={styles.val}>{String(value)}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  loading: { color: colors.text.muted, padding: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 80 },
  headerCard: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  title: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 8 },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.indigo.default,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  editBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  delBtn: {
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.rose.default,
    borderRadius: radius.md,
  },
  section: {
    color: colors.text.primary,
    fontWeight: '800',
    fontSize: typography.sm,
    marginTop: spacing.md,
  },
  row: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 6,
  },
  rowLabel: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  val: { color: colors.text.primary, fontSize: typography.sm },
  muted: { color: colors.text.faint, fontStyle: 'italic', fontSize: typography.xs },
  thumb: { width: '100%', height: 160, borderRadius: radius.sm },
  sigVal: { color: colors.text.primary, fontStyle: 'italic' },
  revRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  revBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.indigo.bg,
    borderWidth: 1,
    borderColor: colors.indigo.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revBadgeText: { color: brand.blueLight, fontWeight: '800', fontSize: typography.xs },
  revText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  revReason: { color: colors.text.secondary, fontSize: typography.xs, marginTop: 2 },
  revMeta: { color: colors.text.muted, fontSize: typography.xs },
});
