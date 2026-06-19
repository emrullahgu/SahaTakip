import { insertQuoteWithNumberRetry, isQuoteNumberDup } from '../quoteInsert';
import type { Quote } from '../../types';

const PREFIX = 'TK-2026-';
const q = (number: string): Quote => ({ id: 'q1', number } as Quote);

const dupErr = (msg = 'duplicate key value violates unique constraint "quotes_number_key"') => {
  const e: any = new Error(`[quotes.insert] ${msg}`);
  e.code = '23505';
  return e;
};

describe('isQuoteNumberDup', () => {
  it('23505 kodunu yakalar', () => {
    expect(isQuoteNumberDup({ code: '23505' })).toBe(true);
  });
  it('quotes_number_key mesajını yakalar (kod olmadan)', () => {
    expect(isQuoteNumberDup({ message: '... unique constraint "quotes_number_key"' })).toBe(true);
  });
  it('alakasız hatayı yakalamaz', () => {
    expect(isQuoteNumberDup({ code: '42501', message: 'permission denied' })).toBe(false);
  });
});

describe('insertQuoteWithNumberRetry', () => {
  it('çakışma yoksa ilk denemede kaydeder, numara değişmez', async () => {
    const insert = jest.fn().mockResolvedValue(undefined);
    const saved = await insertQuoteWithNumberRetry(q('TK-2026-0005'), PREFIX, {
      insert,
      serverMaxSeq: async () => 4,
      localMaxSeq: () => 4,
    });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(saved.number).toBe('TK-2026-0005');
  });

  it('çakışmada sunucu max+1 ile yeni numara üretip kaydeder', async () => {
    // İlk insert çakışır (yerel max 5 demiş ama sunucuda 12 varmış); retry sunucu max'tan üretir.
    const insert = jest.fn()
      .mockRejectedValueOnce(dupErr())
      .mockResolvedValueOnce(undefined);
    const onNumberChange = jest.fn();
    const saved = await insertQuoteWithNumberRetry(q('TK-2026-0006'), PREFIX, {
      insert,
      serverMaxSeq: async () => 12,
      localMaxSeq: () => 5,
      onNumberChange,
    });
    expect(insert).toHaveBeenCalledTimes(2);
    expect(saved.number).toBe('TK-2026-0013'); // max(12,5)+0+1
    expect(onNumberChange).toHaveBeenCalledWith(expect.objectContaining({ number: 'TK-2026-0013' }));
  });

  it('art arda çakışmada numara monoton artar (serverMax sabit kalsa bile)', async () => {
    const tried: string[] = [];
    const insert = jest.fn(async (quote: Quote) => {
      tried.push(quote.number);
      if (tried.length < 3) throw dupErr(); // ilk 2 deneme çakışır
    });
    const saved = await insertQuoteWithNumberRetry(q('TK-2026-0001'), PREFIX, {
      insert,
      serverMaxSeq: async () => 10, // sabit
      localMaxSeq: () => 0,
    });
    expect(tried).toEqual(['TK-2026-0001', 'TK-2026-0011', 'TK-2026-0012']); // +1, +2
    expect(saved.number).toBe('TK-2026-0012');
  });

  it('numara-dışı hatayı anında yeniden fırlatır (retry yok)', async () => {
    const insert = jest.fn().mockRejectedValue(Object.assign(new Error('permission denied'), { code: '42501' }));
    await expect(
      insertQuoteWithNumberRetry(q('TK-2026-0001'), PREFIX, {
        insert,
        serverMaxSeq: async () => 0,
        localMaxSeq: () => 0,
      }),
    ).rejects.toThrow(/permission denied/);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it('retry tükenirse son hatayı fırlatır', async () => {
    const insert = jest.fn().mockRejectedValue(dupErr());
    await expect(
      insertQuoteWithNumberRetry(q('TK-2026-0001'), PREFIX, {
        insert,
        serverMaxSeq: async () => 1,
        localMaxSeq: () => 0,
        maxRetries: 2,
      }),
    ).rejects.toThrow(/quotes_number_key/);
    expect(insert).toHaveBeenCalledTimes(3); // ilk + 2 retry
  });
});
