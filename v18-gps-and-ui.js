/* v18 — robust native GPS registration + main-screen smart selection */
(function(){
  'use strict';
  const $=s=>document.querySelector(s);
  function nativeGeo(){
    try{
      if(window.Capacitor?.registerPlugin) return window.__kadastrGeo||(window.__kadastrGeo=window.Capacitor.registerPlugin('Geolocation'));
      return window.Capacitor?.Plugins?.Geolocation||null;
    }catch(e){ return window.Capacitor?.Plugins?.Geolocation||null; }
  }
  async function askGPS(){
    const geo=nativeGeo();
    if(!geo){ alert('Нативный модуль GPS не найден. Установи новую сборку APK.'); return false; }
    try{
      let p=await geo.checkPermissions();
      if(p.location==='granted'||p.location==='limited') return true;
      p=await geo.requestPermissions({permissions:['location']});
      if(p.location==='granted'||p.location==='limited'){ alert('✅ Доступ к GPS разрешён.'); return true; }
      alert('⚠️ Android не дал доступ к геолокации. Открой: Настройки → Приложения → Кадастр Маршрут → Разрешения → Местоположение → Разрешить.');
      return false;
    }catch(e){
      const msg=String(e?.message||e||'');
      if(/denied|permission/i.test(msg)) alert('⚠️ Доступ к GPS запрещён. Открой настройки приложения и разреши «Местоположение».');
      else alert('Не удалось запросить GPS-разрешение. Проверь, что геолокация включена в Android, затем разреши «Местоположение» для приложения.');
      return false;
    }
  }
  async function getPosition(){
    const geo=nativeGeo();
    if(geo){
      try{ return await geo.getCurrentPosition({enableHighAccuracy:true,timeout:15000,maximumAge:3000}); }
      catch(e){}
    }
    if(navigator.geolocation){
      return await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:3000}));
    }
    throw new Error('NO_GPS');
  }
  function patchLocate(){
    const b=document.querySelector('[data-action="locate"],#locateButton');
    if(b&&!b.dataset.gpsPatched){b.dataset.gpsPatched='1';b.addEventListener('click',async e=>{e.preventDefault();try{const ok=await askGPS();if(!ok)return;const p=await getPosition();const el=$('#locationStatus');if(el)el.textContent=`GPS: ${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)} (±${Math.round(p.coords.accuracy||0)} м)`;}catch(e){const el=$('#locationStatus');if(el)el.textContent='Не удалось получить координаты. Включи GPS и разреши местоположение.';}});}
  }
  function patchStart(){
    const b=$('#startDayBtn');
    if(!b||b.dataset.gpsPatched18)return;
    b.dataset.gpsPatched18='1';
    b.addEventListener('click',async e=>{ if(!b.textContent.includes('Начать')) return; e.preventDefault(); e.stopImmediatePropagation(); const ok=await askGPS(); if(ok && window.kadastrV13?.startDay) window.kadastrV13.startDay(); },true);
  }
  window.kadastrGPSv18={nativeGeo,askGPS,getPosition};
  const mo=new MutationObserver(()=>{patchLocate();patchStart();});mo.observe(document.body,{childList:true,subtree:true});setTimeout(()=>{patchLocate();patchStart();},200);
})();
