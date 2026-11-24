/* DEPTHS OF DARKNESS — IN-GAME SETTINGS
   Used when the game runs on its own (desktop app, or game/index.html opened directly).
   Inside the website frame, Settings opens the website's Options panel instead.
   Values are stored by the game itself (dodGamePreferencesV1) through window.dodPreferences. */
(()=>{
 const M=window.dodMenu;if(!M)return;
 const desktop=window.dodDesktop||null;
 const prefs=()=>window.dodPreferences?.getPreferences?.()||{muted:false,volume:.8,highPerformance:false,uiScale:1,autoSalvage:'off'};
 const set=next=>window.dodPreferences?.setPreferences?.(next);

 async function isFullscreen(){
  if(desktop?.isFullscreen)return !!(await desktop.isFullscreen());
  return !!document.fullscreenElement;
 }
 async function setFullscreen(on){
  if(desktop?.setFullscreen){await desktop.setFullscreen(on);return}
  try{if(on&&!document.fullscreenElement)await document.documentElement.requestFullscreen();else if(!on&&document.fullscreenElement)await document.exitFullscreen()}catch(e){}
 }
 const canFullscreen=()=>!!desktop?.setFullscreen||!!document.documentElement.requestFullscreen;

 const seg=(name,options,current)=>`<div class="st-seg" role="group">${options.map(([v,l])=>`<button type="button" data-st="${name}" data-v="${v}" aria-pressed="${String(v)===String(current)}">${l}</button>`).join('')}</div>`;
 const row=(label,hint,control)=>`<div class="st-row"><div><b>${label}</b>${hint?`<small>${hint}</small>`:''}</div>${control}</div>`;

 async function render(onClose){
  const p=prefs(),fs=await isFullscreen();
  const vol=Math.round((Number(p.volume)||0)*100);
  M.openModal(`<div class="tm-kicker">Options</div><h2>Settings</h2>
   <div class="st-list">
    <h3>Audio</h3>
    ${row('Master volume','',`<div class="st-vol"><input type="range" min="0" max="100" step="5" value="${vol}" data-st-vol aria-label="Master volume"><output>${vol}%</output></div>`)}
    ${row('Sound','',seg('muted',[['false','On'],['true','Muted']],!!p.muted))}
    <h3>Display</h3>
    ${canFullscreen()?row('Window mode','F11 also toggles fullscreen',seg('fullscreen',[['true','Fullscreen'],['false','Windowed']],fs)):''}
    ${row('UI scale','Size of panels and the HUD',seg('uiScale',[['0.85','85%'],['1','100%'],['1.15','115%']],Number(p.uiScale)||1))}
    ${row('High performance','Simpler effects for slower PCs',seg('highPerformance',[['false','Off'],['true','On']],!!p.highPerformance))}
    <h3>Gameplay</h3>
    ${row('Auto-salvage junk','Turn low-rarity drops into Salvage',seg('autoSalvage',[['off','Off'],['common','Common'],['magic','Magic']],p.autoSalvage||'off'))}
   </div>
   <div class="tm-btns"><button data-tm="test">Test sound</button><button data-tm="close" data-tm-focus>Done</button></div>`,
   {onClose,onAction:a=>{if(a==='test'){window.dodAudio?.testSound?.();render(onClose)}}});
  const modal=M.modal;
  const range=modal.querySelector('[data-st-vol]'),out=range?.nextElementSibling;
  range?.addEventListener('input',()=>{out.textContent=range.value+'%';set({volume:Number(range.value)/100,muted:false});modal.querySelectorAll('[data-st="muted"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v==='false')))});
  modal.querySelectorAll('[data-st]').forEach(b=>b.addEventListener('click',async e=>{
   e.stopPropagation();
   const k=b.dataset.st,v=b.dataset.v;
   if(k==='fullscreen')await setFullscreen(v==='true');
   else if(k==='uiScale')set({uiScale:Number(v)});
   else if(k==='muted'||k==='highPerformance')set({[k]:v==='true'});
   else if(k==='autoSalvage')set({autoSalvage:v});
   b.parentElement.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  }));
 }

 function quitGame(){
  M.confirm('Quit to desktop?','Your hero is saved before the game closes.','Quit game',()=>{try{save()}catch(e){}desktop?.quit?.()},{danger:false});
 }

 window.dodSettings={open:render,quitGame,isDesktop:!!desktop};

 // F11 toggles fullscreen in the desktop app and in a standalone browser tab.
 addEventListener('keydown',e=>{if(e.key==='F11'&&window.parent===window){e.preventDefault();isFullscreen().then(fs=>setFullscreen(!fs))}});

 const css=document.createElement('style');css.id='dodSettingsStyle';css.textContent=`
 #tmModal .st-list{display:flex;flex-direction:column;gap:2px;margin:6px 0 14px}
 #tmModal .st-row{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:8px 0;border-bottom:1px solid #ffffff0d}
 #tmModal .st-row b{display:block;font:600 13px var(--book-type,system-ui);color:#f3e6d5}
 #tmModal .st-row small{display:block;margin-top:2px;font:12px var(--book-type,system-ui);color:#a998ad}
 #tmModal .st-seg{display:flex;flex-shrink:0;border:1px solid #5c4457;border-radius:6px;overflow:hidden}
 #tmModal .st-seg button{min-height:32px;padding:6px 11px;border:0;border-right:1px solid #5c4457;background:#1b1524;color:#d3c4d7;font:600 11px var(--book-type,system-ui);letter-spacing:.06em;cursor:pointer}
 #tmModal .st-seg button:last-child{border-right:0}
 #tmModal .st-seg button[aria-pressed="true"]{background:linear-gradient(135deg,#986549,#583550);color:#fff2de}
 #tmModal .st-seg button:is(:hover,:focus-visible){outline:none;box-shadow:inset 0 0 0 1px #e3b67e}
 #tmModal .st-vol{display:flex;align-items:center;gap:10px}
 #tmModal .st-vol input{width:150px;accent-color:#e3b67e}
 #tmModal .st-vol output{min-width:38px;text-align:right;font:600 12px var(--book-type,system-ui);color:#f1cf9c}
 @media (max-width:480px){#tmModal .st-row{flex-direction:column;align-items:flex-start}}
 `;document.head.appendChild(css);
})();
