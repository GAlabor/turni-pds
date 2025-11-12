// [JS-MAIN] Turni PDS — UI modernizzata, filler corretto con SIGLE e opacità graduale
"use strict";

// ======================= //
// UTILITIES               //
// ======================= //
function util_jsWeekdayUTC(d){ return (d.getUTCDay()+6)%7 } // Lunedì=0 … Domenica=6
function util_pad2(n){ return n.toString().padStart(2,'0') }
function util_fmtMonth(fmt,y,m){ return fmt.format(new Date(Date.UTC(y,m,1))) }
function util_daysInMonthUTC(y,m){ return new Date(Date.UTC(y, m+1, 0)).getUTCDate(); }
function capitalizeFirst(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

// Escaping
function esc(s){ return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
function isSafeHexColor(s){ return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(s||"").trim()); }

function app_base(){
  if (location.hostname === 'localhost') return '';
  const seg = location.pathname.split('/').filter(Boolean)[0] || 'turni-pds';
  return '/' + seg;
}

function util_splitOrario(s){ const parts = String(s||'').split(/[-–—]/).map(x=>x.trim()); return { start: parts[0]||'', end: parts[1]||'' }; }
function util_joinOrarioMultiline(txt){ const [rawS='', rawE=''] = String(txt||'').split(/\n/); const s=(rawS||'').trim(); const e=(rawE||'').trim(); return (s||e)?`${s}–${e}`:''; }

// ======================= //
// STATO IN MEMORIA        //
// ======================= //
const itMonth = new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric'});
const now = new Date();
const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
let view = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), 1));

const grid        = document.querySelector('.grid');
const monthLabel  = document.getElementById('monthLabel');

// Turni e settings (RAM)
const SHIFT_DEFAULTS = [
  { key:'S', nome:'Sera',       sigla:'S', orario:'18:55–00:08', color:'#8e88ff' },
  { key:'P', nome:'Pomeriggio', sigla:'P', orario:'12:55–19:08', color:'#c7a47b' },
  { key:'M', nome:'Mattina',    sigla:'M', orario:'06:55–13:08', color:'#f1a04f' },
  { key:'N', nome:'Notte',      sigla:'N', orario:'23:55–07:08', color:'#9aa3ad' },
  { key:'R', nome:'Riposo',     sigla:'R', orario:'—',           color:'#28a745' }
];
let TURNI_DEFS = SHIFT_DEFAULTS.map(x => ({...x}));
let SETTINGS = (() => {
  const t = todayUTC;
  return { date: `${t.getUTCFullYear()}-${util_pad2(t.getUTCMonth()+1)}-${util_pad2(t.getUTCDate())}`, shift: 'S' };
})();
function defs_effective(){ return TURNI_DEFS; }
function settings_effective(){ return SETTINGS; }

// ======================= //
// CALCOLO SIGLE           //
// ======================= //
const BASE_SEQ=['S','P','M','N','R'];
function shifts_codeForDate(d){
  const cfg=settings_effective();
  const [y,m,dd]=cfg.date.split('-').map(Number);
  const anchor=new Date(Date.UTC(y,m-1,dd));
  const idx0=BASE_SEQ.indexOf(cfg.shift);
  const daysDiff=Math.floor((Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())-Date.UTC(anchor.getUTCFullYear(),anchor.getUTCMonth(),anchor.getUTCDate()))/86400000);
  const step=((idx0+(daysDiff%5)+5)%5);
  const raw=BASE_SEQ[step];
  if(raw!=='R') return raw;
  const dow=util_jsWeekdayUTC(d);
  if(dow===0) return 'GL';
  if(dow===1) return 'AP';
  return 'R';
}

// ======================= //
// UI HELPERS              //
// ======================= //
function ui_displayLabelFor(base){ const f = defs_effective().find(x => x.key === base); return f && f.sigla ? f.sigla : base; }
function ui_colorForBase(base){ const f = defs_effective().find(x => x.key === base); return (f && isSafeHexColor(f.color)) ? f.color : '#8e88ff'; }

// ======================= //
// RENDERING               //
// ======================= //
function createCellElement({day, sun, sigla, isToday, startCol, outMonth, outOpacity}){
  const cell = document.createElement('div');
  cell.className = 'cell';
  if (sun) cell.classList.add('sun');
  if (isToday) cell.classList.add('today');
  if (outMonth) cell.classList.add('out-month');
  if (startCol) cell.style.gridColumnStart = String(startCol);
  if (outMonth && typeof outOpacity === 'number') cell.style.setProperty('--out-opacity', String(outOpacity));

  const num = document.createElement('span');
  num.className = 'num';
  num.textContent = util_pad2(day);
  cell.appendChild(num);

  // SEMPRE mostra la sigla, anche per out-month, con lo stesso stile (l’opacità la gestisce la cella)
  const isGLAP = (sigla === 'GL' || sigla === 'AP');
  const label  = sigla ? (isGLAP ? sigla : ui_displayLabelFor(sigla)) : '';
  if (label) {
    const sig = document.createElement('span');
    sig.className = 'sigla';
    if (isGLAP) {
      sig.classList.add(sigla === 'GL' ? 'T-GL' : 'T-AP');
      sig.textContent = label;
    } else {
      sig.textContent = label;
      const color = ui_colorForBase(sigla);
      sig.style.color = color;
    }
    cell.appendChild(sig);
  }

  return cell;
}

function render_buildMonth(year,month) {
  // Etichetta mese capitalizzata
  monthLabel.textContent = capitalizeFirst(util_fmtMonth(itMonth,year,month));

  const frag = document.createDocumentFragment();
  const first=new Date(Date.UTC(year,month,1));
  const last =new Date(Date.UTC(year,month+1,0));
  const lead =util_jsWeekdayUTC(first); // 0=LUN ... 6=DOM

  // 1) Giorni del mese precedente per coprire l'inizio riga
  if (lead > 0) {
    const prevY = (month===0) ? year-1 : year;
    const prevM = (month===0) ? 11 : month-1;
    const prevLast = util_daysInMonthUTC(prevY, prevM);
    // sequence: prevLast-lead+1 ... prevLast
    for (let i = prevLast - lead + 1, k=0; i <= prevLast; i++, k++) {
      // opacità: da 0.35 (più lontano) a 0.85 (più vicino al mese corrente)
      const denom = Math.max(1, lead-1);
      const outOpacity = 0.35 + (k / denom) * 0.50;
      const d = new Date(Date.UTC(prevY, prevM, i));
      const isSun = util_jsWeekdayUTC(d)===6;
      const sigla = shifts_codeForDate(d); // stessa logica turni anche sui filler
      frag.appendChild(createCellElement({day:i,sun:isSun,sigla,isToday:false,outMonth:true,outOpacity}));
    }
  }

  // 2) Giorni del mese corrente
  for(let day=1; day<=last.getUTCDate(); day++){
    const d=new Date(Date.UTC(year,month,day));
    const isSun = util_jsWeekdayUTC(d)===6;
    const isT = d.getUTCFullYear()===todayUTC.getUTCFullYear() &&
                d.getUTCMonth()===todayUTC.getUTCMonth() &&
                d.getUTCDate()===todayUTC.getUTCDate();
    const sigla = shifts_codeForDate(d);
    const startCol = (day===1)? (lead+1) : undefined;
    frag.appendChild(createCellElement({day,sun:isSun,sigla,isToday:isT,startCol}));
  }

  // 3) Giorni del mese successivo per chiudere la settimana
  const cellsSoFar = lead + last.getUTCDate();
  const remainder = (cellsSoFar % 7 === 0) ? 0 : 7 - (cellsSoFar % 7);
  if (remainder > 0) {
    const nextY = (month===11) ? year+1 : year;
    const nextM = (month===11) ? 0 : month+1;
    for (let i = 1; i <= remainder; i++) {
      // opacità: da 0.85 (vicino alla fine del mese corrente) a 0.35 (più lontano)
      const denom = Math.max(1, remainder-1);
      const outOpacity = 0.85 - ((i-1) / denom) * 0.50;
      const d = new Date(Date.UTC(nextY, nextM, i));
      const isSun = util_jsWeekdayUTC(d)===6;
      const sigla = shifts_codeForDate(d);
      frag.appendChild(createCellElement({day:i,sun:isSun,sigla,isToday:false,outMonth:true,outOpacity}));
    }
  }

  grid.replaceChildren(frag);
}

// Animazioni tra mesi
function animateAnd(fn, dir){
  const outClass = dir==='next' ? 'slide-out-left' : 'slide-out-right';
  const inClass  = dir==='next' ? 'slide-in-right' : 'slide-in-left';
  grid.classList.add('anim', outClass);
  const once = () => {
    grid.removeEventListener('animationend', once);
    fn();
    grid.classList.remove(outClass);
    grid.classList.add(inClass);
    const once2 = () => { grid.removeEventListener('animationend', once2); grid.classList.remove('anim', inClass); };
    grid.addEventListener('animationend', once2, { once:true });
  };
  grid.addEventListener('animationend', once, { once:true });
}

function nav_shift(delta){
  const dir = delta>0 ? 'next' : 'prev';
  animateAnd(() => {
    view=new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth()+delta, 1));
    render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());
  }, dir);
}

function ui_switchTab(name){
  const isSettings = (name === 'settings');
  document.body.classList.toggle('hide-topbar', isSettings);
  document.body.classList.toggle('no-scroll', !isSettings);
  document.querySelectorAll('.tab').forEach(el =>
    el.classList.toggle('active', el.dataset.tab === name));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${name}`).classList.add('active');
}

/* ===== CRUD TURNI (RAM) ===== */
function ui_displayColorOrDefault(val){ return isSafeHexColor(val) ? val : '#8e88ff'; }

function buildTurnoRow(t, idx){
  const row = document.createElement('div');
  row.className = 'settingsRow turni-grid';
  row.style.alignItems = 'center';

  const c1 = document.createElement('div');
  const nome = document.createElement('input');
  nome.value = t.nome || ''; nome.dataset.k = 'nome'; nome.dataset.i = String(idx); c1.appendChild(nome);

  const c2 = document.createElement('div');
  const sigla = document.createElement('input');
  sigla.value = t.sigla || ''; sigla.maxLength = 4; sigla.className = 'siglaInput';
  sigla.dataset.k = 'sigla'; sigla.dataset.i = String(idx); c2.appendChild(sigla);

  const c3 = document.createElement('textarea');
  c3.className = 'orarioArea'; c3.rows = 2;
  const p = util_splitOrario(t.orario);
  c3.value = (p.start || '') + '\n' + (p.end || '');
  c3.dataset.k = 'orarioMultiline'; c3.dataset.i = String(idx);

  const c4wrap = document.createElement('div'); c4wrap.className = 'colorCell';
  const color = document.createElement('input');
  color.type = 'color'; color.value = ui_displayColorOrDefault(t.color);
  color.className = 'colorInput'; color.dataset.k = 'color'; color.dataset.i = String(idx);
  c4wrap.appendChild(color);

  const del = document.createElement('button');
  del.type = 'button'; del.className = 'iconbtn iconbtn-danger'; del.dataset.act = 'del'; del.dataset.i = String(idx); del.textContent = '✕';

  row.appendChild(c1);
  row.appendChild(c2);
  const c3wrap = document.createElement('div'); c3wrap.appendChild(c3); row.appendChild(c3wrap);
  row.appendChild(c4wrap);
  row.appendChild(del);

  del.addEventListener('click', ()=> ui_defsDelete(idx));
  const onChange = (inp) => ui_defsEditInline(parseInt(inp.dataset.i), inp.dataset.k, inp.value);
  [nome, sigla, c3, color].forEach(inp=>{
    inp.addEventListener('input', ()=>onChange(inp));
    inp.addEventListener('change', ()=>onChange(inp));
  });
  return row;
}
function ui_defsRenderList(){
  const list=defs_effective();
  const wrap=document.getElementById('turniList');
  const frag = document.createDocumentFragment();
  wrap.innerHTML='';
  list.forEach((t,idx)=>{ frag.appendChild(buildTurnoRow(t, idx)); });
  wrap.appendChild(frag);
}
function ui_defsAdd(){
  const nome  = document.getElementById('newNome').value.trim();
  const sigla = document.getElementById('newSigla').value.trim().toUpperCase();
  const orTxt = document.getElementById('newOrario').value;
  const colorRaw = document.getElementById('newColor').value.trim();
  const color = isSafeHexColor(colorRaw) ? colorRaw : '#8e88ff';
  if(!nome || !sigla) return;
  const orario = util_joinOrarioMultiline(orTxt);
  TURNI_DEFS = [...TURNI_DEFS, { key:'X'+Date.now(), nome, sigla, orario, color }];
  ui_defsClearNew(); ui_defsRenderList(); render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());
}
function ui_defsClearNew(){
  document.getElementById('newNome').value = '';
  document.getElementById('newSigla').value = '';
  document.getElementById('newOrario').value = '';
  document.getElementById('newColor').value = '#8e88ff';
}
function ui_defsDelete(i){
  TURNI_DEFS = TURNI_DEFS.filter((_,idx)=>idx!==i);
  ui_defsRenderList(); render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());
}
function ui_defsEditInline(i,key,val){
  if(!TURNI_DEFS[i]) return;
  const next = [...TURNI_DEFS];
  if(key==='orarioMultiline'){ next[i] = { ...next[i], orario: util_joinOrarioMultiline(val) };
  }else if(key==='color'){ next[i] = { ...next[i], color: isSafeHexColor(val) ? val : next[i].color };
  }else if(key==='sigla'){ next[i] = { ...next[i], sigla: String(val||'').toUpperCase() };
  }else{ next[i] = { ...next[i], [key]: val }; }
  TURNI_DEFS = next; render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());
}

/* ===== BOOT ===== */
function boot_init(){
  document.getElementById('prev').addEventListener('click', ()=>nav_shift(-1));
  document.getElementById('next').addEventListener('click', ()=>nav_shift(1));
  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click', ()=>ui_switchTab(t.dataset.tab)));
  document.getElementById('btnAddTurno').addEventListener('click', ui_defsAdd);

  document.getElementById('startDate')?.addEventListener('change', ()=>{
    const date=document.getElementById('startDate').value || SETTINGS.date;
    const shift=SETTINGS.shift || 'S';
    SETTINGS = { date, shift };
    render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());
  });

  render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());
  ui_defsRenderList();

  document.body.classList.add('no-scroll');

  loadLogo();
  loadTabbarIcons();
  enableSwipe();
}
if (document.readyState === 'loading') { window.addEventListener('DOMContentLoaded', boot_init); } else { boot_init(); }

/* ===== SWIPE ===== */
function enableSwipe(){
  let startX=null, startY=null;
  grid.addEventListener('touchstart', e=>{
    const t=e.changedTouches[0]; startX=t.clientX; startY=t.clientY;
  }, {passive:true});
  grid.addEventListener('touchend', e=>{
    if(startX===null) return;
    const t=e.changedTouches[0];
    const dx=t.clientX-startX; const dy=t.clientY-startY;
    startX=startY=null;
    if(Math.abs(dx)>42 && Math.abs(dy)<40){ if(dx<0) nav_shift(1); else nav_shift(-1); }
  }, {passive:true});
}

/* ===== ASSET SVG ===== */
async function loadLogo() {
  try {
    const res = await fetch(`${app_base()}/svg/logo_polizia.svg`, { cache: 'no-store', credentials: 'same-origin' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const svgText = await res.text();
    const container = document.getElementById("logoContainer");
    if (container) container.innerHTML = svgText;
  } catch (err) { console.error("Errore /svg/logo_polizia.svg:", err); }
}
async function loadTabbarIcons(){
  try {
    const cal = await fetch(`${app_base()}/svg/calendar.svg`, { cache: 'no-store', credentials: 'same-origin' });
    if (cal.ok) { const txt = await cal.text(); const host = document.getElementById('icoCalendar'); if (host) host.innerHTML = txt; }

    const set = await fetch(`${app_base()}/svg/settings.svg`, { cache: 'no-store', credentials: 'same-origin' });
    if (set.ok) {
      const txt = await set.text(); const host = document.getElementById('icoSettings');
      if (host) { const temp = document.createElement('div'); temp.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${txt}</svg>`;
        temp.querySelectorAll('svg > *').forEach(n => host.appendChild(n.cloneNode(true)));
      }
    }
  } catch (err) { console.error('Errore icone tabbar:', err); }
}

/* ===== SERVICE WORKER invariato ===== */
(function(){
  if (!('serviceWorker' in navigator)) return;
  const BASE  = (location.hostname === 'localhost') ? '' : '/turni-pds';
  const SCOPE = `${BASE}/`;

  async function getSWVersion() {
    const url = `${BASE}/service-worker.js`;
    const res = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
    const text = await res.text();
    const m = text.match(/const\s+VERSION\s*=\s*['"]([^'"]+)['"]/);
    if (!m) throw new Error('VERSION non trovata');
    return m[1];
  }
  function setVersionLabel(fullVersion) {
    const m = fullVersion.match(/V\s*([0-9.]+)/i);
    const label = m ? m[1] : '';
    const el = document.getElementById('versionLabel');
    if (el) el.textContent = label;
  }
  async function registerSW(){
    try {
      const swVersion = await getSWVersion();
      setVersionLabel(swVersion);
      const SW_URL = `${BASE}/service-worker.js?v=${encodeURIComponent(swVersion)}`;
      const reg = await navigator.serviceWorker.register(SW_URL, { scope: SCOPE });
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing; if (!nw) return;
        nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) nw.postMessage({ type: 'SKIP_WAITING' }); });
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!window.__reloadedForSW) { window.__reloadedForSW = true; location.reload(); }
      });
      reg.update().catch(()=>{});
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(()=>{}); });
    } catch(e) {
      console.warn("SW registration failed:", e);
      const el = document.getElementById('versionLabel'); if (el) el.textContent = '';
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', registerSW); else registerSW();
})();
