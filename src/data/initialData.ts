import { WorkOrder, Employee, ServiceCatalogItem, MaterialCatalogItem } from '../types';
import { REAL_EMPLOYEES } from './realEmployees';
import { REAL_MATERIALS } from './realMaterials';
import { REAL_CUSTOMERS } from './realCustomers';

export const SERVICE_CATALOG: ServiceCatalogItem[] = [
  { id: 'og-hucre', name: 'OG Hücre Değişimi ve Devreye Alma', price: 95000, estCost: 38000 },
  { id: 'ag-pano', name: 'AG Pano Tasarım ve Montaj', price: 48000, estCost: 19000 },
  { id: 'kompanzasyon', name: 'Kompanzasyon Panosu Revizyonu', price: 32000, estCost: 12000 },
  { id: 'trafo-bakim', name: 'Yıllık Trafo Yağ ve Test Bakımı', price: 65000, estCost: 25000 },
];

export const MATERIAL_CATALOG: MaterialCatalogItem[] = REAL_MATERIALS;

export const CLIENTS: string[] = REAL_CUSTOMERS
  .filter(c => c.type !== 'Tedarikçi')
  .map(c => c.title);

export const INITIAL_WORK_ORDERS: WorkOrder[] = [
  {
    id: 'KOB-2023-102',
    client: 'Aksa Enerji A.Ş.',
    serviceName: 'Yıllık Trafo Yağ ve Test Bakımı',
    date: '2023-08-15',
    engineer: 'Test MÜHENDİS',
    materials: [{ id: 'makaron', name: 'Isı Büzüşmeli Makaron Seti', qty: 2, price: 180 }],
    otherCost: 1200,
    laborCost: 25000,
    materialCost: 360,
    quoteAmount: 65360,
    profit: 39160,
    status: 'Faturalandırıldı',
    beforePhoto: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=400&q=80',
    afterPhoto: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
    notes: 'Yıllık trafo bakımı başarıyla tamamlandı. Hücre testleri olumlu.',
  },
  {
    id: 'KOB-2024-045',
    client: 'Yıldız Holding',
    serviceName: 'AG Pano Tasarım ve Montaj',
    date: '2024-11-20',
    engineer: 'Mehmet Mühendis',
    materials: [
      { id: 'bakir-kablo', name: 'NYY Bakır Kablo (Metre)', qty: 50, price: 320 },
      { id: 'kontaktor-22', name: 'AG Kontaktör 22kW', qty: 4, price: 580 },
    ],
    otherCost: 4500,
    laborCost: 19000,
    materialCost: 18320,
    quoteAmount: 48320,
    profit: 25500,
    status: 'Faturalandırıldı',
    beforePhoto: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80',
    afterPhoto: 'https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&w=400&q=80',
    notes: 'Dağıtım panosu montajı standartlara uygun şekilde bitirildi.',
  },
  {
    id: 'KOB-2025-089',
    client: 'Zorlu Enerji Grubu',
    serviceName: 'Kompanzasyon Panosu Revizyonu',
    date: '2025-05-10',
    engineer: 'Test MÜHENDİS',
    materials: [
      { id: 'sigorta-16a', name: 'Otomatik Sigorta 16A', qty: 12, price: 110 },
      { id: 'kontaktor-22', name: 'AG Kontaktör 22kW', qty: 6, price: 580 },
    ],
    otherCost: 2300,
    laborCost: 12000,
    materialCost: 4800,
    quoteAmount: 32000,
    profit: 15200,
    status: 'Faturalandırıldı',
    beforePhoto: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=400&q=80',
    afterPhoto: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=400&q=80',
    notes: 'Kondansatör grupları yenilendi, reaktif ceza riski giderildi.',
  },
];

export const INITIAL_EMPLOYEES: Employee[] = REAL_EMPLOYEES;
