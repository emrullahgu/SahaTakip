import { execSync } from 'node:child_process';
import zlib from 'node:zlib';
import fs from 'node:fs';

const buildId = process.argv[2] || '6a325dbf-f133-4eeb-a8a9-b828e349fa63';
const json = execSync(`npx --yes eas-cli@latest build:view ${buildId} --json`, { encoding: 'utf8', stdio: ['ignore','pipe','ignore'] });
const data = JSON.parse(json);
const logFiles = data.logFiles || {};
console.log('Phases:', Object.keys(logFiles));

async function fetchLog(url) {
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  try { return zlib.brotliDecompressSync(buf).toString('utf8'); }
  catch { try { return zlib.gunzipSync(buf).toString('utf8'); } catch { return buf.toString('utf8'); } }
}

const all = [];
for (const [phase, url] of Object.entries(logFiles)) {
  if (!url) continue;
  try {
    const txt = await fetchLog(url);
    all.push(`\n========== PHASE: ${phase} ==========\n${txt}`);
  } catch (e) { all.push(`\n[ERR ${phase}] ${e.message}`); }
}
fs.writeFileSync('build-log-full.txt', all.join('\n'));
console.log('Wrote build-log-full.txt:', fs.statSync('build-log-full.txt').size, 'bytes');

// Print last 200 lines of run gradlew phase if present
const txt = all.join('\n');
const idx = txt.toLowerCase().lastIndexOf('run gradlew');
if (idx >= 0) {
  const tail = txt.slice(idx);
  const lines = tail.split('\n');
  console.log('\n--- TAIL of Run gradlew ---');
  console.log(lines.slice(-200).join('\n'));
}
