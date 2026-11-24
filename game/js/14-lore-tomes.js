(()=>{
 const LORE=[
  {id:'ashen_age',title:'Chronicle of the Ashen Age',text:'When the sun dimmed above the northern keep, the lower vaults fractured into shifting abysses.'},
  {id:'butcher_pact',title:'Ledger of the Butcher',text:'No prisoner left Depth 3 alive once the iron hooks began to swing beneath the chapel.'},
  {id:'blood_witch',title:'Covenant of Crimson',text:'The Blood Witch bound her coven with living veins; every bleed strengthens the deep.'},
  {id:'grave_lord',title:'Epitaph of the Grave Lord',text:'Royal bones marched once more when the crown shattered against the obsidian throne.'},
  {id:'abyssal_wyrm',title:'Scales of the Deep Wyrm',text:'Dragonfire never cooled in Depth 12—it merely sank into the granite walls.'},
  {id:'wayshrine',title:'Vow of the Wayfarers',text:'Travellers carved ancient fonts along the descent so brave blades might endure.'},
  {id:'cursed_gold',title:'Warning on Cursed Vaults',text:'Crimson chests hold twice the steel—and fourfold the guardians.'},
  {id:'starwarden',title:'Hymn of Starwarden',text:'Those who bear the Crown of Dawn shine brightest on the brink of ruin.'},
  {id:'doomhammer',title:'Forging of Doomhammer',text:'Struck from volcanic basalt, its echoes split stone and bone alike.'},
  {id:'endless_abyss',title:'Beyond the Thirtieth Seal',text:'Past Depth 30 lies the Endless Abyss, where time bends and legends drop like rain.'},
  {id:'waystone_fractures',title:'Waystone Fractures',text:'Each carved keystone binds planar storms—Volatile Surges quicken prey, while Tyrant shards draw richer tribute.'},
  {id:'hymn_riftstrider',title:'Hymn of the Riftstrider',text:'Runes stitched into quicksilver greaves turn every cast spell or strike into swiftness upon the stone.'}
 ];
 const LORE_KEY='dodLoreTomesV1';
 let discoveredLore=[];
 try{const raw=JSON.parse(localStorage.getItem(LORE_KEY)||'[]');if(Array.isArray(raw))discoveredLore=raw}catch(e){}
 const saveLore=()=>{try{localStorage.setItem(LORE_KEY,JSON.stringify(discoveredLore))}catch(e){}};

 let fury=0,bloodlust=0,wayshrineT=0,frostCd=0,harvestKills=0,bossNovaCd=0,bossNovaWarn=0;
 let tomeObj=null,fountainObj=null;

 const EXTRA_BOSSES=['Iron Colossus','Ash Seraph','Dread Necromancer','Void Sovereign'];
 const prevMkE=mkE;
 mkE=function(t,x,y,n,id,el){
  const e=prevMkE(t,x,y,n,id,el);
  if(t==='bs'&&n>=15&&n!==30){
   const idx=Math.floor(n/3-5);
   e.n=EXTRA_BOSSES[((idx%EXTRA_BOSSES.length)+EXTRA_BOSSES.length)%EXTRA_BOSSES.length];
   if(n>30){e.mh=Math.round(e.mh*(1+(n-30)*.04));e.hp=e.mh;e.d=Math.round(e.d*(1+(n-30)*.02))}
  }
  return e;
 };

 const prevBuild=build;
 build=function(n){
  prevBuild(n);
  tomeObj=null;fountainObj=null;bossNovaCd=3;bossNovaWarn=0;
  if(rooms.length>2){
   const pool=rooms.slice(1,rooms.length-1);
   const rmT=pool[RI(0,pool.length-1)];
   tomeObj={x:(rmT.cx+.65)*TS,y:(rmT.cy+.65)*TS,lore:LORE[(n-1)%LORE.length]};
   if(n%2===0){
    const rmF=pool[RI(0,pool.length-1)];
    fountainObj={x:(rmF.cx+.25)*TS,y:(rmF.cy+.6)*TS};
   }
  }
  if(n>30){
   const tier=n-30;
   /* Abyss tier active */
  }
 };

 const prevStats=stats;
 stats=function(){
  const s=prevStats();
  if(bloodlust>0){s.Haste=(s.Haste||0)+25;s.C=(s.C||0)+15;s.s=(s.s||0)+18}
  if(wayshrineT>0){s.a=(s.a||0)+14;s.s=(s.s||0)+15}
  if(P.phaseStrideT>0){s.s=(s.s||0)+10;s.Haste=(s.Haste||0)+8}
  return s;
 };

 const prevHit=hit;
 hit=function(e,d,fx,forceCrit=false,fromBlade=false){
  const beforeTk=e?e.tk:0;
  prevHit(e,d,fx,forceCrit,fromBlade);
  if(!e||e.tk<=beforeTk)return;
  if(bloodlust<=0){
   fury=Math.min(100,fury+6);
   if(fury>=100){
    fury=0;bloodlust=5.0;
    ring(P.x,P.y,135,'#ff6a2b');burst(P.x,P.y,'#ff9642',34,240,.75,4);
    snd(196,.18,'sawtooth',.06,60);setTimeout(()=>snd(294,.28,'triangle',.07,110),100);
   }
  }
  const dmgDone=e.tk-beforeTk;
  if(!fromBlade&&dmgDone>0&&P.eq[6]?.id==='ashen_gauntlets'&&Math.random()<.28){
   const burnDmg=Math.max(4,Math.round(dmgDone*.28));
   for(const q of E){
    if(q!==e&&!q.dead&&D(q,e)<90){
     dealProcDamage(q,burnDmg,'burn');
    }
   }
   ring(e.x,e.y,85,'#ff7a38');
  }
  if(!fromBlade&&dmgDone>0&&P.eq[0]?.id==='doomhammer'&&Math.random()<.24){
   const quake=Math.max(6,Math.round(dmgDone*.4));
   for(const q of E){
    if(q!==e&&!q.dead&&D(q,e)<115){
     dealProcDamage(q,quake,'rupture');
    }
   }
   sh=Math.max(sh,8);ring(e.x,e.y,115,'#d9a557');burst(e.x,e.y,'#d9a557',18,170,.4,3);
  }
 };

 const prevDie=die;
 die=function(e){
  const wasDead=e&&e.dead;
  prevDie(e);
  if(e&&!wasDead){
   if(bloodlust<=0)fury=Math.min(100,fury+14);
   if(P.eq[4]?.id==='soulbinder_pendant'){
    harvestKills++;
    if(harvestKills>=5){
     harvestKills=0;
     const S=stats();
     P.hp=Math.min(S.H,P.hp+S.H*.15);P.mp=Math.min(S.M,P.mp+S.M*.2);
     ft(P.x,P.y-30,'SOUL HARVEST','#d89eff',1.15);
     ring(P.x,P.y,90,'#c57dff');snd(620,.2,'sine',.06,180);
    }
   }
  }
 };

 const prevUpdate=update;
 update=function(dt){
  prevUpdate(dt);
  if(bloodlust>0)bloodlust=Math.max(0,bloodlust-dt);
  if(wayshrineT>0)wayshrineT=Math.max(0,wayshrineT-dt);
  if(frostCd>0)frostCd=Math.max(0,frostCd-dt);

  if(!P.dead&&P.eq[7]?.id==='frostvein_greaves'&&frostCd<=0){
   const nearby=E.filter(q=>!q.dead&&D(q,P)<130);
   if(nearby.length){
    frostCd=5.5;
    for(const q of nearby){q.sl=Math.max(q.sl||0,2.5);ft(q.x,q.y-q.r,'CHILL','#9be7ff',.85)}
    ring(P.x,P.y,130,'#7ed6ff');burst(P.x,P.y,'#9be7ff',22,190,.45,3);
    snd(520,.14,'sine',.04,-140);
   }
  }

  if(!P.dead&&boss&&!boss.dead&&(boss.mh-boss.tk)/boss.mh<.55){
   const isPhase2=(boss.mh-boss.tk)/boss.mh<.35||boss.uber||boss.riftGuardian;
   if(bossNovaWarn>0){
    bossNovaWarn-=dt;
    if(bossNovaWarn<=0){
     bossNovaCd=isPhase2?3.8:5.2;
     const bolts=isPhase2?10:8;
     for(let i=0;i<bolts;i++){
      const ang=i*Math.PI*2/bolts+tm;
      PR.push({x:boss.x,y:boss.y,vx:Math.cos(ang)*260,vy:Math.sin(ang)*260,d:Math.max(6,Math.round(boss.d*.95)),f:1,life:1.8,r:6,c:'#ff5c72',slow:false});
     }
     ring(boss.x,boss.y,130,'#ff5c72');snd(140,.22,'sawtooth',.06,-40);
    }
   }else{
    bossNovaCd-=dt;
    if(bossNovaCd<=0){
     bossNovaWarn=.45;
     ring(boss.x,boss.y,95,'#ffb05c');burst(boss.x,boss.y,'#ffb05c',14,150,.35,3);
    }
   }
  }

  if(tomeObj&&!P.dead&&D(P,tomeObj)<40){
   const lore=tomeObj.lore;tomeObj=null;
   if(!discoveredLore.includes(lore.id)){discoveredLore.push(lore.id);saveLore()}
   const xpReward=30*Math.max(1,fl);
   gain(xpReward);
   P.mp=Math.min(stats().M,P.mp+stats().M*.2);
   ring(P.x,P.y,95,'#e8c987');burst(P.x,P.y,'#f5dda4',24,180,.55,3);
   snd(659,.15,'triangle',.06,120);
   banner('Lore: '+lore.title);
  }

  if(fountainObj&&!P.dead&&D(P,fountainObj)<42){
   fountainObj=null;wayshrineT=30;
   const S=stats();P.hp=Math.min(S.H,P.hp+S.H*.45);P.mp=Math.min(S.M,P.mp+S.M*.45);
   ring(P.x,P.y,110,'#7ce8ff');burst(P.x,P.y,'#9beeff',30,200,.65,4);
   snd(523,.22,'sine',.07,260);
  }

  const ep=document.getElementById('expeditionPanel');
  if(ep){
   let row=ep.querySelector('[data-content-stats]');
   if(!row){row=document.createElement('small');row.setAttribute('data-content-stats','1');row.style.cssText='display:block;margin-top:4px;color:#d6c096';ep.appendChild(row)}
   row.textContent='📜 Lore: '+discoveredLore.length+'/'+LORE.length+' · 🔥 Fury: '+(bloodlust>0?'SURGE '+bloodlust.toFixed(1)+'s':fury+'%');
  }
 };

 const prevDraw=draw;
 draw=function(){
  prevDraw();
  g.save();g.translate(Math.round(W/2-P.x),Math.round(H/2-P.y*worldY()));g.scale(1,worldY());
  if(tomeObj){
   const bob=Math.sin(tm*4)*3;
   if(!prefState.highPerformance){g.shadowColor='#e8c987';g.shadowBlur=14}
   g.strokeStyle='#d6b56e';g.lineWidth=2;
   g.beginPath();g.arc(tomeObj.x,tomeObj.y,16,0,Math.PI*2);g.stroke();
   g.font='17px serif';g.textAlign='center';g.fillStyle='#f5dda4';
   g.fillText('📜',tomeObj.x,tomeObj.y+6+bob);
  }
  if(fountainObj){
   const pulse=1+Math.sin(tm*3.5)*.1;
   if(!prefState.highPerformance){g.shadowColor='#7ce8ff';g.shadowBlur=18}
   g.strokeStyle='#7ce8ff';g.lineWidth=2.5;
   g.beginPath();g.arc(fountainObj.x,fountainObj.y,19*pulse,0,Math.PI*2);g.stroke();
   g.font='18px serif';g.textAlign='center';g.fillStyle='#ccf5ff';
   g.fillText('⛲',fountainObj.x,fountainObj.y+6);
  }
  g.restore();
 };

 window.dodLore={all:LORE,getDiscovered:()=>LORE.filter(l=>discoveredLore.includes(l.id))};
})();
