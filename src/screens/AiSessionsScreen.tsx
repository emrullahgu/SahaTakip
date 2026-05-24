// AiSessionsScreen — Faz 41
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { AiSession, RootStackParamList } from '../types';
import { listSessions, createSession, deleteSession, FEATURE_LABEL, FEATURE_ICON } from '../services/aiAssistant';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AiSessionsScreen() {
  const [items, setItems] = useState<AiSession[]>([]);
  const nav = useNavigation<Nav>();
  const load = useCallback(async () => { setItems(await listSessions()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const newSession = async () => {
    const s = await createSession('Yeni Sohbet', 'chat');
    nav.navigate('AiChat', { sessionId: s.id });
  };

  const onDelete = (id: string) => {
    Alert.alert('Sil', 'Sohbet silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteSession(id); load(); } },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 90 }}
        ListEmptyComponent={<Text style={s.empty}>Henüz sohbet yok. Yeni başlat.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => nav.navigate('AiChat', { sessionId: item.id })}
            onLongPress={() => onDelete(item.id)}
          >
            <Ionicons name={FEATURE_ICON[item.feature] as any} size={20} color="#06b6d4" />
            <View style={{ flex: 1 }}>
              <Text style={s.n}>{item.title}</Text>
              <Text style={s.sub}>{FEATURE_LABEL[item.feature]} · {item.messageCount} mesaj · {item.tokenTotal} token</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={newSession}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#06b6d4', alignItems: 'center', justifyContent: 'center', elevation: 4 },
});
