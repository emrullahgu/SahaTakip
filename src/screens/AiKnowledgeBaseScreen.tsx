// AiKnowledgeBaseScreen — NotebookLM benzeri doküman havuzu.
// Kullanıcı notları, e-posta dökümlerini, WhatsApp özetlerini, teknik referans
// dokümanlarını yapıştırır. Copilot her sorguda ilgili kayıtları çekip
// sistem promptuna ekler.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listDocs, upsertDoc, deleteDoc, type KbDoc } from '../services/aiKnowledgeBase';
import { syncInboxFromCloud } from '../services/inboxConnector';
import EmptyState from '../components/EmptyState';

const SOURCE_LABEL: Record<NonNullable<KbDoc['source']>, string> = {
  manual: 'Not', email: 'E-posta', whatsapp: 'WhatsApp', notebooklm: 'NotebookLM', other: 'Diğer',
};
const SOURCE_COLOR: Record<NonNullable<KbDoc['source']>, string> = {
  manual: '#64748b', email: '#0ea5e9', whatsapp: '#22c55e', notebooklm: '#a855f7', other: '#f59e0b',
};

export default function AiKnowledgeBaseScreen() {
  const nav = useNavigation<any>();
  const [docs, setDocs] = useState<KbDoc[]>([]);
  const [editor, setEditor] = useState<Partial<KbDoc> | null>(null);
  const [tagsInput, setTagsInput] = useState('');
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => setDocs(await listDocs()), []);
  useEffect(() => { load(); }, [load]);

  const onSync = async () => {
    setSyncing(true);
    try {
      const r = await syncInboxFromCloud({ limit: 200, sinceDays: 60 });
      if (r.error) {
        Alert.alert('Senkronizasyon Hatası', r.error);
      } else {
        Alert.alert('Tamamlandı', `Çekilen: ${r.fetched}\nEklenen: ${r.imported}\nAtlanan: ${r.skipped}`);
        load();
      }
    } finally {
      setSyncing(false);
    }
  };

  const openNew = () => { setEditor({ title: '', content: '', source: 'manual', tags: [] }); setTagsInput(''); };
  const openEdit = (d: KbDoc) => { setEditor(d); setTagsInput((d.tags || []).join(', ')); };

  const save = async () => {
    if (!editor?.title?.trim() || !editor?.content?.trim()) {
      Alert.alert('Eksik Alan', 'Başlık ve içerik zorunlu.');
      return;
    }
    await upsertDoc({
      id: editor.id,
      title: editor.title.trim(),
      content: editor.content.trim(),
      source: editor.source || 'manual',
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
    });
    setEditor(null);
    setTagsInput('');
    load();
  };

  const onDelete = (id: string) => {
    Alert.alert('Sil', 'Bu doküman silinsin mi?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteDoc(id); load(); } },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={{ padding: 6 }}>
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Bilgi Tabanı</Text>
          <Text style={s.sub}>{docs.length} doküman · Copilot bunları okur</Text>
        </View>
        <TouchableOpacity style={[s.syncBtn, syncing && { opacity: 0.6 }]} onPress={onSync} disabled={syncing}>
          <Ionicons name={syncing ? 'sync' : 'cloud-download-outline'} size={18} color="#0ea5e9" />
        </TouchableOpacity>
        <TouchableOpacity style={s.addBtn} onPress={openNew}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.addText}>Ekle</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={docs}
        keyExtractor={d => d.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 80 }}
        ListEmptyComponent={
          <EmptyState
            icon="library-outline"
            title="Henüz doküman yok"
            subtitle="Notlarınızı, son e-postaları, WhatsApp özetlerini veya NotebookLM çıktılarını ekleyin. Copilot bunlardan beslenir."
            actionLabel="+ İlk Dokümanı Ekle"
            onAction={openNew}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => openEdit(item)} onLongPress={() => onDelete(item.id)}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[s.badge, { backgroundColor: SOURCE_COLOR[item.source || 'manual'] }]}>
                  <Text style={s.badgeText}>{SOURCE_LABEL[item.source || 'manual']}</Text>
                </View>
                <Text style={s.cardTitle}>{item.title}</Text>
              </View>
              <Text style={s.cardPreview} numberOfLines={2}>{item.content}</Text>
              {item.tags.length > 0 && (
                <Text style={s.tags}>#{item.tags.join(' #')}</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => onDelete(item.id)} style={{ padding: 6 }}>
              <Ionicons name="trash-outline" size={18} color={colors.rose.default} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      <Modal visible={!!editor} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setEditor(null)}>
        <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => setEditor(null)} style={{ padding: 6 }}>
              <Ionicons name="close" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[s.title, { flex: 1 }]}>{editor?.id ? 'Düzenle' : 'Yeni Doküman'}</Text>
            <TouchableOpacity onPress={save} style={s.addBtn}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={s.addText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
            <Text style={s.label}>Kaynak</Text>
            <View style={s.sourceRow}>
              {(Object.keys(SOURCE_LABEL) as Array<keyof typeof SOURCE_LABEL>).map(src => (
                <TouchableOpacity
                  key={src}
                  onPress={() => setEditor(e => ({ ...e!, source: src }))}
                  style={[
                    s.sourceChip,
                    editor?.source === src && { backgroundColor: SOURCE_COLOR[src], borderColor: SOURCE_COLOR[src] },
                  ]}
                >
                  <Text style={[s.sourceChipText, editor?.source === src && { color: '#fff' }]}>{SOURCE_LABEL[src]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Başlık</Text>
            <TextInput
              style={s.field}
              value={editor?.title || ''}
              onChangeText={t => setEditor(e => ({ ...e!, title: t }))}
              placeholder="Örn: 23 Mayıs müşteri toplantı notları"
              placeholderTextColor={colors.text.faint}
            />

            <Text style={s.label}>Etiketler (virgülle ayırın)</Text>
            <TextInput
              style={s.field}
              value={tagsInput}
              onChangeText={setTagsInput}
              placeholder="örn: inbox, müşteri, fiyat"
              placeholderTextColor={colors.text.faint}
            />

            <Text style={s.label}>İçerik</Text>
            <TextInput
              style={[s.field, { minHeight: 240, textAlignVertical: 'top' }]}
              value={editor?.content || ''}
              onChangeText={t => setEditor(e => ({ ...e!, content: t }))}
              placeholder="Metni buraya yapıştırın..."
              placeholderTextColor={colors.text.faint}
              multiline
            />

            <View style={s.hint}>
              <Ionicons name="information-circle-outline" size={16} color={colors.text.muted} />
              <Text style={s.hintText}>
                İpucu: E-posta veya WhatsApp özetleri için kaynağı doğru seç ve "inbox" etiketini ekle.
                Copilot "Gelen Kutusu Tara" butonuna bastığında bu kayıtları otomatik tarar.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border.primary,
  },
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#a855f7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
  },
  addText: { color: '#fff', fontWeight: '700', fontSize: typography.sm },
  syncBtn: {
    width: 36, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#0ea5e9', marginRight: 6,
  },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    padding: spacing.md, backgroundColor: colors.bg.secondary,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary,
  },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700', flexShrink: 1 },
  cardPreview: { color: colors.text.muted, fontSize: typography.sm, marginTop: 4 },
  tags: { color: '#a855f7', fontSize: typography.xs, marginTop: 4 },
  label: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  field: {
    backgroundColor: colors.bg.secondary, color: colors.text.primary,
    paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border.primary, fontSize: typography.md,
  },
  sourceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sourceChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary,
  },
  sourceChipText: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  hint: {
    flexDirection: 'row', gap: 6, padding: spacing.sm,
    backgroundColor: colors.bg.secondary, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border.primary,
  },
  hintText: { color: colors.text.muted, fontSize: typography.xs, flex: 1, lineHeight: 18 },
});
