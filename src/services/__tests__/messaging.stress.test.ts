// messaging — STRES testi: listMessages'ı mock'lu Supabase ile uçtan uca zorlar.
// Odak: silinen mesaj tombstone'u (içerik sızdırmaz), avatar eşleme, içerik
// bütünlüğü (emoji/uzun/özel karakter/çok satır), hacim (500 mesaj), sıralama.

// Chainable Supabase query-builder mock'u. Tablo adına göre sonuç döndürür.
let resultFor: (table: string) => { data: any; error: any } = () => ({ data: [], error: null });

jest.mock('../supabase', () => {
  let table = '';
  const qb: any = {
    select: () => qb, eq: () => qb, in: () => qb, is: () => qb,
    order: () => qb, limit: () => qb, update: () => qb, delete: () => qb,
    insert: () => qb, single: () => qb, maybeSingle: () => qb,
    then: (resolve: any) => resolve((global as any).__resultFor(table)),
  };
  return {
    SUPABASE_CONFIGURED: true,
    getCurrentUser: async () => ({ id: 'EMR' }),
    supabase: { from: (t: string) => { table = t; return qb; }, channel: () => ({ on: () => ({ subscribe: () => ({}) }) }), removeChannel: () => {} },
  };
});

// Mock closure'ı global üzerinden besle (jest.mock hoisting nedeniyle).
beforeEach(() => { (global as any).__resultFor = (t: string) => resultFor(t); });

import { listMessages } from '../messaging';

const PROFILES = [
  { id: 'EMR', full_name: 'Emrullah Günay', avatar_url: 'https://cdn/emr.jpg' },
  { id: 'IBR', full_name: 'İbrahim Çağdaş', avatar_url: null },
];

const EMOJI = '🔥😀👍🚀💯 Türkçe: ışĞÜ çöş';
const LONG = 'UZUN: ' + 'Lorem ipsum dolor sit amet consectetur. '.repeat(50);
const SPECIAL = 'Özel: <script>alert(1)</script> & "tırnak" \'apostrof\' OR 1=1 -- ; DROP';
const MULTILINE = 'Satır1\nSatır2\nSatır3';

function buildRows() {
  const rows: any[] = [
    { id: 'm_emoji', conversation_id: 'c', sender_id: 'EMR', body: EMOJI, created_at: '2026-01-01T10:00:01Z', deleted_at: null },
    { id: 'm_long', conversation_id: 'c', sender_id: 'IBR', body: LONG, created_at: '2026-01-01T10:00:02Z', deleted_at: null },
    { id: 'm_special', conversation_id: 'c', sender_id: 'EMR', body: SPECIAL, created_at: '2026-01-01T10:00:03Z', deleted_at: null },
    { id: 'm_multiline', conversation_id: 'c', sender_id: 'IBR', body: MULTILINE, created_at: '2026-01-01T10:00:04Z', deleted_at: null },
    // Silinmiş mesaj — içerik + ek DOLU ama tombstone'da temizlenmeli:
    { id: 'm_deleted', conversation_id: 'c', sender_id: 'EMR', body: 'GİZLİ İÇERİK sızmamalı', attachment_url: 'priv/secret.jpg', attachment_type: 'image', attachment_name: 'secret.jpg', created_at: '2026-01-01T10:00:05Z', deleted_at: '2026-01-01T10:06:00Z' },
    // Ekli (silinmemiş) mesaj:
    { id: 'm_att', conversation_id: 'c', sender_id: 'IBR', body: '', attachment_url: 'chat/doc.pdf', attachment_type: 'pdf', attachment_name: 'rapor.pdf', created_at: '2026-01-01T10:00:06Z', deleted_at: null },
  ];
  return rows;
}

describe('messaging STRES — listMessages tombstone + avatar + içerik bütünlüğü', () => {
  it('silinen mesaj tombstone döner, İÇERİK ve EK SIZMAZ', async () => {
    resultFor = (t) => t === 'profiles' ? { data: PROFILES, error: null } : { data: buildRows(), error: null };
    const msgs = await listMessages('c');

    const del = msgs.find(m => m.id === 'm_deleted')!;
    expect(del).toBeDefined();
    expect(del.deleted).toBe(true);
    expect(del.body).toBeUndefined();            // içerik sızmaz
    expect(del.attachmentUrl).toBeUndefined();   // ek sızmaz
    expect(del.attachmentName).toBeUndefined();
    expect(del.attachmentType).toBeUndefined();
  });

  it('silinmemiş mesajların içeriği BOZULMADAN korunur (emoji/uzun/özel/çok satır)', async () => {
    resultFor = (t) => t === 'profiles' ? { data: PROFILES, error: null } : { data: buildRows(), error: null };
    const msgs = await listMessages('c');

    expect(msgs.find(m => m.id === 'm_emoji')!.body).toBe(EMOJI);
    expect(msgs.find(m => m.id === 'm_long')!.body).toBe(LONG);
    expect(msgs.find(m => m.id === 'm_long')!.body!.length).toBeGreaterThan(1500);
    expect(msgs.find(m => m.id === 'm_special')!.body).toBe(SPECIAL);
    expect(msgs.find(m => m.id === 'm_multiline')!.body).toBe(MULTILINE);
  });

  it('tüm mesajlar (silinen DAHİL) döner; ek bilgisi korunur', async () => {
    resultFor = (t) => t === 'profiles' ? { data: PROFILES, error: null } : { data: buildRows(), error: null };
    const msgs = await listMessages('c');
    expect(msgs.length).toBe(6); // silinen dahil
    const att = msgs.find(m => m.id === 'm_att')!;
    expect(att.attachmentType).toBe('pdf');
    expect(att.attachmentName).toBe('rapor.pdf');
    expect(att.deleted).toBeFalsy();
  });

  it('avatar/isim eşleme: avatarı olan foto, olmayan undefined (baş harf fallback için)', async () => {
    resultFor = (t) => t === 'profiles' ? { data: PROFILES, error: null } : { data: buildRows(), error: null };
    const msgs = await listMessages('c');

    const fromEmr = msgs.find(m => m.senderId === 'EMR')!;
    expect(fromEmr.senderName).toBe('Emrullah Günay');
    expect(fromEmr.senderAvatar).toBe('https://cdn/emr.jpg');

    const fromIbr = msgs.find(m => m.senderId === 'IBR')!;
    expect(fromIbr.senderName).toBe('İbrahim Çağdaş');
    expect(fromIbr.senderAvatar).toBeUndefined(); // avatar yok → baş harf
  });

  it('HACİM: 500 mesaj sorunsuz eşlenir, tombstone sayısı doğru', async () => {
    const many = Array.from({ length: 500 }, (_, i) => ({
      id: 'mm' + i, conversation_id: 'c', sender_id: i % 2 ? 'EMR' : 'IBR',
      body: 'Mesaj #' + i + ' ' + (i % 7 === 0 ? EMOJI : 'içerik'),
      created_at: '2026-01-01T10:' + String(i % 60).padStart(2, '0') + ':00Z',
      deleted_at: i % 10 === 0 ? '2026-01-01T11:00:00Z' : null, // her 10'da bir silinmiş
    }));
    resultFor = (t) => t === 'profiles' ? { data: PROFILES, error: null } : { data: many, error: null };

    const msgs = await listMessages('c');
    expect(msgs.length).toBe(500);
    const deletedCount = msgs.filter(m => m.deleted).length;
    expect(deletedCount).toBe(50); // 0,10,20...490
    // Silinen hiçbirinde içerik kalmamalı
    expect(msgs.filter(m => m.deleted).every(m => m.body === undefined)).toBe(true);
    // Silinmeyenlerin içeriği dolu
    expect(msgs.filter(m => !m.deleted).every(m => typeof m.body === 'string' && m.body.length > 0)).toBe(true);
  });

  it('boş konuşma çökmeden boş dizi döner', async () => {
    resultFor = (t) => t === 'profiles' ? { data: PROFILES, error: null } : { data: [], error: null };
    const msgs = await listMessages('c');
    expect(msgs).toEqual([]);
  });

  it('DB hatası: error dönerse çökmeden boş dizi', async () => {
    resultFor = (t) => t === 'messages' ? { data: null, error: { message: 'boom' } } : { data: PROFILES, error: null };
    const msgs = await listMessages('c');
    expect(msgs).toEqual([]);
  });
});
