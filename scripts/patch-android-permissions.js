const fs=require('fs');
const path='android/app/src/main/AndroidManifest.xml';
if(!fs.existsSync(path)){console.log('AndroidManifest.xml not found; run npx cap add android first.');process.exit(0)}
let s=fs.readFileSync(path,'utf8');
const perms=['android.permission.ACCESS_COARSE_LOCATION','android.permission.ACCESS_FINE_LOCATION'];
for(const p of perms){const tag=`<uses-permission android:name="${p}" />`;if(!s.includes(tag))s=s.replace(/<manifest[^>]*>/,m=>m+'\n    '+tag);}
fs.writeFileSync(path,s);console.log('GPS permissions ensured.');
