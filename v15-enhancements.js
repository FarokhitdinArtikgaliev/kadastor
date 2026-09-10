/* Kadastr Route v15 — odometer, finance, refuels, work templates, backup and geo-smart planner */
(function(){
  const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const money=n=>`${Math.round(Number(n)||0).toLocaleString('ru-RU')} сум`;
  const dateKey=()=>new Date().toISOString().slice(0,10);
  const getJSON=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}};
  const setJSON=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const getRefuels=()=>getJSON('kadastr-refuels-v15',[]);
  const saveRefuels=x=>setJSON('kadastr-refuels-v15',x.slice(0,500));
  const getExpenses=()=>getJSON('kadastr-expenses-v15',[]);
  const saveExpenses=x=>setJSON('kadastr-expenses-v15',x.slice(0,500));
  const getOdo=()=>getJSON('kadastr-odometer-v15',{start:null,end:null});
  const saveOdo=x=>setJSON('kadastr-odometer-v15',x);
  const templates=[
    'Провел обучение на использование принтера',
    'Провел обучение как пользоваться с модулем Uzmulk',
    'Установка защитной наклейки на принтер',
    'Провел чистку принтера от пыли'
  ];
  const settings15=()=>typeof settings==='function'?settings():{price:Number(localStorage.getItem('fuel-price')||8500),consumption:Number(localStorage.getItem('fuel-consumption')||7),rate:Number(localStorage.getItem('compensation-rate')||1000)};
  const cost=(km)=>{const s=settings15(),lit=Number(km||0)*s.consumption/100;return {lit,fuel:lit*s.price,comp:Number(km||0)*s.rate,net:Number(km||0)*s.rate-lit*s.price};};
  function addFinanceUI(){
    const tools=$('#tools'); if(!tools||$('#financeButton'))return;
    const rows=[
      ['🚗 Одометр','Фактический пробег по одометру за рабочий день.','odometerButton'],
      ['💰 Финансы','Компенсация, топливо, расходы и чистый результат.','financeButton'],
      ['⛽ Заправки','История заправок и фактический расход топлива.','refuelButton'],
      ['📋 Шаблоны отчётов','Готовые формулировки для отчёта после посещения.','templateButton']
    ];
    rows.forEach(([h,p,id])=>{const a=document.createElement('article');a.className='tool-row';a.innerHTML=`<div><h3>${h}</h3><p>${p}</p></div><button class="text-button" id="${id}" type="button">Открыть</button>`;tools.insertBefore(a,tools.firstElementChild)});
  }
  addFinanceUI();

  function openOdometer(){
    const o=getOdo();
    modal(`<h2>🚗 Одометр</h2><p class="muted">Введи показания одометра. Приложение сравнит их с GPS-пробегом.</p><form id="odoForm" class="form-grid"><label>Начало дня, км<input name="start" type="number" step="0.1" min="0" value="${o.start??''}" required></label><label>Конец дня, км<input name="end" type="number" step="0.1" min="0" value="${o.end??''}"></label><div id="odoPreview" class="report-grid"></div><div class="modal-actions"><button class="cancel" data-close type="button">Отмена</button><button class="save">Сохранить</button></div></form>`);
    const update=()=>{const s=Number($('#odoForm input[name=start]')?.value),e=Number($('#odoForm input[name=end]')?.value),gps=getJSON('kadastr-real-trips-v13',[]).filter(t=>t.date?.slice(0,10)===dateKey()).reduce((a,t)=>a+Number(t.km||0),0);$('#odoPreview').innerHTML=Number.isFinite(s)&&e>=s&&e>0?`<div><b>${(e-s).toFixed(1)} км</b><small>по одометру</small></div><div><b>${gps.toFixed(1)} км</b><small>GPS</small></div><div><b>${((e-s)-gps).toFixed(1)} км</b><small>разница</small></div>`:''};
    $('#odoForm').addEventListener('input',update);update();
  }
  function openFinance(){
    const km=Number(getOdo().end||0)-Number(getOdo().start||0), gps=getJSON('kadastr-real-trips-v13',[]).filter(t=>t.date?.slice(0,10)===dateKey()).reduce((a,t)=>a+Number(t.km||0),0), chosen=km>0?km:gps, c=cost(chosen), refs=getRefuels().filter(x=>x.date?.slice(0,10)===dateKey()), refCost=refs.reduce((a,x)=>a+Number(x.total||0),0), exp=getExpenses().filter(x=>x.date?.slice(0,10)===dateKey()), other=exp.reduce((a,x)=>a+Number(x.amount||0),0);
    modal(`<h2>💰 Финансы за сегодня</h2><div class="report-grid"><div><b>${chosen.toFixed(1)} км</b><small>пробег${km>0?' · одометр':' · GPS'}</small></div><div><b>${c.lit.toFixed(1)} л</b><small>расчётный расход</small></div><div><b>${money(refCost||c.fuel)}</b><small>топливо</small></div><div><b>${money(c.comp)}</b><small>компенсация</small></div><div><b>${money(other)}</b><small>прочие расходы</small></div><div><b>${money(c.comp-(refCost||c.fuel)-other)}</b><small>чистыми</small></div></div><h3 class="subheading">Добавить расход</h3><form id="expenseForm" class="form-grid"><label>Вид расхода<input name="title" placeholder="Парковка, платная дорога..." required></label><label>Сумма, сум<input name="amount" type="number" min="0" required></label><div class="modal-actions"><button class="cancel" data-close type="button">Закрыть</button><button class="save">Добавить</button></div></form>`);
  }
  function openRefuel(){
    const x=getRefuels().filter(v=>v.date?.slice(0,10)===dateKey()).slice(0,20);
    const rows=x.map(v=>`<article class="log-item"><strong>${esc(v.fuel)} · ${v.liters} л · ${money(v.total)}</strong><p>${v.price.toLocaleString('ru-RU')} сум/л${v.odometer?` · одометр ${v.odometer} км`:''}</p><small>${new Date(v.date).toLocaleString('ru-RU')}</small></article>`).join('');
    modal(`<h2>⛽ Заправки</h2><form id="refuelForm" class="form-grid"><label>Топливо<select name="fuel"><option>Пропан</option><option>Бензин</option><option>Другое</option></select></label><label>Литры<input name="liters" type="number" step="0.1" min="0" required></label><label>Цена за литр<input name="price" type="number" min="0" value="${settings15().price}" required></label><label>Сумма<input name="total" type="number" min="0" placeholder="Можно оставить пустым"></label><label>Пробег одометра<input name="odometer" type="number" step="0.1" min="0"></label><div class="modal-actions"><button class="cancel" data-close type="button">Закрыть</button><button class="save">Сохранить заправку</button></div></form><h3 class="subheading">Сегодня</h3><div class="log-list">${rows||'<p class="empty">Заправок сегодня нет.</p>'}</div>`);
  }
  let templateDraft=null;
  function openTemplates(){
    const form=$('#visitFormV13');
    templateDraft=form?{key:form.querySelector('[name="key"]')?.value,notes:form.querySelector('[name="notes"]')?.value||''}:null;
    const items=templates.map((t,i)=>`<button type="button" class="template-choice" data-template="${i}">${esc(t)}</button>`).join('');
    modal(`<h2>📋 Шаблоны отчётов</h2><p class="muted">Выбери готовую формулировку — она будет вставлена в отчёт.</p><div class="template-list">${items}</div><div class="modal-actions"><button class="cancel" data-close>Закрыть</button></div>`);
  }
  function appendTemplate(text){
    const form=$('#visitFormV13');
    if(form){const ta=form.querySelector('textarea[name="notes"]');if(ta){ta.value=ta.value?ta.value+'\n'+text:text;ta.focus();return;}}
    if(templateDraft?.key && window.kadastrV13?.openVisit){const key=templateDraft.key,old=templateDraft.notes||'';templateDraft=null;document.querySelector('#modal')?.close();window.kadastrV13.openVisit(key);setTimeout(()=>{const ta=$('#visitFormV13 textarea[name="notes"]');if(ta)ta.value=old?old+'\n'+text:text;},100);return;}
    navigator.clipboard?.writeText(text).catch(()=>{});
  }

  // Geo-smart planner: select candidates across ALL 47 objects, not by predefined route.
  function startPoint(){
    const a=getJSON('kadastr-active-day-v13',null);if(a?.last?.lat&&a?.last?.lon)return {lat:a.last.lat,lon:a.last.lon,label:'Текущая GPS-позиция'};
    return window.START_POINT||{lat:40.4409166667,lon:71.7560277778,label:'Точка старта / возврата'};
  }
  function allPending(){
    const done=getJSON('kadastr-done-stops',[]),out=[];routes.forEach(r=>r.stops.forEach((stop,i)=>{const key=`${r.id}:${i}`;if(!done.includes(key)&&stopCoords[stop])out.push({key,stop,route:r.title,region:r.region,lat:stopCoords[stop][0],lon:stopCoords[stop][1]})}));return out;
  }
  async function smartAll(){
    const base=startPoint(), pending=allPending();
    if(pending.length<2){alert('Осталось меньше двух невыполненных точек.');return;}
    const R=6371;const hav=(p)=>{const dlat=(p.lat-base.lat)*Math.PI/180,dlon=(p.lon-base.lon)*Math.PI/180,la1=base.lat*Math.PI/180,la2=p.lat*Math.PI/180;const h=Math.sin(dlat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dlon/2)**2;return 2*R*Math.asin(Math.sqrt(h));};
    const cand=pending.sort((a,b)=>hav(a)-hav(b)).slice(0,18);
    const coords=[base,...cand].map(p=>`${p.lon},${p.lat}`).join(';');
    const status=$('#plannerSummary');if(status)status.innerHTML='<div class="day-hint">🧠 Анализирую дороги между ближайшими кандидатами из всех 47 точек…</div>';
    try{
      const u=`https://router.project-osrm.org/table/v1/driving/${coords}?annotations=distance,duration`;
      const res=await fetch(u);const data=await res.json();if(data.code!=='Ok')throw new Error('OSRM');
      let best=null;
      for(let i=1;i<cand.length+1;i++)for(let j=i+1;j<cand.length+1;j++){
        const km=(data.distances[0][i]+data.distances[i][j]+data.distances[j][0])/1000;
        const min=(data.durations[0][i]+data.durations[i][j]+data.durations[j][0])/60;
        if(!best||km<best.km)best={a:cand[i-1],b:cand[j-1],km,min};
      }
      const c=cost(best.km);const nav=`https://www.google.com/maps/dir/?api=1&origin=${base.lat},${base.lon}&destination=${base.lat},${base.lon}&waypoints=${best.a.lat},${best.a.lon}|${best.b.lat},${best.b.lon}&travelmode=driving`;
      status.innerHTML=`<article class="optimized-card"><div class="optimized-head"><div><p class="eyebrow">Гео-оптимальный выбор из всех точек</p><h3>🏁 ${esc(base.label||'Старт')}<br>↓<br>1. ${esc(best.a.stop)}<br>↓<br>2. ${esc(best.b.stop)}<br>↓<br>🏁 Возврат</h3><p class="muted">${esc(best.a.region)} · ${esc(best.b.region)}</p></div><strong>${best.km.toFixed(1)} км</strong></div><div class="cost-grid"><div><b>${Math.round(best.min)} мин</b><small>в дороге</small></div><div><b>${c.lit.toFixed(1)} л</b><small>топливо</small></div><div><b>${money(c.fuel)}</b><small>расход</small></div><div><b>${money(c.comp)}</b><small>компенсация</small></div><div><b>${money(c.net)}</b><small>чистыми</small></div></div><p class="muted">Приложение сравнивает точки по реальным дорожным расстояниям, а не только по названию исходного маршрута. Поэтому соседние филиалы из разных маршрутов тоже могут быть выбраны.</p><div class="route-actions"><button class="map-button" id="smartNav15" data-url="${nav}">🚗 Открыть маршрут</button><button class="done-button" id="smartSelect15" data-a="${best.a.key}" data-b="${best.b.key}">✓ Выбрать эти 2 точки</button></div></article>`;
    }catch(e){status.innerHTML='<div class="day-hint">Не удалось получить дорожную матрицу. Проверь интернет и попробуй ещё раз.</div>';}
  }
  function addSmartButton(){
    const panel=$('#planner');if(!panel||$('#smartGeoButton'))return;const b=document.createElement('button');b.id='smartGeoButton';b.className='primary-button';b.type='button';b.textContent='🧠 Подобрать 2 ближайшие по дорогам';panel.querySelector('.section-heading')?.appendChild(b);
  }
  addSmartButton();

  // Upgrade visit form with templates and arrival coordinates.
  const oldOpenVisit=window.kadastrV13?.openVisit;
  function enhanceVisitModal(){
    const form=$('#visitFormV13');if(!form||$('#templateBtn15'))return;
    const actions=form.querySelector('.modal-actions');const b=document.createElement('button');b.type='button';b.id='templateBtn15';b.className='secondary-button';b.textContent='📋 Шаблоны';actions?.insertBefore(b,actions.querySelector('.save'));
    form.insertAdjacentHTML('afterbegin','<p class="muted">Выбери готовую формулировку или добавь свой комментарий.</p>');
  }

  // Backup enhancement: preserve new data while keeping the old backup fields.
  const oldBackup=window.exportBackup;
  window.exportBackup=function(){const data={version:5,exportedAt:new Date().toISOString(),done:getJSON('kadastr-done',[]),doneStops:getJSON('kadastr-done-stops',[]),logs:getJSON('kadastr-logs',[]),trips:getJSON('kadastr-trips',[]),realTrips:getJSON('kadastr-real-trips-v13',[]),visits:getJSON('kadastr-visits-v13',[]),settings:settings15(),odometer:getOdo(),refuels:getRefuels(),expenses:getExpenses()};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`kadastr-backup-v5-${dateKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1200);};

  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.id==='odometerButton')openOdometer();
    if(b.id==='financeButton')openFinance();
    if(b.id==='refuelButton')openRefuel();
    if(b.id==='templateButton'||b.id==='templateBtn15')openTemplates();
    if(b.id==='smartGeoButton')smartAll();
    if(b.id==='smartNav15'&&b.dataset.url)window.open(b.dataset.url,'_blank');
    if(b.id==='smartSelect15'){const a=getJSON('kadastr-planner-selected',[]);setJSON('kadastr-planner-selected',[b.dataset.a,b.dataset.b]);if(typeof renderPlanner==='function')renderPlanner();alert('Две гео-оптимальные точки выбраны.');}
    if(b.dataset.template!=null)appendTemplate(templates[Number(b.dataset.template)]);
  });
  document.addEventListener('submit',e=>{
    if(e.target.id==='odoForm'){e.preventDefault();const f=new FormData(e.target),s=Number(f.get('start')),end=f.get('end')===''?null:Number(f.get('end'));if(end!==null&&end<s){alert('Конечный одометр не может быть меньше начального.');return;}saveOdo({start:s,end});document.querySelector('#modal').close();alert('Показания одометра сохранены.');}
    if(e.target.id==='refuelForm'){e.preventDefault();const f=new FormData(e.target),lit=Number(f.get('liters')),price=Number(f.get('price')),total=Number(f.get('total'))||lit*price,x=getRefuels();x.unshift({date:new Date().toISOString(),fuel:String(f.get('fuel')),liters:lit,price,total,odometer:Number(f.get('odometer'))||null});saveRefuels(x);document.querySelector('#modal').close();}
    if(e.target.id==='expenseForm'){e.preventDefault();const f=new FormData(e.target),x=getExpenses();x.unshift({date:new Date().toISOString(),title:String(f.get('title')),amount:Number(f.get('amount'))});saveExpenses(x);document.querySelector('#modal').close();openFinance();}
  });
  document.addEventListener('click',e=>{if(e.target.closest('#templateBtn15'))setTimeout(enhanceVisitModal,50);});
  const observer=new MutationObserver(()=>enhanceVisitModal());observer.observe(document.body,{childList:true,subtree:true});
  const oldImport=window.importBackup;
  window.importBackup=function(file){const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(Array.isArray(d.refuels))saveRefuels(d.refuels);if(Array.isArray(d.expenses))saveExpenses(d.expenses);if(d.odometer)saveOdo(d.odometer);if(Array.isArray(d.visits))setJSON('kadastr-visits-v13',d.visits);if(Array.isArray(d.realTrips))setJSON('kadastr-real-trips-v13',d.realTrips);if(typeof oldImport==='function')oldImport(new File([r.result],file.name||'kadastr-backup.json',{type:'application/json'}));else alert('Резервная копия восстановлена.');}catch(e){alert('Не удалось прочитать резервную копию.')}};r.readAsText(file);};
  window.kadastrV15={smartAll,openOdometer,openFinance,openRefuel,templates};
})();
