// ApolloLeadsScreen — Apollo.io ile firma/kişi (lead) ara, müşteri olarak ekle.
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { colors, spacing, radius, typography } from '../theme';
import { useAppContext } from '../context/AppContext';
import { newUuid } from '../services/data/repository';
import EmptyState from '../components/EmptyState';
import {
  searchOrganizations, searchPeople, isApolloConfigured,
  type ApolloOrganization, type ApolloPerson,
} from '../services/apollo';
import type { Customer } from '../types';

type Mode = 'company' | 'person';

export default function ApolloLeadsScreen() {
  const nav = useNavigation<any>();
  const { addCustomer, customers, showToast } = useAppContext();
  const [mode, setMode] = useState<Mode>('company');
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [orgs, setOrgs] = useState<ApolloOrganization[]>([]);
  const [people, setPeople] = useState<ApolloPerson[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => { isApolloConfigured().then(setConfigured); }, []);

  const run = async () => {
    if (!keywords.trim() && !title.trim() && !location.trim()) {
      Alert.alert('Arama', 'En az bir kriter girin (anahtar kelime, unvan veya lokasyon).');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'company') {
        const res = await searchOrganizations({ name: keywords || undefined, keywords: keywords || undefined, locations: location ? [location] : undefined, perPage: 25 });
        setOrgs(res); setPeople([]);
      } else {
        const res = await searchPeople({ keywords: keywords || undefined, titles: title ? title.split(',').map(s => s.trim()).filter(Boolean) : undefined, locations: location ? [location] : undefined, perPage: 25 });
        setPeople(res); setOrgs([]);
      }
    } catch (e: any) {
      Alert.alert('Apollo hatası', e?.message || 'Arama başarısız.');
    } finally { setLoading(false); }
  };

  const addOrg = async (o: ApolloOrganization) => {
    const dup = customers.find(c => c.title === o.name || c.shortName === o.name);
    if (dup) { showToast('Bu firma zaten müşteri.'); return; }
    const c: Customer = {
      id: newUuid(),
      shortName: o.name || 'Firma',
      title: o.name || '',
      phone: o.phone || '',
      email: '',
      address: o.location || '',
      city: '',
      sector: o.industry || '',
      type: 'Potansiyel',
      source: 'Apollo',
    } as Customer;
    // Kayıt başarısını bekle: başarısızsa "eklendi" işaretleme (önceden DB hatası
    // olsa bile eklendi görünüyordu). addCustomer hata toast'ını kendi gösterir.
    const res = await addCustomer(c);
    if (!res.ok) return;
    setAdded(prev => new Set(prev).add(o.id || o.name || ''));
  };

  const addPerson = async (p: ApolloPerson) => {
    const name = p.organization || p.name || 'Kişi';
    const dup = customers.find(c => c.title === name || c.shortName === name);
    if (dup) { showToast('Zaten müşteri.'); return; }
    const c: Customer = {
      id: newUuid(),
      shortName: p.organization || p.name || 'Kişi',
      title: p.organization || p.name || '',
      contactPerson: p.name || '',
      phone: p.phone || '',
      email: p.email || '',
      address: p.location || '',
      city: '',
      type: 'Potansiyel',
      source: 'Apollo',
    } as Customer;
    const res = await addCustomer(c);
    if (!res.ok) return;
    setAdded(prev => new Set(prev).add(p.id || p.email || p.name || ''));
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={8}><Ionicons name="arrow-back" size={24} color={colors.text.primary} /></TouchableOpacity>
        <Text style={s.title}>Apollo Lead Bul</Text>
      </View>

      {configured === false && (
        <View style={s.warn}>
          <Ionicons name="key-outline" size={16} color={colors.amber.default} />
          <Text style={s.warnText}>Apollo API anahtarı yok. Ayarlar → Harici API Anahtarları → Apollo.</Text>
        </View>
      )}

      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, mode === 'company' && s.tabActive]} onPress={() => setMode('company')}>
          <Ionicons name="business-outline" size={16} color={mode === 'company' ? '#fff' : colors.text.muted} />
          <Text style={[s.tabText, mode === 'company' && s.tabTextActive]}>Firma</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, mode === 'person' && s.tabActive]} onPress={() => setMode('person')}>
          <Ionicons name="person-outline" size={16} color={mode === 'person' ? '#fff' : colors.text.muted} />
          <Text style={[s.tabText, mode === 'person' && s.tabTextActive]}>Kişi (Lead)</Text>
        </TouchableOpacity>
      </View>

      <View style={s.form}>
        <TextInput style={s.input} value={keywords} onChangeText={setKeywords} placeholder={mode === 'company' ? 'Firma adı / sektör (ör. elektrik trafo)' : 'Anahtar kelime (sektör/ürün)'} placeholderTextColor={colors.text.faint} />
        {mode === 'person' && (
          <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Unvan(lar) — virgülle (ör. satın alma müdürü, tesis yöneticisi)" placeholderTextColor={colors.text.faint} />
        )}
        <TextInput style={s.input} value={location} onChangeText={setLocation} placeholder="Lokasyon (ör. İzmir, Turkey)" placeholderTextColor={colors.text.faint} />
        <TouchableOpacity style={s.searchBtn} onPress={run} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="search" size={18} color="#fff" /><Text style={s.searchBtnText}>Ara</Text></>}
        </TouchableOpacity>
      </View>

      {mode === 'company' ? (
        <FlatList
          data={orgs}
          keyExtractor={(o, i) => o.id || String(i)}
          contentContainerStyle={{ padding: spacing.lg }}
          renderItem={({ item }) => {
            const done = added.has(item.id || item.name || '');
            return (
              <View style={s.card}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.cardSub} numberOfLines={1}>{[item.industry, item.location, item.employees ? `${item.employees} çalışan` : null].filter(Boolean).join(' · ')}</Text>
                  <Text style={s.cardMeta} numberOfLines={1}>{[item.domain, item.phone].filter(Boolean).join(' · ')}</Text>
                </View>
                <TouchableOpacity style={[s.addCustBtn, done && s.addedBtn]} onPress={() => addOrg(item)} disabled={done}>
                  <Ionicons name={done ? 'checkmark' : 'add'} size={16} color="#fff" />
                  <Text style={s.addCustText}>{done ? 'Eklendi' : 'Müşteri'}</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={!loading ? <EmptyState icon="business-outline" title="Sonuç yok" subtitle="Firma aramak için kriter girip Ara'ya basın." /> : null}
        />
      ) : (
        <FlatList
          data={people}
          keyExtractor={(p, i) => p.id || String(i)}
          contentContainerStyle={{ padding: spacing.lg }}
          renderItem={({ item }) => {
            const done = added.has(item.id || item.email || item.name || '');
            return (
              <View style={s.card}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardName} numberOfLines={1}>{item.name}{item.title ? ` · ${item.title}` : ''}</Text>
                  <Text style={s.cardSub} numberOfLines={1}>{item.organization}</Text>
                  <Text style={s.cardMeta} numberOfLines={1}>{[item.email, item.phone].filter(Boolean).join(' · ') || 'iletişim gizli'}</Text>
                </View>
                <TouchableOpacity style={[s.addCustBtn, done && s.addedBtn]} onPress={() => addPerson(item)} disabled={done}>
                  <Ionicons name={done ? 'checkmark' : 'add'} size={16} color="#fff" />
                  <Text style={s.addCustText}>{done ? 'Eklendi' : 'Müşteri'}</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={!loading ? <EmptyState icon="people-outline" title="Sonuç yok" subtitle="Lead aramak için kriter girip Ara'ya basın." /> : null}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { fontSize: typography.xl, color: colors.text.primary, fontWeight: '900' },
  warn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.amber.bg, marginHorizontal: spacing.lg, padding: spacing.sm, borderRadius: radius.md },
  warnText: { flex: 1, color: colors.amber.default, fontSize: typography.xs, fontWeight: '600' },
  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.bg.card },
  tabActive: { backgroundColor: colors.indigo.default },
  tabText: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  tabTextActive: { color: '#fff' },
  form: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text.primary, fontSize: typography.sm },
  searchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.indigo.default, borderRadius: radius.lg, paddingVertical: spacing.md },
  searchBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: '800' },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border.primary },
  cardName: { fontSize: typography.sm, color: colors.text.primary, fontWeight: '800' },
  cardSub: { fontSize: typography.xs, color: colors.text.secondary, marginTop: 2 },
  cardMeta: { fontSize: typography.xs, color: colors.text.muted, marginTop: 2 },
  addCustBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.emerald.default, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full },
  addedBtn: { backgroundColor: colors.text.faint },
  addCustText: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
});
