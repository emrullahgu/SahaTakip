// screens/AgentConsoleScreen.tsx
// Otonom AI Agent konsolu. Görev gir → ajan kendi başına çalışır →
// her adım canlı transcript'te görünür. Destructive işlemler için onay sorulur.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { useAppContext } from '../context/AppContext';
import { runAgent, type AgentEvent } from '../services/agent/loop';
import type { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'AgentConsole'>;

interface TranscriptItem {
  id: string;
  kind: AgentEvent['type'];
  text: string;
  data?: any;
  quoteId?: string; // create_quote_draft başarılıysa → "Teklifi Aç" CTA
}

// Dışa mesaj gönderen yüksek riskli tool'lar: onay diyaloğunda alıcı + TAM gövde
// gösterilmeli (500 karaktere kırpma yok). Argümanları kanal bazında ayrıştırır.
const OUTBOUND_TOOLS = new Set(['gmail_send', 'whatsapp_send']);

interface OutboundPreview {
  channel: string;
  recipient: string;
  subject?: string;
  body: string;
  extra: { label: string; value: string }[];
}

function outboundPreview(toolName: string, args: any): OutboundPreview | null {
  if (toolName === 'gmail_send') {
    return {
      channel: 'E-posta (Gmail)',
      recipient: String(args?.to ?? '').trim() || '(alıcı boş!)',
      subject: String(args?.subject ?? '').trim() || '(konu yok)',
      body: String(args?.body ?? ''),
      extra: [],
    };
  }
  if (toolName === 'whatsapp_send') {
    const extra: { label: string; value: string }[] = [];
    if (args?.templateName) extra.push({ label: 'Onaylı şablon', value: String(args.templateName) });
    if (Array.isArray(args?.templateParams) && args.templateParams.length) {
      extra.push({ label: 'Şablon değişkenleri', value: args.templateParams.map(String).join('  |  ') });
    }
    return {
      channel: 'WhatsApp',
      recipient: String(args?.phone ?? '').trim() || '(telefon boş!)',
      body:
        String(args?.message ?? '').trim() ||
        (args?.templateName ? '(düz metin yok — yukarıdaki onaylı şablon gönderilecek)' : ''),
      extra,
    };
  }
  return null;
}

const AgentConsoleScreen: React.FC = () => {
  const app = useAppContext();
  const nav = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const initialGoal = route.params?.initialGoal ?? '';
  const autoStart = !!route.params?.autoStart;
  const [goal, setGoal] = useState(initialGoal);
  const [running, setRunning] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const stopRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  // Yüksek riskli dışa mesaj onayı için özel modal durumu (Alert'in kırptığı
  // gövdeyi tam ve kaydırılabilir göster). resolve ref'te tutulur.
  const [pendingConfirm, setPendingConfirm] = useState<{ toolName: string; preview: OutboundPreview } | null>(null);
  const confirmResolveRef = useRef<((ok: boolean) => void) | null>(null);

  const append = useCallback((it: Omit<TranscriptItem, 'id'>) => {
    setTranscript(prev => [...prev, { ...it, id: Math.random().toString(36).slice(2) }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  // Modal'dan (onayla/iptal) gelen kararı bekleyen promise'i çözer.
  const resolvePendingConfirm = useCallback((ok: boolean) => {
    const r = confirmResolveRef.current;
    confirmResolveRef.current = null;
    setPendingConfirm(null);
    r?.(ok);
  }, []);

  const confirmDestructive = useCallback((toolName: string, args: any): Promise<boolean> => {
    return new Promise(resolve => {
      // Dışa mesaj gönderen tool'lar (gmail_send/whatsapp_send): alıcı + TAM gövde
      // her zaman tam görünmeli. Alert/confirm 500 karakterde kesip gövdeyi gizlerdi;
      // bunun yerine kaydırılabilir özel modal'a yönlendir (web + native).
      const preview = OUTBOUND_TOOLS.has(toolName) ? outboundPreview(toolName, args) : null;
      if (preview) {
        confirmResolveRef.current = resolve;
        setPendingConfirm({ toolName, preview });
        return;
      }

      // Diğer destructive tool'lar için genel 500 karakter önizleme yeterli.
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
          // Teklif oluşturulduysa kullanıcıyı doğrudan teklife götür (akış kopmasın).
          const qid = e.ok && e.name === 'create_quote_draft' && e.result && (e.result as any).id
            ? String((e.result as any).id) : undefined;
          append({
            kind: e.type,
            text: (e.ok ? '✅ ' : '❌ ') + e.name + ' → ' + preview,
            data: e.result,
            quoteId: qid,
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

  // initialGoal + autoStart ile geldiyse otomatik başlat
  const startedRef = useRef(false);
  useEffect(() => {
    if (autoStart && initialGoal && !startedRef.current && !running) {
      startedRef.current = true;
      // bir tick bekleyip start çağır (goal state'i set olsun)
      setTimeout(() => { void start(); }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, initialGoal]);

  const presetGoals = useMemo(
    () => [
      'Sistemi tara, sorunları bul ve her birini öneri olarak kaydet.',
      '130m² ev iç tesisat elektrik projelendirme + malzeme + işçilik için taslak teklif oluştur, ardından profesyonel teklif açıklaması yaz.',
      'EMO duyurularını tara, son 1 ayın değişikliklerini özetle ve önemli olanları öneri olarak kaydet.',
      'Resmî Gazete\'de elektrik tesisatı ile ilgili güncel mevzuatları araştır ve özetle.',
      'Web\'de "TS HD 60364" standardını araştır, kapsamı özetle.',
      'Google Drive\'da "teklif" geçen son dosyaları bul ve özetle.',
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
          accessibilityLabel="Ajan hedefi"
        />
      </View>

      <View style={st.actions}>
        {!running ? (
          <TouchableOpacity
            style={[st.btn, st.btnPrimary, !goal.trim() && { opacity: 0.5 }]}
            onPress={start}
            disabled={!goal.trim()}
            accessibilityRole="button"
            accessibilityState={{ disabled: !goal.trim() }}
            accessibilityLabel="Ajanı başlat"
          >
            <Ionicons name="play" size={16} color="#fff" />
            <Text style={st.btnTextPrimary}>Başlat</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[st.btn, st.btnDanger]} onPress={stop} accessibilityRole="button" accessibilityLabel="Ajanı durdur">
            <Ionicons name="stop" size={16} color="#fff" />
            <Text style={st.btnTextPrimary}>Durdur</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[st.btn, st.btnGhost, running && { opacity: 0.5 }]} onPress={clear} disabled={running} accessibilityRole="button" accessibilityLabel="Transkripti temizle">
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
              {t.quoteId && (
                <TouchableOpacity
                  style={st.openQuoteBtn}
                  onPress={() => nav.navigate('QuoteDetail', { quoteId: t.quoteId! })}
                  activeOpacity={0.85}
                >
                  <Ionicons name="document-text-outline" size={15} color="#fff" />
                  <Text style={st.openQuoteText}>Teklifi Aç</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* DIŞA MESAJ ONAYI — alıcı + TAM gövde (kaydırılabilir). Prompt-injection'a
          karşı bilinçli onay: web'den okunan içerik bu mesajı yönlendirmiş olabilir. */}
      <Modal
        visible={!!pendingConfirm}
        transparent
        animationType="slide"
        onRequestClose={() => resolvePendingConfirm(false)}
      >
        <View style={st.confirmOverlay}>
          <View style={st.confirmSheet}>
            {pendingConfirm && (
              <>
                <View style={st.confirmHeader}>
                  <Ionicons name="warning" size={20} color={colors.rose.default} />
                  <Text style={st.confirmTitle}>Dışa mesaj gönderilecek — onayla</Text>
                  <TouchableOpacity onPress={() => resolvePendingConfirm(false)} accessibilityLabel="Kapat">
                    <Ionicons name="close" size={22} color={colors.text.muted} />
                  </TouchableOpacity>
                </View>

                <Text style={st.confirmWarn}>
                  ⚠️ Bu mesajı ajan hazırladı. Ajan web'den içerik okuduysa o içerik mesajı
                  yönlendirmiş olabilir. Alıcıyı ve aşağıdaki TAM gövdeyi kontrol etmeden onaylama.
                </Text>

                <View style={st.fieldRow}>
                  <Text style={st.fieldLabel}>Kanal</Text>
                  <Text style={st.fieldValue}>{pendingConfirm.preview.channel}</Text>
                </View>
                <View style={st.fieldRow}>
                  <Text style={st.fieldLabel}>Alıcı</Text>
                  <Text style={[st.fieldValue, st.recipientValue]} selectable>
                    {pendingConfirm.preview.recipient}
                  </Text>
                </View>
                {pendingConfirm.preview.subject != null ? (
                  <View style={st.fieldRow}>
                    <Text style={st.fieldLabel}>Konu</Text>
                    <Text style={st.fieldValue} selectable>{pendingConfirm.preview.subject}</Text>
                  </View>
                ) : null}
                {pendingConfirm.preview.extra.map(e => (
                  <View key={e.label} style={st.fieldRow}>
                    <Text style={st.fieldLabel}>{e.label}</Text>
                    <Text style={st.fieldValue} selectable>{e.value}</Text>
                  </View>
                ))}

                <Text style={st.bodyLabel}>
                  Mesaj gövdesi (tam · {pendingConfirm.preview.body.length} karakter)
                </Text>
                <ScrollView style={st.bodyBox} contentContainerStyle={{ padding: spacing.sm }}>
                  <Text style={st.bodyText} selectable>
                    {pendingConfirm.preview.body || '(boş gövde)'}
                  </Text>
                </ScrollView>

                <View style={st.confirmActions}>
                  <TouchableOpacity
                    style={[st.btn, st.btnGhost, st.confirmBtn]}
                    onPress={() => resolvePendingConfirm(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Gönderimi iptal et"
                  >
                    <Ionicons name="close" size={16} color={colors.text.primary} />
                    <Text style={st.btnTextGhost}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[st.btn, st.btnDanger, st.confirmBtn]}
                    onPress={() => resolvePendingConfirm(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Mesajı gönder"
                  >
                    <Ionicons name="send" size={16} color="#fff" />
                    <Text style={st.btnTextPrimary}>Gönder</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  // Baloncuk arka planları her zaman açık pastel renkler; bu yüzden metin SABİT
  // koyu renk olmalı. (colors.text.primary koyu temada açık olur → açık baloncukta
  // okunmazdı.)
  bubbleText: { color: '#1f2937', fontSize: 13, lineHeight: 19 },
  openQuoteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 8, paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: '#0ea5e9', borderRadius: radius.sm, alignSelf: 'flex-start',
  },
  openQuoteText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  // Dışa mesaj onay modal'ı
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  confirmSheet: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    maxHeight: '88%',
  },
  confirmHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  confirmTitle: { ...typography.h4, color: colors.text.primary, flex: 1 },
  confirmWarn: {
    color: colors.text.secondary,
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: colors.rose.bg,
    borderColor: colors.rose.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  fieldRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  fieldLabel: { width: 78, color: colors.text.muted, fontSize: 12, fontWeight: '700', paddingTop: 1 },
  fieldValue: { flex: 1, color: colors.text.primary, fontSize: 14, lineHeight: 19 },
  recipientValue: { fontWeight: '800', color: colors.emerald.dark },
  bodyLabel: {
    color: colors.text.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  bodyBox: {
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.primary,
    maxHeight: 280,
    marginBottom: spacing.md,
  },
  bodyText: { color: colors.text.primary, fontSize: 13, lineHeight: 20 },
  confirmActions: { flexDirection: 'row', gap: spacing.sm },
  confirmBtn: { flex: 1, justifyContent: 'center' },
});

export default AgentConsoleScreen;
