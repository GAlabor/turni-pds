// [JS-MAIN] Script principale pagina Turni PD //

  "use strict";

  // ======================= //
  // inizio JSS (script)     //
  // ======================= //

  // =========================================================
  // [FN: util_jsWeekdayUTC] Lunedì=0 … Domenica=6 (UTC)
  // =========================================================
  function util_jsWeekdayUTC(d){ return (d.getUTCDay()+6)%7 }

  // =========================================================
  // [FN: util_pad2] Padding numeri a 2 cifre
  // =========================================================
  function util_pad2(n){ return n.toString().padStart(2,'0') }

  // =========================================================
  // [FN: util_fmtMonth] “ottobre 2025”
  // =========================================================
  function util_fmtMonth(fmt,y,m){ return fmt.format(new Date(y,m,1)) }

  // =========================================================
  // [FN: util_splitOrario / util_joinOrarioMultiline]
  // =========================================================
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

  // =======================================================
  // [STORAGE PAYLOAD] JSON che salveremo (mock AppData)
  // =======================================================
  function storage_buildPayload(){
    return {
      _meta:{
        app:"Turni Polizia di Stato",
        version:1,
        savedAt:new Date().toISOString()
      },
      settings: settings_effective(),     // {date, shift}
      defs:     defs_effective()          // lista turni personalizzati
    };
  }
  function storage_buildFilename(){
    const now = new Date();
    const y = now.getFullYear();
    const m = util_pad2(now.getMonth()+1);
    return `${y}-${m}-TURNI.json`;
  }

  // =========================================================
  // [BLOCK: JS-STATE]
  // =========================================================
  const itMonth = new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric'});
  const today   = new Date();
  let   view    = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));

  const grid        = document.querySelector('.grid');
  const monthLabel  = document.getElementById('monthLabel');
// const todayHeader = document.getElementById('todayHeader'); PULIZIA

  // =========================================================
  // [BLOCK: STORAGE KEYS] LocalStorage + default turni
  // =========================================================
  const LS_KEY   = 'cal_turno_start_v1';
  const LS_TURNS = 'cal_turni_defs_v2';

  const SHIFT_DEFAULTS = [
    { key:'S', nome:'Sera',       sigla:'S', orario:'18:55–00:08', color:'#8e88ff' },
    { key:'P', nome:'Pomeriggio', sigla:'P', orario:'12:55–19:08', color:'#c7a47b' },
    { key:'M', nome:'Mattina',    sigla:'M', orario:'06:55–13:08', color:'#f1a04f' },
    { key:'N', nome:'Notte',      sigla:'N', orario:'23:55–07:08', color:'#9aa3ad' },
    { key:'R', nome:'Riposo',     sigla:'R', orario:'—',           color:'#28a745' }
  ];

  // =========================================================
  // [FN: defs_*] Gestione definizioni turni personalizzate
  // =========================================================
  function defs_load(){ try{ return JSON.parse(localStorage.getItem(LS_TURNS))||null }catch{ return null } }
  
function defs_save(list){
  // salva SOLO quello che gli passi, senza altre magie
  localStorage.setItem(LS_TURNS, JSON.stringify(list));
  // niente autosave qui, perché ora lo vogliamo solo manuale
}

function defs_effective(){
  // leggiamo quello che c'è
  const l = defs_load();

  // se c’è roba valida, la restituiamo e BASTA
  if (Array.isArray(l) && l.length) {
    return l;
  }

  // se non c’è niente, usiamo i default
  // e in questo caso SOLTANTO li salviamo
  const out = SHIFT_DEFAULTS.map(item => ({
    key:   item.key || item.sigla || 'S',
    nome:  item.nome || '',
    sigla: item.sigla || '',
    orario:item.orario || '',
    color: item.color || '#8e88ff'
  }));

  defs_save(out);
  return out;
}

  // =========================================================
  // [FN: settings_*] Primo giorno (data+base)
  // =========================================================
  function settings_load(){ try{ return JSON.parse(localStorage.getItem(LS_KEY))||null }catch{ return null } }
  function settings_save(obj){
  localStorage.setItem(LS_KEY, JSON.stringify(obj));
  // segna modifiche e tenta autosalvataggio (coalescenza interna)
  autosave_schedule(400);
}

  function settings_effective(){
    const s=settings_load();
    if(s && s.date && s.shift) return s;
    const t=new Date();
    const def={date:`${t.getFullYear()}-${util_pad2(t.getMonth()+1)}-${util_pad2(t.getDate())}`, shift:'S'};
    settings_save(def); return def;
  }

  // =========================================================
  // [FN: shifts_codeForDate] ciclo S→P→M→N→R con GL/AP
  // =========================================================
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

  // =========================================================
  // [FN: ui_displayLabelFor / ui_colorForBase]
  // =========================================================
  function ui_displayLabelFor(base){
    const f = defs_effective().find(x => x.key === base);
    return f && f.sigla ? f.sigla : base;
  }
  function ui_colorForBase(base){
    const f = defs_effective().find(x => x.key === base);
    return (f && f.color) ? f.color : '#8e88ff';
  }

  // =========================================================
  // [FN: render_*] Celle + intero mese
  // =========================================================
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

  // =========================================================
  // [FN: nav_shift] prev/next mese
  // =========================================================
  function nav_shift(delta){
    view=new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth()+delta, 1));
    render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());
  }

  // =========================================================
  // [FN: ui_switchTab] calendario <-> impostazioni
  // =========================================================
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

  // =========================================================
  // [FN: ui_defsRenderList] lista turni
  // =========================================================
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

  // =========================================================
  // [FN: CRUD turni]
  // =========================================================
  function ui_defsAdd(){
  const nome  = document.getElementById('newNome').value.trim();
  const sigla = document.getElementById('newSigla').value.trim().toUpperCase();
  const orTxt = document.getElementById('newOrario').value;
  const color = document.getElementById('newColor').value.trim() || '#8e88ff';
  if(!nome || !sigla) return;
  const orario = util_joinOrarioMultiline(orTxt);
  const list=defs_effective();
  list.push({ key:'X'+Date.now(), nome, sigla, orario, color });
  defs_save(list);
  ui_defsClearNew();
  ui_defsRenderList();
  render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());
  autosave_schedule();
}
  function ui_defsClearNew(){
    document.getElementById('newNome').value = '';
    document.getElementById('newSigla').value = '';
    document.getElementById('newOrario').value = '';
    document.getElementById('newColor').value = '#8e88ff';
  }
  function ui_defsDelete(i){
  const list=defs_effective();
  list.splice(i,1);
  defs_save(list);
  ui_defsRenderList();
  render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());
  autosave_schedule();
}

  function ui_defsEditInline(i,key,val){
  const list=defs_effective();
  if(!list[i]) return;
  if(key==='orarioMultiline'){
    list[i].orario = util_joinOrarioMultiline(val);
  }else{
    list[i][key]=val;
  }
  defs_save(list);
  render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());
  autosave_schedule();
}

  // =========================================================
  // [FN: ui_settings*]
  // =========================================================
  function ui_settingsInit(){
    const c=settings_effective();
    document.getElementById('startDate').value=c.date;
    ui_defsRenderList();
  }
  function ui_settingsApply(){
  __hasUnsavedChanges = true;
  const date=document.getElementById('startDate').value;
  const shift=settings_effective().shift || 'S';
  settings_save({date,shift});
  render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());
  autosave_schedule();
}

  // =========================================================
  // [FN: ui_updateTopbarGlowCenter] allinea glow
  // =========================================================
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

// =========================================================
// [GOOGLE AUTH v2 - GIS popup + access_token]
// =========================================================

// client web
const GOOGLE_CLIENT_ID = "280688458605-2l6l10drhsrhfct6540divn87h769aif.apps.googleusercontent.com";

// scope che ci servono
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.appdata"
].join(" ");

// storage keys
const LS_GOOGLE_TOKEN       = "google_access_token";
const LS_GOOGLE_EXPIRES_AT  = "google_access_expires_at";
const LS_GOOGLE_IDTOKEN     = "google_id_token";
const LS_GOOGLE_EMAIL       = "google_user_email";
const LS_GOOGLE_PHOTO       = "google_user_photo";
const LS_GOOGLE_REFRESH     = "google_refresh_token";

let __gisLoaded   = false;
let __gisLoading  = false;
let __gisTokenCli = null;

// carica lo script ufficiale Google Identity Services
function g_loadGisScript() {
  return new Promise((resolve, reject) => {
    // Se GIS è già carico, esci subito
    if (typeof window !== "undefined"
        && window.google
        && google.accounts
        && (google.accounts.id || google.accounts.oauth2)) {
      __gisLoaded = true;
      __gisLoading = false;
      return resolve();
    }

    if (__gisLoaded) {
      return resolve();
    }
    if (__gisLoading) {
      const iv = setInterval(() => {
        if (__gisLoaded) {
          clearInterval(iv);
          resolve();
        }
      }, 80);
      return;
    }

    __gisLoading = true;
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => {
      __gisLoaded = true;
      __gisLoading = false;
      resolve();
    };
    s.onerror = () => {
      __gisLoading = false;
      reject(new Error("Impossibile caricare Google Identity Services."));
    };
    document.head.appendChild(s);
  });
}


// token valido?
// Sei connesso SOLO se:
// - hai un access token
// - NON è scaduto
// - hai anche l'email dell'utente
// Connesso se e solo se esiste un access token NON scaduto.
// L'email NON è più requisito (verrà recuperata in background se manca).
function g_isConnected(){
  const tok = localStorage.getItem(LS_GOOGLE_TOKEN);
  const exp = parseInt(localStorage.getItem(LS_GOOGLE_EXPIRES_AT) || "0", 10);
  if (!tok) return false;
  if (Date.now() >= (exp - 10_000)) return false;
  return true;
}

  // UI: aggiorna le icone/header in base allo stato (versione stabile, no refresh inutili)
async function g_updateIcons() {
  // Evita di chiamare Render se non esiste alcun token locale
  const hasToken = !!localStorage.getItem(LS_GOOGLE_TOKEN);
  if (hasToken) {
    try {
      await g_ensureValidAccess();
    } catch (e) {
      console.warn("g_updateIcons: token non rinnovabile:", e.message || e);
    }
  }

  const on = g_isConnected?.() || false;
  const photo = on ? (localStorage.getItem(LS_GOOGLE_PHOTO) || "") : "";

  const h   = document.getElementById("acctBtnHeader");
  const s   = document.getElementById("acctBtnSettings");
  const st2 = document.getElementById("cloudStatusSettings");
  const dis = document.getElementById("acctDisconnect");

  // Header: avatar o pulsante "Accedi"
  [h, s].forEach(el => {
    if (!el) return;

    if (el.id === "acctBtnHeader") {
      if (on) {
        el.classList.remove("acct-login", "dbx-off");
        el.classList.add("dbx-on");
        el.innerHTML = (photo
          ? `<img src="${photo}" alt="Avatar" style="width:28px;height:28px;border-radius:50%;object-fit:cover">`
          : `<svg viewBox="0 0 24 24" aria-hidden="true" style="width:28px;height:28px">
               <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z" fill="currentColor"/>
             </svg>` )
          + `<span class="acct-badge" aria-hidden="true"></span>`;
      } else {
        el.classList.remove("dbx-on");
        el.classList.add("acct-login", "dbx-off");
        el.innerHTML = `<span class="acct-login-label">Accedi</span>`;
      }
    } else {
      el.classList.toggle("dbx-on",  on);
      el.classList.toggle("dbx-off", !on);
    }
  });

  if (st2) st2.textContent = on ? "✅ Connesso" : "❌ Non collegato";
  if (dis) dis.style.display = "none";

  // Riallinea visibilità del menù se serve
  if (typeof acct_menuUpdateVisibility === "function") {
    acct_menuUpdateVisibility();
  }
}



// login nuova: prende token con GIS, salva mail/foto, aggiorna UI.

async function g_login() {
  try {
    // 1. ci assicuriamo di avere lo script GIS
    await g_loadGisScript();

    // 2. se non abbiamo ancora il client lo creiamo
    if (!__gisTokenCli && window.google && google.accounts && google.accounts.oauth2) {
      __gisTokenCli = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPES,
        callback: async (response) => {
          // --- callback del token ---
          if (!response || !response.access_token) {
            alert("Accesso Google fallito (nessun access_token).");
            return;
          }

          // 2.a salviamo token + scadenza
          const expiresAt = Date.now() + (response.expires_in ? (response.expires_in * 1000) : 3_400_000);
          localStorage.setItem(LS_GOOGLE_TOKEN, response.access_token);
          localStorage.setItem(LS_GOOGLE_EXPIRES_AT, String(expiresAt));

          // 2.b aggiorna subito icone/menu
          g_updateIcons && g_updateIcons();

          // 2.c proviamo a leggere userinfo per prendere email e foto
          let gotEmail = false;
          try {
            const r = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
              headers: { Authorization: "Bearer " + response.access_token }
            });
            if (r.ok) {
              const info = await r.json();
              if (info.email) {
                localStorage.setItem(LS_GOOGLE_EMAIL, info.email);
                gotEmail = true;
              }
              if (info.picture) {
                localStorage.setItem(LS_GOOGLE_PHOTO, info.picture);
              }
              g_updateIcons && g_updateIcons();
            }
          } catch (_) {
            // non blocchiamo il login
          }

          // 2.d controlliamo che abbia davvero dato Drive
          const okDrive = await g_testDrivePermission();
          if (!okDrive) {
            g_disconnect(true);
            alert("Non hai fornito le autorizzazioni necessarie al salvataggio su Drive.\nRifai l’accesso e metti la spunta.");
            return;
          }

          // 2.e se non siamo riusciti a leggere userinfo, almeno togliamo l’eventuale mail vecchia
          if (!gotEmail) {
            // NON sappiamo chi è → niente mail vecchia
            localStorage.removeItem(LS_GOOGLE_EMAIL);
            g_updateIcons && g_updateIcons();
          }

          // 2.f torna al calendario e fai import auto (come avevi)
          if (typeof ui_switchTab === "function") {
            ui_switchTab("calendar");
          }
          if (typeof storage_importFromGoogleAuto === "function") {
            storage_importFromGoogleAuto();
          }
        }
      });
    }

    if (!__gisTokenCli) {
      alert("Google Identity non inizializzato.");
      return;
    }

    // 3. chiediamo il token (prima volta mostra lo scope brutto)
    __gisTokenCli.requestAccessToken({
      prompt: "consent"
    });

  } catch (e) {
    console.error(e);
    alert("Errore durante l’accesso a Google.\n" + (e && e.message ? e.message : ""));
  }
}

// Disconnessione: revoca e pulizia locale
// Disconnessione: revoca e pulizia + reset UI immediato
let __lastDisconnectAt = 0;
async function g_disconnect(silent = false){
  // anti doppio trigger
  const now = Date.now();
  if (now - __lastDisconnectAt < 500) return;
  __lastDisconnectAt = now;

  if (!silent) {
    const ok = confirm("Vuoi disconnettere l'app da Google?");
    if (!ok) return;
  }

  // 1) Chiudi subito il menù (se aperto)
  try { acct_menuToggle(false); } catch {}

  // 2) Forza SUBITO lo stato UI a "Accedi" (niente avatar che resta lì)
  const h   = document.getElementById("acctBtnHeader");
  const s   = document.getElementById("acctBtnSettings");
  const st2 = document.getElementById("cloudStatusSettings");
  const dis = document.getElementById("acctDisconnect");

  if (h){
    h.classList.remove("dbx-on");
    h.classList.add("acct-login","dbx-off");
    h.innerHTML = `<span class="acct-login-label">Accedi</span>`;
  }
  if (s){
    s.classList.add("dbx-off");
    s.classList.remove("dbx-on");
  }
  if (st2) st2.textContent = "❌ Non collegato";
  if (dis) dis.style.display = "none";

  // 3) Pulisci token localmente (best-effort revoke)
  try{
    const tok = localStorage.getItem(LS_GOOGLE_TOKEN);
    if(tok){
      fetch("https://oauth2.googleapis.com/revoke?token="+encodeURIComponent(tok), { method:"POST" }).catch(()=>{});
    }
  }finally{
    localStorage.removeItem(LS_GOOGLE_TOKEN);
    localStorage.removeItem(LS_GOOGLE_EXPIRES_AT);
    localStorage.removeItem(LS_GOOGLE_IDTOKEN);
    localStorage.removeItem(LS_GOOGLE_EMAIL);
    localStorage.removeItem(LS_GOOGLE_PHOTO);
    localStorage.removeItem(LS_GOOGLE_REFRESH);
  }

  // 4) Riallinea visibilità del menù (da disconnessi non deve esistere)
  try { await acct_menuUpdateVisibility(); } catch {}

  // 5) Torna al CALENDARIO (coerente col tuo flusso) e aggiorna icone
  try { ui_switchTab("calendar"); } catch {}
  try { g_updateIcons(); } catch {}
}


// bind del pulsante "disconnetti" nelle impostazioni (versione unica e stabile)
function g_bindIconClicks(){
  const dis = document.getElementById("acctDisconnect");
  if (!dis) return;

  // rimuove eventuali listener precedenti per evitare doppi click
  dis.replaceWith(dis.cloneNode(true));
  const newDis = document.getElementById("acctDisconnect");

  // collega il click alla disconnessione
  newDis.addEventListener("click", () => g_disconnect(false));
}

// Verifica che Drive sia realmente autorizzato (spunta data)
async function g_testDrivePermission() {
  try {
    await drive_request(
      "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&pageSize=1&fields=files(id)"
    );
    return true;
  } catch (e) {
    console.warn("Drive non autorizzato:", e);
    showSaveStatus("❌ Manca il permesso Drive (spunta non data)", "#b91c1c");
    return false;
  }
}

// === Recupera info utente Google ===
async function g_fetchUserInfo() {
  const tok = localStorage.getItem(LS_GOOGLE_TOKEN);
  if (!tok) return null;

  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        "Authorization": "Bearer " + tok
      }
    });
    if (!res.ok) return null;

    const info = await res.json();

    if (info.email) {
      localStorage.setItem(LS_GOOGLE_EMAIL, info.email);
    }
    if (info.picture) {
      localStorage.setItem(LS_GOOGLE_PHOTO, info.picture);
    }

    if (typeof g_updateIcons === "function") {
      g_updateIcons();
    }

    return info;
  } catch (err) {
    console.warn("g_fetchUserInfo: errore nel leggere userinfo", err);
    return null;
  }
}

// Rinnova l'access token chiedendolo alla tua mini-API su Render
async function g_refreshAccessToken(){
  // se abbiamo l'email dell'utente, la mandiamo, altrimenti va bene anche senza
  const email = localStorage.getItem(LS_GOOGLE_EMAIL) || null;

  const res = await fetch("https://turni-mini-api.onrender.com/oauth2/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(email ? { email } : {})
  });

  if (!res.ok) {
    // qui il server può rispondere: {error:"No refresh token yet"}
    const txt = await res.text().catch(() => "");
    throw new Error("Impossibile rinnovare il token via mini-API: " + txt);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Risposta mini-API senza access_token");
  }

  // data.expires_in arriva tipo 3599 secondi → lo portiamo a ms
  const expiresAt = Date.now() + ((data.expires_in || 3600) * 1000) - 15_000;

  // salviamo ESATTAMENTE come facevi tu prima
  localStorage.setItem(LS_GOOGLE_TOKEN, data.access_token);
  localStorage.setItem(LS_GOOGLE_EXPIRES_AT, String(expiresAt));

  g_updateIcons?.();

  return data.access_token;
}


// Garantisce un access token valido, con retry più paziente per Render/Firestore
async function g_ensureValidAccess() {
  const tok = localStorage.getItem(LS_GOOGLE_TOKEN);
  const exp = parseInt(localStorage.getItem(LS_GOOGLE_EXPIRES_AT) || "0", 10);

  // Se non c'è token locale → niente refresh
  if (!tok) throw new Error("Nessun token locale disponibile");

  // Se ancora valido → restituisci subito
  if (Date.now() < (exp - 10_000)) {
    return tok;
  }

  const email = localStorage.getItem(LS_GOOGLE_EMAIL) || "";
  const url   = "https://turni-mini-api.onrender.com/oauth2/refresh";
  const body  = email ? { email } : {};

  const attempt = async (label) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`${label} HTTP ${res.status}`);

    const data = await res.json();
    if (!data.access_token) throw new Error(`${label} senza access_token`);

    const newExp = Date.now() + (data.expires_in ? (data.expires_in * 1000) : 3_400_000);
    localStorage.setItem(LS_GOOGLE_TOKEN, data.access_token);
    localStorage.setItem(LS_GOOGLE_EXPIRES_AT, String(newExp));
    if (data.email && !localStorage.getItem(LS_GOOGLE_EMAIL)) {
      localStorage.setItem(LS_GOOGLE_EMAIL, data.email);
    }
    return data.access_token;
  };

  try {
    // Primo tentativo immediato
    return await attempt("refresh1");
  } catch (e1) {
    const msg1 = String(e1?.message || "");

    // Se è 4xx o 5xx → attendi fino a 3 s e ritenta una volta
    if (msg1.includes("HTTP 4") || msg1.includes("HTTP 5")) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        return await attempt("refresh2");
      } catch (e2) {
        console.warn("g_ensureValidAccess: doppio fallimento refresh:", e2.message || e2);
      }
    }

    // Dopo due fallimenti → logout locale (senza spammare errori)
    localStorage.removeItem(LS_GOOGLE_TOKEN);
    localStorage.removeItem(LS_GOOGLE_EXPIRES_AT);
    console.warn("g_ensureValidAccess: refresh fallito definitivamente, logout locale.");
    throw e1;
  }
}


// === MENU OMINO: toggle e azioni ===

async function acct_menuUpdateVisibility(){
  const m = document.getElementById("acctMenu");
  if(!m) return;

  // se sembri disconnesso, prova un refresh veloce per coerenza
  let on = (typeof g_isConnected === "function") ? g_isConnected() : false;
  if (!on) {
    try { await g_ensureValidAccess(); on = g_isConnected(); } catch {}
  }

  // Se NON connesso, il menù non si deve proprio vedere
  if (!on) {
    m.style.display = "none";
    m.style.left    = "-9999px";
    m.style.top     = "-9999px";
    m.setAttribute("aria-hidden", "true");
    m.classList.remove("show");
    return;
  }

  // Connesso: non c'è più da mostrare/nascondere voci diverse.
  // Le tre voci (save/sync/backup) sono sempre presenti.
}


// Aggiorna la testatina del menu ("Sincronizzazione attiva" / "Non collegato")
function acct_menuRenderHeadStatus(){
  const on = g_isConnected?.() || false;
  const el = document.getElementById("acctHeadStatus");
  if (!el) return;

  if (on){
    el.textContent = "Sincronizzazione attiva";
    el.classList.add("is-on");
    el.classList.remove("is-off");
  } else {
    el.textContent = "Non collegato";
    el.classList.add("is-off");
    el.classList.remove("is-on");
  }
}

function acct_menuToggle(show){
  // Sposta il menu nel <body> per evitare clipping con la topbar
  acct_menuPortalize();

  const m   = document.getElementById("acctMenu");
  const btn = document.getElementById("acctBtnHeader");
  if(!m || !btn) return;

  const willShow = (typeof show === "boolean") ? show : (m.style.display === "none");

  // CHIUSURA
  if (!willShow){
    m.style.display = "none";
    m.style.left    = "-9999px";
    m.style.top     = "-9999px";
    m.setAttribute("aria-hidden", "true");
    btn.setAttribute("aria-expanded", "false");
    m.classList.remove("show");
    return;
  }

  // APERTURA
  m.style.display = "block";
  m.style.left = "-9999px";
  m.style.top  = "-9999px";
  m.setAttribute("aria-hidden", "false");
  btn.setAttribute("aria-expanded", "true");
  m.classList.add("show");

  // Aggiorna subito le voci e la testatina (verde/grigio)
  acct_menuUpdateVisibility();

  // Posizionamento dopo il reflow
  requestAnimationFrame(()=>{
    const r   = btn.getBoundingClientRect();
    const gap = 8;
    const vw  = window.innerWidth;
    const vh  = window.innerHeight;

    const mb  = m.getBoundingClientRect();
    const mw  = Math.max(200, mb.width  || 200);
    const mh  = Math.max( 80, mb.height ||  80);

    let left = Math.min(Math.max(12, r.right - mw), vw - mw - 12);
    let top  = Math.min(r.bottom + gap, vh - mh - 12);
    if (r.left + mw + 12 > vw) left = Math.max(12, vw - mw - 12);

    m.style.left = left + "px";
    m.style.top  = top  + "px";
  });
}

function acct_menuBind() {
  const btn = document.getElementById("acctBtnHeader");
  const m   = document.getElementById("acctMenu");
  if(!btn || !m) return;

  // 1) Click header:
  //    - NON connesso → avvia login (nessun menu)
  //    - CONNESSO     → toggle del menu
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // se sembri offline, prova refresh silenzioso
    if (!g_isConnected?.()) {
      try { await g_ensureValidAccess(); } catch {}
    }

    if (!g_isConnected?.()) {
      // apri direttamente il popup Google
      g_login();
      return;
    }

    // connesso → apri/chiudi menu
    acct_menuToggle();
  });

  // 2) Azioni del menu (solo 3 voci: save, sync, backup)
  m.addEventListener("click", async (e) => {
    const t = e.target.closest(".acct-item");
    if(!t) return;
    e.preventDefault();
    e.stopPropagation();

    const act = t.getAttribute("data-act");

    if (act === "save") {
      acct_menuToggle(false);
      try { await storage_saveToGoogle(); } catch {}
      return;
    }

    if (act === "sync") {
      acct_menuToggle(false);
      try { await storage_syncNewestFromDrive(); } catch {}
      return;
    }

    if (act === "backup") {
      acct_menuToggle(false);
      try { await storage_importBackupFromGoogle(); } catch {}
      return;
    }

    if (act === "logout") {
    acct_menuToggle(false);
    g_disconnect(false);
    return;
  }
  });

  // 3) Click fuori: chiudi (ma ignora click dentro menù o sul bottone)
  document.addEventListener("click", (e)=>{
    if (!m.classList.contains("show")) return;
    if (e.target.closest("#acctMenu")) return;
    if (e.target.closest("#acctBtnHeader")) return;
    acct_menuToggle(false);
  }, { capture:true });

  // 4) Esc per chiudere
  document.addEventListener("keydown", (e)=>{
    if (e.key === "Escape" && m.classList.contains("show")) {
      acct_menuToggle(false);
    }
  });

  // 5) Quando si aggiornano le icone, riallinea la visibilità del menù
  const _g_updateIcons = g_updateIcons;
  g_updateIcons = function(){
    _g_updateIcons();
    acct_menuUpdateVisibility();
  };
}


// Sposta il menu nel <body> per evitare qualsiasi clipping/stacking con la topbar
function acct_menuPortalize(){
  const m = document.getElementById("acctMenu");
  if (m && m.parentElement !== document.body) {
    document.body.appendChild(m);
  }
}

g_updateIcons();


// =========================================================
// [BLOCK: STORAGE SAVE/IMPORT] Drive AppData
// =========================================================

const DRIVE_FILENAME = "TURNI.json";
const DRIVE_BACKUP_NAME = "TURNI.backup.json";
let __lastSavedSnapshot = null; // firma dell’ultimo payload salvato sul cloud
let __hasUnsavedChanges = false; // segna se ci sono modifiche non salvate
const DRIVE_VERSION_PREFIX = "TURNI-";               // es. TURNI-2025-10-30-12-18-05.json
const DRIVE_MAX_VERSIONS  = 9;                       // quante versioni tenere


// Helper: richiesta autenticata a Drive API (con auto refresh e 1 retry)
async function drive_request(url, opts = {}) {
  // Assicura un access token valido (o prova refresh)
  try { await g_ensureValidAccess(); } catch { throw new Error("Non autenticato a Google."); }

  let tok = localStorage.getItem(LS_GOOGLE_TOKEN);

  const doFetch = async () => {
    const headers = Object.assign(
      { Authorization: "Bearer " + tok },
      opts.headers || {}
    );
    return fetch(url, Object.assign({}, opts, { headers }));
  };

  // Primo tentativo
  let res = await doFetch();

  // Se è scaduto nel frattempo, prova UNA volta a rinfrescare e ritentare
  if (res.status === 401 || res.status === 403) {
    try {
      tok = await g_refreshAccessToken();
      res = await doFetch();
    } catch {
      // se anche il refresh fallisce, lasceremo gestire sotto
    }
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Drive API error ${res.status}: ${txt}`);
  }
  return res;
}

// Trova per nome nell'appDataFolder
async function drive_findByName(name) {
  const q = encodeURIComponent(
    `name = '${name}' and 'appDataFolder' in parents and trashed = false`
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=appDataFolder&fields=files(id,name,modifiedTime)&pageSize=1&orderBy=modifiedTime desc`;
  const res = await drive_request(url);
  const json = await res.json();
  return (json.files && json.files[0]) ? json.files[0] : null;
}

// Wrapper: trova il canonico
async function drive_findCanonical() {
  return drive_findByName(DRIVE_FILENAME);
}

// Lista tutte le versioni tipo TURNI-YYYY-MM-DD-HH-mm-ss.json
async function drive_listVersions() {
  const q = encodeURIComponent(
    `name contains '${DRIVE_VERSION_PREFIX}' and 'appDataFolder' in parents and trashed = false`
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=appDataFolder&fields=files(id,name,modifiedTime)&pageSize=100&orderBy=modifiedTime desc`;
  const res = await drive_request(url);
  const json = await res.json();
  return Array.isArray(json.files) ? json.files : [];
}

// Crea un nome versione con timestamp
function drive_buildVersionedName() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm   = pad(d.getMonth() + 1);
  const dd   = pad(d.getDate());
  const hh   = pad(d.getHours());
  const mi   = pad(d.getMinutes());
  const ss   = pad(d.getSeconds());
  return `${DRIVE_VERSION_PREFIX}${yyyy}-${mm}-${dd}-${hh}-${mi}-${ss}.json`;
}

// Cancella su Drive per id (best effort)
async function drive_deleteById(fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  try {
    await drive_request(url, { method: "DELETE" });
  } catch (e) {
    // se è un 404 lo ignoriamo, vuol dire che non c'è più e va bene così
    if (e && e.message && e.message.includes("404")) {
      return;
    }
    throw e;
  }
}


// Crea o aggiorna via upload multipart (metadata + contenuto)
async function drive_upload_json(contentObj, existingId = null) {
  // metadata base, valido SEMPRE
  const metadata = {
    name: DRIVE_FILENAME,
    mimeType: "application/json"
  };

  // se è una CREAZIONE (POST) allora si può indicare il parent
  const isCreate = !existingId;
  if (isCreate) {
    metadata.parents = ["appDataFolder"];
  }

  const boundary = "foo_bar_" + Math.random().toString(36).slice(2);
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) + `\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(contentObj) + `\r\n` +
    `--${boundary}--`;

  const method = isCreate ? "POST" : "PATCH";
  const url = isCreate
    ? `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`
    : `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`;

  const res = await drive_request(url, {
    method,
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body
  });
  return res.json();
}

// Crea o aggiorna un file con nome specifico (usato per backup)
async function drive_upload_named_json(name, contentObj, existingId = null) {
  const metadata = {
    name,
    mimeType: "application/json"
  };

  const isCreate = !existingId;
  if (isCreate) {
    metadata.parents = ["appDataFolder"];
  }

  const boundary = "foo_bar_" + Math.random().toString(36).slice(2);
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) + `\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(contentObj) + `\r\n` +
    `--${boundary}--`;

  const method = isCreate ? "POST" : "PATCH";
  const url = isCreate
    ? `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`
    : `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`;

  const res = await drive_request(url, {
    method,
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body
  });
  return res.json();
}

// Scarica il contenuto del file (alt=media)
async function drive_download_json(fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await drive_request(url);
  return res.json();
}

// DEBUG: elenca tutto quello che c'è nell'appDataFolder di QUESTO progetto
async function drive_debugListAll() {
  try {
    const url = "https://www.googleapis.com/drive/v3/files"
      + "?spaces=appDataFolder"
      + "&fields=files(id,name,modifiedTime,size),nextPageToken"
      + "&pageSize=100";
    const res = await drive_request(url);
    const json = await res.json();
    console.log("📦 appDataFolder:", json.files || []);
  } catch (e) {
    console.error("Errore nel list appDataFolder:", e);
  }
}

// ritorna la lista dei file TURNI* in appDataFolder ordinati dal più nuovo
async function drive_listTurniFiles(/* accessToken non più usato */) {
  // Passiamo dalla strada unica che garantisce token valido e retry
  const q = encodeURIComponent("name contains 'TURNI'");
  const url = "https://www.googleapis.com/drive/v3/files"
            + "?spaces=appDataFolder"
            + "&q=" + q
            + "&fields=files(id,name,modifiedTime,size)"
            + "&pageSize=100"
            + "&orderBy=modifiedTime desc";

  const res = await drive_request(url);   // <— qui dentro fa ensure + refresh + retry
  const data = await res.json();
  return data.files || [];
}

// crea un nuovo file TURNI-YYYYMMDD-HHMMSS.json in appDataFolder
async function drive_uploadTurniFile(snapshotJsonString, accessToken) {
  const now  = new Date();
  const name =
    "TURNI-" +
    now.getFullYear().toString().padStart(4, "0") +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0") +
    "-" +
    now.getHours().toString().padStart(2, "0") +
    now.getMinutes().toString().padStart(2, "0") +
    now.getSeconds().toString().padStart(2, "0") +
    ".json";

  const metadata = {
    name,
    parents: ["appDataFolder"]
  };

  const boundary = "-------314159265358979323846";
  const body =
    "--" + boundary + "\r\n" +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) + "\r\n" +
    "--" + boundary + "\r\n" +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    snapshotJsonString + "\r\n" +
    "--" + boundary + "--";

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + accessToken,
      "Content-Type": "multipart/related; boundary=" + boundary
    },
    body
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error("drive_uploadTurniFile fallita: " + res.status + " " + txt);
  }

  return await res.json();
}

async function drive_deleteFile(fileId, accessToken) {
  const res = await fetch("https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(fileId), {
    method: "DELETE",
    headers: {
      "Authorization": "Bearer " + accessToken
    }
  });

  // se è già sparito, amen
  if (!res.ok && res.status !== 404) {
    const txt = await res.text();
    throw new Error("drive_deleteFile fallita: " + res.status + " " + txt);
  }
}

function showSaveStatus(text, color) {
  let el = document.getElementById('saveStatus');
  if (!el) {
    el = document.createElement('div');
    el.id = 'saveStatus';
    el.style.position = 'fixed';
    el.style.top = '10px';
    el.style.right = '10px';
    el.style.background = 'rgba(0,0,0,.75)';
    el.style.color = 'white';
    el.style.padding = '6px 12px';
    el.style.borderRadius = '8px';
    el.style.fontSize = '14px';
    el.style.fontWeight = '500';
    el.style.zIndex = '9999';
    el.style.opacity = '0';
    el.style.transition = 'opacity .3s';
    el.style.pointerEvents = 'none';
    document.body.appendChild(el);
  }

  el.textContent = text;
  el.style.background = color;
  el.style.opacity = '1';

  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => {
    el.style.opacity = '0';
  }, 3000);
}

// Salva (manuale) con rotazione 10 versioni
async function storage_saveToGoogle() {
  // 1) Se sembri "non connesso", prima prova un refresh silenzioso
  if (!g_isConnected()) {
    try {
      await g_ensureValidAccess(); // questo va a Google → Render → Firestore come da tuo flusso
    } catch (e) {
      showSaveStatus("Impossibile ottenere un token valido.", "#e53e3e");
      return;
    }
    // ricontrolla
    if (!g_isConnected()) {
      showSaveStatus("Non sei connesso a Google", "#e53e3e");
      return;
    }
  }

  // 2) Allinea prima i dati dalla UI
  ui_settingsApply();

  const payload  = storage_buildPayload();
  const snapshot = JSON.stringify(payload);

  // se non è cambiato niente
  if (__lastSavedSnapshot === snapshot) {
    showSaveStatus("Nessuna modifica da salvare", "#2d3748");
    __hasUnsavedChanges = false;
    return;
  }

  // 3) Ottieni/garantisci il token (strada unica)
  let accessToken;
  try {
    accessToken = await g_ensureValidAccess();
  } catch (err) {
    console.warn("storage_saveToGoogle: token non ottenuto:", err && err.message ? err.message : err);
    showSaveStatus("Impossibile ottenere un token valido.", "#e53e3e");
    return;
  }

  try {
    // prendo TUTTI i TURNI* già presenti
    const files = await drive_listTurniFiles(); // ora non passa più il token a mano

    // carico il nuovo contenuto
    await drive_uploadTurniFile(snapshot, accessToken);

    // cancello eventuali vecchi
    const MAX_FILES = 10; // lasciamo il tuo valore operativo
    if (files && files.length > MAX_FILES) {
      const toDelete = files.slice(MAX_FILES);
      for (const f of toDelete) {
        try { await drive_deleteFile(f.id, accessToken); } catch (e) { console.warn("Delete vecchio backup:", f.id, e); }
      }
    }

    __lastSavedSnapshot = snapshot;
    __hasUnsavedChanges = false;
    showSaveStatus("Salvato su Google Drive", "#38a169");
  } catch (err) {
    console.error("Errore durante il salvataggio su Drive:", err);
    showSaveStatus("Errore durante il salvataggio", "#e53e3e");
  }
}


// Importa il file canone
async function storage_importFromGoogle() {
  if (!g_isConnected()) {
    alert("Non sei connesso a Google.");
    return;
  }
  try {
    const file = await drive_findCanonical();
    if (!file) {
      alert("Nessun file trovato in Drive AppData.");
      return;
    }
    const obj = await drive_download_json(file.id);

    if (obj.settings) settings_save(obj.settings);
    if (Array.isArray(obj.defs)) defs_save(obj.defs);

    ui_settingsInit();
    render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());
    // allinea la firma: da ora in poi non risalviamo se non cambia davvero
    __lastSavedSnapshot = JSON.stringify(storage_buildPayload());

    const st = document.getElementById("cloudStatusSettings");
    if (st) st.textContent = `✅ Importato da Drive AppData: ${file.name}`;
  } catch (e) {
    console.error(e);
    alert("Errore nell’importazione da Drive.");
  }
}

// Importa una delle versioni TURNI* dall'appDataFolder, con avviso se perderai modifiche
async function storage_importBackupFromGoogle() {
  if (!g_isConnected()) {
    alert("Non sei connesso a Google.");
    return;
  }

  try {
    const accessToken = await g_ensureValidAccess();
    const files = await drive_listTurniFiles(accessToken);
    if (!files.length) {
      alert("Nessun backup disponibile su Drive.");
      return;
    }

    const names = files.map((f, idx) => `${idx+1}. ${f.name}`).join("\n");
    const ans = prompt(
      "Seleziona il backup da ripristinare (numero):\n\n" + names + "\n\nLascia vuoto per annullare.",
      "1"
    );
    if (!ans) return;

    const selIdx = parseInt(ans, 10) - 1;
    const chosen = files[selIdx];
    if (!chosen) {
      alert("Numero non valido.");
      return;
    }

    if (typeof __hasUnsavedChanges !== "undefined" && __hasUnsavedChanges) {
      const go = confirm(
        "Hai modifiche locali non salvate.\n" +
        "Se importi un backup, le perderai.\n\n" +
        "Vuoi procedere comunque?"
      );
      if (!go) return;
    }

    const obj = await drive_download_json(chosen.id);

    if (obj.settings) settings_save(obj.settings);
    if (Array.isArray(obj.defs)) defs_save(obj.defs);

    ui_settingsInit();
    render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());

    if (typeof storage_buildPayload === "function") {
      __lastSavedSnapshot = JSON.stringify(storage_buildPayload());
    }
    showSaveStatus(`✅ Ripristinato: ${chosen.name}`, "#0f766e");
  } catch (e) {
    console.error(e);
    showSaveStatus("❌ Errore nel ripristino da Drive", "#b91c1c");
  }
}

// Prende il TURNI* più recente e lo applica, avvisando se perdi roba
async function storage_syncNewestFromDrive() {
  if (!g_isConnected()) {
    alert("Non sei connesso a Google.");
    return;
  }

  try {
    // 1) TOKEN VALIDO
    const accessToken = await g_ensureValidAccess();

    // 2) LISTA FILE con TOKEN
    const files = await drive_listTurniFiles(accessToken);
    if (!files.length) {
      alert("Nessun file TURNI trovato in Drive.");
      return;
    }

    const latest = files[0];

    // 3) Avviso se hai modifiche locali
    if (typeof __hasUnsavedChanges !== "undefined" && __hasUnsavedChanges) {
      const go = confirm(
        "Attenzione: hai modifiche locali non salvate.\n" +
        "Se sincronizzi ora verranno sovrascritte dai dati Drive.\n\n" +
        "Vuoi procedere lo stesso?"
      );
      if (!go) return;
    }

    // 4) SCARICO e APPLICO
    const remoteObj = await drive_download_json(latest.id);
    if (remoteObj.settings) settings_save(remoteObj.settings);
    if (Array.isArray(remoteObj.defs)) defs_save(remoteObj.defs);

    ui_settingsInit();
    render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());

    if (typeof storage_buildPayload === "function") {
      __lastSavedSnapshot = JSON.stringify(storage_buildPayload());
    }
    if (typeof __hasUnsavedChanges !== "undefined") {
      __hasUnsavedChanges = false;
    }

    showSaveStatus(`✅ Sincronizzato: ${latest.name}`, "#0f766e");
  } catch (e) {
    console.error(e);
    showSaveStatus("❌ Errore sincronizzazione", "#b91c1c");
  }
}

// =======================
// AUTOSAVE ENGINE (disattivato per test)
// =======================
let __autosave_timer = null;
let __autosave_pending = false;
const AUTOSAVE_ENABLED = false;

function autosave_schedule(delayMs = 800) {
  if (!AUTOSAVE_ENABLED) return;
  __autosave_pending = true;
  clearTimeout(__autosave_timer);
  __autosave_timer = setTimeout(async () => {
    try {
      if (g_isConnected()) {
        await storage_saveToGoogle();
      }
    } catch (e) {
      console.error("Autosave error:", e);
    } finally {
      __autosave_pending = false;
    }
  }, delayMs);
}

async function autosave_now() {
  if (!g_isConnected()) return;
  try { await storage_saveToGoogle(); } catch(e){ console.error(e); }
  __autosave_pending = false;
}

  // =========================================================
  // [BLOCK: BOOTSTRAP] DOM ready
  // =========================================================
  function boot_init(){

  document.getElementById('prev').addEventListener('click', ()=>nav_shift(-1));
  document.getElementById('next').addEventListener('click', ()=>nav_shift(1));

  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click', ()=>ui_switchTab(t.dataset.tab)));

  document.getElementById('btnAddTurno').addEventListener('click', ui_defsAdd);

  // Bind azioni cloud (restano, ma l'utente non deve usarle: l'autosave pensa a tutto)
  const btnSaveCloud  = document.getElementById('btnSaveCloud');
  const btnImportCloud= document.getElementById('btnImportCloud');
  if(btnSaveCloud)   btnSaveCloud.addEventListener('click', storage_saveToGoogle);
  if(btnImportCloud) btnImportCloud.addEventListener('click', storage_importFromGoogle);

// Account: bind icone + stato
g_bindIconClicks();
g_updateIcons();

// Porta il menu nel <body> prima di collegare gli handler
acct_menuPortalize();
acct_menuBind();

  // Init UI
  ui_settingsInit();
  render_buildMonth(view.getUTCFullYear(), view.getUTCMonth());

  // Autosave anche quando cambia la data di ancoraggio
  const sd = document.getElementById('startDate');
  if (sd) sd.addEventListener('change', ui_settingsApply);

  // Vista iniziale: calendario senza scroll globale
  document.body.classList.add('no-scroll');

    // Glow
  ui_updateTopbarGlowCenter();
  addEventListener('resize', ui_updateTopbarGlowCenter, { passive:true });
  addEventListener('scroll', ui_updateTopbarGlowCenter, { passive:true });
  requestAnimationFrame(ui_updateTopbarGlowCenter);
  setInterval(() => fetch("https://turni-mini-api.onrender.com/ping").catch(()=>{}), 14 * 60 * 1000);
}


  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', boot_init);
  } else {
    boot_init();
  }

  // Carica dinamicamente il logo SVG
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

// Eseguilo all'avvio
window.addEventListener("DOMContentLoaded", loadLogo);


  // [SERVICE WORKER] – registrazione con auto-update (fix percorsi localhost/GitHub)
(function(){
  if (!('serviceWorker' in navigator)) return;

  const SW_VERSION = '2025-11-04-03'; // bump
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

// ======================= //
// fine JSS (script)       //
// ======================= //

// =========================================================
// [DEBUG] check_token_status()
// Controlla token locale, verifica con Google e ping Render
// =========================================================
async function check_token_status() {
  const tok = localStorage.getItem("google_access_token");
  const exp = parseInt(localStorage.getItem("google_access_expires_at") || "0", 10);
  const email = localStorage.getItem("google_user_email") || "(nessuna email)";

  console.log("🔹 [LOCALE] Token presente:", !!tok);
  console.log("🔹 [LOCALE] Scadenza:", exp ? new Date(exp).toLocaleString() : "(manca)");
  console.log("🔹 [LOCALE] Ancora valido:", tok && Date.now() < (exp - 10_000));

  if (!tok) {
    console.warn("⚠️ Nessun token salvato in localStorage.");
    return;
  }

  // --- verifica reale lato Google ---
  try {
    const r = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${tok}`);
    if (!r.ok) throw new Error("Token non valido o scaduto (" + r.status + ")");
    const info = await r.json();
    console.log("✅ [GOOGLE] Token valido per:", info.email, "scade tra", info.expires_in, "secondi");
  } catch (e) {
    console.warn("❌ [GOOGLE] Token non accettato:", e.message);
  }

  // --- ping alla mini-API Render per vedere se Firestore risponde ---
  try {
    const ping = await fetch("https://turni-mini-api.onrender.com/ping", { method: "GET" });
    if (ping.ok) {
      console.log("✅ [RENDER] Mini-API sveglia e risponde.");
    } else {
      console.warn("⚠️ [RENDER] Mini-API risponde ma con codice", ping.status);
    }
  } catch (e) {
    console.error("❌ [RENDER] Mini-API non raggiungibile:", e.message);
  }

  console.log("📧 [EMAIL memorizzata]:", email);
}
