// repoUuidGuard.test.ts
// Non-UUID id'li (eski/yerel) kayıtların silinmesi DB'ye gitmemeli ve
// Postgres "invalid input syntax for type uuid" hatası fırlatmamalı.
import { customersRepo } from '../customersRepo';
import { employeesRepo } from '../employeesRepo';
import { cacheGet, cacheSet } from '../repository';

describe('non-UUID id guard (delete/update yereldir, DB hatası fırlatmaz)', () => {
  it('customers.delete eski "cust-..." id ile fırlatmaz ve cache\'ten çıkarır', async () => {
    const legacy: any = { id: 'cust-0312-teklif', shortName: 'Eski Müşteri' };
    const keep: any = { id: '11111111-1111-4111-8111-111111111111', shortName: 'Gerçek' };
    await cacheSet('customers', [legacy, keep]);

    await expect(customersRepo.delete('cust-0312-teklif')).resolves.toBeUndefined();

    const after = (await cacheGet<any[]>('customers')) ?? [];
    expect(after.map(c => c.id)).toEqual(['11111111-1111-4111-8111-111111111111']);
  });

  it('employees.delete non-UUID id ile fırlatmaz ve cache\'ten çıkarır', async () => {
    const legacy: any = { id: 'emp-legacy-1', fullName: 'Eski Personel' };
    await cacheSet('employees', [legacy]);

    await expect(employeesRepo.delete('emp-legacy-1')).resolves.toBeUndefined();

    const after = (await cacheGet<any[]>('employees')) ?? [];
    expect(after).toEqual([]);
  });
});
