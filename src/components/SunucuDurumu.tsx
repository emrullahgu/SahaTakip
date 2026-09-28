// ====================================================================
// SunucuDurumu — sunucuya ulasilamazsa kullaniciyi uyarir.
// Veritabani ofisteki Ubuntu sunucusunda calisiyor; sunucu kapaliyken yapilan
// kayitlar kaybolabilecegi icin:
//   - Web: ekrani kaplayan uyari (sayfa ve formdaki yazilanlar silinmez)
//   - Mobil: ustte serit (sahadaki cevrimdisi calismayi engellemez)
// Sunucu geri gelince uyari kendiliginden kalkar.
// ====================================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const NORMAL_ARALIK = 20000;
const HIZLI_ARALIK = 5000;
const ZAMAN_ASIMI = 8000;
const UYARI_ESIGI = 2;

type Durum = 'acik' | 'kapali' | 'internet-yok';

async function sunucuAcikMi(): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return true; // demo mod: kontrol yok
  const ctrl = new AbortController();
  const zamanlayici = setTimeout(() => ctrl.abort(), ZAMAN_ASIMI);
  try {
    const cevap = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_ANON_KEY },
      cache: 'no-store',
      signal: ctrl.signal,
    } as RequestInit);
    return cevap.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(zamanlayici);
  }
}

function tarayiciCevrimdisi(): boolean {
  return Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.onLine === false;
}

export default function SunucuDurumu() {
  const [durum, setDurum] = useState<Durum>('acik');
  const [geriGeldi, setGeriGeldi] = useState(false);
  const [kontrolEdiliyor, setKontrolEdiliyor] = useState(false);
  const [sonKontrol, setSonKontrol] = useState<Date | null>(null);
  const hataSayisi = useRef(0);
  const durumRef = useRef<Durum>('acik');
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);

  const durumAyarla = useCallback((yeni: Durum) => {
    const eski = durumRef.current;
    if (eski === yeni) return;
    durumRef.current = yeni;
    setDurum(yeni);
    if (yeni === 'acik' && eski !== 'acik') {
      setGeriGeldi(true);
      setTimeout(() => setGeriGeldi(false), 6000);
    }
  }, []);

  const kontrol = useCallback(async () => {
    if (zamanlayici.current) clearTimeout(zamanlayici.current);
    setKontrolEdiliyor(true);
    let acik: boolean;
    if (tarayiciCevrimdisi()) {
      hataSayisi.current = UYARI_ESIGI;
      durumAyarla('internet-yok');
      acik = false;
    } else {
      acik = await sunucuAcikMi();
      if (acik) {
        hataSayisi.current = 0;
        durumAyarla('acik');
      } else {
        hataSayisi.current += 1;
        if (hataSayisi.current >= UYARI_ESIGI) durumAyarla('kapali');
      }
    }
    setSonKontrol(new Date());
    setKontrolEdiliyor(false);
    zamanlayici.current = setTimeout(kontrol, acik ? NORMAL_ARALIK : HIZLI_ARALIK);
  }, [durumAyarla]);

  useEffect(() => {
    kontrol();
    const uygulama = AppState.addEventListener('change', s => {
      if (s === 'active') kontrol();
    });
    const hemen = () => kontrol();
    const webMi = Platform.OS === 'web' && typeof window !== 'undefined';
    if (webMi) {
      window.addEventListener('online', hemen);
      window.addEventListener('offline', hemen);
      window.addEventListener('focus', hemen);
    }
    return () => {
      if (zamanlayici.current) clearTimeout(zamanlayici.current);
      uygulama.remove();
      if (webMi) {
        window.removeEventListener('online', hemen);
        window.removeEventListener('offline', hemen);
        window.removeEventListener('focus', hemen);
      }
    };
  }, [kontrol]);

  if (durum === 'acik') {
    if (!geriGeldi) return null;
    return (
      <View pointerEvents="none" style={styles.tamamKapsayici}>
        <Text style={styles.tamamMetin}>✅ Sunucu bağlantısı geri geldi. Kayıt yapabilirsiniz.</Text>
      </View>
    );
  }

  const internetYok = durum === 'internet-yok';
  const baslik = internetYok ? 'İnternet bağlantınız yok' : 'Sunucuya şu an ulaşılamıyor';

  if (Platform.OS !== 'web') {
    return (
      <Pressable onPress={kontrol} style={styles.serit}>
        <Text style={styles.seritMetin}>
          ⚠️ {baslik} — kayıtlar sunucuya gönderilemiyor. {kontrolEdiliyor ? 'Kontrol ediliyor…' : 'Tekrar denemek için dokunun.'}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.perde} accessibilityRole="alert">
      <View style={styles.kart}>
        <Text style={styles.ikon}>{internetYok ? '📡' : '⚠️'}</Text>
        <Text style={styles.baslik}>{baslik}</Text>
        <Text style={styles.metin}>
          <Text style={{ fontWeight: '700' }}>Şu an yapacağınız kayıtlar kaydedilemez. </Text>
          Lütfen sayfayı kapatmayın ve yeni kayıt girmeyin. Ekranda yazdığınız bilgiler silinmez;
          bağlantı gelince bu uyarı kendiliğinden kalkar, sonra kaydedebilirsiniz.
        </Text>
        <Text style={styles.ikincil}>
          {internetYok
            ? 'Wi-Fi veya mobil veri bağlantınızı kontrol edin.'
            : 'Sunucu bilgisayarı kapalı veya internete bağlı olmayabilir. Durum devam ederse yöneticinize haber verin.'}
        </Text>
        <Pressable onPress={kontrol} disabled={kontrolEdiliyor} style={styles.dugme}>
          <Text style={styles.dugmeMetin}>{kontrolEdiliyor ? 'Kontrol ediliyor…' : 'Tekrar dene'}</Text>
        </Pressable>
        {sonKontrol ? (
          <Text style={styles.zaman}>
            Son kontrol: {sonKontrol.toLocaleTimeString('tr-TR')} · otomatik olarak tekrar deneniyor
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  perde: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  kart: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxWidth: 460,
    width: '100%',
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderTopWidth: 6,
    borderTopColor: '#dc2626',
  },
  ikon: { fontSize: 44, marginBottom: 8 },
  baslik: { fontSize: 22, fontWeight: '700', color: '#b91c1c', marginBottom: 12, textAlign: 'center' },
  metin: { fontSize: 15, lineHeight: 22, color: '#0f172a', textAlign: 'center', marginBottom: 10 },
  ikincil: { fontSize: 13, lineHeight: 19, color: '#475569', textAlign: 'center', marginBottom: 18 },
  dugme: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 22 },
  dugmeMetin: { color: '#fff', fontSize: 15, fontWeight: '600' },
  zaman: { marginTop: 12, fontSize: 12, color: '#64748b', textAlign: 'center' },
  serit: { backgroundColor: '#dc2626', paddingVertical: 6, paddingHorizontal: 12 },
  seritMetin: { color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  tamamKapsayici: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
    zIndex: 9999,
  },
  tamamMetin: {
    backgroundColor: '#16a34a',
    color: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    fontSize: 14,
    fontWeight: '600',
    overflow: 'hidden',
  },
});
