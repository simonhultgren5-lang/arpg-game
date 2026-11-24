/* PROGRESSION REWORK — 1–50 CAMPAIGN, THEN ENDGAME MASTERY */
(()=>{
 const CAP=50, CAMPAIGN_FINAL_DEPTH=30, KEY='dodProgressionV2';
 const CAMPAIGN_ACTS=[
  {id:'act1',num:1,name:'Act I: Ashen Hollows',depths:'1–6',min:1,max:6,bossDepth:6,bossName:'Blood Witch',region:'ashen',blessing:'+12% XP & +10% Gold'},
  {id:'act2',num:2,name:'Act II: Frozen Catacombs',depths:'7–12',min:7,max:12,bossDepth:12,bossName:'Abyssal Dragon',region:'frost',blessing:'+8% Max Health & World Legendaries'},
  {id:'act3',num:3,name:'Act III: Sunken Reliquary',depths:'13–21',min:13,max:21,bossDepth:21,bossName:'Dread Necromancer',region:'sunken',blessing:'+15% Magic Find & Radiant Gems'},
  {id:'act4',num:4,name:'Act IV: The Void Rift',depths:'22–30',min:22,max:30,bossDepth:30,bossName:'The Abyssal Sovereign',region:'void',blessing:'+10% Damage/Spell Power & Waystones'}
 ];
 let prog={campaignComplete:false,masteryXP:0,masteryRank:0,manualRegion:false,actsCleared:{act1:false,act2:false,act3:false,act4:false}};
 try{
  const raw=JSON.parse(localStorage.getItem(KEY)||'{}');
  prog={...prog,...raw,actsCleared:{...prog.actsCleared,...(raw?.actsCleared||{})}};
  if(prog.campaignComplete){prog.actsCleared.act1=prog.actsCleared.act2=prog.actsCleared.act3=prog.actsCleared.act4=true}
 }catch(e){}
 const getActForDepth=(d)=>CAMPAIGN_ACTS.find(a=>d>=a.min&&d<=a.max)||CAMPAIGN_ACTS[3];
 const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(prog))}catch(e){}};
 const actBlessing=()=>({
  xp:prog.actsCleared?.act1?1.12:1,
  gold:prog.actsCleared?.act1?1.10:1,
  hp:prog.actsCleared?.act2?1.08:1,
  mf:prog.actsCleared?.act3?0.15:0,
  dmg:prog.actsCleared?.act4?1.10:1
 });
 window.dodActBlessing=actBlessing;
 const oldActStats=stats;
 stats=function(){
  const s=oldActStats(),bl=actBlessing();
  if(bl.hp>1)s.H*=bl.hp;
  if(bl.dmg>1){s.AP*=bl.dmg;s.MDMin*=bl.dmg;s.MDMax*=bl.dmg;s.SP*=bl.dmg}
  return s;
 };
 const oldSave=save;
 save=function(){oldSave();persist()};
 P.lv=Math.min(CAP,Math.max(1,Number(P.lv)||1));
 if(P.lv===CAP)P.xp=0;
 const oldGain=gain;
 gain=function(amount){
   amount=Math.max(0,Math.round((amount||0)*(actBlessing().xp||1)));
   if(P.lv<CAP){
     let room=0;for(let l=P.lv;l<CAP;l++)room+=need(l);room-=P.xp;
     const campaignXP=Math.min(amount,Math.max(0,room));
     if(campaignXP>0)oldGain(campaignXP);
     if(P.lv>=CAP){P.lv=CAP;P.xp=0}
     amount-=campaignXP;
   }
   if(P.lv>=CAP&&amount>0){
     P.xp=0;prog.masteryXP+=amount;
     let gained=0;while(prog.masteryXP>=5000){prog.masteryXP-=5000;prog.masteryRank++;gained++}
     if(gained)banner(`Mastery Rank ${prog.masteryRank}!`);
     window.dodParagon?.addXp?.(amount);persist();
   }
   save();
 };
 const oldDie=die;
 die=function(e){
   const wasAlive=!e.dead;
   oldDie(e);
   if(wasAlive&&e.t==='bs'&&!e.riftGuardian&&!e.uber){
    const act=CAMPAIGN_ACTS.find(a=>a.bossDepth===fl);
    if(act&&!prog.actsCleared[act.id]){
     prog.actsCleared[act.id]=true;
     if(act.id==='act1'){window.dodGold?.add?.(75);if(typeof dodGems!=='undefined')dodGems.ruby=(dodGems.ruby||0)+1}
     else if(act.id==='act2'){window.dodGold?.add?.(125);if(typeof dodGems!=='undefined')dodGems.sapphire=(dodGems.sapphire||0)+1}
     else if(act.id==='act3'){window.dodGold?.add?.(180);if(typeof dodGems!=='undefined')dodGems.emerald_2=(dodGems.emerald_2||0)+1}
     if(fl===CAMPAIGN_FINAL_DEPTH){
      prog.campaignComplete=true;
      if(typeof dodAbyssFragments!=='undefined')dodAbyssFragments+=3;
      window.dodGold?.add?.(250);
      if(typeof dodGems!=='undefined'&&typeof GEMS!=='undefined'){const gk=typeof rollGemDrop==='function'?rollGemDrop(fl,3,e):Object.keys(GEMS)[RI(0,Object.keys(GEMS).length-1)];dodGems[gk]=(dodGems[gk]||0)+1}
      setTimeout(()=>banner('THE CAMPAIGN IS COMPLETE · ENDGAME UNLOCKED · +3 Fragments · +250g · +10% Dmg Blessing'),250);
     }else{
      setTimeout(()=>banner(`✦ ACT ${act.num} COMPLETE · Blessing Unlocked: ${act.blessing}`),250);
     }
     persist();save();
    }else if(fl===CAMPAIGN_FINAL_DEPTH&&!prog.campaignComplete){
     prog.campaignComplete=true;persist();
     if(typeof dodAbyssFragments!=='undefined')dodAbyssFragments+=3;
     window.dodGold?.add?.(250);
     save();
     setTimeout(()=>banner('THE CAMPAIGN IS COMPLETE · ENDGAME UNLOCKED · +3 Fragments · +250g'),250);
    }
   }
 };
 const oldBuild=build;
 build=function(n){
   if(n<=CAMPAIGN_FINAL_DEPTH&&!prog.manualRegion){
    const act=getActForDepth(n);
    window.dodWorld?.syncCampaignRegion?.(act.region);
   }
   oldBuild(n);
   if(n===CAMPAIGN_FINAL_DEPTH)banner('Depth 30 · The Abyssal Sovereign');
   if(n>CAMPAIGN_FINAL_DEPTH&&!prog.campaignComplete){
     oldBuild(CAMPAIGN_FINAL_DEPTH);
     banner('Defeat Depth 30 boss first');
   }
 };
 const bossNameUpdate=()=>{if(fl===CAMPAIGN_FINAL_DEPTH&&boss&&!boss.dead&&!boss.uber&&!boss.riftGuardian){boss.n='The Abyssal Sovereign';}};
 const oldHud=hud;
 hud=function(){oldHud();const lv=$('lv');if(lv)lv.textContent=P.lv>=CAP?'Lv 50':'Lv '+P.lv;};
 const style=document.createElement('style');
 style.textContent='#progressionCard{position:fixed;z-index:30;right:12px;top:78px;width:min(270px,calc(100vw - 24px));padding:12px 14px;background:#0f0c0e;border:1px solid #8a6d45;border-radius:3px;color:#f2e7cf;font:12px system-ui;box-shadow:0 8px 24px #000c;pointer-events:none}#progressionCard b{color:#ead08b}#progressionCard .track{height:6px;background:#0b090a;border:1px solid #3c2f27;border-radius:2px;overflow:hidden;margin:7px 0}#progressionCard .track i{display:block;height:100%;background:#c9a24a}@media(max-width:650px){#progressionCard{top:66px;right:7px;width:185px;font-size:10px;padding:8px}}';
 document.head.appendChild(style);
 const card=document.createElement('div');card.id='progressionCard';document.body.appendChild(card);
 const oldUpdate=update;
 update=function(dt){oldUpdate(dt);bossNameUpdate();if(getComputedStyle(card).display==='none')return;const end=prog.campaignComplete,act=getActForDepth(fl);const nextMs=P.lv<2?'Skill Slot 2 at Lv 2':P.lv<3?'Combat Focus at Lv 3':P.lv<4?'Skill Slot 3 at Lv 4':P.lv<7?'Skill Slot 4 at Lv 7':(()=>{const ev=window.dodGetClassEvolutions?.(window.dodHeroClass||'warrior')?.find(x=>P.lv<x.lv);return ev?`Next Evolution: ${ev.name} (Lv ${ev.lv})`:null})();card.innerHTML=`<b>${end?'ENDGAME':`ACT ${act.num}/4`} · ${end?'WAYSTONES UNLOCKED':act.name.replace(/^Act [IV]+:\s*/,'')}</b><div>Level ${P.lv}/${CAP}${P.lv===CAP?' · MAX LEVEL':''}</div><div class="track"><i style="width:${P.lv===CAP?100:P.xp/need(P.lv)*100}%"></i></div>${P.lv===CAP?`<div>Mastery ${prog.masteryRank} · ${prog.masteryXP}/5000 XP</div>`:`<div>${P.xp} / ${need(P.lv)} XP to next level</div>`}<div style="margin-top:5px;color:#b9a98f">${end?'Multi-Affix Waystone Rifts, Tiers & Pinnacle Bosses.':nextMs||'Next Act Boss: '+act.bossName+' (Depth '+act.bossDepth+')'}</div>`;};
 window.dodUnlockEndgame=()=>{prog.campaignComplete=true;prog.actsCleared.act1=prog.actsCleared.act2=prog.actsCleared.act3=prog.actsCleared.act4=true;persist()};
 window.dodProgressionV2={cap:CAP,state:prog,acts:CAMPAIGN_ACTS,getActForDepth,setManualRegion:(v)=>{prog.manualRegion=Boolean(v);persist()}};
})();
