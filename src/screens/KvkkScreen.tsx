// KvkkScreen — POZ-DEV-105
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import { getKvkkSettings, recordConsent, updateKvkkText } from '../services/security';
import { KvkkSettings } from '../types';

function fmt(iso: string): string { try { return new Date(iso).toLocaleString('tr-TR'); } catch { return iso; } }

export default function KvkkScreen() {
  const [s, setS] = useState<KvkkSettings | null>(null);
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState('');
  const [version, setVersion] = useState('');
  const [showConsents, setShowConsents] = useState(false);

  const refresh = useCallback(async () => {
    const x = await getKvkkSettings();
    setS(x); setText(x.text); setVersion(x.currentVersion);
  }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onSave = async () => {
    if (!text.trim() || !version.trim()) { Alert.alert('Eksik', 'Metin ve versiyon zorunlu.'); return; }
    const next = await updateKvkkText(text.trim(), version.trim());
    setS(next); setEdit(false);
    Alert.alert('Kaydedildi', 'KVKK metni güncellendi. Yeni onaylar bu sürüm üzerinden alınacak.');
  };

  const onAcceptDemo = async () => {
    if (!s) return;
    await recordConsent({ userId: 'demo-current-user', userName: 'Demo Kullanıcı', version: s.currentVersion, ip: '127.0.0.1' });
    await refresh();
    Alert.alert('Onay', 'Demo onay kaydedildi.');
  };

  if (!s) return <SafeAreaView style={styles.safe}><Text style={{ color: colors.text.muted, padding: spacing.lg }}>Yükleniyor…</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>KVKK Aydınlatma Metni</Text>
            <Text style={styles.headerSub}>Sürüm {s.currentVersion} · {fmt(s.updatedAt)}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#0ea5e9' }]} onPress={() => setEdit(true)}>
            <Ionicons name="create-outline" size={14} color="#fff" />
            <Text style={styles.btnText}>Düzenle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: brand.green }]} onPress={onAcceptDemo}>
            <Ionicons name="checkmark-outline" size={14} color="#fff" />
            <Text style={styles.btnText}>Demo Onay Ekle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#8b5cf6' }]} onPress={() => setShowConsents(true)}>
            <Ionicons name="list-outline" size={14} color="#fff" />
            <Text style={styles.btnText}>Onaylar ({s.consents.length})</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.textCard}>
          <Text style={styles.bodyText}>{s.text}</Text>
        </View>
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={edit} animationType="slide" transparent onRequestClose={() => setEdit(false)}>
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>KVKK Metnini Düzenle</Text>
              <Text style={styles.fLabel}>Sürüm</Text>
              <TextInput style={styles.input} value={version} onChangeText={setVersion} placeholder="v1.1" placeholderTextColor={colors.text.faint} />
              <Text style={styles.fLabel}>Metin</Text>
              <TextInput style={[styles.input, { minHeight: 220, textAlignVertical: 'top' }]} multiline value={text} onChangeText={setText} />
              <View style={styles.modalRow}>
                <TouchableOpacity style={[styles.mBtn, styles.mBtnSec]} onPress={() => setEdit(false)}>
                  <Text style={styles.mBtnSecText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.mBtn, styles.mBtnPri]} onPress={onSave}>
                  <Text style={styles.mBtnPriText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Consents modal */}
      <Modal visible={showConsents} animationType="slide" transparent onRequestClose={() => setShowConsents(false)}>
        <View style={styles.modalBg}>
          <View style={[styles.modal, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Onay Kayıtları ({s.consents.length})</Text>
            <ScrollView>
              {s.consents.length === 0 ? (
                <Text style={styles.emptyText}>Henüz onay yok.</Text>
              ) : s.consents.map((c, i) => (
                <View key={i} style={styles.consentRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.consentName}>{c.userName || c.userId}</Text>
                    <Text style={styles.consentMeta}>v{c.version} · {fmt(c.acceptedAt)}</Text>
                    {c.ip && <Text style={styles.consentMeta}>IP: {c.ip}</Text>}
                  </View>
                  <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.mBtn, styles.mBtnPri, { marginTop: spacing.md }]} onPress={() => setShowConsents(false)}>
              <Text style={styles.mBtnPriText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  headerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#dc2626', borderRadius: radius.md, marginBottom: spacing.md },
  headerIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.md, flexWrap: 'wrap' },
  btn: { flex: 1, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: radius.md },
  btnText: { color: '#fff', fontWeight: '700', fontSize: typography.xs },
  textCard: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  bodyText: { color: colors.text.primary, fontSize: typography.sm, lineHeight: 21 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' },
  modal: { backgroundColor: colors.bg.secondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border.primary, margin: spacing.lg },
  modalTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginBottom: spacing.md },
  fLabel: { color: colors.text.muted, fontSize: typography.xs, marginTop: spacing.sm, marginBottom: 4, fontWeight: '700' },
  input: { backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8, color: colors.text.primary, fontSize: typography.sm },
  modalRow: { flexDirection: 'row', gap: 8, marginTop: spacing.lg },
  mBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center' },
  mBtnPri: { backgroundColor: brand.green },
  mBtnPriText: { color: '#fff', fontWeight: '800' },
  mBtnSec: { backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary },
  mBtnSecText: { color: colors.text.muted, fontWeight: '700' },
  consentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  consentName: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  consentMeta: { color: colors.text.faint, fontSize: 10, marginTop: 1 },
  emptyText: { color: colors.text.muted, textAlign: 'center', padding: spacing.lg },
});
