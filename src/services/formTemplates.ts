// ====================================================================
// formTemplates — POZ-DEV-049, 050, 051
// Dinamik form şablonları + seed presets (Denetim, Bakım, Arıza, Montaj, Teslimat).
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FormTemplate, FormField, FormTemplateCategory } from '../types';

const KEY = '@SahaTakip:form_templates';
const SEED_FLAG = '@SahaTakip:form_templates_seeded_v1';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function nowISO() {
  return new Date().toISOString();
}

// ---------------- SEED ----------------

function field(
  label: string,
  type: FormField['type'],
  extra: Partial<FormField> = {},
): FormField {
  return { id: uid(), label, type, ...extra };
}

function seedTemplates(): FormTemplate[] {
  const t = nowISO();
  return [
    {
      id: uid(),
      name: 'Genel Denetim Formu',
      category: 'Denetim',
      description: 'Standart saha denetim kontrol listesi.',
      isSeed: true,
      createdAt: t,
      updatedAt: t,
      fields: [
        field('Saha Adı', 'text', { required: true }),
        field('Denetim Tarihi', 'date', { required: true }),
        field('Genel Durum', 'select', {
          options: ['İyi', 'Orta', 'Kötü'],
          required: true,
        }),
        field('Güvenlik Önlemleri', 'checkbox'),
        field('Temizlik', 'checkbox'),
        field('Etiketleme', 'checkbox'),
        field('Genel Fotoğraf', 'photo'),
        field('Notlar', 'note'),
        field('Denetçi İmzası', 'signature'),
      ],
    },
    {
      id: uid(),
      name: 'Periyodik Bakım Formu',
      category: 'Bakım',
      description: 'Cihaz/sistem periyodik bakım kontrolleri.',
      isSeed: true,
      createdAt: t,
      updatedAt: t,
      fields: [
        field('Ekipman Adı', 'text', { required: true }),
        field('Seri No', 'text'),
        field('Bakım Tipi', 'select', {
          options: ['Aylık', '3 Aylık', '6 Aylık', 'Yıllık'],
          required: true,
        }),
        field('Çalışma Saatleri', 'number'),
        field('Yağ / Filtre Değişimi', 'checkbox'),
        field('Kalibrasyon', 'checkbox'),
        field('Test Sonuçları', 'note'),
        field('Bakım Sonrası Fotoğraf', 'photo'),
        field('Teknisyen İmzası', 'signature'),
      ],
    },
    {
      id: uid(),
      name: 'Arıza Tespit Formu',
      category: 'Arıza Tespit',
      description: 'Arıza bildirimi ve teşhis raporu.',
      isSeed: true,
      createdAt: t,
      updatedAt: t,
      fields: [
        field('Arıza Tarihi', 'date', { required: true }),
        field('Arıza Yeri / Ekipman', 'text', { required: true }),
        field('Arıza Belirtileri', 'note', { required: true }),
        field('Aciliyet', 'select', {
          options: ['Düşük', 'Orta', 'Yüksek', 'Kritik'],
          required: true,
        }),
        field('Etkilenen Hizmetler', 'multiselect', {
          options: ['Üretim', 'Aydınlatma', 'Isıtma', 'Soğutma', 'Diğer'],
        }),
        field('Arıza Fotoğrafı', 'photo'),
        field('Geçici Çözüm Uygulandı mı?', 'checkbox'),
        field('Tahmini Çözüm Süresi (saat)', 'number'),
      ],
    },
    {
      id: uid(),
      name: 'Montaj / Kurulum Formu',
      category: 'Montaj',
      description: 'Yeni ekipman/sistem kurulum raporu.',
      isSeed: true,
      createdAt: t,
      updatedAt: t,
      fields: [
        field('Müşteri / Lokasyon', 'text', { required: true }),
        field('Ekipman Marka/Model', 'text', { required: true }),
        field('Seri No', 'text'),
        field('Montaj Tarihi', 'date', { required: true }),
        field('Garanti Süresi (ay)', 'number'),
        field('İlk Çalıştırma Testi', 'checkbox'),
        field('Kullanıcı Eğitimi Verildi mi?', 'checkbox'),
        field('Montaj Öncesi Fotoğraf', 'photo'),
        field('Montaj Sonrası Fotoğraf', 'photo'),
        field('Müşteri Notları', 'note'),
        field('Müşteri İmzası', 'signature'),
      ],
    },
    {
      id: uid(),
      name: 'Teslimat / Kabul Formu',
      category: 'Teslimat',
      description: 'İş tesliminde müşteri onayı.',
      isSeed: true,
      createdAt: t,
      updatedAt: t,
      fields: [
        field('Teslim Tarihi', 'date', { required: true }),
        field('Teslim Eden', 'text', { required: true }),
        field('Teslim Alan (Müşteri)', 'text', { required: true }),
        field('Eksik Var mı?', 'checkbox'),
        field('Eksik Açıklaması', 'note'),
        field('Memnuniyet Puanı', 'rating'),
        field('Teslim Fotoğrafı', 'photo'),
        field('Müşteri İmzası', 'signature'),
      ],
    },
  ];
}

// ---------------- CRUD ----------------

export async function listTemplates(): Promise<FormTemplate[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FormTemplate[]) : [];
  } catch {
    return [];
  }
}

export async function listTemplatesByCategory(
  category: FormTemplateCategory,
): Promise<FormTemplate[]> {
  const all = await listTemplates();
  return all.filter(t => t.category === category);
}

export async function getTemplate(id: string): Promise<FormTemplate | null> {
  const all = await listTemplates();
  return all.find(t => t.id === id) ?? null;
}

export async function saveTemplates(list: FormTemplate[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function upsertTemplate(tpl: FormTemplate) {
  const all = await listTemplates();
  const idx = all.findIndex(x => x.id === tpl.id);
  const updated: FormTemplate = { ...tpl, updatedAt: nowISO() };
  if (idx >= 0) all[idx] = updated;
  else all.unshift(updated);
  await saveTemplates(all);
}

export async function deleteTemplate(id: string) {
  const all = await listTemplates();
  await saveTemplates(all.filter(t => t.id !== id));
}

export async function ensureSeeded() {
  const flag = await AsyncStorage.getItem(SEED_FLAG);
  if (flag) return;
  const existing = await listTemplates();
  if (existing.length === 0) {
    await saveTemplates(seedTemplates());
  }
  await AsyncStorage.setItem(SEED_FLAG, '1');
}

export function newEmptyTemplate(): FormTemplate {
  const t = nowISO();
  return {
    id: uid(),
    name: '',
    category: 'Diğer',
    description: '',
    fields: [],
    createdAt: t,
    updatedAt: t,
  };
}

export function newField(type: FormField['type'] = 'text'): FormField {
  return {
    id: uid(),
    label: '',
    type,
  };
}
