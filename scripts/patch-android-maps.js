const fs = require('fs');
const path = require('path');

const android = path.join(process.cwd(), 'android');
const appJava = path.join(android, 'app', 'src', 'main', 'java');
if (!fs.existsSync(appJava)) throw new Error('Android platform not found');

function findFile(dir, name) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { const hit = findFile(p, name); if (hit) return hit; }
    else if (entry.name === name) return p;
  }
  return null;
}

const main = findFile(appJava, 'MainActivity.java');
if (!main) throw new Error('MainActivity.java not found');
const text = fs.readFileSync(main, 'utf8');
const pkg = (text.match(/^package\s+([\w.]+);/m) || [])[1];
if (!pkg) throw new Error('Cannot determine Android package');

const pluginDir = path.dirname(main);
const backupPlugin = path.join(pluginDir, 'BackupExporterPlugin.java');
const backupSource = `package ${pkg};

import android.content.ContentResolver;
import android.content.ContentValues;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackupExporter")
public class BackupExporterPlugin extends Plugin {
  @PluginMethod
  public void exportJson(PluginCall call) {
    String filename = call.getString("filename", "kadastr-backup.json");
    String content = call.getString("content");
    if (content == null) { call.reject("Данные резервной копии пусты"); return; }
    if (filename == null || filename.isEmpty()) filename = "kadastr-backup.json";
    if (!filename.endsWith(".json")) filename += ".json";
    try {
      ContentResolver resolver = getContext().getContentResolver();
      ContentValues values = new ContentValues();
      values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
      values.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);
      }
      android.net.Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
      if (uri == null) throw new Exception("Не удалось создать файл в Download");
      try (OutputStream out = resolver.openOutputStream(uri)) {
        if (out == null) throw new Exception("Не удалось открыть файл");
        out.write(content.getBytes(StandardCharsets.UTF_8));
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        ContentValues done = new ContentValues(); done.put(MediaStore.MediaColumns.IS_PENDING, 0); resolver.update(uri, done, null, null);
      }
      JSObject result = new JSObject(); result.put("filename", filename); result.put("uri", uri.toString()); call.resolve(result);
    } catch (Exception e) { call.reject("Не удалось сохранить резервную копию", e); }
  }
}
`;
fs.writeFileSync(backupPlugin, backupSource);
const plugin = path.join(pluginDir, 'MapsLauncherPlugin.java');
const pluginSource = `package ${pkg};

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MapsLauncher")
public class MapsLauncherPlugin extends Plugin {
  @PluginMethod
  public void openRoute(PluginCall call) {
    String url = call.getString("url");
    String packageName = call.getString("packageName");
    String fallbackUrl = call.getString("fallbackUrl");
    if (url == null || url.isEmpty()) {
      call.reject("URL маршрута не задан");
      return;
    }
    try {
      Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
      if (packageName != null && !packageName.isEmpty()) intent.setPackage(packageName);
      if (intent.resolveActivity(getActivity().getPackageManager()) == null) {
        throw new ActivityNotFoundException("Приложение навигации не найдено");
      }
      getActivity().startActivity(intent);
      JSObject out = new JSObject();
      out.put("opened", true);
      call.resolve(out);
    } catch (ActivityNotFoundException e) {
      try {
        String fallback = (fallbackUrl != null && !fallbackUrl.isEmpty()) ? fallbackUrl : url;
        Intent browser = new Intent(Intent.ACTION_VIEW, Uri.parse(fallback));
        getActivity().startActivity(browser);
        JSObject out = new JSObject();
        out.put("opened", false);
        out.put("fallback", true);
        call.resolve(out);
      } catch (Exception ex) {
        call.reject("Не удалось открыть приложение навигации", ex);
      }
    } catch (Exception e) {
      call.reject("Не удалось открыть приложение навигации", e);
    }
  }
}
`;
fs.writeFileSync(plugin, pluginSource);

let patched = text;
if (!patched.includes('import ' + pkg + '.MapsLauncherPlugin;')) {
  const idx = patched.indexOf('\n', patched.indexOf('package '));
  patched = patched.slice(0, idx + 1) + '\nimport ' + pkg + '.MapsLauncherPlugin;\nimport ' + pkg + '.BackupExporterPlugin;\n' + patched.slice(idx + 1);
}
if (!patched.includes('import ' + pkg + '.BackupExporterPlugin;')) {
  const idx2 = patched.indexOf('\n', patched.indexOf('package '));
  patched = patched.slice(0, idx2 + 1) + '\nimport ' + pkg + '.BackupExporterPlugin;\n' + patched.slice(idx2 + 1);
}
if (!patched.includes('registerPlugin(MapsLauncherPlugin.class)')) {
  if (patched.includes('public class MainActivity extends BridgeActivity {')) {
    patched = patched.replace(
      'public class MainActivity extends BridgeActivity {',
      'public class MainActivity extends BridgeActivity {\n' +
      '  @Override\n  public void onCreate(android.os.Bundle savedInstanceState) {\n' +
      '    registerPlugin(MapsLauncherPlugin.class);\n    registerPlugin(BackupExporterPlugin.class);\n' +
      '    super.onCreate(savedInstanceState);\n  }'
    );
  } else {
    throw new Error('Unexpected MainActivity structure');
  }
}
fs.writeFileSync(main, patched);

// Android 11+ package visibility: declare that the app may interact with both navigation apps.
const manifest = path.join(android, 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifest)) {
  let m = fs.readFileSync(manifest, 'utf8');
  if (!m.includes('com.google.android.apps.maps') || !m.includes('ru.yandex.yandexnavi')) {
    const packages=[];
    if(!m.includes('com.google.android.apps.maps')) packages.push('        <package android:name="com.google.android.apps.maps" />');
    if(!m.includes('ru.yandex.yandexnavi')) packages.push('        <package android:name="ru.yandex.yandexnavi" />');
    if(m.includes('<queries>')) {
      m=m.replace('</queries>', packages.join('\n')+'\n    </queries>');
    } else {
      const q=`\n    <queries>\n${packages.join('\n')}\n    </queries>`;
      m=m.replace(/<manifest([^>]*)>/, `<manifest$1>${q}`);
    }
    fs.writeFileSync(manifest,m);
  }
}
console.log('Maps native bridge installed:', plugin);
