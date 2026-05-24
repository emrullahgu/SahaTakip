// RoleLockScreen — Tam ekran "Yetki Gerekli" görseli
// Finans/admin gerektiren ekranların başına render edilir.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';

interface Props {
  title?: string;
  description?: string;
}

export default function RoleLockScreen({
  title = 'Yetki Gerekli',
  description = 'Bu ekranı yalnızca yönetici veya finans yetkilileri görüntüleyebilir.',
}: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.box}>
        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed-outline" size={40} color={colors.text.muted} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{description}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  box: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { ...typography.h2, color: colors.text.primary, marginBottom: spacing.sm },
  desc: { ...typography.body, color: colors.text.muted, textAlign: 'center', maxWidth: 360 },
});
