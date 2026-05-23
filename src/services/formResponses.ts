// ====================================================================
// formResponses — POZ-DEV-052, 053
// Form doldurma cevapları + revizyon geçmişi. AsyncStorage tabanlı.
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FormResponse, FormResponseRevision, FormFieldValue } from '../types';

const RESP_KEY = '@SahaTakip:form_responses';
const REV_KEY = '@SahaTakip:form_response_revisions';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function nowISO() {
  return new Date().toISOString();
}

// ---------------- RESPONSES ----------------

export async function listResponses(): Promise<FormResponse[]> {
  try {
    const raw = await AsyncStorage.getItem(RESP_KEY);
    return raw ? (JSON.parse(raw) as FormResponse[]) : [];
  } catch {
    return [];
  }
}

export async function listResponsesByWorkOrder(
  workOrderId: string,
): Promise<FormResponse[]> {
  const all = await listResponses();
  return all.filter(r => r.workOrderId === workOrderId);
}

export async function listResponsesByTemplate(
  templateId: string,
): Promise<FormResponse[]> {
  const all = await listResponses();
  return all.filter(r => r.templateId === templateId);
}

export async function getResponse(id: string): Promise<FormResponse | null> {
  const all = await listResponses();
  return all.find(r => r.id === id) ?? null;
}

export async function saveResponses(list: FormResponse[]) {
  await AsyncStorage.setItem(RESP_KEY, JSON.stringify(list));
}

export async function createResponse(input: {
  templateId: string;
  templateName: string;
  workOrderId?: string;
  customerId?: string;
  filledBy?: string;
  values: Record<string, FormFieldValue>;
}): Promise<FormResponse> {
  const all = await listResponses();
  const t = nowISO();
  const resp: FormResponse = {
    id: uid(),
    templateId: input.templateId,
    templateName: input.templateName,
    workOrderId: input.workOrderId,
    customerId: input.customerId,
    filledBy: input.filledBy,
    values: input.values,
    revision: 1,
    createdAt: t,
    updatedAt: t,
  };
  await saveResponses([resp, ...all]);
  await recordRevision({
    responseId: resp.id,
    revision: 1,
    editedBy: input.filledBy,
    reason: 'İlk kayıt',
    values: input.values,
  });
  return resp;
}

export async function updateResponse(
  responseId: string,
  newValues: Record<string, FormFieldValue>,
  editedBy?: string,
  reason?: string,
): Promise<FormResponse | null> {
  const all = await listResponses();
  const idx = all.findIndex(r => r.id === responseId);
  if (idx < 0) return null;
  const prev = all[idx];
  const nextRev = (prev.revision ?? 1) + 1;
  const updated: FormResponse = {
    ...prev,
    values: newValues,
    revision: nextRev,
    updatedAt: nowISO(),
  };
  all[idx] = updated;
  await saveResponses(all);
  await recordRevision({
    responseId,
    revision: nextRev,
    editedBy,
    reason,
    values: newValues,
  });
  return updated;
}

export async function deleteResponse(id: string) {
  const all = await listResponses();
  await saveResponses(all.filter(r => r.id !== id));
  // Revizyonları da temizle
  const revs = await listAllRevisions();
  await saveRevisions(revs.filter(r => r.id.split('::')[0] !== id));
}

// ---------------- REVISIONS ----------------

// Revizyonları flat liste halinde saklıyoruz; id = `${responseId}::${revNo}`
interface StoredRevision extends FormResponseRevision {
  responseId: string;
}

async function listAllRevisions(): Promise<StoredRevision[]> {
  try {
    const raw = await AsyncStorage.getItem(REV_KEY);
    return raw ? (JSON.parse(raw) as StoredRevision[]) : [];
  } catch {
    return [];
  }
}

async function saveRevisions(list: StoredRevision[]) {
  await AsyncStorage.setItem(REV_KEY, JSON.stringify(list));
}

export async function listRevisionsByResponse(
  responseId: string,
): Promise<FormResponseRevision[]> {
  const all = await listAllRevisions();
  return all
    .filter(r => r.responseId === responseId)
    .sort((a, b) => b.revision - a.revision)
    .map(({ responseId: _r, ...rest }) => rest);
}

async function recordRevision(input: {
  responseId: string;
  revision: number;
  editedBy?: string;
  reason?: string;
  values: Record<string, FormFieldValue>;
}) {
  const all = await listAllRevisions();
  const rev: StoredRevision = {
    id: `${input.responseId}::${input.revision}`,
    responseId: input.responseId,
    revision: input.revision,
    editedAt: nowISO(),
    editedBy: input.editedBy,
    reason: input.reason,
    values: input.values,
  };
  await saveRevisions([rev, ...all]);
}
