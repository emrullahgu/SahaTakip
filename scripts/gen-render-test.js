// gen-render-test.js — src/screens/*.tsx'in TAMAMINI kapsayan smoke-render testi üretir.
// Çökme = gerçek bug. Çalıştır: node scripts/gen-render-test.js
const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, '..', 'src', 'screens');
const outFile = path.join(screensDir, '__tests__', 'screens.render.test.tsx');

const files = fs.readdirSync(screensDir)
  .filter(f => f.endsWith('.tsx') && !f.startsWith('.'))
  .map(f => f.replace(/\.tsx$/, ''))
  .sort();

const imports = files.map(n => `import ${n} from '../${n}';`).join('\n');
const list = files.map(n => `  ['${n}', ${n}],`).join('\n');

const content = `// OTOMATİK ÜRETİLDİ — scripts/gen-render-test.js (elle düzenleme; yeniden üretince kaybolur).
// TÜM ekranların smoke-render testi: AuthProvider+AppProvider içinde çökmeden mount oluyor mu?
// Çökme = gerçek bug. Param gerektiren ekranlar boş param ({}) ile denenir (genelde
// loading/not-found gösterir, çökmez). Native modüller jest.render.setup.js'te mock'lu.
import { renderScreen } from '../../test-utils/renderScreen';

${imports}

const SCREENS: Array<[string, React.ComponentType<any>]> = [
${list}
];

describe('TÜM ekranlar smoke-render (${files.length})', () => {
  it.each(SCREENS)('%s çökmeden mount olur', async (_name, Screen) => {
    const { json } = await renderScreen(Screen);
    expect(json !== undefined).toBe(true);
  });
});
`;

fs.writeFileSync(outFile, content, 'utf8');
console.log('Yazıldı:', outFile, '—', files.length, 'ekran');
