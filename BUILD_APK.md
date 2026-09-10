# Kadastr Route v17 — Android build

1. `npm install`
2. `npx cap add android` (only if `android/` does not exist)
3. `node scripts/patch-android-permissions.js`
4. `npx cap sync android`
5. `cd android && ./gradlew assembleDebug`

v17 explicitly requests Android location permission and includes a native PDF share path using Capacitor Filesystem + Share. The PDF is generated directly with jsPDF and an embedded Noto Sans font, avoiding `pdf.html()`/html2canvas freezes in Android WebView.
