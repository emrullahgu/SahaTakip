// WebhooksScreen — POZ-DEV-102
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  WEBHOOK_EVENTS, WEBHOOK_EVENT_LABEL,
  deleteWebhook, listWebhooks, makeWebhook, testWebhook, upsertWebhook,
} from '../services/integrations';
import { Webhook, WebhookEvent } from '../types';

function fmt(iso?: string): string { if (!iso) return '—'; try { return new Date(iso).toLocaleString('tr-TR'); } catch { return iso; } }

export default function WebhooksScreen() {
  const [list, setList] = useState<Webhook[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Webhook | null>(null);
  const [fLabel, setFLabel] = useState('');
  const [fUrl, setFUrl] = useState('');
  const [fSecret, setFSecret] = useState('');
  const [fEvents, setFEvents] = useState<WebhookEvent[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);

  const refresh = useCallback(async () => { setList(await listWebhooks()); }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const openNew = () => {
    setEditing(null); setFLabel(''); setFUrl(''); setFSecret(''); setFEvents([]); setShowForm(true);
  };
  const openEdit = (w: Webhook) => {
    setEditing(w); setFLabel(w.label); setFUrl(w.url); setFSecret(w.secret || ''); setFEvents([...w.events]); setShowForm(true);
  };
  const toggleEvent = (ev: WebhookEvent) => setFEvents(p => p.includes(ev) ? p.filter(e => e !== ev) : [...p, ev]);

  const onSave = async () => {
    if (!fLabel.trim() || !fUrl.trim()) { Alert.alert('Eksik', 'Etiket ve URL zorunlu.'); return; }
    if (!/^https?:\/\//.test(fUrl.trim())) { Alert.alert('Hata', 'URL http(s):// ile başlamalı.'); return; }
    if (fEvents.length === 0) { Alert.alert('Eksik', 'En az 1 olay seçin.'); return; }
    const next: Webhook = editing
      ? { ...editing, label: fLabel.trim(), url: fUrl.trim(), secret: fSecret.trim() || undefined, events: fEvents }
      : makeWebhook({ label: fLabel.trim(), url: fUrl.trim(), secret: fSecret.trim() || undefined, events: fEvents });
    await upsertWebhook(next);
    setShowForm(false);
    await refresh();
  };

  const onToggle = async (w: Webhook) => {
    await upsertWebhook({ ...w, active: !w.active });
    await refresh();
  };

  const onDelete = (id: string) => {
    Alert.alert('Sil', 'Webhook silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteWebhook(id); await refresh(); } },
    ]);
  };

  const onTest = async (w: Webhook) => {
    setTestingId(w.id);
    const r = await testWebhook(w);
    setTestingId(null);
    Alert.alert(r.ok ? 'Başarılı' : 'Başarısız', r.ok ? `HTTP ${r.status}` : (r.error || 'Bilinmeyen hata'));
    await refresh();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.heading}>Webhook ({list.length})</Text>
          <TouchableOpacity style={styles.newBtn} onPress={openNew}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.newBtnText}>Yeni</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={14} color="#8b5cf6" />
          <Text style={styles.infoText}>
            Webhook'lar olay tetiklendiğinde POST isteği gönderir. Gizli anahtarınız X-SahaTakip-Secret başlığı ile iletilir.
          </Text>
        </View>

        {list.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="send-outline" size={36} color={colors.text.faint} />
            <Text style={styles.emptyText}>Henüz webhook yok.</Text>
          </View>
        ) : list.map(w => (
          <TouchableOpacity key={w.id} style={[styles.card, !w.active && { opacity: 0.55 }]} onPress={() => openEdit(w)}>
            <View style={styles.rowTop}>
              <Text style={styles.label}>{w.label}</Text>
              <View style={[styles.statusDot, { backgroundColor: w.active ? '#22c55e' : '#64748b' }]} />
            </View>
            <Text style={styles.urlText} numberOfLines={1}>{w.url}</Text>
            <View style={styles.evRow}>
              {w.events.slice(0, 4).map(ev => (
                <View key={ev} style={styles.evPill}><Text style={styles.evText}>{WEBHOOK_EVENT_LABEL[ev]}</Text></View>
              ))}
              {w.events.length > 4 && <Text style={styles.evMore}>+{w.events.length - 4}</Text>}
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>Son: {fmt(w.lastDeliveryAt)}</Text>
              {w.lastStatus && (
                <Text style={[styles.metaText, { color: w.lastStatus === 'success' ? '#22c55e' : '#dc2626' }]}>
                  {w.lastStatus === 'success' ? '✓ başarılı' : '✗ başarısız'}
                </Text>
              )}
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onTest(w)} disabled={testingId === w.id}>
                {testingId === w.id ? <ActivityIndicator size="small" color="#0ea5e9" /> : <Ionicons name="paper-plane-outline" size={14} color="#0ea5e9" />}
                <Text style={[styles.actionText, { color: '#0ea5e9' }]}>Test</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onToggle(w)}>
                <Ionicons name={w.active ? 'pause-outline' : 'play-outline'} size={14} color="#f59e0b" />
                <Text style={[styles.actionText, { color: '#f59e0b' }]}>{w.active ? 'Durdur' : 'Başlat'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(w.id)}>
                <Ionicons name="trash-outline" size={14} color="#dc2626" />
                <Text style={[styles.actionText, { color: '#dc2626' }]}>Sil</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>{editing ? 'Webhook Düzenle' : 'Yeni Webhook'}</Text>
              <Text style={styles.fLabel}>Etiket</Text>
              <TextInput style={styles.input} value={fLabel} onChangeText={setFLabel} placeholder="örn: Slack bildirim" placeholderTextColor={colors.text.faint} />
              <Text style={styles.fLabel}>URL</Text>
              <TextInput style={styles.input} value={fUrl} onChangeText={setFUrl} placeholder="https://hooks.example.com/webhook" placeholderTextColor={colors.text.faint} autoCapitalize="none" />
              <Text style={styles.fLabel}>Gizli Anahtar (opsiyonel)</Text>
              <TextInput style={styles.input} value={fSecret} onChangeText={setFSecret} placeholder="X-SahaTakip-Secret başlığı" placeholderTextColor={colors.text.faint} autoCapitalize="none" />
              <Text style={styles.fLabel}>Olaylar</Text>
              <View style={styles.evPicker}>
                {WEBHOOK_EVENTS.map(ev => {
                  const active = fEvents.includes(ev);
                  return (
                    <TouchableOpacity key={ev} style={[styles.evChip, active && styles.evChipActive]} onPress={() => toggleEvent(ev)}>
                      <Text style={[styles.evChipText, active && { color: '#fff' }]}>{WEBHOOK_EVENT_LABEL[ev]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.modalRow}>
                <TouchableOpacity style={[styles.mBtn, styles.mBtnSec]} onPress={() => setShowForm(false)}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  heading: { flex: 1, color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: brand.green, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  infoBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', padding: spacing.sm, backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)', marginBottom: spacing.md },
  infoText: { flex: 1, color: '#c4b5fd', fontSize: 11, lineHeight: 15 },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, marginBottom: spacing.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  urlText: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  evRow: { flexDirection: 'row', gap: 4, marginTop: 8, flexWrap: 'wrap' },
  evPill: { backgroundColor: 'rgba(139,92,246,0.18)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  evText: { color: '#a78bfa', fontSize: 10, fontWeight: '700' },
  evMore: { color: colors.text.muted, fontSize: 10, alignSelf: 'center' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  metaText: { color: colors.text.faint, fontSize: 10 },
  actionsRow: { flexDirection: 'row', gap: 14, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: colors.text.muted },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' },
  modal: { backgroundColor: colors.bg.secondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border.primary },
  modalTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginBottom: spacing.md },
  fLabel: { color: colors.text.muted, fontSize: typography.xs, marginTop: spacing.sm, marginBottom: 4, fontWeight: '700' },
  input: { backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8, color: colors.text.primary, fontSize: typography.sm },
  evPicker: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  evChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.primary },
  evChipActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  evChipText: { color: colors.text.muted, fontSize: 11, fontWeight: '700' },
  modalRow: { flexDirection: 'row', gap: 8, marginTop: spacing.lg },
  mBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center' },
  mBtnPri: { backgroundColor: brand.green },
  mBtnPriText: { color: '#fff', fontWeight: '800' },
  mBtnSec: { backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary },
  mBtnSecText: { color: colors.text.muted, fontWeight: '700' },
});
