// SearchFilterBar — POZ-DEV-097 reusable advanced search + filter chips
import React from 'react';
import { View, TextInput, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';

export interface FilterChip {
  key: string;
  label: string;
  count?: number;
}

interface Props {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  chips?: FilterChip[];
  activeKey?: string;
  onChipPress?: (key: string) => void;
}

export default function SearchFilterBar({ value, onChange, placeholder = 'Ara…', chips, activeKey, onChipPress }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={16} color={colors.text.faint} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.text.faint}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChange('')}>
            <Ionicons name="close-circle" size={16} color={colors.text.faint} />
          </TouchableOpacity>
        )}
      </View>
      {chips && chips.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={{ paddingRight: spacing.lg }}>
          {chips.map(c => {
            const active = c.key === activeKey;
            return (
              <TouchableOpacity key={c.key} style={[styles.chip, active && styles.chipActive]} onPress={() => onChipPress?.(c.key)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
                {typeof c.count === 'number' && (
                  <View style={[styles.countPill, active && styles.countPillActive]}>
                    <Text style={[styles.countText, active && styles.countTextActive]}>{c.count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  input: { flex: 1, color: colors.text.primary, fontSize: typography.sm, padding: 0 },
  chipsScroll: { marginTop: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary, marginRight: 6 },
  chipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipText: { color: colors.text.muted, fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  countPill: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, minWidth: 18, alignItems: 'center' },
  countPillActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  countText: { color: colors.text.muted, fontSize: 10, fontWeight: '700' },
  countTextActive: { color: '#fff' },
});
