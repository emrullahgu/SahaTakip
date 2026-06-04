// ====================================================================
// Quotes Repository — POZ-DEV-001 (iskelet)
// ====================================================================
// POZ-DEV-002'de AppContext bu repository'yi kullanarak Supabase'e yazar.
// ====================================================================

import {
  supabase,
  isOnlineMode,
  isUuid,
  cacheGet,
  cacheSet,
  enqueueSync,
  Repository,
} from './repository';
import {
  quoteFromRow,
  quoteToRow,
  quoteLineToRow,
} from './mappers';
import type { Quote } from '../../types';

const CACHE_KEY = 'quotes';

export const quotesRepo: Repository<Quote> = {
  async list(): Promise<Quote[]> {
    if (!isOnlineMode()) {
      return (await cacheGet<Quote[]>(CACHE_KEY)) ?? [];
    }
    const { data, error } = await supabase
      .from('quotes')
      .select('*, quote_lines(*)')
      .is('deleted_at', null) // soft-delete edilenler gizlenir
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('[quotesRepo.list]', error.message);
      return (await cacheGet<Quote[]>(CACHE_KEY)) ?? [];
    }
    const quotes = (data ?? []).map((r: any) => quoteFromRow(r, r.quote_lines ?? []));
    await cacheSet(CACHE_KEY, quotes);
    return quotes;
  },

  async insert(quote: Quote): Promise<Quote> {
    if (!isOnlineMode()) {
      await enqueueSync({ id: quote.id, table: 'quotes', action: 'insert', payload: quote });
      const cached = (await cacheGet<Quote[]>(CACHE_KEY)) ?? [];
      await cacheSet(CACHE_KEY, [quote, ...cached]);
      return quote;
    }
    // Yerel-id (UUID değil) → DB'ye yazma, kuyruğa düş (sync drain UUID üretebilir veya backend yapar)
    if (!isUuid(quote.id)) {
      await enqueueSync({ id: quote.id, table: 'quotes', action: 'insert', payload: quote });
      const cached = (await cacheGet<Quote[]>(CACHE_KEY)) ?? [];
      await cacheSet(CACHE_KEY, [quote, ...cached]);
      return quote;
    }
    // RLS quotes_owner_write created_by = auth.uid() istiyor. created_by set
    // edilmezse manager olmayan (saha/mühendis) kullanıcının teklifi sessizce
    // reddediliyor → yalnızca yerelde kalıyor, yönetici asla göremiyor.
    let userId: string | undefined;
    try { const { data } = await supabase.auth.getUser(); userId = data?.user?.id ?? undefined; } catch { /* ignore */ }
    const { error: e1 } = await supabase.from('quotes').insert(quoteToRow(quote, userId));
    if (e1) throw new Error(`[quotes.insert] ${e1.message}`);
    if (quote.lines.length) {
      const { error: e2 } = await supabase
        .from('quote_lines')
        .insert(quote.lines.map(l => quoteLineToRow(quote.id, l)));
      if (e2) throw new Error(`[quote_lines.insert] ${e2.message}`);
    }
    return quote;
  },

  async update(id: string, quote: Quote): Promise<Quote> {
    if (!isOnlineMode()) {
      await enqueueSync({ id, table: 'quotes', action: 'update', payload: quote });
      return quote;
    }
    // Yerel-id (UUID değil) → DB'ye yazma, sadece cache + kuyruğa düş
    if (!isUuid(id)) {
      await enqueueSync({ id, table: 'quotes', action: 'update', payload: quote });
      return quote;
    }
    // Update'te created_by'ı GÖNDERME — aksi halde bir yöneticinin başkasının
    // teklifini güncellemesi sahipliği üzerine geçirir (orijinal sahip yazma
    // hakkını kaybeder). Mevcut created_by korunur.
    const { created_by, ...quoteUpdate } = quoteToRow(quote);
    void created_by;
    const { error: e1 } = await supabase.from('quotes').update(quoteUpdate).eq('id', id);
    if (e1) throw new Error(`[quotes.update] ${e1.message}`);
    const { error: eDel } = await supabase.from('quote_lines').delete().eq('quote_id', id);
    if (eDel) throw new Error(`[quote_lines.delete] ${eDel.message}`);
    if (quote.lines.length) {
      const { error: eIns } = await supabase
        .from('quote_lines')
        .insert(quote.lines.map(l => quoteLineToRow(id, l)));
      if (eIns) throw new Error(`[quote_lines.insert] ${eIns.message}`);
    }
    return quote;
  },

  async delete(id: string): Promise<void> {
    if (!isOnlineMode()) {
      await enqueueSync({ id, table: 'quotes', action: 'delete', payload: { id } });
      return;
    }
    // Yerel-id (UUID değil) → DB'de yok, sessizce başarılı say
    if (!isUuid(id)) return;
    // Soft delete: hard DELETE yerine deleted_at damgalanır (geri alınabilir).
    const { error } = await supabase
      .from('quotes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`[quotes.delete] ${error.message}`);
  },
};
