// security service — POZ-DEV-105..108
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessRule, AccessRuleKind, BackupRecord, BackupStatus, KvkkConsent, KvkkSettings, TwoFactorSettings } from '../types';

const KEY_KVKK = '@SahaTakip:kvkk';
const KEY_BACKUP = '@SahaTakip:backups';
const KEY_2FA = '@SahaTakip:2fa';
const KEY_ACCESS = '@SahaTakip:access_rules';

const DEFAULT_KVKK_TEXT = `KİŞİSEL VERİLERİN KORUNMASI KANUNU AYDINLATMA METNİ

SahaTakip mobil uygulaması ("Uygulama"), KVKK kapsamında veri sorumlusu sıfatıyla işbu aydınlatma metni ile hangi kişisel verileri, hangi amaçlarla işlediğini açıklar.

1. İşlenen Veriler: Ad-soyad, iletişim bilgileri, konum verileri, müşteri ve iş emri kayıtları.
2. İşleme Amaçları: Saha operasyonlarının yönetimi, iş emri takibi, müşteri ilişkileri, finansal kayıt tutma.
3. Aktarım: Veriler yalnızca yasal yükümlülük halinde yetkili kurumlarla paylaşılır.
4. Saklama Süresi: Yasal yükümlülükler boyunca saklanır, sonra silinir/anonimleştirilir.
5. Haklarınız: KVKK m.11 kapsamında bilgi edinme, düzeltme, silme, itiraz etme haklarına sahipsiniz.

Bu metni kabul ederek, kişisel verilerinizin yukarıdaki amaçlar doğrultusunda işlenmesine onay vermiş olursunuz.`;

function rid(p: string): string { return p + '-' + Math.random().toString(36).slice(2, 10); }

// ---- KVKK ----
export async function getKvkkSettings(): Promise<KvkkSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY_KVKK);
    if (raw) return JSON.parse(raw);
  } catch {}
  const init: KvkkSettings = { currentVersion: 'v1.0', text: DEFAULT_KVKK_TEXT, updatedAt: new Date().toISOString(), consents: [] };
  await AsyncStorage.setItem(KEY_KVKK, JSON.stringify(init));
  return init;
}
export async function updateKvkkText(text: string, version: string): Promise<KvkkSettings> {
  const cur = await getKvkkSettings();
  const next: KvkkSettings = { ...cur, text, currentVersion: version, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(KEY_KVKK, JSON.stringify(next));
  return next;
}
export async function recordConsent(consent: Omit<KvkkConsent, 'acceptedAt'>): Promise<void> {
  const cur = await getKvkkSettings();
  const next: KvkkSettings = { ...cur, consents: [{ ...consent, acceptedAt: new Date().toISOString() }, ...cur.consents].slice(0, 200) };
  await AsyncStorage.setItem(KEY_KVKK, JSON.stringify(next));
}

// ---- Backup ----
export async function listBackups(): Promise<BackupRecord[]> {
  try { const raw = await AsyncStorage.getItem(KEY_BACKUP); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
async function saveBackups(list: BackupRecord[]): Promise<void> { await AsyncStorage.setItem(KEY_BACKUP, JSON.stringify(list)); }
export async function createBackup(): Promise<BackupRecord> {
  // mock: snapshot of all known AsyncStorage data sizes
  const allKeys = await AsyncStorage.getAllKeys();
  const filtered = allKeys.filter(k => k.startsWith('@SahaTakip:'));
  const stores = await AsyncStorage.multiGet(filtered);
  const size = stores.reduce((sum, [, v]) => sum + (v ? v.length : 0), 0);
  const rec: BackupRecord = {
    id: rid('bk'),
    createdAt: new Date().toISOString(),
    sizeBytes: size,
    location: `local://backups/${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
    status: 'success',
  };
  const list = await listBackups();
  list.unshift(rec);
  await saveBackups(list.slice(0, 60));
  return rec;
}
export async function markRestored(id: string, notes?: string): Promise<void> {
  const list = await listBackups();
  const next = list.map(b => b.id === id ? { ...b, status: 'restored' as BackupStatus, restoredAt: new Date().toISOString(), notes } : b);
  await saveBackups(next);
}
export async function deleteBackup(id: string): Promise<void> {
  const list = await listBackups();
  await saveBackups(list.filter(b => b.id !== id));
}

// ---- 2FA TOTP ----
function generateTotpSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function generateBackupCodes(n = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < n; i++) {
    const code = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, '0').toUpperCase();
    codes.push(code.slice(0, 4) + '-' + code.slice(4));
  }
  return codes;
}

export async function getTwoFactorSettings(): Promise<TwoFactorSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY_2FA);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { enabled: false, backupCodes: [] };
}
export async function startTwoFactorSetup(): Promise<TwoFactorSettings> {
  const next: TwoFactorSettings = {
    enabled: false,
    secret: generateTotpSecret(),
    backupCodes: generateBackupCodes(),
  };
  await AsyncStorage.setItem(KEY_2FA, JSON.stringify(next));
  return next;
}
export async function confirmTwoFactor(code: string): Promise<{ ok: boolean; settings: TwoFactorSettings; error?: string }> {
  const cur = await getTwoFactorSettings();
  if (!cur.secret) return { ok: false, settings: cur, error: 'Önce kurulum başlatın.' };
  // mock validation: accept 6 digits
  if (!/^\d{6}$/.test(code.trim())) return { ok: false, settings: cur, error: 'Kod 6 haneli olmalı.' };
  const next: TwoFactorSettings = { ...cur, enabled: true, confirmedAt: new Date().toISOString() };
  await AsyncStorage.setItem(KEY_2FA, JSON.stringify(next));
  return { ok: true, settings: next };
}
export async function disableTwoFactor(): Promise<TwoFactorSettings> {
  const init: TwoFactorSettings = { enabled: false, backupCodes: [] };
  await AsyncStorage.setItem(KEY_2FA, JSON.stringify(init));
  return init;
}
export function buildTotpOtpAuthUri(secret: string, account = 'admin', issuer = 'SahaTakip'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}

// ---- Access Rules ----
export async function listAccessRules(): Promise<AccessRule[]> {
  try { const raw = await AsyncStorage.getItem(KEY_ACCESS); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
async function saveAccessRules(list: AccessRule[]): Promise<void> { await AsyncStorage.setItem(KEY_ACCESS, JSON.stringify(list)); }
export async function upsertAccessRule(r: AccessRule): Promise<void> {
  const list = await listAccessRules();
  const idx = list.findIndex(x => x.id === r.id);
  if (idx >= 0) list[idx] = r; else list.unshift(r);
  await saveAccessRules(list);
}
export async function deleteAccessRule(id: string): Promise<void> {
  const list = await listAccessRules();
  await saveAccessRules(list.filter(x => x.id !== id));
}
export function makeAccessRule(input: { kind: AccessRuleKind; value: string; label?: string }): AccessRule {
  return { id: rid('ar'), kind: input.kind, value: input.value.trim(), label: input.label, active: true, createdAt: new Date().toISOString() };
}

export function validateIpRule(value: string): boolean {
  // accept ipv4, ipv4/cidr, "any" or "*"
  const v = value.trim();
  if (!v) return false;
  return /^(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?$/.test(v) || v === '*' || v.toLowerCase() === 'any';
}
