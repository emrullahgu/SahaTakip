// MessagesScreen — sohbet listesi + yeni birebir/grup sohbet başlatma.
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import EmptyState from '../components/EmptyState';
import {
  listConversations, listChatUsers, getOrCreateDirect, createGroup, deleteConversation,
  type Conversation, type ChatUser,
} from '../services/messaging';
import type { RootStackParamList } from '../types';

export default function MessagesScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [groupMode, setGroupMode] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    listConversations().then(setConvs).finally(() => setLoading(false));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openNew = async () => {
    setGroupMode(false); setGroupTitle(''); setSelected(new Set());
    setShowNew(true);
    setUsers(await listChatUsers());
  };

  const confirmDeleteConv = (c: Conversation) => {
    Alert.alert(
      'Sohbeti sil',
      `"${c.displayTitle || 'Sohbet'}" sohbeti silinsin mi? (Sizden kaldırılır; grupsa diğerleri görmeye devam eder.)`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: async () => {
          try { await deleteConversation(c.id); load(); }
          catch (e: any) { Alert.alert('Hata', e?.message || 'Silinemedi.'); }
        } },
      ],
    );
  };

  const startDirect = async (u: ChatUser) => {
    const id = await getOrCreateDirect(u.id);
    setShowNew(false);
    if (id) nav.navigate('ChatThread', { conversationId: id, title: u.fullName });
    else Alert.alert('Hata', 'Sohbet başlatılamadı.');
  };

  const toggleSel = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const startGroup = async () => {
    if (selected.size < 2) { Alert.alert('Grup', 'En az 2 kişi seçin.'); return; }
    const id = await createGroup(groupTitle, Array.from(selected));
    setShowNew(false);
    if (id) nav.navigate('ChatThread', { conversationId: id, title: groupTitle || 'Grup' });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Mesajlar</Text>
        <TouchableOpacity style={styles.newBtn} onPress={openNew} activeOpacity={0.85}>
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.newBtnText}>Yeni</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={convs}
        keyExtractor={c => c.id}
        contentContainerStyle={{ padding: spacing.lg }}
        onRefresh={load}
        refreshing={loading}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => nav.navigate('ChatThread', { conversationId: item.id, title: item.displayTitle || 'Sohbet' })}
            onLongPress={() => confirmDeleteConv(item)}
            delayLongPress={350}
            activeOpacity={0.8}
          >
            {!item.isGroup && item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View style={[styles.avatar, item.isGroup && { backgroundColor: colors.indigo.bg }]}>
                <Ionicons name={item.isGroup ? 'people' : 'person'} size={20} color={item.isGroup ? colors.indigo.default : colors.emerald.default} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{item.displayTitle || 'Sohbet'}</Text>
              {item.lastMessage
                ? <Text style={[styles.rowSub, (item.unread || 0) > 0 && { color: colors.text.primary, fontWeight: '700' }]} numberOfLines={1}>{item.lastMessage}</Text>
                : item.isGroup && <Text style={styles.rowSub} numberOfLines={1}>{(item.participantNames || []).join(', ')}</Text>}
            </View>
            {(item.unread || 0) > 0 && (
              <View style={styles.unreadBadge}><Text style={styles.unreadText}>{item.unread}</Text></View>
            )}
            <TouchableOpacity onPress={() => confirmDeleteConv(item)} hitSlop={8} style={styles.rowDelBtn}>
              <Ionicons name="trash-outline" size={18} color={colors.rose.default} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading ? (
          <EmptyState icon="chatbubbles-outline" title="Henüz sohbet yok" subtitle="Sağ üstten 'Yeni' ile bir kişi veya grupla mesajlaşmaya başlayın." />
        ) : null}
      />

      {/* Yeni sohbet modalı */}
      <Modal visible={showNew} transparent animationType="slide" onRequestClose={() => setShowNew(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{groupMode ? 'Grup Oluştur' : 'Yeni Sohbet'}</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <TouchableOpacity onPress={() => setGroupMode(g => !g)} style={styles.modeBtn}>
                  <Ionicons name={groupMode ? 'person' : 'people'} size={16} color={colors.indigo.default} />
                  <Text style={styles.modeBtnText}>{groupMode ? 'Birebir' : 'Grup'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowNew(false)}><Ionicons name="close" size={22} color={colors.text.muted} /></TouchableOpacity>
              </View>
            </View>
            {groupMode && (
              <TextInput style={styles.input} placeholder="Grup adı" placeholderTextColor={colors.text.faint} value={groupTitle} onChangeText={setGroupTitle} />
            )}
            <FlatList
              data={users}
              keyExtractor={u => u.id}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.userRow}
                  onPress={() => groupMode ? toggleSel(item.id) : startDirect(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person-circle-outline" size={26} color={colors.text.muted} />
                  <Text style={styles.userName}>{item.fullName}</Text>
                  {groupMode && <Ionicons name={selected.has(item.id) ? 'checkbox' : 'square-outline'} size={20} color={selected.has(item.id) ? colors.emerald.default : colors.text.faint} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.hint}>Başka kullanıcı yok.</Text>}
            />
            {groupMode && (
              <TouchableOpacity style={styles.createGroupBtn} onPress={startGroup} activeOpacity={0.85}>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.createGroupText}>Grubu Oluştur ({selected.size})</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { flex: 1, fontSize: typography.xl, color: colors.text.primary, fontWeight: '900' },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.indigo.default, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full },
  newBtnText: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border.primary },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.emerald.bg, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: typography.md, color: colors.text.primary, fontWeight: '700' },
  rowSub: { fontSize: typography.xs, color: colors.text.muted, marginTop: 2 },
  unreadBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.emerald.default, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  rowDelBtn: { padding: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.bg.primary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  modalTitle: { fontSize: typography.lg, color: colors.text.primary, fontWeight: '800' },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.indigo.bg, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.full },
  modeBtnText: { color: colors.indigo.default, fontSize: typography.xs, fontWeight: '700' },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text.primary, marginBottom: spacing.sm },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  userName: { flex: 1, color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  hint: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center', paddingVertical: spacing.lg },
  createGroupBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.emerald.default, borderRadius: radius.lg, paddingVertical: spacing.md, marginTop: spacing.md },
  createGroupText: { color: '#fff', fontSize: typography.sm, fontWeight: '800' },
});
