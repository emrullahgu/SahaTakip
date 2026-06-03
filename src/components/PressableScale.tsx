// PressableScale — basınca hafifçe küçülen, modern dokunsal his veren buton/kart sarmalayıcı.
// Abartısız (scale 0.97, spring). TouchableOpacity yerine drop-in kullanılabilir.
// react-native-reanimated gerektirmez; built-in Animated (web'de de çalışır).
import React, { useRef } from 'react';
import { Animated, Pressable, StyleProp, ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  scaleTo?: number;
  hitSlop?: number;
}

export default function PressableScale({
  children, onPress, onLongPress, style, disabled, scaleTo = 0.97, hitSlop,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 50, bounciness: 0 }).start();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => animate(scaleTo)}
      onPressOut={() => animate(1)}
      disabled={disabled}
      hitSlop={hitSlop}
      style={({ pressed }) => ({ opacity: disabled ? 0.5 : pressed ? 0.95 : 1 })}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
