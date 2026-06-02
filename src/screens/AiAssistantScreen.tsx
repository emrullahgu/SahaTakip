// src/screens/AiAssistantScreen.tsx
// Birleşik AI Asistan — Chat (multi-provider) + RAG sorgu + Hızlı kanal aksiyonları.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, FlatList, Modal, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  aiChat, aiRagQuery, aiRagIngest, aiRagList, aiRagDelete, aiAgent,
  aiRagQueueStatus, aiRagWorkerRun, aiChatStream,
  AiMessage, AiProviderId, RagSource, RagDocument, AgentAction,
  RagWorkerStatus,
} from '../services/aiRouter';
import { sendWhatsApp, sendGmail, sendGoogleChat } from '../services/channels';
import { aiErrorAlert } from '../services/aiErrorHandler';
import { shareAiResponse } from '../services/aiExport';
import {
  listSessions, createSession, listMessages, appendMessage,
  renameSession, togglePin, deleteSession, deriveTitle,
  AiChatSession,
} from '../services/aiChatSessions';

type Mode = 'chat' | 'rag' | 'notebook' | 'agent';

interface UiMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  provider?: string;
  sources?: RagSource[];
  actions?: AgentAction[];
  pending?: boolean;
}

const PROVIDERS: { id: AiProviderId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'auto', label: 'Oto', icon: 'flash-outline' },
  { id: 'openai', label: 'GPT', icon: 'sparkles-outline' },
  { id: 'claude', label: 'Claude', icon: 'leaf-outline' },
  { id: 'gemini', label: 'Gemini', icon: 'planet-outline' },
];

export default function AiAssistantScreen() {
  const [mode, setMode] = useState<Mode>('chat');
  const [provider, setProvider] = useState<AiProviderId>('auto');
  const [msgs, setMsgs] = useState<UiMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList<UiMsg>>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Notebook state
  const [docs, setDocs] = useState<RagDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [queueStatus, setQueueStatus] = useState<RagWorkerStatus | null>(null);
  const [workerRunning, setWorkerRunning] = useState(false);
  const [focusedDoc, setFocusedDoc] = useState<RagDocument | null>(null);

  // Sohbet geçmişi (Supabase)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const loadSessionsList = useCallback(async () => {
    setSessionsLoading(true);
    try { setSessions(await listSessions(100)); }
    catch (e: any) { const a = aiErrorAlert(e); Alert.alert(`Geçmiş - ${a.title}`, a.message); }
    finally { setSessionsLoading(false); }
  }, []);

  const startNewSession = () => {
    setCurrentSessionId(null);
    setMsgs([]);
  };

  const openSession = async (s: AiChatSession) => {
    try {
      const rows = await listMessages(s.id, 200);
      const ui: UiMsg[] = rows
        .filter(r => r.role === 'user' || r.role === 'assistant')
        .map(r => ({
          id: `db${r.id}`,
          role: r.role as 'user' | 'assistant',
          text: r.content,
          provider: (r.meta as any)?.provider,
        }));
      setMsgs(ui);
      setCurrentSessionId(s.id);
      setMode('chat');
      setSessionsOpen(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 60);
    } catch (e: any) {
      const a = aiErrorAlert(e);
      Alert.alert(`Sohbet - ${a.title}`, a.message);
    }
  };

  const loadQueueStatus = useCallback(async () => {
    try { setQueueStatus(await aiRagQueueStatus()); }
    catch { /* sessizce yok say */ }
  }, []);

  const runWorker = async () => {
    setWorkerRunning(true);
    try {
      const res = await aiRagWorkerRun(50);
      Alert.alert('Otomatik İndeksleme', `İşlendi: ${res.processed}
Başarılı: ${res.ok}
Hatalı: ${res.failed}`);
      await Promise.all([loadDocs(), loadQueueStatus()]);
    } catch (e: any) {
      const a = aiErrorAlert(e);
      Alert.alert(`Worker - ${a.title}`, a.message);
    } finally {
      setWorkerRunning(false);
    }
  };

  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      const list = await aiRagList(200);
      setDocs(list);
    } catch (e: any) {
      const a = aiErrorAlert(e);
      Alert.alert(`Belge listesi - ${a.title}`, a.message);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode === 'notebook') {
      loadDocs();
      loadQueueStatus();
    }
  }, [mode, loadDocs, loadQueueStatus]);

  const ingestNew = async () => {
    const title = newTitle.trim();
    const content = newContent.trim();
    if (!title || !content) {
      Alert.alert('Eksik alan', 'Başlık ve içerik zorunlu.');
      return;
    }
    setIngesting(true);
    try {
      const r = await aiRagIngest([{ title, source: 'manual', content }]);
      const chunks = r.ingested?.[0]?.chunks ?? 0;
      Alert.alert('Belge eklendi', `${chunks} parçaya bölündü ve indekslendi.`);
      setNewTitle('');
      setNewContent('');
      setAddOpen(false);
      loadDocs();
    } catch (e: any) {
      const a = aiErrorAlert(e);
      Alert.alert(a.title, a.message);
    } finally {
      setIngesting(false);
    }
  };

  const deleteDoc = (doc: RagDocument) => {
    Alert.alert('Belgeyi sil?', `"${doc.title}" kalıcı olarak silinecek.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await aiRagDelete(doc.id);
            setDocs(d => d.filter(x => x.id !== doc.id));
          } catch (e: any) {
            const a = aiErrorAlert(e);
            Alert.alert(a.title, a.message);
          }
        },
      },
    ]);
  };

  const askAboutDoc = (doc: RagDocument) => {
    setFocusedDoc(doc);
    setMode('agent');
    setMsgs([{
      id: 'sys' + Date.now(),
      role: 'assistant',
      text: `📖 "${doc.title}" belgesi açıldı. Bu belge hakkında soru sorabilir veya üzerine işlem isteyebilirsin.`,
    }]);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    const userMsg: UiMsg = { id: 'u' + Date.now(), role: 'user', text };
    const pending: UiMsg = { id: 'a' + Date.now(), role: 'assistant', text: '…', pending: true };
    const next = [...msgs, userMsg, pending];
    setMsgs(next);
    setBusy(true);

    // Chat modunda Supabase oturumu sağla (ilk mesajda oluştur)
    let sessionId = currentSessionId;
    if (mode === 'chat') {
      try {
        if (!sessionId) {
          const s = await createSession(deriveTitle(text));
          sessionId = s.id;
          setCurrentSessionId(s.id);
        }
        await appendMessage(sessionId, 'user', text);
      } catch { /* offline / RLS yoksa sessiz geç */ }
    }

    try {
      if (mode === 'chat') {
        const history: AiMessage[] = next
          .filter(m => !m.pending)
          .map(m => ({ role: m.role, content: m.text }));
        const sysMsg: AiMessage = { role: 'system', content: 'Sen SahaTakip\'in Türkçe konuşan saha asistanısın. Kısa, net, eyleme dönük yanıt ver.' };
        const useStream = provider === 'openai' || provider === 'auto';
        if (useStream) {
          // Streaming: token token UI'a yansıt
          const ctrl = new AbortController();
          abortRef.current = ctrl;
          try {
            const sres = await aiChatStream({
              messages: [sysMsg, ...history],
              signal: ctrl.signal,
              onToken: (_d, full) => {
                setMsgs(curr => curr.map(m => m.id === pending.id
                  ? { ...m, text: full, pending: true }
                  : m));
              },
            });
            setMsgs(curr => curr.map(m => m.id === pending.id
              ? { ...m, text: sres.content || '(boş)', provider: `openai/${sres.model}`, pending: false }
              : m));
            if (sessionId) {
              try { await appendMessage(sessionId, 'assistant', sres.content || '', { provider: 'openai', model: sres.model, stream: true }); }
              catch { /* sessiz */ }
            }
          } catch (streamErr: any) {
            const aborted = streamErr?.name === 'AbortError' || /aborted/i.test(String(streamErr?.message ?? ''));
            if (aborted) throw streamErr; // dış catch yakalar, sessiz iptal
            // Stream başarısızsa non-stream'e düş
            const res = await aiChat({ provider, messages: [sysMsg, ...history] });
            setMsgs(curr => curr.map(m => m.id === pending.id
              ? { ...m, text: res.content || '(boş)', provider: `${res.provider}/${res.model}`, pending: false }
              : m));
            if (sessionId) {
              try { await appendMessage(sessionId, 'assistant', res.content || '', { provider: res.provider, model: res.model }); }
              catch { /* sessiz */ }
            }
          }
        } else {
          const res = await aiChat({ provider, messages: [sysMsg, ...history] });
          setMsgs(curr => curr.map(m => m.id === pending.id
            ? { ...m, text: res.content || '(boş)', provider: `${res.provider}/${res.model}`, pending: false }
            : m));
          if (sessionId) {
            try { await appendMessage(sessionId, 'assistant', res.content || '', { provider: res.provider, model: res.model }); }
            catch { /* sessiz */ }
          }
        }
      } else if (mode === 'agent') {
        const history: AiMessage[] = next
          .filter(m => !m.pending)
          .map(m => ({ role: m.role, content: m.text }));
        if (focusedDoc) {
          history.unshift({
            role: 'system',
            content: `Kullanıcı şu an "${focusedDoc.title}" belgesine odaklı. Bilgi gerektiğinde search_knowledge tool'unu document_title="${focusedDoc.title}" ile çağır.`,
          });
        }
        const res = await aiAgent({ messages: history });
        setMsgs(curr => curr.map(m => m.id === pending.id
          ? { ...m, text: res.answer || '(boş)', provider: `agent/${res.model}`, actions: res.actions, pending: false }
          : m));
      } else {
        const res = await aiRagQuery({ question: text, provider, top_k: 6 });
        setMsgs(curr => curr.map(m => m.id === pending.id
          ? { ...m, text: res.answer || '(boş)', provider: `${res.provider}/${res.model}`, sources: res.sources, pending: false }
          : m));
      }
    } catch (e: any) {
      const isAbort = e?.name === 'AbortError' || /aborted/i.test(String(e?.message ?? ''));
      if (isAbort) {
        setMsgs(curr => curr.map(m => m.id === pending.id
          ? { ...m, text: (m.text && m.text !== '…' ? m.text + '\n\n— ⏹ iptal edildi —' : '— ⏹ iptal edildi —'), pending: false }
          : m));
      } else {
        const a = aiErrorAlert(e);
        setMsgs(curr => curr.map(m => m.id === pending.id
          ? { ...m, text: `❌ ${a.title}: ${a.message}`, pending: false }
          : m));
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    }
  };

  const cancelStream = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

  const shareLast = (channel: 'whatsapp' | 'gmail' | 'gchat') => {
    const last = [...msgs].reverse().find(m => m.role === 'assistant' && !m.pending);
    if (!last) {
      Alert.alert('Önce bir yanıt üretin', 'Paylaşılacak içerik yok.');
      return;
    }
    if (channel === 'whatsapp') {
      Alert.prompt?.('WhatsApp numarası', '+90 ile başlayan numara girin', async (to) => {
        if (!to) return;
        const r = await sendWhatsApp({ to, message: last.text });
        Alert.alert(r.ok ? 'Gönderildi' : 'Hata', r.ok ? 'WhatsApp mesajı gönderildi.' : (r.error ?? 'Başarısız'));
      });
    } else if (channel === 'gmail') {
      Alert.prompt?.('E-posta alıcısı', 'mail@firma.com', async (to) => {
        if (!to) return;
        const r = await sendGmail({ to, subject: 'SahaTakip Asistan', text: last.text });
        Alert.alert(r.ok ? 'Gönderildi' : 'Hata', r.ok ? 'E-posta gönderildi.' : (r.error ?? 'Başarısız'));
      });
    } else {
      sendGoogleChat({ text: last.text })
        .then(r => Alert.alert(r.ok ? 'Gönderildi' : 'Hata', r.ok ? 'Google Chat\'e iletildi.' : (r.error ?? 'Başarısız')));
    }
  };

  const renderMsg = ({ item }: { item: UiMsg }) => {
    const mine = item.role === 'user';
    return (
      <View style={[styles.bubbleWrap, mine ? styles.bubbleRight : styles.bubbleLeft]}>
        <View style={[styles.bubble, mine ? styles.bubbleUser : styles.bubbleBot]}>
          {item.pending ? (
            <ActivityIndicator color={brand.green} />
          ) : (
            <Text style={styles.bubbleText}>{item.text}</Text>
          )}
          {!!item.provider && !item.pending && (
            <Text style={styles.metaText}>{item.provider}</Text>
          )}
          {!!item.sources?.length && (
            <View style={styles.sources}>
              {item.sources.map(s => (
                <View key={s.index} style={styles.sourceChip}>
                  <Text style={styles.sourceTitle}>[#{s.index}] {s.title}</Text>
                  <Text style={styles.sourceExcerpt} numberOfLines={3}>{s.excerpt}</Text>
                </View>
              ))}
            </View>
          )}
          {!!item.actions?.length && (
            <View style={styles.sources}>
              {item.actions.map((a, i) => {
                const ok = !a.result?.error;
                return (
                  <View key={i} style={[styles.sourceChip, { borderColor: ok ? brand.green : '#ef4444' }]}>
                    <Text style={[styles.sourceTitle, { color: ok ? brand.green : '#ef4444' }]}>
                      {ok ? '✓' : '✗'} {a.tool}
                    </Text>
                    <Text style={styles.sourceExcerpt} numberOfLines={4}>
                      {ok
                        ? JSON.stringify(a.result).slice(0, 200)
                        : a.result?.error}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Üst bar — mod + provider seçimi */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.title}>AI Asistan</Text>
          {mode === 'chat' && (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                onPress={startNewSession}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.bg.secondary, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.text.muted} />
                <Text style={{ color: colors.text.muted, fontSize: 12 }}>Yeni</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setSessionsOpen(true); loadSessionsList(); }}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.bg.secondary, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Ionicons name="time-outline" size={16} color={colors.text.muted} />
                <Text style={{ color: colors.text.muted, fontSize: 12 }}>Geçmiş</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={styles.modeRow}>
          {([
            { id: 'chat' as Mode,     label: 'Sohbet',   icon: 'chatbubbles-outline' as const },
            { id: 'rag' as Mode,      label: 'Sor (RAG)',  icon: 'help-circle-outline' as const },
            { id: 'notebook' as Mode, label: 'Notebook', icon: 'library-outline' as const },
            { id: 'agent' as Mode,    label: 'Asistan',  icon: 'flash-outline' as const },
          ]).map(it => (
            <TouchableOpacity
              key={it.id}
              style={[styles.modeBtn, mode === it.id && styles.modeBtnActive]}
              onPress={() => setMode(it.id)}
            >
              <Ionicons name={it.icon} size={14} color={mode === it.id ? '#fff' : colors.text.muted} />
              <Text style={[styles.modeText, mode === it.id && styles.modeTextActive]}>{it.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {(mode === 'chat' || mode === 'rag') && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {PROVIDERS.map(p => {
              const active = provider === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.provBtn, active && styles.provBtnActive]}
                  onPress={() => setProvider(p.id)}
                >
                  <Ionicons name={p.icon} size={14} color={active ? '#fff' : colors.text.muted} />
                  <Text style={[styles.provText, active && styles.provTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {mode === 'notebook' ? (
          <>
            <View style={styles.nbHeader}>
              <Text style={styles.nbHeaderText}>
                {docs.length} belge · {docs.reduce((s, d) => s + d.chunk_count, 0)} parça
              </Text>
              <TouchableOpacity style={styles.nbAddBtn} onPress={() => setAddOpen(true)}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.nbAddText}>Yeni Belge</Text>
              </TouchableOpacity>
            </View>

            {queueStatus && (
              <View style={styles.queueBar}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.queueTitle}>Otomatik İndeksleme</Text>
                  <Text style={styles.queueMeta}>
                    Bekleyen: {queueStatus.pending} · Hatalı: {queueStatus.failed} · 24s içinde: {queueStatus.processed_24h}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.workerBtn, (workerRunning || queueStatus.pending === 0) && { opacity: 0.5 }]}
                  onPress={runWorker}
                  disabled={workerRunning || queueStatus.pending === 0}
                >
                  {workerRunning ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="play" size={14} color="#fff" />}
                  <Text style={styles.workerBtnText}>{workerRunning ? 'Yürütülüyor' : 'Şimdi İşle'}</Text>
                </TouchableOpacity>
              </View>
            )}
            <FlatList
              data={docs}
              keyExtractor={d => d.id}
              refreshControl={<RefreshControl refreshing={docsLoading} onRefresh={loadDocs} />}
              contentContainerStyle={{ padding: spacing.md, gap: 8 }}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Ionicons name="library-outline" size={36} color={brand.green} />
                  <Text style={styles.emptyTitle}>Henüz belge yok</Text>
                  <Text style={styles.emptyHint}>
                    "+ Yeni Belge" ile metin yapıştırıp NotebookLM'inize ekleyin.{'\n'}
                    Sonra "Sor (RAG)" modunda kaynaklı sorular sorun.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.docCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.docMeta}>
                      {item.chunk_count} parça · {item.source} · {new Date(item.created_at).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.docIcon} onPress={() => askAboutDoc(item)}>
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={brand.blue} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.docIcon} onPress={() => deleteDoc(item)}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}
            />
          </>
        ) : (
          <>
        {focusedDoc && (
          <View style={styles.focusBar}>
            <Ionicons name="book" size={14} color="#8b5cf6" />
            <Text style={styles.focusText} numberOfLines={1}>{focusedDoc.title}</Text>
            <TouchableOpacity onPress={() => setFocusedDoc(null)}>
              <Ionicons name="close-circle" size={16} color={colors.text.muted} />
            </TouchableOpacity>
          </View>
        )}
        <FlatList
          ref={listRef}
          data={msgs}
          keyExtractor={i => i.id}
          renderItem={renderMsg}
          contentContainerStyle={{ padding: spacing.md, gap: 8 }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="sparkles" size={36} color={brand.green} />
              <Text style={styles.emptyTitle}>Nasıl yardımcı olabilirim?</Text>
              <Text style={styles.emptyHint}>
                • Sohbet: "Bugünkü iş emirlerini özetle"{'\n'}
                • RAG: kendi yüklediğin belgeler üzerinden soru sor.{'\n'}
                • Asistan: "Ahmet'e yarın 14:00 klima bakımı iş emri aç" gibi komutla gerçek kayıt oluşturur.
              </Text>
            </View>
          }
        />

        {/* Hızlı kanal aksiyonları */}
        {msgs.some(m => m.role === 'assistant' && !m.pending) && (
          <View style={styles.shareRow}>
            <TouchableOpacity style={styles.shareBtn} onPress={() => shareLast('whatsapp')}>
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              <Text style={styles.shareText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={() => shareLast('gmail')}>
              <Ionicons name="mail-outline" size={18} color="#EA4335" />
              <Text style={styles.shareText}>Gmail</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={() => shareLast('gchat')}>
              <Ionicons name="chatbox-ellipses-outline" size={18} color="#1A73E8" />
              <Text style={styles.shareText}>G. Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={async () => {
                const last = [...msgs].reverse().find(m => m.role === 'assistant' && !m.pending);
                if (!last) { Alert.alert('Önce bir yanıt üretin', 'Paylaşılacak içerik yok.'); return; }
                const r = await shareAiResponse(last.text, { title: 'ai-yanit', format: 'md' });
                if (!r.ok) Alert.alert('Paylaşım hatası', r.error ?? 'Bilinmeyen hata');
              }}
            >
              <Ionicons name="share-outline" size={18} color={colors.text.primary} />
              <Text style={styles.shareText}>Dışa Aktar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Giriş kutusu */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={
              mode === 'chat'  ? 'Soru veya komut…' :
              mode === 'rag'   ? 'Kaynaklara soru sor…' :
                                  'Komut: "Ahmet\'e yarın 14:00 ziyaret oluştur"…'
            }
            placeholderTextColor={colors.text.faint}
            multiline
            editable={!busy}
          />
          {busy ? (
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.rose.default }]} onPress={cancelStream}>
              <Ionicons name="stop" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.sendBtn} onPress={send}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
          </>
        )}
      </KeyboardAvoidingView>

      {/* Sohbet geçmişi modalı */}
      <Modal visible={sessionsOpen} animationType="slide" transparent onRequestClose={() => setSessionsOpen(false)}>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sohbet Geçmişi</Text>
              <TouchableOpacity onPress={() => setSessionsOpen(false)}>
                <Ionicons name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            {sessionsLoading ? (
              <ActivityIndicator color={brand.blue} style={{ marginVertical: 16 }} />
            ) : sessions.length === 0 ? (
              <Text style={{ color: colors.text.muted, padding: spacing.md }}>Henüz kaydedilmiş sohbet yok. Yeni bir sohbet başlatıp mesaj gönderin — otomatik kaydedilir.</Text>
            ) : (
              <FlatList
                data={sessions}
                keyExtractor={(s) => s.id}
                style={{ maxHeight: 480 }}
                renderItem={({ item }) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border.primary }}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => openSession(item)}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {item.pinned && <Ionicons name="pin" size={12} color={brand.blue} />}
                        <Text style={{ color: colors.text.primary, fontWeight: '600' }} numberOfLines={1}>{item.title}</Text>
                      </View>
                      <Text style={{ color: colors.text.muted, fontSize: 11, marginTop: 2 }}>
                        {item.message_count} mesaj · {item.last_message_at ? new Date(item.last_message_at).toLocaleString('tr-TR') : '—'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => { try { await togglePin(item.id, !item.pinned); loadSessionsList(); } catch (e: any) { const a = aiErrorAlert(e); Alert.alert(a.title, a.message); } }}
                      style={{ padding: 6 }}
                    >
                      <Ionicons name={item.pinned ? 'pin' : 'pin-outline'} size={18} color={item.pinned ? brand.blue : colors.text.muted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        Alert.prompt?.('Yeniden adlandır', '', async (val) => {
                          if (!val) return;
                          try { await renameSession(item.id, val); loadSessionsList(); } catch (e: any) { const a = aiErrorAlert(e); Alert.alert(a.title, a.message); }
                        }, 'plain-text', item.title);
                      }}
                      style={{ padding: 6 }}
                    >
                      <Ionicons name="create-outline" size={18} color={colors.text.muted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => Alert.alert('Sohbeti sil?', `"${item.title}" silinsin mi?`, [
                        { text: 'Vazgeç', style: 'cancel' },
                        { text: 'Sil', style: 'destructive', onPress: async () => {
                            try {
                              await deleteSession(item.id);
                              if (currentSessionId === item.id) startNewSession();
                              loadSessionsList();
                            } catch (e: any) { const a = aiErrorAlert(e); Alert.alert(a.title, a.message); }
                          } },
                      ])}
                      style={{ padding: 6 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
                refreshControl={<RefreshControl refreshing={sessionsLoading} onRefresh={loadSessionsList} />}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Yeni belge modalı */}
      <Modal visible={addOpen} animationType="slide" transparent onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Belge</Text>
              <TouchableOpacity onPress={() => setAddOpen(false)}>
                <Ionicons name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Başlık (ör: Saha Prosedürü v3)"
              placeholderTextColor={colors.text.faint}
            />
            <TextInput
              style={[styles.modalInput, { height: 220, textAlignVertical: 'top' }]}
              value={newContent}
              onChangeText={setNewContent}
              placeholder="İçeriği yapıştırın… (PDF metni, prosedür, e-posta vs.)"
              placeholderTextColor={colors.text.faint}
              multiline
            />
            <Text style={styles.modalHint}>
              ~800 karakterlik parçalara bölünüp OpenAI embedding ile indekslenir.{'\n'}
              Sonra "Sor (RAG)" sekmesinden kaynaklı sorular sorabilirsiniz.
            </Text>
            <TouchableOpacity
              style={[styles.modalBtn, ingesting && { opacity: 0.6 }]}
              onPress={ingestNew}
              disabled={ingesting}
            >
              {ingesting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                  <Text style={styles.modalBtnText}>Ekle ve İndeksle</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    padding: spacing.md,
    borderBottomColor: colors.border.primary,
    borderBottomWidth: 1,
  },
  title: { fontSize: typography.lg, fontWeight: '700', color: colors.text.primary, marginBottom: 6 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1, borderColor: colors.border.primary,
  },
  modeBtnActive: { backgroundColor: brand.green, borderColor: brand.green },
  modeText: { color: colors.text.muted, fontSize: 12, fontWeight: '600' },
  modeTextActive: { color: '#fff' },
  provBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1, borderColor: colors.border.primary,
    marginRight: 6,
  },
  provBtnActive: { backgroundColor: brand.blue, borderColor: brand.blue },
  provText: { color: colors.text.muted, fontSize: 12, fontWeight: '600' },
  provTextActive: { color: '#fff' },

  bubbleWrap: { width: '100%' },
  bubbleLeft: { alignItems: 'flex-start' },
  bubbleRight: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '88%',
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: radius.md,
  },
  bubbleUser: { backgroundColor: brand.blue },
  bubbleBot: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary },
  bubbleText: { color: colors.text.primary, fontSize: 14, lineHeight: 20 },
  metaText: { color: colors.text.faint, fontSize: 10, marginTop: 4 },

  sources: { marginTop: 8, gap: 4 },
  sourceChip: {
    backgroundColor: colors.bg.primary,
    borderColor: colors.border.primary, borderWidth: 1,
    padding: 6, borderRadius: 6,
  },
  sourceTitle: { color: brand.green, fontSize: 11, fontWeight: '700' },
  sourceExcerpt: { color: colors.text.muted, fontSize: 11, marginTop: 2 },

  shareRow: {
    flexDirection: 'row', gap: 8, padding: 8,
    borderTopColor: colors.border.primary, borderTopWidth: 1,
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 10,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border.primary,
  },
  shareText: { color: colors.text.primary, fontSize: 12, fontWeight: '600' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: 8, gap: 8,
    borderTopColor: colors.border.primary, borderTopWidth: 1,
    backgroundColor: colors.bg.primary,
  },
  input: {
    flex: 1, maxHeight: 120,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 10,
    color: colors.text.primary, fontSize: 14,
    borderWidth: 1, borderColor: colors.border.primary,
  },
  sendBtn: {
    backgroundColor: brand.green,
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },

  emptyBox: { alignItems: 'center', padding: 32, gap: 8 },
  emptyTitle: { color: colors.text.primary, fontSize: 16, fontWeight: '700' },
  emptyHint: { color: colors.text.muted, fontSize: 13, textAlign: 'center', lineHeight: 18 },

  // Notebook
  nbHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderBottomColor: colors.border.primary, borderBottomWidth: 1,
  },
  nbHeaderText: { color: colors.text.muted, fontSize: 12 },
  nbAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: brand.green,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.full,
  },
  nbAddText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  queueBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: 'rgba(139,92,246,0.08)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  queueTitle: { color: '#8b5cf6', fontSize: 12, fontWeight: '800' },
  queueMeta: { color: colors.text.muted, fontSize: 11, marginTop: 2 },
  workerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.sm, backgroundColor: '#8b5cf6' },
  workerBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  focusBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: spacing.md, marginTop: spacing.sm, padding: 8, borderRadius: radius.sm, backgroundColor: 'rgba(139,92,246,0.1)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)' },
  focusText: { flex: 1, color: '#8b5cf6', fontSize: 12, fontWeight: '700' },
  docCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.bg.secondary,
    padding: 12, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border.primary,
  },
  docTitle: { color: colors.text.primary, fontSize: 14, fontWeight: '700' },
  docMeta: { color: colors.text.muted, fontSize: 11, marginTop: 2 },
  docIcon: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bg.primary,
    borderWidth: 1, borderColor: colors.border.primary,
  },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.bg.primary,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: spacing.md, gap: 10,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  modalInput: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 10,
    color: colors.text.primary, fontSize: 14,
    borderWidth: 1, borderColor: colors.border.primary,
  },
  modalHint: { color: colors.text.muted, fontSize: 11, lineHeight: 16 },
  modalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: brand.green,
    paddingVertical: 12, borderRadius: radius.md,
  },
  modalBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
