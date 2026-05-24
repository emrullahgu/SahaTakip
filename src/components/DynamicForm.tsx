import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, radius, typography, brand } from '../theme';
import type { FormField, FormFieldValue } from '../types';

interface DynamicFormProps {
  fields: FormField[];
  onSave: (values: Record<string, FormFieldValue>) => void;
  initialValues?: Record<string, FormFieldValue>;
}

export default function DynamicForm({ fields, onSave, initialValues = {} }: DynamicFormProps) {
  const [values, setValues] = useState<Record<string, FormFieldValue>>(initialValues);

  const update = (id: string, val: FormFieldValue) => {
    setValues(prev => ({ ...prev, [id]: val }));
  };

  const pickPhoto = async (id: string) => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled && res.assets[0]) update(id, res.assets[0].uri);
  };

  return (
    <View style={styles.container}>
      {fields.map(field => (
        <View key={field.id} style={styles.fieldWrap}>
          <Text style={styles.label}>
            {field.label} {field.required && <Text style={{ color: colors.rose.default }}>*</Text>}
          </Text>

          {field.type === 'text' || field.type === 'note' ? (
            <TextInput
              style={[styles.input, field.type === 'note' && { minHeight: 80, textAlignVertical: 'top' }]}
              value={String(values[field.id] || '')}
              onChangeText={v => update(field.id, v)}
              placeholder={field.placeholder}
              placeholderTextColor={colors.text.faint}
              multiline={field.type === 'note'}
            />
          ) : field.type === 'number' ? (
            <TextInput
              style={styles.input}
              value={String(values[field.id] || '')}
              onChangeText={v => update(field.id, parseFloat(v) || 0)}
              keyboardType="numeric"
              placeholder="0"
            />
          ) : field.type === 'checkbox' ? (
            <View style={styles.row}>
              <Switch
                value={!!values[field.id]}
                onValueChange={v => update(field.id, v)}
                trackColor={{ false: colors.bg.card, true: brand.green }}
              />
              <Text style={styles.switchLabel}>{!!values[field.id] ? 'Evet' : 'Hayır'}</Text>
            </View>
          ) : field.type === 'select' ? (
            <View style={styles.selectRow}>
              {field.options?.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.chip,
                    values[field.id] === opt && styles.chipActive
                  ]}
                  onPress={() => update(field.id, opt)}
                >
                  <Text style={[styles.chipText, values[field.id] === opt && styles.chipTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : field.type === 'rating' ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => update(field.id, n)}>
                  <Ionicons name={n <= (values[field.id] as number || 0) ? 'star' : 'star-outline'} size={28} color="#eab308" />
                </TouchableOpacity>
              ))}
            </View>
          ) : field.type === 'photo' ? (
            <View>
              {values[field.id] ? (
                <Image source={{ uri: values[field.id] as string }} style={styles.photo} />
              ) : (
                <TouchableOpacity style={styles.photoPlaceholder} onPress={() => pickPhoto(field.id)}>
                  <Ionicons name="camera-outline" size={32} color={colors.text.faint} />
                  <Text style={styles.photoText}>Fotoğraf Seç</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.unsupported}>
              <Text style={styles.unsupportedText}>{field.type} tipi yakında eklenecek...</Text>
            </View>
          )}
          {field.helpText && <Text style={styles.help}>{field.helpText}</Text>}
        </View>
      ))}

      <TouchableOpacity
        style={styles.saveBtn}
        onPress={() => onSave(values)}
      >
        <Text style={styles.saveBtnText}>Kaydet</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  fieldWrap: { gap: 6 },
  label: { fontSize: typography.xs, color: colors.text.muted, fontWeight: '700' },
  input: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text.primary,
    fontSize: typography.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchLabel: { color: colors.text.secondary, fontSize: typography.sm },
  selectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.bg.secondary,
  },
  chipActive: { backgroundColor: brand.green, borderColor: brand.green },
  chipText: { color: colors.text.muted, fontSize: 11, fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '800' },
  help: { fontSize: 10, color: colors.text.faint, marginTop: 2 },
  unsupported: { padding: 10, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border.primary },
  unsupportedText: { color: colors.text.faint, fontSize: 10 },
  photo: { width: '100%', height: 180, borderRadius: radius.md },
  photoPlaceholder: { height: 100, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border.primary, alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoText: { color: colors.text.faint, fontSize: 10 },
  saveBtn: {
    backgroundColor: brand.green,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
});
