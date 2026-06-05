// ProductCatalogScreen — 13K+ ürünü kategorize/marka filtreli arama + toplu fiyat/iskonto
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import { MATERIAL_CATALOG, MATERIAL_CATEGORIES, MATERIAL_BRANDS } from '../data/initialData';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import {
  listPricingRules, upsertPricingRule, deletePricingRule,
  applyPricingRules, countAffected, type BrandPricingRule, type PricingScope,
} from '../services/productPricing';
import {
  loadOverrides, setProductPrice, setProductName, setProductDeleted, applyOverrides,
  loadCustomProducts, addCustomProduct, updateCustomProduct, deleteCustomProduct, isCustomProduct,
  type OverrideMap,
} from '../services/catalogOverrides';
import type { MaterialCatalogItem } from '../types';

export default function ProductCatalogScreen() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const [showAllCats, setShowAllCats] = useState(false);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [rules, setRules] = useState<BrandPricingRule[]>([]);
  const [showBulk, setShowBulk] = useState(false);
  const [overrides, setOverrides] = useState<OverrideMap>({});
  const [custom, setCustom] = useState<MaterialCatalogItem[]>([]);
  const [editItem, setEditItem] = useState<{ id: string; name: string; price: number } | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editName, setEditName] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addF, setAddF] = useState({ name: '', price: '', category: '', brand: '', code: '' });

  const loadRules = useCallback(async () => {
    setRules(await listPricingRules());
    setOverrides(await loadOverrides());
    setCustom(await loadCustomProducts());
  }, []);
  useFocusEffect(useCallback(() => { loadRules(); }, [loadRules]));

  // Elle eklenenler + paylaşımlı override'lı base katalog.
  const effectiveCatalog = useMemo(
    () => [...custom, ...applyOverrides(MATERIAL_CATALOG, overrides)],
    [overrides, custom],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    let base = effectiveCatalog;
    if (category) base = base.filter(m => m.category === category);
    if (brand) base = base.filter(m => m.brand === brand);
    if (q) {
      base = base.filter(m =>
        (m.name || '').toLocaleLowerCase('tr-TR').includes(q) ||
        (m.code || '').toLocaleLowerCase('tr-TR').includes(q) ||
        (m.brand || '').toLocaleLowerCase('tr-TR').includes(q) ||
        (m.category || '').toLocaleLowerCase('tr-TR').includes(q),
      );
    }
    // Toplu fiyat kurallarını yalnızca görünen ≤500 ürüne uygula (ucuz).
    return applyPricingRules(base.slice(0, 500), rules);
  }, [search, category, brand, rules, effectiveCatalog]);

  const saveEdit = async () => {
    if (!editItem) return;
    const p = parseFloat(editPrice.replace(',', '.'));
    if (!isFinite(p) || p < 0) { Alert.alert('Geçersiz', 'Geçerli bir fiyat girin.'); return; }
    const name = editName.trim();
    if (!name) { Alert.alert('Geçersiz', 'Ürün adı boş olamaz.'); return; }
    try {
      if (isCustomProduct(editItem.id)) {
        await updateCustomProduct(editItem.id, { name, price: p });
        setCustom(prev => prev.map(x => x.id === editItem.id ? { ...x, name, price: p, listPrice: p } : x));
      } else {
        await setProductPrice(editItem.id, p);
        if (name !== editItem.name) await setProductName(editItem.id, name);
        setOverrides(prev => ({ ...prev, [editItem.id]: { ...(prev[editItem.id] || { deleted: false }), price: p, name } }));
      }
      setEditItem(null);
    } catch (e: any) { Alert.alert('Hata', e?.message || 'Kaydedilemedi'); }
  };

  const deleteProduct = (id: string, name: string) => {
    Alert.alert('Ürünü Sil', `"${name}" katalogdan kaldırılsın mı? (geri alınabilir)`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try {
          if (isCustomProduct(id)) {
            await deleteCustomProduct(id);
            setCustom(prev => prev.filter(x => x.id !== id));
          } else {
            await setProductDeleted(id, true);
            setOverrides(prev => ({ ...prev, [id]: { ...(prev[id] || {}), deleted: true } }));
          }
        } catch (e: any) { Alert.alert('Hata', e?.message || 'Silinemedi'); }
      } },
    ]);
  };

  const addProduct = async () => {
    const p = parseFloat(addF.price.replace(',', '.'));
    if (!addF.name.trim()) { Alert.alert('Eksik', 'Ürün adı girin.'); return; }
    if (!isFinite(p) || p < 0) { Alert.alert('Eksik', 'Geçerli bir fiyat girin.'); return; }
    try {
      const item = await addCustomProduct({ name: addF.name, price: p, category: addF.category || undefined, brand: addF.brand || undefined, code: addF.code || undefined });
      setCustom(prev => [item, ...prev]);
      setShowAdd(false);
      setAddF({ name: '', price: '', category: '', brand: '', code: '' });
    } catch (e: any) { Alert.alert('Hata', e?.message || 'Eklenemedi'); }
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={s.headerTitle}>Ürün Kataloğu</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={s.bulkBtnText}>Yeni Ürün</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.bulkBtn} onPress={() => setShowBulk(true)} activeOpacity={0.85}>
              <Ionicons name="pricetags-outline" size={14} color="#fff" />
              <Text style={s.bulkBtnText}>Toplu Fiyat{rules.length ? ` (${rules.length})` : ''}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={s.headerMeta}>
          {effectiveCatalog.length.toLocaleString('tr-TR')} ürün · {MATERIAL_CATEGORIES.length} kategori · {MATERIAL_BRANDS.length} marka
        </Text>
      </View>

      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.text.faint} />
        <TextInput
          style={s.searchInput}
          placeholder="Ad, kod, marka veya kategori..."
          placeholderTextColor={colors.text.faint}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      <View style={s.filterGroup}>
        <View style={s.filterLabelRow}>
          <Text style={s.filterLabel}>Kategori {category ? `· ${category}` : ''}</Text>
          <TouchableOpacity onPress={() => setShowAllCats(v => !v)} style={s.toggleBtn}>
            <Text style={s.toggleText}>{showAllCats ? 'Daralt ▲' : `Tümünü gör (${MATERIAL_CATEGORIES.length}) ▼`}</Text>
          </TouchableOpacity>
        </View>
        <View style={[s.chipWrap, !showAllCats && s.chipWrapCollapsed]}>
          <Chip label="Tümü" active={!category} onPress={() => setCategory(null)} />
          {MATERIAL_CATEGORIES.map(c => (
            <Chip key={c} label={c} active={category === c} onPress={() => setCategory(category === c ? null : c)} />
          ))}
        </View>
      </View>

      <View style={s.filterGroup}>
        <View style={s.filterLabelRow}>
          <Text style={s.filterLabel}>Marka {brand ? `· ${brand}` : ''}</Text>
          <TouchableOpacity onPress={() => setShowAllBrands(v => !v)} style={s.toggleBtn}>
            <Text style={s.toggleText}>{showAllBrands ? 'Daralt ▲' : `Tümünü gör (${MATERIAL_BRANDS.length}) ▼`}</Text>
          </TouchableOpacity>
        </View>
        <View style={[s.chipWrap, !showAllBrands && s.chipWrapCollapsed]}>
          <Chip label="Tümü" active={!brand} onPress={() => setBrand(null)} />
          {MATERIAL_BRANDS.map(b => (
            <Chip key={b} label={b} active={brand === b} onPress={() => setBrand(brand === b ? null : b)} />
          ))}
        </View>
      </View>

      <Text style={s.resultCount}>
        {filtered.length === 500 ? 'İlk 500 sonuç' : `${filtered.length} sonuç`}
      </Text>

      <FlatList
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={p => p.id}
        contentContainerStyle={s.content}
        renderItem={({ item }) => {
          const tags = [item.brand, item.category].filter(Boolean).join(' · ');
          const showOriginal =
            item.currency && item.currency !== 'TL' && item.currency !== 'TRY' && item.listPrice;
          return (
            <View style={s.card}>
              <View style={{ flex: 1 }}>
                {!!item.code && <Text style={s.code}>{item.code}</Text>}
                <Text style={s.name} numberOfLines={2}>{item.name}</Text>
                {!!tags && <Text style={s.tags}>{tags}</Text>}
              </View>
              <View style={s.priceBox}>
                <Text style={s.priceTL}>₺{item.price.toLocaleString('tr-TR')}</Text>
                {overrides[item.id]?.price != null && <Text style={s.edited}>düzenlendi</Text>}
                {showOriginal && (
                  <Text style={s.priceOrig}>{item.listPrice} {item.currency}</Text>
                )}
                {!!item.discountRate && item.discountRate > 0 && (
                  <Text style={s.discount}>%{item.discountRate} isk.</Text>
                )}
              </View>
              <View style={s.rowActions}>
                <TouchableOpacity onPress={() => { setEditItem({ id: item.id, name: item.name, price: item.price }); setEditPrice(String(item.price)); setEditName(item.name); }} hitSlop={6}>
                  <Ionicons name="pencil" size={17} color={colors.blue.default} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteProduct(item.id, item.name)} hitSlop={6}>
                  <Ionicons name="trash-outline" size={17} color={colors.rose.default} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={s.empty}>Sonuç bulunamadı.</Text>
        }
      />

      {/* Fiyat düzenleme modalı */}
      <Modal visible={!!editItem} transparent animationType="fade" onRequestClose={() => setEditItem(null)}>
        <View style={s.editOverlay}>
          <View style={s.editBox}>
            <Text style={s.editTitle}>Ürünü Düzenle</Text>
            <Text style={s.editLabel}>Ürün adı</Text>
            <TextInput
              style={[s.editInput, { fontSize: typography.sm }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Ürün adı"
              placeholderTextColor={colors.text.faint}
              multiline
            />
            <Text style={s.editLabel}>Birim fiyat (₺)</Text>
            <TextInput
              style={s.editInput}
              value={editPrice}
              onChangeText={setEditPrice}
              keyboardType="decimal-pad"
              selectTextOnFocus
              placeholder="0"
              placeholderTextColor={colors.text.faint}
            />
            <View style={s.editActions}>
              <TouchableOpacity style={[s.editBtn, { backgroundColor: colors.bg.card }]} onPress={() => setEditItem(null)}>
                <Text style={[s.editBtnText, { color: colors.text.muted }]}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.editBtn, { backgroundColor: colors.emerald.default }]} onPress={saveEdit}>
                <Text style={s.editBtnText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Yeni ürün ekleme modalı */}
      <Modal visible={showAdd} transparent animationType="fade" onRequestClose={() => setShowAdd(false)}>
        <View style={s.editOverlay}>
          <View style={s.editBox}>
            <Text style={s.editTitle}>Yeni Ürün Ekle</Text>
            <Text style={s.editLabel}>Ürün adı *</Text>
            <TextInput style={[s.editInput, { fontSize: typography.sm }]} value={addF.name} onChangeText={t => setAddF(f => ({ ...f, name: t }))} placeholder="Ürün adı" placeholderTextColor={colors.text.faint} />
            <Text style={s.editLabel}>Birim fiyat (₺) *</Text>
            <TextInput style={s.editInput} value={addF.price} onChangeText={t => setAddF(f => ({ ...f, price: t }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.text.faint} />
            <Text style={s.editLabel}>Kategori / Marka / Kod (opsiyonel)</Text>
            <TextInput style={[s.editInput, { fontSize: typography.sm, marginBottom: 6 }]} value={addF.category} onChangeText={t => setAddF(f => ({ ...f, category: t }))} placeholder="Kategori" placeholderTextColor={colors.text.faint} />
            <TextInput style={[s.editInput, { fontSize: typography.sm, marginBottom: 6 }]} value={addF.brand} onChangeText={t => setAddF(f => ({ ...f, brand: t }))} placeholder="Marka" placeholderTextColor={colors.text.faint} />
            <TextInput style={[s.editInput, { fontSize: typography.sm }]} value={addF.code} onChangeText={t => setAddF(f => ({ ...f, code: t }))} placeholder="Kod" placeholderTextColor={colors.text.faint} />
            <View style={s.editActions}>
              <TouchableOpacity style={[s.editBtn, { backgroundColor: colors.bg.card }]} onPress={() => setShowAdd(false)}>
                <Text style={[s.editBtnText, { color: colors.text.muted }]}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.editBtn, { backgroundColor: colors.emerald.default }]} onPress={addProduct}>
                <Text style={s.editBtnText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BulkPricingModal
        visible={showBulk}
        onClose={() => setShowBulk(false)}
        rules={rules}
        currentBrand={brand}
        currentCategory={category}
        onChanged={loadRules}
      />
    </SafeAreaView>
  );
}

// ── Toplu fiyat / iskonto düzenleyici ───────────────────────────────────────
function BulkPricingModal({
  visible, onClose, rules, currentBrand, currentCategory, onChanged,
}: {
  visible: boolean;
  onClose: () => void;
  rules: BrandPricingRule[];
  currentBrand: string | null;
  currentCategory: string | null;
  onChanged: () => void;
}) {
  const [scope, setScope] = useState<PricingScope>('brand');
  const [key, setKey] = useState('');
  const [discount, setDiscount] = useState('');
  const [markup, setMarkup] = useState('');

  // Modal açıldığında mevcut filtreye göre kapsamı ön-doldur.
  React.useEffect(() => {
    if (!visible) return;
    if (currentBrand) { setScope('brand'); setKey(currentBrand); }
    else if (currentCategory) { setScope('category'); setKey(currentCategory); }
    else { setScope('all'); setKey('*'); }
    setDiscount(''); setMarkup('');
  }, [visible, currentBrand, currentCategory]);

  const affected = useMemo(
    () => (scope === 'all' || key ? countAffected(MATERIAL_CATALOG, scope, key) : 0),
    [scope, key],
  );

  const onApply = async () => {
    if (scope !== 'all' && !key.trim()) { Alert.alert('Eksik', 'Marka/kategori seçin.'); return; }
    const d = discount.trim() === '' ? undefined : parseFloat(discount.replace(',', '.'));
    const m = markup.trim() === '' ? undefined : parseFloat(markup.replace(',', '.'));
    if (d === undefined && m === undefined) { Alert.alert('Eksik', 'İskonto veya zam oranı girin.'); return; }
    await upsertPricingRule({ scope, key, discountRate: d, markupPct: m });
    onChanged();
    Alert.alert('Uygulandı', `${affected.toLocaleString('tr-TR')} ürün güncellendi.`);
    setDiscount(''); setMarkup('');
  };

  const onRemove = async (r: BrandPricingRule) => {
    await deletePricingRule(r.scope, r.key);
    onChanged();
  };

  const scopeLabel = (sc: PricingScope) => (sc === 'brand' ? 'Marka' : sc === 'category' ? 'Kategori' : 'Tümü');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.backdrop}>
        <View style={m.sheet}>
          <View style={m.sheetHead}>
            <Text style={m.sheetTitle}>Toplu Fiyat / İskonto</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={colors.text.muted} /></TouchableOpacity>
          </View>

          <Text style={m.hint}>
            Efektif fiyat = katalog fiyatı × (1 + zam%) × (1 − iskonto%). Kurallar kaynak veriyi bozmaz, kaldırınca eski fiyat döner.
          </Text>

          {/* Kapsam */}
          <Text style={m.label}>Kapsam</Text>
          <View style={m.scopeRow}>
            {(['brand', 'category', 'all'] as PricingScope[]).map(sc => (
              <TouchableOpacity
                key={sc}
                style={[m.scopeChip, scope === sc && m.scopeChipActive]}
                onPress={() => { setScope(sc); if (sc === 'all') setKey('*'); else setKey(''); }}
              >
                <Text style={[m.scopeChipText, scope === sc && { color: '#fff' }]}>{scopeLabel(sc)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Marka/kategori seçimi */}
          {scope !== 'all' && (
            <>
              <Text style={m.label}>{scope === 'brand' ? 'Marka' : 'Kategori'} seç</Text>
              <View style={m.pickWrap}>
                <FlatList
                  data={scope === 'brand' ? MATERIAL_BRANDS : MATERIAL_CATEGORIES}
                  keyExtractor={(x) => x}
                  horizontal={false}
                  numColumns={2}
                  style={{ maxHeight: 140 }}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity style={[m.pickChip, key === item && m.scopeChipActive]} onPress={() => setKey(item)}>
                      <Text style={[m.pickChipText, key === item && { color: '#fff' }]} numberOfLines={1}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </>
          )}

          {/* Oranlar */}
          <View style={m.inputRow}>
            <View style={{ flex: 1 }}>
              <Text style={m.label}>İskonto %</Text>
              <TextInput style={m.input} value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" placeholder="örn. 25" placeholderTextColor={colors.text.faint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={m.label}>Zam % (− indirim)</Text>
              <TextInput style={m.input} value={markup} onChangeText={setMarkup} keyboardType="numbers-and-punctuation" placeholder="örn. 10 / -5" placeholderTextColor={colors.text.faint} />
            </View>
          </View>

          <TouchableOpacity style={m.applyBtn} onPress={onApply} activeOpacity={0.85}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={m.applyText}>Uygula ({affected.toLocaleString('tr-TR')} ürün)</Text>
          </TouchableOpacity>

          {/* Aktif kurallar */}
          {rules.length > 0 && (
            <>
              <Text style={[m.label, { marginTop: spacing.md }]}>Aktif Kurallar ({rules.length})</Text>
              <View style={{ maxHeight: 150 }}>
                <FlatList
                  data={rules}
                  keyExtractor={(r) => `${r.scope}:${r.key}`}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item: r }) => (
                    <View style={m.ruleRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={m.ruleTitle}>{scopeLabel(r.scope)}{r.scope !== 'all' ? ` · ${r.key}` : ''}</Text>
                        <Text style={m.ruleMeta}>
                          {r.discountRate != null ? `İskonto %${r.discountRate}` : ''}
                          {r.discountRate != null && r.markupPct != null ? ' · ' : ''}
                          {r.markupPct != null ? `Zam %${r.markupPct}` : ''}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => onRemove(r)} style={m.ruleDel}>
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.chip, active && s.chipActive]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.lg },
  headerMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.emerald.default, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full },
  bulkBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: spacing.md, marginBottom: 8,
    paddingHorizontal: spacing.sm, paddingVertical: 8,
    backgroundColor: colors.bg.secondary, borderWidth: 1,
    borderColor: colors.border.primary, borderRadius: radius.sm,
  },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: typography.sm, paddingVertical: 2 },
  filterGroup: { marginBottom: 8 },
  filterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: 6,
  },
  filterLabel: {
    color: colors.text.faint,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  toggleBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  toggleText: { color: '#10b981', fontSize: 11, fontWeight: '700' },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  chipWrapCollapsed: { maxHeight: 34, overflow: 'hidden' },
  chip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary,
  },
  chipActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  chipText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  resultCount: { paddingHorizontal: spacing.md, paddingVertical: 4, color: colors.text.faint, fontSize: typography.xs },
  content: { padding: spacing.md, paddingBottom: 80, gap: spacing.sm },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, backgroundColor: colors.bg.secondary,
    borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md,
  },
  code: { color: colors.text.faint, fontSize: 11, fontWeight: '700' },
  name: { color: colors.text.primary, fontWeight: '600', fontSize: typography.sm, marginTop: 2 },
  tags: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  priceBox: { alignItems: 'flex-end', minWidth: 80 },
  edited: { color: colors.blue.default, fontSize: 9, fontWeight: '700', marginTop: 1 },
  rowActions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', paddingLeft: spacing.sm },
  editOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  editBox: { width: '100%', maxWidth: 360, backgroundColor: colors.bg.primary, borderRadius: radius.lg, padding: spacing.lg },
  editTitle: { fontSize: typography.md, color: colors.text.primary, fontWeight: '800' },
  editLabel: { fontSize: typography.xs, color: colors.text.muted, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.xs },
  editInput: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  editActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  editBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, paddingVertical: spacing.sm },
  editBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: '800' },
  priceTL: { color: '#10b981', fontWeight: '800', fontSize: typography.sm },
  priceOrig: { color: colors.text.muted, fontSize: 11, marginTop: 2 },
  discount: { color: '#f59e0b', fontSize: 10, fontWeight: '700', marginTop: 2 },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: spacing.xl },
});

const m = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg.primary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '90%' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sheetTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  hint: { color: colors.text.muted, fontSize: typography.xs, marginBottom: spacing.md, lineHeight: 16 },
  label: { color: colors.text.faint, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 4 },
  scopeRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  scopeChip: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  scopeChipActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  scopeChipText: { color: colors.text.primary, fontWeight: '700', fontSize: typography.xs },
  pickWrap: { borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, padding: 6, backgroundColor: colors.bg.secondary },
  pickChip: { flex: 1, margin: 3, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.primary },
  pickChipText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '600' },
  inputRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 10, color: colors.text.primary, fontSize: typography.sm },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#22c55e', paddingVertical: 13, borderRadius: radius.md, marginTop: spacing.md },
  applyText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, marginBottom: 6 },
  ruleTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.xs },
  ruleMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  ruleDel: { padding: 8, borderRadius: radius.sm, backgroundColor: '#ef444422' },
});
