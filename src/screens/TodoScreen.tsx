// TodoScreen — Kişisel "Yapılacaklar" (Microsoft To-Do tarzı): ekle, tamamla,
// önemli işaretle, sil. Cihazda saklanır (todos servisi).
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { a11yButton } from '../utils/a11y';
import {
  listTodos, addTodo, toggleTodo, toggleImportant, deleteTodo, clearCompleted,
  type TodoItem,
} from '../services/todos';

export default function TodoScreen() {
  const nav = useNavigation();
  const [items, setItems] = useState<TodoItem[]>([]);
  const [text, setText] = useState('');

  const load = useCallback(async () => { setItems(await listTodos()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onAdd = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    await addTodo(t);
    load();
  };

  const onToggle = async (id: string) => { await toggleTodo(id); load(); };
  const onStar = async (id: string) => { await toggleImportant(id); load(); };
  const onDelete = (item: TodoItem) => {
    Alert.alert('Sil', `"${item.title}" silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteTodo(item.id); load(); } },
    ]);
  };
  const onClearDone = () => {
    const doneCount = items.filter(i => i.done).length;
    if (!doneCount) return;
    Alert.alert('Tamamlananları temizle', `${doneCount} tamamlanan görev silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Temizle', style: 'destructive', onPress: async () => { await clearCompleted(); load(); } },
    ]);
  };

  const remaining = items.filter(i => !i.done).length;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={8} {...a11yButton('Geri')}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Yapılacaklar</Text>
          <Text style={s.subtitle}>{remaining} açık · {items.length} toplam</Text>
        </View>
        <TouchableOpacity onPress={onClearDone} hitSlop={8} {...a11yButton('Tamamlananları temizle')}>
          <Ionicons name="checkmark-done-outline" size={22} color={colors.text.muted} />
        </TouchableOpacity>
      </View>

      <View style={s.addRow}>
        <Ionicons name="add-circle-outline" size={22} color={colors.indigo.default} />
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder="Görev ekle..."
          placeholderTextColor={colors.text.faint}
          onSubmitEditing={onAdd}
          returnKeyType="done"
        />
        {!!text.trim() && (
          <TouchableOpacity onPress={onAdd} style={s.addBtn} {...a11yButton('Ekle')}>
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => (
          <View style={[s.card, item.done && s.cardDone]}>
            <TouchableOpacity onPress={() => onToggle(item.id)} hitSlop={6} {...a11yButton(item.done ? 'Yapılmadı işaretle' : 'Tamamla')}>
              <Ionicons name={item.done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={item.done ? colors.emerald.default : colors.text.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => onToggle(item.id)} onLongPress={() => onDelete(item)} delayLongPress={350} activeOpacity={0.7}>
              <Text style={[s.itemText, item.done && s.itemTextDone]} numberOfLines={2}>{item.title}</Text>
              {!!item.dueDate && <Text style={s.due}>{item.dueDate}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onStar(item.id)} hitSlop={6} {...a11yButton('Önemli')}>
              <Ionicons name={item.important ? 'star' : 'star-outline'} size={20} color={item.important ? '#f59e0b' : colors.text.faint} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(item)} hitSlop={6} {...a11yButton('Sil')}>
              <Ionicons name="trash-outline" size={20} color={colors.rose.default} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>Henüz görev yok. Yukarıdan ekleyin.</Text>}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  title: { fontSize: typography.xl, color: colors.text.primary, fontWeight: '900' },
  subtitle: { fontSize: typography.xs, color: colors.text.muted, marginTop: 1 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.md, marginTop: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  input: { flex: 1, color: colors.text.primary, fontSize: typography.md, paddingVertical: 4 },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.indigo.default, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border.primary },
  cardDone: { opacity: 0.6 },
  itemText: { color: colors.text.primary, fontSize: typography.md, fontWeight: '600' },
  itemTextDone: { textDecorationLine: 'line-through', color: colors.text.muted },
  due: { color: colors.text.faint, fontSize: typography.xs, marginTop: 2 },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 48, fontSize: typography.sm },
});
