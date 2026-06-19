// ====================================================================
// SahaTakip — Data Layer (Public API)
// ====================================================================
// Tüm UI / Context kodu sadece bu modülü import eder:
//
//   import { quotesRepo, customersRepo, isOnlineMode } from '../services/data';
//
// ====================================================================

export { isOnlineMode, supabase, cacheGet, cacheSet } from './repository';
export { drainSyncQueue, getSyncQueue } from './syncDrain';
export { clearSyncQueue, clearSyncOp, enqueueSync } from './repository';
export { quotesRepo, serverMaxQuoteSeq } from './quotesRepo';
export { customersRepo } from './customersRepo';
export { workOrdersRepo } from './workOrdersRepo';
export { employeesRepo } from './employeesRepo';
export { locationsRepo } from './locationsRepo';
export { shiftsRepo } from './shiftsRepo';
export { geofencesRepo } from './geofencesRepo';
export { checkinsRepo } from './checkinsRepo';
export { auditRepo } from './auditRepo';
