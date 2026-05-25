// screens/AgentConsoleScreen.tsx
// Otonom AI Agent konsolu. Görev gir → ajan kendi başına çalışır →
// her adım canlı transcript'te görünür. Destructive işlemler için onay sorulur.

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { useAppContext } from '../context/AppContext';
import { runAgent, type AgentEvent } from '../services/agent/loop';
import type { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface TranscriptItem {
  id: string;
  kind: AgentEvent['type'];
  text: string;
  data?: any;
}

const AgentConsoleScreen: React.FC = () => {
  const app = useAppContext();
  const nav = useNavigation<Nav>();
  const [goal, setGoal] = useState('');
  const [running, setRunning] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const stopRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const append = useCallback((it: Omit<TranscriptItem, 'id'>) => {
    setTranscript(prev => [...prev, { ...it, id: Math.random().toString(36).slice(2) }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  const confirmDestructive = useCallback((toolName: string, args: any): Promise<boolean> => {
    return new Promise(resolve => {
      const argsStr = JSON.stringify(args, null, 2).slice(0, 500);
      if (Platform.OS === 'web') {
        // eslint-disable-next-line no-alert
        const ok = window.confirm(
          `Ajan değişiklik yapmak istiyor:\n\nTool: ${toolName}\nArgs: ${argsStr}\n\nOnaylıyor musun?`,
        );
        resolve(ok);
        return;
      }
      Alert.alert(
        'Onay gerekli',
        `${toolName}\n\n${argsStr}`,
        [
          { text: 'İptal', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Onayla', style: 'destructive', onPress: () => resolve(true) },
        ],
        { cancelable: false },
      );
    });
  }, []);

  const handleEvent = useCallback(
    (e: AgentEvent) => {
      switch (e.type) {
        case 'start':
          append({ kind: e.type, text: '🎯 Hedef: ' + e.goal });
          break;
        case 'iteration':
          append({ kind: e.type, text: `⏱️ Adım ${e.n}/${e.max}` });
          break;
        case 'thought':
          append({ kind: e.type, text: '🧠 ' + e.content });
          break;
        case 'tool_call':
          append({
            kind: e.type,
            text: `🔧 ${e.name}(${JSON.stringify(e.args).slice(0, 120)})`,
            data: e.args,
          });
          break;
        case 'tool_result': {
          const preview = JSON.stringify(e.result ?? null).slice(0, 240);
          append({
            kind: e.type,
            text: (e.ok ? '✅ ' : '❌ ') + e.name + ' → ' + preview,
            data: e.result,
          });
          break;
        }
        case 'tool_denied':
          append({ kind: e.type, text: '🚫 ' + e.name + ' reddedildi: ' + e.reason });
          break;
        case 'final':
          append({ kind: e.type, text: '🏁 ' + e.content });
          break;
        case 'stop':
          append({ kind: e.type, text: '⏹️ Durdu: ' + e.reason });
          break;
        case 'error':
          append({ kind: e.type, text: '⚠️ ' + e.error });
          break;
      }
    },
    [append],
  );

  const start = useCallback(async () => {
    const g = goal.trim();
    if (!g || running) return;
    stopRef.current = false;
    setRunning(true);
    try {
      await runAgent({
        goal: g,
        maxIterations: 14,
        shouldStop: () => stopRef.current,
        onEvent: handleEvent,
        ctx: {
          app: app as any,
          confirm: confirmDestructive,
          log: (line: string) => append({ kind: 'thought', text: line }),
        },
      });
    } catch (e: any) {
      append({ kind: 'error', text: '⚠️ Çalıştırma hatası: ' + (e?.message || String(e)) });
    } finally {
      setRunning(false);
    }
  }, [goal, running, handleEvent, append, app, confirmDestructive]);

  const stop = useCallback(() => {
    stopRef.current = true;
  }, []);

  const clear = useCallback(() => setTranscript([]), []);

  const presetGoals = useMemo(
    () => [
      'Sistemi tara, sorunları bul ve her birini öneri olarak kaydet.',
      '130m² ev iç tesisat elektrik projelendirme + malzeme + işçilik için taslak teklif oluştur, ardından profesyonel teklif açıklaması yaz.',
      'EMO duyurularını tara, son 1 ayın değişikliklerini özetle ve önemli olanları öneri olarak kaydet.',
      'Resmî Gazete\'de elektrik tesisatı ile ilgili güncel mevzuatları araştır ve özetle.',
      'Web\'de "TS HD 60364" standardını araştır, kapsamı özetle.',
      'Bugünkü iş emirlerini özetle ve gecikenleri listele.',
      'Açık (Onay Bekliyor) iş emirlerinden en eski 3 tanesini bul.',
      'Son 5 teklifi listele, tutarı en yüksek olanı göster.',
      '"klima" geçen ürünleri bul, ilk 5\'ini fiyatlarıyla göster.',
    ],
    [],
  );

  return (
    <SafeAreaView style={st.root} edges={['top', 'left', 'right']}>
      <View style={st.header}>
        <Ionicons name="sparkles" size={22} color={colors.emerald.default} />
        <Text style={st.title}>Otonom AI Ajan</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => nav.navigate('AgentSuggestions')} style={st.linkBtn}>
          <Ionicons name="bulb-outline" size={16} color={colors.text.primary} />
          <Text style={st.linkBtnText}>Öneriler</Text>
        </TouchableOpacity>
        {running ? <ActivityIndicator color={colors.emerald.default} /> : null}
      </View>

      <View style={st.goalRow}>
        <TextInput
          style={st.input}
          value={goal}
          onChangeText={setGoal}
          placeholder="Hedefini yaz... (ör: bekleyen tüm iş emirlerini özetle)"
          placeholderTextColor={colors.text.muted}
          multiline
          editable={!running}
        />
      </View>

      <View style={st.actions}>
        {!running ? (
          <TouchableOpacity style={[st.btn, st.btnPrimary]} onPress={start} disabled={!goal.trim()}>
            <Ionicons name="play" size={16} color="#fff" />
            <Text style={st.btnTextPrimary}>Başlat</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[st.btn, st.btnDanger]} onPress={stop}>
            <Ionicons name="stop" size={16} color="#fff" />
            <Text style={st.btnTextPrimary}>Durdur</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[st.btn, st.btnGhost]} onPress={clear} disabled={running}>
          <Ionicons name="trash" size={16} color={colors.text.primary} />
          <Text style={st.btnTextGhost}>Temizle</Text>
        </TouchableOpacity>
      </View>

      {transcript.length === 0 ? (
        <ScrollView contentContainerStyle={st.presetWrap}>
          <Text style={st.presetTitle}>Örnek hedefler:</Text>
          {presetGoals.map(p => (
            <TouchableOpacity key={p} style={st.presetBtn} onPress={() => setGoal(p)} disabled={running}>
              <Text style={st.presetText}>• {p}</Text>
            </TouchableOpacity>
          ))}
          <Text style={st.hint}>
            Ajan, Groq (Llama 3.3 70B) ile çalışır. Ayarlar → AI'dan provider'ı "Groq" seç ve API anahtarını gir.
            Destructive (silme) işlemler her zaman onayını ister.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView ref={scrollRef} style={st.transcript} contentContainerStyle={{ padding: spacing.md }}>
          {transcript.map(t => (
            <View key={t.id} style={[st.bubble, bubbleStyle(t.kind)]}>
              <Text style={st.bubbleText}>{t.text}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

function bubbleStyle(kind: AgentEvent['type']) {
  switch (kind) {
    case 'thought':
      return { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' };
    case 'tool_call':
      return { backgroundColor: '#fef3c7', borderColor: '#fcd34d' };
    case 'tool_result':
      return { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' };
    case 'tool_denied':
      return { backgroundColor: '#fee2e2', borderColor: '#fca5a5' };
    case 'final':
      return { backgroundColor: '#dbeafe', borderColor: '#93c5fd' };
    case 'error':
      return { backgroundColor: '#fee2e2', borderColor: '#fca5a5' };
    case 'iteration':
      return { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' };
    default:
      return { backgroundColor: '#ffffff', borderColor: '#e5e7eb' };
  }
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.primary,
  },
  title: { ...typography.h3, color: colors.text.primary },
  goalRow: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  input: {
    minHeight: 60,
    maxHeight: 140,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.sm,
    color: colors.text.primary,
    backgroundColor: colors.bg.secondary,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  btnPrimary: { backgroundColor: colors.emerald.default },
  btnDanger: { backgroundColor: '#dc2626' },
  btnGhost: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary },
  btnTextPrimary: { color: '#fff', fontWeight: '600' },
  btnTextGhost: { color: colors.text.primary, fontWeight: '600' },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  linkBtnText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '600' },
  presetWrap: { padding: spacing.md, gap: spacing.sm },
  presetTitle: { color: colors.text.muted, marginBottom: spacing.xs, fontSize: typography.sm },
  presetBtn: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  presetText: { color: colors.text.primary },
  hint: { color: colors.text.muted, fontSize: 12, marginTop: spacing.md, lineHeight: 18 },
  transcript: { flex: 1 },
  bubble: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  bubbleText: { color: colors.text.primary, fontSize: 13, lineHeight: 19 },
});

export default AgentConsoleScreen;
