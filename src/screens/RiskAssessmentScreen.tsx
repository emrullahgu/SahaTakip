// Faz 45 — RiskAssessmentScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { RiskAssessment as RiskRec } from '../types';
import { listRisks, createRisk, riskColor, riskLabel } from '../services/quality';

export default function RiskAssessmentScreen() {
  const [items, setItems] = useState<RiskRec[]>([]);
  const [modal, setModal] = useState(false);

  const [hazard, setHazard] = useState('');
  const [location, setLocation] = useState('');
  const [likelihood, setLikelihood] = useState(3);
  const [severity, setSeverity] = useState(3);
  const [controls, setControls] = useState('');
  const [residual, setResidual] = useState(2);
  const [owner, setOwner] = useState('');

  const load = useCallback(async () => { setItems(await listRisks()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onSave = async () => {
    if (!hazard.trim() || !location.trim() || !owner.trim()) { Alert.alert('Eksik', 'Tehlike, lokasyon ve sorumlu gerekli.'); return; }
    await createRisk({ hazard, location, likelihood, severity, controls, residualScore: residual, owner });
    setHazard(''); setLocation(''); setControls(''); setOwner(''); setLikelihood(3); setSeverity(3); setResidual(2);
    setModal(false); load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => {
          const c = riskColor(item.score);
          const rc = riskColor(item.residualScore);
          return (
            <View style={[s.card, { borderLeftColor: c }]}>
              <View style={[s.scoreBadge, { backgroundColor: c }]}>
                <Text style={s.scoreV}>{item.score}</Text>
                <Text style={s.scoreL}>risk</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{item.hazard}</Text>
                <Text style={s.meta}>{item.location} · {item.owner}</Text>
                <Text style={s.formula}>O:{item.likelihood} × Ş:{item.severity} = {item.score} ({riskLabel(item.score)})</Text>
                <Text style={s.ctl} numberOfLines={2}>Kontrol: {item.controls}</Text>
                <View style={s.residRow}>
                  <Text style={s.residL}>Artık risk:</Text>
                  <View style={[s.residBadge, { backgroundColor: rc }]}><Text style={s.residV}>{item.residualScore} · {riskLabel(item.residualScore)}</Text></View>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={s.empty}>Risk değerlendirmesi yok.</Text>}
      />
      <TouchableOpacity style={s.fab} onPress={() => setModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={s.modalBack}>
          <View style={s.modal}>
            <Text style={s.mTitle}>Yeni Risk Değerlendirme</Text>
            <ScrollView style={{ maxHeight: 480 }}>
              <TextInput style={s.input} value={hazard} onChangeText={setHazard} placeholder="Tehlike" placeholderTextColor={colors.text.faint} />
              <TextInput style={s.input} value={location} onChangeText={setLocation} placeholder="Lokasyon" placeholderTextColor={colors.text.faint} />
              <Text style={s.lbl}>Olasılık (1-5)</Text>
              <View style={s.row}>
                {[1, 2, 3, 4, 5].map(v => (
                  <TouchableOpacity key={v} style={[s.pill, likelihood === v && { backgroundColor: '#0ea5e9' }]} onPress={() => setLikelihood(v)}>
                    <Text style={[s.pillT, likelihood === v && s.pillTOn]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.lbl}>Şiddet (1-5)</Text>
              <View style={s.row}>
                {[1, 2, 3, 4, 5].map(v => (
                  <TouchableOpacity key={v} style={[s.pill, severity === v && { backgroundColor: '#ef4444' }]} onPress={() => setSeverity(v)}>
                    <Text style={[s.pillT, severity === v && s.pillTOn]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={[s.preview, { backgroundColor: riskColor(likelihood * severity) }]}>
                <Text style={s.preT}>Skor: {likelihood * severity} — {riskLabel(likelihood * severity)}</Text>
              </View>
              <TextInput style={[s.input, { height: 70 }]} value={controls} onChangeText={setControls} placeholder="Kontrol önlemleri" multiline placeholderTextColor={colors.text.faint} />
              <Text style={s.lbl}>Artık Risk (1-25)</Text>
              <TextInput style={s.input} value={String(residual)} onChangeText={v => setResidual(Number(v) || 0)} keyboardType="numeric" placeholderTextColor={colors.text.faint} />
              <TextInput style={s.input} value={owner} onChangeText={setOwner} placeholder="Sorumlu" placeholderTextColor={colors.text.faint} />
            </ScrollView>
            <View style={s.actions}>
              <TouchableOpacity style={[s.act, { backgroundColor: colors.bg.primary }]} onPress={() => setModal(false)}>
                <Text style={s.actT}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.act, { backgroundColor: '#f97316' }]} onPress={onSave}>
                <Text style={s.actT}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  scoreBadge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  scoreV: { color: '#fff', fontSize: typography.lg, fontWeight: '800' },
  scoreL: { color: '#fff', fontSize: 9 },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  formula: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
  ctl: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  residRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  residL: { color: colors.text.faint, fontSize: 10 },
  residBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  residV: { color: '#fff', fontSize: 10, fontWeight: '800' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 56, height: 56, borderRadius: 28, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.md },
  modal: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  mTitle: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, marginBottom: 6 },
  lbl: { color: colors.text.muted, fontSize: typography.xs, marginTop: 6, marginBottom: 4, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { width: 40, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary, alignItems: 'center' },
  pillT: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  pillTOn: { color: '#fff' },
  preview: { padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center', marginTop: 8 },
  preT: { color: '#fff', fontSize: typography.sm, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  act: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  actT: { color: '#fff', fontWeight: '800' },
});
