// MaintenanceModeScreen — Faz 40
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Switch, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { MaintenanceWindow } from '../types';
import { listMaintenance, saveMaintenance, toggleMaintenance, deleteMaintenance } from '../services/platform';

export default function MaintenanceModeScreen() {
  const [items, setItems] = useState<MaintenanceWindow[]>([]);
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [hours, setHours] = useState('1');
  const [affectsAll, setAffectsAll] = useState(true);
  const load = useCallback(async () => { setItems(await listMaintenance()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onSave = async () => {
    const h = parseFloat(hours) || 1;
    await saveMaintenance({
      title: title || 'Bakım', message: message || 'Sistem bakımdadır.',
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + h * 3600000).toISOString(),
      active: true, affectsAll,
    });
    setModal(false); setTitle(''); setMessage(''); setHours('1'); setAffectsAll(true);
    load();
  };

  const onDelete = (id: string) => {
    Alert.alert('Sil', 'Bakım penceresi silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteMaintenance(id); load(); } },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 90 }}
        ListEmptyComponent={<Text style={s.empty}>Bakım penceresi yok.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity onLongPress={() => onDelete(item.id)} style={[s.card, { borderLeftColor: item.active ? '#f59e0b' : '#64748b' }]}>
            <View style={s.row}>
              <Ionicons name="construct-outline" size={20} color={item.active ? '#f59e0b' : '#64748b'} />
              <View style={{ flex: 1 }}>
                <Text style={s.n}>{item.title}</Text>
                <Text style={s.sub}>{new Date(item.startsAt).toLocaleString('tr-TR')} → {new Date(item.endsAt).toLocaleTimeString('tr-TR')}</Text>
                <Text style={s.msg}>{item.message}</Text>
                {item.affectsAll && <Text style={s.tag}>Tüm firmaları etkiler</Text>}
              </View>
              <Switch value={item.active} onValueChange={async () => { await toggleMaintenance(item.id); load(); }} />
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={() => setModal(true)}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={s.mw}>
          <View style={s.sheet}>
            <Text style={s.h}>Yeni Bakım Penceresi</Text>
            <TextInput style={s.input} placeholder="Başlık" placeholderTextColor={colors.text.faint} value={title} onChangeText={setTitle} />
            <TextInput style={[s.input, { height: 70 }]} placeholder="Mesaj" placeholderTextColor={colors.text.faint} value={message} onChangeText={setMessage} multiline />
            <TextInput style={s.input} placeholder="Süre (saat)" placeholderTextColor={colors.text.faint} value={hours} onChangeText={setHours} keyboardType="numeric" />
            <TouchableOpacity style={s.cb} onPress={() => setAffectsAll(!affectsAll)}>
              <Ionicons name={affectsAll ? 'checkbox' : 'square-outline'} size={22} color="#a855f7" />
              <Text style={s.cbT}>Tüm firmaları etkiler</Text>
            </TouchableOpacity>
            <View style={s.btns}>
              <TouchableOpacity style={[s.btn, { backgroundColor: colors.bg.primary }]} onPress={() => setModal(false)}>
                <Text style={s.btnT}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, { backgroundColor: '#a855f7' }]} onPress={onSave}>
                <Text style={[s.btnT, { color: '#fff' }]}>Kaydet</Text>
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
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  msg: { color: colors.text.primary, fontSize: typography.xs, marginTop: 4 },
  tag: { color: '#f59e0b', fontSize: 10, fontWeight: '700', marginTop: 2 },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  mw: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: spacing.sm },
  h: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  cb: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cbT: { color: colors.text.primary, fontSize: typography.sm },
  btns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  btn: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  btnT: { color: colors.text.primary, fontWeight: '700' },
});
