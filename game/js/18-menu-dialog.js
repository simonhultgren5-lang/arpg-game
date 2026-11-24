/* DEPTHS OF DARKNESS — MENU LAYER, part 1: shared dialog used by every menu */
(()=>{
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const k=(...keys)=>keys.map(x=>`<kbd>${x}</kbd>`).join('');
 // A <dialog> so the game loop's dungeonMenuOpen() check (dialog[open]) pauses play while it is up.
 const modal=document.createElement('dialog');modal.id='tmModal';document.body.appendChild(modal);
 let lastFocus=null,onCloseCb=null;
 function openModal(html,{onAction,onClose,narrow}={}){
  if(!modal.open)lastFocus=document.activeElement;
  onCloseCb=onClose||null;
  modal.innerHTML=`<div class="tm-card${narrow?' tm-narrow':''}">${html}</div>`;
  if(!modal.open){try{modal.showModal()}catch(e){modal.setAttribute('open','')}}
  modal.onclick=e=>{
   if(e.target===modal){closeModal();return}
   const b=e.target.closest('[data-tm]');if(!b)return;
   const a=b.dataset.tm;
   if(a==='close'){closeModal();return}
   closeModal(true);onAction&&onAction(a);
  };
  (modal.querySelector('[data-tm-focus]')||modal.querySelector('button'))?.focus();
 }
 function closeModal(silent){
  if(!modal.open)return;
  const cb=onCloseCb;onCloseCb=null;
  modal.close();modal.innerHTML='';
  if(lastFocus&&document.contains(lastFocus))try{lastFocus.focus({preventScroll:true})}catch(e){}
  if(!silent&&cb)cb();
 }
 modal.addEventListener('cancel',e=>{e.preventDefault();closeModal()});
 function howToPlay(onClose){openModal(`<h2>How to Play</h2><p>Choose a Warrior (melee), Pyromancer (arcane fire) or Shadow Rogue (twin blades), then descend. A boss guards every third depth.</p>
  <h3>Movement &amp; Combat</h3><dl class="tm-grid">
  <dt>${k('W','A','S','D')}</dt><dd>Move (arrow keys or touch joystick also work)</dd>
  <dt>${k('Left mouse')}</dt><dd>Hold to advance and attack foes ahead. Every third attack hits a wider area</dd>
  <dt>${k('Right mouse')}</dt><dd>Hold to aim while strafing</dd>
  <dt>${k('1','2','3','4')}</dt><dd>Abilities. Unlock at levels 1, 2, 4 and 7</dd>
  <dt>${k('Q')}</dt><dd>Drink health potion</dd></dl>
  <h3>Menus</h3><dl class="tm-grid">
  <dt>${k('I')}</dt><dd>Bag &amp; equipment</dd>
  <dt>${k('K')}</dt><dd>Spell book &amp; talents</dd>
  <dt>${k('O')}</dt><dd>Crafting atelier</dd>
  <dt>${k('B')}</dt><dd>Codex</dd>
  <dt>${k('M')}</dt><dd>Mute sound</dd>
  <dt>${k('Esc')}</dt><dd>Close the open panel, or pause</dd></dl>
  <div class="tm-btns"><button data-tm="close" data-tm-focus>Got it</button></div>`,{onClose})}
 function confirmDialog(heading,body,okLabel,onOk,{danger=true}={}){openModal(`<h2>${heading}</h2><p>${body}</p><div class="tm-btns"><button data-tm="close" data-tm-focus>Cancel</button><button data-tm="ok" class="${danger?'tm-danger':''}">${okLabel}</button></div>`,{onAction:a=>{if(a==='ok')onOk()}})}
 // Arrow-key focus movement inside any vertical button list.
 function arrowNav(e,list){
  if(!list.length)return false;
  const down=e.key==='ArrowDown',up=e.key==='ArrowUp';if(!down&&!up)return false;
  const i=list.indexOf(document.activeElement);
  e.preventDefault();list[i<0?0:(i+(down?1:-1)+list.length)%list.length].focus();return true;
 }
 modal.addEventListener('keydown',e=>{const list=[...modal.querySelectorAll('.tm-menu button')];if(arrowNav(e,list))e.stopPropagation()});
 // Mouse and keyboard share one highlight: hovering a menu button focuses it.
 const hoverFocus=sel=>e=>{const b=e.target.closest(sel);if(b&&document.activeElement!==b)b.focus({preventScroll:true})};
 modal.addEventListener('mouseover',hoverFocus('.tm-menu button'));
 // While a dialog is up, keep single-key game hotkeys (I, K, O, B, Q, 1–4…) from acting on the game underneath.
 addEventListener('keydown',e=>{if(modal.open&&e.key.length===1&&e.key!==' '&&!e.ctrlKey&&!e.metaKey)e.stopImmediatePropagation()},true);
 window.dodMenu={hoverFocus,openModal,closeModal,isOpen:()=>modal.open,howToPlay,confirm:confirmDialog,esc,kbd:k,arrowNav,modal};
})();
