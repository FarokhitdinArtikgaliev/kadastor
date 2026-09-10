/* Kadastr Route v13 — Working day, GPS mileage, branch cards, visit/photo reports, analytics and PDF */
(function(){
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmtMoney=n=>`${Math.round(Number(n)||0).toLocaleString('ru-RU')} сум`;
  const fmtDate=d=>new Date(d).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const todayKey=()=>new Date().toISOString().slice(0,10);
  const getVisits=()=>JSON.parse(localStorage.getItem('kadastr-visits-v13')||'[]');
  const saveVisits=v=>localStorage.setItem('kadastr-visits-v13',JSON.stringify(v.slice(0,500)));
  const getActive=()=>JSON.parse(localStorage.getItem('kadastr-active-day-v13')||'null');
  const saveActive=v=>v?localStorage.setItem('kadastr-active-day-v13',JSON.stringify(v)):localStorage.removeItem('kadastr-active-day-v13');
  const getTripHistory=()=>JSON.parse(localStorage.getItem('kadastr-real-trips-v13')||'[]');
  // Full staff directory from the user's branch tables/screenshots.
  const staffNames={
    "Андижон шаҳар":"Мамасиоров Сардорбек Араббоевич","Хонобод шаҳар":"Ниязбеков Миркомил Абдуллаевич","Олтинкўл тумани":"Хакимов Хаётулло Абдулла ўғли","Балиқчи тумани":"Алимов Дилшод Алиевич","Бўстон тумани":"Исмоилжонов Абробек Икромжон ўғли","Булоқбоши тумани":"Равшанбеков Саидакабар Мансуров ўғли","Жалақудуқ тумани":"Бахтиёр Комолдин Саидмуродилович","Избоскан тумани":"Абдурасулов Аббосбек Абдуманнон ўғли","Улуғнор тумани":"Шарифуллохон Хаётбек Шавкатбек ўғли","Қўрғонтепа тумани":"Каримов Умиджон Джорабаевич","Асака тумани":"Махамаджонов Фаррухбек Абдуллаев ўғли","Марҳамат тумани":"Шерқулов Сардорбек Миродилович","Шаҳрихон тумани":"Хусанов Абдуллахат Абдусамад ўғли","Пахтаобод тумани":"Султонов Мухаммад Арипсланович","Хўжаобод тумани":"Холматов Шахбоз Орифжон ўғли","Андижон тумани":"Ахмедов Мансурбек Махмуджонович",
    "Наманган шаҳар":"Абдуллажанов Азизбек Абаз ўғли","Мингбулоқ тумани":"Собиржонов Улуғбек Содиқжон ўғли","Косонсой тумани":"Хикматов Мавр Абдурасулович","Наманган тумани":"Усманов Мухаммадамин Абдурахим ўғли","Норин тумани":"Бойисбеков Тўланбой Мамуржон ўғли","Поп тумани":"Озатов Абдугани Фарходжон ўғли","Тўрақўрғон тумани":"Тожибоев Мухторжон Валижон ўғли","Уйчи тумани":"Шокиров Хасан Исмоил ўғли","Учқўрғон тумани":"Кодиров Ойбек Зокиржонович","Чортоқ тумани":"Мамажанов Мирзаолим Камолиддинович","Чуст тумани":"Каримов Хуршидбек Мухаммаджонович","Янгиқўрғон тумани":"Хасанов Дониёр Исмоилович",
    "Қувасой шаҳар":"Абдусаторов Абдулвосид Абдусонович","Қўқон шаҳар":"Эркабаев Баркамол Мухтарович","Марғилон шаҳар":"Фозилов Зохиджон Кобилжон ўғли","Фарғона шаҳар":"Абдуалиев Умид Абдумуталибович","Бешариқ тумани":"Раимов Баходиржон Фурмонович","Бағдод тумани":"Юлдашов Нодирбек Мирзарахимович","Бувайда тумани":"Жумақулов Умиджон Абдумалик ўғли","Данғара тумани":"Яхёев Мусохон Зухриддинович","Ёзёвон тумани":"Шербаев Хаётжон Икромович","Қува тумани":"Умаров Азъамжон Ахдамович","Олтиариқ тумани":"Абдурашидов Хусниддин Абдували ўғли","Қўштепа тумани":"Машрапов Мухаммадзохид Абдусаломович","Риштон тумани":"Махмудов Абдурахмон Абдурахманович","Сўх тумани":"Вохидов Рустамжон Бобоевич","Тошлоқ тумани":"Абдуллаев Азизбек Латифжон ўғли","Ўзбекистон тумани":"Курбонов Сарвар Шахобиддинович","Учкўприк тумани":"Машраббоев Хуршид Абдуманнон ўғли","Фарғона тумани":"Абдусаломов Фаррух Гуломжон ўғли","Фурқат тумани":"Тўхтасинов Шохбос Ишонович"
  };
  const staffJobs=Object.fromEntries(Object.keys(staffNames).map(k=>[k,k==="Андижон тумани"||k==="Қўқон шаҳар"?"Филиал бошлиғи":"Бош муҳандис"]));
  const headNames={
    "Андижон шаҳар":"Вакант","Хонобод шаҳар":"Юлдашев Шерзод Марифжонович","Олтинкўл тумани":"Азимов Хакимжон Олимович","Балиқчи тумани":"Мадаминов Абдулазиз Абдуасрор ўғли","Бўстон тумани":"Рахматалиев Ахмаджон Нуроджон ўғли","Булоқбоши тумани":"Мирзарахимов Мухиддинжон Шамсиддинович","Жалақудуқ тумани":"Жураев Исомиддин Ёкубжон ўғли","Избоскан тумани":"Мирзасимов Фарходжон Бохадирович","Улуғнор тумани":"Гуломов Дилшодбек Дилмурод ўғли","Қўрғонтепа тумани":"Абдурахмонов Камолиддин Мухиддинович","Асака тумани":"Шеров Илхомжон Мукимович","Марҳамат тумани":"Хамракулов Отабек Олимжонович","Шаҳрихон тумани":"Вакант","Пахтаобод тумани":"Вакант","Хўжаобод тумани":"Абдупаттаев Ахрорбек Гуломжонович","Андижон тумани":"Ахмедов Мансурбек Махмуджонович",
    "Наманган шаҳар":"Турғунов Акрамжон Қудратилло ўғли","Мингбулоқ тумани":"Нурматов Илёсбек Собитали ўғли","Косонсой тумани":"Вакант","Наманган тумани":"Мамажанов Абдукодир Исакжон ўғли","Норин тумани":"Ахмедов Хурсандали Набижонович","Поп тумани":"Охунов Фарходжон Абазович","Тўрақўрғон тумани":"Ахмаджонов Фуркатжон Шухратжон ўғли","Уйчи тумани":"Раззаков Носир Абдурахмонович","Учқўрғон тумани":"Муродуллаев Абдулло Убайдулла ўғли","Чортоқ тумани":"Адашев Жасурбек Хошимжонович","Чуст тумани":"Вакант","Янгиқўрғон тумани":"Бозоров Мирзоҳил Исмоилжонович",
    "Қувасой шаҳар":"Базарбаев Бахтиёр Хатамжонович","Қўқон шаҳар":"Эркабаев Баркамол Мухтарович","Марғилон шаҳар":"Ибрагимов Алишер Шухратжонович","Фарғона шаҳар":"Эминов Фаррух Тожиржонович","Бешариқ тумани":"Хошимов Ботирали Боймуродович","Бағдод тумани":"Эшончулов Улуғбек Жумабоевич","Бувайда тумани":"Исмоилов Мухаммад Соҳибжон ўғли","Данғара тумани":"Исмаилбаев Максуджон Муродилович","Ёзёвон тумани":"Рахимов Дилмурод Эркинович","Қува тумани":"Умаров Азъамжон Ахдамович","Олтиариқ тумани":"Хошимов Хаётжон Ахдамжон ўғли","Қўштепа тумани":"Абдулхожиев Улуғбек Абдувалиевич","Риштон тумани":"Дадажонов Бахтиёр Кахрамонович","Сўх тумани":"Шойилдов Фаридун Мамазоизода","Тошлоқ тумани":"Каримов Мухаммадюб Бахтиёр ўғли","Ўзбекистон тумани":"Бахритдинов Муроджон Мирсабирович","Учкўприк тумани":"Содиқов Ўткиржон Ўринбаевич","Фарғона тумани":"Отажонов Носиржон Расулович","Фурқат тумани":"Жалолиддинов Асроржон Тоштемирович"
  };
  const headJobs=Object.fromEntries(Object.keys(headNames).map(k=>[k,"Филиал бошлиғи"]));

  const saveTripHistory=v=>localStorage.setItem('kadastr-real-trips-v13',JSON.stringify(v.slice(0,300)));
  const distance=(a,b)=>{const R=6371,dLat=(b.lat-a.lat)*Math.PI/180,dLon=(b.lon-a.lon)*Math.PI/180,la1=a.lat*Math.PI/180,la2=b.lat*Math.PI/180;const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h));};
  const currentSettings=()=>typeof settings==='function'?settings():({price:Number(localStorage.getItem('fuel-price')||8500),consumption:Number(localStorage.getItem('fuel-consumption')||7),rate:Number(localStorage.getItem('compensation-rate')||1000)});
  function costs(km){const s=currentSettings(),lit=km*s.consumption/100,fuel=lit*s.price,comp=km*s.rate;return {lit,fuel,comp,net:comp-fuel};}
  function activeStopKeys(){const a=getActive();return a?.stops||[];}
  function stopInfo(key){const [rid,idx]=String(key).split(':').map(Number);const r=routes.find(x=>x.id===rid);return r&&r.stops[idx]?{key,route:r,stop:r.stops[idx],index:idx}:null;}

  // Add UI.
  const main=document.querySelector('main');
  const hero=document.querySelector('.hero-card');
  const section=document.createElement('section');
  section.className='workday-card'; section.id='workday';
  section.innerHTML=`<div class="workday-head"><div><p class="eyebrow">GPS · посещения · расходы</p><h2>Мой рабочий день</h2><p id="dayStatus" class="muted">День не начат</p></div><span id="gpsBadge" class="gps-badge">GPS OFF</span></div>
  <div id="workdayKpis" class="workday-kpis"></div>
  <div class="workday-actions"><button class="primary-button" id="startDayBtn">▶ Начать рабочий день</button><button class="secondary-button" id="visitBtn">✓ Отчёт после посещения</button></div>
  <div id="activeTripBox"></div>
  <div class="quick-reports"><button class="report-chip" data-report="day">Сегодня</button><button class="report-chip" data-report="week">Неделя</button><button class="report-chip" data-report="month">Месяц</button><button class="report-chip report-pdf" id="pdfReportBtn">📄 PDF</button></div></section>`;
  main.insertBefore(section, hero.nextSibling);
  const nav=document.querySelector('.bottom-nav');
  const n=document.createElement('button');n.className='nav-item';n.dataset.tab='workday';n.type='button';n.innerHTML='<span>◉</span><small>Рабочий день</small>';
  nav.insertBefore(n,nav.children[1]);

  // Branch card replaces the old route details with richer information.
  const oldOpenDay=window.openDay;
  function openBranchCard(id){
    const r=routes.find(x=>x.id===id); if(!r) return;
    const html=r.stops.map((s,i)=>{const p=stopCoords[s], ph=branchPhones[s], sp=staffPhones[s], sn=staffNames[s], hn=headNames[s], sj=staffJobs[s], hj=headJobs[s];
      return `<article class="branch-card-v13"><div><p class="eyebrow">Точка ${i+1} · ${r.region}</p><h3>${esc(s)}</h3><p class="branch-address">📍 ${p?`${p[0].toFixed(6)}, ${p[1].toFixed(6)}`:'координата не указана'}</p>
      <div class="person-card"><div class="person-icon">👨‍🔧</div><div><strong>${esc(sn||'Сотрудник не указан')}</strong><small>${esc(sj||'Ответственный сотрудник')}</small>${sp?`<span>📞 ${esc(sp)}</span>`:''}</div></div>
      <div class="person-card"><div class="person-icon">👔</div><div><strong>${esc(hn||'Не указан / вакант')}</strong><small>${esc(hj||'Филиал бошлиғи')}</small>${ph?`<span>📞 ${esc(ph)}</span>`:''}</div></div></div>
      <div class="branch-buttons">${sp?`<a href="tel:${sp.replace(/[^0-9+]/g,'')}">📞 Сотрудник</a>`:''}${ph?`<a href="tel:${ph.replace(/[^0-9+]/g,'')}">📞 Руководитель</a>`:''}${p?`<a target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${p[0]},${p[1]}">🗺 Навигация</a>`:''}<button data-v13-visit="${r.id}:${i}">✓ Посетить</button></div></article>`;
    }).join('');
    modal(`<h2>${esc(r.title)}</h2><p class="muted">${r.stops.length} точки · план ${r.km} км · ${r.workload.toLocaleString('ru-RU')} заявлений</p><div class="branch-stack">${html}</div><div class="modal-actions"><button class="cancel" data-close>Закрыть</button></div>`);
  };

  function activeRoute(){const a=getActive();return a?.routeId?routes.find(r=>r.id===a.routeId):routes.find(r=>r.id===state.today)||routes[0];}
  function renderWorkday(){
    const a=getActive(),vis=getVisits().filter(v=>v.date?.slice(0,10)===todayKey()),tr=getTripHistory().filter(t=>t.date?.slice(0,10)===todayKey());
    const km=tr.reduce((x,t)=>x+Number(t.km||0),0), c=costs(km);
    $('#workdayKpis').innerHTML=`<div><b>${vis.length}</b><small>посещений</small></div><div><b>${km.toFixed(1)} км</b><small>факт. пробег</small></div><div><b>${c.lit.toFixed(1)} л</b><small>топливо</small></div><div><b>${fmtMoney(c.fuel)}</b><small>топливо, расход</small></div><div><b>${fmtMoney(c.comp)}</b><small>компенсация</small></div><div><b>${fmtMoney(c.net)}</b><small>чистый остаток</small></div>`;
    $('#dayStatus').textContent=a?.startedAt?`Начат ${fmtDate(a.startedAt)} · ${a.routeTitle||'рабочий день'}`:'День не начат';
    $('#gpsBadge').textContent=a?.watching?'GPS ON':(a?.startedAt?'GPS PAUSE':'GPS OFF');
    $('#startDayBtn').textContent=a?.watching?'⏸ Пауза GPS':(a?.startedAt?'▶ Продолжить GPS':'▶ Начать рабочий день');
    $('#startDayBtn').classList.toggle('is-pause',!!a?.watching);
    $('#activeTripBox').innerHTML=a?.startedAt?`<div class="active-trip"><div><b>🚗 Текущая поездка</b><p>${(a.km||0).toFixed(2)} км · GPS ${a.last?.lat?.toFixed(5)||'—'}, ${a.last?.lon?.toFixed(5)||'—'}</p></div><button class="danger-button" id="finishDayBtn">■ Завершить и сохранить</button></div>`:`<div class="day-hint">Выбери «Начать рабочий день», разреши GPS и приложение начнёт считать фактический пробег по координатам.</div>`;
  }
  let watchId=null;
  // Native GPS for Android via @capacitor/geolocation, with browser fallback for web.
  let nativeWatchId=null;
  async function getGeoPlugin(){return window.Capacitor?.Plugins?.Geolocation||null;}
  async function ensureLocationPermission(){const geo=await getGeoPlugin();if(!geo)return null;try{const p=await geo.checkPermissions();if(p.location==='granted'||p.location==='limited')return geo;const r=await geo.requestPermissions();if(r.location==='granted'||r.location==='limited')return geo;throw new Error('LOCATION_DENIED');}catch(e){throw e;}}
  async function beginWatch(){const a=getActive();if(!a){return;} if(watchId!==null||nativeWatchId!==null)return;
    try{const geo=await ensureLocationPermission();
      if(geo){a.watching=true;saveActive(a);renderWorkday();nativeWatchId=await geo.watchPosition({enableHighAccuracy:true,timeout:15000,maximumAge:3000},(pos,err)=>{if(err){const x=getActive();if(x){x.watching=false;saveActive(x);renderWorkday();}alert('Не удалось получить GPS. Проверь разрешение геолокации.');return;} if(!pos)return;const now={lat:pos.coords.latitude,lon:pos.coords.longitude,accuracy:pos.coords.accuracy,time:Date.now()};const x=getActive();if(!x)return;if(x.last){const d=distance(x.last,now);if(d>=0.005&&d<2)x.km=(x.km||0)+d;}x.last=now;x.samples=(x.samples||0)+1;saveActive(x);renderWorkday();});return;}
      if(!navigator.geolocation)throw new Error('NO_GPS');
      a.watching=true;saveActive(a);renderWorkday();watchId=navigator.geolocation.watchPosition(pos=>{const now={lat:pos.coords.latitude,lon:pos.coords.longitude,accuracy:pos.coords.accuracy,time:Date.now()};const x=getActive();if(!x)return;if(x.last){const d=distance(x.last,now);if(d>=0.005&&d<2)x.km=(x.km||0)+d;}x.last=now;x.samples=(x.samples||0)+1;saveActive(x);renderWorkday();},()=>{const x=getActive();if(x){x.watching=false;saveActive(x);renderWorkday();}alert('Не удалось получить GPS. Проверь разрешение геолокации.');},{enableHighAccuracy:true,maximumAge:5000,timeout:15000});
    }catch(e){const x=getActive();if(x){x.watching=false;saveActive(x);renderWorkday();}alert(e?.message==='LOCATION_DENIED'?'Доступ к геолокации запрещён. Разреши доступ в настройках Android.':'Не удалось получить GPS. Проверь разрешение геолокации.');}
  }
  async function stopWatch(){if(nativeWatchId!==null){try{const geo=await getGeoPlugin();if(geo)await geo.clearWatch({id:nativeWatchId});}catch(e){}nativeWatchId=null;}if(watchId!==null&&navigator.geolocation){navigator.geolocation.clearWatch(watchId);watchId=null;}const a=getActive();if(a){a.watching=false;saveActive(a);}renderWorkday();}
  function startDay(){let a=getActive();if(a?.startedAt){if(a.watching)stopWatch();else beginWatch();return;}const r=activeRoute();a={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),startedAt:new Date().toISOString(),routeId:r.id,routeTitle:r.title,stops:[],km:0,samples:0,last:null,watching:false};saveActive(a);beginWatch();}
  function finishDay(){const a=getActive();if(!a)return;stopWatch();const km=Number(a.km||0);if(km<0.01){if(!confirm('GPS не зафиксировал заметный пробег. Всё равно сохранить поездку?'))return;}const c=costs(km),x=getTripHistory();x.unshift({...a,finishedAt:new Date().toISOString(),date:new Date().toISOString(),fuelLiters:c.lit,fuelCost:c.fuel,compensation:c.comp,net:c.net});saveTripHistory(x);saveActive(null);renderWorkday();if(typeof renderStats==='function')renderStats();alert(`Поездка сохранена: ${km.toFixed(1)} км\nКомпенсация: ${fmtMoney(c.comp)}\nТопливо: ${fmtMoney(c.fuel)}\nЧистыми: ${fmtMoney(c.net)}`);}

  function openVisit(key){
    const info=key?stopInfo(key):null,r=info?.route||activeRoute();
    const opts=allStops().map(x=>`<option value="${x.key}" ${info?.key===x.key?'selected':''}>${esc(x.stop)} · ${esc(x.region)}</option>`).join('');
    modal(`<h2>Отчёт после посещения</h2><form id="visitFormV13" class="form-grid"><label>Филиал / точка<select name="key">${opts}</select></label><label>Статус<select name="status"><option>Выполнено</option><option>Частично выполнено</option><option>Нужно повторно</option><option>Проблема / требуется ремонт</option></select></label><label>Что сделано<textarea name="notes" required placeholder="Опиши результат визита"></textarea></label><label>Фотоотчёт <input name="photos" id="visitPhotos" type="file" accept="image/*" capture="environment" multiple><small class="muted">Можно выбрать несколько фото. Они будут сжаты и сохранены в журнале.</small></label><div id="photoPreviewV13" class="photo-preview"></div><div class="modal-actions"><button class="cancel" data-close type="button">Отмена</button><button class="save">Сохранить посещение</button></div></form>`);
  }
  async function filesToData(files){const out=[];for(const f of [...files].slice(0,6)){const url=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)});const img=await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=url});const scale=Math.min(1,1280/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);out.push(c.toDataURL('image/jpeg',.72));}return out;}
  function reportItems(period){const now=new Date();let start=new Date(now);if(period==='day')start.setHours(0,0,0,0);if(period==='week'){const day=(now.getDay()+6)%7;start.setDate(now.getDate()-day);start.setHours(0,0,0,0);}if(period==='month')start=new Date(now.getFullYear(),now.getMonth(),1);const visits=getVisits().filter(v=>new Date(v.date)>=start);const trips=getTripHistory().filter(t=>new Date(t.date)>=start);const km=trips.reduce((a,t)=>a+Number(t.km||0),0),c=costs(km),refs=(()=>{try{return JSON.parse(localStorage.getItem('kadastr-refuels-v15')||'[]')}catch{return []}})().filter(v=>new Date(v.date)>=start),expenses=(()=>{try{return JSON.parse(localStorage.getItem('kadastr-expenses-v15')||'[]')}catch{return []}})().filter(v=>new Date(v.date)>=start),odo=(()=>{try{return JSON.parse(localStorage.getItem('kadastr-odometer-v15')||'null')}catch{return null}})();return {period,start,visits,trips,km,c,refs,expenses,odo};}
  function reportTitle(p){return p==='day'?'Сегодня':p==='week'?'Текущая неделя':'Текущий месяц';}
  function openReport(period='day'){
    const x=reportItems(period);const grouped=x.visits.reduce((a,v)=>(a[v.branch]=(a[v.branch]||0)+1,a),{});const rows=Object.entries(grouped).map(([k,n])=>`<div class="report-row"><b>${esc(k)}</b><span>${n} посещ.</span></div>`).join('');
    modal(`<h2>📊 ${reportTitle(period)}</h2><div class="report-grid"><div><b>${x.visits.length}</b><small>посещений</small></div><div><b>${x.trips.length}</b><small>GPS поездок</small></div><div><b>${x.km.toFixed(1)} км</b><small>факт. пробег</small></div><div><b>${x.c.lit.toFixed(1)} л</b><small>топливо</small></div><div><b>${fmtMoney(x.c.fuel)}</b><small>затраты</small></div><div><b>${fmtMoney(x.c.comp)}</b><small>компенсация</small></div><div><b>${fmtMoney(x.c.net)}</b><small>чистыми</small></div></div><h3 class="subheading">Посещения</h3><div class="report-list">${rows||'<p class="empty">Нет посещений за период.</p>'}</div><div class="modal-actions report-actions"><button class="cancel" data-close>Закрыть</button><button class="save" id="pdfReportModal" data-period="${period}">📄 Сохранить PDF</button><button class="share-button" id="sharePdfModal" data-period="${period}">📤 Передать PDF</button></div>`);
  }
  function buildReportHtml(period){const x=reportItems(period),s=currentSettings();const visitRows=x.visits.map((v,i)=>`<tr><td>${i+1}</td><td>${esc(v.branch)}</td><td>${esc(staffNames[v.branch]||'—')}</td><td>${esc(headNames[v.branch]||'—')}</td><td>${esc(v.status)}</td><td>${esc(v.notes)}</td><td>${v.photos?.length?`${v.photos.length} фото`:''}</td><td>${fmtDate(v.date)}</td></tr>`).join('');return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Kadastr Route — ${reportTitle(period)}</title><style>body{font-family:Arial,sans-serif;color:#16231e;margin:30px}h1{margin-bottom:4px}h2{margin-top:28px}.meta{color:#68756f}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.box{border:1px solid #ddd;border-radius:10px;padding:12px}.box b{display:block;font-size:18px;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #ddd;padding:7px;text-align:left;vertical-align:top}th{background:#f1f5f3}.footer{margin-top:30px;font-size:12px;color:#68756f}</style></head><body><h1>Кадастр Маршрут — ${reportTitle(period)}</h1><p class="meta">Сформировано: ${fmtDate(new Date())}</p><div class="grid"><div class="box"><b>${x.visits.length}</b>посещений</div><div class="box"><b>${x.trips.length}</b>GPS поездок</div><div class="box"><b>${x.km.toFixed(1)} км</b>фактический пробег</div><div class="box"><b>${x.c.lit.toFixed(1)} л</b>топливо</div><div class="box"><b>${fmtMoney(x.c.fuel)}</b>расход на топливо</div><div class="box"><b>${fmtMoney(x.c.comp)}</b>компенсация</div><div class="box"><b>${fmtMoney(x.c.net)}</b>чистый остаток</div><div class="box"><b>${s.rate.toLocaleString('ru-RU')} сум/км</b>тариф</div><div class="box"><b>${x.odo?.start!=null&&x.odo?.end!=null?(Number(x.odo.end)-Number(x.odo.start)).toFixed(1)+' км':'—'}</b>одометр</div><div class="box"><b>${fmtMoney(x.refs.reduce((a,r)=>a+Number(r.total||0),0))}</b>фактические заправки</div><div class="box"><b>${fmtMoney(x.expenses.reduce((a,e)=>a+Number(e.amount||0),0))}</b>прочие расходы</div></div><h2>Отчёт по посещениям</h2><table><thead><tr><th>#</th><th>Филиал</th><th>Ответственный</th><th>Руководитель</th><th>Статус</th><th>Результат</th><th>Фото</th><th>Дата/время</th></tr></thead><tbody>${visitRows||'<tr><td colspan="8">Нет данных</td></tr>'}</tbody></table><h2>Фотоотчёт</h2>${x.visits.filter(v=>v.photos?.length).map(v=>`<div style=\"margin:8px 0 14px\"><b>${esc(v.branch)}</b><div>${v.photos.map(ph=>`<img src=\"${ph}\" style=\"width:90px;height:70px;object-fit:cover;margin:5px;border:1px solid #ddd\">`).join('')}</div></div>`).join('')||'<p>Фотоотчётов нет.</p>'}<h2>Поездки</h2><table><thead><tr><th>Дата</th><th>Км</th><th>Топливо</th><th>Компенсация</th><th>Чистыми</th></tr></thead><tbody>${x.trips.map(t=>`<tr><td>${fmtDate(t.date)}</td><td>${Number(t.km||0).toFixed(1)}</td><td>${fmtMoney(t.fuelCost)}</td><td>${fmtMoney(t.compensation)}</td><td>${fmtMoney(t.net)}</td></tr>`).join('')||'<tr><td colspan="5">Нет GPS поездок</td></tr>'}</tbody></table><h2>Заправки</h2>${x.refs.map(r=>`<p>${fmtDate(r.date)} — ${esc(r.fuel)} — ${Number(r.liters||0).toFixed(1)} л — ${fmtMoney(r.total)}</p>`).join('')||'<p>Заправок за период нет.</p>'}<h2>Прочие расходы</h2>${x.expenses.map(r=>`<p>${fmtDate(r.date)} — ${esc(r.title)} — ${fmtMoney(r.amount)}</p>`).join('')||'<p>Прочих расходов за период нет.</p>'}<p class="footer">Расчёт: топливо по GPS = км × расход / 100 × цена; компенсация = км × тариф. Показания одометра и фактические заправки сохраняются отдельно.</p></body></html>`;}
  async function makePdfBlob(period='day'){
    const html=buildReportHtml(period);
    if(!window.jspdf?.jsPDF) return null;
    const pdf=new jspdf.jsPDF('p','mm','a4');
    const container=document.createElement('div');
    container.style.cssText='position:fixed;left:-10000px;top:0;width:180mm;background:white;padding:8mm;font-family:Arial;font-size:10px;line-height:1.35';
    container.innerHTML=html.replace(/^[\s\S]*?<body>/,'').replace(/<\/body>[\s\S]*$/,'');
    document.body.appendChild(container);
    try{await pdf.html(container,{margin:[10,10,10,10],autoPaging:'text',html2canvas:{scale:1}});return pdf.output('blob');}
    finally{document.body.removeChild(container);}
  }
  async function createPdf(period='day',share=false){
    const blob=await makePdfBlob(period);
    const filename=`kadastr-report-${period}-${todayKey()}.pdf`;
    if(blob){
      if(share && navigator.share){
        try{const file=new File([blob],filename,{type:'application/pdf'});if(!navigator.canShare||navigator.canShare({files:[file]})){await navigator.share({title:`Kadastr Route — ${reportTitle(period)}`,text:'Отчёт по посещениям, пробегу, топливу и компенсации',files:[file]});return true;}}catch(e){if(e?.name==='AbortError')return false;}
      }
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);return true;
    }
    const w=window.open('','_blank');if(!w){alert('Разреши открытие нового окна для PDF.');return false;}w.document.write(buildReportHtml(period).replace('</body>','<script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body>'));w.document.close();return true;
  }

  // Event handlers use a namespace so they coexist with the original app.
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.openDay)openBranchCard(Number(b.dataset.openDay));
    if(b.id==='startDayBtn')startDay();
    if(b.id==='finishDayBtn')finishDay();
    if(b.id==='visitBtn')openVisit();
    if(b.dataset.v13Visit)openVisit(b.dataset.v13Visit);
    if(b.dataset.report)openReport(b.dataset.report);
    if(b.id==='pdfReportBtn')createPdf('month');
    if(b.id==='pdfReportModal')createPdf(b.dataset.period||'day');
    if(b.id==='sharePdfModal')createPdf(b.dataset.period||'day',true);
    if(b.dataset.tab==='workday')setTimeout(renderWorkday,30);
  });
  document.addEventListener('change',async e=>{
    if(e.target.id==='visitPhotos'){const p=$('#photoPreviewV13');p.innerHTML='';try{const imgs=await filesToData(e.target.files||[]);p.dataset.photos=JSON.stringify(imgs);p.innerHTML=imgs.map(x=>`<img src="${x}">`).join('');}catch(err){alert('Не удалось обработать фото.');}}
  });
  document.addEventListener('submit',e=>{
    if(e.target.id!=='visitFormV13')return;e.preventDefault();
    const f=new FormData(e.target),key=String(f.get('key')),info=stopInfo(key),notes=String(f.get('notes')||'').trim(),status=String(f.get('status')||'Выполнено');if(!info||!notes)return;
    const photos=JSON.parse($('#photoPreviewV13')?.dataset.photos||'[]');const v={id:Date.now(),date:new Date().toISOString(),key,branch:info.stop,route:info.route.title,status,notes,photos};const vs=getVisits();vs.unshift(v);saveVisits(vs);
    if(status==='Выполнено'){let d=getDoneStops();if(!d.includes(key)){d.push(key);setDoneStops(d);}renderToday();renderPlanner();renderStats();}
    document.querySelector('#modal').close();renderWorkday();renderVisitLog();alert(`Посещение сохранено: ${info.stop}`);
  });

  function renderVisitLog(){const el=$('#v13VisitLog');if(!el)return;const vs=getVisits().slice(0,12);el.innerHTML=vs.length?vs.map(v=>`<article class="log-item"><strong>${esc(v.branch)} · ${esc(v.status)}</strong><p>${esc(v.notes)}</p><small>${fmtDate(v.date)}${v.photos?.length?` · 📷 ${v.photos.length}`:''}</small></article>`).join(''):'<p class="empty">История посещений пока пустая.</p>';}
  window.openDay=openBranchCard;
  // Add report history inside workday panel.
  section.insertAdjacentHTML('beforeend','<h3 class="subheading">Последние посещения</h3><div id="v13VisitLog" class="log-list"></div>');
  renderWorkday();renderVisitLog();
  // Restore active GPS watch after app reload.
  const restored=getActive();if(restored?.watching){restored.watching=false;saveActive(restored);setTimeout(beginWatch,300);}
  // Extend backup to include v13 data by intercepting the existing exporter if possible.
  const oldExport=window.exportBackup;window.exportBackup=function(){const data={version:3,exportedAt:new Date().toISOString(),done:getDone(),doneStops:getDoneStops(),logs:getLogs(),trips:trips(),settings:settings(),visits:getVisits(),realTrips:getTripHistory()};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`kadastr-backup-${todayKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
  // Add a dedicated reports row in Tools.
  const tools=document.querySelector('#tools');if(tools){const art=document.createElement('article');art.className='tool-row';art.innerHTML='<div><h3>📄 Отчёты</h3><p>День, неделя, месяц и PDF по посещениям, GPS-пробегу, топливу и компенсации.</p></div><button class="text-button" id="reportsButton" type="button">Открыть</button>';tools.insertBefore(art,tools.firstElementChild);}
  document.addEventListener('click',e=>{const b=e.target.closest('#reportsButton');if(b)openReport('month');});
  // Public helpers for UI/testing.
  window.kadastrV13={openVisit,openReport,createPdf,renderWorkday,finishDay};
})();
