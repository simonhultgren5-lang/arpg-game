/* DEPTHS OF DARKNESS — CLOUD SAVES & ACCOUNT STATUS (desktop app)
   When playing online, every game save is also handed to the desktop app, which uploads it to the
   selected server (batched, see electron/cloud-sync.cjs). Shows the account and sync state on the
   title screen and in the pause menu, and adds "Back to Launcher" to the title screen. */
(()=>{
 const desktop=window.dodDesktop;
 if(!desktop)return;
 const ses=window.dodSession||{mode:'offline'};
 const online=ses.mode==='online';
 const MARK='dodCloudSyncedAtV1';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

 // ---- snapshot of every game key in localStorage (what the server stores) ----
 const isGameKey=k=>(k==='mdjup'||k.startsWith('dod'))&&k!==MARK&&!k.startsWith('dod3d'); // dod3d* belongs to the 3D game
 function snapshot(){
  const data={};
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(isGameKey(k))data[k]=localStorage.getItem(k)}
  let meta={};
  return {data,meta:heroMeta()};
 }
 function heroMeta(){try{const s=JSON.parse(localStorage.getItem('mdjup')||'null');if(s)return{heroName:s.heroName,heroLevel:s.lv,depth:s.depth,heroClass:localStorage.getItem('dodClass')||'warrior'}}catch(e){}return {}}

 let state=online?'connected':'local',message='';
 window.dodCloud={online,session:ses,snapshot,getState:()=>({state,message})};

 if(online){
  let timer=null;
  const push=()=>{clearTimeout(timer);timer=setTimeout(()=>desktop.cloudPush(snapshot()),1200)};
  // Every system in the game saves through the global save(); hook it once more here.
  if(typeof save==='function'){const prior=save;save=function(){const r=prior.apply(this,arguments);push();return r}}
  desktop.onCloudStatus(s=>{
   state=s.state;message=s.message||'';
   if(s.state==='synced'&&s.updatedAt)try{localStorage.setItem(MARK,String(s.updatedAt))}catch(e){}
   renderChips();
  });
 }else if(window.dodCharacter){
  // Offline character: only tell the launcher its level and depth for the character list.
  let timer=null;
  if(typeof save==='function'){const prior=save;save=function(){const r=prior.apply(this,arguments);clearTimeout(timer);timer=setTimeout(()=>desktop.cloudPush({meta:heroMeta()}),1500);return r}}
 }

 // ---- status chip ----
 const LABELS={
  connected:'Connected',synced:'Saved to cloud',saving:'Saving…',offline:"Server unreachable · retrying",
  'signed-out':'Signed out · saved on this PC only',local:'Offline · saved on this PC',
 };
 function chipHtml(){
  const cls=state==='synced'||state==='connected'?'ok':state==='saving'?'busy':state==='local'?'local':'warn';
  const who=online?`<b>${esc(ses.username)}</b><span>${esc(ses.serverName)}</span>`:'';
  return `<span class="cl-dot ${cls}" aria-hidden="true"></span>${who}<span class="cl-state">${esc(LABELS[state]||state)}</span>`;
 }
 const title=document.getElementById('titleScreen');
 const titleChip=document.createElement('div');titleChip.className='cl-chip cl-title';titleChip.setAttribute('role','status');
 title?.appendChild(titleChip);
 function renderChips(){
  titleChip.innerHTML=chipHtml();
  const pauseChip=document.querySelector('#tmModal .cl-pause');if(pauseChip)pauseChip.innerHTML=chipHtml();
 }
 renderChips();
 // Add the chip to the pause menu whenever it opens.
 const modal=document.getElementById('tmModal');
 if(modal)new MutationObserver(()=>{
  const menu=modal.querySelector('.tm-menu');
  if(menu&&!modal.querySelector('.cl-pause')){const c=document.createElement('div');c.className='cl-chip cl-pause';c.setAttribute('role','status');menu.before(c);renderChips()}
 }).observe(modal,{childList:true,subtree:true});

 // ---- title screen: Back to Launcher ----
 const actions=title?.querySelector('.d3-actions');
 if(actions&&!document.getElementById('d3Launcher')){
  const b=document.createElement('button');b.type='button';b.id='d3Launcher';
  b.textContent=online?'Switch Account / Server':'Back to Launcher';
  b.onclick=()=>{try{save()}catch(e){}desktop.backToLauncher()};
  const quit=document.getElementById('d3Quit');
  quit?actions.insertBefore(b,quit):actions.appendChild(b);
 }

 const css=document.createElement('style');css.id='dodCloudStyle';css.textContent=`
 .cl-chip{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border:1px solid #5c4457;border-radius:999px;background:#120f19d9;backdrop-filter:blur(4px);font:500 12px var(--book-type,system-ui);color:#d3c4d7;white-space:nowrap}
 .cl-chip b{color:#f3e6d5;font-weight:600}
 .cl-chip span:not(.cl-dot){color:#a998ad}
 .cl-chip b~.cl-state{padding-left:8px;border-left:1px solid #ffffff1a}
 .cl-dot{width:8px;height:8px;border-radius:50%;background:#8e8096}
 .cl-dot.ok{background:#7fd49a;box-shadow:0 0 8px #7fd49a99}
 .cl-dot.busy{background:#f1cc8d;animation:clPulse 1s ease-in-out infinite}
 .cl-dot.warn{background:#e07a74}
 .cl-dot.local{background:#8e8096}
 .cl-title{position:absolute;left:18px;top:16px;z-index:2}
 #tmModal .cl-pause{display:flex;justify-content:center;margin:-8px auto 14px;width:max-content;max-width:100%}
 #titleScreen .d3-actions #d3Launcher{background:#1b1524cc!important;border:1px solid #5c4457!important;color:#e6d8e4!important;box-shadow:none!important}
 #titleScreen .d3-actions #d3Launcher:is(:hover,:focus){background:#2d2236!important;border-color:#e3b67e!important}
 @keyframes clPulse{50%{opacity:.35}}
 @media (max-width:560px){.cl-title{left:50%;transform:translateX(-50%);top:10px}.cl-chip .cl-state{display:none}}
 `;document.head.appendChild(css);
})();
