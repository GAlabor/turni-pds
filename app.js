// [JS-MAIN] Turni PDS — versione con fix sicurezza/performance

"use strict";

// ======================= //
// UTILITIES               //
// ======================= //
function util_jsWeekdayUTC(d){ return (d.getUTCDay()+6)%7 } // Lunedì=0 … Domenica=6
function util_pad2(n){ return n.toString().padStart(2,'0') }
function util_fmtMonth(fmt,y,m){ return fmt.format(new Date(Date.UTC(y,m,1))) }

// Escaping base per testo da inserire in HTML
function esc(s){
  return String(s ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

// Valida colore in formato #rgb/#rrggbb/#rrggbbaa
function isSafeHexColor(s){
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(s||"").trim());
}

function util_splitOrario(s){
  const parts = String(s||'').split(/[-–—]/).map(x=>x.trim());
  return { start: parts[0]||'', end: parts[1]||'' };
}
function util_joinOrarioMultiline(txt){
  const [rawS='', rawE=''] = String(txt||'').split(/\n/);
  const s = (rawS || '').trim();
  const e = (rawE || '').trim();
  return (s || e) ? `${s}–${e}` : '';
}

// ======================= //
// STATO IN MEMORIA        //
// ======================= //
const itMonth = new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric'});

// Today coerente in UTC
const now = new Date();
const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

let view = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), 1));

const grid        = document.querySelector('.grid');
const monthLabel  = document.getElementById('monthLabel');

// Default turni e settings in RAM (niente localStorage)
const SHIFT_DEFAULTS = [
  { key:'S', nome:'Sera',       sigla:'S', orario:'18:55–00:08', color:'#8e88ff' },
  { key:'P', nome:'Pomeriggio', sigla:'P', orario:'12:55–19:08', color:'#c7a47b' },
  { key:'M', nome:'Mattina',    sigla:'M', orario:'06:55–13:08', color:'#f1a04f' },
  { key:'N', nome:'Notte',      sigla:'N', orario:'23:55–07:08', color:'#9aa3ad' },
  { key:'R', nome:'Riposo',     sigla:'R', orario:'—',           color:'#28a745' }
];

let TURNI_DEFS = SHIFT_DEFAULTS.map(x => ({...x})); // copia
let SETTINGS = (() => {
  const t = todayUTC;
  return { date: `${t.getUTCFullYear()}-${util_pad2(t.getUTCMonth()+1)}-${util_pad2(t.getUTCDate())}`, shift: 'S' };
})();

// Helpers “effective” leggono solo RAM
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
function ui_displayLabelFor(base){
  const f = defs_effective().find(x => x.key === base);
  return f && f.sigla ? f.sigla : base;
}
function ui_colorForBase(base){
  const f = defs_effective().find(x => x.key === base);
  return (f && isSafeHexColor(f.color)) ? f.color : '#8e88ff';
}

// ======================= //
// RENDERING               //
// ======================= //
function createCellElement({day, sun, sigla, isToday, startCol}){
  const cell = document.createElement('div');
  cell.className = 'cell';
  if (sun) cell.classList.add('sun');
  if (isToday) cell.classList.add('today');
  if (startCol) cell.style.gridColumnStart = String(startCol);

  const num = document.createElement('span');
  num.className = 'num';
  num.textContent = util_pad2(day);
  cell.appendChild(num);

  const isGLAP = (sigla === 'GL' || sigla === 'AP');
  const label  = isGLAP ? sigla : ui_displayLabelFor(sigla);

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

function render_buildMonth(year,month){
  // month label
  monthLabel.textContent = util_fmtMonth(itMonth,year,month);

  // costruisci fragment
  const frag = document.createDocumentFragment();
  const first=new Date(Date.UTC(year,month,1));
  const last =new Date(Date.UTC(year,month+1,0));
  const lead =util_jsWeekdayUTC(first);

  for(let day=1; day<=last.getUTCDate(); day++){
    const d=new Date(Date.UTC(year,month,day));
    const isSun = util_jsWeekdayUTC(d)===6;

    const isT =
      d.getUTCFullYear()===todayUTC.getUTCFullYear() &&
      d.getUTCMonth()===todayUTC.getUTCMonth() &&
      d.getUTCDate()===todayUTC.getUTCDate();

    const sigla = shifts_codeForDate(d);
    const startCol = (day===1)? (lead+1) : undefined;

    frag.appendChild(createCellElement({day,sun:isSun,sigla,isToday:isT,startCol}));
  }

  // flush in un colpo
  grid.replaceChildren(frag);
}

function nav_shift(delta){
  view=new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth()+delta, 1));
  render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());
}

function ui_switchTab(name){
  const isSettings = (name === 'settings');
  document.body.classList.toggle('hide-topbar', isSettings);
  document.body.classList.toggle('no-scroll', !isSettings);
  document.querySelectorAll('.tab').forEach(el =>
    el.classList.toggle('active', el.dataset.tab === name));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${name}`).classList.add('active');
  ui_updateTopbarGlowCenter();
}

// ======================= //
// CRUD TURNI (RAM)        //
// ======================= //
function buildTurnoRow(t, idx){
  const row = document.createElement('div');
  row.className = 'settingsRow turni-grid';
  row.style.alignItems = 'center';

  // Nome
  const c1 = document.createElement('div');
  const nome = document.createElement('input');
  nome.value = t.nome || '';
  nome.dataset.k = 'nome';
  nome.dataset.i = String(idx);
  c1.appendChild(nome);

  // Sigla
  const c2 = document.createElement('div');
  const sigla = document.createElement('input');
  sigla.value = t.sigla || '';
  sigla.maxLength = 4;
  sigla.className = 'siglaInput';
  sigla.dataset.k = 'sigla';
  sigla.dataset.i = String(idx);
  c2.appendChild(sigla);

  // Orario multiline
  const c3 = document.createElement('textarea');
  c3.className = 'orarioArea';
  c3.rows = 2;
  const p = util_splitOrario(t.orario);
  c3.value = (p.start || '') + '\n' + (p.end || '');
  c3.dataset.k = 'orarioMultiline';
  c3.dataset.i = String(idx);

  // Colore
  const c4wrap = document.createElement('div');
  c4wrap.className = 'colorCell';
  const color = document.createElement('input');
  color.type = 'color';
  color.value = isSafeHexColor(t.color) ? t.color : '#8e88ff';
  color.className = 'colorInput';
  color.dataset.k = 'color';
  color.dataset.i = String(idx);
  c4wrap.appendChild(color);

  // Delete
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'iconbtn iconbtn-danger';
  del.dataset.act = 'del';
  del.dataset.i = String(idx);
  del.textContent = '✕';

  // Monta griglia: 5 colonne
  row.appendChild(c1);
  row.appendChild(c2);
  const c3wrap = document.createElement('div');
  c3wrap.appendChild(c3);
  row.appendChild(c3wrap);
  row.appendChild(c4wrap);
  row.appendChild(del);

  // Eventi
  del.addEventListener('click', ()=> ui_defsDelete(idx));

  const onChange = (inp) => {
    ui_defsEditInline(parseInt(inp.dataset.i), inp.dataset.k, inp.value);
    // niente chiamata extra a render_buildMonth qui: la fa ui_defsEditInline
  };

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

  list.forEach((t,idx)=>{
    frag.appendChild(buildTurnoRow(t, idx));
  });

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
  ui_defsClearNew();
  ui_defsRenderList();
  render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());
}
function ui_defsClearNew(){
  document.getElementById('newNome').value = '';
  document.getElementById('newSigla').value = '';
  document.getElementById('newOrario').value = '';
  document.getElementById('newColor').value = '#8e88ff';
}
function ui_defsDelete(i){
  TURNI_DEFS = TURNI_DEFS.filter((_,idx)=>idx!==i);
  ui_defsRenderList();
  render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());
}
function ui_defsEditInline(i,key,val){
  if(!TURNI_DEFS[i]) return;
  const next = [...TURNI_DEFS];
  if(key==='orarioMultiline'){
    next[i] = { ...next[i], orario: util_joinOrarioMultiline(val) };
  }else if(key==='color'){
    next[i] = { ...next[i], color: isSafeHexColor(val) ? val : next[i].color };
  }else if(key==='sigla'){
    next[i] = { ...next[i], sigla: String(val||'').toUpperCase() };
  }else{
    next[i] = { ...next[i], [key]: val };
  }
  TURNI_DEFS = next;
  render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());
}

// ======================= //
// SETTINGS (RAM)          //
// ======================= //
function ui_settingsInit(){
  document.getElementById('startDate').value = SETTINGS.date;
  ui_defsRenderList();
}
function ui_settingsApply(){
  const date=document.getElementById('startDate').value || SETTINGS.date;
  const shift=SETTINGS.shift || 'S';
  SETTINGS = { date, shift };
  render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());
}

// ======================= //
// GLOW CENTER             //
// ======================= //
function ui_updateTopbarGlowCenter(){
  const bar = document.querySelector('.topbar');
  if(!bar) return;
  const r = bar.getBoundingClientRect();
  const cx = r.left + r.width/2;
  const cy = r.top  + r.height/2;
  document.documentElement.style.setProperty('--cx', cx + 'px');
  document.documentElement.style.setProperty('--cy', cy + 'px');
  document.documentElement.style.setProperty('--bar-h', r.height + 'px');
}

// ======================= //
// BOOTSTRAP               //
// ======================= //
function boot_init(){
  document.getElementById('prev').addEventListener('click', ()=>nav_shift(-1));
  document.getElementById('next').addEventListener('click', ()=>nav_shift(1));
  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click', ()=>ui_switchTab(t.dataset.tab)));
  document.getElementById('btnAddTurno').addEventListener('click', ui_defsAdd);

  ui_settingsInit();
  render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());

  const sd = document.getElementById('startDate');
  if (sd) sd.addEventListener('change', ui_settingsApply);

  document.body.classList.add('no-scroll');

  // Glow: chiamata unica + listeners
  ui_updateTopbarGlowCenter();
  addEventListener('resize', ui_updateTopbarGlowCenter, { passive:true });
  addEventListener('scroll', ui_updateTopbarGlowCenter, { passive:true });

  loadLogo();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', boot_init);
} else {
  boot_init();
}

// Logo SVG (solo estetica)
async function loadLogo() {
  try {
    const res = await fetch("logo_polizia.svg");
    const svgText = await res.text();
    const container = document.getElementById("logoContainer");
    if (container) container.innerHTML = svgText;
  } catch (err) {
    console.error("Errore nel caricamento del logo.svg:", err);
  }
}

// SERVICE WORKER — solo asset, nessun dato utente
(function(){
  if (!('serviceWorker' in navigator)) return;

  const SW_VERSION = '2025-11-06-04';
  const BASE  = (location.hostname === 'localhost') ? '' : '/turni-pds';
  const SW_URL = `${BASE}/service-worker.js?v=${SW_VERSION}`;
  const SCOPE  = `${BASE}/`;

  async function registerSW(){
    try {
      const reg = await navigator.serviceWorker.register(SW_URL, { scope: SCOPE });

      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });

      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            nw.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!window.__reloadedForSW) {
          window.__reloadedForSW = true;
          location.reload();
        }
      });

      reg.update().catch(()=>{});
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(()=>{});
      });
    } catch(e) {
      console.warn("Service Worker registration failed:", e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerSW);
  } else {
    registerSW();
  }
})();
