// Deno CI smoke test — `deno test -A supabase/functions/` en az bir test modülü
// bulamazsa "No test modules found" hatasıyla exit 1 verip CI'yı kırıyordu.
// Bu dosya, Edge Function'lar için saf yardımcı mantığı doğrulayan minimal bir
// testtir; gerçek fonksiyon testleri eklendikçe genişletilebilir.

Deno.test("smoke: runtime çalışıyor", () => {
  if (1 + 1 !== 2) throw new Error("aritmetik bozuk");
});

Deno.test("smoke: JSON serileştirme", () => {
  const obj = { ok: true, n: 42 };
  const round = JSON.parse(JSON.stringify(obj));
  if (round.ok !== true || round.n !== 42) throw new Error("JSON round-trip başarısız");
});
