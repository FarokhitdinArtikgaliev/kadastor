/* v16 — Smart day planner + manual point selection */
(function(){
  'use strict';
  const $=s=>document.querySelector(s);
  const getJSON=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d));}catch{return d;}};
  const setJSON=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const money=n=>`${Math.round(Number(n)||0).toLocaleString('ru-RU')} сум`;
  const settings16=()=>({price:Number(localStorage.getItem('fuel-price')||8500),consumption:Number(localStorage.getItem('fuel-consumption')||7),rate:Number(localStorage.getItem('compensation-rate')||1000)});
  const cost16=km=>{const s=settings16(),lit=km/100*s.consumption,fuel=lit*s.price,comp=km*s.rate;return {lit,fuel,comp,net:comp-fuel};};
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const base=()=>window.START_POINT||{lat:40.4409166667,lon:71.7560277778,label:'Точка старта / возврата'};
  const done=()=>getJSON('kadastr-done-stops',[]);
  const all=()=>{
    const out=[]; (window.routes||[]).forEach(r=>r.stops.forEach((stop,i)=>{const key=`${r.id}:${i}`,p=window.stopCoords?.[stop]; if(p) out.push({key,stop,route:r.title,region:r.region,lat:p[0],lon:p[1]});})); return out;
  };
  const pending=()=>all().filter(x=>!done().includes(x.key));
  const hav=(a,b)=>{const R=6371,dLat=(b.lat-a.lat)*Math.PI/180,dLon=(b.lon-a.lon)*Math.PI/180,la1=a.lat*Math.PI/180,la2=b.lat*Math.PI/180;const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h));};
  const osrm=async pts=>{const coords=pts.map(p=>`${p.lon},${p.lat}`).join(';');const u=`https://router.project-osrm.org/table/v1/driving/${coords}?annotations=distance,duration`;const r=await fetch(u);if(!r.ok)throw Error('network');const d=await r.json();if(d.code!=='Ok')throw Error('OSRM');return d;};
  function selected(){return getJSON('kadastr-manual-selection-v16',[]);}
  function saveSelected(v){setJSON('kadastr-manual-selection-v16',v);}
  function currentPlan(){return getJSON('kadastr-day-plan-v16',[]);}
  function savePlan(v){setJSON('kadastr-day-plan-v16',v);}
  function renderPlan(){
    const box=$('#dayPlan16');if(!box)return;
    const plan=currentPlan(), today=plan[0]||[];
    const rows=plan.length?plan.map((day,i)=>`<div class="day-plan-row"><div><b>День ${i+1}</b><span>${day.map(k=>esc(all().find(x=>x.key===k)?.stop||k)).join(' → ')}</span></div><button type="button" data-remove-day="${i}">✕</button></div>`).join(''):'<p class="muted">Оптимальный план ещё не рассчитан.</p>';
    box.innerHTML=`<div class="planner16-head"><div><h3>🧠 Оптимальный план по дням</h3><p class="muted">Приложение заново группирует точки по географии и дорожным расстояниям, а не по старым маршрутам.</p></div><div class="planner16-actions"><button type="button" class="primary-button" id="buildDays16">🧠 Пересчитать все дни</button><button type="button" class="secondary-button" id="manualPick16">☑ Выбрать точки самому</button></div></div><div class="manual-current16">${selected().length?`Выбрано вручную: <b>${selected().map(k=>esc(all().find(x=>x.key===k)?.stop||k)).join(', ')}</b>`:'Можно выбрать любые 1–2 точки независимо от исходного маршрута.'}</div><div class="day-plan-list">${rows}</div>`;
  }
  async function buildDays(){
    const box=$('#dayPlan16'); if(!box)return; const ps=pending(); if(!ps.length){alert('Все точки уже выполнены.');return;}
    box.querySelector('.planner16-actions').innerHTML='<span class="day-hint">⏳ Считаю дорожные расстояния между всеми невыполненными точками…</span>';
    try{
      const B=base(), pts=[B,...ps]; const d=await osrm(pts), n=ps.length;
      const remaining=new Set(ps.map(x=>x.key)), days=[];
      while(remaining.size){
        let best=null;
        const arr=[...remaining].map(k=>ps.find(x=>x.key===k));
        if(arr.length===1){best={a:arr[0],b:null,km:(d.distances[0][ps.indexOf(arr[0])+1]+d.distances[ps.indexOf(arr[0])+1][0])/1000};}
        else {
          for(let ai=0;ai<arr.length;ai++)for(let bi=ai+1;bi<arr.length;bi++){
            const a=arr[ai],b=arr[bi],i=ps.indexOf(a)+1,j=ps.indexOf(b)+1;
            const km=(d.distances[0][i]+d.distances[i][j]+d.distances[j][0])/1000;
            if(!best||km<best.km)best={a,b,km};
          }
        }
        days.push(best.b?[best.a.key,best.b.key]:[best.a.key]); remaining.delete(best.a.key); if(best.b)remaining.delete(best.b.key);
      }
      savePlan(days); renderPlan();
      alert(`Готово: составлено ${days.length} рабочих дней. В каждом дне до 2 точек с минимальным круговым пробегом от точки старта.`);
    }catch(e){
      // Straight-line fallback keeps the planner usable offline / when OSRM is unavailable.
      const B=base(), arr=ps.slice().sort((a,b)=>hav(B,a)-hav(B,b)), days=[]; while(arr.length)days.push(arr.splice(0,2).map(x=>x.key)); savePlan(days); renderPlan(); alert('Дорожный сервер недоступен. Составлен резервный план по географической близости.');
    }
  }
  function openManual(){
    const ps=pending(), chosen=new Set(selected());
    const html=ps.map(x=>`<label class="manual-point16"><input type="checkbox" value="${esc(x.key)}" ${chosen.has(x.key)?'checked':''}><span><b>${esc(x.stop)}</b><small>${esc(x.region)} · ${esc(x.route)}</small></span></label>`).join('');
    const dlg=$('#modal'); if(!dlg)return;
    dlg.innerHTML=`<form method="dialog" id="manualForm16"><h2>☑ Выбор точек на день</h2><p class="muted">Выбери любые точки из всех 47 объектов. Можно выбрать максимум 2.</p><input id="manualSearch16" class="input" placeholder="🔎 Поиск по филиалу или региону"><div id="manualList16" class="manual-list16">${html||'<p class="empty">Нет невыполненных точек.</p>'}</div><div class="modal-actions"><button type="button" class="cancel" value="cancel">Отмена</button><button type="submit" class="save">Выбрать</button></div></form>`;
    if(typeof dlg.showModal==='function')dlg.showModal();
    const list=$('#manualList16'); const search=$('#manualSearch16');
    search?.addEventListener('input',()=>{const q=search.value.toLowerCase();list.querySelectorAll('.manual-point16').forEach(r=>r.style.display=r.textContent.toLowerCase().includes(q)?'':'none');});
    list?.addEventListener('change',e=>{if(e.target.matches('input[type=checkbox]')){const checked=[...list.querySelectorAll('input:checked')];if(checked.length>2){e.target.checked=false;alert('На один день можно выбрать максимум 2 точки.');}}});
    dlg.querySelector('.cancel')?.addEventListener('click',()=>dlg.close());
    $('#manualForm16')?.addEventListener('submit',e=>{e.preventDefault();const vals=[...list.querySelectorAll('input:checked')].map(x=>x.value);saveSelected(vals);if(vals.length){const plan=currentPlan().filter(d=>!d.some(k=>vals.includes(k)));savePlan([vals,...plan]);}renderPlan();dlg.close();});
  }
  function inject(){
    const planner=$('#planner'); if(!planner||$('#dayPlan16'))return;
    const box=document.createElement('section');box.id='dayPlan16';box.className='card planner16';planner.appendChild(box);renderPlan();
  }
  document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='buildDays16')buildDays();if(b.id==='manualPick16')openManual();if(b.dataset.removeDay!=null){const p=currentPlan();p.splice(Number(b.dataset.removeDay),1);savePlan(p);renderPlan();}});
  const obs=new MutationObserver(inject);obs.observe(document.body,{childList:true,subtree:true});
  setTimeout(inject,100);
  window.kadastrV16={buildDays,openManual,renderPlan};
})();
