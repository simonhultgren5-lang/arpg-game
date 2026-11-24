/* DEPTHS OF DARKNESS 2.0 — PROGRESSION REWORK */
(()=>{
 const KEY='dodTalentTreeV2',LEGACY_KEY='dodWarriorTalentTreeV1',PARAGON_KEY='dodParagonV1';
 const cls=()=>window.dodHeroClass||'warrior';
 const WARRIOR_BRANCHES=[
  {id:'weapon',name:'Weapon Master',icon:'⚔',desc:'Build damage, precision, and stronger weapon skills.',nodes:[
   {id:'stormreach',name:'Sweeping Winds',max:5,gate:0,desc:'Whirlwind: +6 radius and -1 mana per second per rank.'},
   {id:'stormrhythm',name:'Gathering Storm',max:5,gate:8,desc:'Each connected Whirlwind tick builds a stack (max 5). Each stack gives +2% tick speed per rank. Stacks fade after 1.5s without a hit.'},
   {id:'tempest',name:'Tempest Seeds',max:3,gate:15,desc:'Direct Whirlwind kills have 33/67/100% chance to create a small vortex for 2.4s. Maximum 6; secondary damage cannot create vortices.'},
   {id:'bloodstorm',name:'Bloodstorm',max:1,gate:24,level:35,excludes:'stormburst',desc:'Choose one finale: vortices apply a 2-second bleed. Cannot combine with Stormburst.'},
   {id:'stormburst',name:'Stormburst',max:1,gate:24,level:35,excludes:'bloodstorm',desc:'Choose one finale: vortices explode when they expire. Cannot combine with Bloodstorm.'},
   {id:'edge',name:'Edge Training',max:5,gate:0,desc:'+2% weapon damage per rank.'},
   {id:'precision',name:'Precision',max:5,gate:4,desc:'+1% Critical Chance per rank.'},
   {id:'whirlwind',name:'Whirlwind Mastery',max:5,gate:8,desc:'Whirlwind deals +5% damage per rank.'},
   {id:'shieldbash',name:'Shield Bash Mastery',max:5,gate:4,desc:'Shield Bash deals more damage and stuns longer.'},
   {id:'charge',name:'Unstoppable Charge',max:5,gate:8,desc:'Charge moves farther and deals more impact damage.'},
   {id:'cleave',name:'Blood & Steel',max:5,gate:13,desc:'Rend & Blood Furnace deal +8% damage per rank; rank 5 adds a bonus Rend strike.'},
   {id:'momentum',name:'Relentless Momentum',max:5,gate:13,desc:'+1.5% damage from all attacks per rank.'},
   {id:'warbreaker',name:'Warbreaker',max:1,gate:18,desc:'Keystone: all your attacks deal +15% damage.'}
  ]},
  {id:'guardian',name:'Guardian',icon:'🛡',desc:'Survive longer with health, armor, and stronger recovery.',nodes:[
   {id:'vitality',name:'Vitality',max:5,gate:0,desc:'+3% maximum health per rank.'},
   {id:'iron',name:'Ironclad',max:5,gate:4,desc:'+2 Armor per rank.'},
   {id:'shield',name:'Shield Training',max:5,gate:8,desc:'+4 Armor per rank with a shield, +2 without one.'},
   {id:'groundslam',name:'Earthshaker',max:5,gate:8,desc:'Ground Slam gains radius and damage; rank 5 adds a second impact.'},
   {id:'shieldwall',name:'Bulwark',max:5,gate:13,desc:'Shield Wall lasts longer per rank.'},
   {id:'secondwind',name:'Second Wind',max:5,gate:13,desc:'Health Potion restores +5% maximum health per rank.'},
   {id:'unyielding',name:'Unyielding',max:1,gate:18,desc:'Keystone: gain +12 Armor.'}
  ]},
  {id:'reaver',name:'Reaver',icon:'🩸',desc:'Turn aggression into sustain and finish weakened enemies.',nodes:[
   {id:'siphon',name:'Siphon',max:5,gate:0,desc:'+0.15% Life Leech per rank.'},
   {id:'bloodied',name:'Bloodied Edge',max:5,gate:4,desc:'+1.5% attack damage per rank.'},
   {id:'cull',name:'Cull the Weak',max:5,gate:8,desc:'+3% damage to enemies below 35% health per rank.'},
   {id:'rend',name:'Deep Wounds',max:5,gate:8,desc:'Rend applies stronger, longer bleeds.'},{id:'bloodspread',name:'Contagious Wounds',max:3,gate:13,desc:'Bleeding enemies spread the wound to 1 extra nearby enemy per rank on death; each cast chain is capped at 12 targets.'},{id:'bloodtempo',name:'Blood Frenzy',max:5,gate:18,desc:'Bleed damage +10% per rank.'},{id:'rupture',name:'Rupture',max:1,gate:24,level:35,desc:'Bleeding enemies burst on death, damaging nearby enemies.'},
   {id:'execution',name:'Final Blow',max:5,gate:13,desc:'Execution deals more damage and punishes wounded enemies.'},
   {id:'feast',name:'Feast on Victory',max:5,gate:13,desc:'+0.25% Life Leech per rank.'},
   {id:'reaper',name:'Reaper',max:1,gate:18,desc:'Keystone: gain +2% Life Leech while below half health.'}
  ]}
 ];
 const CLASS_TREES={
  warrior:WARRIOR_BRANCHES,
  pyromancer:[
   {id:'pyromancy',name:'Pyromancy',icon:'🔥',desc:'Amplify Fireball, Flame Nova, and scorching Ignite burns.',nodes:[
    {id:'emberbolt',name:'Ember Focus',max:5,gate:0,desc:'Basic Bolts & Fireball deal +6% damage per rank.'},
    {id:'wildfire',name:'Wildfire',max:5,gate:4,desc:'Ignite burns deal +12% damage and last +0.5s per rank.'},
    {id:'nova_reach',name:'Inferno Ring',max:5,gate:8,desc:'Flame Nova gains +14 radius and +8% damage per rank.'},
    {id:'cinder_burst',name:'Cinder Detonation',max:3,gate:13,desc:'Ignited foes explode on death for 30/55/80% Spell Power AoE.'},
    {id:'solar_flare',name:'Solar Flare',max:1,gate:18,level:30,desc:'Keystone: Flame Nova and Pyroblast automatically Shock foes (+18% damage taken).'}
   ]},
   {id:'arcana',name:'Arcana',icon:'✨',desc:'Scale Spell Power, Mana flow, Cooldown Reduction, and Spell Crit.',nodes:[
    {id:'spellcraft',name:'Arcane Mastery',max:5,gate:0,desc:'+4% Spell Power per rank.'},
    {id:'mana_flow',name:'Mana Conduit',max:5,gate:4,desc:'+4% Max Mana and +1.5 Mana/s per rank.'},
    {id:'spell_crit',name:'Incinerate Crit',max:5,gate:8,desc:'+1.5% Critical Chance and +8% Critical Damage per rank.'},
    {id:'quicken',name:'Chrono Weave',max:5,gate:13,desc:'+2.5% Cooldown Reduction and +2.5% Cast Haste per rank.'},
    {id:'archmage',name:'Archmage Flow',max:1,gate:18,level:30,desc:'Keystone: While above 55% Mana, gain +20% Spell Power and +10% Crit Chance.'}
   ]},
   {id:'cataclysm',name:'Cataclysm',icon:'☄️',desc:'Command lightning, frost armor, and meteor barrages.',nodes:[
    {id:'stormcall',name:'Stormcall',max:5,gate:0,desc:'Chain Lightning & Storm Halo deal +8% damage per rank.'},
    {id:'frost_shield',name:'Crystalline Ward',max:5,gate:4,desc:'+4 Armor and -6% Ice Armor cooldown per rank.'},
    {id:'meteor_shower',name:'Starfall',max:5,gate:8,desc:'Meteor Rain +8% damage per rank; rank 5 drops +1 extra meteor.'},
    {id:'static_overload',name:'Elemental Overload',max:5,gate:13,desc:'+4% damage per rank against Ignited or Shocked foes.'},
    {id:'apocalypse',name:'Apocalypse',max:1,gate:18,level:35,desc:'Keystone: Every 4th spell cast unleashes a free Shock wave around you.'}
   ]}
  ],
  rogue:[
   {id:'assassination',name:'Assassination',icon:'🗡️',desc:'Maximize critical strikes, bleeding wounds, and execute power.',nodes:[
    {id:'lethal_edge',name:'Lethal Edge',max:5,gate:0,desc:'+2.5% Weapon Damage per rank.'},
    {id:'twin_mastery',name:'Twin Precision',max:5,gate:4,desc:'Twin Fang & Venom Strike deal +7% damage per rank.'},
    {id:'serrated',name:'Serrated Steel',max:5,gate:8,desc:'+1.5% Critical Chance and +10% Bleed Damage per rank.'},
    {id:'ambush',name:'Cruel Opportunist',max:5,gate:13,desc:'+10% Crit Damage and +4% damage vs Bleeding foes per rank.'},
    {id:'executioner',name:'Mark for Death',max:1,gate:18,level:35,desc:'Keystone: Hits against foes below 40% HP gain +25% Crit Chance and +25% damage.'}
   ]},
   {id:'shadowcraft',name:'Shadowcraft',icon:'🌑',desc:'Master evasion, attack haste, cooldowns, and life leech.',nodes:[
    {id:'evasion',name:'Phantom Step',max:5,gate:0,desc:'+2% Dodge Chance and +3% Move Speed per rank.'},
    {id:'fleeting',name:'Quickstrike',max:5,gate:4,desc:'+3% Attack Haste per rank.'},
    {id:'shadow_veil',name:'Shroud Mastery',max:5,gate:8,desc:'+2% Cooldown Reduction and +0.5s Smoke/Caltrop duration per rank.'},
    {id:'vampiric',name:'Sanguine Thirst',max:5,gate:13,desc:'+0.3% Life Leech per rank.'},
    {id:'night_cloak',name:'Night Cloak',max:1,gate:18,level:30,desc:'Keystone: Shadowstep grants +12% Dodge and +15% Haste for 3s.'}
   ]},
   {id:'bladedance',name:'Blade Dance',icon:'🔪',desc:'Enhance Fan of Knives, traps, and multi-target bursts.',nodes:[
    {id:'fan_volley',name:'Steel Volley',max:5,gate:0,desc:'Fan of Knives +6% damage per rank (+1 knife at ranks 2 & 5).'},
    {id:'piercing_steel',name:'Razor Edge',max:5,gate:4,desc:'+12% Crit Damage & +0.4s slow on ranged daggers per rank.'},
    {id:'blade_flurry_m',name:'Whirling Steel',max:5,gate:8,desc:'Blade Flurry & Caltrops deal +8% damage per rank.'},
    {id:'vital_strike',name:'Adrenaline Rush',max:5,gate:13,desc:'Critical hits restore 2 Mana (+0.5 per rank).'},
    {id:'thousand_cuts',name:'Thousand Cuts',max:1,gate:18,level:35,desc:'Keystone: Fan of Knives fires in a full 360° ring with +20% damage.'}
   ]}
  ]
 };
 const PARAGON_NODES=[
  {id:'might',name:'Might',max:50,desc:'+2% Physical Damage & +2 Strength per rank.'},
  {id:'arcana',name:'Arcana',max:50,desc:'+4 Spell Power & +2 Max Mana per rank.'},
  {id:'fortitude',name:'Fortitude',max:50,desc:'+14 Max Health & +2 Armor per rank.'},
  {id:'swiftness',name:'Swiftness',max:50,desc:'+1.2% Haste & +0.8% Cooldown Reduction per rank.'},
  {id:'precision',name:'Precision',max:50,desc:'+0.8% Crit Chance & +4% Crit Damage per rank.'},
  {id:'avarice',name:'Avarice',max:50,desc:'+4% Magic Find & +5% Gold Find per rank.'}
 ];
 const PARAGON_MILESTONES=[
  {pts:10,name:'Pathfinder',desc:'+10% Move Speed'},
  {pts:20,name:"Alchemist's Bandolier",desc:'-20% Potion CD & +10% Max Health'},
  {pts:30,name:'Titan Slayer',desc:'+15% Damage vs Elites & Bosses'},
  {pts:40,name:'Relentless Vigor',desc:'+8% Cooldown Reduction & +8% Attack Haste'},
  {pts:50,name:'Abyssal Apotheosis',desc:'+12% Attack/Spell Power & +15% Magic Find'}
 ];
 const getBranches=(c=cls())=>CLASS_TREES[c]||CLASS_TREES.warrior;
 const emptyFor=(c=cls())=>Object.fromEntries(getBranches(c).map(b=>[b.id,Object.fromEntries(b.nodes.map(n=>[n.id,0]))]));
 let allRanks={warrior:emptyFor('warrior'),pyromancer:emptyFor('pyromancer'),rogue:emptyFor('rogue')};
 const emptyParagon=()=>({level:0,xp:0,ranks:{might:0,arcana:0,fortitude:0,swiftness:0,precision:0,avarice:0}});
 let paragon=emptyParagon();
 let legacyTier=1;
 let activeLoadoutSlot={warrior:0,pyromancer:0,rogue:0};
 let classBuildLoadouts={warrior:[null,null],pyromancer:[null,null],rogue:[null,null]};
 function spentIn(id,c=cls()){return Object.values((allRanks[c]||{})[id]||{}).reduce((a,v)=>a+(+v||0),0)}
 function spentAll(c=cls()){return getBranches(c).reduce((a,b)=>a+spentIn(b.id,c),0)}
 function earned(){return Math.max(0,Math.min(49,(+P.lv||1)-1))}
 function available(c=cls()){return Math.max(0,earned()-spentAll(c))}
 function canRefundNode(c,branchId,nodeId){
  const branch=getBranches(c).find(b=>b.id===branchId);
  const cr=allRanks[c]?.[branchId];
  if(!branch||!cr||(cr[nodeId]||0)<=0)return false;
  const sim={...cr,[nodeId]:cr[nodeId]-1};
  for(const other of branch.nodes){
   if((sim[other.id]||0)>0&&other.gate>0){
    const lowerSpent=branch.nodes.filter(n=>n.gate<other.gate).reduce((s,n)=>s+(sim[n.id]||0),0);
    if(lowerSpent<other.gate)return false;
   }
  }
  return true;
 }
 const paragonNeed=lv=>220+lv*140;
 const paragonEarned=()=>Math.floor(Math.max(0,(+P.lv||1)-15)/5)+paragon.level;
 const paragonSpent=()=>Object.values(paragon.ranks||{}).reduce((a,v)=>a+(+v||0),0);
 const paragonAvail=()=>Math.max(0,paragonEarned()-paragonSpent());
 const syncParagonGlobals=()=>{
  const av=paragon.ranks.avarice||0,pSpent=paragonSpent();
  window.dodParagonMagicFind=av*0.04+(pSpent>=50?0.15:0);
  window.dodParagonGoldMult=1+av*0.05;
  window.dodParagonPotionMult=pSpent>=20?0.8:1;
 };
 function cleanTree(c,x){const out=emptyFor(c);if(x&&typeof x==='object')for(const branch of getBranches(c))for(const node of branch.nodes){const v=Number(x[branch.id]?.[node.id]);out[branch.id][node.id]=Number.isFinite(v)?Math.max(0,Math.min(node.max,Math.floor(v))):0}return out}
 function restore(){
  try{
   const s2=JSON.parse(localStorage.getItem(KEY)||'null');
   if(s2&&s2.classes){
    for(const c of['warrior','pyromancer','rogue']){
     allRanks[c]=cleanTree(c,s2.classes[c]);
     activeLoadoutSlot[c]=s2.activeSlot?.[c]===1?1:0;
     const rawL=Array.isArray(s2.loadouts?.[c])?s2.loadouts[c]:[null,null];
     classBuildLoadouts[c]=[0,1].map(idx=>{
      const entry=rawL[idx];
      if(entry&&typeof entry==='object'&&entry.ranks){
       return {ranks:cleanTree(c,entry.ranks),skills:Array.isArray(entry.skills)?entry.skills.slice(0,4):null};
      }
      return idx===activeLoadoutSlot[c]?{ranks:cleanTree(c,allRanks[c]),skills:null}:{ranks:emptyFor(c),skills:null};
     });
    }
    legacyTier=Math.max(1,Math.min(5,+s2.dungeonTier||1));
   }else{
    const s1=JSON.parse(localStorage.getItem(LEGACY_KEY)||'null');
    if(s1){allRanks.warrior=cleanTree('warrior',s1.ranks);legacyTier=Math.max(1,Math.min(5,+s1.dungeonTier||1))}
    for(const c of['warrior','pyromancer','rogue']){classBuildLoadouts[c]=[{ranks:cleanTree(c,allRanks[c]),skills:null},{ranks:emptyFor(c),skills:null}]}
   }
   const pRaw=JSON.parse(localStorage.getItem(PARAGON_KEY)||'null');
   if(pRaw&&typeof pRaw==='object'){
    paragon.level=Math.max(0,Math.floor(+pRaw.level||0));paragon.xp=Math.max(0,Math.floor(+pRaw.xp||0));
    for(const n of PARAGON_NODES)paragon.ranks[n.id]=Math.max(0,Math.min(n.max,Math.floor(+pRaw.ranks?.[n.id]||0)));
   }
  }catch(e){allRanks={warrior:emptyFor('warrior'),pyromancer:emptyFor('pyromancer'),rogue:emptyFor('rogue')};paragon=emptyParagon();classBuildLoadouts={warrior:[null,null],pyromancer:[null,null],rogue:[null,null]}}
  syncParagonGlobals();
 }
 restore();
 const style=document.createElement('style');style.textContent=`
 #progPanel{position:fixed;z-index:180;inset:50% auto auto 50%;transform:translate(-50%,-50%);display:none;width:min(1060px,96vw);max-height:92vh;overflow:auto;padding:20px;border:1px solid #8a6d45;border-radius:3px;background:#0f0c0e;box-shadow:0 12px 32px #000d;color:#f2e7cf}
 #progPanel h2{font:27px Georgia,serif;color:#ead08b;margin:0 0 5px}#progPanel h3{font:19px Georgia,serif;color:#ead08b;margin:0}
 #progPanel p{color:#bfb097;margin:5px 0 12px}#progPanel button{color:#f2e7cf;border:1px solid #594635;border-radius:3px;background:#1e1614;padding:8px 11px;cursor:pointer}
 #progPanel button:disabled{opacity:.4;cursor:not-allowed}#progPanel .muted{color:#9e8f7a;font-size:12px;line-height:1.45}
 #progPanel .treeHead{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}#progPanel .points{color:#ead08b;font-weight:700;font-size:16px}
 #progPanel .treeGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
 #progPanel .branch{border:1px solid #4a3a2d;border-radius:3px;padding:13px;background:#161113}
 #progPanel .branchHead{display:flex;gap:9px;align-items:center;margin-bottom:4px}#progPanel .branchIcon{font-size:24px;color:#ead08b}
 #progPanel .node{position:relative;border:1px solid #3c2f27;border-radius:3px;padding:9px;margin-top:9px;background:#120e10}
 #progPanel .node.locked{opacity:.6}#progPanel .nodeTop{display:flex;justify-content:space-between;gap:6px;align-items:center}
 #progPanel .nodeTop b{font-size:13px;color:#f2e7cf}#progPanel .node button{flex-shrink:0;font-size:11px;padding:6px 8px}
 #progPanel .node small{display:block;margin-top:5px}#progPanel .gate{color:#c9a24a;font-size:10px;margin-top:4px}
 #progPanel .treeFoot{display:flex;justify-content:space-between;align-items:center;gap:10px;border-top:1px solid #3c2f27;margin-top:15px;padding-top:12px}
 @media(max-width:760px){#progPanel .treeGrid{grid-template-columns:1fr}#progPanel{padding:14px;max-height:94vh}#progPanel .branch{padding:11px}}
 `;document.head.appendChild(style);
 const loadoutStyle=document.createElement('style');loadoutStyle.textContent=`#progPanel .abilitySetup{border:1px solid #4a3a2d;border-radius:3px;padding:11px;margin:0 0 13px;background:#161113}#progPanel .abilitySetup h3{color:#ead08b;font:18px Georgia,serif;margin:0 0 4px}#progPanel .abilitySetup p{color:#bfb097;font-size:11px;margin:0 0 8px}#progPanel .abilitySlots{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}#progPanel .abilitySlots label{display:grid;gap:4px;color:#e5d8be;font-size:11px}#progPanel .abilitySlots select{min-width:0;width:100%;padding:7px;background:#0b090a;color:#f2e7cf;border:1px solid #594635;border-radius:3px}@media(max-width:700px){#progPanel .abilitySlots{grid-template-columns:repeat(2,minmax(0,1fr))}}`;document.head.appendChild(loadoutStyle);
 const skillUiStyle=document.createElement('style');skillUiStyle.textContent=`#progPanel{width:min(1020px,96vw);padding:clamp(14px,2.4vw,24px);background:#0f0c0e;border:1px solid #8a6d45;border-radius:3px}#progPanel .skillHeader{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding-bottom:12px;border-bottom:1px solid #3c2f27}#progPanel .skillHeader h2{font-size:clamp(22px,3.8vw,30px)}#progPanel .skillHeader p{max-width:620px;margin:5px 0 0;color:#bfb097;font-size:13px}#progPanel .skillPoints{flex:0 0 auto;text-align:right;color:#ead08b;font-weight:700}#progPanel .skillPoints small{display:block;color:#9e8f7a;font-weight:400;margin-top:2px}#progPanel .skillTabs{display:flex;gap:8px;margin:12px 0;flex-wrap:wrap}#progPanel .skillTabs button{min-width:118px;padding:9px 15px;color:#bfb097;background:#161113;border:1px solid #4a3a2d;border-radius:3px}#progPanel .skillTabs button.active{color:#f5e3b8;border-color:#c9a24a;background:#2c1f19}#progPanel .skillPage{display:grid;gap:13px}#progPanel .skillSectionTitle{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:4px 0 0;flex-wrap:wrap}#progPanel .skillSectionTitle h3{font:19px Georgia,serif;color:#ead08b;margin:0}#progPanel .skillSectionTitle small{color:#9e8f7a}#progPanel .spellActionBar{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}#progPanel .spellActionSlot{display:grid;grid-template-columns:38px minmax(0,1fr);gap:9px;align-items:center;padding:9px 10px;border:1px solid #4a3a2d;border-radius:3px;background:#161113;transition:border-color .14s}#progPanel .spellActionSlot:not(.locked):hover{border-color:#c9a24a}#progPanel .spellActionSlot.locked{opacity:.58;border-style:dashed}#progPanel .spellActionIcon{width:38px;height:38px;display:grid;place-items:center;border:1px solid #594635;border-radius:3px;background:#0b090a;font-size:20px}#progPanel .spellActionSlot label{display:block;color:#ead08b;font-size:10px;text-transform:uppercase;letter-spacing:.08em}#progPanel .spellActionSlot select{display:block;width:100%;margin-top:4px;padding:5px 6px;background:#0b090a;color:#f2e7cf;border:1px solid #594635;border-radius:3px;font-size:12px}#progPanel .schoolFilterBar{display:flex;gap:7px;flex-wrap:wrap}#progPanel .schoolFilterBtn{padding:6px 11px;font-size:12px;color:#bfb097;background:#161113;border:1px solid #4a3a2d;border-radius:3px}#progPanel .schoolFilterBtn.active{color:#f5e3b8;border-color:#c9a24a;background:#2c1f19}#progPanel .schoolGroupHead{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 10px;border-left:3px solid var(--school-color,#c9a24a);background:#141012;border-radius:2px;margin:2px 0}#progPanel .schoolGroupHead b{color:var(--school-color,#ead08b);font:700 13px Georgia,serif;letter-spacing:.03em}#progPanel .schoolGroupHead small{color:#9e8f7a;font-size:11px}#progPanel .spellBookGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}#progPanel .spellBookCard{display:grid;gap:8px;padding:11px;border:1px solid #4a3a2d;border-radius:3px;background:#161113;transition:border-color .14s,background .14s}#progPanel .spellBookCard:hover{border-color:#d8b36a;background:#1c1515}#progPanel .spellBookCard.equipped{border-color:#c9a24a;background:#1d1514}#progPanel .spellBookCard.equipped:hover{border-color:#ffd86b;background:#231917}#progPanel .spellBookCard.locked{opacity:.58;border-style:dashed}#progPanel .spellCardHead{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:9px;align-items:center}#progPanel .spellTitleRow{display:flex;align-items:center;gap:6px;flex-wrap:wrap}#progPanel .spellTitleRow b{color:#f5e3b8;font-size:14px}#progPanel .schoolBadge{padding:1px 6px;font:700 10px system-ui;text-transform:uppercase;letter-spacing:.06em;border-radius:2px;border:1px solid var(--school-color,#8a6d45);color:var(--school-color,#ead08b);background:#0f0c0e}#progPanel .rankBadge{padding:2px 6px;font:700 10px system-ui;letter-spacing:.05em;border-radius:2px;border:1px solid #4a3a2d;background:#0b090a;color:#bfb097}#progPanel .rankBadge.ranked{border-color:#8a6d45;color:#ffd86b;background:#241a13}#progPanel .rankBadge.maxed{border-color:#c9a24a;color:#0f0c0e;background:#c9a24a}#progPanel .spellStatsRow{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 8px;border:1px solid #2e241f;border-radius:3px;background:#100c0e;font-size:11px;font-variant-numeric:tabular-nums}#progPanel .spellCdTag{color:#ead08b;font-weight:600}#progPanel .spellCdState{font-weight:700}#progPanel .spellCdState.ready{color:#7de0a1}#progPanel .spellCdState.cooling{color:#f0b465}#progPanel .spellCdState.locked{color:#9e8f7a}#progPanel .spellCardMeta{display:block;color:#bfb097;font-size:11px;margin-top:3px}#progPanel .spellCardDesc{margin:0;color:#dfd2b7;font-size:12px;line-height:1.4}#progPanel .spellRuneRow{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}#progPanel .spellRuneBtn{padding:6px 8px;text-align:left;border:1px solid #3c2f27;border-radius:3px;background:#0f0c0e;color:#bfb097;font-size:11px;line-height:1.3}#progPanel .spellRuneBtn b{display:block;color:#ead08b;font-size:11px;margin-bottom:2px}#progPanel .spellRuneBtn.active{border-color:#c9a24a;background:#2b1f18;color:#f5e3b8}#progPanel .spellRuneBtn:disabled{opacity:.55;cursor:not-allowed}#progPanel .spellEquipBar{display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;padding-top:6px;border-top:1px solid #312620}#progPanel .spellSlotBtns{display:flex;gap:4px;flex-wrap:wrap}#progPanel .spellSlotBtn{padding:3px 7px;font-size:11px;border:1px solid #4a3a2d;border-radius:2px;background:#0f0c0e;color:#d6c7ad}#progPanel .spellSlotBtn.active{border-color:#c9a24a;background:#c9a24a;color:#0f0c0e;font-weight:700}#progPanel .branchTabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}#progPanel .branchTab{padding:11px;text-align:left;background:#161113;border:1px solid #4a3a2d;border-radius:3px}#progPanel .branchTab.active{border-color:#c9a24a;background:#2c1f19}#progPanel .branchTab b{display:block;color:#ead08b}#progPanel .branchTab small{display:block;margin-top:3px;color:#bfb097;line-height:1.35}#progPanel .talentList{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}#progPanel .talentCard{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px;border:1px solid #4a3a2d;border-radius:3px;background:#161113}#progPanel .talentCard.locked{opacity:.58}#progPanel .talentCard b{display:block;color:#f2e7cf}#progPanel .talentCard small{display:block;margin-top:4px;color:#bfb097;line-height:1.4}#progPanel .talentRank{display:flex;align-items:center;gap:5px;color:#ead08b;font-size:12px;white-space:nowrap}#progPanel .talentRank button{min-width:26px;padding:5px 8px}#progPanel .rankPips{letter-spacing:1px;color:#ffd86b;font-size:10px;margin-right:3px}#progPanel .talentTierHead{font:700 11px system-ui;color:#c9a24a;letter-spacing:.08em;text-transform:uppercase;margin:4px 0 6px;border-bottom:1px solid #3c2f27;padding-bottom:4px}#progPanel .loadoutBar{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:9px 11px;border:1px solid #4a3a2d;border-radius:3px;background:#161113}#progPanel .loadoutBar button.active{border-color:#c9a24a;background:#2c1f19;color:#f5e3b8}#progPanel .milestoneStrip{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:6px}#progPanel .msCard{padding:8px 9px;border:1px solid #3c2f27;border-radius:3px;background:#120e10;font-size:11px}#progPanel .msCard.active{border-color:#c9a24a;background:#241914}#progPanel .msCard b{display:block;color:#ead08b}#progPanel .msCard small{display:block;color:#bfb097;margin-top:2px}#progPanel .talentFooter{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid #3c2f27;flex-wrap:wrap}#progPanel .talentFooter .muted{max-width:62%}#spellBookTooltip{position:fixed;z-index:260;display:none;width:min(340px,90vw);padding:12px 13px;border:1px solid #a8834d;border-radius:3px;background:linear-gradient(180deg,#161115,#0c090b);box-shadow:0 14px 36px #000e,0 0 0 1px #2a201b;color:#f2e7cf;font:12px/1.45 system-ui,sans-serif;pointer-events:none;font-variant-numeric:tabular-nums}#spellBookTooltip .sbtHead{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding-bottom:8px;border-bottom:1px solid #3c2f27}#spellBookTooltip .sbtTitleWrap{display:flex;align-items:center;gap:8px}#spellBookTooltip .sbtIcon{width:32px;height:32px;display:grid;place-items:center;border:1px solid #6b5239;border-radius:3px;background:#0a0809;font-size:18px;flex-shrink:0}#spellBookTooltip .sbtName{display:block;color:#f7dfb0;font:700 15px/1.15 Georgia,serif}#spellBookTooltip .sbtSub{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:3px;font-size:10px;color:#bfb097}#spellBookTooltip .sbtSchool{padding:1px 5px;border-radius:2px;border:1px solid var(--school-color,#8a6d45);color:var(--school-color,#ead08b);font-weight:700;text-transform:uppercase;letter-spacing:.05em}#spellBookTooltip .sbtRank{padding:2px 6px;border-radius:2px;border:1px solid #594635;background:#1a1312;color:#ffd86b;font-weight:700;font-size:10px;white-space:nowrap}#spellBookTooltip .sbtGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:8px 0}#spellBookTooltip .sbtStat{padding:6px 8px;border:1px solid #2e241f;border-radius:2px;background:#110d10}#spellBookTooltip .sbtStat span{display:block;color:#9e8f7a;font-size:10px;text-transform:uppercase;letter-spacing:.05em}#spellBookTooltip .sbtStat b{display:block;color:#f5e3b8;font-size:12px;margin-top:1px}#spellBookTooltip .sbtDmgBox{padding:7px 9px;border:1px solid #4a3a2d;border-left:3px solid #d4825a;border-radius:2px;background:#151012;margin-bottom:8px}#spellBookTooltip .sbtDmgBox h4,#spellBookTooltip .sbtScaleBox h4{margin:0 0 4px;font:700 10px system-ui;text-transform:uppercase;letter-spacing:.07em;color:#ead08b}#spellBookTooltip .sbtLine{display:flex;justify-content:space-between;gap:8px;font-size:11.5px;color:#e5d8be;margin:2px 0}#spellBookTooltip .sbtLine strong{color:#ffd86b;font-weight:700;text-align:right}#spellBookTooltip .sbtScaleBox{padding:7px 9px;border:1px solid #352a25;border-left:3px solid #72b6e6;border-radius:2px;background:#100d11;margin-bottom:7px}#spellBookTooltip .sbtDesc{margin:0 0 6px;color:#cbbba0;font-size:11.5px}#spellBookTooltip .sbtRune{padding:5px 8px;border:1px solid #6b5239;border-radius:2px;background:#1f1713;color:#f2e7cf;font-size:11px}#spellBookTooltip .sbtRune b{color:#ffd86b}@media(max-width:760px){#progPanel{max-height:94vh}#progPanel .spellActionBar{grid-template-columns:repeat(2,minmax(0,1fr))}#progPanel .spellBookGrid,#progPanel .talentList{grid-template-columns:1fr}#progPanel .branchTabs{grid-template-columns:1fr}#progPanel .skillPoints{font-size:12px}}@media(max-width:520px){#progPanel .spellActionBar,#progPanel .spellRuneRow{grid-template-columns:1fr}}`;document.head.appendChild(skillUiStyle);
const panel=document.createElement('section');panel.id='progPanel';document.body.appendChild(panel);
const spellTip=document.createElement('aside');spellTip.id='spellBookTooltip';spellTip.setAttribute('role','tooltip');spellTip.setAttribute('aria-hidden','true');document.body.appendChild(spellTip);
 const top=document.getElementById('top');
 const btn=document.createElement('button');btn.textContent='Spell Book [K]';btn.title='Open Spell Book and build talents (K)';top?.appendChild(btn);
 const quickActions=document.createElement('div');quickActions.id='quickActions';document.body.appendChild(quickActions);const quick=document.createElement('button');quick.id='talentQuick';quick.type='button';quick.setAttribute('aria-label','Open Spell Book');quick.innerHTML='✦';quick.title='Spell Book & Talents · press K';quickActions.appendChild(quick);
 let selectedBranch='weapon',skillTab='skills',selectedSchool='all';
 const syncBranchSelection=()=>{const list=getBranches();if(!list.some(b=>b.id===selectedBranch))selectedBranch=list[0].id};
 const refreshQuick=()=>{const pts=available()+paragonAvail()+(window.dodSpellBook?.avail?.()||0);quick.textContent=pts>0?`Spell Book (${pts})`:'Spell Book';quick.title=`Spell Book, Talents & Paragon · ${pts} point${pts===1?'':'s'} · K`};
 const CLASS_EVOLUTIONS={
  warrior:[
   {lv:15,name:'Crushing Momentum',desc:'Breaking a guard grants +18% Attack Haste and +12% Move Speed for 3.5s.'},
   {lv:25,name:'Rending Shockwave',desc:'Every 3rd weapon swing unleashes a 110% AP shockwave ahead.'},
   {lv:35,name:"Juggernaut's Resolve",desc:'Taking damage below 55% HP grants +24 Armor and +2.5% HP/s for 3s (14s CD).'},
   {lv:45,name:"Warlord's Tempest",desc:'Casting any Warrior skill empowers your next direct hit for +35% damage.'}
  ],
  pyromancer:[
   {lv:15,name:'Kindling Spark',desc:'Igniting a foe restores 4 Mana (1s cooldown).'},
   {lv:25,name:'Arcane Echo',desc:'Every 4th spell cast fires an extra homing Ember Bolt (95% SP + Ignite).'},
   {lv:35,name:'Solar Resonance',desc:'Critical spell hits shock nearby foes within 95px (+18% damage taken).'},
   {lv:45,name:'Cataclysmic Ascendance',desc:'Casting below 45% Mana surges Spell Power by +25% for 4s (10s CD).'}
  ],
  rogue:[
   {lv:15,name:'Gouging Edge',desc:'Direct hits on Slowed or Bleeding foes grant +10% Attack Haste for 3s.'},
   {lv:25,name:'Twin Venom',desc:'Every 3rd combo beat throws a piercing Shadow Dagger (115% AP + Bleed).'},
   {lv:35,name:'Phantom Reflex',desc:'Dodging an attack unleashes a 110px Razor Smoke pulse (90% AP + Slow).'},
   {lv:45,name:"Executioner's Veil",desc:'Hitting Exposed foes shaves 0.8s off skill cooldowns and adds +20% Crit Damage.'}
  ]
 };
 window.dodGetClassEvolutions=(c=cls())=>CLASS_EVOLUTIONS[c]||CLASS_EVOLUTIONS.warrior;
 let evoSwingCount=0,evoCastCount=0,evoRushT=0,evoWardT=0,evoWardCd=0,evoEmpower=false,evoIgniteManaCd=0,evoSurgeT=0,evoSurgeCd=0;
 const oldStats=stats;
 stats=function(){
  const s=oldStats(),c=cls(),pr=paragon.ranks;
  const w=allRanks.warrior.weapon,g=allRanks.warrior.guardian,r=allRanks.warrior.reaver;
  if(c==='warrior'){
   s.AP*=1+(w.edge||0)*.02+(w.momentum||0)*.015+(w.warbreaker||0)*.15+(r.bloodied||0)*.015;
   s.MDMin*=1+(w.edge||0)*.02+(w.momentum||0)*.015+(w.warbreaker||0)*.15+(r.bloodied||0)*.015;
   s.MDMax*=1+(w.edge||0)*.02+(w.momentum||0)*.015+(w.warbreaker||0)*.15+(r.bloodied||0)*.015;
   s.H*=1+(g.vitality||0)*.03;s.a+=(g.iron||0)*2+(g.shield||0)*(P.eq[8]?4:2)+(g.unyielding||0)*12+(evoWardT>0?24:0);
   s.C=Math.min(55,s.C+(w.precision||0));
   s.leech=Math.min(12,s.leech+(r.siphon||0)*.15+(r.feast||0)*.25+((r.reaper||0)&&P.hp<s.H*.5?2:0));
   if(evoRushT>0){s.Haste=Math.min(220,(s.Haste||0)+18);s.s=(s.s||0)+12}
  }else if(c==='pyromancer'){
   const py=allRanks.pyromancer.pyromancy,ar=allRanks.pyromancer.arcana,ca=allRanks.pyromancer.cataclysm;
   s.SP*=(1+(ar.spellcraft||0)*.04+((ar.archmage||0)&&P.mp>=s.M*.55?.2:0)+(evoSurgeT>0?.25:0));
   s.M*=(1+(ar.mana_flow||0)*.04);
   s.mregen=Math.min(35,(s.mregen||0)+(ar.mana_flow||0)*1.5);
   s.C=Math.min(60,s.C+(ar.spell_crit||0)*1.5+((ar.archmage||0)&&P.mp>=s.M*.55?10:0));
   s.critDmg=Math.min(200,(s.critDmg||0)+(ar.spell_crit||0)*8);
   s.cdr=Math.min(55,(s.cdr||0)+(ar.quicken||0)*2.5);
   s.Haste=Math.min(180,(s.Haste||0)+(ar.quicken||0)*2.5);
   s.a+=(ca.frost_shield||0)*4;
   if((py.emberbolt||0)>0)s.pyroEmber=(py.emberbolt||0);
  }else if(c==='rogue'){
   const as=allRanks.rogue.assassination,sh=allRanks.rogue.shadowcraft,bd=allRanks.rogue.bladedance;
   const physMult=1+(as.lethal_edge||0)*.025;
   s.AP*=physMult;s.MDMin*=physMult;s.MDMax*=physMult;
   s.C=Math.min(60,s.C+(as.serrated||0)*1.5);
   s.bleed=Math.min(180,(s.bleed||0)+(as.serrated||0)*10);
   s.critDmg=Math.min(220,(s.critDmg||0)+(as.ambush||0)*10+(bd.piercing_steel||0)*12);
   s.dodge=Math.min(55,(s.dodge||0)+(sh.evasion||0)*2);
   s.s=(s.s||0)+(sh.evasion||0)*3;
   s.Haste=Math.min(190,(s.Haste||0)+(sh.fleeting||0)*3+(evoRushT>0?10:0));
   s.cdr=Math.min(55,(s.cdr||0)+(sh.shadow_veil||0)*2);
   s.leech=Math.min(12,(s.leech||0)+(sh.vampiric||0)*.3);
  }
  if(pr.might){s.str=(s.str||0)+pr.might*2;const pm=1+pr.might*.02;s.AP*=pm;s.MDMin*=pm;s.MDMax*=pm}
  if(pr.arcana){s.SP+=pr.arcana*4;s.M+=pr.arcana*2}
  if(pr.fortitude){s.H+=pr.fortitude*14;s.a+=pr.fortitude*2}
  if(pr.swiftness){s.Haste=Math.min(200,(s.Haste||0)+pr.swiftness*1.2);s.cdr=Math.min(60,(s.cdr||0)+pr.swiftness*.8)}
  if(pr.precision){s.C=Math.min(65,s.C+pr.precision*.8);s.critDmg=Math.min(250,(s.critDmg||0)+pr.precision*4)}
  const pSpent=paragonSpent();
  if(pSpent>=10)s.s=(s.s||0)+10;
  if(pSpent>=20)s.H*=1.10;
  if(pSpent>=40){s.cdr=Math.min(68,(s.cdr||0)+8);s.Haste=Math.min(220,(s.Haste||0)+8);s.haste=s.Haste}
  if(pSpent>=50){s.AP*=1.12;s.MDMin*=1.12;s.MDMax*=1.12;s.SP*=1.12}
  return s;
 };
 const oldHit=hit;
 hit=function(e,d,fx,forceCrit=false,fromBlade=false){const c=cls();if(c==='warrior'){const w=allRanks.warrior.weapon,r=allRanks.warrior.reaver;let mult=1+(r.cull||0)*.03;if(e&&e.mh>0&&e.hp/e.mh<.35)mult+=(r.cull||0)*.03;if(P.lv>=45&&evoEmpower&&!fromBlade&&!e?.dotNoCrit){evoEmpower=false;mult*=1.35;ft(e.x,e.y-e.r-16,'WARLORD +35%','#ffcf75',.9)}if(P.lv>=15&&e&&e.guardBreak>tm&&!fromBlade)evoRushT=3.5;d*=mult*(activeWhirlwind?1+(w.whirlwind||0)*.05:1)}else if(c==='pyromancer'){const ca=allRanks.pyromancer.cataclysm;if(e&&(e.igniteT>0||e.shockT>0))d*=1+(ca.static_overload||0)*.04;if(P.lv>=15&&fx?.ignite&&evoIgniteManaCd<=0){evoIgniteManaCd=1.0;P.mp=Math.min(stats().M,P.mp+4)}}else if(c==='rogue'){const as=allRanks.rogue.assassination;if(e&&e.bleedT>0)d*=1+(as.ambush||0)*.04;if(P.lv>=15&&!fromBlade&&!e?.dotNoCrit&&e&&(e.sl>0||e.bleedT>0))evoRushT=3.0;if(P.lv>=45&&!fromBlade&&!e?.dotNoCrit&&e&&e.shadowMark>tm){d*=1.2;for(let si=0;si<POTION_CD;si++)if(CD[si]>0)CD[si]=Math.max(0,CD[si]-0.8)}if(as.executioner&&e&&e.mh>0&&e.hp/e.mh<.4){d*=1.25;if(!e.dotNoCrit&&Math.random()<.25)forceCrit=true}}if(paragonSpent()>=30&&e&&(e.el||e.t==='bs'||e.boss||e.uber||e.riftGuardian))d*=1.15;const beforeFt=FT.length;oldHit(e,d,fx,forceCrit,fromBlade);if(c==='pyromancer'&&P.lv>=35&&!fromBlade&&e&&FT.slice(beforeFt).some(x=>x.kind==='crit')){for(const q of E)if(!q.dead&&D(q,e)<95)applyShock(q,3);ring(e.x,e.y,95,'#87dbff')}};
 let activeWhirlwind=false;
 const oldCast=cast;
 cast=function(i){const c=cls(),beforeCd=CD[i]||0;activeWhirlwind=AB[i]?.id==='whirlwind';oldCast(i);activeWhirlwind=false;if(i===POTION_CD){save();return}const castFired=(CD[i]||0)>beforeCd;if(castFired&&c==='warrior'&&P.lv>=45)evoEmpower=true;if(castFired&&c==='pyromancer'){if(P.lv>=45&&evoSurgeCd<=0&&P.mp<stats().M*.45){evoSurgeT=4.0;evoSurgeCd=10;ring(P.x,P.y,95,'#ff9442');ft(P.x,P.y-28,'SOLAR SURGE','#ffd580',1)}if(P.lv>=25){evoCastCount++;if(evoCastCount>=4){evoCastCount=0;const S=stats(),ang=P.face;PR.push({x:P.x+Math.cos(ang)*16,y:P.y+Math.sin(ang)*16,vx:Math.cos(ang)*540,vy:Math.sin(ang)*540,d:S.SP*.95,f:0,life:1.05,r:7,aoe:56,c:'#ffaf58',ignite:S.SP*.24})}}}};
 const oldEvoSwing=swing;
 swing=function(S){oldEvoSwing(S);const c=cls();if(P.lv>=25&&c==='warrior'&&!WW.active){evoSwingCount=(evoSwingCount+1)%3;if(evoSwingCount===0){for(const q of nearbySpellTargets(P,98))if(Math.abs(angleOffset(Math.atan2(q.y-P.y,q.x-P.x),P.face))<1.35)dealProcDamage(q,Math.round(S.AP*1.1),'damage');ring(P.x+Math.cos(P.face)*32,P.y+Math.sin(P.face)*32,68,'#ffd285')}}if(P.lv>=25&&c==='rogue'&&P.primaryBeat===0){const a=P.face;PR.push({x:P.x+Math.cos(a)*14,y:P.y+Math.sin(a)*14,vx:Math.cos(a)*640,vy:Math.sin(a)*640,d:S.AP*1.15,f:0,life:.58,r:5,pierce:true,c:'#e0b5ff'})}};
 const oldEvoHurt=hurt;
 hurt=function(d){const bHp=P.hp,bInv=P.inv_t;oldEvoHurt(d);const c=cls();if(c==='warrior'&&P.lv>=35&&evoWardCd<=0&&!P.dead&&P.hp<stats().H*.55){evoWardT=3.0;evoWardCd=14;ring(P.x,P.y,85,'#8edaff');ft(P.x,P.y-28,'JUGGERNAUT WARD','#8edaff',.95)}if(c==='rogue'&&P.lv>=35&&P.hp===bHp&&P.inv_t===bInv&&!P.dead&&d>0){const S=stats();for(const q of nearbySpellTargets(P,110)){dealProcDamage(q,Math.round(S.AP*.9),'damage');q.sl=Math.max(q.sl||0,2.2)}ring(P.x,P.y,110,'#c69eff')}};
 const oldEvoUpd=update;
 update=function(dt){oldEvoUpd(dt);if(evoRushT>0)evoRushT=Math.max(0,evoRushT-dt);if(evoWardT>0){evoWardT=Math.max(0,evoWardT-dt);if(!P.dead)P.hp=Math.min(stats().H,P.hp+stats().H*.025*dt)}if(evoWardCd>0)evoWardCd=Math.max(0,evoWardCd-dt);if(evoIgniteManaCd>0)evoIgniteManaCd=Math.max(0,evoIgniteManaCd-dt);if(evoSurgeT>0)evoSurgeT=Math.max(0,evoSurgeT-dt);if(evoSurgeCd>0)evoSurgeCd=Math.max(0,evoSurgeCd-dt)};
 const oldMkE=mkE;
 mkE=function(t,x,y,n,id,el){const e=oldMkE(t,x,y,n,id,el);const scale=1+(legacyTier-1)*.28;if(legacyTier>1){e.mh*=scale;e.hp=e.mh;e.d*=1+(legacyTier-1)*.18;e.baseD=e.d;if(t==='bs')e.baseBossD=e.d;e.xp*=1+(legacyTier-1)*.16}return e};
 const persist=()=>{syncParagonGlobals();const curC=cls();classBuildLoadouts[curC]=classBuildLoadouts[curC]||[null,null];classBuildLoadouts[curC][activeLoadoutSlot[curC]||0]={ranks:cleanTree(curC,allRanks[curC]),skills:(window.dodGetClassLoadout?.(curC)||abilityLoadout||[0,1,2,3]).slice(0,4)};try{localStorage.setItem(KEY,JSON.stringify({classes:allRanks,dungeonTier:legacyTier,activeSlot:activeLoadoutSlot,loadouts:classBuildLoadouts}));localStorage.setItem(PARAGON_KEY,JSON.stringify(paragon))}catch(e){}};
 const oldSave=save;save=function(){oldSave();persist();refreshQuick()};
 const oldLoad=load;load=function(){oldLoad();restore();refreshQuick()};
 const SPELL_SCHOOLS=[
  {id:'destruction',name:'Destruction',icon:'🔥',color:'#f08265',desc:'Direct damage, AoE blasts & finishers'},
  {id:'restoration',name:'Restoration',icon:'💚',color:'#72d99a',desc:'Defensive wards, shrouds & life recovery'},
  {id:'transmutation',name:'Transmutation',icon:'✨',color:'#8ec5ff',desc:'Mobility dashes, teleports, traps & stun control'}
 ];
 const skillDetails={
  shieldbash:{role:'Interrupt',school:'transmutation'},
  groundslam:{role:'Crowd Control',school:'destruction'},
  charge:{role:'Dash',school:'transmutation'},
  whirlwind:{role:'Channel · AoE',school:'destruction'},
  rend:{role:'Bleed',school:'destruction'},
  shieldwall:{role:'Defense',school:'restoration'},
  bloodfurnace:{role:'Bleed Heal',school:'restoration'},
  execution:{role:'Finisher',school:'destruction'},
  fireball:{role:'Pyromancy',school:'destruction'},
  flamenova:{role:'AoE Burn',school:'destruction'},
  blink:{role:'Teleport',school:'transmutation'},
  chainlightning:{role:'Storm',school:'destruction'},
  icearmor:{role:'Ward',school:'restoration'},
  stormhalo:{role:'Storm Aura',school:'transmutation'},
  pyroblast:{role:'Nuke',school:'destruction'},
  meteor:{role:'Cataclysm',school:'destruction'},
  twinfang:{role:'Bleed Strike',school:'destruction'},
  fanknives:{role:'Volley',school:'destruction'},
  shadowstep:{role:'Shadow Dash',school:'transmutation'},
  venomstrike:{role:'Poison',school:'destruction'},
  caltrops:{role:'Steel Trap',school:'transmutation'},
  smokebomb:{role:'Stealth Ward',school:'restoration'},
  bladeflurry:{role:'AoE Barrage',school:'destruction'},
  assassinate:{role:'Execute',school:'destruction'}
 };
 function effectiveSpellProfile(a,mod,c,S){
  let cdBase=a.cd*mod.cdMult,mpCost=a.mp,gearCdMult=1;
  if(c==='warrior'){
   if(a.id==='charge'&&mod.rune==='b')cdBase=Math.max(1.5,cdBase-1.5);
   if(a.id==='shieldwall'&&mod.rune==='b')cdBase=Math.max(3,cdBase-2);
  }else if(c==='pyromancer'){
   const ca=allRanks.pyromancer?.cataclysm||{};
   if(a.id==='icearmor')gearCdMult*=1-(ca.frost_shield||0)*.06;
   if(P.eq?.[8]?.id==='astral_orb'&&(a.id==='flamenova'||a.id==='meteor'))gearCdMult*=.8;
   if(a.id==='flamenova'&&mod.rune==='b')cdBase=Math.max(2,cdBase-1.2);
   if(a.id==='pyroblast'&&mod.rune==='b'){cdBase=Math.max(2.2,cdBase-1.8);mpCost=Math.max(0,mpCost-6)}
  }else if(c==='rogue'){
   if(a.id==='twinfang'&&mod.rune==='b')cdBase=Math.max(.8,cdBase-.5);
   if(a.id==='shadowstep'&&mod.rune==='a')cdBase=Math.max(1.5,cdBase-1.0);
   if(a.id==='caltrops'&&mod.rune==='b')cdBase=Math.max(2.5,cdBase-1.5);
   if(a.id==='bladeflurry'&&mod.rune==='b')cdBase=Math.max(2.2,cdBase-1.4);
  }
  const cdScale=.88*(1-(S?.cdr||0)/100)*gearCdMult;
  const effCd=a.id==='whirlwind'?0.2:Math.max(.3,cdBase*cdScale);
  return {effCd,mpCost};
 }
 function buildSpellTooltipHtml(a,idx,mod,c,S){
  const meta=skillDetails[a.id]||{role:'Spell',school:'destruction'};
  const sch=SPELL_SCHOOLS.find(s=>s.id===meta.school)||SPELL_SCHOOLS[0];
  const prof=effectiveSpellProfile(a,mod,c,S);
  const wSt=P.eq?.[0]?.st||{};
  const dMin=Number.isFinite(+wSt.dMin)?+wSt.dMin:4,dMax=Number.isFinite(+wSt.dMax)?+wSt.dMax:7;
  const wLo=Math.max(1,(S?.AP||0)+dMin),wHi=Math.max(wLo,(S?.AP||0)+dMax);
  const sp=S?.SP||0,ap=S?.AP||0,maxMp=Math.max(1,Math.round(S?.M||50)),maxHp=Math.max(1,Math.round(S?.H||105));
  const rng=(m,add=0)=>`${Math.round(wLo*m+add)}-${Math.round(wHi*m+add)}`;
  const hyb=(apM,spM,totM=1)=>`${Math.round((wLo*apM+sp*spM)*totM)}-${Math.round((wHi*apM+sp*spM)*totM)}`;
  const wr=allRanks.warrior?.weapon||{},gd=allRanks.warrior?.guardian||{},rv=allRanks.warrior?.reaver||{};
  const pt=allRanks.pyromancer?.pyromancy||{},ca=allRanks.pyromancer?.cataclysm||{};
  const as=allRanks.rogue?.assassination||{},shT=allRanks.rogue?.shadowcraft||{},bd=allRanks.rogue?.bladedance||{};
  const ember3=typeof getSetCounts==='function'&&(getSetCounts().find(s=>s.id==='emberweaver')?.count>=3);
  const ignMult=(1+(pt.wildfire||0)*.12)*(P.eq?.[0]?.id==='pyre_wand'?1.35:1)*(ember3?1.45:1);
  const dmgLines=[];
  let manaText=`${prof.mpCost} Mana (${Math.round(prof.mpCost/maxMp*100)}% Max)`;
  let scaleTitle='Weapon & Attack Power',scaleFormula='Scales with Weapon Roll + AP';
  let scaleLvStat=`+${(P.lv*1.4).toFixed(1)} base AP from Lv ${P.lv} (+1.40 AP/lv) · AP: ${Math.round(ap)} · Wpn: ${Math.round(wLo)}-${Math.round(wHi)}`;
  let talentNote='';
  if(a.id==='shieldbash'){
   const mult=(1.8+(wr.shieldbash||0)*.08)*mod.dmgMult*(mod.rune==='a'?1.25:1);
   const stun=(1+(wr.shieldbash||0)*.15+(mod.rune==='a'?.8:0)).toFixed(1);
   dmgLines.push(['Direct Damage',`${rng(mult)} (${Math.round(mult*100)}% Wpn)`]);
   dmgLines.push(['Control & Guard',`${stun}s Stun · Breaks Windups`]);
   if(mod.rune==='b')dmgLines.push(['Vanguard Strike','+1.5s Guard & +8 Mana on hit']);
   if(wr.shieldbash)talentNote=`Shield Bash (${wr.shieldbash}/5): +${wr.shieldbash*8}% Dmg, +${(wr.shieldbash*.15).toFixed(2)}s Stun`;
  }else if(a.id==='groundslam'){
   const mult=(1.7+(gd.groundslam||0)*.07)*mod.dmgMult*(mod.rune==='a'?1.2:1);
   const rad=145+(gd.groundslam||0)*9+(mod.rune==='a'?34:0);
   dmgLines.push(['Slam AoE Damage',`${rng(mult)} (${Math.round(mult*100)}% Wpn)`]);
   dmgLines.push(['vs Guard-Broken',`${rng(mult*1.75)} (+75% Dmg & +10 Mana)`]);
   dmgLines.push(['Radius & Slow',`${rad}px AoE · ${mod.rune==='b'?'4.0s':'2.5s'} Slow`]);
   if(gd.groundslam)talentNote=`Ground Slam (${gd.groundslam}/5): +${gd.groundslam*7}% Dmg, +${gd.groundslam*9}px`;
  }else if(a.id==='charge'){
   const mult=(1.8+(wr.charge||0)*.12)*mod.dmgMult*(mod.rune==='a'?1.35:1);
   dmgLines.push(['Path Impact Damage',`${rng(mult)} (${Math.round(mult*100)}% Wpn)`]);
   dmgLines.push(['Rush Duration',`${(.28+(wr.charge||0)*.025).toFixed(2)}s Invuln Dash${mod.rune==='a'?' · 0.6s Stun':''}`]);
   if(wr.charge)talentNote=`Charge (${wr.charge}/5): +${wr.charge*12}% Impact Dmg`;
  }else if(a.id==='whirlwind'){
   const cfg=typeof whirlConfig==='function'?whirlConfig():{radius:84+(wr.stormreach||0)*6+(mod.rune==='b'?18:0),cost:(20-(wr.stormreach||0))*(mod.rune==='b'?.75:1),interval:.32,damage:.46*(1+(wr.whirlwind||0)*.05)*mod.dmgMult*(mod.rune==='a'?1.25:1),bleed:mod.rune==='a'};
   const avgSpin=(wLo+wHi)/2*cfg.damage;
   manaText=`${cfg.cost.toFixed(1)} Mana/s (${Math.round(cfg.cost/maxMp*100)}%/s)`;
   dmgLines.push(['Spin Tick Damage',`${rng(cfg.damage)} every ${cfg.interval.toFixed(2)}s`]);
   dmgLines.push(['Sustained DPS',`~${Math.round(avgSpin/cfg.interval)} DPS (${cfg.radius}px AoE)`]);
   dmgLines.push(['Wounded Bonus',`+25% Dmg vs Bleeding${cfg.bleed?' · 2s Bleed':''}`]);
   if(wr.whirlwind||wr.stormreach)talentNote=`Whirlwind: +${(wr.whirlwind||0)*5}% Dmg · -${wr.stormreach||0} Mana/s`;
  }else if(a.id==='rend'){
   const slashMult=(1.1+(rv.rend||0)*.08+(wr.cleave||0)*.08)*mod.dmgMult;
   const bleedTick=(.22+(rv.rend||0)*.045)*(1+(rv.bloodtempo||0)*.1)*mod.dmgMult*(mod.rune==='a'?1.35:1)*(P.eq?.[0]?.id==='bloodletter'?1.25:1);
   const dur=4+(rv.rend||0)*.35+(mod.rune==='a'?1.5:0)+(P.eq?.[0]?.id==='bloodletter'?1:0);
   dmgLines.push(['Arc Slash',`${rng(slashMult)} (${mod.rune==='b'?'175px':'138px'} reach)`]);
   dmgLines.push(['Bleed Over Time',`${rng(bleedTick*dur/.5)} over ${dur.toFixed(1)}s`]);
   if(mod.rune==='b')dmgLines.push(['Crimson Arc','Restores +12 HP on hit']);
   if(rv.rend)talentNote=`Rend (${rv.rend}/5): +${rv.rend*8}% Slash, +${(rv.rend*4.5).toFixed(1)}% Bleed`;
  }else if(a.id==='shieldwall'){
   const dur=(3+(gd.shieldwall||0)*.45+(mod.rune==='b'?1.5:0)).toFixed(1);
   scaleTitle='Defense & Attack Power';scaleFormula='Scales with Max HP (+7.2/lv) & AP (+1.40/lv)';
   scaleLvStat=`+${Math.round(P.lv*7.2)} base HP & +${(P.lv*1.4).toFixed(1)} base AP from Lv ${P.lv} · HP: ${maxHp}`;
   dmgLines.push(['Guard Mitigation',`65% Damage Reduction for ${dur}s`]);
   if(mod.rune==='a')dmgLines.push(['Spiked Bastion',`${Math.round(ap*1.35*mod.dmgMult)} AoE Dmg (135% AP)`]);
   if(gd.shieldwall)talentNote=`Shield Wall (${gd.shieldwall}/5): +${(gd.shieldwall*.45).toFixed(2)}s Duration`;
  }else if(a.id==='bloodfurnace'){
   const clM=(1+(wr.cleave||0)*.08)*mod.dmgMult*(mod.rune==='a'?1.35:1);
   const healPct=mod.rune==='b'?7:3.5;
   dmgLines.push(['Base Burst (125px)',`${rng(1.18*clM)} (${Math.round(118*clM)}% Wpn)`]);
   dmgLines.push(['Bleed Detonation',`${rng(2.25*clM)} (${Math.round(225*clM)}% Wpn)`]);
   dmgLines.push(['Blood Siphon',`Heals ${Math.round(maxHp*(healPct/100))} HP (${healPct}%) per Bleed`]);
   if(mod.rune==='a')dmgLines.push(['Searing Boil',`Ignites survivors (${Math.round(ap*.24)} base burn)`]);
  }else if(a.id==='execution'){
   const mult=(2.4+(rv.execution||0)*.12)*mod.dmgMult;
   const thresh=mod.rune==='a'?'50%':'35%';
   dmgLines.push(['Direct Strike',`${rng(mult)} (${Math.round(mult*100)}% Wpn)`]);
   dmgLines.push([`Execute (<${thresh} HP)`,`${rng(mult*1.6)} · Guaranteed Crit`]);
   if(mod.rune==='b')dmgLines.push(['Relentless Finisher','Kills refund 50% CD & +15 Mana']);
   if(rv.execution)talentNote=`Execution (${rv.execution}/5): +${rv.execution*12}% Finisher Dmg`;
  }else if(a.id==='fireball'){
   const mult=(1+(pt.emberbolt||0)*.06)*mod.dmgMult;
   const ign=sp*.24*ignMult*(mod.rune==='b'?1.3:1);
   scaleTitle='Spell Power & Weapon Hybrid';scaleFormula='0.95x Weapon Roll + 1.05x Spell Power';
   scaleLvStat=`+${(P.lv*1.75).toFixed(1)} base SP (+1.75/lv) & +${(P.lv*1.4).toFixed(1)} base AP · SP: ${Math.round(sp)}`;
   dmgLines.push(['Fireball Blast',`${hyb(.95,1.05,mult)} (${mod.rune==='b'?'108px':'78px'} AoE)`]);
   dmgLines.push(['Ignite Burn',`${Math.round(ign)} burn/tick${mod.rune==='a'?' · +2 Side Embers':''}`]);
   if(pt.emberbolt||pt.wildfire)talentNote=`Pyromancy: +${(pt.emberbolt||0)*6}% Blast · +${(pt.wildfire||0)*12}% Ignite`;
  }else if(a.id==='flamenova'){
   const mult=(1+(pt.nova_reach||0)*.08)*mod.dmgMult;
   const rad=155+(pt.nova_reach||0)*14+(mod.rune==='b'?36:0);
   const ign=sp*.26*ignMult;
   scaleTitle='Spell Power & Weapon Hybrid';scaleFormula='0.80x Weapon Roll + 0.95x Spell Power';
   scaleLvStat=`+${(P.lv*1.75).toFixed(1)} base SP (+1.75/lv) & +${(P.lv*1.4).toFixed(1)} base AP · SP: ${Math.round(sp)}`;
   dmgLines.push([`Nova Blast (${rad}px)`,`${hyb(.8,.95,mult)}`]);
   dmgLines.push(['Burning Detonation',`${hyb(.8,.95,mult*1.45)} (+45% & spreads)`]);
   dmgLines.push(['Ignite Value',`${Math.round(ign)} base burn`]);
   if(pt.nova_reach)talentNote=`Nova Reach (${pt.nova_reach}/5): +${pt.nova_reach*8}% Dmg, +${pt.nova_reach*14}px`;
  }else if(a.id==='blink'){
   scaleTitle='Arcane Utility & Spell Power';scaleFormula='Scales with Max Mana (+3.5/lv) & SP (+1.75/lv)';
   scaleLvStat=`+${(P.lv*3.5).toFixed(1)} Max Mana & +${(P.lv*1.75).toFixed(1)} base SP from Lv ${P.lv} · SP: ${Math.round(sp)}`;
   dmgLines.push(['Teleport Range','175px Blink · 0.45s Invulnerability']);
   if(mod.rune==='a')dmgLines.push(['Phase Surge','+8 Mana & -1.0s other Cooldowns']);
   if(mod.rune==='b')dmgLines.push(['Frostbite Wake',`${Math.round(sp*.45*mod.dmgMult)} Frost Dmg (115px) · 2.8s Slow`]);
  }else if(a.id==='chainlightning'){
   const mult=(1+(ca.stormcall||0)*.08)*mod.dmgMult*(mod.rune==='a'?1.2:1);
   const jumps=4+(mod.rune==='a'?2:0);
   scaleTitle='Spell Power & Weapon Hybrid';scaleFormula='0.70x Weapon Roll + 0.95x Spell Power';
   scaleLvStat=`+${(P.lv*1.75).toFixed(1)} base SP (+1.75/lv) & +${(P.lv*1.4).toFixed(1)} base AP · SP: ${Math.round(sp)}`;
   dmgLines.push(['Bolt Damage',`${hyb(.7,.95,mult)} per target`]);
   dmgLines.push(['Chain & Shock',`Up to ${jumps} foes (270px) · 4.5s Shock (+18%)`]);
   if(mod.rune==='b')dmgLines.push(['Arc Conduit','+4 Mana per enemy shocked']);
   if(ca.stormcall)talentNote=`Stormcall (${ca.stormcall}/5): +${ca.stormcall*8}% Bolt Dmg`;
  }else if(a.id==='icearmor'){
   const dur=(4.5+(mod.rune==='b'?2.5:0)).toFixed(1);
   scaleTitle='Frost Ward & Spell Power';scaleFormula='Scales with Defense & SP (+1.75/lv)';
   scaleLvStat=`+${(P.lv*1.75).toFixed(1)} base SP & +${Math.round(P.lv*7.2)} base HP from Lv ${P.lv} · SP: ${Math.round(sp)}`;
   dmgLines.push(['Crystalline Ward',`+28 Armor & +16% Dodge for ${dur}s`]);
   dmgLines.push(['Chill Aura (150px)',`Applies ${mod.rune==='b'?'4.8s':'3.2s'} Slow`]);
   if(mod.rune==='a')dmgLines.push(['Glacial Nova',`${Math.round(sp*.65*mod.dmgMult)} Frost Dmg + 0.9s Stun`]);
   if(ca.frost_shield)talentNote=`Frost Shield (${ca.frost_shield}/5): +${ca.frost_shield*4} Armor, -${ca.frost_shield*6}% CD`;
  }else if(a.id==='stormhalo'){
   const mult=(1+(ca.stormcall||0)*.08)*mod.dmgMult*(mod.rune==='a'?1.25:1);
   const pulse=mod.rune==='b'?.26:.36,dur=4.2+(mod.rune==='b'?2.0:0);
   scaleTitle='Spell Power & Weapon Hybrid';scaleFormula='0.48x Spell Power + 0.36x Weapon Roll / hit';
   scaleLvStat=`+${(P.lv*1.75).toFixed(1)} base SP (+1.75/lv) & +${(P.lv*1.4).toFixed(1)} base AP · SP: ${Math.round(sp)}`;
   dmgLines.push(['Orb Strike',`${hyb(.36,.48,mult)} every ${pulse.toFixed(2)}s`]);
   dmgLines.push(['Arc Jump & Orbit',`+56% jump dmg (88px) · ${dur.toFixed(1)}s + Shock`]);
   if(ca.stormcall)talentNote=`Stormcall (${ca.stormcall}/5): +${ca.stormcall*8}% Halo Dmg`;
  }else if(a.id==='pyroblast'){
   const mult=mod.dmgMult*(mod.rune==='a'?1.3:1);
   const ign=sp*.4*ignMult;
   scaleTitle='Spell Power & Weapon Hybrid';scaleFormula='1.30x Weapon Roll + 1.65x Spell Power';
   scaleLvStat=`+${(P.lv*1.75).toFixed(1)} base SP (+1.75/lv) & +${(P.lv*1.4).toFixed(1)} base AP · SP: ${Math.round(sp)}`;
   dmgLines.push(['Molten Impact',`${hyb(1.3,1.65,mult)} (${mod.rune==='a'?'120px':'92px'} AoE)`]);
   dmgLines.push(['Deep Ignite Burn',`${Math.round(ign)} burn/tick${mod.rune==='b'?' · -6 Mana, -1.8s CD':''}`]);
   if(pt.wildfire)talentNote=`Wildfire (${pt.wildfire}/5): +${pt.wildfire*12}% Ignite`;
  }else if(a.id==='meteor'){
   const mult=(1+(ca.meteor_shower||0)*.08)*mod.dmgMult*(mod.rune==='b'?1.3:1);
   const count=3+((ca.meteor_shower||0)>=5?1:0)+(mod.rune==='a'?2:0);
   const loM=Math.round((wLo*.85+sp*1.05)*mult),hiM=Math.round((wHi*.85+sp*1.05)*mult);
   scaleTitle='Spell Power & Weapon Hybrid';scaleFormula=`(0.85x Wpn + 1.05x SP) x ${count} Meteors`;
   scaleLvStat=`+${(P.lv*1.75).toFixed(1)} base SP (+1.75/lv) & +${(P.lv*1.4).toFixed(1)} base AP · SP: ${Math.round(sp)}`;
   dmgLines.push([`Per Meteor (${count}x)`,`${loM}-${hiM}`]);
   dmgLines.push(['Total Salvo',`${loM*count}-${hiM*count} + ${Math.round(sp*.24*ignMult)} Ignite`]);
   if(mod.rune==='b')dmgLines.push(['Starfire Impact','+0.7s extra Stun on impact']);
   if(ca.meteor_shower)talentNote=`Meteor Shower (${ca.meteor_shower}/5): +${ca.meteor_shower*8}% Dmg`;
  }else if(a.id==='twinfang'){
   const mult=1.25*(1+(as.twin_mastery||0)*.07)*mod.dmgMult;
   const dur=4+(mod.rune==='a'?1.5:0);
   const bleedTick=.32*mod.dmgMult*(mod.rune==='a'?1.4:1);
   dmgLines.push(['Double Slash',`${rng(mult*1.9)} combined (${rng(mult)} + ${rng(mult*.9)})`]);
   dmgLines.push(['Bleed Over Time',`${rng(bleedTick*(dur/.35))} over ${dur.toFixed(1)}s`]);
   if(mod.rune==='b')dmgLines.push(['Viper Tempo','+4 Mana on hit & -0.5s CD']);
   if(as.twin_mastery)talentNote=`Twin Mastery (${as.twin_mastery}/5): +${as.twin_mastery*7}% Dmg`;
  }else if(a.id==='fanknives'){
   const set3=typeof getSetCounts==='function'&&(getSetCounts().find(s=>s.id==='nightstalker')?.count>=3);
   const bonus=((bd.fan_volley||0)>=2?1:0)+((bd.fan_volley||0)>=5?1:0)+(P.eq?.[2]?.id==='nightstalker_garb'||set3?2:0)+(mod.rune==='a'?3:0);
   const ringMode=!!bd.thousand_cuts,total=(ringMode?12:9)+bonus;
   const mult=.72*(1+(bd.fan_volley||0)*.06)*(ringMode?1.2:1)*mod.dmgMult;
   const slow=(2.2+(bd.piercing_steel||0)*.4+(mod.rune==='b'?1.4:0)).toFixed(1);
   dmgLines.push([`Per Dagger (${total}x)`,rng(mult)]);
   dmgLines.push(['Pattern & Slow',`${ringMode?'360 Ring':'Cone'} · ${slow}s Slow${mod.rune==='b'?' + 3s Bleed':''}`]);
   if(bd.fan_volley)talentNote=`Fan Volley (${bd.fan_volley}/5): +${bd.fan_volley*6}% Knife Dmg`;
  }else if(a.id==='shadowstep'){
   const mult=1.75*mod.dmgMult,buff=(2.5+(mod.rune==='a'?1.5:0)).toFixed(1);
   dmgLines.push(['Dash Damage',`${rng(mult)} (${Math.round(mult*100)}% Wpn)`]);
   dmgLines.push(['Expose & Crit',`+75% next hit · +35% Crit for ${buff}s`]);
   if(mod.rune==='b')dmgLines.push(['Ambush Cut','Extra slash on arrival']);
  }else if(a.id==='venomstrike'){
   const mult=1.45*(1+(as.twin_mastery||0)*.07)*mod.dmgMult;
   dmgLines.push(['Lunge Strike',`${rng(mult)}${mod.rune==='a'?` (${rng(mult*1.35)} vs Bleed/Slow)`:''}`]);
   dmgLines.push(['Bleed & Slow',`${rng(.38*mod.dmgMult*(4.5/.35))} Bleed (4.5s) · ${mod.rune==='b'?'4.5s Slow + 0.7s Stun':'3.0s Slow'}`]);
   if(as.twin_mastery)talentNote=`Twin Mastery (${as.twin_mastery}/5): +${as.twin_mastery*7}% Dmg`;
  }else if(a.id==='caltrops'){
   const mult=.9*(1+(bd.blade_flurry_m||0)*.08)*mod.dmgMult*(mod.rune==='a'?1.4:1);
   const rad=mod.rune==='a'?185:145,slow=(3.5+(shT.shadow_veil||0)*.5).toFixed(1);
   dmgLines.push([`Trap Burst (${rad}px)`,rng(mult)]);
   dmgLines.push(['Bleed & Slow',`${rng(.28*mod.dmgMult*(3.5/.35))} Bleed · ${slow}s Slow`]);
   if(mod.rune==='b')dmgLines.push(['Tactical Escape','+8 Mana & -1.5s CD']);
  }else if(a.id==='smokebomb'){
   const dur=(4+(shT.shadow_veil||0)*.5+(mod.rune==='a'?2:0)).toFixed(1);
   scaleTitle='Shadow Defense & Attack Power';scaleFormula='Scales with Max HP (+7.2/lv) & AP (+1.40/lv)';
   scaleLvStat=`+${Math.round(P.lv*7.2)} base HP & +${(P.lv*1.4).toFixed(1)} base AP from Lv ${P.lv} · HP: ${maxHp}`;
   dmgLines.push(['Shadow Shroud',`+45% Dodge & +25% Crit for ${dur}s`]);
   if(mod.rune==='a')dmgLines.push(['Shadow Cloak',`Restores +${Math.round(maxHp*.15)} HP (15%)`]);
   if(mod.rune==='b')dmgLines.push(['Flash Powder',`${rng(.85*mod.dmgMult)} AoE Dmg (135px) · 3.0s Slow`]);
   if(shT.shadow_veil)talentNote=`Shadow Veil (${shT.shadow_veil}/5): +${(shT.shadow_veil*.5).toFixed(1)}s Duration`;
  }else if(a.id==='bladeflurry'){
   const mult=1.05*(1+(bd.blade_flurry_m||0)*.08)*mod.dmgMult;
   const hits=mod.rune==='a'?'3 Slashes (1+0.9+0.8x)':'2 Slashes (1+0.9x)';
   const totalMult=mult*(mod.rune==='a'?2.7:1.9);
   dmgLines.push([hits,`${rng(totalMult)} total (140px AoE)`]);
   if(mod.rune==='b')dmgLines.push(['Lethal Tempo','+25% Bonus Crit & -1.4s CD']);
   if(bd.blade_flurry_m)talentNote=`Blade Flurry (${bd.blade_flurry_m}/5): +${bd.blade_flurry_m*8}% Dmg`;
  }else if(a.id==='assassinate'){
   const mult=2.55*mod.dmgMult,thresh=mod.rune==='a'?'55%':'40%';
   dmgLines.push(['Lethal Strike',`${rng(mult)} (+30% Bonus Crit)`]);
   dmgLines.push([`Execute (<${thresh} HP)`,`${rng(mult*1.75)} (${Math.round(mult*175)}% Wpn)`]);
   if(mod.rune==='b')dmgLines.push(['Vanish Reset','Kills reset Evade & +15 Mana']);
  }
  const remCd=Math.max(0,CD[idx]||0),unlocked=P.lv>=(a.unlock||1);
  const cdTxt=a.id==='whirlwind'?'Channel (0.2s stop)':`${prof.effCd.toFixed(2)}s${Math.abs(prof.effCd-a.cd)>.08?` (Base ${a.cd}s)`:''}`;
  const stateTxt=!unlocked?`Locked (Lv ${a.unlock})`:remCd>0?`${remCd.toFixed(1)}s left`:'Ready';
  const runes=(window.dodSpellBook?.SPELL_RUNES?.[a.id])||[];
  const activeRune=mod.rank>=1?runes.find(r=>r.id===mod.rune):null;
  const nextRankTxt=mod.rank<3?`Next (${mod.rank+1}/3): +${(mod.rank+1)*12}% Dmg · -${(mod.rank+1)*6}% CD`:'Max Rank Reached (3/3)';
  return `<div class="sbtHead"><div class="sbtTitleWrap"><div class="sbtIcon">${unlocked?skillEmblem(a):'🔒'}</div><div><b class="sbtName">${esc(a.n)}</b><div class="sbtSub"><span class="sbtSchool" style="--school-color:${sch.color}">${sch.name}</span><span>${esc(meta.role)}</span><span>· Lv ${a.unlock}</span></div></div></div><span class="sbtRank">${mod.rank>=3?'RANK 3/3 · MAX':`RANK ${mod.rank}/3`}</span></div>`
   +`<div class="sbtGrid"><div class="sbtStat"><span>Mana Cost</span><b>${manaText}</b></div><div class="sbtStat"><span>Cooldown · ${stateTxt}</span><b>${cdTxt}</b></div></div>`
   +`<div class="sbtDmgBox"><h4>Combat Output (Lv ${P.lv})</h4>${dmgLines.map(([k,v])=>`<div class="sbtLine"><span>${k}</span><strong>${v}</strong></div>`).join('')}</div>`
   +`<div class="sbtScaleBox"><h4>Scaling · ${scaleTitle}</h4><div class="sbtLine"><span>Formula</span><strong>${scaleFormula}</strong></div><div class="sbtLine"><span>Hero Lv ${P.lv}</span><strong>${scaleLvStat}</strong></div><div class="sbtLine"><span>Rank (${mod.rank}/3)</span><strong>+${mod.rank*12}% Dmg · -${mod.rank*6}% CD</strong></div><div class="sbtLine"><span>Progression</span><strong>${nextRankTxt}</strong></div>${talentNote?`<div class="sbtLine"><span>Talents</span><strong>${talentNote}</strong></div>`:''}</div>`
   +`<p class="sbtDesc">${esc(a.desc)}</p>`
   +(activeRune?`<div class="sbtRune"><b>✦ Active Rune · ${esc(activeRune.n)}:</b> ${esc(activeRune.desc)}</div>`:`<div class="sbtRune">Invest <b>1 Spell Point</b> to unlock 2 selectable Spell Runes.</div>`);
 }
 function addParagonXp(x){
  if(!x||x<=0)return;
  paragon.xp+=Math.round(x);
  let gained=0;
  while(paragon.xp>=paragonNeed(paragon.level)){paragon.xp-=paragonNeed(paragon.level);paragon.level++;gained++}
  if(gained){banner(`Paragon Level ${paragon.level}! (+${gained} pt${gained>1?'s':''})`);ring(P.x,P.y,130,'#c9a24a');snd(587,.35,'triangle',.07,260)}
  persist();refreshQuick();
 }
 function switchLoadout(c,nextSlot){
  const curSlot=activeLoadoutSlot[c]||0;
  if(curSlot===nextSlot)return;
  classBuildLoadouts[c]=classBuildLoadouts[c]||[null,null];
  classBuildLoadouts[c][curSlot]={ranks:cleanTree(c,allRanks[c]),skills:(window.dodGetClassLoadout?.(c)||abilityLoadout||[0,1,2,3]).slice(0,4)};
  activeLoadoutSlot[c]=nextSlot;
  const target=classBuildLoadouts[c][nextSlot];
  allRanks[c]=target?.ranks?cleanTree(c,target.ranks):emptyFor(c);
  if(Array.isArray(target?.skills)&&window.dodSetClassLoadout){
   const skillList=window.dodGetClassSkills?.(c)||AB;
   const valid=target.skills.every((si,pos,arr)=>si==null||(skillList[si]&&P.lv>=(skillList[si].unlock||1)&&arr.indexOf(si)===pos));
   if(valid){target.skills.forEach((si,pos)=>{if(si!=null)window.dodSetClassLoadout(c,pos,si)})}
  }
  save();render();renderInv?.();
  banner(`Switched to Build ${nextSlot===0?'A':'B'}`);
 }
 function applySmartPreset(c=cls(),variant='default'){
  allRanks[c]=emptyFor(c);
  const cr=allRanks[c],branches=getBranches(c);
  let plan;
  if(c==='warrior'){
   plan=variant==='bleed'
    ?[['reaver','siphon',5],['reaver','bloodied',5],['reaver','rend',5],['reaver','bloodspread',3],['reaver','cull',5],['reaver','bloodtempo',5],['reaver','rupture',1],['reaver','feast',5],['reaver','execution',5],['reaver','reaper',1],['guardian','vitality',5],['weapon','edge',4]]
    :[['weapon','stormreach',5],['weapon','edge',5],['weapon','whirlwind',5],['weapon','stormrhythm',5],['weapon','tempest',3],['weapon','precision',5],['weapon','momentum',5],['weapon','stormburst',1],['weapon','warbreaker',1],['guardian','vitality',5],['guardian','iron',5],['reaver','siphon',4]];
  }else if(c==='pyromancer'){
   plan=[['pyromancy','emberbolt',5],['pyromancy','wildfire',5],['pyromancy','nova_reach',5],['pyromancy','cinder_burst',3],['pyromancy','solar_flare',1],['arcana','spellcraft',5],['arcana','mana_flow',5],['arcana','spell_crit',5],['arcana','quicken',5],['arcana','archmage',1],['cataclysm','stormcall',5],['cataclysm','frost_shield',4]];
  }else{
   plan=[['assassination','lethal_edge',5],['assassination','twin_mastery',5],['assassination','serrated',5],['assassination','ambush',5],['assassination','executioner',1],['shadowcraft','evasion',5],['shadowcraft','fleeting',5],['shadowcraft','shadow_veil',5],['shadowcraft','vampiric',5],['shadowcraft','night_cloak',1],['bladedance','fan_volley',5],['bladedance','piercing_steel',3]];
  }
  let budget=earned();
  for(const [branch,id,count]of plan){
   const node=branches.find(b=>b.id===branch)?.nodes.find(n=>n.id===id);
   if(!node)continue;
   for(let i=0;i<count&&budget>0;i++){
    if(spentIn(branch,c)<node.gate||P.lv<(node.level||1)||(node.excludes&&cr[branch][node.excludes])||cr[branch][id]>=node.max)break;
    cr[branch][id]++;budget--;
   }
  }
  save();render();renderInv?.();
  banner('✦ Applied Recommended Spec ('+spentAll(c)+'/'+earned()+' pts)');
 }
 window.dodParagon={addXp:addParagonXp,grantLevels:(n=10)=>{paragon.level=Math.max(paragon.level,Math.floor(+n||0));paragon.xp=0;const av=paragonAvail();if(av>0){const order=['fortitude','precision','swiftness','might','arcana','avarice'];for(let i=0;i<av;i++){const k=order[i%order.length];if((paragon.ranks[k]||0)<50)paragon.ranks[k]=(paragon.ranks[k]||0)+1}}persist();refreshQuick();return paragon.level},getState:()=>JSON.parse(JSON.stringify({level:paragon.level,xp:paragon.xp,needed:paragonNeed(paragon.level),earned:paragonEarned(),spent:paragonSpent(),available:paragonAvail(),ranks:paragon.ranks,milestones:PARAGON_MILESTONES.filter(m=>paragonSpent()>=m.pts).map(m=>m.name)})),open:()=>{skillTab='paragon';panel.style.display='block';render()},reset:()=>{paragon.ranks=emptyParagon().ranks;persist();render();renderInv?.()}};
 function render(){
  syncBranchSelection();
  const c=cls(),classBranches=getBranches(c),classRanks=allRanks[c],points=available(c),branch=classBranches.find(b=>b.id===selectedBranch)||classBranches[0],branchSpent=spentIn(branch.id,c),bm=window.dodBuildMastery?.get?.();
  const skillList=(window.dodGetClassSkills?.(c)||AB).filter(Boolean),activeLoadout=window.dodGetClassLoadout?.(c)||abilityLoadout;
  const pAvail=paragonAvail(),pNeed=paragonNeed(paragon.level),pSpent=paragonSpent();
  const sb=window.dodSpellBook,sbEarned=sb?sb.earned():0,sbSpent=sb?sb.spent(c):0,sbAvail=sb?sb.avail(c):0;
  const curSlot=activeLoadoutSlot[c]||0;
  const tierGroups=[
   {title:'Tier I · Core Foundations (0+ pts)',filter:n=>n.gate===0},
   {title:'Tier II · Specialization (4–8+ pts)',filter:n=>n.gate>0&&n.gate<=8},
   {title:'Tier III · Mastery (13–15+ pts)',filter:n=>n.gate>8&&n.gate<=15},
   {title:'Tier IV · Keystones & Finales (18–24+ pts)',filter:n=>n.gate>=18}
  ];
  const renderNodeCard=(node)=>{
   const rank=classRanks[branch.id][node.id];
   const unlocked=branchSpent>=node.gate&&P.lv>=(node.level||1)&&!(node.excludes&&classRanks[branch.id][node.excludes]);
   const req=branchSpent<node.gate?`Requires ${node.gate} pts`:P.lv<(node.level||1)?`Requires Lv ${node.level}`:node.excludes&&classRanks[branch.id][node.excludes]?`Exclusive with ${branch.nodes.find(n=>n.id===node.excludes)?.name}`:'';
   const pips='■'.repeat(rank)+'□'.repeat(Math.max(0,node.max-rank));
   const canDown=canRefundNode(c,branch.id,node.id);
   return `<article class="talentCard ${unlocked?'':'locked'}"><div><b>${node.name}</b><small>${node.desc}${req?` · <span style="color:#d4a965">${req}</span>`:''}</small></div><div class="talentRank"><span class="rankPips" aria-hidden="true">${pips}</span><span>${rank}/${node.max}</span><button data-down="${branch.id}:${node.id}" aria-label="Refund ${node.name}" ${!canDown?'disabled':''}>-</button><button data-up="${branch.id}:${node.id}" aria-label="Upgrade ${node.name}" ${!unlocked||points<1||rank>=node.max?'disabled':''}>${rank>=node.max?'Max':'+'}</button></div></article>`;
  };
  const evos=CLASS_EVOLUTIONS[c]||CLASS_EVOLUTIONS.warrior;
  const skillCap=typeof activeSkillSlotCap==='function'?activeSkillSlotCap():4;
  const slotLv=typeof slotUnlockLevel==='function'?slotUnlockLevel:(s=>s<=0?1:s===1?2:s===2?4:7);
  const heroStats=stats();
  const renderActionBar=[0,1,2,3].map(slot=>{
   const idx=activeLoadout[slot],a=idx!=null?skillList[idx]:null,slotLocked=slot>=skillCap,reqLv=slotLv(slot),info=a?(skillDetails[a.id]||{role:'Skill',school:'destruction'}):null;
   const mod=a&&sb?sb.getMod(a.id,c):{rank:0,rune:null,dmgMult:1,cdMult:1};
   const prof=a?effectiveSpellProfile(a,mod,c,heroStats):null;
   const remCd=idx!=null?Math.max(0,CD[idx]||0):0;
   const slotCdTag=slotLocked?`🔒 Lv ${reqLv}`:a?(remCd>0?`⏳ ${remCd.toFixed(1)}s CD`:`R${mod.rank} · ${a.id==='whirlwind'?'Channel':prof.effCd.toFixed(1)+'s CD'}`):'Empty';
   return `<div class="spellActionSlot ${slotLocked?'locked':''}" ${!slotLocked&&a&&idx!=null?`data-spell-idx="${idx}"`:''}><div class="spellActionIcon">${slotLocked?'🔒':a?skillEmblem(a):'·'}</div><div><label>Key ${slot+1} · ${slotCdTag}</label><select data-loadout-slot="${slot}" aria-label="Skill slot ${slot+1}" ${slotLocked?'disabled':''}>${slotLocked?`<option>Unlocks Lv ${reqLv}</option>`:skillList.map((x,i)=>`<option value="${i}" ${idx===i?'selected':''} ${P.lv<(x.unlock||1)?'disabled':''}>${x.n}${P.lv<(x.unlock||1)?` (Lv ${x.unlock})`:''}</option>`).join('')}</select></div></div>`;
  }).join('');
  const renderSpellCard=(a,idx)=>{
   const unlocked=P.lv>=(a.unlock||1),equippedSlot=activeLoadout.indexOf(idx);
   const meta=skillDetails[a.id]||{role:'Spell',school:'destruction'};
   const sch=SPELL_SCHOOLS.find(s=>s.id===meta.school)||SPELL_SCHOOLS[0];
   const mod=sb?sb.getMod(a.id,c):{rank:0,rune:null,dmgMult:1,cdMult:1};
   const prof=effectiveSpellProfile(a,mod,c,heroStats);
   const remCd=Math.max(0,CD[idx]||0);
   const runes=(sb?.SPELL_RUNES?.[a.id])||[];
   const pips='■'.repeat(mod.rank)+'□'.repeat(Math.max(0,3-mod.rank));
   const rankLabel=mod.rank>=3?'RANK 3/3 · MAX':mod.rank>0?`RANK ${mod.rank}/3`:'RANK 0/3';
   const rankClass=mod.rank>=3?'maxed':mod.rank>0?'ranked':'';
   const cdValueText=a.id==='whirlwind'?'Channel · 20 Mana/s':`${prof.effCd.toFixed(1)}s CD${Math.abs(prof.effCd-a.cd)>.08?` (Base ${a.cd}s)`:''} · ${prof.mpCost} Mana`;
   const cdStateHtml=!unlocked?`<span class="spellCdState locked">🔒 Unlocks Lv ${a.unlock}</span>`:remCd>0?`<span class="spellCdState cooling">⏳ ${remCd.toFixed(1)}s left</span>`:`<span class="spellCdState ready">✓ Ready</span>`;
   const bonusText=mod.rank>0?`+${mod.rank*12}% Dmg · -${mod.rank*6}% CD`:'Unranked (+12% Dmg / -6% CD per rank)';
   const slotBtns=[0,1,2,3].filter(s=>s<skillCap).map(s=>`<button type="button" class="spellSlotBtn ${equippedSlot===s?'active':''}" data-equip-skill="${idx}:${s}" ${!unlocked?'disabled':''}>${equippedSlot===s?`✓ Key ${s+1}`:`Key ${s+1}`}</button>`).join('');
   return `<article class="spellBookCard ${equippedSlot>=0?'equipped':''} ${unlocked?'':'locked'}" data-spell-idx="${idx}" tabindex="0"><div class="spellCardHead"><div class="spellActionIcon">${unlocked?skillEmblem(a):'🔒'}</div><div><div class="spellTitleRow"><b>${a.n}</b><span class="schoolBadge" style="--school-color:${sch.color}">${sch.name}</span><span class="rankBadge ${rankClass}">${rankLabel}</span></div><span class="spellCardMeta">${meta.role} · Unlocks Lv ${a.unlock} · ${bonusText}</span></div><div class="talentRank"><span class="rankPips" aria-hidden="true">${pips}</span><button type="button" data-spell-down="${a.id}" ${mod.rank<1?'disabled':''}>-</button><button type="button" data-spell-up="${a.id}" ${!unlocked||sbAvail<1||mod.rank>=3?'disabled':''}>+</button></div></div><div class="spellStatsRow"><span class="spellCdTag">⏱ ${cdValueText}</span>${cdStateHtml}</div><p class="spellCardDesc">${a.desc}</p><div class="spellRuneRow">${runes.map(r=>`<button type="button" class="spellRuneBtn ${mod.rune===r.id?'active':''}" data-spell-rune="${a.id}:${r.id}" ${mod.rank<1?'disabled':''}><b>${mod.rune===r.id?'✦ ':''}${r.n}</b>${r.desc}</button>`).join('')}</div><div class="spellEquipBar"><small style="color:#9e8f7a">${unlocked?(equippedSlot>=0?`Equipped on Key ${equippedSlot+1}`:'Click a Key to equip'):`Unlocks at Level ${a.unlock}`}</small><div class="spellSlotBtns">${slotBtns}</div></div></article>`;
  };
  const schoolCounts=SPELL_SCHOOLS.map(s=>({...s,items:skillList.map((a,idx)=>({a,idx})).filter(x=>(skillDetails[x.a.id]?.school||'destruction')===s.id)}));
  const schoolFilters=`<div class="schoolFilterBar" role="tablist" aria-label="Filter spells by school"><button type="button" class="schoolFilterBtn ${selectedSchool==='all'?'active':''}" data-school-filter="all">All Schools (${skillList.length})</button>${schoolCounts.map(s=>`<button type="button" class="schoolFilterBtn ${selectedSchool===s.id?'active':''}" data-school-filter="${s.id}">${s.icon} ${s.name} (${s.items.length})</button>`).join('')}</div>`;
  const renderGrimoireBySchool=schoolCounts.filter(s=>(selectedSchool==='all'||selectedSchool===s.id)&&s.items.length>0).map(s=>`<div class="schoolGroup"><div class="schoolGroupHead" style="--school-color:${s.color}"><b>${s.icon} ${s.name} (${s.items.length})</b><small>${s.desc}</small></div><div class="spellBookGrid">${s.items.map(x=>renderSpellCard(x.a,x.idx)).join('')}</div></div>`).join('');
  const skillPage=skillTab==='skills'?`<div class="skillPage">
   <div class="skillSectionTitle"><h3>Active Action Bar (Keys 1–4)</h3><small>Slots unlock at Lv 1, 2, 4 &amp; 7 · Live rank &amp; cooldowns shown per slot</small></div>
   <div class="spellActionBar">${renderActionBar}</div>
   <div class="skillSectionTitle"><h3>Class Spell Grimoire by School</h3><small>${sbAvail} Spell Point${sbAvail===1?'':'s'} available (+1 every 2 levels · Rank 1 unlocks Spell Runes)</small></div>
   ${schoolFilters}
   ${renderGrimoireBySchool}
   <div id="dodTechSection" class="skillSectionTitle"><h3>Hero Techniques</h3><small>Combat Focus unlocks at Lv 3 · Evade Awakening at 12 kills</small></div>
   ${focusControls(c)}
   ${awakeningPage()}
   <div class="skillSectionTitle"><h3>Class Evolution Milestones</h3><small>Automatic passive upgrades unlocked at Levels 15, 25, 35 &amp; 45</small></div>
   <div class="milestoneStrip">${evos.map(ev=>`<div class="msCard ${P.lv>=ev.lv?'active':''}"><b>${P.lv>=ev.lv?'✦ ':'🔒 '}Lv ${ev.lv} · ${ev.name}</b><small>${ev.desc}</small></div>`).join('')}</div>
  </div>`:skillTab==='paragon'?`<div class="skillPage">
   <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border:1px solid #4a3a2d;border-radius:3px;background:#161113;font-variant-numeric:tabular-nums;flex-wrap:wrap;gap:8px">
    <div><b style="color:#ead08b">Paragon Level ${paragon.level}</b> <small style="color:#bfb097">· XP ${paragon.xp}/${pNeed} · Spent ${pSpent} · +1 every 5 levels from Lv 20</small></div>
    <b style="color:#ffd86b">${pAvail} pt${pAvail===1?'':'s'}</b>
   </div>
   <div class="milestoneStrip">${PARAGON_MILESTONES.map(ms=>`<div class="msCard ${pSpent>=ms.pts?'active':''}"><b>${pSpent>=ms.pts?'✦ ':'🔒 '}${ms.pts} pts · ${ms.name}</b><small>${ms.desc}</small></div>`).join('')}</div>
   <div class="talentList">${PARAGON_NODES.map(node=>{const rank=paragon.ranks[node.id]||0;return `<article class="talentCard"><div><b>${node.name}</b><small>${node.desc}</small></div><div class="talentRank"><span>${rank}/${node.max}</span><button data-paragon-down="${node.id}" ${rank<1?'disabled':''}>-</button><button data-paragon-up="${node.id}" ${pAvail<1||rank>=node.max?'disabled':''}>${rank>=node.max?'Max':'+'}</button></div></article>`}).join('')}</div>
  </div>`:`<div class="skillPage">
   <div class="loadoutBar">
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span style="font-size:12px;color:#bfb097">Loadout:</span><button data-loadout-profile="0" class="${curSlot===0?'active':''}">Build A</button><button data-loadout-profile="1" class="${curSlot===1?'active':''}">Build B</button></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${c==='warrior'?'<button data-preset-spec="whirlwind">Apply Whirlwind Spec</button><button data-preset-spec="bleed">Apply Bleed Spec</button>':'<button data-preset-spec="default">Apply Recommended Spec</button>'}</div>
   </div>
   <div class="branchTabs">${classBranches.map(b=>`<button class="branchTab ${b.id===selectedBranch?'active':''}" data-branch="${b.id}"><b>${b.icon} ${b.name} (${spentIn(b.id,c)})</b><small>${b.desc}</small></button>`).join('')}</div>
   ${tierGroups.map(tg=>{const list=branch.nodes.filter(tg.filter);return list.length?`<div class="talentTierGroup"><div class="talentTierHead">${tg.title}</div><div class="talentList">${list.map(renderNodeCard).join('')}</div></div>`:''}).join('')}
  </div>`;
  const clsLabel=()=>({pyromancer:'Pyromancer',rogue:'Shadow Rogue',warrior:'Warrior'}[c]||'Warrior');const masteryTag=c==='warrior'&&bm&&(bm.whirlwind.level>0||bm.bleed.level>0)?` · Spin ${bm.whirlwind.level} / Bleed ${bm.bleed.level}`:'';
  const ptLabel=skillTab==='paragon'?`${pAvail} paragon`:skillTab==='talents'?`${points} talent`:`${sbAvail} spell`;
  panel.innerHTML=`<header class="skillHeader"><div><h2>${clsLabel()} · Spell Book</h2><p>Browse abilities by school (Destruction, Restoration, Transmutation), inspect cooldowns, and invest Spell Points for Ranks &amp; Runes.</p></div><div class="skillPoints">${ptLabel}<small>Lv ${P.lv} · Spells ${sbSpent}/${sbEarned} · Talents ${spentAll(c)}/${earned()}${masteryTag}</small></div></header><nav class="skillTabs" aria-label="Spell Book, talents and paragon"><button data-skill-tab="skills" class="${skillTab==='skills'?'active':''}">Spell Book${sbAvail>0?` (${sbAvail})`:''}</button><button data-skill-tab="talents" class="${skillTab==='talents'?'active':''}">Talents${points>0?` (${points})`:''}</button><button data-skill-tab="paragon" class="${skillTab==='paragon'?'active':''}">Paragon (${pAvail})</button></nav>${skillPage}<footer class="talentFooter"><span class="muted">${skillTab==='skills'?'Rank spells with Spell Points to unlock 2 Runes per spell. Switch Runes and Action Bar Keys freely.':'Refund individual points (-) or swap Build A/B anytime for free.'}</span><div><button id="talentReset">${skillTab==='paragon'?'Reset Paragon':skillTab==='talents'?'Reset Talents':'Reset Spells'}</button> <button id="progClose">✕</button></div></footer>`;
  panel.querySelectorAll('[data-skill-tab]').forEach(b=>b.onclick=()=>{skillTab=b.dataset.skillTab;render()});
  panel.querySelectorAll('[data-school-filter]').forEach(b=>b.onclick=()=>{selectedSchool=b.dataset.schoolFilter;render()});
  if(panel.querySelector('[data-camera-mode]'))panel.querySelector('[data-camera-mode]').onclick=()=>{switchCamera();render()};
  panel.querySelectorAll('[data-combat-focus]').forEach(button=>button.onclick=()=>{
   const chosen=FOCUS_PATHS[c].find(path=>path.id===button.dataset.combatFocus);
   if(!chosen||P.lv<3)return;
   quest.combatFocus=chosen.id;save();render();
   banner(chosen.name+' specialization');
  });
  panel.querySelectorAll('[data-awakening]').forEach(button=>button.onclick=()=>{
   const path=awakeningPaths().find(entry=>entry.id===button.dataset.awakening);
   if(!path||quest.kills<AWAKENING_UNLOCK)return;
   quest.evadeAwakening=path.id;save();render();banner(path.name+' equipped');
  });
  panel.querySelectorAll('[data-spell-up]').forEach(b=>b.onclick=()=>{if(window.dodSpellBook?.setRank?.(c,b.dataset.spellUp,1)){save();render();renderSkillSlots()}});
  panel.querySelectorAll('[data-spell-down]').forEach(b=>b.onclick=()=>{if(window.dodSpellBook?.setRank?.(c,b.dataset.spellDown,-1)){save();render();renderSkillSlots()}});
  panel.querySelectorAll('[data-spell-rune]').forEach(b=>b.onclick=()=>{const [id,r]=b.dataset.spellRune.split(':');if(window.dodSpellBook?.setRune?.(c,id,r)){save();render();renderSkillSlots()}});
  panel.querySelectorAll('[data-equip-skill]').forEach(b=>b.onclick=()=>{
   const [idxStr,slotStr]=b.dataset.equipSkill.split(':'),next=+idxStr,slot=+slotStr;
   if(slot>=skillCap)return;
   if(window.dodSetClassLoadout){
    const prevPos=activeLoadout.indexOf(next);
    if(prevPos>=0&&prevPos!==slot){const curInSlot=activeLoadout[slot];activeLoadout[prevPos]=curInSlot??null}
    window.dodSetClassLoadout(c,slot,next);
   }else{abilityLoadout[slot]=next;normalizeLoadout();renderSkillSlots()}
   save();render();
  });
  panel.querySelectorAll('[data-loadout-slot]').forEach(sel=>sel.onchange=()=>{const slot=+sel.dataset.loadoutSlot,next=+sel.value;if(activeLoadout.some((v,i)=>i!==slot&&v===next)){const prevPos=activeLoadout.indexOf(next);if(prevPos>=0){activeLoadout[prevPos]=activeLoadout[slot]??null}}if(window.dodSetClassLoadout){window.dodSetClassLoadout(c,slot,next)}else{abilityLoadout[slot]=next;normalizeLoadout();renderSkillSlots()}save();render()});
  panel.querySelectorAll('[data-loadout-profile]').forEach(b=>b.onclick=()=>switchLoadout(c,+b.dataset.loadoutProfile||0));
  panel.querySelectorAll('[data-preset-spec]').forEach(b=>b.onclick=()=>applySmartPreset(c,b.dataset.presetSpec));
  panel.querySelectorAll('[data-branch]').forEach(b=>b.onclick=()=>{selectedBranch=b.dataset.branch;render()});
  panel.querySelectorAll('[data-paragon-up]').forEach(b=>b.onclick=()=>{const id=b.dataset.paragonUp,node=PARAGON_NODES.find(x=>x.id===id);if(!node||paragonAvail()<1||(paragon.ranks[id]||0)>=node.max)return;paragon.ranks[id]=(paragon.ranks[id]||0)+1;save();render();renderInv?.()});
  panel.querySelectorAll('[data-paragon-down]').forEach(b=>b.onclick=()=>{const id=b.dataset.paragonDown;if((paragon.ranks[id]||0)<1)return;paragon.ranks[id]--;save();render();renderInv?.()});
  panel.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{const [branchId,nodeId]=b.dataset.up.split(':');const node=classBranches.find(x=>x.id===branchId)?.nodes.find(n=>n.id===nodeId);if(!node||available(c)<1||spentIn(branchId,c)<node.gate||P.lv<(node.level||1)||(node.excludes&&classRanks[branchId][node.excludes])||classRanks[branchId][node.id]>=node.max)return;classRanks[branchId][nodeId]++;save();render();renderInv?.()});
  panel.querySelectorAll('[data-down]').forEach(b=>b.onclick=()=>{const [branchId,nodeId]=b.dataset.down.split(':');if(!canRefundNode(c,branchId,nodeId))return;classRanks[branchId][nodeId]--;save();render();renderInv?.()});
  panel.querySelector('#talentReset').onclick=()=>{if(skillTab==='paragon'){paragon.ranks=emptyParagon().ranks}else if(skillTab==='talents'){allRanks[c]=emptyFor(c)}else{window.dodSpellBook?.reset?.(c)}save();render();renderInv?.();renderSkillSlots()};panel.querySelector('#progClose').onclick=()=>{hideSpellTip();panel.style.display='none'};refreshQuick();
  const showSpellTip=(idx,x,y)=>{
   const a=skillList[idx];if(!a||panel.style.display!=='block'||skillTab!=='skills'){hideSpellTip();return}
   const mod=sb?sb.getMod(a.id,c):{rank:0,rune:null,dmgMult:1,cdMult:1};
   spellTip.innerHTML=buildSpellTooltipHtml(a,idx,mod,c,heroStats);
   spellTip.style.display='block';
   spellTip.setAttribute('aria-hidden','false');
   positionSpellTip(x,y);
  };
  if(skillTab!=='skills')hideSpellTip();
  panel.querySelectorAll('[data-spell-idx]').forEach(el=>{
   const idx=+el.dataset.spellIdx;
   el.addEventListener('mouseenter',e=>showSpellTip(idx,e.clientX,e.clientY));
   el.addEventListener('mousemove',e=>{if(spellTip.style.display==='block')positionSpellTip(e.clientX,e.clientY)});
   el.addEventListener('mouseleave',()=>hideSpellTip());
   el.addEventListener('focusin',()=>{const r=el.getBoundingClientRect();showSpellTip(idx,r.right,r.top+14)});
   el.addEventListener('focusout',e=>{if(!el.contains(e.relatedTarget))hideSpellTip()});
  });
 }

 const hideSpellTip=()=>{spellTip.style.display='none';spellTip.setAttribute('aria-hidden','true')};
 const positionSpellTip=(cx,cy)=>{
  const pad=12,w=spellTip.offsetWidth||330,h=spellTip.offsetHeight||280;
  let left=cx+16,top=cy+14;
  if(left+w+pad>innerWidth)left=Math.max(pad,cx-w-16);
  if(top+h+pad>innerHeight)top=Math.max(pad,innerHeight-h-pad);
  spellTip.style.left=left+'px';spellTip.style.top=top+'px';
 };
 panel.addEventListener('scroll',hideSpellTip);
 panel.addEventListener('mouseleave',hideSpellTip);
 const togglePanel=()=>{panel.style.display=panel.style.display==='block'?'none':'block';if(panel.style.display==='block')render();else hideSpellTip()};
 btn.onclick=togglePanel;quick.onclick=togglePanel;
 document.addEventListener('keydown',e=>{const tag=document.activeElement?.tagName;if(e.key.toLowerCase()==='k'&&!e.repeat&&tag!=='INPUT'&&tag!=='TEXTAREA'){e.preventDefault();togglePanel()}if(e.key==='Escape'){panel.style.display='none';hideSpellTip()}});
 window.dodProgression={resetTestTalents:c=>{if(window.dodIsAdmin){allRanks[c]=emptyFor(c);paragon=emptyParagon();window.dodSpellBook?.reset?.(c);persist();refreshQuick()}},applyWhirlPreset:(level,build='whirlwind')=>{allRanks.warrior=emptyFor('warrior');const wr=allRanks.warrior,wb=WARRIOR_BRANCHES;if(build==='bleed'){const plan=level===10?[['reaver','siphon',4],['reaver','bloodied',4],['reaver','rend',1]]:level===30?[['reaver','siphon',4],['reaver','bloodied',4],['reaver','rend',5],['reaver','bloodspread',3],['reaver','cull',5],['reaver','bloodtempo',5],['reaver','feast',3]]:[['reaver','siphon',5],['reaver','bloodied',5],['reaver','rend',5],['reaver','bloodspread',3],['reaver','cull',5],['reaver','bloodtempo',5],['reaver','rupture',1],['reaver','feast',5],['reaver','execution',5],['reaver','reaper',1],['guardian','vitality',5],['weapon','edge',4]];let budget=Math.min(49,level-1);for(const [branch,id,count]of plan){const node=wb.find(b=>b.id===branch).nodes.find(n=>n.id===id);for(let i=0;i<count&&budget>0;i++){if(spentIn(branch,'warrior')<node.gate||level<(node.level||1)||wr[branch][id]>=node.max)break;wr[branch][id]++;budget--}}persist();refreshQuick();return earned()-available('warrior')}const plan=level===10?[['weapon','stormreach',5],['weapon','edge',3],['weapon','whirlwind',1]]:level===30?[['weapon','stormreach',5],['weapon','edge',5],['weapon','whirlwind',5],['weapon','stormrhythm',5],['weapon','tempest',3],['weapon','precision',5],['weapon','momentum',1]]:[['weapon','stormreach',5],['weapon','edge',5],['weapon','whirlwind',5],['weapon','stormrhythm',5],['weapon','tempest',3],['weapon','precision',5],['weapon','momentum',5],['weapon','stormburst',1],['weapon','warbreaker',1],['guardian','vitality',5],['guardian','iron',5],['reaver','siphon',4]];let budget=Math.min(49,level-1);for(const [branch,id,count]of plan){const node=wb.find(b=>b.id===branch).nodes.find(n=>n.id===id);for(let i=0;i<count&&budget>0;i++){if(spentIn(branch,'warrior')<node.gate||level<(node.level||1)||wr[branch][id]>=node.max)break;wr[branch][id]++;budget--}}persist();refreshQuick();return earned()-available('warrior')},applyEndgamePreset:(c=cls())=>{if(c==='warrior')return window.dodProgression.applyWhirlPreset(50,'whirlwind');allRanks[c]=emptyFor(c);const cr=allRanks[c],branches=getBranches(c);const plan=c==='pyromancer'?[['pyromancy','emberbolt',5],['pyromancy','wildfire',5],['pyromancy','nova_reach',5],['pyromancy','cinder_burst',3],['pyromancy','solar_flare',1],['arcana','spellcraft',5],['arcana','mana_flow',5],['arcana','spell_crit',5],['arcana','quicken',5],['arcana','archmage',1],['cataclysm','stormcall',5],['cataclysm','frost_shield',4]]:[['assassination','lethal_edge',5],['assassination','twin_mastery',5],['assassination','serrated',5],['assassination','ambush',5],['assassination','executioner',1],['shadowcraft','evasion',5],['shadowcraft','fleeting',5],['shadowcraft','shadow_veil',5],['shadowcraft','vampiric',5],['shadowcraft','night_cloak',1],['bladedance','fan_volley',5],['bladedance','piercing_steel',3]];let budget=49;for(const [branch,id,count]of plan){const node=branches.find(b=>b.id===branch)?.nodes.find(n=>n.id===id);if(!node)continue;for(let i=0;i<count&&budget>0;i++){if(spentIn(branch,c)<node.gate||50<(node.level||1)||cr[branch][id]>=node.max)break;cr[branch][id]++;budget--}}persist();refreshQuick();return spentAll(c)},getTier:()=>legacyTier,setTier:(t)=>{legacyTier=Math.max(1,Math.min(5,Math.floor(+t||1)));persist()},getTalents:()=>JSON.parse(JSON.stringify(allRanks[cls()]||allRanks.warrior)),getClassTalents:(c=cls())=>JSON.parse(JSON.stringify(allRanks[c]||allRanks.warrior)),open:(tab)=>{if(tab==='talents'||tab==='paragon')skillTab=tab;else skillTab='skills';panel.style.display='block';render();if(tab==='awakening')setTimeout(()=>panel.querySelector('#dodTechSection')?.scrollIntoView({behavior:'smooth',block:'start'}),20)}};
})();;
