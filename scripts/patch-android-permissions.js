const fs=require('fs');const path=require('path');
const p=path.join(process.cwd(),'android','app','src','main','AndroidManifest.xml');
if(!fs.existsSync(p)){console.log('Manifest not found:',p);process.exit(0)}
let s=fs.readFileSync(p,'utf8');
for(const perm of ['android.permission.ACCESS_COARSE_LOCATION','android.permission.ACCESS_FINE_LOCATION']){if(!s.includes(perm))s=s.replace(/<manifest[^>]*>/,m=>m+`\n    <uses-permission android:name="${perm}" />`)}
fs.writeFileSync(p,s);console.log('GPS permissions ensured in',p);
