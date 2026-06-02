// src/config/brand.ts
// Tek noktadan firma kimliği — farklı müşterilere satarken bu dosyayı değiştir.
// Logo değişimi için assets/logo.png dosyasını yenisiyle değiştirin.

export const BRAND = {
  /** Ürün/Yazılım adı (uygulamanın kendisi) */
  appName: 'SahaTakip',
  /** Uygulama sloganı (Login/PDF başlıklarında görünür) */
  appSlogan: 'SAHADA · TAKİPTE · KONTROLDE',

  /** Aktif olarak kullanan firmanın bilgileri */
  company: {
    name: 'KOBİNERJİ',
    legalName: 'KOBİNERJİ MÜHENDİSLİK VE ENERJİ VERİMLİLİĞİ DANIŞMANLIK ANONİM ŞİRKETİ',
    tagline: 'Mühendislik & Enerji Verimliliği Danışmanlığı',
    email: 'info@kobinerji.com',
    phone: '0535 714 52 88',
    phoneRaw: '+905357145288',
    address: 'Kemalpaşa OSB Mah. Gazi Bul. No: 177 İç Kapı No: 19\nKemalpaşa / İzmir',
    website: 'www.kobinerji.com',
    websiteUrl: 'https://www.kobinerji.com',
    taxOffice: 'Kemalpaşa VD.',
    taxNumber: '5641385589',
    mersis: '',
    foundedYear: 2024,
    copyrightYear: 2026,
  },

  /** Sunulan hizmet özetleri (Firma sayfasında listelenir) */
  services: [
    'OG/AG Elektrik Pano Montaj ve Revizyon',
    'Trafo Bakım ve Test Hizmetleri',
    'Kompanzasyon Sistemi Kurulum',
    'Enerji Verimliliği Danışmanlığı',
    'Saha Yönetim Yazılımı (SahaTakip)',
    'Periyodik Elektrik Bakım Kontratları',
  ],
} as const;

export type BrandConfig = typeof BRAND;
