(()=>{
 const MODS=[
  {id:'blood_moon',name:'Blood Moon',icon:'🌑',desc:'+18% Crit Dmg · +4% Leech',color:'#e85563'},
  {id:'frenzy_winds',name:'Frenzy Winds',icon:'💨',desc:'+16% Move Speed',color:'#7ee0b5'},
  {id:'treasure_vault',name:'Treasure Vault',icon:'💎',desc:'+1 Elixir · Richer Drops',color:'#f0c96a'},
  {id:'arcane_surge',name:'Arcane Surge',icon:'⚡',desc:'+35% Mana Recovery',color:'#8cb4ff'}
 ];
 let activeMod=null,cursedChest=null,cursedAmbush=null,lastNotifiedDepth=0,lastCheckpointAt=0;
 const hashDate=(str)=>{let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return Math.abs(h)%999983};
 const runModeState=(()=>{
  let m={runMode:'standard',challengeDate:null};
  try{const raw=JSON.parse(localStorage.getItem('dodRunModeV1')||'null');if(raw&&['standard','daily','hardcore'].includes(raw.runMode))m=raw}catch(e){}
  window.dodDailySeedOffset=m.runMode==='daily'&&m.challengeDate?hashDate(m.challengeDate):0;
  return m;
 })();
 const getBuildSummary=()=>{
  const equipment=(Array.isArray(P?.eq)?P.eq:[]).filter(Boolean).map(it=>({
   name:String(it.n||'Gear').slice(0,48),
   slot:Number(it.s)||0,
   rarity:Number(it.r)||0,
   icon:it.icon||undefined,
   itemLevel:Number(it.itemLevel)||Number(P?.lv)||1,
   stats:it.st&&typeof it.st==='object'?it.st:undefined
  }));
  const loadout=Array.isArray(abilityLoadout)?[...abilityLoadout]:[];
  return {equipment,loadout,heroClass:window.dodHeroClass||'warrior'};
 };
 const setRunMode=(next)=>{
  if(!next||!['standard','daily','hardcore'].includes(next.runMode))return;
  runModeState.runMode=next.runMode;
  runModeState.challengeDate=next.runMode==='daily'?(next.challengeDate||new Date().toISOString().slice(0,10)):null;
  window.dodDailySeedOffset=runModeState.runMode==='daily'&&runModeState.challengeDate?hashDate(runModeState.challengeDate):0;
  try{localStorage.setItem('dodRunModeV1',JSON.stringify(runModeState))}catch(e){}
 };
 window.addEventListener('message',e=>{
  if(e.origin!==window.location.origin||!e.data||typeof e.data!=='object')return;
  if(e.data.type==='dod:set-run-mode'){
   setRunMode(e.data);
   if(!P.dead&&typeof build==='function'){build(runModeState.runMode==='daily'?1:fl);banner(runModeState.runMode==='daily'?'Daily Mode':'Hardcore Mode'===runModeState.runMode?'Hardcore Mode':runModeState.runMode==='hardcore'?'Hardcore Mode':'Standard Mode')}
  }
 });
 const emitCheckpoint=(reason)=>{
  if(!window.parent||window.parent===window)return;
  const now=Date.now();
  if(reason==='floor'&&now-lastCheckpointAt<1500)return;
  lastCheckpointAt=now;
  try{
   save();
   window.parent.postMessage({
    type:'dod:checkpoint',
    reason,
    heroName:(me&&me.n)||'Varg',
    heroLevel:Number(P&&P.lv)||1,
    currentDepth:Number(fl)||1,
    bestDepth:Math.max(Number(best)||1,Number(fl)||1),
    runMode:runModeState.runMode,
    challengeDate:runModeState.challengeDate,
    buildSummary:getBuildSummary()
   },window.location.origin);
  }catch(e){}
 };
 const prevBuild=build;
 build=function(n){
  prevBuild(n);
  const dailyShift=runModeState.runMode==='daily'?(window.dodDailySeedOffset||0):RI(0,MODS.length-1);
  activeMod=n>=2?MODS[(n*7+dailyShift)%MODS.length]:null;
  cursedChest=null;cursedAmbush=null;
  if(activeMod&&activeMod.id==='treasure_vault'){elixirs=Math.min(9,elixirs+1);if(typeof LT!=='undefined'&&rooms.length>1){const r=rooms[1];LT.push({x:(r.cx+.5)*TS,y:(r.cy+.5)*TS,it:mkItem(n,.45),t:0})}}
  if(n>=2&&n%2===1&&rooms.length>2){
   const pool=rooms.slice(1,rooms.length-1);
   const rm=pool[runModeState.runMode==='daily'?(dailyShift+n)%pool.length:RI(0,pool.length-1)];
   cursedChest={x:(rm.cx+.35)*TS,y:(rm.cy+.35)*TS};
  }
  if(activeMod){banner(`Depth ${n} · ${activeMod.name}`)}
  if(n>1&&n!==lastNotifiedDepth){lastNotifiedDepth=n;setTimeout(()=>emitCheckpoint('floor'),180)}
 };
 const prevStats=stats;
 stats=function(){
  const s=prevStats();
  if(activeMod){
   if(activeMod.id==='blood_moon'){s.critDmg=(s.critDmg||0)+18;s.leech=(s.leech||0)+4}
   else if(activeMod.id==='frenzy_winds'){s.s=(s.s||0)+16}
  }
  return s;
 };
 const prevUpdate=update;
 update=function(dt){
  prevUpdate(dt);
  if(activeMod&&activeMod.id==='arcane_surge'&&!P.dead){P.mp=Math.min(stats().M,P.mp+dt*5)}
  if(cursedChest&&!P.dead&&D(P,cursedChest)<44){
   const cx=cursedChest.x,cy=cursedChest.y;cursedChest=null;
   sh=12;ring(cx,cy,140,'#e84855');burst(cx,cy,'#e84855',36,240,.75,4);
   snd(110,.28,'sawtooth',.08,-45);setTimeout(()=>snd(85,.32,'sawtooth',.07,-30),90);
   banner('Cursed Ambush!');
   const spawned=[];
   for(let i=0;i<4;i++){
    const ang=i*Math.PI/2+.4,gx=cx+Math.cos(ang)*64,gy=cy+Math.sin(ang)*64;
    if(fits(gx,gy,14)){
     const foe=mkE(i===0?'zb':'sk',gx,gy,fl,9000+i,i===0);
     foe.aw=1;E.push(foe);spawned.push(foe);
    }
   }
   cursedAmbush={x:cx,y:cy,foes:spawned};
  }
  if(cursedAmbush&&cursedAmbush.foes.every(f=>f.dead)){
   const ax=cursedAmbush.x,ay=cursedAmbush.y;cursedAmbush=null;
   for(let i=0;i<2;i++){LT.push({x:ax+(i===0?-20:20),y:ay,it:mkItem(fl,.85),t:0})}
   LT.push({x:ax,y:ay+18,o:1,t:0});
   ring(ax,ay,120,'#f0c96a');burst(ax,ay,'#f0c96a',40,220,.8,4);
   snd(587,.14,'triangle',.07,80);setTimeout(()=>snd(880,.26,'triangle',.08,160),110);
   banner('Cursed Chest cleared');
  }
  const ep=document.getElementById('expeditionPanel');
  if(ep&&getComputedStyle(ep).display!=='none'&&activeMod&&!ep.querySelector('[data-floor-mod]')){
   const line=document.createElement('small');line.setAttribute('data-floor-mod','1');
   line.style.cssText='display:block;margin-top:4px;color:'+activeMod.color;
   line.textContent=activeMod.icon+' '+activeMod.name+': '+activeMod.desc;
   ep.appendChild(line);
  }
 };
 const prevDraw=draw;
 draw=function(){
  prevDraw();
  if(!cursedChest)return;
  g.save();g.translate(Math.round(W/2-P.x),Math.round(H/2-P.y*worldY()));g.scale(1,worldY());
  const pulse=1+Math.sin(tm*5)*.14;
  if(!prefState.highPerformance){g.shadowColor='#ff4252';g.shadowBlur=18}
  g.strokeStyle='#ff5e6c';g.lineWidth=2.5;
  g.beginPath();g.arc(cursedChest.x,cursedChest.y,21*pulse,0,Math.PI*2);g.stroke();
  g.fillStyle='#5c161e';g.fillRect(cursedChest.x-13,cursedChest.y-9,26,19);
  g.fillStyle='#e85563';g.fillRect(cursedChest.x-13,cursedChest.y-10,26,5);
  g.font='15px serif';g.textAlign='center';g.fillStyle='#ffd6da';
  g.fillText('☠',cursedChest.x,cursedChest.y-16);
  g.restore();
 };
 const prevHurt=hurt;
 hurt=function(d){
  const wasDead=Boolean(P.dead);
  prevHurt(d);
  if(!wasDead&&P.dead&&runModeState.runMode==='hardcore'){
   const dtEl=$('dt'),rvEl=$('rv');
   if(dtEl)dtEl.textContent='HARDCORE FALLEN · Depth '+fl+' · Level '+P.lv;
   if(rvEl){
    rvEl.textContent='Create New Hero';
    rvEl.onclick=()=>{
     try{
      ['mdjup','dodClass','dodProgression','dodProgressionV2','dodTalentTreeV2','dodWarriorTalentTreeV1','dodWarriorLoadoutV1','dodParagonV1','dodClassLoadoutsV1','dodBuildMasteryV1','dodGemsV1','dodAspectsV1','dodLootFilterV1','dodFragmentsV1','dodRiftV1','dodGoldV1','dodBestiaryV1','dodLoreTomesV1','dodSlayerTitleV1','dodStarterPotionsV1','dod21achievements','dod2meta','dod3meta'].forEach(k=>localStorage.removeItem(k));
     }catch(e){}
     location.reload();
    };
   }
   try{
    window.parent?.postMessage({
     type:'dod:hero-fallen',
     heroName:(me&&me.n)||'Varg',
     heroLevel:Number(P&&P.lv)||1,
     depthReached:Number(fl)||1,
     causeOfDeath:'Fallen in Hardcore on Depth '+(Number(fl)||1),
     buildSummary:getBuildSummary()
    },window.location.origin);
   }catch(e){}
  }
 };
 const prevDie=die;
 die=function(e){
  const wasDead=e&&e.dead;
  prevDie(e);
  if(e&&!wasDead&&(e.t==='bs'||e.boss)){
   snd(293,.18,'triangle',.07,0);
   setTimeout(()=>snd(440,.22,'triangle',.07,0),120);
   setTimeout(()=>snd(587,.38,'triangle',.08,40),240);
   setTimeout(()=>emitCheckpoint('boss'),280);
  }
 };
 window.dodFloorMods={getActive:()=>activeMod};
 window.dodBuildSnapshot=getBuildSummary;
 window.dodRunMode={get:()=>({...runModeState}),set:setRunMode};
 window.dodStash={
  listInventory:()=>Array.isArray(P?.inv)?P.inv.map((item,index)=>({index,item})):[],
  popInventoryItem:(index)=>{
   if(!Array.isArray(P?.inv)||index<0||index>=P.inv.length)return null;
   const [removed]=P.inv.splice(index,1);
   if(typeof save==='function')save();
   if(typeof renderInv==='function')renderInv();
   return removed||null;
  },
  giveItem:(item)=>{
   if(!item||!Array.isArray(P?.inv)||P.inv.length>=24)return false;
   P.inv.push(JSON.parse(JSON.stringify(item)));
   if(typeof save==='function')save();
   if(typeof renderInv==='function')renderInv();
   if(typeof banner==='function')banner('✦ Claimed '+(item.n||'Item')+' from Shared Stash');
   snd(660,.18,'triangle',.07,160);
   return true;
  }
 };
 if(window.parent&&window.parent!==window){requestAnimationFrame(()=>{try{window.parent.postMessage({type:'dod:ready'},window.location.origin)}catch(e){}})}
})();
