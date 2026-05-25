// ====================================================================
// WorkOrderDetailScreen — FAZ 3 (POZ-DEV-024..035 entegrasyonu)
// İş emrinin durumu, önceliği, atama, zamanlama, timer, medya kontrolü.
// ====================================================================

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { uploadPhoto } from '../services/photoUpload';

import { colors, brand } from '../theme';
import { RootStackParamList, WorkOrderPriority, WorkOrder } from '../types';
import { useAppContext } from '../context/AppContext';
import {
  NEXT_STATUS,
  statusColor,
  priorityColor,
  isSlaBreached,
  slaRemainingMs,
  formatRemaining,
  totalLabourMinutes,
} from '../services/workOrderFlow';
import SignaturePad from '../components/SignaturePad';
import {
  isAudioSupported,
  startAudioRecording,
  stopAudioRecording,
} from '../services/audioRecorder';
import { generateAndShareWorkOrderPdf } from '../services/workOrderPdf';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkOrderDetail'>;

const PRIORITIES: WorkOrderPriority[] = ['Normal', 'Yüksek', 'Acil'];

export default function WorkOrderDetailScreen({ route, navigation }: Props) {
  const { workOrderId } = route.params;
  const {
    workOrders,
    employees,
    updateWorkOrderStatus,
    assignWorkOrder,
    respondAssignment,
    transferWorkOrder,
    setWorkOrderPriority,
    setWorkOrderSchedule,
    startWorkTimer,
    stopWorkTimer,
    attachWorkOrderMedia,
    showToast,
  } = useAppContext();

  const wo = workOrders.find(w => w.id === workOrderId);
  const [showAssign, setShowAssign] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [plannedStart, setPlannedStart] = useState(wo?.plannedStart ?? '');
  const [plannedEnd, setPlannedEnd] = useState(wo?.plannedEnd ?? '');
  const [slaHours, setSlaHours] = useState(String(wo?.slaHours ?? ''));
  const [signOpen, setSignOpen] = useState(false);
  const [audioRecording, setAudioRecording] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  if (!wo) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>İş emri bulunamadı.</Text>
      </View>
    );
  }

  const allowed = NEXT_STATUS[wo.status] ?? [];
  const breached = isSlaBreached(wo);
  const remaining = slaRemainingMs(wo);
  const minutes = totalLabourMinutes(wo.timeLogs);
  const isRunning = !!wo.timeLogs?.some(l => !l.endAt);

  const askReject = () => {
    Alert.prompt?.(
      'Reddetme nedeni',
      'Görevi neden reddediyorsunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: (text?: string) => respondAssignment(wo.id, false, text || 'Belirtilmedi'),
        },
      ],
      'plain-text',
    );
    // iOS olmayanlar için fallback — basit reddet
    if (!Alert.prompt) {
      respondAssignment(wo.id, false, rejectReason || 'Belirtilmedi');
    }
  };

  const saveSchedule = () => {
    setWorkOrderSchedule(
      wo.id,
      plannedStart || undefined,
      plannedEnd || undefined,
      slaHours ? Number(slaHours) : undefined,
    );
    Alert.alert('Kaydedildi', 'Planlama güncellendi.');
  };

  // ---- FAZ 19 — POZ-DEV-031 Video kaydı ----
  const recordVideo = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('İzin gerekli', 'Kamera izni verilmedi.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 60,
        quality: 0.7,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        attachWorkOrderMedia(wo.id, { videoUri: res.assets[0].uri });
        showToast('Video kaydı eklendi.');
      }
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Video kaydedilemedi.');
    }
  };

  const pickVideoFromLibrary = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('İzin gerekli', 'Medya kütüphanesi izni verilmedi.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 0.7,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        attachWorkOrderMedia(wo.id, { videoUri: res.assets[0].uri });
        showToast('Video eklendi.');
      }
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Video seçilemedi.');
    }
  };

  // ---- FAZ 19 — POZ-DEV-032 Ses kaydı ----
  const toggleAudioRecording = async () => {
    if (audioRecording) {
      try {
        const rec = await stopAudioRecording();
        setAudioRecording(false);
        attachWorkOrderMedia(wo.id, { audioUri: rec.uri });
        showToast(`Ses kaydı eklendi (${Math.round(rec.durationMs / 1000)}s).`);
      } catch (e: any) {
        setAudioRecording(false);
        Alert.alert('Hata', e?.message ?? 'Kayıt durdurulamadı.');
      }
      return;
    }
    if (!isAudioSupported()) {
      Alert.alert(
        'Ses kaydı desteklenmiyor',
        Platform.OS === 'web'
          ? 'Tarayıcı MediaRecorder API\'sini desteklemiyor.'
          : 'Cihaz tabanlı kayıt için EAS dev-build (expo-av) gerekir. Web üzerinde deneyin.',
      );
      return;
    }
    try {
      await startAudioRecording();
      setAudioRecording(true);
      showToast('Kayıt başladı. Durdurmak için tekrar dokunun.');
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Mikrofona erişilemedi.');
    }
  };

  // ---- FAZ 19 — POZ-DEV-033 Mobil imza ----
  const onSignatureSave = (dataUri: string) => {
    setSignOpen(false);
    attachWorkOrderMedia(wo.id, { signatureUri: dataUri });
    showToast('İmza kaydedildi.');
  };

  const clearMedia = (kind: 'video' | 'audio' | 'signature' | 'beforePhoto' | 'afterPhoto') => {
    const labelMap: Record<string, string> = {
      video: 'Video', audio: 'Ses', signature: 'İmza',
      beforePhoto: 'İş Öncesi Foto', afterPhoto: 'İş Sonrası Foto',
    };
    Alert.alert('Sil', `${labelMap[kind]} kaldırılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          if (kind === 'video') attachWorkOrderMedia(wo.id, { videoUri: undefined });
          else if (kind === 'audio') attachWorkOrderMedia(wo.id, { audioUri: undefined });
          else if (kind === 'signature') attachWorkOrderMedia(wo.id, { signatureUri: undefined });
          else if (kind === 'beforePhoto') attachWorkOrderMedia(wo.id, { beforePhoto: '' });
          else if (kind === 'afterPhoto') attachWorkOrderMedia(wo.id, { afterPhoto: '' });
        },
      },
    ]);
  };

  // ---- Foto: İş Öncesi / İş Sonrası ----
  const pickPhoto = async (slot: 'beforePhoto' | 'afterPhoto', source: 'camera' | 'library') => {
    try {
      if (Platform.OS !== 'web') {
        const perm = source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== 'granted') {
          Alert.alert('İzin gerekli', source === 'camera' ? 'Kamera izni verilmedi.' : 'Galeri izni verilmedi.');
          return;
        }
      }
      const res = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: false })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const localUri = res.assets[0].uri;
        // 1) Anında lokal URI'yi göster
        attachWorkOrderMedia(wo.id, { [slot]: localUri });
        showToast(slot === 'beforePhoto' ? 'İş öncesi foto eklendi, yükleniyor…' : 'İş sonrası foto eklendi, yükleniyor…');
        // 2) Arka planda Supabase Storage'a yükle ve URL ile değiştir
        const folder = `work-orders/${wo.id}`;
        uploadPhoto(localUri, folder).then(publicUrl => {
          if (publicUrl && publicUrl !== localUri) {
            attachWorkOrderMedia(wo.id, { [slot]: publicUrl });
            showToast('Foto bulutta saklanıyor.');
          }
        }).catch(err => {
          console.warn('[pickPhoto.upload]', err?.message ?? err);
          showToast(`Foto yüklenemedi: ${err?.message ?? 'bilinmeyen hata'}`, 'error');
        });
      }
    } catch (e: any) {
      if (Platform.OS === 'web' && source === 'camera') {
        pickPhoto(slot, 'library');
      } else {
        Alert.alert('Hata', e?.message ?? 'Foto alınamadı.');
      }
    }
  };

  const choosePhotoSource = (slot: 'beforePhoto' | 'afterPhoto') => {
    Alert.alert('Foto Ekle', 'Kaynak seçin', [
      { text: 'Kamera', onPress: () => pickPhoto(slot, 'camera') },
      { text: 'Galeri', onPress: () => pickPhoto(slot, 'library') },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <View style={styles.card}>
        <Text style={styles.title}>{wo.serviceName}</Text>
        <Text style={styles.subtitle}>{wo.client}</Text>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: statusColor(wo.status) }]}>
            <Text style={styles.badgeText}>{wo.status}</Text>
          </View>
          {wo.priority && (
            <View style={[styles.badge, { backgroundColor: priorityColor(wo.priority) }]}>
              <Ionicons name="flame-outline" size={12} color="#fff" />
              <Text style={styles.badgeText}> {wo.priority}</Text>
            </View>
          )}
          {wo.assignmentStatus && wo.assignmentStatus !== 'Atanmadı' && (
            <View style={[styles.badge, { backgroundColor: '#334155' }]}>
              <Text style={styles.badgeText}>{wo.assignmentStatus}</Text>
            </View>
          )}
        </View>

        {wo.assignedToName && (
          <Text style={styles.assignText}>
            <Ionicons name="person" size={12} color={colors.text.muted} /> {wo.assignedToName}
          </Text>
        )}

        {remaining != null && (
          <View style={[styles.slaRow, breached && { backgroundColor: '#7f1d1d' }]}>
            <Ionicons name="time-outline" size={14} color="#fff" />
            <Text style={styles.slaText}>
              {breached ? 'SLA aşıldı: ' : 'SLA kalan: '}
              {formatRemaining(remaining)}
            </Text>
          </View>
        )}
      </View>

      {/* STATUS FLOW */}
      {allowed.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Durum Değiştir</Text>
          <View style={styles.chipRow}>
            {allowed.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, { borderColor: statusColor(s) }]}
                onPress={() => updateWorkOrderStatus(wo.id, s)}
              >
                <Text style={[styles.chipText, { color: statusColor(s) }]}>→ {s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* FAZ 5 — POZ-DEV-047 Müşteri puanı */}
      <TouchableOpacity
        style={styles.pdfCta}
        onPress={async () => {
          setPdfLoading(true);
          try {
            await generateAndShareWorkOrderPdf(wo);
          } catch (e: any) {
            Alert.alert('Hata', 'PDF üretilemedi.');
          } finally {
            setPdfLoading(false);
          }
        }}
        disabled={pdfLoading}
      >
        <Ionicons name="document-text-outline" size={18} color="#fff" />
        <Text style={styles.ratingCtaText}>
          {pdfLoading ? 'Hazırlanıyor...' : 'Servis Formu PDF Al'}
        </Text>
      </TouchableOpacity>

      {wo.status === 'Tamamlandı' && (
        <TouchableOpacity
          style={styles.ratingCta}
          onPress={() => navigation.navigate('JobRating', { workOrderId: wo.id })}
          activeOpacity={0.85}
        >
          <Ionicons name="star-outline" size={18} color="#fff" />
          <Text style={styles.ratingCtaText}>Müşteri Memnuniyet Puanı Al</Text>
        </TouchableOpacity>
      )}

      {/* FAZ 6 — POZ-DEV-052 Formlar */}
      <TouchableOpacity
        style={styles.formsCta}
        onPress={() => navigation.navigate('WorkOrderForms', { workOrderId: wo.id })}
        activeOpacity={0.85}
      >
        <Ionicons name="clipboard-outline" size={18} color="#fff" />
        <Text style={styles.formsCtaText}>Formlar / Kontrol Listeleri</Text>
      </TouchableOpacity>

      {/* FAZ 7 — POZ-DEV-059 İş emrinde malzeme kullanımı */}
      <TouchableOpacity
        style={styles.materialsCta}
        onPress={() =>
          navigation.navigate('StockMovement', {
            kind: 'is-emri',
            workOrderId: wo.id,
          })
        }
        activeOpacity={0.85}
      >
        <Ionicons name="cube-outline" size={18} color="#fff" />
        <Text style={styles.materialsCtaText}>Malzeme Kullanımı</Text>
      </TouchableOpacity>

      {/* AI Ajan — bu iş emri üzerinde otonom çalış */}
      <TouchableOpacity
        style={[styles.materialsCta, { backgroundColor: '#7c3aed' }]}
        onPress={() => navigation.navigate('AgentConsole', {
          initialGoal:
            `İş emri "${wo.title}" (id: ${wo.id}, müşteri: ${wo.customerName}) için: ` +
            `1) Geçmiş benzer işleri analiz et, 2) Olası riskleri/sorunları öneri olarak kaydet, ` +
            `3) Gerekirse ilgili teknik standartları web'de araştır ve özetle.`,
          autoStart: false,
        })}
        activeOpacity={0.85}
      >
        <Ionicons name="sparkles" size={18} color="#fff" />
        <Text style={styles.materialsCtaText}>AI Ajan: Analiz et</Text>
      </TouchableOpacity>

      {/* PRIORITY */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Öncelik</Text>
        <View style={styles.chipRow}>
          {PRIORITIES.map(p => (
            <TouchableOpacity
              key={p}
              style={[
                styles.chip,
                { borderColor: priorityColor(p) },
                wo.priority === p && { backgroundColor: priorityColor(p) },
              ]}
              onPress={() => setWorkOrderPriority(wo.id, p)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: wo.priority === p ? '#fff' : priorityColor(p) },
                ]}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* SCHEDULE / SLA */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Planlama (SLA)</Text>
        <Text style={styles.label}>Planlanan Başlangıç (ISO)</Text>
        <TextInput
          style={styles.input}
          value={plannedStart}
          onChangeText={setPlannedStart}
          placeholder="2026-05-25T09:00:00"
          placeholderTextColor={colors.text.muted}
        />
        <Text style={styles.label}>Planlanan Bitiş (ISO)</Text>
        <TextInput
          style={styles.input}
          value={plannedEnd}
          onChangeText={setPlannedEnd}
          placeholder="2026-05-25T17:00:00"
          placeholderTextColor={colors.text.muted}
        />
        <Text style={styles.label}>SLA Saat</Text>
        <TextInput
          style={styles.input}
          value={slaHours}
          onChangeText={setSlaHours}
          keyboardType="number-pad"
          placeholder="8"
          placeholderTextColor={colors.text.muted}
        />
        <TouchableOpacity style={styles.primaryBtn} onPress={saveSchedule}>
          <Text style={styles.primaryBtnText}>Planlamayı Kaydet</Text>
        </TouchableOpacity>
      </View>

      {/* ASSIGNMENT */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Atama</Text>
        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={() => setShowAssign(s => !s)}
        >
          <Ionicons name="people-outline" size={16} color={brand.green} />
          <Text style={styles.outlineBtnText}>
            {showAssign ? 'Listeyi gizle' : wo.assignedToId ? 'Devret / Değiştir' : 'Personel Ata'}
          </Text>
        </TouchableOpacity>
        {showAssign &&
          employees.map(emp => (
            <TouchableOpacity
              key={emp.id}
              style={styles.empRow}
              onPress={() => {
                if (wo.assignedToId) transferWorkOrder(wo.id, emp.id, emp.name);
                else assignWorkOrder(wo.id, emp.id, emp.name);
                setShowAssign(false);
              }}
            >
              <Text style={styles.empName}>{emp.name}</Text>
              <Text style={styles.empRole}>{emp.role}</Text>
            </TouchableOpacity>
          ))}

        {wo.assignmentStatus === 'Atandı' && (
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.smallBtn, { backgroundColor: brand.green }]}
              onPress={() => respondAssignment(wo.id, true)}
            >
              <Text style={styles.smallBtnText}>Kabul Et</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallBtn, { backgroundColor: '#dc2626' }]}
              onPress={askReject}
            >
              <Text style={styles.smallBtnText}>Reddet</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* TIMER */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Süre Takibi</Text>
        <Text style={styles.metricText}>
          Toplam: {Math.floor(minutes / 60)}s {minutes % 60}dk
          {wo.actualLaborMinutes != null && ` (kayıt: ${wo.actualLaborMinutes}dk)`}
        </Text>
        {isRunning ? (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#dc2626' }]}
            onPress={() => stopWorkTimer(wo.id)}
          >
            <Ionicons name="stop-circle-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Süreyi Durdur</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => startWorkTimer(wo.id)}>
            <Ionicons name="play-circle-outline" size={18} color={colors.bg.primary} />
            <Text style={styles.primaryBtnText}>Süreyi Başlat</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* COST SUMMARY */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Maliyet</Text>
        <KV k="İşçilik" v={wo.laborCost} />
        <KV k="Malzeme" v={wo.materialCost} />
        <KV k="Diğer" v={wo.otherCost} />
        <KV k="Teklif" v={wo.quoteAmount} />
        <KV k="Kâr" v={wo.profit} highlight />
      </View>

      {/* FOTOĞRAFLAR — İş Öncesi / Sonrası */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Fotoğraflar</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {(['beforePhoto', 'afterPhoto'] as const).map(slot => {
            const uri = slot === 'beforePhoto' ? wo.beforePhoto : wo.afterPhoto;
            const label = slot === 'beforePhoto' ? 'İş Öncesi' : 'İş Sonrası';
            return (
              <View key={slot} style={{ flex: 1 }}>
                <Text style={[styles.mediaLabel, { marginBottom: 6 }]}>{label}</Text>
                {uri ? (
                  <View style={photoStyles.box}>
                    <Image source={{ uri }} style={photoStyles.img} />
                    <View style={photoStyles.actions}>
                      <TouchableOpacity
                        style={[photoStyles.actionBtn, { backgroundColor: '#1e40af' }]}
                        onPress={() => choosePhotoSource(slot)}
                      >
                        <Ionicons name="refresh" size={12} color="#fff" />
                        <Text style={photoStyles.actionText}> Değiştir</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[photoStyles.actionBtn, { backgroundColor: '#dc2626' }]}
                        onPress={() => clearMedia(slot)}
                      >
                        <Ionicons name="trash-outline" size={12} color="#fff" />
                        <Text style={photoStyles.actionText}> Sil</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={photoStyles.placeholder} onPress={() => choosePhotoSource(slot)}>
                    <Ionicons name="camera-outline" size={24} color={colors.text.muted} />
                    <Text style={photoStyles.placeholderText}>Foto Ekle</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* FAZ 19 — POZ-DEV-031/032/033 Medya */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Medya</Text>

        {/* Video */}
        <View style={styles.mediaRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.mediaLabel}>
              <Ionicons name="videocam-outline" size={14} color={colors.text.muted} /> Video
            </Text>
            <Text style={styles.mediaValue} numberOfLines={1}>
              {wo.videoUri ? wo.videoUri : 'Henüz eklenmedi'}
            </Text>
          </View>
          {wo.videoUri ? (
            <TouchableOpacity style={styles.iconBtn} onPress={() => clearMedia('video')}>
              <Ionicons name="trash-outline" size={16} color="#dc2626" />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#1e40af' }]} onPress={recordVideo}>
            <Ionicons name="videocam" size={14} color="#fff" />
            <Text style={styles.smallBtnText}> Kaydet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#334155' }]} onPress={pickVideoFromLibrary}>
            <Ionicons name="folder-open-outline" size={14} color="#fff" />
            <Text style={styles.smallBtnText}> Galeriden</Text>
          </TouchableOpacity>
        </View>

        {/* Audio */}
        <View style={[styles.mediaRow, { marginTop: 14 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.mediaLabel}>
              <Ionicons name="mic-outline" size={14} color={colors.text.muted} /> Ses
            </Text>
            <Text style={styles.mediaValue} numberOfLines={1}>
              {wo.audioUri ? wo.audioUri : 'Henüz eklenmedi'}
            </Text>
          </View>
          {wo.audioUri ? (
            <TouchableOpacity style={styles.iconBtn} onPress={() => clearMedia('audio')}>
              <Ionicons name="trash-outline" size={16} color="#dc2626" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.smallBtn, { backgroundColor: audioRecording ? '#dc2626' : '#0891b2', alignSelf: 'flex-start' }]}
          onPress={toggleAudioRecording}
        >
          <Ionicons name={audioRecording ? 'stop-circle' : 'mic'} size={14} color="#fff" />
          <Text style={styles.smallBtnText}> {audioRecording ? 'Durdur' : 'Ses Kaydet'}</Text>
        </TouchableOpacity>

        {/* Signature */}
        <View style={[styles.mediaRow, { marginTop: 14 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.mediaLabel}>
              <Ionicons name="create-outline" size={14} color={colors.text.muted} /> İmza
            </Text>
            <Text style={styles.mediaValue} numberOfLines={1}>
              {wo.signatureUri ? 'İmza kayıtlı (' + wo.signatureUri.length + ' karakter)' : 'Henüz eklenmedi'}
            </Text>
          </View>
          {wo.signatureUri ? (
            <TouchableOpacity style={styles.iconBtn} onPress={() => clearMedia('signature')}>
              <Ionicons name="trash-outline" size={16} color="#dc2626" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.smallBtn, { backgroundColor: brand.green, alignSelf: 'flex-start' }]}
          onPress={() => setSignOpen(true)}
        >
          <Ionicons name="create" size={14} color={colors.bg.primary} />
          <Text style={[styles.smallBtnText, { color: colors.bg.primary }]}> İmza Al</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.outlineBtn, { margin: 16 }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.outlineBtnText}>← Geri</Text>
      </TouchableOpacity>

      <SignaturePad
        visible={signOpen}
        onClose={() => setSignOpen(false)}
        onSave={onSignatureSave}
        title={`${wo.id} • Müşteri / Teknisyen İmzası`}
      />
    </ScrollView>
  );
}

function KV({ k, v, highlight }: { k: string; v: number; highlight?: boolean }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={[styles.kvVal, highlight && { color: brand.green, fontWeight: '700' }]}>
        {v.toLocaleString('tr-TR')} ₺
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: {
    margin: 12,
    padding: 16,
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  title: { color: colors.text.primary, fontSize: 17, fontWeight: '700' },
  subtitle: { color: colors.text.muted, fontSize: 13, marginTop: 2 },
  sectionTitle: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  assignText: { color: colors.text.muted, fontSize: 12, marginTop: 8 },
  slaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  slaText: { color: '#fff', fontSize: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  ratingCta: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#eab308',
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingCtaText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  pdfCta: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 10,
  },
  formsCta: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#1e40af',
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  formsCtaText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  materialsCta: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#0891b2',
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  materialsCtaText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  label: { color: colors.text.muted, fontSize: 12, marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: colors.bg.primary,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: brand.green,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  primaryBtnText: { color: colors.bg.primary, fontWeight: '700' },
  outlineBtn: {
    flexDirection: 'row',
    borderColor: brand.green,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  outlineBtnText: { color: brand.green, fontWeight: '700' },
  empRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  empName: { color: colors.text.primary, fontWeight: '600' },
  empRole: { color: colors.text.muted, fontSize: 12 },
  row: { flexDirection: 'row', gap: 8, marginTop: 12 },
  smallBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: { color: '#fff', fontWeight: '700' },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  mediaLabel: { color: colors.text.muted, fontSize: 12, marginBottom: 2 },
  mediaValue: { color: colors.text.primary, fontSize: 12 },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  metricText: { color: colors.text.primary, fontSize: 14, marginBottom: 8 },
  kv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  kvKey: { color: colors.text.muted, fontSize: 13 },
  kvVal: { color: colors.text.primary, fontSize: 13 },
});

const photoStyles = StyleSheet.create({
  box: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.bg.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  img: { width: '100%', height: 120 },
  actions: { flexDirection: 'row', gap: 4, padding: 4 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  placeholder: {
    height: 120,
    borderRadius: 10,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  placeholderText: { color: colors.text.muted, fontSize: 11 },
});
