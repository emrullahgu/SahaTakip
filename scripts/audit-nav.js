#!/usr/bin/env node
// audit-nav.js — POZ-DEV-351 Ekran ↔ Stack.Screen kayıt farkını raporlar.
// Kullanım: node scripts/audit-nav.js

const fs = require('fs');
const path = require('path');

const SCREENS_DIR = path.join(__dirname, '..', 'src', 'screens');
const NAV_FILE = path.join(__dirname, '..', 'src', 'navigation', 'index.tsx');

function listScreenFiles() {
  return fs
    .readdirSync(SCREENS_DIR)
    .filter((f) => f.endsWith('Screen.tsx'))
    .map((f) => f.replace(/\.tsx$/, ''));
}

function extractStackRegistrations() {
  const src = fs.readFileSync(NAV_FILE, 'utf8');
  const re = /Stack\.Screen\s+name=["']([^"']+)["']/g;
  const names = new Set();
  let m;
  while ((m = re.exec(src))) names.add(m[1]);
  return names;
}

function extractImportedScreens() {
  const src = fs.readFileSync(NAV_FILE, 'utf8');
  const re = /import\s+(\w+)\s+from\s+['"]\.\.\/screens\/(\w+)['"]/g;
  const names = new Set();
  let m;
  while ((m = re.exec(src))) names.add(m[2]);
  return names;
}

const screens = listScreenFiles();
const registered = extractStackRegistrations();
const imported = extractImportedScreens();

console.log(`Ekran dosyası: ${screens.length}`);
console.log(`Stack.Screen kaydı: ${registered.size}`);
console.log(`Navigation import: ${imported.size}`);
console.log('---');

const notImported = screens.filter((s) => !imported.has(s));
console.log(`Navigation'a import EDİLMEMİŞ ${notImported.length} ekran:`);
notImported.slice(0, 50).forEach((s) => console.log('  - ' + s));
if (notImported.length > 50) console.log(`  ... ve ${notImported.length - 50} daha`);

console.log('---');
const importedButNotRegistered = [...imported].filter((s) => {
  // route adı genelde Screen suffix'siz; basit eşleme
  const route = s.replace(/Screen$/, '');
  return !registered.has(route) && !registered.has(s);
});
console.log(`Import edilmiş ama Stack.Screen olarak EKLENMEMİŞ ${importedButNotRegistered.length} ekran:`);
importedButNotRegistered.slice(0, 30).forEach((s) => console.log('  - ' + s));

process.exit(notImported.length > 0 ? 0 : 0);
