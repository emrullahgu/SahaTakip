import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/EmptyState';
import RowMenu from '../components/RowMenu';
import PressableScale from '../components/PressableScale';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { a11yButton, a11yInput, HIT_SLOP_8 } from '../utils/a11y';
import type { Customer, RootStackParamList } from '../types';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Customers'>;

export default function CustomersScreen() {
  const navigation = useNavigation<NavProp>();
  const { customers, deleteCustomer, refresh } = useAppContext();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => { setRefreshing(true); try { await refresh(); } finally { setRefreshing(false); } };
  const { hasPermission } = useAuth();
  const [query, setQuery] = useState('');

  const canWrite = hasPermission('customers', 'W');

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

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>

      <View style={styles.headerBar}>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={16} color={colors.text.faint} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Ara: ünvan, şehir, telefon..."
            placeholderTextColor={colors.text.faint}
            returnKeyType="search"
            autoCorrect={false}
            {...a11yInput('Müşteri ara', query)}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={HIT_SLOP_8} {...a11yButton('Aramayı temizle')}>
              <Ionicons name="close-circle" size={16} color={colors.text.faint} />
            </TouchableOpacity>
          )}
        </View>
        {canWrite && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.indigo.default }]}
            onPress={() => navigation.navigate('ApolloLeads')}
            activeOpacity={0.85}
            {...a11yButton('Apollo ile lead bul')}
          >
            <Ionicons name="planet-outline" size={18} color="#fff" />
          </TouchableOpacity>
        )}
        {canWrite && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('CustomerForm')}
            activeOpacity={0.85}
            {...a11yButton('Yeni müşteri ekle')}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.count}>{filtered.length} müşteri</Text>

      <FlatList
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={c => c.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text.muted} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <PressableScale
            style={styles.card}
            onPress={() => navigation.navigate('CustomerForm', { customerId: item.id })}
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
            {canWrite && (
              <RowMenu
                items={[
                  {
                    label: 'Düzenle',
                    icon: 'create-outline',
                    onPress: () => navigation.navigate('CustomerForm', { customerId: item.id }),
                  },
                  {
                    label: 'Sil',
                    icon: 'trash-outline',
                    destructive: true,
                    confirm: `${item.shortName} müşterisi silinecek. Emin misiniz?`,
                    confirmTitle: 'Silinsin mi?',
                    onPress: () => deleteCustomer(item.id),
                  },
                ]}
              />
            )}
          </PressableScale>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Müşteri yok"
            subtitle="İlk müşterinizi eklemek için + butonuna basın."
            actionLabel="+ Yeni Müşteri"
            onAction={() => navigation.navigate('CustomerForm')}
          />
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
});
