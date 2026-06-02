// scripts/push-ai-keys.mjs
// AI sağlayıcı API anahtarlarını Supabase `app_settings` tablosuna yazar.
// APK/Netlify/Web — hepsi açıldığında giriş yaptıktan sonra bu satırdan okur
// (RLS: authenticated kullanıcılar okur; admin yazar).
//
// Kullanım (PowerShell):
//   $env:SUPABASE_URL="https://xxx.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."   # Service Role (gizli) — sadece bu makinede
//   node scripts/push-ai-keys.mjs
//
// Üzerine yazmak yerine sadece eksikse oluşturmak için --no-overwrite flag'i kullan.

const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_BASE || !KEY) {
  console.error('HATA: SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY env değişkenleri gerekli.');
  console.error('Supabase Dashboard → Settings → API → "service_role" anahtarını al.');
  process.exit(1);
}

const OVERWRITE = !process.argv.includes('--no-overwrite');

// Varsayılan sağlayıcı + anahtarları. Burada birden fazla sağlayıcı olabilir;
// uygulama `provider` alanını kullanarak hangisini çağıracağına karar verir.
const aiSettings = {
  provider: 'gemini', // openai | claude | gemini | mock
  apiKey: process.env.GEMINI_KEY || '',
  model: 'gemini-2.5-flash',
  // Diğer sağlayıcı anahtarları — admin "API Anahtarları" ekranında sağlayıcıyı
  // değiştirince UI bu listeden otomatik yükler.
  keys: {
    gemini: process.env.GEMINI_KEY || '',
    claude: process.env.CLAUDE_KEY || '',
    openai: process.env.OPENAI_KEY || '',
  },
};

if (!aiSettings.apiKey) {
  console.error('HATA: GEMINI_KEY (ve isteğe bağlı CLAUDE_KEY/OPENAI_KEY) env değişkenlerini ayarla.');
  process.exit(1);
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  Prefer: OVERWRITE ? 'resolution=merge-duplicates,return=representation' : 'return=representation',
};

const body = JSON.stringify([{ key: 'ai_settings', value: aiSettings, updated_at: new Date().toISOString() }]);

const endpoint = `${URL_BASE.replace(/\/$/, '')}/rest/v1/app_settings?on_conflict=key`;

console.log(`[push-ai-keys] ${OVERWRITE ? 'UPSERT' : 'INSERT'} → ${endpoint}`);

const res = await fetch(endpoint, { method: 'POST', headers, body });
const text = await res.text();
if (!res.ok) {
  console.error(`HTTP ${res.status} ${res.statusText}`);
  console.error(text);
  process.exit(2);
}
console.log('OK:', text);
console.log('\nUygulama bir sonraki açılışta (giriş yapan herhangi bir kullanıcıda) bu ayarları AsyncStorage cache\'ine indirir.');
