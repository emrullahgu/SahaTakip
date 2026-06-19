import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkSlaBreaches } from '../slaWatcher';
import { Notify } from '../notifications';
import type { WorkOrder } from '../../types';

// notifications'ı mock'la: slaBreach gerçek push/emit yapmasın, sadece çağrıyı say.
jest.mock('../notifications', () => ({
  Notify: { slaBreach: jest.fn(() => Promise.resolve()) },
}));

const slaBreachMock = Notify.slaBreach as jest.Mock;

// Sadece isSlaBreach'in baktığı alanları doldur; gerisi tip için cast'le geç.
function wo(partial: Partial<WorkOrder> & { id: string }): WorkOrder {
  return {
    client: 'Test Müşteri',
    serviceName: 'Servis',
    date: new Date(Date.now() - 7 * 24 * 3600_000).toISOString(),
    status: 'Başladı',
    ...partial,
  } as WorkOrder;
}

const overdue = (id: string, hoursAgo = 5) =>
  wo({ id, plannedEnd: new Date(Date.now() - hoursAgo * 3600_000).toISOString() });

beforeEach(async () => {
  slaBreachMock.mockClear();
  await AsyncStorage.clear();
});

describe('checkSlaBreaches', () => {
  it('geciken her iş emri için bir kez bildirir', async () => {
    const sent = await checkSlaBreaches([overdue('IE-1'), overdue('IE-2')]);
    expect(sent).toBe(2);
    expect(slaBreachMock).toHaveBeenCalledTimes(2);
  });

  it('aynı ihlali ikinci taramada TEKRAR bildirmez (spam yok)', async () => {
    await checkSlaBreaches([overdue('IE-1')]);
    slaBreachMock.mockClear();
    const sent = await checkSlaBreaches([overdue('IE-1')]);
    expect(sent).toBe(0);
    expect(slaBreachMock).not.toHaveBeenCalled();
  });

  it('ihlal olmayan (gelecekte planlı / tamamlanmış) iş emirlerini bildirmez', async () => {
    const future = wo({ id: 'IE-3', plannedEnd: new Date(Date.now() + 3600_000).toISOString() });
    const done = wo({ id: 'IE-4', status: 'Tamamlandı', plannedEnd: new Date(Date.now() - 3600_000).toISOString() });
    const sent = await checkSlaBreaches([future, done]);
    expect(sent).toBe(0);
    expect(slaBreachMock).not.toHaveBeenCalled();
  });

  it('ihlal listeden çıkıp sonra tekrar ihlal ederse yeniden bildirilebilir (set budama)', async () => {
    await checkSlaBreaches([overdue('IE-1')]);          // 1. bildirim
    await checkSlaBreaches([]);                          // ihlal yok → set temizlenir
    slaBreachMock.mockClear();
    const sent = await checkSlaBreaches([overdue('IE-1')]); // yeniden geciker → yeniden bildir
    expect(sent).toBe(1);
    expect(slaBreachMock).toHaveBeenCalledTimes(1);
  });

  it('yeni geciken eklenince yalnız onu bildirir', async () => {
    await checkSlaBreaches([overdue('IE-1')]);
    slaBreachMock.mockClear();
    const sent = await checkSlaBreaches([overdue('IE-1'), overdue('IE-2')]);
    expect(sent).toBe(1);
    expect(slaBreachMock).toHaveBeenCalledTimes(1);
  });
});
