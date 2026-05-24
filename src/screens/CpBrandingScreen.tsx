// Faz 48 — CpBrandingScreen (POZ-DEV-189)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getCpBranding, updateCpBranding } from '../services/customerPortal';
import type { CpBrandingConfig } from '../types';

const COLOR_PALETTE = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#facc15', '#8b5cf6', '#14b8a6'];
const EMOJI_LIST = ['⚡', '🔧', '🏭', '⚙️', '🔌', '💡', '🛠️', '🏗️', '☀️', '🔋'];

export default function CpBrandingScreen() {
  const [b, setB] = useState<CpBrandingConfig | null>(null);

  useFocusEffect(useCallback(() => { (async () => setB(await getCpBranding()))(); }, []));

  if (!b) return <SafeAreaView style={s.safe} />;

  const save = async () => {
    await updateCpBranding(b);
    Alert.alert('Kaydedildi', 'Marka ayarları güncellendi.');
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.preview, { backgroundColor: b.primaryColor + '22', borderColor: b.primaryColor }]}>
          <Text style={[s.previewLogo, { color: b.primaryColor }]}>{b.logoEmoji}</Text>
          <Text style={s.previewName}>{b.brandName}</Text>
          <Text style={s.previewGreet}>{b.greeting}</Text>
          <View style={s.btnRow}>
            <View style={[s.previewBtn, { backgroundColor: b.primaryColor }]}>
              <Text style={s.previewBtnT}>Birincil</Text>
            </View>
            <View style={[s.previewBtn, { backgroundColor: b.secondaryColor }]}>
              <Text style={s.previewBtnT}>İkincil</Text>
            </View>
          </View>
          <Text style={s.previewFooter}>{b.footerText}</Text>
        </View>

        <Text style={s.lbl}>Marka Adı</Text>
        <TextInput style={s.input} value={b.brandName} onChangeText={t => setB({ ...b, brandName: t })} />

        <Text style={s.lbl}>Karşılama Mesajı</Text>
        <TextInput style={[s.input, { minHeight: 60 }]} value={b.greeting} onChangeText={t => setB({ ...b, greeting: t })} multiline />

        <Text style={s.lbl}>Logo Emoji</Text>
        <View style={s.emojis}>
          {EMOJI_LIST.map(e => (
            <TouchableOpacity key={e} style={[s.emojiBox, b.logoEmoji === e && { borderColor: b.primaryColor, borderWidth: 2 }]} onPress={() => setB({ ...b, logoEmoji: e })}>
              <Text style={s.emojiT}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.lbl}>Birincil Renk</Text>
        <View style={s.palette}>
          {COLOR_PALETTE.map(c => (
            <TouchableOpacity key={'p' + c} style={[s.swatch, { backgroundColor: c }, b.primaryColor === c && s.swatchActive]} onPress={() => setB({ ...b, primaryColor: c })}>
              {b.primaryColor === c && <Ionicons name="checkmark" size={16} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.lbl}>İkincil Renk</Text>
        <View style={s.palette}>
          {COLOR_PALETTE.map(c => (
            <TouchableOpacity key={'s' + c} style={[s.swatch, { backgroundColor: c }, b.secondaryColor === c && s.swatchActive]} onPress={() => setB({ ...b, secondaryColor: c })}>
              {b.secondaryColor === c && <Ionicons name="checkmark" size={16} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.lbl}>Alt Bilgi Metni</Text>
        <TextInput style={s.input} value={b.footerText} onChangeText={t => setB({ ...b, footerText: t })} />

        <TouchableOpacity style={[s.saveBtn, { backgroundColor: b.primaryColor }]} onPress={save}>
          <Ionicons name="save" size={18} color="#fff" />
          <Text style={s.saveT}>Kaydet</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  preview: { padding: spacing.md, borderRadius: radius.md, borderWidth: 2, alignItems: 'center', gap: 6 },
  previewLogo: { fontSize: 48 },
  previewName: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  previewGreet: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center' },
  btnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  previewBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.sm },
  previewBtnT: { color: '#fff', fontSize: typography.xs, fontWeight: '800' },
  previewFooter: { color: colors.text.faint, fontSize: typography.xs, marginTop: 4 },
  lbl: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700', marginTop: spacing.sm },
  input: { backgroundColor: colors.bg.secondary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  emojis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBox: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, alignItems: 'center', justifyContent: 'center' },
  emojiT: { fontSize: 24 },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  swatchActive: { borderWidth: 3, borderColor: '#fff' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: spacing.sm, borderRadius: radius.md, marginTop: spacing.md },
  saveT: { color: '#fff', fontSize: typography.base, fontWeight: '800' },
});
