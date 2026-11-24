/* DEPTHS OF DARKNESS 2.0 — COMBAT & BOSS REWORK */
(()=>{
 const css=document.createElement('style');
 css.textContent=`
 #combatCard,#combatToast{display:none!important}
 #combatCard b{display:block;color:#f0c875;font:16px Georgia,serif}
 #combatCard small{color:#d1bda0}
 /* hidden */
 @media(max-width:560px){#combatCard{top:calc(env(safe-area-inset-top,0px) + 82px)}#combatToast{bottom:100px}}
 `;
 document.head.appendChild(css);
 const card=document.createElement('div');card.id='combatCard';document.body.appendChild(card);
 const toast=document.createElement('div');toast.id='combatToast';document.body.appendChild(toast);
 let toastTimer=0;
 const announce=t=>{toast.textContent=t;toast.style.display='block';toastTimer=1.35};
 const baseUpdate=update;
 update=function(dt){
   baseUpdate(dt);
   let activeBoss=null;
   for(const e of E){
     if(e.dead)continue;
     if(e.t==='bs'){
       activeBoss=e;
     }else if(e.el&&!e.campaignAffix&&!e.openingGuard&&e.aw&&D(P,e)<125){
       e.dod2Elite=(e.dod2Elite||0)-dt;
       if(e.dod2Elite<=0&&!P.dead){
         e.dod2Elite=e.eliteType==='ravager'?4.0:5.0;
         const x=P.x,y=P.y,rad=e.eliteType==='hexer'?116:e.eliteType==='crusher'?100:e.eliteType==='bulwark'?92:68,color=({bulwark:'#a9d5e6',ravager:'#ff735c',hexer:'#ca9dff',crusher:'#ffbd65'}[e.eliteType]||'#ffd44a'),mult=e.eliteType==='ravager'?1.3:e.eliteType==='crusher'?1.4:e.eliteType==='bulwark'?1.0:1.1;
         ring(x,y,rad,color);
         TG.push({x,y,r:rad,t:0,m:.72,d:e.d*mult});
         /* telegraph synced to game loop */
       }
     }
   }
   if(getComputedStyle(card).display!=='none'){
    if(activeBoss&&!activeBoss.dead){
      const hp=Math.max(0,activeBoss.mh-activeBoss.tk-(PD[activeBoss.id]||0));
      const phase=hp/activeBoss.mh<.35?'ENRAGED':hp/activeBoss.mh<.7?'AWAKENED':'DORMANT';
      card.innerHTML=`<b>${activeBoss.n}</b><small>${phase} · ${Math.ceil(hp/activeBoss.mh*100)}% health</small>`;
      card.style.display='block';
    }else card.style.display='none';
   }
   if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)toast.style.display='none'}
 };
 // Clear boss presentation immediately after a floor transition or victory.
 const previousDie=die;
 die=function(e){previousDie(e);if(e?.t==='bs')card.style.display='none'};
 const previousBuild=build;
 build=function(n){previousBuild(n);card.style.display='none';toast.style.display='none';toastTimer=0};
 // More useful combat hints without replacing the original controls.
 const help=$('help');
 if(help)help.innerHTML='WASD or joystick to move · 1–4 class skills · Q potion · I inventory · K talents · O enchanter · B codex<br>Bosses telegraph heavy attacks — step outside marked danger zones before impact.';
})();
