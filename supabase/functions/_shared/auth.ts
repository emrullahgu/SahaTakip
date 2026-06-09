// supabase/functions/_shared/auth.ts
// Edge Function kimlik/yetki doğrulaması.
//
// SORUN (denetim M7): ai-tools/ai-sql gibi service_role ile RLS'i bypass edip
// gerçek DB işlemleri yapan fonksiyonlar yalnız "geçerli JWT" istiyordu. Anon
// (publishable) key gateway için geçerli bir JWT olduğundan, kimliksiz veya
// düşük-yetkili çağrılar client-side yetki kontrolünü tamamen bypass edebiliyordu.
//
// Bu helper: Authorization başlığındaki GERÇEK kullanıcı JWT'sini doğrular,
// anon key'i reddeder ve (opsiyonel) profiles.role + approval_status kontrolü yapar.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthResult {
  ok: boolean;
  status: number;
  userId?: string;
  role?: string;
  error?: string;
}

export async function requireUser(
  req: Request,
  opts: { roles?: string[]; requireApproved?: boolean } = {},
): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

  // Boş ya da anon key → kimliksiz; reddet.
  if (!jwt || jwt === anonKey) {
    return { ok: false, status: 401, error: 'Oturum gerekli (geçerli kullanıcı JWT).' };
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // JWT'yi auth sunucusunda doğrula — gerçek bir kullanıcıya ait mi?
  const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
  const user = userData?.user;
  if (authErr || !user?.id) {
    return { ok: false, status: 401, error: 'Geçersiz oturum.' };
  }

  if (opts.roles?.length || opts.requireApproved) {
    const { data: profile } = await admin
      .from('profiles')
      .select('role, approval_status')
      .eq('id', user.id)
      .maybeSingle();
    const role = profile?.role as string | undefined;
    if (opts.requireApproved && profile?.approval_status !== 'approved') {
      return { ok: false, status: 403, error: 'Hesabınız henüz onaylanmamış.' };
    }
    if (opts.roles?.length && (!role || !opts.roles.includes(role))) {
      return { ok: false, status: 403, error: 'Bu işlem için yetkiniz yok.' };
    }
    return { ok: true, status: 200, userId: user.id, role };
  }

  return { ok: true, status: 200, userId: user.id };
}
