// FormFillScreen — POZ-DEV-052, 053
// Dinamik form doldurma. Yeni cevap oluşturur veya mevcut cevabı revize eder.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';

import { colors, spacing, radius, typography, brand } from '../theme';
import { getTemplate } from '../services/formTemplates';
import {
  getResponse,
  createResponse,
  updateResponse,
} from '../services/formResponses';
import {
  FormTemplate,
  FormField,
  FormFieldValue,
  RootStackParamList,
} from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FormFill'>;
type Rt = RouteProp<RootStackParamList, 'FormFill'>;

export default function FormFillScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { templateId, workOrderId, responseId } = route.params;
  const isEdit = !!responseId;

  const [tpl, setTpl] = useState<FormTemplate | null>(null);
  const [values, setValues] = useState<Record<string, FormFieldValue>>({});
  const [reason, setReason] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await getTemplate(templateId);
      setTpl(t);
      if (isEdit && responseId) {
        const r = await getResponse(responseId);
        if (r) setValues(r.values);
      }
      setLoaded(true);
    })();
  }, [templateId, responseId, isEdit]);

  const setVal = (id: string, v: FormFieldValue) =>
    setValues(prev => ({ ...prev, [id]: v }));

  const validate = (): string | null => {
    if (!tpl) return 'Şablon yok';
    for (const f of tpl.fields) {
      if (!f.required) continue;
      const v = values[f.id];
      if (v === undefined || v === null || v === '' ||
        (Array.isArray(v) && v.length === 0)) {
        return `"${f.label}" zorunlu.`;
      }
    }
    return null;
  };

  const onSubmit = async () => {
    const err = validate();
    if (err) {
      Alert.alert('Eksik', err);
      return;
    }
    if (!tpl) return;
    if (isEdit && responseId) {
      await updateResponse(responseId, values, undefined, reason || 'Düzenleme');
      Alert.alert('Güncellendi', 'Form güncellendi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } else {
      const created = await createResponse({
        templateId: tpl.id,
        templateName: tpl.name,
        workOrderId,
        values,
      });
      Alert.alert('Kaydedildi', 'Form kaydedildi.', [
        {
          text: 'Detay',
          onPress: () =>
            navigation.replace('FormResponseDetail', { responseId: created.id }),
        },
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    }
  };

  const progress = useMemo(() => {
    if (!tpl || tpl.fields.length === 0) return 0;
    const filled = tpl.fields.filter(f => {
      const v = values[f.id];
      if (Array.isArray(v)) return v.length > 0;
      return v !== undefined && v !== null && v !== '';
    }).length;
    return Math.round((filled / tpl.fields.length) * 100);
  }, [tpl, values]);

  if (!loaded || !tpl) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loading}>{loaded ? 'Şablon bulunamadı.' : 'Yükleniyor…'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{tpl.name}</Text>
            <Text style={styles.subtitle}>
              {tpl.category} · {tpl.fields.length} alan · %{progress} tamam
            </Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {tpl.fields.map(f => (
            <FieldRenderer
              key={f.id}
              field={f}
              value={values[f.id]}
              onChange={v => setVal(f.id, v)}
            />
          ))}

          {isEdit && (
            <>
              <Text style={styles.label}>Revizyon Sebebi</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                style={styles.input}
                placeholder="Neden düzenlendi?"
                placeholderTextColor={colors.text.faint}
              />
            </>
          )}

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={onSubmit}
            activeOpacity={0.85}
          >
            <Ionicons name={isEdit ? 'save-outline' : 'checkmark-circle-outline'} size={18} color="#fff" />
            <Text style={styles.submitText}>
              {isEdit ? 'Revizyonu Kaydet' : 'Formu Tamamla'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: FormFieldValue;
  onChange: (v: FormFieldValue) => void;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>
        {field.label}
        {field.required ? <Text style={{ color: colors.rose.default }}> *</Text> : null}
      </Text>
      {field.helpText ? (
        <Text style={styles.helpText}>{field.helpText}</Text>
      ) : null}
      <FieldInput field={field} value={value} onChange={onChange} />
    </View>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: FormFieldValue;
  onChange: (v: FormFieldValue) => void;
}) {
  switch (field.type) {
    case 'text':
      return (
        <TextInput
          value={(value as string) ?? ''}
          onChangeText={onChange}
          style={styles.input}
          placeholder={field.placeholder ?? 'Metin girin'}
          placeholderTextColor={colors.text.faint}
        />
      );
    case 'note':
      return (
        <TextInput
          value={(value as string) ?? ''}
          onChangeText={onChange}
          style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
          placeholder={field.placeholder ?? 'Not yazın'}
          placeholderTextColor={colors.text.faint}
          multiline
        />
      );
    case 'number':
      return (
        <TextInput
          value={value === undefined || value === null ? '' : String(value)}
          onChangeText={t => onChange(t === '' ? null : Number(t.replace(',', '.')))}
          style={styles.input}
          placeholder="0"
          placeholderTextColor={colors.text.faint}
          keyboardType="decimal-pad"
        />
      );
    case 'date':
      return (
        <TextInput
          value={(value as string) ?? ''}
          onChangeText={onChange}
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.text.faint}
        />
      );
    case 'checkbox':
      return (
        <TouchableOpacity
          style={[styles.checkBtn, value ? styles.checkBtnActive : null]}
          onPress={() => onChange(!value)}
        >
          <Ionicons
            name={value ? 'checkbox' : 'square-outline'}
            size={20}
            color={value ? brand.green : colors.text.muted}
          />
          <Text style={styles.checkText}>{value ? 'Evet' : 'Hayır'}</Text>
        </TouchableOpacity>
      );
    case 'select':
      return (
        <View style={styles.optionRow}>
          {(field.options ?? []).map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.optionChip, value === opt && styles.optionChipActive]}
              onPress={() => onChange(opt)}
            >
              <Text
                style={[
                  styles.optionText,
                  value === opt && styles.optionTextActive,
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    case 'multiselect': {
      const arr = (value as string[]) ?? [];
      return (
        <View style={styles.optionRow}>
          {(field.options ?? []).map(opt => {
            const on = arr.includes(opt);
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.optionChip, on && styles.optionChipActive]}
                onPress={() =>
                  onChange(on ? arr.filter(x => x !== opt) : [...arr, opt])
                }
              >
                <Text style={[styles.optionText, on && styles.optionTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }
    case 'rating': {
      const score = (value as number) ?? 0;
      return (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity key={n} onPress={() => onChange(n)}>
              <Ionicons
                name={n <= score ? 'star' : 'star-outline'}
                size={28}
                color="#eab308"
              />
            </TouchableOpacity>
          ))}
        </View>
      );
    }
    case 'photo': {
      const uri = (value as string) ?? '';
      const pick = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('İzin', 'Galeri izni gerekli.');
          return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
        });
        if (!res.canceled && res.assets[0]) onChange(res.assets[0].uri);
      };
      const camera = async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('İzin', 'Kamera izni gerekli.');
          return;
        }
        const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
        if (!res.canceled && res.assets[0]) onChange(res.assets[0].uri);
      };
      return (
        <View>
          {uri ? (
            <Image source={{ uri }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Ionicons name="image-outline" size={28} color={colors.text.faint} />
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
            <TouchableOpacity style={styles.smallBtn} onPress={camera}>
              <Ionicons name="camera-outline" size={14} color={brand.green} />
              <Text style={styles.smallBtnText}>Çek</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallBtn} onPress={pick}>
              <Ionicons name="image-outline" size={14} color={brand.green} />
              <Text style={styles.smallBtnText}>Galeri</Text>
            </TouchableOpacity>
            {uri ? (
              <TouchableOpacity
                style={[styles.smallBtn, { borderColor: colors.rose.default }]}
                onPress={() => onChange(null)}
              >
                <Ionicons name="trash-outline" size={14} color={colors.rose.default} />
                <Text style={[styles.smallBtnText, { color: colors.rose.default }]}>
                  Sil
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      );
    }
    case 'signature':
      return (
        <View>
          <TextInput
            value={(value as string) ?? ''}
            onChangeText={onChange}
            style={styles.input}
            placeholder="Ad Soyad (imza)"
            placeholderTextColor={colors.text.faint}
          />
          {value ? (
            <Text style={styles.sigPreview}>✍ {String(value)}</Text>
          ) : null}
        </View>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  loading: { color: colors.text.muted, padding: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  subtitle: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  progressBar: {
    height: 4,
    backgroundColor: colors.bg.secondary,
    marginHorizontal: spacing.lg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: brand.green },
  content: { padding: spacing.lg, paddingBottom: 100, gap: spacing.md },
  fieldWrap: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 8,
  },
  fieldLabel: {
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: typography.sm,
  },
  helpText: { color: colors.text.faint, fontSize: typography.xs },
  label: {
    color: colors.text.muted,
    fontSize: typography.xs,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.bg.primary,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: typography.sm,
  },
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
  },
  checkBtnActive: { borderColor: brand.green, backgroundColor: colors.emerald.bg },
  checkText: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.bg.primary,
  },
  optionChipActive: { backgroundColor: brand.green, borderColor: brand.green },
  optionText: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  optionTextActive: { color: '#fff' },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.bg.primary,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderStyle: 'dashed',
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: brand.green,
  },
  smallBtnText: { color: brand.green, fontSize: typography.xs, fontWeight: '700' },
  sigPreview: {
    color: colors.text.secondary,
    fontSize: typography.xs,
    marginTop: 6,
    fontStyle: 'italic',
  },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: brand.green,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.lg,
  },
  submitText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
});
