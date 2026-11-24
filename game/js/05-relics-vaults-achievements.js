/* DEPTHS OF DARKNESS 2.1 — RELICS, TREASURE VAULTS, ACHIEVEMENTS */
(()=>{
 const css=document.createElement('style');
 css.textContent=`
 #expeditionPanel{position:fixed;z-index:45;left:10px;bottom:116px;width:min(300px,88vw);padding:10px 12px;border:1px solid #8a6d45;border-radius:3px;background:#0f0c0e;box-shadow:0 8px 24px #000c;pointer-events:none}
 #expeditionPanel b{color:#ead08b;font:16px Georgia,serif}#expeditionPanel small{color:#bfb097}
 #expeditionPanel .epbar{height:5px;background:#0b090a;border:1px solid #3c2f27;margin:5px 0 2px;border-radius:2px;overflow:hidden}
 #expeditionPanel .epbar i{display:block;height:100%;background:#c9a24a}
 @media(max-width:560px){#expeditionPanel{bottom:88px;width:190px;font-size:11px}}
 `;
 document.head.appendChild(css);
 const panel=document.createElement('div');panel.id='expeditionPanel';document.body.appendChild(panel);
 const relics=[
  {name:'Emberheart',icon:'🔥',desc:'Damage +25%',color:'#ff7438',apply(){P.relicDamage=1.25}},
  {name:'Moonwell',icon:'🌙',desc:'Mana regeneration ×2',color:'#9c9cff',apply(){P.relicMana=2}},
  {name:'Stoneblood',icon:'🪨',desc:'Armor +18',color:'#b6a58a',apply(){P.relicArmor=18}},
  {name:'Windstep',icon:'🍃',desc:'Movement speed +25%',color:'#8bd6a0',apply(){P.relicSpeed=25}},
  {name:'Soul Lantern',icon:'👻',desc:'Life steal +8%',color:'#c5a0ff',apply(){P.relicLife=8}}
 ];
 let shrine=null,chest=null,shrineUsed=false,chestsOpened=0,achievements={firstChest:false,tenKills:false,firstBoss:false};
 let relicTime=0,relicName='None',killCount=0;
 const originalBuild=build;
 build=function(n){
  originalBuild(n);
  shrine=null;chest=null;shrineUsed=false;
  P.relicDamage=1;P.relicMana=1;P.relicArmor=0;P.relicSpeed=0;P.relicLife=0;relicTime=0;relicName='None';
  const candidates=rooms.slice(1,Math.max(2,rooms.length-1));
  if(candidates.length){const r=candidates[RI(0,candidates.length-1)];shrine={x:(r.cx+.5)*TS,y:(r.cy+.5)*TS};}
  if(n%2===0&&candidates.length){let r=candidates[RI(0,candidates.length-1)];chest={x:(r.cx+.5)*TS,y:(r.cy+.5)*TS};}
 };
 const originalStats=stats;
 stats=function(){const s=originalStats();s.a+=P.relicArmor||0;s.s+=P.relicSpeed||0;s.l+=P.relicLife||0;return s};
 const originalHit=hit;
 hit=function(e,d,...args){d*=P.relicDamage||1;originalHit(e,d,...args)};
 const originalUpdate=update;
 update=function(dt){
  originalUpdate(dt);
  if(relicTime>0){relicTime=Math.max(0,relicTime-dt);if(relicTime===0){P.relicDamage=1;P.relicMana=1;P.relicArmor=0;P.relicSpeed=0;P.relicLife=0;relicName='None'}}
  if(shrine&&!shrineUsed&&D(P,shrine)<43&&!P.dead){
   shrineUsed=true;const r=relics[RI(0,relics.length-1)];r.apply();relicTime=45;relicName=r.name;
   ring(shrine.x,shrine.y,115,r.color);burst(shrine.x,shrine.y,r.color,42,240,.8,5);
   P.hp=Math.min(stats().H,P.hp+stats().H*.2);P.mp=Math.min(stats().M,P.mp+stats().M*.3);
   snd(720,.35,'sine',.08,500);shrine=null;
  }
  if(chest&&D(P,chest)<42&&!P.dead){
   chestsOpened++;chest=null;advanceForgeOrder(3);
   const item=mkItem(fl,.18);take(item);P.hp=Math.min(stats().H,P.hp+stats().H*.15);
   achievements.firstChest=true;banner('TREASURE VAULT · GEAR DISCOVERED');burst(P.x,P.y,'#eac879',55,280,.9,5);save();
  }
  if(relicTime>0&&P.relicMana>1)P.mp=Math.min(stats().M,P.mp+dt*8);
  if(getComputedStyle(panel).display!=='none'){panel.innerHTML=`<b>✦ Expedition</b><br><small>Relic: ${relicName}${relicTime>0?' · '+Math.ceil(relicTime)+'s':''}</small><div class="epbar"><i style="width:${relicTime/45*100}%"></i></div><small>Vaults opened: ${chestsOpened}<br>Enemies defeated: ${killCount} · ${achievements.firstBoss?'Boss slayer ✓':'Boss slayer: pending'}</small>`;}
 };
 const originalDraw=draw;
 draw=function(){
  originalDraw();
  g.save();g.translate(Math.round(W/2-P.x),Math.round(H/2-P.y*worldY()));g.scale(1,worldY());
  if(shrine&&!shrineUsed){const pulse=1+Math.sin(tm*4)*.12;g.globalAlpha=.9;g.shadowColor='#b98aff';g.shadowBlur=24;g.fillStyle='#b98aff';g.beginPath();g.arc(shrine.x,shrine.y-8,10*pulse,0,Math.PI*2);g.fill();g.strokeStyle='#e4c8ff';g.lineWidth=3;g.beginPath();g.arc(shrine.x,shrine.y-8,22*pulse,0,Math.PI*2);g.stroke();g.font='18px serif';g.textAlign='center';g.fillText('✦',shrine.x,shrine.y-27)}
  if(chest){g.globalAlpha=1;g.shadowColor='#ffd45c';g.shadowBlur=18;g.fillStyle='#9a5b20';g.fillRect(chest.x-13,chest.y-8,26,19);g.fillStyle='#eac879';g.fillRect(chest.x-13,chest.y-9,26,6);g.fillRect(chest.x-2,chest.y-7,4,17);g.strokeStyle='#ffe5a0';g.strokeRect(chest.x-13,chest.y-9,26,20);g.font='16px serif';g.textAlign='center';g.fillText('✧',chest.x,chest.y-17)}
  g.restore();
 };
 const originalDie=die;
 die=function(e){const wasDead=e.dead;originalDie(e);if(!wasDead){killCount++;if(killCount>=10)achievements.tenKills=true;if(e.t==='bs')achievements.firstBoss=true}};
 // Include temporary relic bonuses in save data without changing the existing save schema.
 const oldSave=save;
 save=function(){oldSave();try{localStorage.setItem('dod21achievements',JSON.stringify({chestsOpened,achievements,killCount}))}catch(e){}};
 try{const v=JSON.parse(localStorage.getItem('dod21achievements')||'{}');chestsOpened=v.chestsOpened||0;killCount=v.killCount||0;achievements=Object.assign(achievements,v.achievements||{})}catch(e){}
 window.dodExpansion={relics,achievements,getStats:()=>({chestsOpened,killCount,relicName,relicTime})};
})();
