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
    if (url == null || url.isEmpty()) {
      call.reject("URL маршрута не задан");
      return;
    }
    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
    intent.setPackage("com.google.android.apps.maps");
    try {
      getActivity().startActivity(intent);
      call.resolve(new JSObject());
    } catch (ActivityNotFoundException e) {
      // Google Maps is not installed: fall back to the system browser.
      try {
        Intent browser = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        getActivity().startActivity(browser);
        call.resolve(new JSObject());
      } catch (Exception ex) {
        call.reject("Не удалось открыть Google Maps", ex);
      }
    } catch (Exception e) {
      call.reject("Не удалось открыть Google Maps", e);
    }
  }
}
`;
fs.writeFileSync(plugin, pluginSource);

let patched = text;
if (!patched.includes('import ' + pkg + '.MapsLauncherPlugin;')) {
  const idx = patched.indexOf('\n', patched.indexOf('package '));
  patched = patched.slice(0, idx + 1) + '\nimport ' + pkg + '.MapsLauncherPlugin;\n' + patched.slice(idx + 1);
}
if (!patched.includes('registerPlugin(MapsLauncherPlugin.class)')) {
  if (patched.includes('public class MainActivity extends BridgeActivity {')) {
    patched = patched.replace(
      'public class MainActivity extends BridgeActivity {',
      'public class MainActivity extends BridgeActivity {\n  @Override\n  public void onCreate(android.os.Bundle savedInstanceState) {\n    registerPlugin(MapsLauncherPlugin.class);\n    super.onCreate(savedInstanceState);\n  }'
    );
  } else {
    throw new Error('Unexpected MainActivity structure');
  }
}
fs.writeFileSync(main, patched);

// Android 11+ package visibility: declare that the app may interact with Maps.
const manifest = path.join(android, 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifest)) {
  let m = fs.readFileSync(manifest, 'utf8');
  if (!m.includes('com.google.android.apps.maps')) {
    const q = `\n    <queries>\n        <package android:name="com.google.android.apps.maps" />\n    </queries>`;
    m = m.replace(/<manifest([^>]*)>/, `<manifest$1>${q}`);
    fs.writeFileSync(manifest, m);
  }
}
console.log('Maps native bridge installed:', plugin);
