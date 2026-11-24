/* DEPTHS OF DARKNESS — MENU LAYER, part 2: title screen */
(()=>{
 const title=document.getElementById('titleScreen');if(!title)return;
 const actions=title.querySelector('.d3-actions');if(!actions)return;
 const {esc,kbd:k,howToPlay,confirm:confirmDialog,isOpen,arrowNav}=window.dodMenu;
 const $=id=>document.getElementById(id);
 const CLASS_NAMES={warrior:'Warrior',pyromancer:'Pyromancer',rogue:'Shadow Rogue'};
 // The game auto-saves a random default hero on first load. Only offer Continue for a hero the player
 // actually created or continued (name stored in dodHeroStartedV1), or one that has made progress.
 const STARTED_KEY='dodHeroStartedV1';
 const isRealHero=s=>localStorage.getItem(STARTED_KEY)===String(s.heroName)||Number(s.lv)>1||Number(s.xp)>0||Number(s.depth)>1||Number(s.best)>1;
 const readSave=()=>{try{const s=JSON.parse(localStorage.getItem('mdjup')||'null');if(!s||!isRealHero(s))return null;const cls=localStorage.getItem('dodClass');return{name:String(s.heroName||'Varg').slice(0,18),lv:Math.max(1,Number(s.lv)||1),depth:Math.max(1,Number(s.depth)||1),best:Math.max(1,Number(s.best)||1),cls:CLASS_NAMES[cls]||'Warrior'}}catch(e){return null}};
 const save=readSave();

 const begin=$('d3Begin'),cont=$('d3Continue'),del=$('d3New'),how=$('d3How');
 [begin,cont].forEach(b=>b&&b.classList.remove('d3-primary'));
 if(cont&&save){
  cont.classList.add('tm-primary');
  cont.innerHTML=`Continue<span class="tm-hero">${esc(save.name)} · ${esc(save.cls)} · Lv ${save.lv} · Depth ${save.depth}${save.best>save.depth?` (best ${save.best})`:''}</span>`;
  cont.setAttribute('aria-label',`Continue as ${save.name}, level ${save.lv} ${save.cls}, depth ${save.depth}`);
  actions.prepend(cont);
  begin.textContent='New Hero';
 }else if(begin){cont?.remove();del?.remove();begin.classList.add('tm-primary');begin.textContent='Begin Descent'}
 if(how)how.textContent='How to Play';
 const standalone=window.parent===window;
 const addTitleBtn=(id,label,onclick)=>{const b=document.createElement('button');b.type='button';b.id=id;b.textContent=label;b.onclick=onclick;actions.appendChild(b);return b};
 if(standalone)addTitleBtn('d3Settings','Settings',()=>window.dodSettings?.open());
 if(window.dodDesktop)addTitleBtn('d3Quit','Quit Game',()=>window.dodSettings?.quitGame());
 const muted=title.querySelector('.d3-muted');
 if(muted&&standalone)muted.textContent='Progress saves automatically.';
 const foot=document.createElement('div');foot.className='tm-foot';
 if(muted)foot.appendChild(muted);
 if(del&&save){del.textContent='Erase hero';del.removeAttribute('class');foot.appendChild(del)}
 actions.after(foot);
 const keys=document.createElement('div');keys.className='tm-keys';keys.innerHTML=`${k('↑')}${k('↓')} Navigate &nbsp; ${k('Enter')} Select`;foot.after(keys);
 const h1=title.querySelector('h1');if(h1&&!title.querySelector('.tm-emblem')){const em=document.createElement('img');em.className='tm-emblem';em.src='img/emblem.svg';em.alt='';em.width=em.height=96;h1.before(em);const st=document.createElement('style');st.textContent='#titleScreen .tm-emblem{display:block;width:96px;height:96px;margin:0 auto 10px;filter:drop-shadow(0 6px 18px #000a) drop-shadow(0 0 28px #d5865955)}';document.head.appendChild(st)}
 const ver=document.createElement('div');ver.className='tm-version';ver.textContent='v'+(window.DOD_VERSION||'dev');title.appendChild(ver);

 // Remember which hero the player chose to play.
 const markStarted=()=>{try{const h=JSON.parse(localStorage.getItem('mdjup')||'null');if(h)localStorage.setItem(STARTED_KEY,String(h.heroName))}catch(e){}};
 cont?.addEventListener('click',markStarted);
 $('createHeroBtn')?.addEventListener('click',()=>setTimeout(markStarted,0));
 if(how)how.onclick=()=>howToPlay();
 if(begin&&save){const startNew=begin.onclick;begin.onclick=e=>confirmDialog('Start a new hero?',`<b>${esc(save.name)}</b> (Lv ${save.lv} ${esc(save.cls)}) will be replaced once you create a new hero. Choose <b>Continue</b> instead to keep playing them.`,'Start new hero',()=>startNew.call(begin,e))}
 if(del&&save)del.onclick=()=>confirmDialog('Erase this hero?',`This permanently deletes <b>${esc(save.name)}</b> and all progress stored in this browser. Cloud saves are not affected. This cannot be undone.`,'Erase hero',()=>{['mdjup','dodClass','dodProgression','dodProgressionV2','dodTalentTreeV2','dodWarriorTalentTreeV1','dodWarriorLoadoutV1','dodSpellBookV1','dodParagonV1','dodClassLoadoutsV1','dodBuildMasteryV1','dodGemsV1','dodAspectsV1','dodLootFilterV1','dodFragmentsV1','dodRiftV1','dodGoldV1','dodBestiaryV1','dodLoreTomesV1','dodSlayerTitleV1','dodHudLayoutV1','dodStarterPotionsV1','dodRunModeV1','dodWhirlTrialLevel','dodWhirlTrialBackupV1','dod21achievements','dod2meta','dod3meta',STARTED_KEY].forEach(x=>localStorage.removeItem(x));location.reload()});

 const titleOpen=()=>getComputedStyle(title).display!=='none';
 const items=()=>[...actions.querySelectorAll('button')].filter(b=>!b.hidden&&b.offsetParent!==null);
 actions.addEventListener('mouseover',window.dodMenu.hoverFocus('button'));
 addEventListener('keydown',e=>{
  if(isOpen()||!titleOpen())return;
  const list=items();if(!list.length)return;
  const i=list.indexOf(document.activeElement);
  if(arrowNav(e,list)){e.stopImmediatePropagation();return}
  if(e.key==='Enter'&&i<0){e.preventDefault();list[0].click()}
 },true);
 const focusPrimary=()=>{if(titleOpen()&&!isOpen())(actions.querySelector('.tm-primary')||items()[0])?.focus({preventScroll:true})};
 new MutationObserver(focusPrimary).observe(title,{attributes:true,attributeFilter:['style']});
 setTimeout(focusPrimary,50);
})();
