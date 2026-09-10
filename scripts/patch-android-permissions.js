const fs = require('fs');
const path = 'android/app/src/main/AndroidManifest.xml';

if (!fs.existsSync(path)) {
  console.error(`AndroidManifest.xml not found: ${path}`);
  process.exit(1);
}

let xml = fs.readFileSync(path, 'utf8');
const permissions = [
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION'
];

const manifestMatch = xml.match(/<manifest\b[^>]*>/);
if (!manifestMatch) {
  console.error('Cannot find <manifest> tag in AndroidManifest.xml');
  process.exit(1);
}

const manifestTag = manifestMatch[0];
for (const permission of permissions) {
  const escaped = permission.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hasPermission = new RegExp(`<uses-permission\\s+android:name=["']${escaped}["']\\s*/?>`).test(xml);
  if (!hasPermission) {
    xml = xml.replace(manifestTag, `${manifestTag}\n    <uses-permission android:name="${permission}" />`);
  }
}

fs.writeFileSync(path, xml, 'utf8');

for (const permission of permissions) {
  if (!xml.includes(`android:name="${permission}"`)) {
    console.error(`FAILED to add ${permission}`);
    process.exit(1);
  }
}
console.log('GPS permissions ensured in AndroidManifest.xml.');
