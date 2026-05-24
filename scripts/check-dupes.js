const fs = require('fs');
const s = fs.readFileSync('src/navigation/index.tsx', 'utf8');
const re = /Stack\.Screen\s+name=["']([^"']+)["']/g;
const counts = {};
let m;
while ((m = re.exec(s))) counts[m[1]] = (counts[m[1]] || 0) + 1;
const dupes = Object.entries(counts).filter(([_, c]) => c > 1);
console.log('Duplicates:', dupes.length);
dupes.forEach(([n, c]) => console.log('  ' + n + ' x' + c));
