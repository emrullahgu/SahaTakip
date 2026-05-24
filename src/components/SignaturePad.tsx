// ====================================================================
// SignaturePad — FAZ 19 (POZ-DEV-033)
// Harici kütüphane gerektirmeyen, basit dokunma tabanlı imza panosu.
// Strokes dizisi JSON+base64 olarak data:application/json;base64,...
// formatında saklanır; native ve web'de aynı şekilde çalışır.
// ====================================================================

import React, { useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, brand } from '../theme';

type Point = { x: number; y: number; start?: boolean };

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (dataUri: string) => void;
  title?: string;
}

const toBase64 = (str: string): string => {
  // Web
  if (typeof btoa === 'function') {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch {
      // fallthrough
    }
  }
  // Native fallback (RN polyfilled global.Buffer yoksa basit kodlama)
  const g: any = globalThis as any;
  if (g.Buffer) return g.Buffer.from(str, 'utf-8').toString('base64');
  // Son çare: base64 encode olmadan ham döndür
  return encodeURIComponent(str);
};

export default function SignaturePad({ visible, onClose, onSave, title }: Props) {
  const [points, setPoints] = useState<Point[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const pointsRef = useRef<Point[]>([]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: evt => {
          const { locationX, locationY } = evt.nativeEvent;
          const p: Point = { x: locationX, y: locationY, start: true };
          pointsRef.current = [...pointsRef.current, p];
          setPoints(pointsRef.current);
        },
        onPanResponderMove: evt => {
          const { locationX, locationY } = evt.nativeEvent;
          const p: Point = { x: locationX, y: locationY };
          pointsRef.current = [...pointsRef.current, p];
          setPoints(pointsRef.current);
        },
      }),
    [],
  );

  const clear = () => {
    pointsRef.current = [];
    setPoints([]);
  };

  const save = () => {
    if (points.length < 3) {
      onClose();
      return;
    }
    const payload = {
      v: 1,
      w: size.w,
      h: size.h,
      strokes: points,
    };
    const json = JSON.stringify(payload);
    const b64 = toBase64(json);
    onSave(`data:application/json;base64,${b64}`);
    clear();
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{title ?? 'İmza'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View
            style={styles.canvas}
            onLayout={onLayout}
            {...responder.panHandlers}
          >
            {points.map((p, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { left: p.x - 1.5, top: p.y - 1.5 },
                  p.start && styles.dotStart,
                ]}
              />
            ))}
            {points.length === 0 && (
              <Text style={styles.hint}>Parmağınızla imzalayın</Text>
            )}
          </View>

          <View style={styles.row}>
            <TouchableOpacity style={styles.outlineBtn} onPress={clear}>
              <Ionicons name="refresh" size={16} color={colors.text.primary} />
              <Text style={styles.outlineBtnText}>Temizle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, points.length < 3 && { opacity: 0.5 }]}
              onPress={save}
              disabled={points.length < 3}
            >
              <Ionicons name="checkmark" size={16} color={colors.bg.primary} />
              <Text style={styles.primaryBtnText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: { color: colors.text.primary, fontSize: 15, fontWeight: '700' },
  canvas: {
    height: 240,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.primary,
    overflow: 'hidden',
    position: 'relative',
  },
  hint: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: colors.text.muted,
    fontSize: 13,
  },
  dot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  dotStart: { width: 4, height: 4, borderRadius: 2 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  outlineBtnText: { color: colors.text.primary, fontWeight: '700', fontSize: 13 },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: brand.green,
  },
  primaryBtnText: { color: colors.bg.primary, fontWeight: '800', fontSize: 13 },
});
