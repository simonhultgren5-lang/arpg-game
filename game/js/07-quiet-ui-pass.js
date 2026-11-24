/* DEPTHS OF DARKNESS — QUIET UI PASS */
(()=>{
 const top=document.getElementById('top');
 if(!top || document.getElementById('cleanMenuBtn')) return;
 const style=document.createElement('style');
 style.textContent=`
 /* calmer, consistent visual hierarchy */
 :root{--ui-bg:#0f0c0e;--ui-panel:#161113;--ui-line:#4a3a2d;--ui-gold:#ead08b;--ui-muted:#bfb097}
 #top{position:fixed!important;left:10px!important;right:auto!important;top:10px!important;width:auto!important;max-width:calc(100vw - 114px)!important;min-height:36px;box-sizing:border-box;display:flex!important;align-items:center!important;gap:8px!important;flex-wrap:wrap!important;padding:5px 9px!important;border:1px solid #4a3a2d!important;border-radius:3px!important;background:#0f0c0e!important;box-shadow:0 4px 12px #000a!important;z-index:40!important}




 #top:before{display:none!important}
 #quickActions{display:none!important}
 #top>span{font-size:12px;color:#f2e7cf;white-space:nowrap;font-variant-numeric:tabular-nums}
 #top button{font-size:11px!important;padding:4px 8px!important;border-radius:2px!important;white-space:nowrap;background:#1e1614!important;border-color:#594635!important;color:#f2e7cf!important}
 #top button[data-sanctuary]{display:none!important}
 #cleanMenuBtn{display:inline-flex!important;align-items:center;gap:7px;background:#2c1f19!important;border:1px solid #8a6d45!important;color:#f5e3b8!important}
 #cleanMenu{position:fixed;z-index:130;top:62px;right:14px;width:min(320px,calc(100vw - 28px));
   padding:12px;border:1px solid #8a6d45;border-radius:3px;background:#0f0c0e;
   box-shadow:0 12px 32px #000d;display:none}
 #cleanMenu.open{display:block}
 #cleanMenu .menuhead{display:flex;justify-content:space-between;align-items:center;padding:3px 4px 10px;
   color:#ead08b;font:16px Georgia,serif;border-bottom:1px solid #3c2f27;margin-bottom:9px}
 #cleanMenu .menugrid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
 #cleanMenu button{width:100%;min-height:38px;text-align:left;padding:8px 10px;border-radius:3px;
   background:#161113;border:1px solid #4a3a2d;color:#f2e7cf;font-size:12px}
 #cleanMenu button:hover{background:#2c1f19;border-color:#c9a24a}
 #cleanMenu .menugrid button[data-menu-danger]{color:#d8a79a}
 #help{display:none!important}
 #mm{top:10px!important;right:10px!important;width:86px!important;height:86px!important;border-radius:3px!important;opacity:.92}
 #boss{top:56px!important;width:min(320px,54vw)!important;font-size:14px!important}#boss div{height:6px!important;border-radius:2px!important;overflow:hidden}
 #bn{top:60px!important}
 #bar{bottom:14px!important}.orb{width:76px!important;height:76px!important}.s{width:46px!important;height:46px!important;font-size:20px!important}
 #xp{bottom:0!important;height:3px!important}
 #inv,#adv,#admin,#worldPanel,#progPanel,#d3service{border-radius:3px!important;
   box-shadow:0 12px 32px #000d!important;border:1px solid #8a6d45!important}
 #inv,#adv,#admin,#worldPanel{background:#0f0c0e!important;color:#f2e7cf}
 #worldPanel{position:fixed;inset:50% auto auto 50%;transform:translate(-50%,-50%);z-index:175;display:none;width:min(760px,95vw);max-height:90vh;overflow:auto;padding:18px}
 #worldPanel .worldHead{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;border-bottom:1px solid #3c2f27;padding-bottom:10px;margin-bottom:12px}
 #worldPanel h2,#worldPanel h3{font-family:Georgia,serif;color:#ead08b;margin:0}
 #worldPanel p{color:#bfb097;margin:4px 0}
 #worldPanel .worldGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:8px;margin-bottom:14px}
 #worldPanel .region{display:flex;flex-direction:column;gap:4px;text-align:left;padding:10px;border:1px solid #4a3a2d;border-radius:3px;background:#161113;color:#f2e7cf}
 #worldPanel .region.active{border-color:#c9a24a;background:#2c1f19}
 #worldPanel .region small{color:#bfb097;font-size:11px;line-height:1.35}
 #worldPanel .contract{border:1px solid #4a3a2d;border-radius:3px;background:#161113;padding:12px}
 #worldPanel .meter{height:6px;background:#0b090a;border:1px solid #3c2f27;border-radius:2px;overflow:hidden;margin:8px 0}
 #worldPanel .meter i{display:block;height:100%;background:#c9a24a}
 #inv h2,#adv h2,#admin h2{color:#ead08b}
 #sanctuary{background:rgba(8,6,7,.92)!important}
 #sanctuary .shell{width:min(900px,94vw)!important;padding:22px!important;border-radius:3px!important;
   border:1px solid #8a6d45!important;background:#0f0c0e!important;
   box-shadow:0 12px 32px #000d!important}
 #sanctuary h2{font-size:30px!important;margin:5px 0 7px!important}
 #sanctuary .intro{max-width:620px;color:#bfb097}
 #sanctuary .hubgrid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important}
 #sanctuary .hubcard{min-height:0!important;padding:13px!important;border:1px solid #4a3a2d!important;
   border-radius:3px!important;background:#161113!important}
 #sanctuary .hubcard h3{font:17px Georgia,serif!important;color:#ead08b!important;margin:0 0 7px!important}
 #sanctuary .hubcard p{font-size:12px!important;line-height:1.45!important;color:#bfb097!important;min-height:48px}
 #sanctuary .hubcard button{width:100%;margin:3px 0!important;font-size:12px!important}
 #sanctuary .hubfoot{margin-top:12px!important}
 #titleScreen{background:#0a0809!important}
 #titleScreen .shell{max-width:700px!important}
 #titleScreen h1{letter-spacing:.08em!important;line-height:.95!important}
 #titleScreen .d3-actions{display:flex;gap:9px;justify-content:center;flex-wrap:wrap}
 #titleScreen .d3-muted{font-size:11px!important;color:#9e8f7a!important}
 @media(max-width:680px){
   #top{left:6px!important;right:auto!important;top:6px!important;max-width:calc(100vw - 82px)!important;gap:5px!important;padding:4px 6px!important}
   #top:before{display:none}
   #top>span{font-size:11px}
   #top button{font-size:10px!important;padding:4px 6px!important}.orb{width:52px!important;height:52px!important}.s{width:40px!important;height:40px!important;font-size:17px!important}
   #mm{width:64px!important;height:64px!important;top:6px!important;right:8px!important}
   #sanctuary .shell{padding:15px!important;max-height:92vh;overflow:auto}
   #sanctuary .hubgrid{grid-template-columns:1fr 1fr!important}
   #sanctuary .hubcard p{min-height:0}
 }
 @media(max-width:390px){#sanctuary .hubgrid{grid-template-columns:1fr!important}}
 `;
 document.head.appendChild(style);
 // Keep Inventory and Talents directly available; retire the extra Adventure menu.
 const topBar=document.getElementById('top');
 const actions=document.getElementById('quickActions');
 const inventoryButton=document.getElementById('ib');
 const talentBtn=document.getElementById('talentQuick');if(inventoryButton){inventoryButton.textContent='Bag';inventoryButton.title='Inventory (I)'}if(talentBtn&&topBar){talentBtn.className='';talentBtn.textContent='Spell Book';talentBtn.title='Spell Book & Talents (K)';topBar.appendChild(talentBtn)}
 const hudEditNotice=document.createElement('div');hudEditNotice.id='hudEditNotice';hudEditNotice.textContent='Select a control, drag to move it, then adjust its size';hudEditNotice.hidden=true;document.body.appendChild(hudEditNotice);
 const hudSizePanel=document.createElement('label');hudSizePanel.id='hudSizePanel';hudSizePanel.innerHTML='Size <input type="range" min=".65" max="1.6" step=".05" value="1"><output>100%</output>';hudSizePanel.hidden=true;document.body.appendChild(hudSizePanel);
 const hudEditToggle=document.createElement('button');hudEditToggle.id='hudEditToggle';hudEditToggle.type='button';hudEditToggle.hidden=true;
 const hudReset=document.createElement('button');hudReset.id='hudReset';hudReset.type='button';hudReset.textContent='Reset HUD';hudReset.hidden=true;hudReset.title='Restore default HUD positions';actions?.appendChild(hudReset);
 topBar?.querySelectorAll('button').forEach(b=>{if(b!==inventoryButton&&b!==talentBtn)b.remove()});
 document.getElementById('ab')?.remove();
 document.getElementById('adminBtn')?.remove();
 const adminQuick=document.createElement('button');adminQuick.id='adminQuick';adminQuick.type='button';adminQuick.textContent='Admin';adminQuick.title='Admin Workshop (F2)';adminQuick.hidden=!window.dodIsAdmin;adminQuick.style.display=window.dodIsAdmin?'inline-flex':'none';adminQuick.onclick=adminOpen;topBar?.appendChild(adminQuick);
 const help=document.getElementById('help');
 if(help)help.textContent='Move with WASD or joystick · right-click or hold Autoattack · Active slots unlock at Lv 1, 2, 4 & 7 · Q potion · I inventory · K Spell Book';
 const mobileStyle=document.createElement('style');mobileStyle.textContent=`#mobileStick{display:none;position:fixed;z-index:28;left:18px;bottom:calc(112px + env(safe-area-inset-bottom,0px));width:112px;height:112px;border:1px solid #c9a15a88;border-radius:50%;background:radial-gradient(circle,#2a201ccc,#100a0bbb 70%);box-shadow:0 5px 20px #0009;touch-action:none;user-select:none}#mobileStick:before{content:'';position:absolute;inset:12px;border:1px solid #c9a15a55;border-radius:50%}#mobileStick .stickKnob{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border:2px solid #d1a75c;border-radius:50%;background:radial-gradient(circle at 35% 30%,#70502b,#231713);box-shadow:0 2px 10px #000a;pointer-events:none}#mobileAutoAttack{display:none}#mobileAutoAttack.pressed{filter:brightness(1.3);box-shadow:0 0 0 5px #f7d37e66,0 0 24px #ff7a18aa}#mobileStick.is-active{border-color:#f1cd78;box-shadow:0 5px 24px #d79c48aa}@media(max-width:760px){#mobileStick{display:block}#bar{position:static;display:contents;transform:none}#hp,#mp{position:fixed;bottom:calc(14px + env(safe-area-inset-bottom,0px));width:56px;height:56px;z-index:31}#hp{left:34%}#mp{left:52%}#sk{position:fixed;left:auto;right:12px;bottom:calc(94px + env(safe-area-inset-bottom,0px));transform:none;width:138px;height:138px;display:block!important;gap:0;padding:0;z-index:32}.s[data-slot]{position:absolute;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;padding:0;font-size:19px;box-shadow:0 3px 12px #000b,inset 0 1px #ffffff26}.s[data-slot] small{left:3px;top:0;font-size:9px}.s[data-slot="0"]{left:calc(50% - 22px);top:0}.s[data-slot="1"]{right:0;top:calc(50% - 22px)}.s[data-slot="2"]{left:calc(50% - 22px);bottom:0}.s[data-slot="3"]{left:0;top:calc(50% - 22px)}.s[data-slot="4"]{left:-42px;top:-40px;width:38px;height:38px;font-size:16px}.s[data-ability=shieldbash]{background:radial-gradient(circle at 35% 28%,#b58c4b,#47301e)}.s[data-ability=whirlwind]{background:radial-gradient(circle at 35% 28%,#a58ac0,#413047)}.s[data-ability=charge]{background:radial-gradient(circle at 35% 28%,#65a9bd,#244255)}.s[data-ability=groundslam]{background:radial-gradient(circle at 35% 28%,#d18056,#4d2921)}#mobileAutoAttack{display:grid;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:64px;height:64px;border:2px solid #d8b36a;border-radius:50%;background:radial-gradient(circle at 35% 28%,#a95432,#4b201a 72%);box-shadow:0 0 0 4px #100c0bbb,0 0 20px #df794644;color:#ffe5b4;place-content:center;gap:0}#mobileAutoAttack b{font-size:22px;line-height:1}#mobileAutoAttack small{font-size:8px;letter-spacing:.08em}#quickActions{left:8px;right:auto;top:calc(48px + env(safe-area-inset-top,0px));bottom:auto;flex-direction:row;gap:6px}#quickActions .quickAction,#quickActions #talentQuick{width:42px;height:42px}}@media(max-width:390px){#mobileStick{width:100px;height:100px;left:14px;bottom:calc(112px + env(safe-area-inset-bottom,0px))}#mobileStick .stickKnob{width:42px;height:42px;margin:-21px 0 0 -21px}#hp,#mp{width:48px;height:48px;bottom:calc(12px + env(safe-area-inset-bottom,0px))}#hp{left:31%}#mp{left:49%}#sk{right:4%;bottom:calc(94px + env(safe-area-inset-bottom,0px));width:116px;height:116px}.s[data-slot]{width:38px;height:38px;font-size:17px}.s[data-slot] small{font-size:8px}.s[data-slot="0"]{left:calc(50% - 19px)}.s[data-slot="1"]{top:calc(50% - 19px)}.s[data-slot="2"]{left:calc(50% - 19px)}.s[data-slot="3"]{top:calc(50% - 19px)}.s[data-slot="4"]{left:-36px;top:-34px;width:34px;height:34px;font-size:14px}#mobileAutoAttack{width:56px;height:56px}#mobileAutoAttack b{font-size:20px}}`;document.head.appendChild(mobileStyle);
 const mobileStick=document.createElement('div');mobileStick.id='mobileStick';mobileStick.setAttribute('aria-label','Movement joystick');mobileStick.innerHTML='<div class="stickKnob"></div>';document.body.appendChild(mobileStick);
 const stickKnob=mobileStick.querySelector('.stickKnob');let stickPointer=null,stickX=0,stickY=0,stickWasActive=false;
 const moveStick=e=>{const r=mobileStick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),max=r.width*.34,d=Math.min(Math.hypot(dx,dy),max),a=Math.atan2(dy,dx);stickX=Math.cos(a)*d/max;stickY=Math.sin(a)*d/max;window.dodCity?.setStick(stickX,stickY);stickKnob.style.transform=`translate(${Math.cos(a)*d}px,${Math.sin(a)*d}px)`};
 mobileStick.addEventListener('pointerdown',e=>{if(hudEditOn)return;e.preventDefault();stickPointer=e.pointerId;mobileStick.classList.add("is-active");mobileStick.setPointerCapture(e.pointerId);stickWasActive=true;moveStick(e)});
 mobileStick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)moveStick(e)});
 const releaseStick=e=>{if(e.pointerId!==stickPointer)return;stickPointer=null;mobileStick.classList.remove("is-active");stickX=stickY=0;window.dodCity?.setStick(0,0);stickKnob.style.transform='translate(0,0)'};
 mobileStick.addEventListener('pointerup',releaseStick);mobileStick.addEventListener('pointercancel',releaseStick);mobileStick.addEventListener('lostpointercapture',releaseStick);
 const hudStyle=document.createElement('style');hudStyle.textContent=`#hudEditToggle[aria-pressed="true"]{border-color:#c9a24a!important}#hudReset{position:fixed;z-index:10002;right:20px;top:20px;padding:9px 13px;border:1px solid #8a6d45;border-radius:3px;background:#1e1614;color:#f2e7cf;box-shadow:0 4px 12px #000b}#hudEditNotice{position:fixed;z-index:10002;left:50%;top:18px;transform:translateX(-50%);padding:8px 12px;border:1px solid #8a6d45;border-radius:3px;background:#0f0c0e;color:#f2e7cf;font:12px system-ui;white-space:nowrap;pointer-events:none}#hudSizePanel{position:fixed;z-index:10002;left:50%;top:54px;transform:translateX(-50%);display:flex;align-items:center;gap:9px;padding:8px 12px;border:1px solid #8a6d45;border-radius:3px;background:#0f0c0e;color:#f2e7cf;font:12px system-ui}#hudSizePanel[hidden]{display:none}#hudSizePanel input{width:120px;accent-color:#c9a24a}#hudSizePanel output{min-width:38px}body.hud-layout-editing [data-hud-movable]{outline:2px dashed #c9a24a!important;outline-offset:3px!important;cursor:grab!important;touch-action:none!important}body.hud-layout-editing [data-hud-movable].hud-dragging{cursor:grabbing!important;z-index:10000!important}body.hud-layout-editing #mm,body.hud-layout-editing #boss{pointer-events:auto!important}body.hud-layout-editing #xp{height:14px!important}`;document.head.appendChild(hudStyle);
 const hudTargets=[...document.querySelectorAll('#hp,#mp,#sk .s,#mobileAutoAttack,#mobileStick,#top,#mm,#boss,#xp,#help,#quickActions .inventoryOrb,#talentQuick')];
 const hudKey='dodHudLayoutV1';
 const hudOrigins=new Map();
 hudTargets.forEach((el,i)=>{el.dataset.hudMovable=el.id||el.dataset.hudMovable||`skill-${i}`;hudOrigins.set(el,{parent:el.parentNode,next:el.nextSibling})});
 const placeHudElement=(el,p)=>{if(!el.isConnected)document.body.appendChild(el);el.style.position='fixed';el.style.right='auto';el.style.bottom='auto';el.style.transform='none';el.style.transformOrigin='top left';el.style.scale=String(p.scale||1);el.style.margin='0';el.style.zIndex='40';const scale=p.scale||1;el.style.left=`${Math.min(Math.max(0,p.x*innerWidth),Math.max(0,innerWidth-el.offsetWidth*scale))}px`;el.style.top=`${Math.min(Math.max(0,p.y*innerHeight),Math.max(0,innerHeight-el.offsetHeight*scale))}px`};
 const hudSaved=()=>JSON.parse(localStorage.getItem(hudKey)||'{}'),saveHudElement=(el)=>{try{const r=el.getBoundingClientRect(),saved=hudSaved();saved[el.dataset.hudMovable]={x:r.left/innerWidth,y:r.top/innerHeight,scale:Number(el.style.scale)||1};localStorage.setItem(hudKey,JSON.stringify(saved))}catch(e){}};
 const sizeRange=hudSizePanel.querySelector('input'),sizeOutput=hudSizePanel.querySelector('output');let selectedHud=null;
 sizeRange.oninput=()=>{if(!selectedHud)return;const r=selectedHud.getBoundingClientRect(),scale=Number(sizeRange.value);selectedHud.style.scale=String(scale);sizeOutput.value=Math.round(scale*100)+'%';selectedHud.style.left=`${Math.min(r.left,Math.max(0,innerWidth-selectedHud.offsetWidth*scale))}px`;selectedHud.style.top=`${Math.min(r.top,Math.max(0,innerHeight-selectedHud.offsetHeight*scale))}px`;saveHudElement(selectedHud)};
 const loadHudLayout=()=>{try{const saved=hudSaved();hudTargets.forEach(el=>{const p=saved[el.dataset.hudMovable];if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))placeHudElement(el,p)})}catch(e){}};
 loadHudLayout();
 let hudEditOn=false;
 hudEditToggle.onclick=()=>{hudEditOn=!hudEditOn;hudEditToggle.setAttribute('aria-pressed',String(hudEditOn));hudEditToggle.textContent=hudEditOn?'✓':'⚙';hudEditToggle.title=hudEditOn?'Finish HUD layout':'Customize HUD';hudEditToggle.setAttribute('aria-label',hudEditToggle.title);document.body.classList.toggle('hud-layout-editing',hudEditOn);hudReset.hidden=!hudEditOn;hudEditNotice.hidden=!hudEditOn;hudSizePanel.hidden=!hudEditOn};
 hudReset.onclick=()=>{try{localStorage.removeItem(hudKey)}catch(e){}hudTargets.forEach(el=>{const origin=hudOrigins.get(el);if(origin?.parent)origin.parent.insertBefore(el,origin.next?.parentNode===origin.parent?origin.next:null);el.removeAttribute('data-hud-movable');delete el.dataset.hudMovable;el.style.position='';el.style.left='';el.style.top='';el.style.right='';el.style.bottom='';el.style.transform='';el.style.transformOrigin='';el.style.scale='';el.style.margin='';el.style.zIndex='';el.classList.remove('hud-dragging')});hudTargets.forEach((el,i)=>{el.dataset.hudMovable=el.id||`skill-${i}`});document.body.classList.remove('hud-layout-editing');hudEditOn=false;hudEditToggle.setAttribute('aria-pressed','false');hudEditToggle.textContent='⚙';hudEditToggle.title='Customize HUD';hudEditToggle.setAttribute('aria-label','Customize HUD');hudReset.hidden=true;hudEditNotice.hidden=true;hudSizePanel.hidden=true};
 hudTargets.forEach(el=>{let drag=null;el.addEventListener('click',e=>{if(hudEditOn){e.preventDefault();e.stopImmediatePropagation()}},true);el.addEventListener('pointerdown',e=>{if(!hudEditOn||e.target.closest('#hudEditToggle,#hudReset,#hudSizePanel'))return;e.preventDefault();selectedHud=el;const layout=hudSaved()[el.dataset.hudMovable]||{};sizeRange.value=String(layout.scale||el.style.scale||1);sizeOutput.value=Math.round(Number(sizeRange.value)*100)+'%';el.setPointerCapture(e.pointerId);const r=el.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,left:r.left,top:r.top};placeHudElement(el,{x:r.left/innerWidth,y:r.top/innerHeight,scale:Number(sizeRange.value)});el.classList.add('hud-dragging')});el.addEventListener('pointermove',e=>{if(!drag)return;const r=el.getBoundingClientRect(),x=Math.max(0,Math.min(innerWidth-r.width,drag.left+e.clientX-drag.x)),y=Math.max(0,Math.min(innerHeight-r.height,drag.top+e.clientY-drag.y));el.style.left=`${x}px`;el.style.top=`${y}px`});const finish=()=>{if(!drag)return;drag=null;el.classList.remove('hud-dragging');saveHudElement(el)};el.addEventListener('pointerup',finish);el.addEventListener('pointercancel',finish)});
 window.addEventListener('resize',loadHudLayout);
 const previousUpdate=update;update=function(dt){if(stickPointer!==null){P.tgt=null;P.mv={x:P.x+stickX*180,y:P.y+stickY*180}}else if(stickWasActive){P.mv=null;P.tgt=null;stickWasActive=false}previousUpdate(dt)};
})();
