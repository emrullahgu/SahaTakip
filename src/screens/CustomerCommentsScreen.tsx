// CustomerCommentsScreen — POZ-DEV-407
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { a11yButton } from '../utils/a11y';
import type { RootStackParamList, CustomerComment } from '../types';
import { listComments, saveComment, resolveComment, deleteComment } from '../services/customerExperience';

type R = RouteProp<RootStackParamList, 'CustomerComments'>;

export default function CustomerCommentsScreen() {
  const route = useRoute<R>();
  const customerFilter = route.params?.customerId;
  const [comments, setComments] = useState<CustomerComment[]>([]);
  const [cid, setCid] = useState(customerFilter || '');
  const [author, setAuthor] = useState('');
  const [body, setBody] = useState('');
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setComments(await listComments(customerFilter)); }
    finally { setLoading(false); setLoaded(true); }
  }, [customerFilter]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const add = async () => {
    if (!cid.trim() || !author.trim() || !body.trim()) { Alert.alert('Eksik', 'Müşteri ID, isim ve yorum gerekli.'); return; }
    try {
      await saveComment({ customerId: cid.trim(), authorName: author.trim(), body: body.trim(), rating: rating || undefined });
      setBody(''); setRating(0);
      load();
    } catch (e: any) { Alert.alert('Hata', e?.message || 'Yorum kaydedilemedi.'); }
  };
  const toggle = async (c: CustomerComment) => {
    try { await resolveComment(c.id, !c.resolved); load(); }
    catch (e: any) { Alert.alert('Hata', e?.message || 'Güncellenemedi.'); }
  };
  const remove = (id: string) => Alert.alert('Sil?', '', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: async () => {
      try { await deleteComment(id); load(); }
      catch (e: any) { Alert.alert('Hata', e?.message || 'Yorum silinemedi.'); }
    } },
  ]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.form}>
        <TextInput style={s.input} value={cid} onChangeText={setCid} editable={!customerFilter} placeholder="Müşteri ID" placeholderTextColor={colors.text.faint} />
        <TextInput style={s.input} value={author} onChangeText={setAuthor} placeholder="Yazar adı" placeholderTextColor={colors.text.faint} />
        <TextInput style={[s.input, { minHeight: 60 }]} value={body} onChangeText={setBody} placeholder="Yorum..." placeholderTextColor={colors.text.faint} multiline />
        <View style={s.starRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity key={n} onPress={() => setRating(rating === n ? 0 : n)}>
              <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={26} color="#f59e0b" />
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={s.addBtn} onPress={add} {...a11yButton('Yorum ekle')}>
          <Ionicons name="add-circle-outline" size={16} color="#fff" /><Text style={s.addT}>Yorum Ekle</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={comments}
        keyExtractor={c => c.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.text.muted} />}
        ListEmptyComponent={loaded ? <Text style={s.empty}>Henüz yorum yok.</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.card, item.resolved && { opacity: 0.5 }]} onLongPress={() => remove(item.id)} onPress={() => toggle(item)}>
            <Ionicons name={item.resolved ? 'checkmark-circle' : 'chatbubble-outline'} size={18} color={item.resolved ? '#22c55e' : '#0ea5e9'} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={s.author}>{item.authorName}{item.rating ? ` · ${'★'.repeat(item.rating)}` : ''}</Text>
              <Text style={s.body}>{item.body}</Text>
              <Text style={s.date}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  form: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderBottomWidth: 1, borderBottomColor: colors.border.primary, gap: 6 },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, fontSize: typography.sm },
  starRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginVertical: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#f59e0b', padding: 10, borderRadius: radius.sm },
  addT: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  card: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  author: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  body: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  date: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
});
