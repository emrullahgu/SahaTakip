import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';

const COMPANY_INFO = [
  {
    icon: 'business-outline' as const,
    label: 'Firma',
    value: 'SahaTakip',
    color: colors.indigo.default,
  },
  {
    icon: 'mail-outline' as const,
    label: 'E-posta',
    value: 'info@SahaTakip.com',
    color: colors.blue.default,
    onPress: () => Linking.openURL('mailto:info@SahaTakip.com'),
  },
  {
    icon: 'call-outline' as const,
    label: 'Telefon',
    value: '+90 535 714 5288',
    color: colors.emerald.default,
    onPress: () => Linking.openURL('tel:+905357145288'),
  },
  {
    icon: 'location-outline' as const,
    label: 'Adres',
    value: 'Kemalpaşa OSB Mahallesi, Gazi Bulvarı, No:177, D:19\nİzmir, 35170 Türkiye',
    color: colors.rose.default,
  },
  {
    icon: 'globe-outline' as const,
    label: 'Web Sitesi',
    value: 'www.sahatakip.com',
    color: colors.amber.default,
    onPress: () => Linking.openURL('https://www.sahatakip.com'),
  },
];

export default function CompanyScreen() {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Logo / Brand Header */}
      <View style={styles.brandBox}>
        <View style={styles.logoCircle}>
          <Ionicons name="flash" size={32} color={colors.emerald.default} />
        </View>
        <Text style={styles.brandName}>SahaTakip</Text>
        <Text style={styles.brandTagline}>Elektrik Saha Mühendisliği & Servis</Text>
        <View style={styles.activeBadge}>
          <View style={styles.activeDot} />
          <Text style={styles.activeText}>Aktif Servis Firması</Text>
        </View>
      </View>

      {/* Info Cards */}
      <Text style={styles.sectionLabel}>İletişim Bilgileri</Text>
      {COMPANY_INFO.map((item, idx) => (
        <TouchableOpacity
          key={idx}
          style={styles.card}
          onPress={item.onPress}
          activeOpacity={item.onPress ? 0.75 : 1}
          disabled={!item.onPress}
        >
          <View style={[styles.cardIcon, { backgroundColor: item.color + '20' }]}>
            <Ionicons name={item.icon} size={22} color={item.color} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardLabel}>{item.label}</Text>
            <Text style={styles.cardValue}>{item.value}</Text>
          </View>
          {item.onPress && (
            <Ionicons name="chevron-forward" size={16} color={colors.text.faint} />
          )}
        </TouchableOpacity>
      ))}

      {/* Services Section */}
      <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>Sunduğumuz Hizmetler</Text>
      {[
        'OG/AG Elektrik Pano Montaj ve Revizyon',
        'Trafo Bakım ve Test Hizmetleri',
        'Kompanzasyon Sistemi Kurulum',
        'Saha Yönetim Yazılımı (SahaTakip)',
        'Periyodik Elektrik Bakım Kontratları',
      ].map((s, i) => (
        <View key={i} style={styles.serviceRow}>
          <Ionicons name="checkmark-circle" size={16} color={colors.emerald.default} />
          <Text style={styles.serviceText}>{s}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 40 },
  brandBox: {
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.emerald.bg,
    borderWidth: 2,
    borderColor: colors.emerald.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  brandName: {
    fontSize: typography.xxl,
    color: colors.text.primary,
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: typography.sm,
    color: colors.text.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    backgroundColor: colors.emerald.bg,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.emerald.border,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.emerald.default,
  },
  activeText: { fontSize: typography.xs, color: colors.emerald.default, fontWeight: '600' },
  sectionLabel: {
    fontSize: typography.xs,
    color: colors.text.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.primary,
    gap: spacing.md,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { flex: 1 },
  cardLabel: {
    fontSize: typography.xs,
    color: colors.text.faint,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: typography.sm,
    color: colors.text.primary,
    fontWeight: '600',
    lineHeight: 20,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  serviceText: { fontSize: typography.sm, color: colors.text.secondary, flex: 1 },
});
