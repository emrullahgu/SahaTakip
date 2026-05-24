// LoadingSkeleton.tsx — POZ-DEV-319 Yükleme iskeleti
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface Props {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBlock({ width = '100%', height = 16, borderRadius: br = radius.sm, style }: Props) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius: br, backgroundColor: colors.border.primary, opacity },
        style,
      ]}
    />
  );
}

interface ListProps {
  rows?: number;
  rowHeight?: number;
}

/**
 * Liste ekranları için iskelet — 5 kart, her biri başlık + alt satır.
 */
export default function LoadingSkeleton({ rows = 5, rowHeight = 64 }: ListProps) {
  return (
    <View style={s.container}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[s.card, { height: rowHeight }]}>
          <SkeletonBlock width="60%" height={14} />
          <SkeletonBlock width="40%" height={10} style={{ marginTop: spacing.xs }} />
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.sm },
  card: {
    backgroundColor: colors.bg.secondary,
    borderColor: colors.border.primary,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    justifyContent: 'center',
  },
});
