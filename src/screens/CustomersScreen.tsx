import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAppContext } from '../context/AppContext';
import Toast from '../components/Toast';
import type { Customer, RootStackParamList } from '../types';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Customers'>;

export default function CustomersScreen() {
  const navigation = useNavigation<NavProp>();
  const { customers, deleteCustomer, toast } = useAppContext();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      c =>
        c.shortName.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.city ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q)
    );
  }, [customers, query]);

  const confirmDelete = (cust: Customer) => {
    Alert.alert(
      'Silinsin mi?',
      `${cust.shortName} müşterisi silinecek. Emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => deleteCustomer(cust.id) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {toast && <Toast toast={toast} />}

      <View style={styles.headerBar}>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={16} color={colors.text.faint} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Ara: ünvan, şehir, telefon..."
            placeholderTextColor={colors.text.faint}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.text.faint} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('CustomerForm')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={styles.count}>{filtered.length} müşteri</Text>

      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('CustomerForm', { customerId: item.id })}
            activeOpacity={0.85}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.shortName[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shortName}>{item.shortName}</Text>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.metaRow}>
                {item.city && (
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={11} color={colors.text.faint} />
                    <Text style={styles.metaText}>{item.city}</Text>
                  </View>
                )}
                {item.phone && (
                  <View style={styles.metaItem}>
                    <Ionicons name="call-outline" size={11} color={colors.text.faint} />
                    <Text style={styles.metaText}>{item.phone}</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => confirmDelete(item)}
              style={styles.deleteBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={16} color={colors.rose.default} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color={colors.text.faint} />
            <Text style={styles.emptyTitle}>Müşteri yok</Text>
            <Text style={styles.emptySub}>İlk müşterinizi eklemek için + butonuna basın.</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('CustomerForm')}
            >
              <Text style={styles.emptyBtnText}>+ Yeni Müşteri</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  headerBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: typography.sm },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: brand.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  count: {
    color: colors.text.muted,
    fontSize: typography.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  list: { padding: spacing.md, paddingTop: 0, paddingBottom: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.indigo.bg,
    borderWidth: 1,
    borderColor: colors.indigo.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: brand.blueLight, fontWeight: '900', fontSize: typography.md },
  shortName: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  title: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: spacing.md, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { color: colors.text.faint, fontSize: 10 },
  deleteBtn: { padding: spacing.xs },
  empty: { alignItems: 'center', padding: spacing.xl, marginTop: spacing.xl },
  emptyTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginTop: spacing.md },
  emptySub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: brand.green,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  emptyBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
});
