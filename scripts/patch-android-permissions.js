const fs = require('fs');
const path = 'android/app/src/main/AndroidManifest.xml';
if (!fs.existsSync(path)) { console.error('AndroidManifest.xml not found.'); process.exit(1); }
let s = fs.readFileSync(path, 'utf8');
for (const p of ['android.permission.ACCESS_COARSE_LOCATION','android.permission.ACCESS_FINE_LOCATION']) {
  if (!s.includes(`android:name="${p}"`)) {
    const m=s.match(/<manifest[^>]*>/);
    if(!m) throw new Error('Cannot find <manifest> tag');
    s=s.replace(m[0], `${m[0]}\n    <uses-permission android:name="${p}" />`);
  }
}
fs.writeFileSync(path,s); console.log('GPS permissions ensured.');
