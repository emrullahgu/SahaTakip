// Faz 44 — OperationReplayScreen
import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { OperationReplayFrame } from '../types';
import { listReplay } from '../services/liveOps';
import EmptyState from '../components/EmptyState';

const PALETTE = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function OperationReplayScreen() {
  const [frames, setFrames] = useState<OperationReplayFrame[]>([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => { setFrames(await listReplay()); setIdx(0); }, []);
  useFocusEffect(useCallback(() => { load(); return () => { if (tRef.current) clearTimeout(tRef.current); }; }, [load]));

  useEffect(() => {
    if (!playing) return;
    if (idx >= frames.length - 1) { setPlaying(false); return; }
    tRef.current = setTimeout(() => setIdx(i => Math.min(i + 1, frames.length - 1)), 600);
    return () => { if (tRef.current) clearTimeout(tRef.current); };
  }, [playing, idx, frames.length]);

  const current = frames[idx];
  const bounds = useMemo(() => {
    if (frames.length === 0) return null;
    const all = frames.flatMap(f => f.positions);
    const lats = all.map(p => p.lat);
    const lngs = all.map(p => p.lng);
    return { minLat: Math.min(...lats), maxLat: Math.max(...lats), minLng: Math.min(...lngs), maxLng: Math.max(...lngs) };
  }, [frames]);

  // Trail = positions from frames 0..idx for each person
  const trails = useMemo(() => {
    if (!current) return [];
    const names = current.positions.map(p => p.name);
    return names.map((name, ni) => ({
      name,
      color: PALETTE[ni % PALETTE.length],
      points: frames.slice(0, idx + 1).map(f => f.positions.find(p => p.name === name)).filter(Boolean) as { name: string; lat: number; lng: number }[],
    }));
  }, [frames, idx, current]);

  if (!current || !bounds) {
    return (
      <SafeAreaView style={s.safe}>
        <EmptyState icon="play-circle-outline" title="Yükleniyor..." subtitle="Operasyon geçmişi kareleri hazırlanıyor." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.header}>
        <Text style={s.time}>{new Date(current.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text>
        <Text style={s.frame}>Kare {idx + 1} / {frames.length}</Text>
      </View>
      <View style={s.canvas}>
        {trails.map((tr, ti) => (
          <React.Fragment key={tr.name}>
            {tr.points.map((p, pi) => {
              const x = ((p.lng - bounds.minLng) / Math.max(0.001, bounds.maxLng - bounds.minLng)) * 100;
              const y = (1 - (p.lat - bounds.minLat) / Math.max(0.001, bounds.maxLat - bounds.minLat)) * 100;
              const isHead = pi === tr.points.length - 1;
              return (
                <View key={`${tr.name}-${pi}`} style={[s.dot, {
                  left: `${x}%`, top: `${y}%`,
                  backgroundColor: tr.color,
                  width: isHead ? 18 : 6,
                  height: isHead ? 18 : 6,
                  borderRadius: isHead ? 9 : 3,
                  marginLeft: isHead ? -9 : -3,
                  marginTop: isHead ? -9 : -3,
                  opacity: isHead ? 1 : 0.4,
                }]} />
              );
            })}
          </React.Fragment>
        ))}
      </View>
      <View style={s.legend}>
        {trails.map(tr => (
          <View key={tr.name} style={s.legItem}>
            <View style={[s.legDot, { backgroundColor: tr.color }]} />
            <Text style={s.legT}>{tr.name}</Text>
          </View>
        ))}
      </View>
      <View style={s.controls}>
        <TouchableOpacity style={s.ctrlBtn} onPress={() => setIdx(0)}>
          <Ionicons name="play-back" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={s.ctrlBtn} onPress={() => setIdx(i => Math.max(0, i - 1))}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[s.ctrlBtn, { backgroundColor: '#a855f7', flex: 2 }]} onPress={() => setPlaying(p => !p)}>
          <Ionicons name={playing ? 'pause' : 'play'} size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={s.ctrlBtn} onPress={() => setIdx(i => Math.min(frames.length - 1, i + 1))}>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={s.ctrlBtn} onPress={() => setIdx(frames.length - 1)}>
          <Ionicons name="play-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  header: { padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: colors.text.primary, fontSize: typography.xxl, fontWeight: '800' },
  frame: { color: colors.text.muted, fontSize: typography.sm },
  canvas: { margin: spacing.md, height: 280, backgroundColor: '#0f172a', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, position: 'relative', overflow: 'hidden' },
  dot: { position: 'absolute' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legDot: { width: 10, height: 10, borderRadius: 5 },
  legT: { color: colors.text.muted, fontSize: typography.xs },
  controls: { flexDirection: 'row', gap: 6, padding: spacing.md },
  ctrlBtn: { flex: 1, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, alignItems: 'center' },
});
