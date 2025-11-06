// [JS-MAIN] Turni PDS — versione pulita (nessuna persistenza, nessun account)

"use strict";

// ======================= //
// UTILITIES               //
// ======================= //
function util_jsWeekdayUTC(d){ return (d.getUTCDay()+6)%7 } // Lunedì=0 … Domenica=6
function util_pad2(n){ return n.toString().padStart(2,'0') }
function util_fmtMonth(fmt,y,m){ return fmt.format(new Date(y,m,1)) }

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
const today   = new Date();
let   view    = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));

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
  const t = new Date();
  return { date: `${t.getFullYear()}-${util_pad2(t.getMonth()+1)}-${util_pad2(t.getDate())}`, shift: 'S' };
})();

// Helpers “effective” ora leggono solo RAM
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
  return (f && f.color) ? f.color : '#8e88ff';
}

// ======================= //
// RENDERING               //
// ======================= //
function render_createCellHTML({day, sun, sigla, isToday, startCol}){
  const classes = ['cell']; if (sun) classes.push('sun'); if (isToday) classes.push('today');
  const startAttr = startCol ? ` style="grid-column-start:${startCol}"` : '';

  const isGLAP = (sigla === 'GL' || sigla === 'AP');
  const label  = isGLAP ? sigla : ui_displayLabelFor(sigla);
  const color  = isGLAP ? null  : ui_colorForBase(sigla);

  let siglaSpan = '';
  if (label) {
    siglaSpan = isGLAP
      ? `<span class="sigla ${sigla==='GL'?'T-GL':'T-AP'}">${label}</span>`
      : `<span class="sigla" style="color:${color}">${label}</span>`;
  }
  return `<div class="${classes.join(' ')}"${startAttr}><span class="num">${util_pad2(day)}</span>${siglaSpan}</div>`;
}

function render_buildMonth(year,month){
  grid.innerHTML='';
  const first=new Date(Date.UTC(year,month,1));
  const last =new Date(Date.UTC(year,month+1,0));
  const lead =util_jsWeekdayUTC(first);
  monthLabel.textContent=util_fmtMonth(itMonth,year,month);

  for(let day=1; day<=last.getUTCDate(); day++){
    const d=new Date(Date.UTC(year,month,day));
    const isSun = util_jsWeekdayUTC(d)===6;
    const isT   = d.getUTCFullYear()===today.getFullYear() && d.getUTCMonth()===today.getMonth() && d.getUTCDate()===today.getDate();
    const sigla = shifts_codeForDate(d);
    const startCol = (day===1)? (lead+1) : undefined;
    grid.insertAdjacentHTML('beforeend', render_createCellHTML({day,sun:isSun,sigla,isToday:isT,startCol}));
  }
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
function ui_defsRenderList(){
  const list=defs_effective();
  const wrap=document.getElementById('turniList');
  wrap.innerHTML='';
  list.forEach((t,idx)=>{
    const row=document.createElement('div');
    row.className='settingsRow turni-grid';
    row.style.alignItems='center';

    const p = util_splitOrario(t.orario);
    row.innerHTML = [
      `<input value="${t.nome}" data-k="nome" data-i="${idx}" />`,
      `<input value="${t.sigla}" maxlength="4" class="siglaInput" data-k="sigla" data-i="${idx}" />`,
      `<textarea class="orarioArea" data-k="orarioMultiline" data-i="${idx}" rows="2">${p.start}\n${p.end}</textarea>`,
      `<div class="colorCell"><input value="${t.color || '#8e88ff'}" class="colorInput" data-k="color" data-i="${idx}" type="color" /></div>`,
      `<button type="button" class="iconbtn iconbtn-danger" data-act="del" data-i="${idx}">✕</button>`
    ].join('');

    wrap.appendChild(row);
  });

  wrap.querySelectorAll('button[data-act="del"]').forEach(b=>{
    b.addEventListener('click', ()=> ui_defsDelete(parseInt(b.dataset.i)));
  });

  wrap.querySelectorAll('input, textarea').forEach(inp=>{
    const h = ()=>{
      ui_defsEditInline(parseInt(inp.dataset.i), inp.dataset.k, inp.value);
      render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());
    };
    inp.addEventListener('input', h);
    inp.addEventListener('change', h);
  });
}

function ui_defsAdd(){
  const nome  = document.getElementById('newNome').value.trim();
  const sigla = document.getElementById('newSigla').value.trim().toUpperCase();
  const orTxt = document.getElementById('newOrario').value;
  const color = document.getElementById('newColor').value.trim() || '#8e88ff';
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

  // Glow: chiamata unica + listeners (niente doppioni)
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

  const SW_VERSION = '2025-11-04-03';
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
