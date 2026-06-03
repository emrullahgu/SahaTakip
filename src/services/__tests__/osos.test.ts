// osos.test.ts — OSOS alarm motoru unit testleri (POZ-DEV-250)
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  bulkImportReadings,
  addReading,
  listAlarms,
  listReadings,
} from '../osos';
import type { OsosReading } from '../../types';

type NewReading = Omit<OsosReading, 'id' | 'createdAt'>;

const baseReading = (over: Partial<NewReading>): NewReading => ({
  meterNo: 'M-1001',
  readingAt: '2026-01-01T00:00:00.000Z',
  activeImportKwh: 100,
  activeExportKwh: 0,
  reactiveImportKvarh: 0,
  reactiveExportKvarh: 0,
  source: 'osos_import',
  ...over,
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('osos alarm motoru', () => {
  it('tüketim sıçramasını kronolojik bir önceki okumaya göre değerlendirir', async () => {
    // Karışık sırada toplu import: A(100) < B(110) < C(300) — zaman sırası bu.
    // Diziye C ortada gelse de her okuma KENDİNDEN ÖNCEKİ okumaya göre kıyaslanmalı.
    await bulkImportReadings([
      baseReading({ readingAt: '2026-01-01T00:00:00.000Z', activeImportKwh: 100 }), // A
      baseReading({ readingAt: '2026-01-03T00:00:00.000Z', activeImportKwh: 300 }), // C
      baseReading({ readingAt: '2026-01-02T00:00:00.000Z', activeImportKwh: 110 }), // B
    ]);

    const alarms = await listAlarms();
    const spikes = alarms.filter(a => a.kind === 'consumption_spike');
    const drops = alarms.filter(a => a.kind === 'consumption_drop');

    // C: 110 → 300 ≈ +172% → tek bir sıçrama alarmı.
    expect(spikes).toHaveLength(1);
    // B yalnızca A(100)'a göre +%10 olmalı; C(300) "gelecek" okumaya kıyaslanıp
    // sahte bir düşüş alarmı ÜRETMEMELİ (regresyon: prev = kronolojik öncül).
    expect(drops).toHaveLength(0);
  });

  it('demand eşiği aşımında kritik alarm üretir', async () => {
    await addReading(baseReading({ demandKw: 150 })); // default kural eşiği 100 kW
    const alarms = await listAlarms();
    const demand = alarms.filter(a => a.kind === 'demand_exceeded');
    expect(demand).toHaveLength(1);
    expect(demand[0].severity).toBe('critical');
  });

  it('ilk okuma için referans yokken sıçrama/düşüş alarmı üretmez', async () => {
    await addReading(baseReading({ activeImportKwh: 5000 }));
    const alarms = await listAlarms();
    expect(alarms.filter(a => a.kind === 'consumption_spike')).toHaveLength(0);
    expect(alarms.filter(a => a.kind === 'consumption_drop')).toHaveLength(0);
    expect(await listReadings()).toHaveLength(1);
  });
});
