// ====================================================================
// audioRecorder — Ses kaydı (Native: expo-audio, Web: MediaRecorder)
// ====================================================================

import { Platform } from 'react-native';

export interface AudioRecording {
  uri: string;
  durationMs: number;
}

// ---- Lazy native modül yükleyici (web bundle'a girmesin) ----
let _expoAudio: any = null;
function getExpoAudio(): any | null {
  if (Platform.OS === 'web') return null;
  if (_expoAudio) return _expoAudio;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _expoAudio = require('expo-audio');
  } catch {
    _expoAudio = null;
  }
  return _expoAudio;
}

// ---- Web kayıt durumu ----
let activeRecorder: any = null;
let activeStream: MediaStream | null = null;
let activeChunks: BlobPart[] = [];

// ---- Native kayıt durumu ----
let nativeRecorder: any = null;
let nativeStartedAt = 0;

export const isAudioSupported = (): boolean => {
  if (Platform.OS === 'web') {
    const nav: any = typeof navigator !== 'undefined' ? navigator : null;
    return !!(
      nav &&
      nav.mediaDevices &&
      typeof nav.mediaDevices.getUserMedia === 'function' &&
      typeof (globalThis as any).MediaRecorder !== 'undefined'
    );
  }
  return !!getExpoAudio();
};

export const isAudioRecording = (): boolean => !!activeRecorder || !!nativeRecorder;

export const startAudioRecording = async (): Promise<void> => {
  if (Platform.OS !== 'web') {
    const ea = getExpoAudio();
    if (!ea) {
      throw new Error('expo-audio modülü bulunamadı. Yeni bir derleme alın.');
    }
    if (nativeRecorder) {
      throw new Error('Zaten aktif bir kayıt var.');
    }
    // Mikrofon izni
    try {
      const perm = await ea.AudioModule?.requestRecordingPermissionsAsync?.();
      if (perm && perm.granted === false) {
        throw new Error('Mikrofon izni verilmedi.');
      }
    } catch (e: any) {
      if (e?.message?.includes('izni')) throw e;
      // bazı sürümlerde farklı yol olabilir, devam et
    }
    // Ses modu: kayıt için
    try {
      await ea.setAudioModeAsync?.({ allowsRecording: true, playsInSilentMode: true });
    } catch {
      /* ignore */
    }
    const preset = ea.RecordingPresets?.HIGH_QUALITY ?? {};
    const RecorderCtor = ea.AudioRecorder ?? ea.AudioModule?.AudioRecorder;
    if (!RecorderCtor) {
      throw new Error('AudioRecorder API bulunamadı (expo-audio sürümünü kontrol edin).');
    }
    const rec = new RecorderCtor(preset);
    await rec.prepareToRecordAsync?.();
    rec.record();
    nativeRecorder = rec;
    nativeStartedAt = Date.now();
    return;
  }

  // ---- WEB ----
  if (!isAudioSupported()) {
    throw new Error('Ses kaydı bu tarayıcıda desteklenmiyor.');
  }
  if (activeRecorder) {
    throw new Error('Zaten aktif bir kayıt var.');
  }
  const stream = await (navigator as any).mediaDevices.getUserMedia({ audio: true });
  activeStream = stream;
  activeChunks = [];
  const MR: any = (globalThis as any).MediaRecorder;
  const rec = new MR(stream);
  rec.ondataavailable = (e: any) => {
    if (e.data && e.data.size > 0) activeChunks.push(e.data);
  };
  rec.start();
  activeRecorder = { rec, startedAt: Date.now() };
};

export const stopAudioRecording = async (): Promise<AudioRecording> => {
  if (Platform.OS !== 'web') {
    if (!nativeRecorder) {
      throw new Error('Aktif kayıt yok.');
    }
    const rec = nativeRecorder;
    const startedAt = nativeStartedAt;
    nativeRecorder = null;
    nativeStartedAt = 0;
    try {
      await rec.stop?.();
    } catch {
      /* ignore */
    }
    const uri: string = rec.uri ?? rec.getURI?.() ?? '';
    if (!uri) {
      throw new Error('Kayıt dosyası elde edilemedi.');
    }
    return { uri, durationMs: Date.now() - startedAt };
  }

  // ---- WEB ----
  return new Promise((resolve, reject) => {
    if (!activeRecorder) {
      reject(new Error('Aktif kayıt yok.'));
      return;
    }
    const { rec, startedAt } = activeRecorder;
    rec.onstop = () => {
      const blob = new Blob(activeChunks, { type: 'audio/webm' });
      const uri = URL.createObjectURL(blob);
      const durationMs = Date.now() - startedAt;
      activeStream?.getTracks().forEach(t => t.stop());
      activeStream = null;
      activeRecorder = null;
      activeChunks = [];
      resolve({ uri, durationMs });
    };
    rec.onerror = (e: any) => {
      activeStream?.getTracks().forEach(t => t.stop());
      activeStream = null;
      activeRecorder = null;
      activeChunks = [];
      reject(e);
    };
    rec.stop();
  });
};
