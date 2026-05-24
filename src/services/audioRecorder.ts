// ====================================================================
// audioRecorder — FAZ 19 (POZ-DEV-032)
// Web tarayıcılarda MediaRecorder ile basit ses kaydı. Native'de
// expo-av paketi olmadığı için kullanıcıya uyarı döner.
// ====================================================================

import { Platform } from 'react-native';

let activeRecorder: any = null;
let activeStream: MediaStream | null = null;
let activeChunks: BlobPart[] = [];

export interface AudioRecording {
  uri: string;
  durationMs: number;
}

export const isAudioSupported = (): boolean => {
  if (Platform.OS !== 'web') return false;
  const nav: any = typeof navigator !== 'undefined' ? navigator : null;
  return !!(
    nav &&
    nav.mediaDevices &&
    typeof nav.mediaDevices.getUserMedia === 'function' &&
    typeof (globalThis as any).MediaRecorder !== 'undefined'
  );
};

export const startAudioRecording = async (): Promise<void> => {
  if (!isAudioSupported()) {
    throw new Error(
      'Ses kaydı bu cihazda desteklenmiyor. Web üzerinde veya geliştirici derlemesinde deneyin.',
    );
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

export const stopAudioRecording = (): Promise<AudioRecording> => {
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

export const isAudioRecording = (): boolean => !!activeRecorder;
