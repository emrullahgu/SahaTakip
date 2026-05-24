// RowMenu — Liste satırlarında 3-nokta menü.
// Kullanım:
//   <RowMenu items={[{ label: 'Detay', icon: 'open-outline', onPress: ... },
//                    { label: 'Sil', icon: 'trash-outline', destructive: true, confirm: 'Silinsin mi?', onPress: ... }]} />
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';

export interface RowMenuItem {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void | Promise<void>;
  destructive?: boolean;
  /** Onay diyalogu mesajı — verilirse Alert.alert ile sorulur. */
  confirm?: string;
  /** Onay başlığı (varsayılan: "Onay"). */
  confirmTitle?: string;
}

interface Props {
  items: RowMenuItem[];
  /** İkon rengi (varsayılan: muted). */
  color?: string;
  /** İkon boyutu (varsayılan: 18). */
  size?: number;
}

export default function RowMenu({ items, color, size = 18 }: Props) {
  const [open, setOpen] = useState(false);

  const handlePress = (item: RowMenuItem) => {
    setOpen(false);
    if (item.confirm) {
      Alert.alert(item.confirmTitle || 'Onay', item.confirm, [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: item.destructive ? 'Sil' : 'Tamam',
          style: item.destructive ? 'destructive' : 'default',
          onPress: () => { void item.onPress(); },
        },
      ]);
    } else {
      void item.onPress();
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={(e) => { e.stopPropagation?.(); setOpen(true); }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.trigger}
      >
        <Ionicons name="ellipsis-vertical" size={size} color={color || colors.text.muted} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation?.()}>
            {items.map((it, i) => (
              <TouchableOpacity
                key={`${it.label}-${i}`}
                style={[styles.item, i === items.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => handlePress(it)}
                activeOpacity={0.7}
              >
                {it.icon && (
                  <Ionicons
                    name={it.icon}
                    size={18}
                    color={it.destructive ? colors.rose.default : colors.text.primary}
                  />
                )}
                <Text style={[styles.label, it.destructive && { color: colors.rose.default }]}>
                  {it.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.item, styles.cancel]} onPress={() => setOpen(false)}>
              <Text style={styles.cancelLabel}>Vazgeç</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { padding: 6 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  label: { fontSize: typography.md, color: colors.text.primary, fontWeight: '600' },
  cancel: {
    marginTop: spacing.sm,
    justifyContent: 'center',
    borderBottomWidth: 0,
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
  },
  cancelLabel: { fontSize: typography.md, color: colors.text.muted, fontWeight: '600' },
});
