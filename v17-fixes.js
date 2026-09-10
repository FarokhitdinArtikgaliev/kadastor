/* Kadastr Route v17 — Android GPS permissions + robust PDF export/share */
(function(){
  'use strict';
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=n=>`${Math.round(Number(n)||0).toLocaleString('ru-RU')} сум`;
  const fmtDate=d=>new Date(d).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const dayKey=()=>new Date().toISOString().slice(0,10);
  const json=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d));}catch{return d;}};
  const settings=()=>({price:Number(localStorage.getItem('fuel-price')||8500),consumption:Number(localStorage.getItem('fuel-consumption')||7),rate:Number(localStorage.getItem('compensation-rate')||1000)});
  const visits=()=>json('kadastr-visits-v13',[]);
  const trips=()=>json('kadastr-real-trips-v13',[]);
  const periodStart=p=>{const n=new Date();let s=new Date(n);if(p==='day')s.setHours(0,0,0,0);else if(p==='week'){const d=(n.getDay()+6)%7;s.setDate(n.getDate()-d);s.setHours(0,0,0,0);}else s=new Date(n.getFullYear(),n.getMonth(),1);return s;};
  const reportData=p=>{const s=periodStart(p),v=visits().filter(x=>new Date(x.date)>=s),t=trips().filter(x=>new Date(x.date)>=s),km=t.reduce((a,x)=>a+Number(x.km||0),0),st=settings(),lit=km*st.consumption/100,fuel=lit*st.price,comp=km*st.rate,refs=json('kadastr-refuels-v15',[]).filter(x=>new Date(x.date)>=s),exp=json('kadastr-expenses-v15',[]).filter(x=>new Date(x.date)>=s),odo=json('kadastr-odometer-v15',null);return {v,t,km,lit,fuel,comp,net:comp-fuel,refs,exp,odo};};
  const title=p=>p==='day'?'Сегодня':p==='week'?'Текущая неделя':'Текущий месяц';

  async function locationPlugin(){try{if(window.Capacitor?.registerPlugin){return window.__kadastrGeo||(window.__kadastrGeo=window.Capacitor.registerPlugin('Geolocation'));}return window.Capacitor?.Plugins?.Geolocation||null;}catch(e){return window.Capacitor?.Plugins?.Geolocation||null;}}
  async function requestGPS(){
    try{
      const geo=await locationPlugin();
      if(!geo){alert('Нативный GPS-модуль не найден. Нужна новая сборка APK v17.');return false;}
      const cur=await geo.checkPermissions();
      if(cur.location==='granted'||cur.location==='limited') return true;
      const res=await geo.requestPermissions({permissions:['location']});
      if(res.location==='granted'||res.location==='limited'){alert('Доступ к геолокации разрешён.');return true;}
      alert('Android не предоставил доступ к геолокации. Открой Настройки → Приложения → Кадастр Маршрут → Разрешения → Местоположение и выбери «Разрешить».');
      return false;
    }catch(e){alert('Не удалось запросить GPS-разрешение. Открой Настройки → Приложения → Кадастр Маршрут → Разрешения → Местоположение.');return false;}
  }
  function addGPSButton(){
    const card=$('#workday'); if(!card||$('#requestGPSv17'))return;
    const actions=card.querySelector('.workday-actions'); if(!actions)return;
    const b=document.createElement('button');b.id='requestGPSv17';b.className='secondary-button';b.type='button';b.textContent='📍 Разрешить GPS';
    actions.insertBefore(b,actions.firstChild);
    b.addEventListener('click',requestGPS);
  }
  setTimeout(addGPSButton,300);
  new MutationObserver(addGPSButton).observe(document.body,{childList:true,subtree:true});

  function addFont(pdf,name,style){if(window.__kadastrFonts?.[name]){pdf.addFileToVFS(name+'.ttf',window.__kadastrFonts[name]);pdf.addFont(name+'.ttf','NotoSans',style);}}
  function makePDF(p){
    if(!window.jspdf?.jsPDF)throw new Error('PDF_MODULE');
    const x=reportData(p),st=settings(),pdf=new jspdf.jsPDF({orientation:'p',unit:'mm',format:'a4'});
    addFont(pdf,'NotoSans-Regular','normal');addFont(pdf,'NotoSans-Bold','bold');pdf.setFont('NotoSans','normal');
    const W=190, margin=10; let y=14;
    const line=(text,size=10,bold=false,gap=6)=>{pdf.setFont('NotoSans',bold?'bold':'normal');pdf.setFontSize(size);const lines=pdf.splitTextToSize(String(text),W);for(const l of lines){if(y>282){pdf.addPage();y=14;pdf.setFont('NotoSans','normal');pdf.setFontSize(size);}pdf.text(l,margin,y);y+=gap;}};
    line('КАДАСТР МАРШРУТ',18,true,8);line(`Отчёт: ${title(p)}`,13,true,7);line(`Сформировано: ${fmtDate(new Date())}`,9,false,7);
    y+=2; line(`Посещений: ${x.v.length}    GPS поездок: ${x.t.length}`,10,true);line(`Фактический GPS пробег: ${x.km.toFixed(1)} км`,10);line(`Расход топлива: ${x.lit.toFixed(1)} л`,10);line(`Стоимость топлива: ${money(x.fuel)}`,10);line(`Компенсация: ${money(x.comp)} (${st.rate.toLocaleString('ru-RU')} сум/км)`,10);line(`Чистый результат: ${money(x.net)}`,10,true);
    if(x.odo?.start!=null&&x.odo?.end!=null)line(`Пробег по одометру: ${(Number(x.odo.end)-Number(x.odo.start)).toFixed(1)} км`,10);
    y+=3;line('ПОСЕЩЕНИЯ',13,true,7);
    if(!x.v.length)line('Нет посещений за период.',10);
    x.v.forEach((v,i)=>{line(`${i+1}. ${v.branch||'—'} — ${v.status||'—'}`,10,true,5);line(`Сотрудник: ${(window.staffNames?.[v.branch])||'—'}`,9);line(`Руководитель: ${(window.headNames?.[v.branch])||'—'}`,9);if(v.notes)line(`Результат: ${v.notes}`,9);if(v.photos?.length)line(`Фотоотчёт: ${v.photos.length} фото`,9);line(`Дата: ${fmtDate(v.date)}`,9, false, 5);y+=2;});
    line('ЗАПРАВКИ',13,true,7);if(!x.refs.length)line('Заправок за период нет.',9);x.refs.forEach(r=>line(`${fmtDate(r.date)} — ${r.fuel||''} — ${Number(r.liters||0).toFixed(1)} л — ${money(r.total)}`,9));
    line('ПРОЧИЕ РАСХОДЫ',13,true,7);if(!x.exp.length)line('Прочих расходов за период нет.',9);x.exp.forEach(r=>line(`${fmtDate(r.date)} — ${r.title||''} — ${money(r.amount)}`,9));
    line('Расчёт топлива: км × расход / 100 × цена. Компенсация: км × тариф.',8,false,5);
    return pdf.output('blob');
  }
  function blobToBase64(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]);r.onerror=rej;r.readAsDataURL(blob);});}
  async function saveOrShare(p,share){
    const blob=makePDF(p), filename=`kadastr-report-${p}-${dayKey()}.pdf`;
    if(share){
      try{
        const fs=window.Capacitor?.Plugins?.Filesystem, sh=window.Capacitor?.Plugins?.Share;
        if(fs&&sh){const base64=await blobToBase64(blob);const w=await fs.writeFile({path:`${filename}`,data:base64,directory:'CACHE'});const uri=w.uri||(await fs.getUri({path:filename,directory:'CACHE'})).uri;await sh.share({title:`Kadastr Route — ${title(p)}`,text:'Отчёт Kadastr Route',files:[uri],dialogTitle:'Отправить PDF'});return;}
      }catch(e){if(e?.name==='AbortError'||e?.message?.includes('canceled'))return;}
      if(navigator.share){try{const f=new File([blob],filename,{type:'application/pdf'});if(!navigator.canShare||navigator.canShare({files:[f]})){await navigator.share({title:`Kadastr Route — ${title(p)}`,text:'Отчёт Kadastr Route',files:[f]});return;}}catch(e){if(e?.name==='AbortError')return;}}
    }
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
    if(share)alert('PDF сохранён. Если меню отправки не открылось, отправь сохранённый файл через Telegram/WhatsApp/Gmail.');
  }
  function overridePDF(){
    if(!window.kadastrV13)return false;
    window.kadastrV13.createPdf=(p='day',share=false)=>saveOrShare(p,share).catch(e=>alert('Не удалось создать PDF: '+(e?.message||'неизвестная ошибка')));
    return true;
  }
  // Capture PDF clicks before the legacy v13 handler, which used html2canvas and could freeze Android WebView.
  document.addEventListener('click',e=>{
    const b=e.target.closest('button'); if(!b)return;
    if(b.id==='pdfReportBtn'){e.preventDefault();e.stopImmediatePropagation();saveOrShare('month',false);return;}
    if(b.id==='pdfReportModal'){e.preventDefault();e.stopImmediatePropagation();saveOrShare(b.dataset.period||'day',false);return;}
    if(b.id==='sharePdfModal'){e.preventDefault();e.stopImmediatePropagation();saveOrShare(b.dataset.period||'day',true);return;}
  },true);
  const timer=setInterval(()=>{if(overridePDF())clearInterval(timer);},100);
  window.kadastrV17={requestGPS,makePDF,saveOrShare};
})();
