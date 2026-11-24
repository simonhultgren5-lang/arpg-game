/* DEPTHS OF DARKNESS — MENU LAYER, part 3: in-game menus (pause menu, Esc handling, backdrop, hero creation, death) */
(()=>{
 const M=window.dodMenu;if(!M)return;
 const {esc,kbd:k}=M;
 const $=id=>document.getElementById(id);
 const shown=el=>!!el&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden';
 const CLASS_NAMES={warrior:'Warrior',pyromancer:'Pyromancer',rogue:'Shadow Rogue'};
 const inFrame=window.parent&&window.parent!==window;

 // Panels that sit over the dungeon. Each closes through its own close control so game state stays consistent.
 const PANELS=[
  {id:'inv',close:'[data-inv-close]'},
  {id:'progPanel',close:'#progClose'},
  {id:'enchanterPanel',close:'[data-enchant-close]'},
  {id:'codexPanel',close:'[data-codex-close]'},
  {id:'worldPanel',close:'[data-world="close"]'},
  {id:'d3service',close:'[data-service="close"]'},
 ];
 const openPanels=()=>PANELS.filter(p=>shown($(p.id)));
 const topPanel=()=>openPanels().sort((a,b)=>(+getComputedStyle($(b.id)).zIndex||0)-(+getComputedStyle($(a.id)).zIndex||0))[0];
 function closePanel(p){const el=$(p.id);if(!el)return;const btn=el.querySelector(p.close);if(btn)btn.click();else el.style.display='none'}

 // ---- dimmed backdrop behind open panels; clicking it closes the top panel ----
 const scrim=document.createElement('div');scrim.id='dmScrim';document.body.appendChild(scrim);
 scrim.addEventListener('click',()=>{const p=topPanel();if(p)closePanel(p)});
 const syncScrim=()=>document.body.classList.toggle('dm-panel-open',openPanels().length>0);
 const watch=new MutationObserver(syncScrim);
 PANELS.forEach(p=>{const el=$(p.id);if(el)watch.observe(el,{attributes:true,attributeFilter:['style','class']})});
 syncScrim();

 // ---- Forge / service panel: add a header close button like every other panel ----
 const service=$('d3service');
 if(service){
  const addClose=()=>{if(service.querySelector('.dm-close')||!service.childElementCount)return;const b=document.createElement('button');b.type='button';b.className='dm-close';b.textContent='✕';b.setAttribute('aria-label','Close');b.onclick=()=>{const c=service.querySelector('[data-service="close"]');if(c)c.click();else service.style.display='none'};service.prepend(b)};
  new MutationObserver(addClose).observe(service,{childList:true});addClose();
 }
 // Accessible names for the existing ✕ buttons.
 [['[data-enchant-close]','Close atelier'],['[data-codex-close]','Close codex'],['[data-world="close"]','Close world atlas'],['#progClose','Close spell book']].forEach(([s,l])=>document.querySelectorAll(s).forEach(b=>b.setAttribute('aria-label',l)));

 // ---- top bar: hotkey hints and a Menu button (also the only way into the pause menu on touch) ----
 const top=$('top');
 const hints={ib:'Bag & equipment (I)',talentQuick:'Spell book & talents (K)',enchantBtn:'Crafting atelier (O)',codexBtn:'Codex (B)',cityOpen:'Return to Sanctuary'};
 Object.entries(hints).forEach(([id,t])=>{const b=$(id);if(b)b.title=t});
 if(top&&!$('dmMenuBtn')){const mb=document.createElement('button');mb.type='button';mb.id='dmMenuBtn';mb.title='Menu (Esc)';mb.setAttribute('aria-label','Open menu');mb.innerHTML='<span aria-hidden="true">☰</span><b>Menu</b>';mb.onclick=()=>openPause();top.appendChild(mb)}

 // ---- pause menu ----
 const heroLine=()=>{let n='Hero',lv=1,depth=1,cls=CLASS_NAMES[window.dodHeroClass]||'Warrior';try{n=me.n}catch(e){}try{lv=P.lv}catch(e){}try{depth=fl}catch(e){}const town=window.dodCity?.active?.();return `${esc(n)} · ${esc(cls)} · Lv ${lv} · ${town?'Sanctuary':'Depth '+depth}`};
 const clickTop=id=>()=>$(id)?.click();
 const ACTIONS={
  bag:clickTop('ib'),spells:clickTop('talentQuick'),atelier:clickTop('enchantBtn'),codex:clickTop('codexBtn'),
  atlas:()=>window.dodWorld?.open?.(),
  sanctuary:clickTop('cityOpen'),
  help:()=>M.howToPlay(openPause),
  settings:()=>{if(inFrame){try{window.parent.postMessage({type:'dod:open-settings'},window.location.origin)}catch(e){}}else window.dodSettings?.open(openPause)},
  desktopQuit:()=>window.dodSettings?.quitGame(),
  quit:()=>M.confirm('Return to title?','Your hero is saved first, so you can pick up right here with <b>Continue</b>.','Save &amp; return',()=>{try{save()}catch(e){}location.reload()},{danger:false}),
 };
 function openPause(){
  if(pauseBlocked(true))return;
  const town=window.dodCity?.active?.(),dead=(()=>{try{return !!P.dead}catch(e){return false}})();if(dead)return;
  const btn=(a,label,key='')=>`<button data-tm="${a}">${label}${key?k(key):''}</button>`;
  M.openModal(`<div class="tm-kicker">Paused</div><h2>Depths of Darkness</h2><p class="tm-sub">${heroLine()}</p>
   <div class="tm-menu">
    <button class="tm-primary" data-tm="close" data-tm-focus>Resume</button>
    <div class="tm-row">${btn('bag','Bag','I')}${btn('spells','Spells','K')}</div>
    <div class="tm-row">${btn('atelier','Atelier','O')}${btn('codex','Codex','B')}</div>
    ${btn('atlas','World Atlas')}
    ${!town&&$('cityOpen')?btn('sanctuary','Return to Sanctuary'):''}
    <div class="tm-sep"></div>
    ${btn('help','How to Play')}
    ${btn('settings',inFrame?'Settings &amp; Cloud Saves':'Settings')}
    ${window.dodDesktop?`<div class="tm-row"><button class="tm-quit" data-tm="quit">Quit to Title</button><button class="tm-quit" data-tm="desktopQuit">Quit to Desktop</button></div>`:`<button class="tm-quit" data-tm="quit">Save &amp; Quit to Title</button>`}
   </div>
   <div class="tm-keys">${k('↑')}${k('↓')} Navigate &nbsp; ${k('Esc')} Resume</div><div class="tm-version tm-version-inline">v${esc(window.DOD_VERSION||'dev')}</div>`,{narrow:true,onAction:a=>ACTIONS[a]?.()});
 }
 // Screens where Esc must not open the pause menu.
 function pauseBlocked(fromButton){
  if(M.isOpen()||document.querySelector('dialog[open]'))return true;
  if(document.body.classList.contains('hud-layout-editing'))return true;
  if(['titleScreen','classStart','dead','bossRewards','admin','ossuaryReward','campaignSpoils','witchLedger','hudSizePanel'].some(id=>shown($(id))))return true;
  if(!fromButton&&(shown($('sanctuary'))||window.dodCity?.active?.()))return true;
  if(!fromButton&&openPanels().length)return true;
  const ae=document.activeElement,tag=ae?.tagName;if((tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')&&ae.getClientRects().length)return true;
  return false;
 }
 // Esc: let each panel's own handler run first, then close whatever it left open, or pause if nothing was open.
 let snap=null;
 addEventListener('keydown',e=>{if(e.key!=='Escape')return;snap={panels:openPanels().map(p=>p.id),blocked:pauseBlocked(false)}},true);
 addEventListener('keydown',e=>{
  if(e.key!=='Escape'||!snap)return;const s=snap;snap=null;
  setTimeout(()=>{
   if(s.panels.length){
    const stillOpen=PANELS.filter(p=>s.panels.includes(p.id)&&shown($(p.id)));
    if(stillOpen.length===s.panels.length){const p=topPanel();if(p)closePanel(p)}
    return;
   }
   if(!s.blocked)openPause();
  },0);
 });
 window.dodMenu.openPause=openPause;

 // ---- hero creation: a way back to the title, and Enter to start ----
 const start=$('classStart'),title=$('titleScreen');
 if(start){
  const play=start.querySelector('#createHeroBtn');
  if(play&&title&&!$('dmBackToTitle')){
   const row=document.createElement('div');row.className='dm-create-actions';
   const back=document.createElement('button');back.type='button';back.id='dmBackToTitle';back.textContent='Back';
   back.onclick=()=>{start.style.display='none';title.style.display='grid'};
   play.replaceWith(row);row.append(back,play);
   play.textContent='Begin Descent';
  }
  start.querySelector('#heroNameInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();play?.click()}});
  start.querySelectorAll('.classPickCard').forEach(c=>{if(!c.hasAttribute('tabindex')&&c.tagName!=='BUTTON')c.tabIndex=0;c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();c.click()}})});
  new MutationObserver(()=>{if(shown(start))setTimeout(()=>start.querySelector('#heroNameInput')?.focus({preventScroll:true}),30)}).observe(start,{attributes:true,attributeFilter:['style']});
 }

 // ---- death screen: focus the action and show a key hint ----
 const dead=$('dead');
 if(dead){
  const rv=$('rv'),box=dead.querySelector('.f')||dead;
  if(!dead.querySelector('.tm-keys')){const h=document.createElement('div');h.className='tm-keys';h.innerHTML=`${k('Enter')} Continue`;box.appendChild(h)}
  new MutationObserver(()=>{if(shown(dead))setTimeout(()=>rv?.focus({preventScroll:true}),400)}).observe(dead,{attributes:true,attributeFilter:['style']});
 }
})();
