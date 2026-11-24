'use strict';
const $=i=>document.getElementById(i),cv=$('c'),g=cv.getContext('2d'),mm=$('mm').getContext('2d');
let W,H;const rs=()=>{W=cv.width=innerWidth;H=cv.height=innerHeight};addEventListener('resize',rs);rs();
const R=(a,b)=>a===undefined?Math.random():b===undefined?Math.random()*a:a+Math.random()*(b-a),RI=(a,b)=>Math.floor(R(a,b+1)),D=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const N=56,TS=40,mk=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const SL=['Weapon','Head','Chest','Ring','Amulet','Leggings','Gloves','Feet','Off-hand'],IC=['⚔️','⛑️','🛡️','💍','📿','🦵','🧤','🥾','🛡️'];
const NM=[['Sword','Axe','Mace','Staff','Wand','Dagger'],['Helmet','Head Armor','Circlet'],['Chest Armor','Chestplate','Vestments'],['Ring','Signet'],['Amulet','Talisman'],['Leggings'],['Gloves','Gauntlets'],['Boots','Greaves'],['Shield','Focus Orb']];
const POOL=[[],['a','sta'],['a','sta'],['str','crit','leech'],['sta','leech'],['a','sta'],['a','sta'],['a','sta'],['a','sta']];
const PRE=['Sharp','Dark','Bloodied','Ancient','Glowing','Cursed'],SUF=['of Strength','of Shadows','of Fire','of the Wolf','of the King','of Graves'];
const LEG=['Nightblade','Soulreaver','Dragonheart','Executioner’s Crown','Ashen Oath','Wraithgrip'];
const LEGENDARIES=[
 {"id":"stormglass_staff","s":0,"n":"Stormglass · Staff","icon":"⚡","weaponType":"Staff","weaponClass":"pyromancer","handed":"two","st":{"dMin":17,"dMax":25,"sp":13,"cdr":3},"power":"While Storm Halo is active, direct hits on Shocked foes extend it by 0.25 seconds, up to 1.5 seconds. Evolved Storm Relay pulls nearby foes into its final blast."},
 {"id":"glassfang","s":0,"n":"Glassfang · Dagger","icon":"🗡️","weaponType":"Dagger","weaponClass":"rogue","handed":"one","st":{"dMin":16,"dMax":24,"haste":5,"crit":2},"power":"Direct hits against Slowed foes deal 25% more damage, including foes caught in Shadow Caltrops."},
 {"id":"slipstream_boots","s":7,"n":"Slipstream · Boots","icon":"🥾","st":{"a":5,"s":8,"cdr":2},"power":"Evade grants 22% more movement speed for 1.8 seconds."},
 {"id":"coalheart_ring","s":3,"n":"Coalheart · Ring","icon":"💍","st":{"crit":3,"sta":4},"power":"Killing an elite restores 20% of your maximum mana."},
 {id:'stormcleaver',s:0,n:'Stormcleaver · Two-Handed Sword',weaponType:'Sword',handed:'two',icon:'⚔️',st:{dMin:20,dMax:28},desc:'A whirlwind-forged blade. Scales with item level.',power:'Tempest Orbit: your kill-spawned Whirlwind vortices follow you. Requires Tempest Seeds talent.'},
 {id:'magma_axe',s:0,n:'Two-Handed Axe · Volcanic Breaker',icon:'🪓',st:{dMin:34,dMax:46},desc:'Two-handed axe · 18% chance on hit to trigger Bladestorm.',power:'Bladestorm: spin for 2 seconds, striking nearby enemies with 100% critical chance.'},
 {id:'blackfang_main',s:0,n:'Blackfang · One-Handed Sword',icon:'⚔️',weaponType:'Sword',handed:'one',st:{dMin:24,dMax:32,str:5,crit:4},desc:'Legendary main-hand blade. Pair it with its off-hand twin.',power:'Blood Echo: every third autoattack strikes again.'},
 {id:'blackfang_off',s:8,n:'Blackfang · One-Handed Sword · Off-Hand',icon:'⚔️',weaponType:'Sword',handed:'one',offhandType:'weapon',st:{dMin:18,dMax:25,str:4,crit:3},desc:'The left-hand twin of Blackfang.',power:'Blood Echo: equip with Blackfang to make every third autoattack strike again.'},
 {id:'wardens_oath',s:0,n:'Warden’s Oath · One-Handed Mace',icon:'🔨',weaponType:'Mace',handed:'one',st:{dMin:22,dMax:30,str:5,sta:8},desc:'A rune-forged mace made to hold the line.',power:'Last Bastion: Shield Bash grants a short protective guard.'},
 {id:'wardens_aegis',s:8,n:'Warden’s Aegis · Shield',icon:'🛡️',offhandType:'shield',st:{a:14,sta:16},desc:'A frost-blue shield bound to Warden’s Oath.',power:'Last Bastion: wield beside Warden’s Oath to empower Shield Bash.'},
 {id:'bloodletter',s:0,n:'Bloodletter · Two-Handed Axe',weaponType:'Axe',handed:'two',icon:'🪓',st:{dMin:20,dMax:27},desc:'A hungry axe that turns every wound into a deeper cut.',power:'Hemorrhage: Rend bleeds tick 25% faster and last 1 second longer.'},
 {id:'tempest_loop',s:3,n:'Tempest Loop · Ring',icon:'💍',st:{crit:2,haste:3},desc:'A ring caught in an endless storm.',power:'Cyclone: Whirlwind spins 15% faster and deals 10% more damage.'},
 {id:'dawn_crown',s:1,n:'Crown of Dawn · Helmet',icon:'👑',st:{a:10,sta:12,crit:2},desc:'A radiant helm forged for the last stand.',power:'Starwarden: below 30% HP, gain 2.5s invulnerability (30s cooldown).'},
 {id:'worldplate',s:2,n:'Worldplate · Chest Armor',icon:'🛡️',st:{a:18,sta:18},desc:'Unbreakable obsidian plate from the deep vaults.',power:'Bulwark: reduces all incoming damage by 8%.'},
 {id:'frostvein_greaves',s:7,n:'Frostvein Greaves · Boots',icon:'🥾',st:{a:6,s:12,dodge:4},desc:'Rime-kissed greaves that chill the dungeon floor.',power:'Permafrost Step: periodically unleashes a frost wave slowing nearby foes.'},
 {id:'ashen_gauntlets',s:6,n:'Ashen Gauntlets · Gloves',icon:'🧤',st:{a:7,haste:5,critDmg:14},desc:'Cinder-lined gauntlets pulsing with ember heat.',power:'Emberbrand: critical hits sear enemies for bonus AoE fire damage.'},
 {id:'soulbinder_pendant',s:4,n:'Soulbinder Pendant · Amulet',icon:'📿',st:{leech:2.5,cdr:5,sta:10},desc:'A crimson talisman that drinks vanquished souls.',power:'Soul Harvest: every 5th kill restores 15% Health and 20% Mana.'},
 {id:'doomhammer',s:0,n:'Doomhammer · Two-Handed Mace',weaponType:'Mace',handed:'two',icon:'🔨',st:{dMin:28,dMax:39,str:6},desc:'A colossal warhammer of cracked basalt.',power:'Seismic Echo: critical hits trigger an earthshock dealing 40% AoE damage.'},
 {id:'cinderstaff',s:0,n:'Cinderheart · Two-Handed Staff',weaponType:'Staff',handed:'two',weaponClass:'pyromancer',icon:'🪄',st:{dMin:18,dMax:26,sp:18,crit:3,cdr:6},desc:'A charred archstaff bound to living phoenix embers.',power:'Ember Echo: spells Ignite foes and launch bonus cinder sparks on crit.'},
 {id:'pyre_wand',s:0,n:'Pyrelight · Arcane Wand',weaponType:'Wand',handed:'one',weaponClass:'pyromancer',icon:'✨',st:{dMin:13,dMax:19,sp:14,haste:5,mregen:3},desc:'A crystalline wand humming with accelerated mana.',power:'Wildfire Surge: Ignite burns deal 35% more damage and restore 2 Mana.'},
 {id:'astral_orb',s:8,n:'Astral Focus · Relic Orb',offhandType:'orb',weaponClass:'pyromancer',icon:'🔮',st:{a:6,sp:15,cdr:7,sta:10},desc:'A floating sphere of compressed starfire.',power:'Astral Conduit: reduces Flame Nova and Meteor Rain cooldowns by 20%.'},
 {id:'ember_circlet',s:1,n:'Emberweave Circlet · Crown',set:'Emberweaver Regalia',icon:'👑',st:{a:8,sp:12,crit:3,sta:10},desc:'Gold-filigreed crown worn by pyromancers of the high spire.',power:'Pyre Focus: Spell critical hits Shock nearby enemies (+18% damage taken).'},
 {id:'ember_vestments',s:2,n:'Emberweave Robe · Chest Armor',set:'Emberweaver Regalia',icon:'👘',st:{a:14,sp:16,mregen:3,sta:14},desc:'Runic mantle woven from ash-silk and ember thread.',power:'Arcane Ward: gain +15% Spell Power while above 60% Mana.'},
 {id:'nightstalker_dirk',s:0,n:'Nightstalker · Twin-Edge Dagger',weaponType:'Dagger',handed:'one',weaponClass:'rogue',icon:'🗡️',st:{dMin:19,dMax:26,crit:4,critDmg:16,haste:5},desc:'A whisper-thin shadowsteel dirk.',power:'Hemorrhage Edge: critical strikes vs bleeding foes deal +25% shadow damage.'},
 {id:'venomtooth_off',s:8,n:'Venomtooth · Off-Hand Dagger',weaponType:'Dagger',handed:'one',offhandType:'weapon',weaponClass:'rogue',icon:'🗡️',st:{dMin:15,dMax:21,crit:3,bleed:18,haste:4},desc:'A jagged parrying blade coated in abyssal toxin.',power:'Viper Fang: attacks against chilled or bleeding foes grant +10% Dodge for 2s.'},
 {id:'nightstalker_cowl',s:1,n:'Nightstalker Cowl · Hood',set:'Nightstalker Shroud',icon:'🥷',st:{a:9,dodge:4,crit:3,sta:10},desc:'A darkened cowl that drinks lantern light.',power:'Shadow Reflex: dodging an attack reduces active skill cooldowns by 1s.'},
 {id:'nightstalker_garb',s:2,n:'Nightstalker Shroud · Jerkin',set:'Nightstalker Shroud',icon:'🦺',st:{a:15,dodge:5,critDmg:14,haste:4},desc:'Supple obsidian leather stitched for silent slaughter.',power:'Assassin Tempo: Fan of Knives fires +2 extra piercing blades.'},
 {id:'ember_signet',s:3,n:'Cindercoil · Signet Ring',icon:'💍',st:{crit:3,critDmg:14,cdr:4},desc:'A volcanic band etched with storm-ember runes.',power:'Embercoil: every 4th critical hit Ignites and Shocks nearby foes.'},
 {id:'ironheart_plate',s:2,n:'Ironheart Bastion · Chest Armor',icon:'🛡️',st:{a:20,sta:16,str:5},desc:'Heavy siege plate bound with unyielding wards.',power:'Ironheart: below 45% HP, gain Fortify (-22% damage taken for 2.5s, 20s cd). Evolved Faultline grants 1 second of Fortify when its second impact hits.'},
 {id:'frostfang_boots',s:7,n:'Riftstrider · Greaves',icon:'🥾',st:{a:8,s:18,haste:5,dodge:4},desc:'Quicksilver greaves tuned for rapid engagements.',power:'Phase Stride: casting any skill grants +10% Move Speed and +8% Haste for 3s.'}];
const GEM_FAMILIES=[
 {family:'ruby',baseName:'Ruby',icon:'♦️',color:'#ff6868',tiers:[{tier:1,id:'ruby',prefix:'Flawed',st:{str:6,sp:8}},{tier:2,id:'ruby_2',prefix:'Radiant',st:{str:11,sp:15}},{tier:3,id:'ruby_3',prefix:'Abyssal',st:{str:18,sp:24}}]},
 {family:'emerald',baseName:'Emerald',icon:'💚',color:'#62ed88',tiers:[{tier:1,id:'emerald',prefix:'Flawed',st:{crit:2.5,critDmg:12}},{tier:2,id:'emerald_2',prefix:'Radiant',st:{crit:4.5,critDmg:22}},{tier:3,id:'emerald_3',prefix:'Abyssal',st:{crit:7.5,critDmg:36}}]},
 {family:'sapphire',baseName:'Sapphire',icon:'🔷',color:'#65bdff',tiers:[{tier:1,id:'sapphire',prefix:'Flawed',st:{cdr:4,mregen:2.5}},{tier:2,id:'sapphire_2',prefix:'Radiant',st:{cdr:7,mregen:4.5}},{tier:3,id:'sapphire_3',prefix:'Abyssal',st:{cdr:11,mregen:7.5}}]},
 {family:'amethyst',baseName:'Amethyst',icon:'🔮',color:'#d18cff',tiers:[{tier:1,id:'amethyst',prefix:'Flawed',st:{leech:1.5,sta:8}},{tier:2,id:'amethyst_2',prefix:'Radiant',st:{leech:2.6,sta:15}},{tier:3,id:'amethyst_3',prefix:'Abyssal',st:{leech:4.2,sta:24}}]},
 {family:'topaz',baseName:'Topaz',icon:'🌟',color:'#ffd54a',tiers:[{tier:1,id:'topaz',prefix:'Flawed',st:{haste:4,dodge:2}},{tier:2,id:'topaz_2',prefix:'Radiant',st:{haste:7.5,dodge:3.6}},{tier:3,id:'topaz_3',prefix:'Abyssal',st:{haste:12,dodge:6}}]}
];
const GEMS={};
for(const fam of GEM_FAMILIES){
 for(const t of fam.tiers){
  const label=t.tier===1?fam.baseName:`${t.prefix} ${fam.baseName}`;
  GEMS[t.id]={id:t.id,family:fam.family,tier:t.tier,n:label,baseName:fam.baseName,icon:fam.icon,color:fam.color,st:t.st};
 }
}
const rollGemDrop=(depth=1,tier=1,src=null)=>{
 const fam=GEM_FAMILIES[RI(0,GEM_FAMILIES.length-1)];
 const riftTier=window.dodRift?.isActive?.()?(window.dodRift?.getState?.()?.tier||1):0;
 const canT3=src?.uber||(src?.riftGuardian&&riftTier>=6)||riftTier>=10||depth>=32||tier>=5;
 const canT2=canT3||depth>=14||riftTier>=2||tier>=3||Boolean(window.dodProgressionV2?.state?.actsCleared?.act2);
 let t=1;
 if(canT3&&Math.random()<(src?.uber?.42:riftTier>=13?.38:src?.riftGuardian?.24:.14))t=3;
 else if(canT2&&Math.random()<(src?.boss||src?.t==='bs'?.45:riftTier>=6?.42:.26))t=2;
 return fam.tiers[t-1].id;
};
let dodGems=Object.fromEntries(Object.keys(GEMS).map(k=>[k,k==='ruby'||k==='emerald'?1:0])),dodAspects=[],dodLootFilter='off',dodAbyssFragments=0;
try{const g0=JSON.parse(localStorage.getItem('dodGemsV1')||'null');if(g0&&typeof g0==='object')dodGems=Object.assign(dodGems,g0)}catch(e){}
try{const a0=JSON.parse(localStorage.getItem('dodAspectsV1')||'null');if(Array.isArray(a0))dodAspects=a0}catch(e){}
try{const f0=localStorage.getItem('dodLootFilterV1');if(['off','common','magic'].includes(f0))dodLootFilter=f0}catch(e){}
try{dodAbyssFragments=Math.max(0,Math.floor(Number(localStorage.getItem('dodFragmentsV1')||0)))}catch(e){}

const RAR=[['Common','#b8b8b8'],['Magic','#62a8ff'],['Epic','#bd78df'],['Legendary','#e89b45'],['Mythic','#d67bff']];
const SN={d:'Damage',a:'Armor',h:'Health',sta:'Stamina',crit:'Crit',c:'Crit',s:'Speed',dodge:'Dodge',leech:'Leech',l:'Leech',m:'Mana',str:'Strength',sp:'Spell Power',haste:'Haste',cdr:'Cooldown',critDmg:'Crit Dmg',bleed:'Bleed',mregen:'Mana/s'},PC={crit:1,c:1,dodge:1,s:1,leech:1,l:1,haste:1,cdr:1,critDmg:1,bleed:1},SC={a:[2,0.32],sta:[2,0.45],crit:[1,.12],leech:[.5,.045],str:[1,.22]};
const WT={dMin:1,dMax:1,a:1.5,sta:.45,h:.5,c:3,crit:3,dodge:3,s:3,l:4,leech:4,m:.5,str:2,sp:2.6,haste:3,cdr:3,critDmg:2.5,bleed:2.5,mregen:2},sc=it=>{if(!it)return 0;let total=Object.keys(it.st||{}).reduce((a,k)=>a+(+it.st[k]||0)*(WT[k]||0),0);if(Array.isArray(it.sockets))for(const gid of it.sockets){const g=GEMS[gid];if(g)for(const k in g.st)total+=(+g.st[k]||0)*(WT[k]||0)}if(it.mythic||it.r===4)total+=95;else if(it.unique||it.imprintedAspect)total+=45;if(it.corrupted)total+=25;return total};
// All item slots carry reduced, level-scaled Strength; each unique rolls 3–4 standard bonus stats.
const lootItemLevel=()=>Math.max(1,Math.min(999,Math.floor(Math.max(P.lv,fl*1.05))));
function makeLegendary(base,level=lootItemLevel()){const lv=Math.max(1,Math.floor(level||1)),tier=1.36,st={...(base.st||{})},weapon=base.s===0||base.offhandType==='weapon',off=base.offhandType==='weapon',isPyro=(window.dodHeroClass||'warrior')==='pyromancer';if(weapon){const baseMin=(off?4:5)+(off?.48:.62)*lv;st.dMin=Math.max(1,Math.round(baseMin*tier*1.22));st.dMax=Math.max(st.dMin+1,Math.round((baseMin+(off?1.7:2)+lv*.12)*tier*1.22))}else if(st.a){st.a=Math.max(st.a,Math.round((2+lv*.34)*tier))}if(st.sp||isPyro){st.sp=Math.max(st.sp||0,Math.round((base.st?.sp||6)+lv*.65))}if(!isPyro){st.str=Math.max(st.str||0,Math.round((.5+lv*.08)*tier))}else{delete st.str}st.sta=Math.max(st.sta||0,Math.round((1+lv*.18)*tier));if(Math.random()<.55)st.crit=+((st.crit||0)+ +R(.4,1.6).toFixed(1)).toFixed(1);if(Math.random()<.45)st.leech=+((st.leech||0)+ +R(.25,.95).toFixed(2)).toFixed(2);const maxSockets=(base.s===0||base.s===2||base.s===1||base.s===5)?(Math.random()<.45?2:1):0;return {...base,r:3,st,maxSockets,sockets:[],aspectId:base.id,weaponType:weapon?(base.weaponType||(/axe/i.test(base.n||'')?'Axe':/mace|hammer/i.test(base.n||'')?'Mace':/staff/i.test(base.n||'')?'Staff':/wand/i.test(base.n||'')?'Wand':/dagger|dirk|fang/i.test(base.n||'')?'Dagger':'Sword')):base.weaponType,handed:weapon?(base.handed||(/two-handed|great|breaker|staff/i.test((base.desc||'')+' '+(base.n||''))?'two':'one')):base.handed,unique:true,uniqueWeaponBuff:weapon?1:undefined,itemLevel:lv,rollId:Math.random().toString(36).slice(2,8)}};
const MYTHIC_IMPLICITS=[{k:'critDmg',v:14,label:'+14% Crit Damage'},{k:'cdr',v:6,label:'+6% Cooldown Reduction'},{k:'leech',v:1.2,label:'+1.2% Life Leech'},{k:'haste',v:8,label:'+8% Attack Haste'},{k:'s',v:10,label:'+10% Move Speed'}];
function makeMythic(base,level=lootItemLevel()){
 const leg=base&&base.r===3?JSON.parse(JSON.stringify(base)):makeLegendary(base,level);
 const st={...(leg.st||{})};
 for(const k in st){
  const v=Number(st[k])||0;if(!v)continue;
  if(['crit','leech','cdr','haste','mregen'].includes(k))st[k]=+((v*1.22).toFixed(2));
  else st[k]=Math.max(1,Math.round(v*1.24));
 }
 const imp=MYTHIC_IMPLICITS[RI(0,MYTHIC_IMPLICITS.length-1)];
 st[imp.k]=+((Number(st[imp.k])||0)+imp.v).toFixed(2);
 const maxSockets=[0,1,2,5].includes(leg.s)?2:1;
 const cleanName=String(leg.n||'Relic').replace(/^Mythic\s+/,'');
 return {...leg,r:4,n:'Mythic '+cleanName,st,maxSockets:Math.max(maxSockets,Number(leg.maxSockets)||0),sockets:Array.isArray(leg.sockets)?leg.sockets:[],unique:true,mythic:true,mythicImplicit:imp.label,itemLevel:Math.max(Number(leg.itemLevel)||1,Math.floor(level||1))};
}
const lootThemeOf=mob=>{if(!mob)return null;const themes={bulwark:{name:'Bulwark Guard',stats:['a','sta','dodge','mregen']},ravager:{name:'Ravager Hunt',stats:['haste','crit','dodge','cdr']},hexer:{name:'Hexer Circle',stats:['cdr','mregen','critDmg','sp']},crusher:{name:'Crusher Crew',stats:['bleed','critDmg','a','sta']}};return mob.eliteType&&themes[mob.eliteType]|| (mob.t==='bs'?{name:'Boss Trophy',stats:['critDmg','bleed','cdr','leech','sp']}:mob.t==='nc'?{name:'Cultist Grimoire',stats:['sp','cdr','mregen','crit']}:mob.t==='pb'?{name:'Plague Satchel',stats:['dodge','haste','bleed','leech']}:mob.t==='dk'?{name:'Dread Armory',stats:['a','str','critDmg','sta']}:mob.t==='ar'?{name:'Bone Archer Cache',stats:['crit','haste','cdr','dodge']}:mob.t==='zb'?{name:'Undead Beast Cache',stats:['a','sta','leech','str']}:mob.t==='sk'?{name:'Skeleton Cache',stats:['crit','haste','mregen','bleed']}:null)};
const LEGENDARY_DEPTH=12;
function applyLootTheme(item,mob){const theme=lootThemeOf(mob);if(theme&&item.r>0)item.lootTheme=theme.name;return item}function mkItem(f,b=0,source=null){
 const heroCls=window.dodHeroClass||'warrior',isPyro=heroCls==='pyromancer',themeStats=(lootThemeOf(source)?.stats||[]).filter(k=>isPyro?(k!=='str'&&k!=='bleed'):k!=='sp'),itemLevel=(window.dodIsAdmin&&source?.testLevel)||Math.max(lootItemLevel(),source?.lootLevel||1),bias=Math.max(0,+b||0)+(window.dodParagonMagicFind||0)+(window.dodActBlessing?.().mf||0),isBossSrc=!!(source&&(source.t==='bs'||source.boss));
 const endBoost=itemLevel>=22?1+Math.min(.36,(itemLevel-21)*.014):1;
 const canRollLegs=f>=LEGENDARY_DEPTH||best>=LEGENDARY_DEPTH||!!source?.uber||!!source?.riftGuardian;
 const canRollSets=f>=13||best>=13||itemLevel>=13||!!source?.uber||!!source?.riftGuardian;
 const legendaryChance=!canRollLegs?0:(isBossSrc?(.07+Math.min(.18,itemLevel*.004)+bias*.055):(itemLevel>=5?(.008+Math.min(.042,itemLevel*.0009)+bias*.035):0));
 const mythicBonus=typeof window.dodRiftMythicWeight==='function'?Number(window.dodRiftMythicWeight())||0:Number(window.dodRiftMythicWeight||0);
 const mythicChance=(f>=30||best>=30||source?.uber||source?.riftGuardian)?Math.min(.52,(source?.uber?(source.n?.includes('Sovereign')?.55:.35):source?.riftGuardian?.18:isBossSrc?.11:.045)+bias*.08+mythicBonus):0;
 if((source?.lootSlot===undefined||source?.gamble)&&Math.random()<legendaryChance){const classPool=LEGENDARIES.filter(u=>(canRollSets||!u.set)&&(u.weaponClass===heroCls||(!u.weaponClass&&(u.set==='Emberweaver Regalia'?heroCls==='pyromancer':u.set==='Nightstalker Shroud'?heroCls==='rogue':(heroCls==='warrior'||(u.s!==0&&u.s!==8))))));const pool=source?.gamble?classPool.filter(it=>it.s===source.lootSlot):classPool;if(pool.length){const baseLeg=pool[RI(0,pool.length-1)];const itemOut=Math.random()<mythicChance?makeMythic(baseLeg,itemLevel):makeLegendary(baseLeg,itemLevel);if(endBoost>1&&itemOut.st){if(itemOut.st.dMin)itemOut.st.dMin=Math.round(itemOut.st.dMin*endBoost);if(itemOut.st.dMax)itemOut.st.dMax=Math.round(itemOut.st.dMax*endBoost);if(itemOut.st.a)itemOut.st.a=Math.round(itemOut.st.a*endBoost);if(itemOut.st.sp)itemOut.st.sp=Math.round(itemOut.st.sp*endBoost)}return applyLootTheme(itemOut,source)}}
 const roll=Math.random();let r=itemLevel>=18?(roll<Math.min(.40,.14+bias*.18)?2:roll<Math.min(.80,.46+bias*.24)?1:0):itemLevel>=7?(roll<Math.min(.26,.06+bias*.15)?2:roll<Math.min(.68,.30+bias*.24)?1:0):(roll<Math.min(.10,.02+bias*.08)?2:roll<Math.min(.44,.12+bias*.22)?1:0);
 if(isBossSrc&&itemLevel>=3&&r<1)r=1;else if(source?.el&&itemLevel>=4&&r<1&&Math.random()<.68)r=1;
 r=Math.min(f<=5&&!isBossSrc&&!source?.minRarity?1:2,Math.max(r,source?.minRarity||0));
 if(window.dodIsAdmin&&[1,2].includes(source?.testRarity))r=source.testRarity;
 const s=source?.lootSlot??RI(0,8),st={},tier=(r===2?1.32:r===1?1.15:1)*endBoost;
 let weaponType=null,handed=null,offhandType=null;
 const earlyGame=f<6&&itemLevel<6;
 const mods=[],rollBonus=allowed=>{const filtered=earlyGame?allowed.filter(k=>['sta','str','sp','crit','dodge','mregen'].includes(k)):allowed;const pool=[...(filtered.length?filtered:allowed)],count=r===0?0:r===1?1:(itemLevel>=14?3:2);for(let i=0;i<Math.min(count,pool.length);i++){let ix=-1;if(themeStats.length&&Math.random()<.65){const options=pool.map((k,j)=>themeStats.includes(k)?j:-1).filter(j=>j>=0);if(options.length)ix=options[RI(0,options.length-1)]}if(ix<0)ix=RI(0,pool.length-1);const k=pool.splice(ix,1)[0];mods.push(k);if(k==='dodge')st.dodge=+(r===1?R(.4,1):R(.65,1.5)).toFixed(2);if(k==='crit')st.crit=+(r===1?R(.4,.9):R(.7,1.5)).toFixed(2);if(k==='leech')st.leech=+(r===1?R(.4,1.0):R(.8,2.1)).toFixed(2);if(k==='haste')st.haste=+(r===1?R(1,2):R(1.5,3.4)).toFixed(1);if(k==='cdr')st.cdr=+(r===1?R(1,3):R(2,5.2)).toFixed(1);if(k==='critDmg')st.critDmg=+(r===1?R(4,9):R(8,17)).toFixed(1);if(k==='bleed')st.bleed=+(r===1?R(4,9):R(8,17)).toFixed(1);if(k==='mregen')st.mregen=+(r===1?R(1,2):R(2,4)).toFixed(1);if(k==='sp')st.sp=Math.round(R(r===1?2:4,r===1?5:9)+itemLevel*.24*endBoost);if(k==='str')st.str=Math.round((r===1?1:3)+itemLevel*(r===1?.07:.12)*endBoost+R(0,r===1?1:3));if(k==='sta')st.sta=Math.round((r===1?1:2)+itemLevel*(r===1?.06:.1)*endBoost+R(0,r===1?2:3))}};

 if(s===0||s===8&&Math.random()<.48){
  const isOff=s===8;if(isOff)offhandType='weapon';
  if(heroCls==='pyromancer'){
   if(isOff){offhandType='orb';weaponType='Orb';handed='one';st.a=Math.max(1,Math.round(1.5+itemLevel*.22*tier));st.sp=Math.max(4,Math.round((5+itemLevel*.6)*tier));st.sta=Math.max(1,Math.round((1+itemLevel*.14)*tier));rollBonus(['sp','cdr','mregen','crit','critDmg','dodge','sta'])}
   else{weaponType=Math.random()<.55?'Staff':'Wand';handed=weaponType==='Staff'?'two':'one';const base=4.5+.54*itemLevel;st.dMin=Math.max(1,Math.round(base*tier*R(.9,1.1)));st.dMax=Math.max(st.dMin+1,Math.round((base+2+itemLevel*.1)*tier*R(.9,1.1)));st.sp=Math.max(4,Math.round((6+itemLevel*.68)*tier*R(.9,1.1)));st.sta=Math.max(1,Math.round((1+itemLevel*.15)*tier));rollBonus(['sp','crit','critDmg','cdr','haste','mregen','leech','sta'])}
  }else if(heroCls==='rogue'){
   weaponType=isOff?'Dagger':(Math.random()<.68?'Dagger':'Sword');handed='one';
   const base=(isOff?4:4.8)+(isOff?.46:.58)*itemLevel;
   st.dMin=Math.max(1,Math.round(base*tier*R(.9,1.1)));st.dMax=Math.max(st.dMin+1,Math.round((base+(isOff?1.6:2)+itemLevel*.11)*tier*R(.9,1.1)));
   st.str=Math.max(1,Math.round((.5+itemLevel*.06)*tier));st.sta=Math.max(1,Math.round((1+itemLevel*.15)*tier));st.crit=+(R(.5,1.2)*(r===2?1.3:r===1?1.15:1)).toFixed(1);
   rollBonus(['crit','critDmg','haste','dodge','bleed','leech','cdr','str','sta']);
  }else{
   weaponType=['Sword','Axe','Mace'][RI(0,2)];handed=isOff?'one':Math.random()<.35?'two':'one';
   const base=(isOff?4:5)+(isOff?.48:.62)*itemLevel;
   st.dMin=Math.max(1,Math.round(base*tier*R(.9,1.1)));st.dMax=Math.max(st.dMin+1,Math.round((base+(isOff?1.7:2)+itemLevel*.12)*tier*R(.9,1.1)));
   st.str=Math.max(1,Math.round((.5+itemLevel*.07)*tier*R(.85,1.15)));st.sta=Math.max(1,Math.round((1+itemLevel*.16)*tier*R(.85,1.15)));
   rollBonus(['crit','leech','haste','dodge','cdr','critDmg','bleed','mregen','str','sta']);
  }
 }else{
  if(s===8)offhandType=heroCls==='pyromancer'?'orb':'shield';
  const armorSlot=[1,2,5,6,7].includes(s)||s===8,jewelry=s===3||s===4,base=2+itemLevel*.32;
  if(armorSlot){st.a=Math.max(1,Math.round(base*tier*R(.85,1.15)));st.sta=Math.max(1,Math.round((1+itemLevel*(s===8?.16:.22))*tier*R(.85,1.15)));if(heroCls==='pyromancer')st.sp=Math.max(2,Math.round((3+itemLevel*.35)*tier*R(.85,1.15)));else st.str=Math.max(1,Math.round((.5+itemLevel*.07)*tier*R(.85,1.15)));rollBonus(heroCls==='pyromancer'?['sp','cdr','mregen','crit','critDmg','dodge','haste','sta']:['dodge','crit','leech','haste','cdr','critDmg','bleed','mregen','str','sta'])}
  else if(jewelry){st.crit=+(R(.5,1.2)*(r===2?1.3:r===1?1.15:1)+Math.min(2.2,itemLevel*.04)).toFixed(1);st.leech=+(R(.15,.45)*(r===2?1.3:r===1?1.15:1)+Math.min(.6,itemLevel*.012)).toFixed(2);st.sta=Math.max(1,Math.round((1+itemLevel*.14)*tier));if(heroCls==='pyromancer'){st.sp=Math.max(2,Math.round((3+itemLevel*.42)*tier));rollBonus(['sp','dodge','haste','cdr','critDmg','mregen','sta'])}else{st.str=Math.max(1,Math.round((1+itemLevel*.08)*tier));rollBonus(['dodge','haste','cdr','critDmg','bleed','mregen','str','sta'])}}
 }
 let name=s===0?(handed==='two'?'Two-Handed ':'One-Handed ')+(weaponType||'Sword'):s===8&&offhandType==='weapon'?'One-Handed '+(weaponType||'Sword'):s===8&&offhandType==='orb'?'Arcane Focus':NM[s][RI(0,NM[s].length-1)];const affixNames={crit:'Precise',leech:'Vampiric',haste:'Quick',dodge:'Evasive',cdr:'Focused',critDmg:'Deadly',bleed:'Sanguine',mregen:'Flowing',str:'Mighty',sta:'Stalwart',sp:'Arcanist'};if(r>=1&&mods.length)name=affixNames[mods[0]]+' '+name;if(r===2&&mods.length>1)name+=' of '+affixNames[mods[1]];
 const icon=s===0||offhandType==='weapon'?({Sword:'⚔️',Axe:'🪓',Mace:'🔨',Staff:'🪄',Wand:'✨',Dagger:'🗡️'}[weaponType]||'⚔️'):offhandType==='orb'?'🔮':IC[s];
 const canRollSocket=(f>=7||best>=7||itemLevel>=7)&&r>=2&&[0,1,2,5].includes(s);
 const maxSockets=canRollSocket?(Math.random()<(itemLevel>=14?.62:.38)?2:1):0;
 return applyLootTheme({s,r,st,n:name,itemLevel,icon,slotName:SL[s],weaponType,handed,offhandType,weaponClass:heroCls,maxSockets,sockets:[]},source);
}


















// Inventory reliefs and ability emblems use a 32-unit artboard.
const gearReliefs={
 helm:['M4 21L5 13Q6 5 16 3Q26 5 27 13L28 21L22 28L19 21V16H13V21L10 28Z','M16 4V14M6 14L13 16M26 14L19 16M9 10L13 8'],
 cuirass:['M4 6L11 3Q16 10 21 3L28 6L25 13L23 15L25 26L16 30L7 26L9 15L7 13Z','M7 9L13 12L16 10L19 12L25 9M16 11V25M10 18L16 21L22 18M9 23L16 26L23 23'],
 ring:['M6 18A10 10 0 1 0 26 18A10 10 0 1 0 6 18ZM10 18A6 6 0 1 1 22 18A6 6 0 1 1 10 18Z','M5 17L8 19M23 19L26 17'],
 pendant:['M13 12L16 9L19 12L25 19L16 29L7 19Z','M5 3Q7 10 15 13M27 3Q25 10 17 13M16 12L12 19L16 26L20 19Z'],
 greaves:['M6 4L16 6L13 19L11 28L4 26L7 17ZM17 6L27 4L25 17L28 26L21 28L18 19Z','M6 9L14 11M18 11L26 9M11 14L8 24M21 14L24 24'],
 glove:['M5 17L9 15L7 8L10 7L13 14L12 4L15 3L17 13L18 3L21 4L21 14L24 6L27 8L24 19L18 25L18 29L8 27L9 22Z','M11 17L17 18L23 15M10 24L18 26M12 20L16 22'],
 boot:['M9 3L23 5L20 17L23 21L28 23L29 28L13 28L5 25L7 18Z','M9 7L21 9M9 11L20 13M8 16L17 18M7 23L14 25L27 25']
};
const emblemShapes={
 shield:'M16 3L27 7L25 19L16 29L7 19L5 7ZM16 8V23L21 17L23 10Z',
 spin:'M28 12Q18 -1 7 9Q2 15 8 22Q6 13 15 11Q23 9 28 12ZM4 21Q14 34 25 23Q30 17 24 10Q26 19 17 21Q9 24 4 21Z',
 blaze:'M15 2Q18 11 22 12L24 7Q34 23 20 28Q23 20 16 17Q17 23 12 28Q0 24 6 14L10 17Q9 10 15 2Z',
 star:'M16 2L19 11L27 6L22 14L31 16L22 19L26 27L18 22L16 31L13 22L5 27L10 18L1 16L11 13L6 5L14 10Z',
 blade:'M6 26L10 20L6 17L8 15L12 17L22 6L28 3L26 10L15 21L17 24L15 26L12 23L8 29Z',
 bolt:'M19 2L5 18H14L11 30L28 12H18Z',
 hook:'M6 3L10 2L21 18Q27 29 16 30Q7 29 6 19L12 22Q12 26 17 25Q21 23 17 18Z',
 dash:'M4 10L12 10L19 16L12 22L4 22L12 16ZM16 7L22 7L30 16L22 25L16 25L24 16Z',
 fissure:'M16 2L20 10L17 15L24 13L20 19L29 23L19 23L16 30L13 22L3 26L11 18L4 14L13 15L11 10Z',
 flask:'M12 3H20V6H19V12Q30 22 24 27Q16 32 8 27Q3 23 13 12V6H12ZM13 17L10 22Q9 27 16 27Q24 27 23 22L20 17Z',
 drop:'M16 2Q17 10 23 16Q32 29 17 30Q3 29 7 19Q10 13 16 2ZM11 20Q10 26 16 27Q12 24 13 19Z',
 frost:'M14 2H18V11L25 6L27 9L20 14H29V18H20L27 24L25 27L18 21V30H14V21L7 26L5 23L12 18H3V14H12L5 8L8 6L14 11Z',
 trap:'M4 24L10 8L14 18L16 3L20 18L23 9L29 25L19 21L16 29L12 21Z',
 veil:'M4 22Q6 9 16 3Q26 9 28 22L23 28L16 25L9 28ZM9 18L13 22L16 20L19 22L23 18L17 15Z',
 orbit:'M4 17Q2 8 16 5Q30 4 28 15L24 13Q25 8 17 9Q6 11 8 17ZM28 16Q30 24 17 28Q3 30 4 20L8 21Q8 26 16 24Q25 22 24 17ZM16 11L21 16L16 21L11 16Z',
 fan:'M5 28L7 7L11 11L9 22L17 3L20 8L13 23L27 10L27 16L11 28Z'
};
const emblems={
 shieldbash:'shield',whirlwind:'spin',charge:'dash',groundslam:'fissure',rend:'drop',shieldwall:'shield',cleave:'fan',execution:'blade',ironhook:'hook',bloodfurnace:'blaze',
 fireball:'blaze',flamenova:'star',blink:'dash',meteor:'fissure',chainlightning:'bolt',icearmor:'frost',pyroblast:'blaze',combustion:'star',stormhalo:'orbit',cindersigil:'trap',
 twinfang:'blade',shadowstep:'dash',fanknives:'fan',smokebomb:'veil',venomstrike:'drop',caltrops:'trap',bladeflurry:'spin',assassinate:'blade',nightsnare:'trap',reaperscut:'hook',potion:'flask'
};
const reliefCache=new Map();
function reliefIcon(shape,accent,gear=false){
 const key=shape+accent+gear;
 if(reliefCache.has(key))return reliefCache.get(key);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
 const c=canvas.getContext('2d');c.scale(3,3);c.lineJoin='round';c.lineCap='round';
 const data=gear?gearReliefs[shape]:[emblemShapes[shape]];
 const outline=new Path2D(data[0]),metal=c.createLinearGradient(4,2,26,30);
 metal.addColorStop(0,'#fff2d3');metal.addColorStop(.32,accent);metal.addColorStop(.55,gear?'#706367':accent);metal.addColorStop(.61,gear?'#c6ac88':'#fff3ce');metal.addColorStop(1,'#534759');
 c.strokeStyle='#170f1d';c.lineWidth=2.6;c.stroke(outline);c.fillStyle=metal;c.fill(outline,'evenodd');
 c.lineWidth=.55;c.strokeStyle='#ffedcacc';c.stroke(outline);
 if(gear){
  c.lineWidth=1.1;c.strokeStyle='#4a3941';c.stroke(new Path2D(data[1]));
  if(shape==='ring'||shape==='pendant'){
   const y=shape==='ring'?7:19;c.fillStyle=accent;c.strokeStyle='#ffdcac';c.lineWidth=.8;
   c.beginPath();c.moveTo(16,y-5);c.lineTo(21,y);c.lineTo(16,y+5);c.lineTo(11,y);c.closePath();c.fill();c.stroke();
   c.fillStyle='#fff7de';c.beginPath();c.moveTo(16,y-4);c.lineTo(16,y);c.lineTo(12,y);c.fill();
  }
 }
 const icon='<img class="'+(gear?'gear-relief':'skill-emblem')+'" alt="" src="'+canvas.toDataURL()+'">';
 reliefCache.set(key,icon);return icon;
}
function skillEmblem(ability){
 const id=ability.id||'potion',shape=emblems[id];
 if(!shape)return esc(ability.i||'');
 const cls=window.dodHeroClass||'warrior';
 const color=id==='potion'?'#ed6066':id==='icearmor'?'#8de3ef':id==='stormhalo'||id==='chainlightning'?'#9dbfff':cls==='rogue'?'#ca9bf3':cls==='pyromancer'?'#ff995e':'#dfb679';
 return reliefIcon(shape,color);
}

const AB=[
 {id:'shieldbash',k:'1',n:'Shield Bash',i:'🛡️',desc:'Stun a nearby foe. Interrupt a windup to empower Ground Slam against that foe.',cd:3,mp:10,unlock:1},
 {id:'groundslam',k:'2',n:'Ground Slam',i:'💥',desc:'Smash the ground to slow foes. A Guard Break grants 75% bonus damage and refunds 10 mana.',cd:7,mp:18,unlock:2},
 {id:'charge',k:'3',n:'Charge',i:'➤',desc:'Rush forward, damaging enemies in your path.',cd:6,mp:14,unlock:4},
 {id:'whirlwind',k:'4',n:'Whirlwind',i:'🌀',desc:'Hold to spin while moving. 46% weapon damage every 0.32s; 20 mana/s before talents.',cd:.2,mp:0,unlock:7},
 {id:'rend',k:'5',n:'Rend',i:'🩸',desc:'Cut nearby enemies in a wide arc and inflict deep bleeding.',cd:5,mp:16,unlock:10},
 {id:'shieldwall',k:'6',n:'Shield Wall',i:'🛡',desc:'Brace behind your shield to reduce incoming damage by 65%.',cd:12,mp:24,unlock:13},
 {id:'bloodfurnace',k:'7',n:'Blood Furnace',i:'🔥',desc:'Strike nearby enemies, detonating their Bleeds for burst damage and healing.',cd:6.4,mp:19,unlock:16},
 {id:'execution',k:'8',n:'Execution',i:'☠️',desc:'Deal massive finisher damage, amplified against wounded enemies.',cd:9.5,mp:26,unlock:20}
];
const wwIndex=()=>AB.findIndex(a=>a?.id==='whirlwind');
const SPELL_RUNES={
 shieldbash:[{id:'a',n:'Concussive Blow',desc:'+25% damage & +0.8s stun duration.'},{id:'b',n:'Vanguard Strike',desc:'Hits grant +1.5s Guard & restore 8 Mana.'}],
 groundslam:[{id:'a',n:'Aftershock',desc:'+34 radius & +20% slam damage.'},{id:'b',n:'Crushing Weight',desc:'4s Slow & interrupts enemy windups.'}],
 charge:[{id:'a',n:'Battering Ram',desc:'+35% impact damage & 0.6s stun.'},{id:'b',n:'Fleet Vanguard',desc:'-1.5s cooldown & brief haste after dashing.'}],
 whirlwind:[{id:'a',n:'Blood Vortex',desc:'+25% spin damage & applies 2s Bleed.'},{id:'b',n:'Gale Spinner',desc:'-25% mana drain & +18 spin radius.'}],
 rend:[{id:'a',n:'Hemorrhage',desc:'+35% Bleed damage & +1.5s duration.'},{id:'b',n:'Crimson Arc',desc:'Wider 175px sweep & +12 HP on hit.'}],
 shieldwall:[{id:'a',n:'Spiked Bastion',desc:'Erupts on cast for 135% AP nearby damage.'},{id:'b',n:'Enduring Aegis',desc:'+1.5s duration & -2s cooldown.'}],
 bloodfurnace:[{id:'a',n:'Searing Boil',desc:'+35% burst damage & ignites survivors.'},{id:'b',n:'Crimson Feast',desc:'Doubles healing per Bleed consumed.'}],
 execution:[{id:'a',n:'Guillotine',desc:'Execute bonus triggers below 50% HP.'},{id:'b',n:'Relentless Finisher',desc:'Kills refund 50% cooldown & 15 Mana.'}],
 fireball:[{id:'a',n:'Twin Ember',desc:'Fires 2 angled side embers with each orb.'},{id:'b',n:'Detonator',desc:'+30 blast radius & +30% Ignite burn.'}],
 flamenova:[{id:'a',n:'Solar Shockwave',desc:'Applies Shock (+18% dmg taken) & knocks farther.'},{id:'b',n:'Inferno Pulse',desc:'+36 radius & -1.2s cooldown.'}],
 blink:[{id:'a',n:'Phase Surge',desc:'Restores 8 Mana & trims active cooldowns by 1s.'},{id:'b',n:'Frostbite Wake',desc:'Chills & slows enemies near arrival.'}],
 chainlightning:[{id:'a',n:'Overcharge',desc:'+2 chain targets & +20% bolt damage.'},{id:'b',n:'Arc Conduit',desc:'Restores 4 Mana per enemy shocked.'}],
 icearmor:[{id:'a',n:'Glacial Nova',desc:'Freezes & damages nearby attackers on cast.'},{id:'b',n:'Permafrost',desc:'+2.5s duration & stronger chill.'}],
 stormhalo:[{id:'a',n:'Tempest Core',desc:'+25% orbiting bolt damage.'},{id:'b',n:'Extended Orbit',desc:'+2.0s duration & faster lightning pulse.'}],
 pyroblast:[{id:'a',n:'Magma Impact',desc:'+30% damage & wider molten blast.'},{id:'b',n:'Quick Cast',desc:'-1.8s cooldown & -6 Mana cost.'}],
 meteor:[{id:'a',n:'Cataclysm',desc:'Calls down 2 additional meteors.'},{id:'b',n:'Starfire',desc:'+30% meteor damage & +0.7s stun.'}],
 twinfang:[{id:'a',n:'Serrated Twin',desc:'+40% Bleed damage & +1.5s duration.'},{id:'b',n:'Viper Tempo',desc:'-0.5s cooldown & restores 4 Mana on hit.'}],
 fanknives:[{id:'a',n:'Steel Tempest',desc:'Throws +3 extra knives in a wider volley.'},{id:'b',n:'Barbed Blades',desc:'Knives inflict 3s Bleed & deeper slow.'}],
 shadowstep:[{id:'a',n:'Shadow Echo',desc:'-1.0s cooldown & +1.5s Crit Chance buff.'},{id:'b',n:'Ambush Cut',desc:'Slashes nearby enemies upon arrival.'}],
 venomstrike:[{id:'a',n:'Toxic Rupture',desc:'+35% damage vs Bleeding or Slowed foes.'},{id:'b',n:'Numbing Poison',desc:'4.5s Slow & brief 0.7s stun.'}],
 caltrops:[{id:'a',n:'Razor Traps',desc:'+40% trap damage & wider radius.'},{id:'b',n:'Tactical Escape',desc:'-1.5s cooldown & restores 8 Mana.'}],
 smokebomb:[{id:'a',n:'Shadow Cloak',desc:'+2s shroud duration & restores 15% HP.'},{id:'b',n:'Flash Powder',desc:'Slows & damages nearby enemies on cast.'}],
 bladeflurry:[{id:'a',n:'Whirling Daggers',desc:'Unleashes a 3rd rapid spin slash.'},{id:'b',n:'Lethal Tempo',desc:'-1.4s cooldown & bonus Crit chance.'}],
 assassinate:[{id:'a',n:'Heartseeker',desc:'Execute bonus triggers below 55% HP.'},{id:'b',n:'Vanish Reset',desc:'Kills reset Evade cooldown & +15 Mana.'}]
};
const SPELLBOOK_KEY='dodSpellBookV1';
const emptySpellBook=()=>({ranks:{warrior:{},pyromancer:{},rogue:{}},runes:{warrior:{},pyromancer:{},rogue:{}}});
let spellBookState=emptySpellBook();
try{const raw=JSON.parse(localStorage.getItem(SPELLBOOK_KEY)||'null');if(raw&&typeof raw==='object')for(const c of['warrior','pyromancer','rogue']){if(raw.ranks?.[c])spellBookState.ranks[c]={...raw.ranks[c]};if(raw.runes?.[c])spellBookState.runes[c]={...raw.runes[c]}}}catch(e){}
const saveSpellBook=()=>{try{localStorage.setItem(SPELLBOOK_KEY,JSON.stringify(spellBookState))}catch(e){}};
const spellBookEarned=()=>Math.max(0,Math.floor((+P.lv||1)/2));
const spellBookSpent=(c=window.dodHeroClass||'warrior')=>Object.values(spellBookState.ranks[c]||{}).reduce((a,v)=>a+Math.max(0,Math.min(3,+v||0)),0);
const spellBookAvail=(c=window.dodHeroClass||'warrior')=>Math.max(0,spellBookEarned()-spellBookSpent(c));
const spellMod=(id,c=window.dodHeroClass||'warrior')=>{const rank=Math.max(0,Math.min(3,+spellBookState.ranks[c]?.[id]||0));const rune=rank>=1?(spellBookState.runes[c]?.[id]||null):null;return{rank,rune,dmgMult:1+rank*.12,cdMult:1-rank*.06}};
window.dodSpellBook={
 SPELL_RUNES,
 earned:spellBookEarned,
 spent:spellBookSpent,
 avail:spellBookAvail,
 getMod:spellMod,
 getState:c=>({ranks:spellBookState.ranks[c]||(spellBookState.ranks[c]={}),runes:spellBookState.runes[c]||(spellBookState.runes[c]={})}),
 setRank:(c,id,delta)=>{const st=window.dodSpellBook.getState(c),cur=Math.max(0,Math.min(3,+st.ranks[id]||0));if(delta>0&&spellBookAvail(c)>0&&cur<3){st.ranks[id]=cur+1;if(!st.runes[id])st.runes[id]='a';saveSpellBook();return true}if(delta<0&&cur>0){st.ranks[id]=cur-1;if(st.ranks[id]===0)delete st.runes[id];saveSpellBook();return true}return false},
 setRune:(c,id,r)=>{const st=window.dodSpellBook.getState(c);if((+st.ranks[id]||0)<1)return false;st.runes[id]=r;saveSpellBook();return true},
 reset:(c=window.dodHeroClass||'warrior')=>{spellBookState.ranks[c]={};spellBookState.runes[c]={};saveSpellBook()},
 maxForAdmin:(c)=>{const list=window.dodGetClassSkills?.(c)||AB;const st=window.dodSpellBook.getState(c);list.forEach(a=>{if(a){st.ranks[a.id]=3;st.runes[a.id]=st.runes[a.id]||'a'}});saveSpellBook()}
};
const POTION={k:'Q',n:'Health Potion',i:'🧪',cd:14,mp:0};
let abilityLoadout=[0,1,2,3];
try{const saved=JSON.parse(localStorage.getItem('dodWarriorLoadoutV1')||'null');if(Array.isArray(saved))abilityLoadout=[0,1,2,3].map((fallback,i)=>{const v=Number(saved[i]);return Number.isInteger(v)&&v>=0&&v<AB.length?v:fallback})}catch(e){}
const ET={sk:{n:'Skeleton',hp:36,d:7.5,sp:78,r:12,c:'#d9d3b8',xp:15,rg:0},zb:{n:'Undead Beast',hp:98,d:14,sp:48,r:17,c:'#6f8f55',xp:32,rg:0},ar:{n:'Bone Archer',hp:28,d:9,sp:64,r:11,c:'#c8a060',xp:22,rg:250},nc:{n:'Cultist Summoner',hp:54,d:11,sp:58,r:13,c:'#9f7ad9',xp:40,rg:260},pb:{n:'Plague Bomber',hp:46,d:16,sp:102,r:13,c:'#7bd455',xp:36,rg:0},dk:{n:'Dread Knight',hp:135,d:18,sp:66,r:18,c:'#6e798c',xp:48,rg:0},bs:{n:'The Butcher',hp:680,d:28,sp:88,r:30,c:'#9a2a2a',xp:420,rg:0}};
const need=l=>Math.floor(28*Math.pow(l,1.48)),col=c=>/^#[0-9a-f]{6}$/i.test(c)?c:'#ccc';

let fl=1,best=1,floorEnemyCap=5,T,rooms,DECO=[],seen,E=[],LT=[],PR=[],TG=[],PT=[],RG=[],FT=[],stairs,bossDone=1,boss=null,sh=0,tm=0,hurtT=0,PD={},DM={},held=0,room=null,fr=0,bt;
const POTION_CD=11,PA={},RP={},CD=Array(12).fill(0),keys={},M={x:innerWidth/2,y:innerHeight/2};let autoAttackHeld=false,mouseAimHeld=false,walkAttackStart=null;
const activeSkillSlotCap=()=>P.lv>=7?4:P.lv>=4?3:P.lv>=2?2:1;
const slotUnlockLevel=slot=>slot<=0?1:slot===1?2:slot===2?4:7;
const me={n:['Aldrik','Brynja','Kolga','Torvald','Ylva','Rurik','Sigrun','Varg'][RI(0,7)],c:'#'+[RI(130,255),RI(130,255),RI(130,255)].map(v=>v.toString(16).padStart(2,'0')).join('')};
const P={x:0,y:0,r:12,hp:100,mp:50,lv:1,xp:0,inv:[],eq:Array(9).fill(null),face:0,tgt:null,mv:null,at:0,an:0,ac:0,dash:null,inv_t:0,dead:0};
P.eq[0]={s:0,r:0,st:{dMin:3,dMax:6},n:'Rusty Shortsword',icon:'⚔️',weaponType:'Sword',handed:'one',weaponClass:'warrior'};P.blade=0;P.bladeTick=0;P.guardCd=0;
let skillPts=0,elixirs=0,skills={might:0,heart:0,focus:0,fortune:0};let quest={kills:0,bosses:0,claimed:false,ossuaryReward:false};let townOpen=false;
function save(){try{localStorage.setItem('mdjup',JSON.stringify({lv:P.lv,xp:P.xp,inv:P.inv,eq:P.eq,best,depth:fl,heroName:me.n,heroColor:me.c,skillPts,skills,elixirs,quest}));localStorage.setItem('dodGemsV1',JSON.stringify(dodGems));localStorage.setItem('dodAspectsV1',JSON.stringify(dodAspects));localStorage.setItem('dodLootFilterV1',dodLootFilter);localStorage.setItem('dodFragmentsV1',String(dodAbyssFragments));saveSpellBook()}catch(e){}}
const validItem=it=>!!it&&typeof it==='object'&&!Array.isArray(it)&&Number.isInteger(+it.s)&&+it.s>=0&&+it.s<9&&!!it.st&&typeof it.st==='object'&&!Array.isArray(it.st);
function load(){try{const s=JSON.parse(localStorage.getItem('mdjup'));if(s&&Array.isArray(s.eq)&&(s.eq.length===5||s.eq.length===9)){P.lv=Math.max(1,Math.min(50,Number(s.lv)||1));P.xp=Math.max(0,Number(s.xp)||0);P.inv=Array.isArray(s.inv)?s.inv.filter(validItem).slice(0,24):[];P.eq=Array(9).fill(null);s.eq.forEach((it,i)=>{if(i<9&&validItem(it)&&+it.s===i)P.eq[i]=it});if(!P.eq[0])P.eq[0]={s:0,r:0,st:{dMin:3,dMax:6},n:'Rusty Shortsword',icon:'⚔️',weaponType:'Sword',handed:'one',weaponClass:'warrior'};if(typeof s.heroName==='string'&&s.heroName.trim())me.n=s.heroName.trim().slice(0,18);if(typeof s.heroColor==='string'&&/^#[0-9a-f]{6}$/i.test(s.heroColor))me.c=s.heroColor;[...P.inv,...P.eq.filter(Boolean)].forEach(it=>{if(it.s===8&&!it.offhandType)it.offhandType='shield';if(!Array.isArray(it.sockets))it.sockets=[];if(it.locked!==undefined)it.locked=Boolean(it.locked);if(it.st&&it.st.d!==undefined){const d=+it.st.d||4;delete it.st.d;it.st.dMin=Math.max(1,Math.round(d*.9));it.st.dMax=Math.max(it.st.dMin+1,Math.round(d*1.25))}});best=Math.max(1,Number(s.best)||1);fl=Math.max(1,Math.min(999,Number(s.depth)||1));skillPts=Math.max(0,Number(s.skillPts)||0);if(s.skills&&typeof s.skills==='object')skills=Object.assign(skills,s.skills);elixirs=Math.max(0,Number(s.elixirs)||0);quest={kills:0,bosses:0,claimed:false,ossuaryReward:false,...s.quest}}}catch(e){console.warn('Save data could not be loaded; starting safely.',e)}}
function stats(){const s={a:0,h:0,c:0,s:0,l:0,m:0,str:0,sta:0,dodge:0,crit:0,leech:0,sp:0,haste:0,cdr:0,critDmg:0,bleed:0,mregen:0,dMin:0,dMax:0};let setCount=0;P.eq.forEach(it=>{if(it){if(it.set=='Nightwatcher’s Oath')setCount++;for(const k in it.st)s[k]=(s[k]||0)+(+it.st[k]||0);if(Array.isArray(it.sockets))for(const gid of it.sockets){const g=GEMS[gid];if(g)for(const k in g.st)s[k]=(s[k]||0)+(+g.st[k]||0)}}});if(setCount>=2){s.a+=5;s.str+=2}if(setCount>=4){s.h+=30;s.leech+=3}if(P.eq[3]?.id==='bloodsignet'&&P.hp<90+P.lv*14*.5)s.leech+=5;s.STR=4+P.lv*.55+s.str;s.AP=4+P.lv*.85+s.STR*1.0;s.SP=5+P.lv*1.75+s.sp;s.MDMin=s.AP+s.dMin;s.MDMax=s.AP+s.dMax;s.H=105+P.lv*7.2+s.h+s.sta*6.5;s.M=50+P.lv*3.5+s.m;s.C=Math.min(52,5+s.c+s.crit);s.dodge=Math.min(38,s.dodge);s.leech=Math.min(9,s.leech+s.l);s.Haste=Math.min(160,s.haste);s.cdr=Math.min(45,s.cdr);s.critDmg=Math.min(165,s.critDmg);s.bleed=Math.min(130,s.bleed);s.mregen=Math.min(28,s.mregen);return s}
let AC,masterGain;const audioState=(()=>{let s={muted:false,volume:.8};try{const raw=JSON.parse(localStorage.getItem('dodGamePreferencesV1')||localStorage.getItem('dodAudioSettingsV1')||'null');if(raw&&typeof raw==='object'){s.muted=Boolean(raw.muted);const v=Number(raw.volume);if(Number.isFinite(v))s.volume=Math.max(0,Math.min(1,v))}}catch(e){}return s})();const prefState=(()=>{let s={highPerformance:false,uiScale:1,autoSalvage:dodLootFilter||'off'};try{const raw=JSON.parse(localStorage.getItem('dodGamePreferencesV1')||'null');if(raw&&typeof raw==='object'){s.highPerformance=Boolean(raw.highPerformance);const sc=Number(raw.uiScale);if(Number.isFinite(sc))s.uiScale=Math.max(.8,Math.min(1.25,sc));if(['off','common','magic'].includes(raw.autoSalvage)){s.autoSalvage=raw.autoSalvage;dodLootFilter=raw.autoSalvage}}}catch(e){}return s})();const prefStyle=document.createElement('style');prefStyle.textContent='html.dod-perf #adv,html.dod-perf #admin,html.dod-perf #inv,html.dod-perf #upgradePanel,html.dod-perf #sanctuary,html.dod-perf #bossRewards{backdrop-filter:none!important}body:not(.hud-layout-editing) :is(#top,#mm,#boss,#bar,#quickActions,#buildMasteryHud,#uniqueProcStatus,#combatCard,#inv,#adv,#progPanel,#worldPanel,#d3service,#admin){zoom:var(--dod-ui-scale,1)}';document.head.appendChild(prefStyle);const applyVisualPrefs=()=>{try{document.documentElement.classList.toggle('dod-perf',Boolean(prefState.highPerformance));document.documentElement.style.setProperty('--dod-ui-scale',String(prefState.uiScale||1))}catch(e){}};applyVisualPrefs();const persistAllPrefs=()=>{try{localStorage.setItem('dodAudioSettingsV1',JSON.stringify(audioState));localStorage.setItem('dodLootFilterV1',dodLootFilter);localStorage.setItem('dodGamePreferencesV1',JSON.stringify({muted:audioState.muted,volume:audioState.volume,highPerformance:prefState.highPerformance,uiScale:prefState.uiScale,autoSalvage:dodLootFilter}))}catch(e){}};const syncMasterGain=()=>{try{if(AC&&masterGain)masterGain.gain.setValueAtTime(audioState.muted?0:audioState.volume,AC.currentTime)}catch(e){}};const setGlobalAudio=(muted,volume)=>{audioState.muted=Boolean(muted);if(Number.isFinite(Number(volume)))audioState.volume=Math.max(0,Math.min(1,Number(volume)));persistAllPrefs();syncMasterGain()};const setPreferences=(next)=>{if(!next||typeof next!=='object')return;if('muted'in next||'volume'in next)setGlobalAudio('muted'in next?next.muted:audioState.muted,'volume'in next?next.volume:audioState.volume);if('highPerformance'in next)prefState.highPerformance=Boolean(next.highPerformance);if('uiScale'in next&&Number.isFinite(Number(next.uiScale)))prefState.uiScale=Math.max(.8,Math.min(1.25,Number(next.uiScale)));if('autoSalvage'in next&&['off','common','magic'].includes(next.autoSalvage)){dodLootFilter=next.autoSalvage;prefState.autoSalvage=next.autoSalvage;if($('inv')?.style.display==='block')renderInv()}applyVisualPrefs();persistAllPrefs()};const ensureAudio=()=>{AC=AC||new AudioContext();if(AC.state==='suspended')AC.resume().catch(()=>{});if(!masterGain){masterGain=AC.createGain();masterGain.connect(AC.destination);syncMasterGain()}return AC};const sndLast={};const snd=(f,d=.1,ty='square',v=.05,sl=0)=>{try{if(audioState.muted||audioState.volume<=0)return;const now=performance.now(),band=ty+':'+Math.round(f/35);if(sndLast[band]&&now-sndLast[band]<48)return;sndLast[band]=now;const ctx=ensureAudio(),t=ctx.currentTime,o=ctx.createOscillator(),n=ctx.createGain(),gain=Math.min(.085,v);o.type=ty;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,f+sl),t+d);n.gain.setValueAtTime(gain,t);n.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(n).connect(masterGain);o.start();o.stop(t+d)}catch(e){}};const localWorkshop=window===window.top&&(location.protocol==='file:'||['localhost','127.0.0.1','[::1]'].includes(location.hostname));window.dodIsAdmin=localWorkshop;window.dodAdminGodMode=false;window.dodAdminStats=null;const syncAdminDom=()=>{const qb=document.getElementById('adminQuick');if(qb){qb.hidden=!window.dodIsAdmin;qb.style.display=window.dodIsAdmin?'inline-flex':'none'}const tb=document.getElementById('d3AdminEndgame');if(tb){tb.hidden=!window.dodIsAdmin;tb.style.display=window.dodIsAdmin?'inline-flex':'none'}if(!window.dodIsAdmin){window.dodAdminGodMode=false;window.dodAdminStats=null;const adm=document.getElementById('admin');if(adm)adm.style.display='none'}};window.dodAudio={getState:()=>({...audioState}),setAudio:setGlobalAudio,testSound:()=>{if(audioState.muted)return;snd(523,.14,'triangle',.08,180)}};window.dodPreferences={getPreferences:()=>({...audioState,...prefState,autoSalvage:dodLootFilter}),setPreferences};window.addEventListener('message',e=>{if(e.origin!==window.location.origin||!e.data||typeof e.data!=='object')return;if(e.data.type==='dod:set-audio')setGlobalAudio(e.data.muted,e.data.volume);else if(e.data.type==='dod:set-preferences')setPreferences(e.data.preferences);else if(e.data.type==='dod:test-audio')window.dodAudio.testSound();else if(e.data.type==='dod:set-admin'){window.dodIsAdmin=Boolean(e.data.isAdmin);syncAdminDom()}else if(e.data.type==='dod:set-admin-stats'){window.dodAdminStats=window.dodIsAdmin&&e.data.stats&&typeof e.data.stats==='object'?e.data.stats:null;if($('admin')?.style.display==='block'){const form=$('admin').querySelector('.lab-scenario');renderAdmin();if(form)$('admin').querySelector('.lab-scenario').replaceWith(form)}}else if(e.data.type==='dod:open-admin'){if(window.dodIsAdmin)adminOpen()}else if(e.data.type==='dod:start-endgame'){if(window.dodIsAdmin)window.dodAdminEndgame?.(e.data.heroClass)}else if(e.data.type==='dod:set-slayer-title'){try{if(e.data.title)localStorage.setItem('dodSlayerTitleV1',String(e.data.title));else localStorage.removeItem('dodSlayerTitleV1')}catch(err){}if($('inv')?.style.display==='block')renderInv();window.dodRefreshCodex?.()}});window.addEventListener('keydown',e=>{const tag=document.activeElement?.tagName;if(e.key.toLowerCase()==='m'&&!e.repeat&&tag!=='INPUT'&&tag!=='TEXTAREA'&&tag!=='SELECT'){if(window.parent&&window.parent!==window){window.parent.postMessage({type:'dod:toggle-mute'},window.location.origin)}else{setGlobalAudio(!audioState.muted,audioState.volume)}}});
function banner(t){const b=$('bn');b.textContent=t;b.style.opacity=1;clearTimeout(bt);bt=setTimeout(()=>b.style.opacity=0,2300)}
const isHitNumber=kind=>['damage','crit','damageTaken','bleed','burn','rupture','shock'].includes(kind);
const ft=(x,y,txt,c='#fff',s=1,kind='float')=>{
 const life=kind==='crit'?.91:isHitNumber(kind)?.68:1.2;
 const value=typeof txt==='number'&&txt>=1000?txt.toLocaleString('en-US'):txt;
 FT.push({x,y,txt:value,c,s,kind,t:0,life,vx:0});
},ring=(x,y,r,c)=>RG.push({x,y,r,m:.4,t:0,c});
function burst(x,y,c,n,sp=120,l=.6,s=3){const count=prefState.highPerformance?Math.max(2,Math.round(n*.4)):n,cap=prefState.highPerformance?220:700;for(let i=0;i<count;i++){const a=R(6.283),v=R(sp*.3,sp);PT.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l,m:l,c,s})}if(PT.length>cap)PT.splice(0,PT.length-cap)}
const OPENING_DEPTHS = {
 1: {
  name: 'The Ossuary',
  rooms: [[12,24,7,7],[22,23,9,9],[34,22,11,11]],
  encounters: [
   {room:1, foes:[['sk',-65,-55],['sk',-20,45],['sk',35,-10],['ar',96,36]], required:true},
   {room:2, foes:[['zb',-90,0],['sk',-50,-64],['sk',-35,66],['sk',20,12],['ar',108,-60],['ar',113,55]], required:true}
  ]
 },
 2: {
  name: 'The Broken Bastion',
  rooms: [[14,29,7,7],[24,27,10,11],[24,15,10,9],[38,26,11,13]],
  links: [[0,1],[1,2],[1,3]],
  encounters: [
   {room:1, foes:[['dk',-25,5,'guard'],['ar',90,5],['sk',0,67],['sk',26,-66]], required:true},
   {room:2, foes:[['dk',0,0,'champion'],['ar',-75,-65],['ar',75,-65],['sk',-72,50],['sk',72,50]]},
   {room:3, foes:[['zb',-65,0],['pb',-12,-82],['pb',12,82],['ar',86,0],['sk',36,42]], required:true}
  ]
 },
 3: {
  name: 'The Slaughterhouse',
  rooms: [[15,25,7,7],[25,24,9,9],[38,22,12,13]],
  encounters: [{room:1, foes:[['zb',-48,0],['sk',-28,-68],['sk',-28,68],['ar',86,-54],['ar',86,54]]}]
 }
};
const openingLayout = n => window.dodWhirlTrialLevel ? null : OPENING_DEPTHS[n];

let ruptureWaves=[];
let packAlarmAt=0,bearerSeen=false,hostKills=0;
let leechReserve=0,leechUpdated=0;
const combatPacks=new Map(),crowdCells=new Map();
const CROWD_CELL=84;
function prepareCrowd(){
 combatPacks.clear();crowdCells.clear();
 for(const e of E){
  if(e.dead)continue;
  if(e.packId){
   let pack=combatPacks.get(e.packId);
   if(!pack){pack={count:0,leader:null,bearer:null};combatPacks.set(e.packId,pack)}
   pack.count++;if(e.packLead)pack.leader=e;if(e.soulBearer)pack.bearer=e;
  }
  const key=Math.floor(e.y/CROWD_CELL)*256+Math.floor(e.x/CROWD_CELL);
  let cell=crowdCells.get(key);if(!cell){cell=[];crowdCells.set(key,cell)}cell.push(e);
 }
}
function callPursuit(){
 if(++hostKills%(fl>=30?8:11)!==0)return;
 let closest=null,distance=Infinity;
 for(const e of E){
  if(!e.hostMob||e.dead||e.aw||!e.packLead)continue;
  const d=D(e,P);if(d<distance){closest=e;distance=d}
 }
 if(!closest)return;
 for(const e of E)if(e.packId===closest.packId&&!e.dead)e.aw=1;
}
function recoverOnHit(S,amount){
 const missing=Math.max(0,S.H-P.hp);
 if(fl<30)return Math.min(missing,amount);
 leechReserve=Math.min(S.H*.09,leechReserve+Math.max(0,tm-leechUpdated)*S.H*.09);
 leechUpdated=tm;
 const heal=Math.min(missing,amount,leechReserve);leechReserve-=heal;
 return heal;
}
function updateBearerAttack(e,dt,direct,distance){
 if(!e.soulBearer||fl<12)return;
 e.flameCd=(e.flameCd??(fl>=30?.6:1.4))-dt;
 if(e.flameCd>0||!direct||distance>380)return;
 e.flameCd=fl>=30?3.9:5.4;
 TG.push({owner:e,x:P.x,y:P.y,r:fl>=30?68:55,t:0,m:.92,d:e.baseD*(fl>=30?2.7:2.15),color:'#ff985a',soulFlame:true});
 spellArc(e,P,'#ef904b');
}
function alertHost(enemy){
 if(!enemy.packId||!enemy.hostMob||tm<packAlarmAt||D(P,enemy)>370)return;
 packAlarmAt=tm+1.6;
 let next=null,nearest=fl>=20?440:320;
 for(const e of E){
  if(e.dead||e.aw||!e.hostMob)continue;
  if(e.packId===enemy.packId){e.aw=1;continue}
  const d=D(enemy,e);
  if(d<nearest&&D(P,e)<530){nearest=d;next=e.packId}
 }
 if(next)for(const e of E)if(e.packId===next&&!e.dead)e.aw=1;
}
function placeHost(room,type,random,entry){
 const radius=ET[type].r,center={x:(room.cx+.5)*TS,y:(room.cy+.5)*TS};
 for(let k=0;k<36;k++){
  const x=(room.x+.55+random()*(room.w-1.1))*TS,y=(room.y+.55+random()*(room.h-1.1))*TS;
  const d=Math.hypot(x-center.x,y-center.y);
  if(entry&&(d<94||d>205))continue;
  if(!entry&&d>Math.min(148,room.w*TS*.52))continue;
  if(fits(x,y,radius))return {x,y};
 }
 return !entry&&fits(center.x,center.y,radius)?center:null;
}
function spawnDungeonHosts(n,random,isBossFloor){
 const rift=window.dodRift?.isActive?.(),late=n>=30||rift;
 const limit=late?Math.min(192,140+Math.floor(n*.6)):Math.min(128,44+n*3);
 const size=late?20+Math.min(6,Math.floor(n/14)):8+Math.min(9,Math.floor(n/2));
 const families=['Bone Guard','Grave Hunt','Hex Coven'];
 for(let index=0;index<rooms.length;index++){
  const entry=index===0,bossCourt=index===rooms.length-1&&isBossFloor;
  if(entry&&(n<4||n===6&&!rift||window.dodWhirlTrialLevel))continue;
  const remaining=rooms.length-index;
  const count=Math.min(entry?(late?14:7):bossCourt?(late?12:4):size,Math.ceil((limit-E.length)/remaining));
  const family=families[Math.floor(random()*3)],packId=n+'-'+index;
  for(let k=0;k<count;k++){
   const leader=k===0,carrier=k===2&&!entry&&!bossCourt&&n>=7;
   const ranged=k%8===4,bomber=n>=8&&k%12===6;
   const type=leader?(family==='Hex Coven'&&n>=5?'nc':n>=13?'dk':'zb'):carrier?'zb':ranged?'ar':bomber?'pb':k%7===5?'zb':'sk';
   const spot=placeHost(rooms[index],type,random,entry);if(!spot)continue;
   const elite=!entry&&(leader&&n>=7||late&&k===10);
   const e=mkE(type,spot.x,spot.y,n,E.length,elite);
   e.hostMob=true;e.packId=packId;e.packLead=leader;e.packType=family;e.packSize=count;e.packRole=ranged?'ranged':leader?'leader':'raider';
   e.soulBearer=carrier;e.flank=type==='sk'&&k%3===1?(k%2===0?1:-1):0;
   if(carrier){e.n='Soulflame Bearer';e.c='#ed975a'}
   const light=type==='sk'&&!elite;
   const health=light?.58:carrier?.94:elite&&late?1.55:1;
   e.mh=Math.max(1,Math.round(e.mh*health));e.hp=e.mh;
   e.baseD*=late?(light?1.02:Math.min(1.62,1.33+Math.max(0,n-30)*.008)):light?.85:1;
   e.baseSp*=light?1.28:late?1.13:1;e.sp=e.baseSp;e.d=e.baseD;
   if(light)e.xp=Math.max(1,Math.round(e.xp*.55));
   if(entry){e.aw=1;e.cd=.8+random()*.65}
   E.push(e);
  }
 }
 return E.length;
}
function unleashRupture(enemy,damage,hop=0){
 if(ruptureWaves.length>=12)return;
 ruptureWaves.push({x:enemy.x,y:enemy.y,damage,hop,age:0,radius:hop?92:154,struck:new Set(),echo:false});
 burst(enemy.x,enemy.y,hop?'#ffc581':'#fff0ae',hop?13:30,200,.35,3);
 snd(hop?205:103,hop?.09:.19,'triangle',.058,hop?-46:-32);
 sh=Math.max(sh,hop?1.8:3.6);
}
function updateRuptures(dt){
 for(const wave of ruptureWaves.slice()){
  wave.age+=dt;
  const reach=wave.radius*Math.min(1,wave.age/.31);
  for(const e of E){
   if(e.dead||wave.struck.has(e)||e.tk+(PD[e.id]||0)>=e.mh||D(wave,e)>reach+e.r||!hasSight(wave,e))continue;
   wave.struck.add(e);
   const damage=Math.min(wave.damage,e.t==='bs'||e.boss?e.mh*.045:e.el?e.mh*.4:Infinity);
   dealProcDamage(e,Math.max(1,Math.round(damage)),'rupture');
   if(!wave.echo&&wave.hop<2&&!e.soulBearer&&e.tk+(PD[e.id]||0)>=e.mh){
    wave.echo=true;unleashRupture(e,wave.damage*.68,wave.hop+1);
   }
  }
 }
 ruptureWaves=ruptureWaves.filter(wave=>wave.age<.42);
}
function drawRuptures(){
 g.save();g.lineJoin='round';
 for(const wave of ruptureWaves){
  const p=Math.min(1,wave.age/.31),r=Math.max(1,p*wave.radius);
  g.globalAlpha=Math.max(0,1-wave.age/.42);
  g.strokeStyle='#ff914a';g.lineWidth=5*(1-p)+1;
  g.beginPath();for(let i=0;i<=32;i++){const a=i*Math.PI/16,rad=r*(i%2?.96:1);g.lineTo(wave.x+Math.cos(a)*rad,wave.y+Math.sin(a)*rad)}g.closePath();g.stroke();
  g.strokeStyle='#ffedbb';g.lineWidth=2;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;g.beginPath();g.moveTo(wave.x+Math.cos(a)*r*.80,wave.y+Math.sin(a)*r*.80);g.lineTo(wave.x+Math.cos(a)*r*1.04,wave.y+Math.sin(a)*r*1.04);g.stroke()}
 }
 g.restore();
}
function drawBearerMark(e){
 const y=e.y-e.r-18+Math.sin(tm*4)*2;
 g.save();g.translate(e.x,y);g.scale(1,1/worldY());g.strokeStyle='#682f21';g.fillStyle='#fff0a1';g.lineWidth=2.5;
 g.beginPath();g.moveTo(0,-10);g.lineTo(7,-1);g.lineTo(0,7);g.lineTo(-7,-1);g.closePath();g.fill();g.stroke();
 g.fillStyle='#f07b42';g.fillRect(-2,-5,4,7);g.restore();
}
function dealProcDamage(enemy,damage,kind){
 if(enemy.dead||enemy.tk+(PD[enemy.id]||0)>=enemy.mh)return;
 enemy.tk+=damage;enemy.aw=1;enemy.fl=.10;
 if(enemy.id>=0)DM[enemy.id]=Math.round(enemy.tk);
 hitNumbers(enemy,damage,kind);
}

function openingEncounterEnemies(layout, depth) {
 const enemies = [];
 for (const encounter of layout.encounters) {
  const room = rooms[encounter.room];
  const training=depth===1&&quest.hookTraining&&encounter.room===1;
  const foes=training?[['sk',-50,-32],['sk',-50,32],['ar',42,0]]:encounter.foes.concat(depth===1&&encounter.room===1?[]:[['sk',-90,-32],['sk',54,72],['sk',18,-92],['sk',81,24]]);
  for (const [type, dx, dy, role] of foes) {
   const e = mkE(type, (room.cx+.5)*TS+dx, (room.cy+.5)*TS+dy, depth, enemies.length, role==='champion');
   e.openingPack = encounter.room;
   if(depth===1&&type!=='zb'){e.mh=Math.round(e.mh*.83);e.hp=e.mh;}
   e.required = Boolean(encounter.required);
   if (role==='guard' || role==='champion') {
    e.openingGuard = true;
    e.n = role==='champion' ? 'Bastion Warden' : 'Shield Knight';
    e.mh = Math.round(e.mh*(role==='champion'?.78:.7));
    e.hp = e.mh;
    if (role==='champion') {
     e.eliteType = 'bulwark';
     e.c = '#a9b5be';
     e.openingChampion = true;
    }
   }
   enemies.push(e);
  }
 }
 return enemies;
}


const CAMPAIGN_OBJECTIVES = [
 {id:'hunt',name:'Champion Hunt'},
 {id:'seal',name:'Blood Seal'},
 {id:'purge',name:'Purge the Depth'}
];
const CHAMPION_AFFIXES = [
 {id:'cinder',name:'Cinderbound',color:'#ff9b54'},
 {id:'storm',name:'Stormcaller',color:'#cba6ff'},
 {id:'rally',name:'Soulbinder',color:'#7fddcc'}
];
let campaignObjective = null;


const CAMPAIGN_RELICS = [
 {id:'war_echo',n:'War Echo',s:4,icon:'📿',st:{haste:4,sta:3},power:'Every sixth direct hit releases a shockwave around its target.'},
 {id:'emberglass',n:'Emberglass',s:4,icon:'📿',st:{crit:2,cdr:3},power:'Your first direct hit within 2.5 seconds after Evade ignites nearby enemies and restores 18% of your maximum mana.'},
 {id:'grave_lantern',n:'Grave Lantern',s:4,icon:'📿',st:{a:5,sta:4},power:'Killing an elite or boss restores 12% of your maximum health and resets Evade.'}
];

function campaignSpoilsReady(){
 if(!campaignObjective?.done)return false;
 const overcharged=fl===5&&campaignObjective.wave===3;
 return overcharged?!quest.overchargedSeal:!quest.campaignSpoils?.[fl];
}

function rollCampaignSpoils(){
 if(fl===5&&campaignObjective?.wave===3)return [0,2,7].map(slot=>mkItem(fl,.85,{lootSlot:slot,minRarity:2,lootLevel:lootItemLevel()+2}));
 if(fl>=LEGENDARY_DEPTH&&fl%4===0&&Math.random()<.2)return CAMPAIGN_RELICS.map(item=>makeLegendary(item));
 return [0,2,7].map(slot=>mkItem(fl,.85,{lootSlot:slot,minRarity:2}));
}

function closeCombatInput(){
 walkAttackStart=null;mouseAimHeld=false;held=0;stopWhirl();
 P.tgt=P.mv=null;
 Object.keys(keys).forEach(key=>{keys[key]=0});
 autoAttackHeld=false;
}

function showCampaignSpoils(){
 if(!campaignSpoilsReady())return;
 const dialog=$('campaignSpoils');
 campaignObjective.rewards??=rollCampaignSpoils();
 closeCombatInput();
 dialog.querySelector('[role=status]').textContent='';
 const buttons=campaignObjective.rewards.map(it=>{
  const button=document.createElement('button');
  button.type='button';
  button.className='campaign-reward';
  const name=document.createElement('strong'),detail=document.createElement('small');
  name.textContent=it.n;
  name.style.color=(RAR[it.r]||RAR[0])[1];
  detail.textContent=it.power||Object.entries(it.st).map(([stat,value])=>stat==='dMin'||stat==='dMax'?'':('+'+value+(PC[stat]?'%':'')+' '+(SN[stat]||stat))).filter(Boolean).slice(0,4).join(' · ');
  if(it.st.dMin)detail.textContent=it.st.dMin+'–'+it.st.dMax+' Damage · '+detail.textContent;
  button.append(name,detail);
  button.onclick=()=>{
   if(!campaignSpoilsReady())return;
   if(!canPickupItem(it)){
    dialog.querySelector('[role=status]').textContent='Free a backpack slot to claim this item.';
    return;
   }
   quest.campaignSpoils={...quest.campaignSpoils,[fl]:true};
   if(fl===5&&campaignObjective.wave===3)quest.overchargedSeal=true;
   campaignObjective.claimedReward=true;
   take({...it,keepRaw:true});
   window.dodGold?.add?.(30+fl*5);
   dialog.close();
   banner('Claimed '+it.n);
  };
  return button;
 });
 dialog.querySelector('.ringChoices').replaceChildren(...buttons);
 dialog.showModal();
}

const hasCampaignRelic = id => P.eq.some(item=>item&&(item.id===id||item.aspectId===id));
function applyCampaignRelicHit(enemy,stats){
 if(hasCampaignRelic('war_echo')&&(P.warEchoNext||0)<=tm){
  P.warEchoNext=tm+.12;
  P.warEchoCount=(P.warEchoCount||0)+1;
  if(P.warEchoCount>=6){
   P.warEchoCount=0;
   const radius=104;
   for(const foe of E){
    const distance=D(enemy,foe);
    if(!foe.dead&&distance<radius&&combatLineDistance(enemy.x,enemy.y,Math.atan2(foe.y-enemy.y,foe.x-enemy.x),distance)>=distance){
     hit(foe,Math.max(stats.AP,stats.SP)*.95,null,false,true);
    }
   }
   ring(enemy.x,enemy.y,radius,'#ffb678');
   snd(205,.16,'triangle',.05,115);
  }
 }
 if(hasCampaignRelic('emberglass')&&P.emberglassUntil>tm){
  P.emberglassUntil=0;
  P.mp=Math.min(stats.M,P.mp+stats.M*.18);
  for(const foe of E){
   const distance=D(enemy,foe);
   if(!foe.dead&&distance<106&&combatLineDistance(enemy.x,enemy.y,Math.atan2(foe.y-enemy.y,foe.x-enemy.x),distance)>=distance){
    applyIgnite(foe,Math.max(stats.AP,stats.SP)*.26,2.5);
   }
  }
  ring(enemy.x,enemy.y,106,'#ff8147');
  burst(enemy.x,enemy.y,'#ff994f',21,155,.4,3);
  snd(350,.13,'triangle',.05,-90);
 }
}

function campaignDepth(depth){
 return depth>=4&&!window.dodWhirlTrialLevel&&!window.dodRift?.isActive?.();
}

function campaignRoomLinks(floorRooms){
 const distance=(from,to)=>Math.abs(floorRooms[from].cx-floorRooms[to].cx)+Math.abs(floorRooms[from].cy-floorRooms[to].cy);
 const pending=floorRooms.map((_,i)=>i).slice(1), links=[];
 let from=0;
 while(pending.length){
  pending.sort((a,b)=>distance(from,a)-distance(from,b));
  const to=pending.shift();
  links.push([from,to]);
  from=to;
 }
 const order=[0,...links.map(link=>link[1])];
 floorRooms.splice(0,floorRooms.length,...order.map(index=>floorRooms[index]));
 // A short branch gives the player another way to approach the last rooms.
 const orderedLinks=floorRooms.slice(1).map((_,i)=>[i,i+1]);
 if(floorRooms.length>=5){
  const branch=floorRooms.length-2;
  if(distance(branch-2,branch)<16)orderedLinks.push([branch-2,branch]);
 }
 return orderedLinks;
}

function setCampaignChampion(enemy,affix){
 enemy.campaignAffix=affix;
 enemy.n=affix.name+' '+ET[enemy.t].n;
 if(!enemy.el){enemy.mh=Math.round(enemy.mh*1.7);enemy.hp=enemy.mh;enemy.xp*=1.45;}
 enemy.el=true;
 enemy.eliteType=affix.id==='rally'?'bulwark':affix.id==='storm'?'hexer':'crusher';
 enemy.c=affix.color;
 enemy.affixCooldown=.7;
}


const WITCH_LOOT={
 warrior:['stormcleaver','ironheart_plate','slipstream_boots'],
 pyromancer:['stormglass_staff','ember_vestments','coalheart_ring'],
 rogue:['glassfang','nightstalker_garb','slipstream_boots']
};

function witchRewardPool(){
 const cls=window.dodHeroClass||'warrior';
 return (WITCH_LOOT[cls]||WITCH_LOOT.warrior).map(id=>LEGENDARIES.find(item=>item.id===id)).filter(Boolean);
}


function canRaiseBloodSeal(){
 const seal=campaignObjective;
 return fl===5&&seal?.id==='seal'&&seal.done&&seal.wave===2&&!seal.claimedReward&&!quest.overchargedSeal&&D(P,seal.seal)<120;
}

function raiseBloodSeal(){
 if(!canRaiseBloodSeal()||whirlBlocked())return;
 const seal=campaignObjective;
 seal.done=false;seal.rewards=null;
 spawnSealWave(seal);
}

function witchHuntBoard(){
 const eligible=best>=6&&!window.dodRift?.isActive();
 return '<section class="forge-orders"><h3>Blood Witch hunt</h3><p>Depth 6 · '+(best>=LEGENDARY_DEPTH?'15% chance of a class Legendary per victory.':'Epic trophy. Reach Depth 12 to unlock the 15% Legendary roll.')+'</p>'+witchRewardPool().map(it=>'<article class="witch-loot-item"><span class="loot-icon">'+lootIcon(it)+'</span><div><strong>'+esc(it.n)+'</strong><small>'+esc(it.power)+'</small></div></article>').join('')+'<button data-hunt-witch '+(eligible?'':'disabled')+'>'+ (best<6?'Reach Depth 6':eligible?'Hunt the Blood Witch':'Finish your Waystone')+'</button></section>';
}
function attachWitchVictory(panel,items){
 const trophy=items.find(it=>it.bloodWitchDrop);
 if(!trophy)return;
 const box=document.createElement('section');
 box.className='forge-orders';
 const equipped=P.eq[trophy.s];
 box.innerHTML='<h3>Witch trophy · '+esc(trophy.n)+'</h3><small>Equipped · '+esc(equipped?.n||'Empty slot')+'</small>'+itemComparison(trophy)+'<div class="arow"><button data-witch-equip>Equip trophy</button><button data-witch-again>Hunt again</button><button data-witch-rift '+(window.dodProgressionV2?.state.campaignComplete?'':'disabled')+'>Open Waystone Rift</button></div><small role="status">'+(window.dodProgressionV2?.state.campaignComplete?'':'Waystones unlock after the Depth 30 Sovereign.')+'</small>';
 panel.querySelector('#bossRewardsClose').before(box);
 function collect(it){
  const index=LT.findIndex(drop=>drop.it===it);
  if(index<0)return true;
  if(!canPickupItem(it)){box.querySelector('[role=status]').textContent='Backpack full. Continue to manage gear and collect the remaining drops.';return false}
  LT.splice(index,1);it.keepRaw=true;take(it);return true;
 }
 box.querySelector('[data-witch-equip]').onclick=event=>{
  if(!collect(trophy))return;
  const index=P.inv.indexOf(trophy);if(index>=0)equip(index);
  const worn=P.eq[trophy.s]===trophy;
  event.target.disabled=worn;box.querySelector('[role=status]').textContent=worn?'Equipped '+trophy.n:'Trophy in backpack. Free space for displaced gear.';
 };
 function depart(rift){
  if(rift&&!window.dodProgressionV2?.state.campaignComplete)return;
  if(!items.every(collect))return;
  panel.style.display='none';if(rift)window.dodRift.openWaystone();else build(6);
 }
 box.querySelector('[data-witch-again]').onclick=()=>depart(false);
 box.querySelector('[data-witch-rift]').onclick=()=>depart(true);
}
function showWitchLedger(){
 if(!boss?.featuredWitch||whirlBlocked())return;
 const dialog=$('witchLedger'),pool=dialog.querySelector('.witch-loot-list');
 pool.replaceChildren(...witchRewardPool().map(item=>{
  const row=document.createElement('article'),icon=document.createElement('span');
  const text=document.createElement('div'),name=document.createElement('strong'),power=document.createElement('small');
  row.className='witch-loot-item';
  icon.className='loot-icon';icon.innerHTML=lootIcon(item);
  name.textContent=item.n;power.textContent=item.power||'Legendary equipment';
  text.append(name,power);row.append(icon,text);
  return row;
 }));
 closeCombatInput();
 dialog.showModal();
}

function canReplayWitch(){
 return boss?.featuredWitch&&boss.dead&&!LT.some(drop=>drop.it?.bloodWitchDrop)&&!P.dead;
}

function configureAshRunner(enemy){
 enemy.n='The Ash Runner';
 enemy.huntRunner={reinforcements:false,warning:0,trail:0};
 enemy.c='#76d1c1';
 enemy.baseSp=Math.max(82,enemy.baseSp);
 enemy.rg=186;
}

function updateAshRunner(enemy,dt,direct,distance){
 const runner=enemy.huntRunner;
 if(!runner)return false;
 if(!runner.reinforcements&&enemy.hp/enemy.mh<.62){
  runner.reinforcements=true;runner.warning=.85;
  spellBurst(enemy.x,enemy.y,58,'#8af5d7');
  banner('The Ash Runner calls reinforcements');
  return true;
 }
 if(runner.warning>0){
  runner.warning-=dt;
  if(runner.warning<=0){
   const nearby=[0,Math.PI/2,Math.PI,Math.PI*1.5].map(angle=>({
    x:enemy.x+Math.cos(angle)*63,y:enemy.y+Math.sin(angle)*63
   })).filter(point=>fits(point.x,point.y,14)).slice(0,3);
   for(const point of nearby){
    const minion=mkE('sk',point.x,point.y,fl,-1,false);
    minion.aw=1;minion.cd=.9;minion.c='#8be1cd';
    E.push(minion);spellBurst(point.x,point.y,25,'#78e2c4');
   }
   enemy.cd=.45;
  }
  return true;
 }
 if(!direct||distance>151)return false;
 const angle=Math.atan2(enemy.y-P.y,enemy.x-P.x);
 const retreat=enemy.sp*1.22*(enemy.sl>0?.52:1)*dt,dx=Math.cos(angle)*retreat,dy=Math.sin(angle)*retreat;
 const x=enemy.x,y=enemy.y;
 mv(enemy,dx,dy);
 if(Math.hypot(enemy.x-x,enemy.y-y)<.08)return false;
 runner.trail-=dt;
 if(runner.trail<=0){
  runner.trail=.11;burst(x,y,'#80ecd0',4,42,.5,2);
 }
 return true;
}

function updateBloodWitch(enemy,dt){
 const cast=enemy.witchCast||={time:1.5,wave:0,kind:'approach'};
 cast.time-=dt;
 if(cast.kind==='channel'){
  if(cast.time>0)return true;
  cast.kind='recover';cast.time=1.05;
  enemy.bossPattern={state:'recover'};
  return true;
 }
 if(cast.kind==='recover'){
  if(cast.time>0)return true;
  enemy.bossPattern=null;
  cast.kind='approach';cast.time=(enemy.phase||0)===2?.52:1.1;
 }
 const distance=D(enemy,P);
 if(cast.time>0||distance>392||!hasSight(enemy,P)){
  const angle=Math.atan2(P.y-enemy.y,P.x-enemy.x);
  const travel=distance>208?1:distance<105?-1:0;
  if(travel)moveCombatEnemy(enemy,angle,enemy.sp*travel*.7,dt);
  return true;
 }
 const pattern=cast.wave++%2,phase=enemy.phase||0;
 const duration=phase===2?.88:1.12,positions=[],color=pattern?'#c5a0ff':'#ff8197';
 if(!pattern){
  const angle=Math.atan2(P.y-enemy.y,P.x-enemy.x)+Math.PI/2;
  for(let i=-2;i<=2;i++)positions.push({x:P.x+Math.cos(angle)*i*65,y:P.y+Math.sin(angle)*i*65,r:42});
  if(phase>0)positions.push({x:P.x+Math.sin(angle)*104,y:P.y-Math.cos(angle)*104,r:43});
 }else{
  for(let i=0;i<7;i++){
   const angle=enemy.fa+i*Math.PI*2/7;
   positions.push({x:P.x+Math.cos(angle)*104,y:P.y+Math.sin(angle)*104,r:42});
  }
  if(phase===2)positions.push({x:P.x,y:P.y,r:32});
 }
 for(const point of positions){
  if(wl(point.x,point.y))continue;
  TG.push({...point,t:0,m:duration,d:enemy.d*(pattern?1.48:1.4),color,owner:enemy,witchRune:true});
 }
 cast.kind='channel';cast.time=duration;
 spellBurst(enemy.x,enemy.y,73,color);
 snd(pattern?460:305,.29,'triangle',.065,190);
 return true;
}

function spawnOpeningRush(){
 const room=rooms[1];
 const troops=['zb','sk','ar','pb','sk','sk','ar'];
 if(!room)return;
 for(let i=0;i<troops.length;i++){
  const type=troops[i],angle=i*Math.PI*2/troops.length+.26;
  const center={x:(room.cx+.5)*TS,y:(room.cy+.5)*TS};
  const spot=[75,57,38].map(d=>({x:center.x+Math.cos(angle)*d,y:center.y+Math.sin(angle)*d}))
   .find(p=>fits(p.x,p.y,ET[type].r));
  if(!spot)continue;
  const enemy=mkE(type,spot.x,spot.y,fl,7800+i,false);
  enemy.rushPack=true;enemy.cd=.72+i*.08;enemy.mh*=.78;enemy.hp=enemy.mh;enemy.baseD*=.84;enemy.d=enemy.baseD;
  E.push(enemy);
 }
}


const BLOOD_WITCH_COURT={rooms:[[14,27,7,7],[24,25,9,9],[37,21,13,13]]};

function drawEncounterSetpieces(){
 if(boss?.featuredWitch){
  const room=rooms.at(-1),x=(room.cx+.5)*TS,y=(room.cy+.5)*TS;
  if(!inView(x,y,190))return;
  g.save();g.translate(x,y);
  g.strokeStyle='#ba7eae7a';g.fillStyle='#b0539620';g.lineWidth=2;
  g.beginPath();g.arc(0,0,157,0,Math.PI*2);g.fill();g.stroke();
  g.beginPath();g.arc(0,0,146,0,Math.PI*2);g.stroke();
  for(let i=0;i<8;i++){
   g.rotate(Math.PI/4);
   heroPolygon(g,[[132,0],[139,-7],[146,0],[139,7]],null,'#da91ac8d',1.7);
  }
  g.restore();
  return;
 }
 if(fl===7&&campaignObjective?.id==='purge'){
  const room=rooms[1],x=(room.cx+.5)*TS,y=(room.cy+.5)*TS;
  if(!inView(x,y,120))return;
  g.save();g.translate(x,y);
  const awake=E.some(enemy=>enemy.rushPack&&enemy.aw&&!enemy.dead);
  g.strokeStyle=awake?'#f4985aab':'#a4715068';g.lineWidth=2;
  g.beginPath();g.arc(0,0,38,0,Math.PI*2);g.stroke();
  g.rotate(tm*.7);
  for(let i=0;i<6;i++){
   g.rotate(Math.PI/3);
   heroLine(g,30,0,45,0,2,awake?'#ffac65':'#9d7557');
  }
  g.restore();
 }
}

function drawWitchRunes(){
 for(const q of TG){
  if(!q.witchRune||q.owner?.dead||!inView(q.x,q.y,90))continue;
  const progress=Math.min(1,q.t/q.m);
  g.save();g.translate(q.x,q.y);
  g.strokeStyle=q.color;g.fillStyle=q.color;
  g.globalAlpha=.48+progress*.43;g.lineWidth=1.7+progress*.7;
  if(!prefState.highPerformance){g.shadowColor=q.color;g.shadowBlur=11;}
  g.beginPath();g.arc(0,0,q.r,0,Math.PI*2);g.stroke();
  g.rotate(tm*(q.color==='#ff8197'?1:-1));
  heroPolygon(g,[[0,-q.r*.7],[q.r*.62,0],[0,q.r*.7],[-q.r*.62,0]],null,q.color,1.6);
  g.beginPath();g.arc(0,0,q.r*progress*.62,0,Math.PI*2);g.stroke();
  g.restore();
 }
}

function drawWitchFigure(enemy){
 const t=tm*2,casting=enemy.witchCast?.kind==='channel',color=casting?'#ff8eab':'#d284b3';
 g.save();g.translate(enemy.x,enemy.y);
 heroOval(g,0,10,27,15,'#0a070e98');
 g.translate(0,-6-Math.sin(t)*3);
 g.strokeStyle=color;g.lineWidth=2;g.globalAlpha=casting?.84:.42;
 if(!prefState.highPerformance){g.shadowColor=color;g.shadowBlur=14;}
 g.beginPath();g.ellipse(0,3,29,18,0,t,t+Math.PI*1.45);g.stroke();
 g.globalAlpha=1;g.shadowBlur=0;
 g.rotate(enemy.fa);
 heroPolygon(g,[[-27,-15],[-8,-14],[7,-12],[15,0],[6,12],[-8,14],[-27,16],[-19,0]],'#613253','#211625',2.2);
 heroPolygon(g,[[-14,-9],[-3,-10],[5,0],[-3,10],[-14,9],[-9,0]],'#a85580','#4b2d49',1.3);
 heroPolygon(g,[[0,-7],[8,-10],[17,-4],[19,1],[15,8],[8,9],[2,5]],'#33273d','#27182a',1.5);
 heroLine(g,13,-4,14,4,1.8,'#ffe0d4');
 for(const side of [-1,1]){
  heroLine(g,-3,side*8,5,side*21,2,'#c77a99');
  heroOval(g,6,side*21,3.7,3.7,color);
 }
 g.restore();
}

function setupCampaignObjective(depth){
 if(!campaignDepth(depth)||depth%3===0||!E.length)return null;
 const index=depth-4-Math.floor((depth-4)/3);
 const type=CAMPAIGN_OBJECTIVES[index%CAMPAIGN_OBJECTIVES.length];
 const objective={...type,depth,targets:[],goal:0,done:false,seal:null,wave:0,delay:0,rewards:null};
 if(type.id==='hunt'){
  const leaders=E.filter(enemy=>enemy.packLead);
  const picks=[leaders[0],leaders[Math.ceil((leaders.length-1)*.65)]].filter(Boolean);
  objective.targets=[...new Set(picks)];
  objective.targets.forEach((enemy,i)=>setCampaignChampion(enemy,CHAMPION_AFFIXES[(depth+i)%CHAMPION_AFFIXES.length]));
  if(depth===4&&objective.targets[0])configureAshRunner(objective.targets[0]);
 }else if(type.id==='purge'){
  objective.targets=E.slice();
  objective.goal=Math.min(E.length,Math.max(5,Math.ceil(E.length*.57)));
  if(depth===7)objective.name='The Foundry';
 }else{
  const chamber=rooms[Math.max(1,Math.floor(rooms.length/2))];
  objective.seal={x:(chamber.cx+.5)*TS,y:(chamber.cy+.5)*TS};
 }
 return objective;
}

function campaignProgress(objective){
 const dead=objective.targets.filter(enemy=>enemy.dead).length;
 if(objective.id==='hunt')return {value:dead,max:objective.targets.length,label:'Champions defeated'};
 if(objective.id==='purge')return {value:Math.min(dead,objective.goal),max:objective.goal,label:'Enemies defeated'};
 return {value:objective.wave,max:2,label:'Seals opened'};
}

function spawnSealWave(objective){
 objective.wave++;
 objective.targets=[];
 const foes=objective.wave===1?['sk','zb','ar','sk']:objective.wave===2?['dk','ar','pb','sk','sk']:['dk','nc','ar','pb','sk','dk','ar'];
 const extra=fl===5?objective.wave*2:Math.min(20,Math.floor(fl/2)+objective.wave*2);
 for(let k=0;k<extra;k++)foes.push(k%6===4?'ar':'sk');
 for(let i=0;i<foes.length;i++){
  const type=foes[i],angle=i/foes.length*Math.PI*2+objective.wave*.38;
  const candidate=[92,66,38].map(radius=>({
   x:objective.seal.x+Math.cos(angle)*radius,
   y:objective.seal.y+Math.sin(angle)*radius
  })).find(point=>fits(point.x,point.y,ET[type].r));
  if(!candidate)continue;
  const enemy=mkE(type,candidate.x,candidate.y,fl,15000+objective.wave*100+i,false);
  enemy.aw=1;
  enemy.cd=.65+i*.12;
  enemy.packId="blood-seal-"+fl+"-"+objective.wave;
  enemy.packType="Bone Guard";
  enemy.packLead=i===0;
  if(objective.wave>=2&&(i===0||objective.wave===3&&i===3))setCampaignChampion(enemy,CHAMPION_AFFIXES[(fl+i)%CHAMPION_AFFIXES.length]);
  if(objective.wave===3)spellBurst(enemy.x,enemy.y,29,'#ffd0b7');
  E.push(enemy);
  objective.targets.push(enemy);
  burst(enemy.x,enemy.y,'#e46385',14,125,.42,3);
 }
 ring(objective.seal.x,objective.seal.y,140,'#fa628d');
 if(objective.wave===3){spellBurst(objective.seal.x,objective.seal.y,153,'#ffb3a6');banner('Blood Seal · Overcharged')}
 else banner('Blood Seal · Wave '+objective.wave+' of 2');
 snd(126,.22,'triangle',.07,-55);
}

function canOpenBloodSeal(){
 return campaignObjective?.id==='seal'&&!campaignObjective.wave&&D(P,campaignObjective.seal)<66;
}

function openBloodSeal(){
 if(!canOpenBloodSeal()||whirlBlocked()||$('campaignSpoils').open)return;
 spawnSealWave(campaignObjective);
}

function updateCampaignObjective(dt){
 const objective=campaignObjective;
 if(!objective||objective.done||P.dead)return;
 const remaining=objective.targets.some(enemy=>!enemy.dead);
 if(objective.id==='seal'){
  if(!objective.wave||remaining)return;
  if(objective.wave===1){
   objective.delay+=dt;
   if(objective.delay>=1.05)spawnSealWave(objective);
   return;
  }
 }else if(objective.id==='hunt'?remaining:campaignProgress(objective).value<objective.goal)return;
 objective.done=true;
 advanceForgeOrder(4);
 ring(P.x,P.y,125,'#f6cd79');
 snd(530,.26,'triangle',.055,290);
 banner(campaignSpoilsReady()?'Depth cleared · Claim your spoils':'Depth cleared · Descent unlocked');
}

function updateCampaignChampion(enemy,dt,direct,distance){
 const affix=enemy.campaignAffix;
 if(!affix||affix.id==='rally')return;
 enemy.affixCooldown=Math.max(0,enemy.affixCooldown-dt);
 if(enemy.affixCooldown>0||!direct||distance>305)return;
 const storm=affix.id==='storm',angle=enemy.fa+Math.PI/2;
 for(const offset of storm?[-69,0,69]:[0]){
  const x=P.x+Math.cos(angle)*offset,y=P.y+Math.sin(angle)*offset;
  if(!wl(x,y))TG.push({x,y,r:storm?43:68,t:0,m:storm?.82:1.05,d:enemy.d*(storm?1.12:1.5),color:affix.color});
 }
 enemy.affixCooldown=storm?4.2:4.9;
 snd(storm?280:145,.17,'triangle',.045,80);
}


function drawCampaignSeal(){
 const objective=campaignObjective;
 if(objective?.id!=='seal')return;
 const {x,y}=objective.seal;
 if(!inView(x,y,110))return;
 const raised=objective.wave===3,ready=!objective.wave||(objective.done&&objective.wave===2&&fl===5&&!objective.claimedReward&&!quest.overchargedSeal);
 const color=raised?'#ffc3ae':objective.done&&!ready?'#d7ab70':ready?'#fc9ebf':'#e16d9a';
 const radius=raised?63:ready?46:52,pulse=.8+Math.sin(tm*5)*.17;
 g.save();g.translate(x,y);
 g.strokeStyle=color;g.fillStyle=color;g.lineWidth=2;
 if(!prefState.highPerformance){g.shadowColor=color;g.shadowBlur=13;}
 g.globalAlpha=.12*pulse;g.beginPath();g.arc(0,0,radius,0,Math.PI*2);g.fill();
 g.globalAlpha=.81*pulse;g.beginPath();g.arc(0,0,radius,0,Math.PI*2);g.stroke();
 g.rotate(tm*(raised?.62:.25));g.globalAlpha=.79;
 for(let i=0;i<8;i++){
  g.rotate(Math.PI/4);
  heroPolygon(g,[[radius-4,0],[radius+3,-4],[radius+7,0],[radius+3,4]],null,color,1.12);
 }
 g.rotate(tm*-.7);g.beginPath();g.arc(0,0,radius*.59,0,Math.PI*2);g.stroke();
 heroPolygon(g,[[0,-21],[21,0],[0,21],[-21,0]],null,color,1.7);
 g.restore();
}
function exitOpen() {
 return !window.dodRift?.isActive?.()&&bossDone&&(!campaignObjective||campaignObjective.done)&&!E.some(e=>e.required&&!e.dead);
}

function gen(n){const campaign=campaignDepth(n),layout=openingLayout(n)||(n===6&&campaign?BLOOD_WITCH_COURT:null),r=mk(n*7919+13+(window.dodDailySeedOffset||0)),T=new Uint8Array(N*N),rooms=layout?layout.rooms.map(([x,y,w,h])=>({x,y,w,h,cx:x+(w>>1),cy:y+(h>>1)})):[],props=[],span=campaign?(n<12?40:46):n<6?Math.floor(N*.68):n<12?Math.floor(N*.84):N,margin=2+Math.floor((N-span)/2),roomLimit=campaign?(n<12?7:9):n<6?8:n<12?10:13,sizeRange=n<6?5:n<12?6:7;
 for(let i=0;!layout&&i<90&&rooms.length<roomLimit;i++){const w=5+(r()*sizeRange|0),h=5+(r()*sizeRange|0),x=margin+(r()*(span-w-4)|0),y=margin+(r()*(span-h-4)|0);
  if(rooms.some(o=>x<o.x+o.w+2&&x+w+2>o.x&&y<o.y+o.h+2&&y+h+2>o.y))continue;rooms.push({x,y,w,h,cx:x+(w>>1),cy:y+(h>>1)})}
 rooms.forEach(o=>{for(let j=o.y;j<o.y+o.h;j++)for(let i=o.x;i<o.x+o.w;i++)T[j*N+i]=1});
 const wide=!layout&&n>=8&&!window.dodWhirlTrialLevel;
 const links=layout?.links||(campaign||wide?campaignRoomLinks(rooms):rooms.slice(1).map((_,i)=>[i,i+1]));
 if(wide){for(let i=0;i+2<rooms.length;i+=3){if(!links.some(([from,to])=>from===i&&to===i+2))links.push([i,i+2])}}
 for(const [from,to] of links){const a=rooms[from],b=rooms[to];let x=a.cx,y=a.cy;
  while(x!=b.cx){T[y*N+x]=T[(y+1)*N+x]=1;if(wide){T[(y-1)*N+x]=T[(y+2)*N+x]=1}x+=x<b.cx?1:-1}
  while(y!=b.cy){T[y*N+x]=T[y*N+x+1]=1;if(wide){T[y*N+x-1]=T[y*N+x+2]=1}y+=y<b.cy?1:-1}}
 rooms.forEach((o,i)=>{props.push({x:o.x+1,y:o.cy,kind:'torch'});if(layout){props.push({x:o.x+o.w-2,y:o.cy,kind:'torch'});return}const count=i===rooms.length-1?2:(r()<.55?1:0);for(let j=0;j<count;j++){const sx=r()<.5?o.x+1:o.x+o.w-2,sy=r()<.5?o.y+1:o.y+o.h-2;T[sy*N+sx]=0;props.push({x:sx,y:sy,kind:r()<.55?'pillar':'rubble'})}});
 rooms.forEach((o,i)=>{if(i===0)return;const count=1+(r()<.55?1:0);for(let j=0;j<count;j++){const x=o.x+1+(r()*(o.w-2)|0),y=o.y+1+(r()*(o.h-2)|0),roll=r(),kind=roll<.38?'bones':roll<.68?'urn':roll<.84?'web':'banner';props.push({x,y,kind})}});
 return{T,rooms,r,props}}
function mkE(t,x,y,n,id,el){const b=ET[t]||ET.sk,depth=Math.max(1,n),trialLevel=window.dodWhirlTrialLevel,level=trialLevel?Math.max(1,Math.floor(trialLevel)):Math.max(1,depth,Math.min(P.lv,depth+4)),hpScale=1+(level-1)*(t==='bs'?.165:.22)+Math.pow(Math.max(0,level-6),1.36)*(t==='bs'?.04:.046),earlySoft=depth<=2&&t!=='bs'?.9:1,damageScale=(1+(level-1)*.095+Math.pow(Math.max(0,level-8),1.32)*.019)*earlySoft,m=el?1.58:1;let mh=b.hp*hpScale*m*(trialLevel?2.2:1),d=b.d*(t==='bs'?1.15:1.12)*damageScale,sp=b.sp,rg=b.rg,r=b.r,c=b.c,eliteType='',eliteSub='';if(el){eliteType=['bulwark','ravager','hexer','crusher'][RI(0,3)];if(eliteType==='bulwark'){mh*=1.28;d*=.92;sp*=.86;r*=1.1;c='#93a8b8'}else if(eliteType==='ravager'){mh*=1.02;d*=1.25;sp*=1.18;c='#bd5145'}else if(eliteType==='hexer'){mh*=.98;d*=1.06;rg=Math.max(rg,220);c='#a37bc4'}else{mh*=1.15;d*=1.15;sp*=.94;c='#c88949'}if(depth>=22&&Math.random()<.55)eliteSub='void';else if(depth>=13&&Math.random()<.35)eliteSub='miasma';else if(depth>=7&&Math.random()<.32)eliteSub='frost'}const bossName=n===30?'The Abyssal Sovereign':['The Butcher','Blood Witch','Grave Lord','Abyssal Dragon'][Math.floor((n/3-1)%4)];const bossStyle=t==='bs'?(n===30?'sovereign':bossName==='Abyssal Dragon'?'dragon':bossName==='Grave Lord'?'gravelord':bossName==='Blood Witch'?'witch':'butcher'):'';const baseD=d*(el?1.24:1);return{t,id,x,y,r:r*(el?1.15:1),mh,hp:mh,tk:0,d:baseD,baseD,baseBossD:t==='bs'?baseD:0,sp,baseSp:sp,c,xp:b.xp*(1+(level-1)*.17)*(el?1.7:1),rg,n:el?((eliteSub==='void'?'Void ':eliteSub==='miasma'?'Sunken ':eliteSub==='frost'?'Frost ':'')+({bulwark:'Bulwark',ravager:'Ravager',hexer:'Hexer',crusher:'Crusher'}[eliteType]+' '+b.n)):t==='bs'?bossName:b.n,el,eliteType,eliteSub,bossStyle,form:RI(0,3),cd:R(0,.7),fl:0,sl:0,aw:0,ph:0,t1:R(2,4),dead:0,fa:0,igniteT:0,igniteD:0,igniteTick:0,shockT:0,summonCount:0,summonCd:R(2.5,5)}}
let combatVFX=[];
function combatEffect(kind,x,y,a=0,details={}){combatVFX.push({...details,kind,x,y,a,t:0,m:details.duration??(kind==='groundslam'?.85:kind==='charge'?.24:kind==='whirlwind'?.48:kind==='shieldbash'?.3:.23)});if(combatVFX.length>48)combatVFX.shift()}
function drawSlamCharge(v,p){
 if(v.kind==='groundslam'){
  const reach=Math.min(1,p/.24),fade=Math.pow(1-p,.7),radius=v.radius||145;
  g.globalCompositeOperation='source-over';
  for(let i=0;i<9;i++){
   const angle=i*Math.PI*2/9+Math.sin(i*7.1)*.16;g.save();g.rotate(angle);g.beginPath();g.moveTo(12,0);
   for(let j=1;j<=4;j++)g.lineTo((12+(radius-12)*j/4)*reach,Math.sin(i*3+j*2.4)*9*reach);
   g.globalAlpha=fade*.85;g.strokeStyle='#21100d';g.lineWidth=5;g.stroke();g.strokeStyle='#d68b52';g.lineWidth=1.5;g.stroke();
   g.beginPath();g.moveTo(radius*.5*reach,Math.sin(i*3+4.8)*9*reach);g.lineTo(radius*.64*reach,18*reach);g.lineTo(radius*.8*reach,24*reach);g.stroke();g.restore();
  }
  if(p<.5){g.globalCompositeOperation='lighter';g.globalAlpha=(1-p/.5)*.65;g.strokeStyle='#f4c58b';g.lineWidth=4*(1-p/.5)+1;g.beginPath();g.arc(0,0,radius*Math.min(1,p/.38),0,Math.PI*2);g.stroke()}
 }else{
  g.globalCompositeOperation='lighter';g.globalAlpha=(1-p)*.42;g.strokeStyle='#c5e2e5';g.lineWidth=2;
  const length=v.length||24;for(const side of[-1,1]){g.beginPath();g.moveTo(-length-12*p,side*12);g.quadraticCurveTo(-length*.5,side*16,4,side*8);g.stroke()}
  g.globalAlpha=(1-p)*.13;g.fillStyle='#dbd8ba';g.beginPath();g.ellipse(-length*.35,0,12,10,0,0,Math.PI*2);g.fill();
 }
}

function spellArc(from,to,color,style='arc'){
 const dx=to.x-from.x,dy=to.y-from.y;
 combatEffect('spell',from.x,from.y,Math.atan2(dy,dx),{length:Math.hypot(dx,dy),color,style,duration:.21});
}
function spellBurst(x,y,radius,color){
 combatEffect('spell',x,y,0,{radius,color,style:'burst',duration:.46});
 burst(x,y,color,34,245,.52,3);
 ring(x,y,radius,color);
 sh=Math.max(sh,2.3);
}
function drawSpellEffect(v,p){
 const fade=1-p;
 g.shadowColor=v.color;g.shadowBlur=prefState.highPerformance?0:12;
 g.strokeStyle=v.color;g.fillStyle=v.color;
 if(v.style==='burst'){
  const spread=v.radius*Math.min(1,.19+p*2.1);
  g.globalAlpha=fade*.13;g.beginPath();g.arc(0,0,spread,0,Math.PI*2);g.fill();
  g.globalAlpha=fade*.78;g.lineWidth=1+fade*2.4;g.beginPath();g.arc(0,0,spread,0,Math.PI*2);g.stroke();
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4;
   g.beginPath();g.moveTo(Math.cos(a)*spread*.66,Math.sin(a)*spread*.66);
   g.lineTo(Math.cos(a)*spread*1.13,Math.sin(a)*spread*1.13);g.stroke();
  }
  return;
 }
 if(v.style==='cut'){
  for(let i=0;i<3;i++){
   g.globalAlpha=fade*(.75-i*.2);g.lineWidth=5-i;
   const radius=v.length*(.79+p*.21)-i*9;if(radius<=0)continue;g.beginPath();g.arc(0,0,radius,-1.28+i*.15,1.28+i*.15);g.stroke();
  }
  return;
 }
 const segments=Math.max(2,Math.ceil(v.length/18));
 const line=()=>{
  g.beginPath();g.moveTo(0,0);
  for(let i=1;i<segments;i++)g.lineTo(i*v.length/segments,Math.sin(i*12.41+v.t*29)*Math.min(v.style==='hook'?5:12,v.length*.18));
  g.lineTo(v.length,0);
 };
 g.globalAlpha=fade*.39;g.lineWidth=v.style==='hook'?7:9;line();g.stroke();
 g.globalAlpha=fade;g.lineWidth=2.3;g.strokeStyle='#fff5ed';line();g.stroke();
}

function drawAdvancedSpells(){
 drawAwakeningFields();
 g.save();
 for(const field of spellFields){
  if(Math.abs(field.x-P.x)>W/2+150||Math.abs(field.y-P.y)>H/2+190)continue;
  g.save();g.translate(field.x,field.y);
  const armed=field.age>=field.arm;
  g.fillStyle=field.color;g.strokeStyle=field.color;
  g.globalAlpha=armed?.09:.21;g.beginPath();g.arc(0,0,field.radius,0,Math.PI*2);g.fill();
  g.globalAlpha=armed?.6:.92;g.lineWidth=armed?1.5:2.5;
  g.setLineDash(armed?[]:[6,6]);g.stroke();g.setLineDash([]);
  g.rotate(field.age*(field.kind==='nightsnare'?.36:-.43));
  for(let i=0;i<4;i++){
   g.rotate(Math.PI/2);
   const edge=field.radius*.7;
   g.beginPath();g.moveTo(edge-9,0);g.lineTo(edge,-8);g.lineTo(edge+9,0);g.lineTo(edge,8);g.closePath();g.stroke();
  }
  g.restore();
 }
 if(stormHalo){
  const count=prefState.highPerformance?5:12;
  g.globalCompositeOperation='lighter';
  for(let i=0;i<3;i++){
   for(let j=count-1;j>=0;j--){
    const position=stormOrb(stormHalo,i,stormHalo.age-j*.035),radius=10-j*.46;
    if(wl(position.x,position.y))continue;
    g.globalAlpha=(1-j/count)*.64;
    g.shadowColor='#7eaaff';g.shadowBlur=prefState.highPerformance?0:14;
    g.fillStyle=j===0?'#e6f5ff':'#7798ff';
    g.beginPath();g.arc(position.x,position.y,radius,0,Math.PI*2);g.fill();
    if(j===0){
     g.shadowBlur=0;g.fillStyle='#fff';
     g.beginPath();g.arc(position.x,position.y,3.3,0,Math.PI*2);g.fill();
    }
   }
  }
 }
 g.restore();
}


function hitNumbers(enemy,amount,kind){
 const seq=enemy.damageLane=((enemy.damageLane||0)+1)%7;
 const originY=enemy.y-enemy.r;
 const recent=FT.slice(-42),seed=(enemy.id||0)%7+7;
 let x=enemy.x,y=originY,lane=0;
 for(let i=0;i<7;i++){
  const index=(seq+seed+i)%7;
  lane=(index-3)*19;
  x=enemy.x+lane;y=originY-(index%4)*14;
  const crowded=recent.some(hit=>isHitNumber(hit.kind)&&Math.abs(hit.x-x)<21&&Math.abs(hit.y-y)<17);
  if(!crowded)break;
 }
 const color=kind==='crit'?'#ffe184':kind==='rupture'?'#ffcc86':kind==='shock'?'#aadaff':kind==='burn'?'#ffac69':kind==='bleed'?'#ed8caa':'#fff4dd';
 ft(x,y,amount,color,1,kind);
 FT[FT.length-1].vx=lane*1.45;
}
function drawFloatingHit(f){
 if(Math.abs(f.x-P.x)>W/2+100||Math.abs(f.y-P.y)>H/2+160)return;
 const critical=f.kind==='crit',damage=isHitNumber(f.kind);
 const age=f.t,fade=1-Math.max(0,(age-f.life*.48)/(f.life*.52));
 const periodic=f.kind==='bleed'||f.kind==='burn';
 const impact=Math.max(0,1-age/(critical?.14:.10));
 const size=Math.round((critical?32:periodic?16:damage?23:14)*f.s*(1+(critical?.42:.2)*impact*impact));
 g.save();g.translate(f.x,f.y);g.scale(1,1/worldY());
 g.globalAlpha=fade;
 g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
 g.font=(damage?'700 '+size+'px "Barlow Condensed", sans-serif':'600 '+size+'px "DM Sans", sans-serif');
 g.strokeStyle=critical?'#362016':'#201420';g.lineWidth=critical?5:damage?3.8:2;
 g.fillStyle=f.c;
 if(critical&&!prefState.highPerformance){
  g.shadowBlur=10;
  g.shadowColor='#ffb651';
 }
 if(critical){
  const gold=g.createLinearGradient(0,-size*.45,0,size*.45);
  gold.addColorStop(0,'#fffbe5');gold.addColorStop(.46,'#ffe09a');gold.addColorStop(1,'#ffa13e');g.fillStyle=gold;
 }
 const digits=f.kind==='damageTaken'?'−'+f.txt:f.txt;
 g.strokeText(digits,0,0);g.fillText(digits,0,0);
 if(critical&&age<.31){
  const width=g.measureText(f.txt).width/2+6;
  g.globalAlpha=fade*.7;g.shadowBlur=0;g.strokeStyle='#ffe594';g.lineWidth=1.5;
  for(const side of [-1,1]){
   g.beginPath();g.moveTo(side*width,-5);g.lineTo(side*(width+6),-10);g.stroke();
   g.beginPath();g.moveTo(side*(width+2),3);g.lineTo(side*(width+8),1);g.stroke();
  }
 }
 g.restore();
}

function drawCombatVFX(){g.save();g.globalCompositeOperation='lighter';for(const v of combatVFX){const p=v.t/v.m;g.save();g.translate(v.x,v.y);g.rotate(v.a);g.globalAlpha=(1-p)*.8;g.lineCap='round';
 if(v.kind==='spell'){drawSpellEffect(v,p)}else if(v.kind==='groundslam'||v.kind==='charge'){drawSlamCharge(v,p)}else if(v.kind==='shieldbash'){g.strokeStyle='#ffe1a0';g.lineWidth=4*(1-p)+1;g.beginPath();g.arc(30,0,12+36*p,-1.9,1.9);g.stroke();for(let i=0;i<7;i++){const a=-1.2+i*.4;g.beginPath();g.moveTo(30+Math.cos(a)*(12+p*25),Math.sin(a)*(12+p*25));g.lineTo(30+Math.cos(a)*(24+p*40),Math.sin(a)*(24+p*40));g.stroke()}}
 else{const spin=v.kind==='whirlwind',radius=spin?88:65,start=spin?p*Math.PI*4:-1.3+p*1.7;for(let i=0;i<3;i++){g.strokeStyle=i===0?'#fff3d4':spin?'#b9d8e8':'#d8b67b';g.lineWidth=(i===0?3:7)*(1-p);g.globalAlpha=(1-p)*(i===0?.9:.22);g.beginPath();g.arc(0,0,radius-i*7,start-i*.12,start+(spin?4.5:1.25));g.stroke()}}
 g.restore()}g.restore()}
function drawEnemyCombat(e){g.save();if(e.dead){const p=1-(e.deathVisual||0)/.42;g.globalAlpha=Math.max(0,1-p);g.translate(e.x,e.y);g.rotate(p*.65);g.scale(1-p*.25,1-p*.7);g.translate(-e.x,-e.y);drawEnemyFigure(e)}else{const k=Math.max(0,e.fl||0)/.12;g.translate(Math.cos(e.recoilAngle||0)*Math.sin(k*Math.PI)*4,Math.sin(e.recoilAngle||0)*Math.sin(k*Math.PI)*4);drawE(e)}g.restore()}
function build(n){if($('ossuaryReward')?.open)$('ossuaryReward').close();if($('campaignSpoils')?.open)$('campaignSpoils').close();if($('witchLedger')?.open)$('witchLedger').close();P.emberglassUntil=0;P.warEchoCount=0;P.warEchoNext=0;resetWhirl();combatVFX=[];ruptureWaves=[];packAlarmAt=0;bearerSeen=false;hostKills=0;leechReserve=stats().H*.045;leechUpdated=tm;P.primaryBeat=0;spellFields=[];awakeningFields=[];stormHalo=null;streak.count=streak.expires=streak.boost=0;P.slipstreamUntil=0;P.evadeCd=0;nextMeleeWindup=0;combatPath=null;const previousDepth=fl;if(n>previousDepth&&P.hp>0){const S=stats();P.hp=Math.min(S.H,P.hp+S.H*.1);P.mp=Math.min(S.M,P.mp+S.M*.15)}fl=n;best=Math.max(best,n);const L=gen(n),r=L.r;T=L.T;rooms=L.rooms;DECO=L.props||[];seen=new Uint8Array(N*N);E=[];LT=[];PR=[];TG=[];PT=[];RG=[];DM={};PD={};
 const f0=rooms[0],last=rooms[rooms.length-1],isB=n%3==0;P.x=(f0.cx+.5)*TS;P.y=(f0.cy+.5)*TS;P.tgt=P.mv=P.dash=null;stairs={x:(last.cx+.5)*TS,y:(last.cy+.5)*TS};bossDone=!isB;const layout=openingLayout(n);campaignObjective=null;let id=0;
 if(layout){E=openingEncounterEnemies(layout,n);id=E.length;floorEnemyCap=id;stairs.x=(last.x+last.w-1.5)*TS;}
 else if(n>=4&&!(n===6&&campaignDepth(n))&&!window.dodWhirlTrialLevel){id=spawnDungeonHosts(n,r,isB);floorEnemyCap=id}
 else {
 const floorBudget=floorEnemyCap=Math.min(64,14+Math.floor(Math.max(0,n-1)*1.15));rooms.forEach((o,i)=>{if(!i)return;const bossRoom=i===rooms.length-1&&isB,roomCap=n>=45?8:n>=30?7:n>=10?5:3,c=bossRoom?Math.min(2,roomCap):Math.min(Math.max(0,floorBudget-id),roomCap+(o.w*o.h>=100?1:0)),pack=r(),packType=pack<.34?'Bone Guard':pack<.67?'Grave Hunt':'Hex Coven',packId=n+'-'+i;
  for(let k=0;k<c;k++){const q=r();let ty=pack<.34?(k<Math.min(2,c)?'zb':'sk'):pack<.67?(k===0?'zb':k===1?'ar':q<.72?'sk':'zb'):(k===0?'ar':k===1?'sk':q<.22?'ar':'sk');if(n>=13&&k===0&&q<.36)ty='dk';else if(n>=8&&k>=1&&q>.78)ty='pb';else if(n>=5&&k===1&&q<.42)ty='nc';const eliteChance=Math.min(.28,.11+n*.005)+(k===0?.09:0),el=r()<eliteChance,x=(o.cx+(bossRoom?-1.15:.5)+(r()-.5)*o.w*(bossRoom?.22:.35))*TS,y=(o.cy+.5+(r()-.5)*o.h*(bossRoom?.28:.35))*TS,e=mkE(ty,x,y,n,id++,el);e.packId=packId;e.packType=packType;e.packLead=k===0;e.packSize=c;e.packRole=(ty==='ar'||ty==='nc')?'ranged':k===0?'leader':'raider';E.push(e)}});}
 boss=null;if(isB){boss=mkE('bs',layout?(last.cx+.5)*TS:stairs.x+TS*2,stairs.y,n,id++,0);if(layout)boss.openingBoss=true;if(n===6&&campaignDepth(n)){boss.featuredWitch=true;boss.c='#c6759f';boss.x=(last.cx+.5)*TS;stairs.x=(last.x+last.w-1.5)*TS;}E.push(boss)}
 if(n===7&&campaignDepth(n))spawnOpeningRush();
 if(boss&&n>=18){boss.mh*=n>=30?1.65:1.25;boss.hp=boss.mh;boss.baseBossD*=1.18;boss.baseD=boss.d=boss.baseBossD}
 campaignObjective=setupCampaignObjective(n);
 banner('Depth '+n+(layout?' · '+layout.name:campaignObjective?' · '+campaignObjective.name:isB?' · '+(boss?.n||'Boss Chamber'):''));save()}
const wl=(x,y)=>x<0||y<0||x>=N*TS||y>=N*TS||!T[(y/TS|0)*N+(x/TS|0)];
const fits=(x,y,r)=>{r*=.7;return!(wl(x-r,y-r)||wl(x+r,y-r)||wl(x-r,y+r)||wl(x+r,y+r))};
const mv=(o,dx,dy)=>{if(fits(o.x+dx,o.y,o.r))o.x+=dx;if(fits(o.x,o.y+dy,o.r))o.y+=dy};
function applyIgnite(e,dps,dur=3.5){if(!e||e.dead)return;if(combatFocus()==='wildfire'){dur+=1.25;dps*=1.18}e.igniteT=Math.max(e.igniteT||0,dur);e.igniteD=Math.max(e.igniteD||0,Math.max(2,Math.round(dps)));e.igniteTick=Math.min(e.igniteTick||.4,.28)}function applyShock(e,dur=4){if(!e||e.dead)return;e.shockT=Math.max(e.shockT||0,dur);if(combatFocus()==='stormweaver'&&(P.nextShockMana||0)<=tm){P.nextShockMana=tm+.55;const S=stats();P.mp=Math.min(S.M,P.mp+7)}}function recoveryWindow(enemy){
 if(enemy.attack?.recovering)return enemy.attack;
 if(enemy.bossPattern?.state==='recover')return enemy.bossPattern;
 return null;
}
function exploitOpening(enemy,S){
 const windowOfAttack=recoveryWindow(enemy);
 if(!windowOfAttack||windowOfAttack.countered)return;
 windowOfAttack.countered=true;
 const cls=window.dodHeroClass||'warrior';
 if(cls==='warrior')enemy.guardBreak=Math.max(enemy.guardBreak||0,tm+2.5);
 else if(cls==='pyromancer')applyIgnite(enemy,S.SP*.24,3);
 else enemy.shadowMark=Math.max(enemy.shadowMark||0,tm+2.5);
 ring(enemy.x,enemy.y,enemy.r+16,CLASS_COUNTERS[cls]?.color||'#ffe1a0');
}
function hit(e,d,fx,forceCrit=false,fromBlade=false){if(e.dead)return;const S=stats(),cr=forceCrit||(!e.dotNoCrit&&R(100)<S.C);if(cr)d*=2+S.critDmg/100;if(!cr&&!e.dotNoCrit&&e.t!=='bs'&&window.dodRiftFortified?.())d*=.85;if(e.dotNoCrit&&e.bleedT>0)d*=1+S.bleed/100;if(e.shockT>0)d*=1.18;if(e.el&&e.eliteType==='bulwark'&&e.guardT>0)d*=.48;
 if(e.soulLinked)d*=.68;
 if(e.sl>0&&!e.dotNoCrit&&!fromBlade&&hasGearPower('glassfang'))d*=1.25;
 if(window.dodHeroClass==='rogue'&&e.shadowMark>tm&&!e.dotNoCrit&&!fromBlade&&fx?.dash!==true){
  e.shadowMark=0;d*=combatFocus()==='ambusher'?2:1.75;
  e.shadowFinisher=e.tk+(PD[e.id]||0)+Math.round(d)>=e.mh;
  ring(e.x,e.y,e.r+39,'#debbff');snd(420,.13,'triangle',.06,140);
 }
 if(e.openingGuard&&!e.attack?.recovering&&!(e.stun>0)&&!e.dotNoCrit&&!fromBlade&&Math.abs(angleOffset(Math.atan2(P.y-e.y,P.x-e.x),e.fa))<.9){d*=.53;if(e.fl<=0)ft(e.x,e.y-e.r-14,'BLOCKED','#adc6df',.75);}d=Math.round(d);e.tk+=d;e.recoilAngle=Math.atan2(e.y-P.y,e.x-P.x);e.fl=.12;e.aw=1;alertHost(e);if(e.id>=0)DM[e.id]=Math.round(e.tk);if(fx&&typeof fx==='object'){if(fx.ignite)applyIgnite(e,fx.ignite);if(fx.shock)applyShock(e,fx.shock===true?4:fx.shock)}
  if(hasGearPower('ossuary_gravebinder')&&(e.attack?.recovering||e.bossPattern?.state==='recover')&&!e.dotNoCrit&&!fromBlade){const bonus=Math.round(d*.35);e.tk+=bonus;d+=bonus;if(e.id>=0)DM[e.id]=Math.round(e.tk);}
const leech=Math.min(10,(S.leech||0)+(S.l||0)),healed=leech?recoverOnHit(S,d*leech/100*(fromBlade?.45:1)):0;if(healed>0){P.hp+=healed;ft(P.x+R(-7,7),P.y-18,'+'+(healed>=10?Math.round(healed):healed.toFixed(1)),'#55f078',.9)}hitNumbers(e,d,cr?'crit':fx?.burnTick?'burn':e.dotNoCrit?'bleed':'damage');if(!fromBlade&&(window.dodHeroClass||'warrior')==='warrior'&&P.eq[0]?.id==='magma_axe'&&P.blade<=0&&Math.random()<.18)startBladeStorm();burst(e.x,e.y,cr?'#ffe2a0':e.dotNoCrit?'#ec5260':'#d6bc8a',cr?10:e.dotNoCrit?8:5,160,.22,2);snd(cr?260:e.dotNoCrit?180:140,.07,'square',.04,-60);
 if(e.t!='bs'&&!e.dotNoCrit&&!fromBlade){const a=Math.atan2(e.y-P.y,e.x-P.x);mv(e,Math.cos(a)*5,Math.sin(a)*5)}
 if(!fromBlade&&!e.dotNoCrit&&d>0){if(fx?.dash!==true)exploitOpening(e,S);directCombatFocus(e,S,cr);applyCampaignRelicHit(e,S)}
}
function startBladeStorm(){P.blade=2;P.bladeTick=0;ring(P.x,P.y,125,'#ff5a18');burst(P.x,P.y,'#ff7a18',48,320,.9,5);snd(95,.5,'sawtooth',.12,500)}
function hurt(d){if(window.dodAdminGodMode||P.inv_t>0||P.dead)return;const S=stats();if(Math.random()*100<S.dodge){ft(P.x,P.y-24,'DODGE','#d9ebff',1.1);return}if(hasGearPower('dawn_crown')&&P.hp/S.H<.3&&P.guardCd<=0){P.guardCd=30;P.inv_t=2.0;ring(P.x,P.y,95,'#ffe7a0');burst(P.x,P.y,'#fff0a8',35,220,.8,4);return}if(hasGearPower('ironheart_plate')&&P.hp/S.H<.45&&!P.ironheartCd){P.ironheartT=2.5;P.ironheartCd=20;ft(P.x,P.y-30,'IRONHEART','#88d8ff',1.05);ring(P.x,P.y,90,'#7ecbff');snd(310,.18,'triangle',.06,120)}d=Math.max(1,Math.round(d*(1-S.a/(S.a+120+P.lv*2))*(P.guard>0?.35:1)*(P.ironheartT>0?.78:1)));if(P.eq[2]?.id==='worldplate')d=Math.max(1,Math.round(d*.92));P.hp-=d;P.inv_t=Math.max(P.inv_t,.18);hurtT=.3;sh+=3;ft(P.x,P.y-22,d,'#f55',1.45,'damageTaken');snd(120,.1,'square',.06,-40);
 if(P.hp<=0){P.dead=1;P.hp=0;$('dt').textContent='Depth '+fl+' · Level '+P.lv;$('dead').style.display='grid'}}
function gain(x){if(P.lv>=50){P.xp=0;window.dodParagon?.addXp?.(x);return}P.xp+=x;ft(P.x,P.y-42,'+'+x+' XP','#c9a24a',.9);
 while(P.lv<50&&P.xp>=need(P.lv)){P.xp-=need(P.lv);P.lv=Math.min(50,P.lv+1);normalizeLoadout();renderSkillSlots();const S=stats();P.hp=S.H;P.mp=S.M;const newSpell=(window.dodGetClassSkills?.(window.dodHeroClass||'warrior')||AB).find(a=>a?.unlock===P.lv);const newEvo=window.dodGetClassEvolutions?.(window.dodHeroClass||'warrior')?.find(ev=>ev.lv===P.lv);const slotMsg=P.lv===2?'Skill Slot 2 Unlocked!':P.lv===3?'Combat Focus Specialization Unlocked!':P.lv===4?'Skill Slot 3 Unlocked!':P.lv===7?'Skill Slot 4 Unlocked!':'';const unlockMsg=newEvo?`✦ Evolution (Lv ${P.lv}): ${newEvo.name}`:newSpell?`${newSpell.n} unlocked!`:slotMsg||'Level '+P.lv+'!';banner(unlockMsg);ring(P.x,P.y,150,'#ffe08a');burst(P.x,P.y,'#ffe08a',60,300,1,4);
  for(let i=0;i<16;i++)PT.push({x:P.x+R(-20,20),y:P.y,vx:0,vy:R(-280,-120),l:1,m:1,c:'#ffe08a',s:3});snd(523,.5,'triangle',.08,500);save();renderInv()}}
const itemPowerDelta=it=>{if(!it)return '';if(!canEquipItem(it))return '<span style="color:#b89c78;font-size:10px;font-weight:700">2H BLOCKED</span>';const eq=P.eq[it.s];if(!eq)return '<span style="color:#79e394;font-size:10px;font-weight:700">NEW SLOT</span>';if(eq===it)return '';const delta=Math.round(sc(it)-sc(eq));if(delta>0)return `<span style="color:#79e394;font-size:10px;font-weight:700">▲ +${delta} Power</span>`;if(delta<0)return `<span style="color:#f08076;font-size:10px;font-weight:700">▼ ${delta} Power</span>`;return '<span style="color:#b8aa93;font-size:10px">= Equal</span>'};
function showBossRewards(name,xp,items){let panel=document.getElementById('bossRewards');if(!panel){panel=document.createElement('section');panel.id='bossRewards';panel.style.cssText='position:fixed;z-index:250;inset:0;display:none;place-items:center;padding:18px;background:rgba(8,6,7,0.92);color:#f2e7cf;font:14px system-ui';document.body.appendChild(panel)}const list=items.length?items.map(it=>`<article style="padding:9px 11px;border:1px solid ${(RAR[it.r]||RAR[0])[1]}99;border-radius:3px;background:#161113"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="color:${(RAR[it.r]||RAR[0])[1]}"><span class="small-portrait">${lootIcon(it)}</span> ${esc(it.n)}</b>${itemPowerDelta(it)}</div><small style="display:block;color:#bfb097;margin-top:2px">${(RAR[it.r]||RAR[0])[0]} ${SL[it.s]} · Lv ${it.itemLevel||P.lv}</small><small style="display:block;color:#d6c9b2;margin-top:3px">${it.st?.dMin?`${it.st.dMin}–${it.st.dMax} Damage`:''}${Object.entries(it.st||{}).filter(([k])=>k!=='dMin'&&k!=='dMax').slice(0,4).map(([k,v])=>` +${v}${PC[k]?'%':''} ${SN[k]||k}`).join(' · ')}</small>${it.mythicImplicit?`<small style="display:block;color:#e2a8ff;margin-top:3px">✦ Mythic Implicit: ${esc(it.mythicImplicit)}</small>`:''}<small style="display:block;color:#f1c399;margin-top:4px">${it.power?esc(it.power):''}</small>${it.butcherPower?`<small style="display:block;color:#ffdaa8;margin-top:5px">${esc(it.butcherPower)}</small>`:''}</article>`).join(''):'<p style="color:#bfb097">No gear dropped.</p>';panel.innerHTML=`<div style="width:min(460px,94vw);max-height:80vh;overflow:auto;padding:18px;border:1px solid #8a6d45;border-radius:3px;background:#0f0c0e;box-shadow:0 12px 32px #000d"><div style="color:#c9a24a;font-size:11px;letter-spacing:.12em">VICTORY</div><h2 style="margin:4px 0 10px;color:#ead08b;font:22px Georgia,serif">${esc(name)}</h2><div style="padding:7px 10px;margin-bottom:10px;border:1px solid #4a3a2d;border-radius:3px;background:#161113;color:#ead08b;font-size:12px">+${xp} XP · ${items.length} item${items.length===1?'':'s'}</div><div style="display:grid;gap:6px">${list}</div><button id="bossRewardsClose" style="display:block;margin:14px 0 0 auto;padding:8px 16px;border:1px solid #c9a24a;border-radius:3px;background:#2c1f19;color:#f5e3b8;cursor:pointer">Continue</button></div>`;attachWitchVictory(panel,items);panel.style.display='grid';panel.querySelector('#bossRewardsClose').onclick=()=>{panel.style.display='none';P.bossExitCooldown=3}}function die(e){if(e&&e.bleedT>0&&e.bleedChain&&!e.ruptureNoChain){const ranks=window.dodProgression?.getTalents?.().reaver||{},chain=e.bleedChain;if((ranks.bloodspread||0)>0&&chain.count<12){const targets=E.filter(q=>!q.dead&&q!==e&&!chain.seen.has(q)&&D(q,e)<145).sort((a,b)=>D(a,e)-D(b,e)).slice(0,ranks.bloodspread);for(const q of targets){q.bleedT=Math.max(q.bleedT||0,Math.min(2.6,e.bleedT*.72));q.bleedTick=Math.min(q.bleedTick||.5,.25);q.bleedD=Math.max(q.bleedD||0,e.bleedD*.68);q.bleedChain=chain;chain.seen.add(q);chain.count++;ft(q.x,q.y-q.r,'SPREAD','#ec6871',.75,'bleed');burst(q.x,q.y,'#d74750',5,85,.22,2)}}if(ranks.rupture&&!e.ruptureDone){e.ruptureDone=true;const damage=Math.min(e.bleedD*5,stats().AP*2.2);for(const q of E)if(q!==e&&!q.dead&&!q.ruptureNoChain&&D(q,e)<105){q.ruptureNoChain=true;hit(q,damage,null,false,true);q.ruptureNoChain=false}ring(e.x,e.y,105,'#d54752');burst(e.x,e.y,'#e45d64',18,170,.35,3)}}e.dead=1;e.deathVisual=.42;e.fl=0;e.visualAttack=0;drawDefeatImpact(e);recordFightKill(e);recordForgeOrderKill(e);const bossLoot=[],bossXP=P.lv>=50?0:Math.round(e.xp||0);if(e.id>=0){quest.kills++;if(quest.kills===AWAKENING_UNLOCK)banner('Evade Awakening unlocked · Choose a power in Skills');if(e.t=='bs')quest.bosses++;}burst(e.x,e.y,e.c,e.t=='bs'?95:e.el?34:20,200,.7,4);
 if(e.t=='bs'||e.boss){if(e.t==='bs')bossDone=1;banner((e.n||'Boss')+' has been defeated!');sh=22;ring(e.x,e.y,280,'#ff8a1f')}
 if(e.tk<=0&&e.id>=0)return;
 if(e.hostMob&&fl>=8&&e.tk>0)callPursuit();
 if(e.soulBearer&&e.tk>0)unleashRupture(e,e.mh*.56+stats().AP*.32);
 if(hasGearPower('ossuary_bloodpact')&&e.t!=='pb'&&!P.dead&&D(P,e)<200){
  const S=stats(), healed=Math.min(S.H-P.hp,S.H*.04);
  if(healed>0){P.hp+=healed;ft(P.x,P.y-24,'+'+Math.ceil(healed),'#8cea92',.9);}
 }
 if(!P.dead&&hasCampaignRelic('grave_lantern')&&(e.el||e.t==='bs'||e.boss)){P.hp=Math.min(stats().H,P.hp+stats().H*.12);P.evadeCd=0;ring(P.x,P.y,67,'#83d7ad')}
 if(!P.dead&&hasButcherTrait('pursuit')&&(e.shadowFinisher||e.shadowMark>tm)&&P.evadeCd>0){
  P.evadeCd=Math.max(0,P.evadeCd-1.4);ft(P.x,P.y-25,'EVADE REFUND','#d7afff',.85);ring(P.x,P.y,46,'#bd91ff');
 }
 if(e.el&&!P.dead&&hasGearPower('coalheart_ring')){const S=stats();P.mp=Math.min(S.M,P.mp+S.M*.20);ring(P.x,P.y,52,'#edab85')}
 gain(Math.round(e.xp));snd(200,.15,'square',.05,-120);
 const b=e.t=='bs'||e.boss?(e.uber?.85:.65):e.el?.32:0,k=e.t=='bs'||e.boss?(e.riftGuardian||e.uber||fl>=30?3:2+(R()<.65?1:0)):e.el?(R()<(fl>=15?.62:.75)?1:0):(R()<(fl<=2?.14:.095)?1:0);
 for(let i=0;i<k;i++){const it=mkItem(fl,b,e);LT.push({x:e.x+R(-26,26),y:e.y+R(-26,26),it,t:0});if(e.t==='bs'||e.boss)bossLoot.push(it);if(it.r>1)snd(900,.3,'triangle',.07,300)}
 if(e.uber&&!bossLoot.some(x=>x.r===4)){
  const heroCls=window.dodHeroClass||'warrior',cPool=LEGENDARIES.filter(u=>u.weaponClass===heroCls||(!u.weaponClass&&(u.set==='Emberweaver Regalia'?heroCls==='pyromancer':u.set==='Nightstalker Shroud'?heroCls==='rogue':heroCls==='warrior'||(u.s!==0&&u.s!==8))));
  if(cPool.length&&(e.n?.includes('Sovereign')||Math.random()<.55)){const myth=makeMythic(cPool[RI(0,cPool.length-1)],Math.max(lootItemLevel(),fl));LT.push({x:e.x+R(-16,16),y:e.y+R(-16,16),it:myth,t:0});bossLoot.unshift(myth)}
 }
 if(e.openingChampion||e.openingBoss){
  const reward=BUTCHER_TRAITS[window.dodHeroClass]||BUTCHER_TRAITS.warrior;
  const id=e.openingChampion?'ashen_gauntlets':reward.id;
  const trophy=best>=LEGENDARY_DEPTH&&Math.random()<.15;
  const it=trophy?makeLegendary(LEGENDARIES.find(item=>item.id===id)):mkItem(fl,.6,{lootSlot:e.openingChampion?6:0,minRarity:e.openingChampion?1:2});
  if(e.openingBoss&&trophy){it.butcherTrait=reward.trait;it.butcherPower=reward.power;}
  LT.push({x:e.x,y:e.y,it,t:0});
  if(e.openingBoss)bossLoot.unshift(it);
  ring(e.x,e.y,76,RAR[it.r][1]);
  snd(660,.3,'triangle',.065,240);
 }
 if(e.featuredWitch){
  const pool=witchRewardPool(),base=pool[RI(0,pool.length-1)];
  const item=best>=LEGENDARY_DEPTH&&Math.random()<.15?makeLegendary(base):mkItem(fl,.65,{lootSlot:base.s,minRarity:2});
  item.bloodWitchDrop=true;
  LT.push({x:e.x,y:e.y,it:item,t:0});
  bossLoot.unshift(item);
  spellBurst(e.x,e.y,115,'#f6a9ca');
 }
 if(k===0&&!e.boss&&e.t!=='bs'&&R()<.22){const scGain=e.el?2:1;try{const m=JSON.parse(localStorage.getItem('dod3meta')||'{}');m.scrap=(+m.scrap||0)+scGain;localStorage.setItem('dod3meta',JSON.stringify(m));if(window.dodSanctuary?.meta)window.dodSanctuary.meta.scrap=m.scrap}catch(err){}ft(e.x,e.y-e.r-10,'+'+scGain+' Salvage','#c9a24a',.85)}
 const gemChance=e.uber||e.riftGuardian?1:e.t==='bs'||e.boss?.88:e.el?.24:.035;if(R()<gemChance){const count=e.uber?2:1;for(let gi=0;gi<count;gi++){const gk=e.uber&&gi===0?GEM_FAMILIES[RI(0,GEM_FAMILIES.length-1)].tiers[Math.random()<.35?2:1].id:rollGemDrop(fl,window.dodProgression?.getTier?.()||1,e);dodGems[gk]=(dodGems[gk]||0)+1;ft(e.x+gi*12,e.y-e.r-14,'+1 '+GEMS[gk].n,GEMS[gk].color,1)}save()}
 const fragDrop=e.riftGuardian?2:e.uber?2:(e.t==='bs'||e.boss)&&(fl>=30||(window.dodProgression?.getTier?.()||1)>=3)?1:(fl>=30&&e.el&&R()<.34)?1:0;if(fragDrop>0){dodAbyssFragments+=fragDrop;ft(e.x,e.y-e.r-26,'+'+fragDrop+' Abyssal Fragment','#d18cff',1.05);save()}
 if(R()<(e.t==='bs'||e.boss?.48:e.el?.22:.09))LT.push({x:e.x,y:e.y,o:1,t:0});if(e.t==='bs'||e.boss)showBossRewards(e.n||'Boss',bossXP,bossLoot)}
function bossPattern(e,dt){
 if(P.dead)return true;
 if(e.featuredWitch)return updateBloodWitch(e,dt);
 const a=e.bossPattern||(e.bossPattern={state:'approach',time:1.9,next:0});
 a.time-=dt;
 if(a.state==='recover'){if(a.time<=0){a.countered=false;a.state='approach';a.time=e.openingBoss?(e.phase===2?.9:1.35):e.phase===2?1.5:2.0;e.cd=.35}return true}
 if(a.state==='wind'){
  e.fa=Math.atan2(a.uy,a.ux);
  if(a.time>0)return true;
  if(a.kind==='slam'){if(Math.hypot(P.x-a.x,P.y-a.y)<a.radius+P.r)hurt(e.d*1.65);ring(a.x,a.y,a.radius,'#f7b16e');burst(a.x,a.y,'#c99065',24,200,.4,3);a.state='recover';a.time=.95}
  else if(a.kind==='sweep'||a.kind==='breath'||a.kind==='void_beam'){
   const distance=D(P,e),angle=Math.atan2(P.y-e.y,P.x-e.x),half=a.kind==='sweep'?1.35:a.kind==='breath'?.65:.52;
   if(distance<a.radius&&Math.abs(angleOffset(angle,e.fa))<half)hurt(e.d*(a.kind==='void_beam'?1.7:a.kind==='breath'?1.45:1.35));
   if(a.kind==='breath'){for(let k=-2;k<=2;k++){const ang=e.fa+k*.22;PR.push({x:e.x,y:e.y,vx:Math.cos(ang)*320,vy:Math.sin(ang)*320,d:e.d*.9,f:1,life:1.1,r:7,c:'#ff8248',slow:e.phase>=1})}}
   if(a.kind==='void_beam'){for(let k=-1;k<=1;k++){const ang=e.fa+k*.26;PR.push({x:e.x,y:e.y,vx:Math.cos(ang)*410,vy:Math.sin(ang)*410,d:e.d*1.05,f:1,life:1.25,r:8,c:'#d18cff',slow:true})}}
   combatEffect('slash',e.x,e.y,e.fa);burst(e.x,e.y,a.kind==='void_beam'?'#d18cff':'#ed7250',28,200,.4,3);
   snd(a.kind==='void_beam'?125:75,.18,'triangle',.065,-35);
   e.visualAttack=.32;a.state='recover';a.time=1.05;
  }else if(a.kind==='soul_bolt'){
   for(let k=-2;k<=2;k++){const ang=e.fa+k*.21;PR.push({x:e.x,y:e.y,vx:Math.cos(ang)*340,vy:Math.sin(ang)*340,d:e.d*.95,f:1,life:1.5,r:7,c:'#b886ff',slow:true})}
   ring(e.x,e.y,90,'#b886ff');snd(230,.15,'triangle',.055,90);
   e.visualAttack=.3;a.state='recover';a.time=1.0;
  }else if(a.kind==='meteor_ring'||a.kind==='necrotic_rings'||a.kind==='cataclysm'){
   const count=a.kind==='cataclysm'?(e.phase>=1?6:4):(e.phase>=1?4:3);
   const col=a.kind==='cataclysm'?'#d18cff':a.kind==='necrotic_rings'?'#a87cff':'#ff8548';
   for(let i=0;i<count;i++){const ang=i*(Math.PI*2/count)+tm*.3,dist=i===0?16:98,tx=P.x+Math.cos(ang)*dist,ty=P.y+Math.sin(ang)*dist;if(!wl(tx,ty))TG.push({owner:e,x:tx,y:ty,r:a.kind==='cataclysm'?74:64,t:0,m:.95,d:e.d*(a.kind==='cataclysm'?1.65:1.35),color:col})}
   if(a.kind==='necrotic_rings'&&E.filter(x=>!x.dead&&x.id<0).length<5){for(let s=0;s<2;s++){const ang=R(6.28),sx=e.x+Math.cos(ang)*48,sy=e.y+Math.sin(ang)*48;if(fits(sx,sy,12)){const add=mkE('sk',sx,sy,fl,-1,0);add.aw=1;E.push(add)}}}
   ring(e.x,e.y,115,col);snd(95,.22,'sawtooth',.065,-40);
   a.state='recover';a.time=1.1;
  }else{a.state='rush';a.time=.45;a.hit=false}return true;
 }
 if(a.state==='rush'){
  const travel=Math.min(720*dt,a.left);let left=travel;
  while(left>0){const step=Math.min(8,left),x=e.x,y=e.y;mv(e,a.ux*step,a.uy*step);left-=step;a.left-=step;if(Math.hypot(e.x-x,e.y-y)<step*.5){a.left=0;break}if(!a.hit&&Math.hypot(e.x-P.x,e.y-P.y)<e.r+P.r+4){hurt(e.d*1.55);a.hit=true}}
  if(a.time<=0||a.left<=0){a.state='recover';a.time=1.0}return true;
 }
 if(a.time>0)return false;
 const dx=P.x-e.x,dy=P.y-e.y,d=Math.hypot(dx,dy)||1;
 if(e.openingBoss&&(d>310||combatLineDistance(e.x,e.y,Math.atan2(dy,dx),d)<d))return false;
 const style=e.bossStyle||'butcher';
 let sequence=['slam','charge'];
 if(style==='sovereign')sequence=e.phase>=1?['void_beam','cataclysm','charge','slam']:['void_beam','cataclysm','slam'];
 else if(style==='dragon')sequence=e.phase>=1?['breath','meteor_ring','charge','slam']:['breath','slam','charge'];
 else if(style==='gravelord')sequence=e.phase>=1?['soul_bolt','necrotic_rings','slam','charge']:['soul_bolt','necrotic_rings','slam'];
 else if(style==='witch')sequence=['soul_bolt','meteor_ring','slam'];
 else if(e.openingBoss||e.phase>=1)sequence=['slam','charge','sweep'];
 a.kind=sequence[a.next++%sequence.length];a.state='wind';
 a.time=a.kind==='slam'?.95:a.kind==='sweep'?.78:a.kind==='breath'||a.kind==='void_beam'?.9:a.kind==='cataclysm'||a.kind==='meteor_ring'||a.kind==='necrotic_rings'?.72:.85;a.duration=a.time;
 a.x=P.x;a.y=P.y;a.radius=a.kind==='void_beam'?235:a.kind==='breath'?210:125;a.sx=e.x;a.sy=e.y;
 a.ux=dx/d;a.uy=dy/d;a.left=Math.min(320,d+85);a.length=a.left;e.fa=Math.atan2(dy,dx);
 return true;
}
function drawBossWarnings(){g.save();g.globalCompositeOperation='source-over';for(const e of E){const a=e.bossPattern;if(e.dead||!a)continue;if(a.state==='wind'){const progress=1-Math.max(0,a.time)/a.duration;g.save();g.strokeStyle=a.kind==='void_beam'||a.kind==='cataclysm'||a.kind==='soul_bolt'||a.kind==='necrotic_rings'?'#dfb8ff':'#ffd397';g.fillStyle=a.kind==='void_beam'||a.kind==='cataclysm'||a.kind==='soul_bolt'||a.kind==='necrotic_rings'?'#7c3fb8':'#c64e31';g.lineWidth=2;g.globalAlpha=.22;if(a.kind==='slam'){g.beginPath();g.arc(a.x,a.y,a.radius,0,Math.PI*2);g.fill();g.globalAlpha=.95;g.stroke();g.beginPath();g.arc(a.x,a.y,a.radius*progress,0,Math.PI*2);g.stroke()}else if(a.kind==='sweep'||a.kind==='breath'||a.kind==='void_beam'){const half=a.kind==='sweep'?1.35:a.kind==='breath'?.65:.52;g.translate(e.x,e.y);g.rotate(Math.atan2(a.uy,a.ux));g.beginPath();g.moveTo(0,0);g.arc(0,0,a.radius,-half,half);g.closePath();g.fill();g.globalAlpha=.95;g.stroke()}else if(a.kind==='soul_bolt'||a.kind==='meteor_ring'||a.kind==='necrotic_rings'||a.kind==='cataclysm'){g.beginPath();g.arc(e.x,e.y,55+progress*40,0,Math.PI*2);g.fill();g.globalAlpha=.95;g.stroke()}else{g.translate(a.sx,a.sy);g.rotate(Math.atan2(a.uy,a.ux));g.fillRect(0,-e.r,a.length,e.r*2);g.globalAlpha=.95;g.strokeRect(0,-e.r,a.length,e.r*2);for(let x=25;x<a.length;x+=40){g.beginPath();g.moveTo(x-8,-8);g.lineTo(x,0);g.lineTo(x-8,8);g.stroke()}}g.restore()}else if(a.state==='recover'&&!a.countered){g.globalAlpha=.9;g.fillStyle='#e7cd94';g.font='bold 11px system-ui';g.textAlign='center';g.fillText('◇ OPEN',e.x,e.y-e.r-18)}}g.restore()}
let nextMeleeWindup = 0;
let combatPath = null;

function angleOffset(angle, facing) {
 return Math.atan2(Math.sin(angle-facing), Math.cos(angle-facing));
}

function combatLineDistance(x, y, angle, length) {
 const dx=Math.cos(angle), dy=Math.sin(angle);
 for (let d=8; d<length; d+=8) if(wl(x+dx*d,y+dy*d))return d-8;
 return wl(x+dx*length,y+dy*length) ? Math.max(0,length-8) : length;
}

function combatDirections(e, direct) {
 if (direct || !e.aw) return e.fa;
 const target=(P.y/TS|0)*N+(P.x/TS|0);
 if (combatPath?.target!==target) {
  const distances=new Int16Array(N*N).fill(-1), queue=new Uint16Array(N*N);
  distances[target]=0;
  queue[0]=target;
  for(let head=0,tail=1;head<tail;head++){
   const cell=queue[head];
   for(const next of [cell-1,cell+1,cell-N,cell+N]){
    if(!T[next]||distances[next]!==-1)continue;
    distances[next]=distances[cell]+1;
    queue[tail++]=next;
   }
  }
  combatPath={target,distances};
 }
 const cell=(e.y/TS|0)*N+(e.x/TS|0), fields=combatPath.distances;
 let next=cell;
 for(const index of [cell-1,cell+1,cell-N,cell+N]){
  if(fields[index]>=0&&fields[index]<fields[next])next=index;
 }
 if(next===cell)return e.fa;
 return Math.atan2((Math.floor(next/N)+.5)*TS-e.y, (next%N+.5)*TS-e.x);
}

function moveCombatEnemy(e, direction, speed, dt) {
 let dx=Math.cos(direction)*speed,dy=Math.sin(direction)*speed;
 const cx=Math.floor(e.x/CROWD_CELL),cy=Math.floor(e.y/CROWD_CELL);
 for(let y=cy-1;y<=cy+1;y++)for(let x=cx-1;x<=cx+1;x++)for(const other of crowdCells.get(y*256+x)||[]){
  if(other===e||other.dead)continue;
  const x=e.x-other.x,y=e.y-other.y,space=Math.hypot(x,y),desired=e.r+other.r+5;
  if(space>0&&space<desired){
   const push=(desired-space)*3.2/space;
   dx+=x*push;
   dy+=y*push;
  }
 }
 mv(e,dx*dt,dy*dt);
}

const enemyShotSpeed = e => e.el&&e.eliteType==='hexer' ? 390 : 355;
const ENEMY_SHOT_LIFE = 1.6;

function beginEnemyAttack(e, kind) {
 const brute=e.t==='dk'||e.t==='zb';
 const duration=kind==='shot'?.68:kind==='blast'?.62:brute?.82:.55;
 const radius=kind==='blast'?78:e.r+P.r+(brute?47:23);
 const halfAngle=brute?1.28:Math.PI/3;
 e.attack={kind,time:duration,duration,angle:e.fa,radius,halfAngle,recovering:false};
 e.cd=duration+(kind==='shot'?1.34:brute?.94:.72);
 if(kind==='melee')nextMeleeWindup=tm+(e.hostMob?(fl>=20?.095:.16):.30);
 snd(kind==='shot'?315:kind==='blast'?165:120,.11,'triangle',.035,45);
}

function updateEnemyAttack(e, dt) {
 const attack=e.attack;
 attack.time-=dt;
 if(attack.time>0)return true;
 if(attack.recovering){
  e.attack=null;
  return false;
 }
 const {kind,angle,radius,halfAngle}=attack;
 if(kind==='shot'){
  const hex=e.el&&e.eliteType==='hexer',speed=enemyShotSpeed(e);
  PR.push({x:e.x,y:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,d:e.d,f:1,life:ENEMY_SHOT_LIFE,r:hex?7:6,c:hex?'#bd83ff':e.t==='nc'?'#c188ff':'#ffb050',slow:hex});
  snd(235,.09,'triangle',.045,170);
 }else{
  const dx=P.x-e.x,dy=P.y-e.y,distance=Math.hypot(dx,dy);
  const inAngle=kind==='blast'||Math.abs(angleOffset(Math.atan2(dy,dx),angle))<=halfAngle;
  if(distance<=radius&&inAngle&&combatLineDistance(e.x,e.y,Math.atan2(dy,dx),distance)>=distance){
   hurt(e.d*(kind==='blast'?1.45:1));
   burst(P.x,P.y,'#c33',6);
  }
  if(kind==='blast'){
   ring(e.x,e.y,radius,'#7bd455');
   burst(e.x,e.y,'#9cf26e',26,200,.45,4);
   e.tk=e.mh;
   die(e);
   return true;
  }
  const reach=radius*.8;
  burst(e.x+Math.cos(angle)*reach,e.y+Math.sin(angle)*reach,'#e08759',8,115,.23,2);
  snd(100,.09,'triangle',.04,-30);
 }
 e.visualAttack=.32;
 attack.recovering=true;
 attack.time=kind==='shot'?.42:(e.t==='dk'||e.t==='zb')?.72:.48;
 return true;
}

function drawEnemyWarnings() {
 g.save();
 g.globalCompositeOperation='source-over';
 for(const e of E){
  const a=e.attack;
  if(e.dead||!a||Math.abs(e.x-P.x)>W/2+180||Math.abs(e.y-P.y)>H/2+180)continue;
  g.save();
  g.translate(e.x,e.y);
  if(a.recovering){
   if(a.countered){g.restore();continue}
   g.globalAlpha=Math.min(.85,a.time*3);
   g.fillStyle='#efe0b7';
   g.font='bold 15px system-ui';
   g.textAlign='center';
   g.fillText('◇',0,-e.r-18);
  }else{
   const progress=1-Math.max(0,a.time)/a.duration;
   g.rotate(a.angle);
   g.beginPath();
   g.lineWidth=2;
   g.globalAlpha=.22+progress*.24;
   g.fillStyle=a.kind==='blast'?'#71bd42':a.kind==='shot'?'#8157b2':'#d95732';
   g.strokeStyle=a.kind==='blast'?'#c5ed8b':a.kind==='shot'?'#dcbeff':'#ffc58a';
   if(a.kind==='shot'){
    const length=combatLineDistance(e.x,e.y,a.angle,enemyShotSpeed(e)*ENEMY_SHOT_LIFE);
    g.moveTo(0,-4);g.lineTo(length,-11);g.lineTo(length,11);g.lineTo(0,4);g.closePath();
   }else{
    if(a.kind==='melee')g.moveTo(0,0);
    g.arc(0,0,a.radius,a.kind==='blast'?0:-a.halfAngle,a.kind==='blast'?Math.PI*2:a.halfAngle);
    g.closePath();
   }
   g.fill();
   g.globalAlpha=.85;
   g.stroke();
  }
  g.restore();
 }
 g.restore();
}

function updE(e,dt){if(e.dead)return;e.hp=e.mh-e.tk-(PD[e.id]||0);if(e.hp<=0)return die(e);
 e.visualAttack=Math.max(0,(e.visualAttack||0)-dt);e.fl-=dt;e.sl-=dt;e.cd-=dt;if(e.shockT>0)e.shockT=Math.max(0,e.shockT-dt);if(e.igniteT>0){e.igniteT=Math.max(0,e.igniteT-dt);e.igniteTick-=dt;if(e.igniteTick<=0){e.igniteTick=.45;e.dotNoCrit=true;hit(e,e.igniteD||2,{burnTick:true},false,true);e.dotNoCrit=false}}if(e.bleedT>0){e.bleedT-=dt;e.bleedTick-=dt;if(e.bleedTick<=0){e.bleedTick=(window.dodWhirlTrialLevel?.4:.5)*(P.eq[0]?.id==='bloodletter' ? 0.75 : 1);e.dotNoCrit=true;hit(e,e.bleedD||1,null,false,true);e.dotNoCrit=false}}if(e.stun>0){e.stun-=dt;e.aw=1;e.attack=null;return}const dx=P.x-e.x,dy=P.y-e.y,d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d;e.fa=Math.atan2(dy,dx);
 const direct=d<520&&combatLineDistance(e.x,e.y,e.fa,d)>=d;
 if(e.soulBearer&&!bearerSeen&&direct&&d<300&&!P.dead){bearerSeen=true;ft(e.x,e.y-e.r-33,'SOULFLAME · KILL TO RUPTURE','#ffcc84',1.05)}
 if(!e.aw){if(d<(e.t=='bs'?420:e.rg?330:250)&&direct&&!P.dead){e.aw=1;
  if(e.rushPack){spellBurst(e.x,e.y,28,'#ffb776');if(campaignObjective&&!campaignObjective.rushAnnounced){campaignObjective.rushAnnounced=true;banner('Foundry ambush')}}if(e.t=='bs'){banner((e.n||'The Butcher')+' awakens');snd(70,.8,'sawtooth',.1,-20)}}return}
 if(P.dead)return;updateBearerAttack(e,dt,direct,d);if(e.t==='bs'&&bossPattern(e,dt))return;
 if(e.attack){e.fa=e.attack.angle;if(updateEnemyAttack(e,dt))return}
 if(updateAshRunner(e,dt,direct,d))return;
 if(e.campaignAffix&&!e.huntRunner)updateCampaignChampion(e,dt,direct,d);
 if(e.el&&!e.campaignAffix&&e.eliteType==='ravager'){
  e.chargeCd=Math.max(0,(e.chargeCd??1.4)-dt);
  if(e.chargeT>0){e.chargeT-=dt;if(e.chargeT<=0){e.chargeRun=.28;e.chargeHit=false}return}
  if(e.chargeRun>0){e.chargeRun-=dt;mv(e,e.chargeUx*620*dt,e.chargeUy*620*dt);if(!e.chargeHit&&D(P,e)<e.r+P.r+16){e.chargeHit=true;hurt(e.d*1.6);burst(P.x,P.y,'#ee7355',18,180,.35)}return}
  if(e.chargeCd<=0&&d<250&&d>78){e.chargeT=.68;e.chargeUx=ux;e.chargeUy=uy;e.chargeCd=4.5;banner('RAVAGER · DODGE THE CHARGE!');snd(100,.18,'sawtooth',.06,-30);return}
 }
 if(e.el&&!e.campaignAffix&&e.eliteType==='crusher'){
  e.slamCd=Math.max(0,(e.slamCd??2)-dt);
  if(e.slamT>0){e.slamT-=dt;if(e.slamT<=0){TG.push({x:e.slamX,y:e.slamY,r:78,t:0,m:.34,d:e.d*1.65});snd(75,.2,'triangle',.07,-25)}return}
  if(e.slamCd<=0&&d<155){e.slamX=P.x;e.slamY=P.y;e.slamT=.72;e.slamCd=4.2;banner('CRUSHER · SLAM INCOMING!');return}
 }
 if(e.el&&!e.campaignAffix&&e.eliteType==='bulwark'&&!e.openingGuard){
  e.guardCd=Math.max(0,(e.guardCd??1.5)-dt);if(e.guardT>0)e.guardT=Math.max(0,e.guardT-dt);
  else if(e.guardCd<=0&&d<210){e.guardT=1.15;e.guardCd=5;banner('BULWARK · GUARD UP!');ring(e.x,e.y,50,'#a9d5e6');return}
 }
 if(e.el&&e.eliteSub&&direct&&d<240&&!e.campaignAffix){
  e.subAffixCd=(e.subAffixCd??2.8)-dt;
  if(e.subAffixCd<=0){
   if(e.eliteSub==='frost'){e.subAffixCd=5.8;TG.push({owner:e,x:P.x,y:P.y,r:56,t:0,m:.95,d:e.d*1.15,color:'#7ed6ff'});ring(e.x,e.y,58,'#7ed6ff')}
   else if(e.eliteSub==='miasma'){e.subAffixCd=6.2;TG.push({owner:e,x:P.x+R(-22,22),y:P.y+R(-22,22),r:64,t:0,m:1.0,d:e.d*1.25,color:'#4fd6b3'});ring(e.x,e.y,60,'#4fd6b3')}
   else if(e.eliteSub==='void'){e.subAffixCd=5.4;for(const k of [-.32,0,.32]){const ang=e.fa+k;PR.push({x:e.x,y:e.y,vx:Math.cos(ang)*320,vy:Math.sin(ang)*320,d:e.d*.85,f:1,life:1.25,r:6,c:'#c28aff',slow:true})}ring(e.x,e.y,62,'#c28aff')}
  }
 }
 if(e.t==='nc'){e.summonCd=(e.summonCd??3.5)-dt;if(e.summonCd<=0&&(e.summonCount||0)<2&&E.length<75){e.summonCd=5.5;e.summonCount=(e.summonCount||0)+1;const ang=R(6.283),sx=e.x+Math.cos(ang)*36,sy=e.y+Math.sin(ang)*36;if(fits(sx,sy,12)){const add=mkE('sk',sx,sy,fl,-1,0);add.aw=1;E.push(add);ring(sx,sy,38,'#a478e8');burst(sx,sy,'#c29eff',12,110,.35,2);snd(290,.12,'triangle',.04,90)}}}
 if(e.t==='pb'&&direct&&d<e.r+P.r+24){beginEnemyAttack(e,'blast');return}
 if(e.t==='bs'){e.summonCd=(e.summonCd??6)-dt;if(e.summonCd<=0&&E.filter(x=>!x.dead&&x.id<0).length<5){e.summonCd=8.5;const ang=R(6.283),sx=e.x+Math.cos(ang)*52,sy=e.y+Math.sin(ang)*52;if(fits(sx,sy,13)){const add=mkE(fl>=6&&Math.random()<.4?'nc':'sk',sx,sy,fl,-1,0);add.aw=1;E.push(add);ring(sx,sy,44,'#d9624a')}}}
 const enraged=e.t==='bs'&&e.hp<e.mh*.5;
 const speed=e.sp*(e.sl>0?.45:1)*(enraged?1.4:1);
 const reach=e.r+P.r+10;
 if(e.cd<=0&&direct){
  if(e.rg&&d<e.rg+30){beginEnemyAttack(e,'shot');return}
  if(!e.rg&&d<reach&&e.t==='bs'&&!e.openingBoss){e.visualAttack=.32;hurt(e.d);e.cd=.78;burst(P.x,P.y,'#c33',6);return}
  if(!e.rg&&d<reach&&e.t!=='bs'&&tm>=nextMeleeWindup){beginEnemyAttack(e,'melee');return}
 }
 const guardTarget=e.openingGuard&&E.find(q=>q.openingPack===e.openingPack&&q.rg&&!q.dead&&D(q,e)<260);
 if(guardTarget&&direct&&d>reach+30){
  const distance=D(P,guardTarget)||1;
  const x=guardTarget.x+(P.x-guardTarget.x)/distance*88,y=guardTarget.y+(P.y-guardTarget.y)/distance*88;
  if(fits(x,y,e.r)){
   const guardSpeed=Math.hypot(x-e.x,y-e.y)>15?speed:0;
   moveCombatEnemy(e,Math.atan2(y-e.y,x-e.x),guardSpeed,dt);
   return;
  }
 }
 const travel=!direct?1:e.rg?(d<e.rg*.67?-1:d>e.rg?1:0):(d>reach-4?1:0);
 let direction=combatDirections(e,direct);
 if(direct&&e.flank&&d>reach+18&&d<320){
  const side=e.flank*Math.min(.69,(d-reach)/155);
  if(fits(e.x+Math.cos(direction+side)*24,e.y+Math.sin(direction+side)*24,e.r))direction+=side;
 }
 moveCombatEnemy(e,direction,travel*speed,dt);
}
// updE end
// Boss phases: bosses become more dangerous at 70% and 35% health.
const _updE=updE;
updE=function(e,dt){if(e.t=='bs'&&!e.dead){const ratio=(e.mh-e.tk-(PD[e.id]||0))/e.mh;const phase=ratio<.35?2:ratio<.7?1:0;if(phase!==e.phase){e.phase=phase;banner((e.n||'Boss')+' · Phase '+(phase+1));ring(e.x,e.y,phase?210:130,phase==2?'#ff4b32':'#c65b9b');burst(e.x,e.y,phase==2?'#ff4b32':'#c65b9b',35,240,.7,4);e.t1=Math.min(e.t1,1)}if(!e.baseBossD)e.baseBossD=e.baseD||e.d;e.d=e.baseBossD*(phase==2?1.3:phase==1?1.15:1)} _updE(e,dt)};
const packAwareUpdate=updE;
updE=function(e,dt){if(e.packId&&e.t!=='bs'&&!e.dead){const pack=combatPacks.get(e.packId),leader=pack?.leader,leaderLost=!leader||leader.dead,nearLead=leader&&!leader.dead&&D(e,leader)<175;e.soulLinked=Boolean(nearLead&&leader!==e&&leader.campaignAffix?.id==='rally');e.sp=e.baseSp*(pack?.bearer&&!pack.bearer.dead&&pack.bearer!==e&&D(e,pack.bearer)<175?1.18:1)*(e.packType==='Grave Hunt'&&pack?.count>1?1.14:1)*(leaderLost?1.1:1);e.d=e.baseD*(e.packType==='Hex Coven'&&e.packRole==='ranged'?1.12:1)*(e.packType==='Bone Guard'&&nearLead?.9:1)*(leaderLost?1.12:1);if(e.packType==='Hex Coven'&&e.packRole==='ranged')e.rg=Math.max(e.rg,285)}packAwareUpdate(e,dt)};
function weaponRoll(S){const w=P.eq[0]?.st||{};const lo=Number.isFinite(+w.dMin)?+w.dMin:4,hi=Number.isFinite(+w.dMax)?+w.dMax:7;return S.AP+R(lo,hi)}
function swing(S){if(WW.active)return;combatEffect('slash',P.x,P.y,P.face);P.at=.34/(1+S.Haste/100);P.an=1;P.ac++;snd(180,.08,'sawtooth',.04,-90);const bloodEcho=P.eq[0]?.id==='blackfang_main'&&P.eq[8]?.id==='blackfang_off'&&P.ac%3===0;
 E.forEach(e=>{if(e.dead)return;const a=Math.atan2(e.y-P.y,e.x-P.x);if(D(P,e)<P.r+(P.primaryBeat===0?151:91)+e.r&&Math.abs(angleOffset(a,P.face))<(P.primaryBeat===0?1.42:1.2)&&hasSight(P,e)){const damage=weaponRoll(S)*R(.9,1.1);hit(e,damage);if(bloodEcho)hit(e,damage*.65)}});
 if(bloodEcho){P.bloodEcho=1.1;ring(P.x,P.y,94,'#c780ed');burst(P.x,P.y,'#d3a0ff',12,155,.32,3)}
 if(P.primaryBeat===0)combatEffect('spell',P.x,P.y,P.face,{style:'cut',length:151,color:'#f7b578',duration:.28});
 RG.push({x:P.x,y:P.y,r:P.primaryBeat===0?146:92,m:.25,t:0,c:'#fff',a:P.face})}
function boom(p){
 for(const enemy of nearbySpellTargets(p,p.aoe))hit(enemy,p.d,{ignite:p.ignite,shock:p.shock});
 const color=p.c||'#ff7a18';
 if(p.aoe>=62){spellBurst(p.x,p.y,p.aoe,color);snd(106,.2,'sawtooth',.07,-46);}
 else{burst(p.x,p.y,color,12,175,.35,2.5);ring(p.x,p.y,p.aoe,color);snd(148,.11,'triangle',.035,-46);}
}
// Channel damage and its children are separate: children never create more children.
const WW={active:false,inputs:new Set(),tick:0,stacks:0,comboTime:0,vortices:[],serial:0};
function whirlConfig(){const r=window.dodProgression?.getTalents?.().weapon||{},sm=spellMod('whirlwind','warrior');return{radius:84+(r.stormreach||0)*6+(sm.rune==='b'?18:0),cost:(20-(r.stormreach||0))*(sm.rune==='b'?.75:1),interval:(window.dodWhirlTrialLevel?.27:.32)/(1+WW.stacks*(r.stormrhythm||0)*.02)*(P.eq[3]?.id==='tempest_loop' ? 0.85 : 1),damage:.46*(1+(r.whirlwind||0)*.05)*sm.dmgMult*(sm.rune==='a'?1.25:1)*(P.eq[3]?.id==='tempest_loop' ? 1.1 : 1),bleed:sm.rune==='a',spawn:(r.tempest||0)/3,blood:!!r.bloodstorm,burst:!!r.stormburst,follow:hasGearPower('stormcleaver')}}
function whirlBlocked(){return P.dead||document.hidden||document.body.classList.contains('hud-layout-editing')||['inv','adv','admin','worldPanel','progPanel','d3service','classStart','bossRewards','titleScreen','sanctuary'].some(id=>{const el=$(id);return el&&el.childElementCount>0&&getComputedStyle(el).display!=='none'})}
function stopWhirl(){const wi=wwIndex();if(WW.active&&wi>=0)CD[wi]=Math.max(CD[wi],.2);WW.active=false;WW.inputs.clear();WW.tick=0;document.querySelectorAll('[data-ability="whirlwind"]').forEach(el=>el.classList.remove('channeling'))}
function resetWhirl(){stopWhirl();WW.stacks=0;WW.comboTime=0;WW.vortices=[]}
function beginWhirl(source){const wi=wwIndex();if(whirlBlocked()||wi<0||!abilityLoadout.slice(0,activeSkillSlotCap()).includes(wi)||CD[wi]>0||P.lv<(AB[wi]?.unlock||7))return false;const cfg=whirlConfig();if(P.mp<cfg.cost*.2){banner('Not enough mana for Whirlwind');return false}WW.inputs.add(source);if(!WW.active){P.mp-=cfg.cost*.2;WW.active=true;WW.tick=0;P.tgt=null;autoAttackHeld=false;if(hasGearPower('frostfang_boots'))P.phaseStrideT=3.0;snd(150,.12,'sawtooth',.035,-40)}document.querySelectorAll('[data-ability="whirlwind"]').forEach(el=>el.classList.add('channeling'));return true}
function releaseWhirl(source){WW.inputs.delete(source);if(!WW.inputs.size)stopWhirl()}
function whirlAlive(e){return !e.dead&&e.mh-e.tk-(PD[e.id]||0)>0}
function whirlHit(e,damage){if(!whirlAlive(e))return;const woundBonus=(e.bleedT>0||e.stormBleed>0)?1.25:1;hit(e,damage*woundBonus,null,false,true)}
function createVortex(e,cfg){if(WW.vortices.length>=6)return;WW.vortices.push({x:e.x,y:e.y,t:0,tick:0,life:2.4,angle:WW.serial++*2.399,radius:48,blood:cfg.blood,burst:cfg.burst,follow:cfg.follow,damage:weaponRoll(stats())*.22})}
function updateWhirl(dt){
 if(whirlBlocked()){stopWhirl();return}
 WW.comboTime=Math.max(0,WW.comboTime-dt);if(!WW.comboTime)WW.stacks=0;
 if(WW.active){
  const wi=wwIndex();if(wi<0||!abilityLoadout.slice(0,activeSkillSlotCap()).includes(wi)||!WW.inputs.size){stopWhirl();return}
  const cfg=whirlConfig(),cost=cfg.cost*dt;
  if(P.mp<cost){stopWhirl();banner('Whirlwind stopped · out of mana');return}
  P.mp-=cost;P.an=1;WW.tick+=dt;
  if(WW.tick>=cfg.interval){WW.tick%=cfg.interval;let connected=false;
   for(const e of E){if(!whirlAlive(e)||D(P,e)>=cfg.radius+e.r)continue;connected=true;whirlHit(e,weaponRoll(stats())*cfg.damage);if(cfg.bleed&&whirlAlive(e))startSkillBleed(e,weaponRoll(stats())*.18,2);
    if(!whirlAlive(e)&&!e.wwKill){e.wwKill=true;if(cfg.spawn>0&&Math.random()<cfg.spawn)createVortex(e,cfg)}
   }
   if(connected){WW.stacks=Math.min(5,WW.stacks+1);WW.comboTime=1.5}
  }
 }
 for(const v of WW.vortices){v.t+=dt;v.tick+=dt;if(v.follow){const angle=v.angle+v.t*2,tx=P.x+Math.cos(angle)*65,ty=P.y+Math.sin(angle)*65;v.x+=(tx-v.x)*Math.min(1,dt*5);v.y+=(ty-v.y)*Math.min(1,dt*5)}
  if(v.tick>=.4){v.tick%=.4;for(const e of E){if(!whirlAlive(e)||Math.hypot(e.x-v.x,e.y-v.y)>=v.radius+e.r)continue;whirlHit(e,v.damage);if(v.blood&&whirlAlive(e)){e.stormBleed=Math.max(e.stormBleed||0,2);e.stormBleedDamage=Math.max(e.stormBleedDamage||0,v.damage*.45)}}}
  if(v.t>=v.life&&v.burst){for(const e of E)if(whirlAlive(e)&&Math.hypot(e.x-v.x,e.y-v.y)<85+e.r)whirlHit(e,v.damage*2);ring(v.x,v.y,85,'#b6d9ed');burst(v.x,v.y,'#d0e0eb',8,150,.25,2)}
 }
 WW.vortices=WW.vortices.filter(v=>v.t<v.life);
 for(const e of E)if(e.stormBleed>0&&whirlAlive(e)){e.stormBleed=Math.max(0,e.stormBleed-dt);e.stormBleedTick=(e.stormBleedTick||0)-dt;if(e.stormBleedTick<=0){e.stormBleedTick=window.dodWhirlTrialLevel?.38:.5;e.dotNoCrit=true;whirlHit(e,e.stormBleedDamage);e.dotNoCrit=false}}
}
function drawWhirl(){g.save();g.globalCompositeOperation='lighter';const paint=(x,y,r,phase,alpha,color)=>{g.save();g.translate(x,y);g.rotate(phase);for(let i=0;i<4;i++){g.globalAlpha=alpha*(i===0?.8:.22);g.strokeStyle=i===0?'#fff0ca':color;g.lineWidth=i===0?3:5;g.beginPath();g.arc(0,0,r-i*8,i*2.1,i*2.1+2.8);g.stroke()}g.restore()};if(WW.active){const c=whirlConfig(),phase=tm*(12+WW.stacks);paint(P.x,P.y,c.radius,phase,1,'#9bcbd9');g.globalAlpha=.9;for(let i=0;i<8;i++){const a=phase+i*Math.PI/4,rr=c.radius*.64;g.fillStyle=i%2?'#d7f3ff':'#fff0ca';g.beginPath();g.arc(P.x+Math.cos(a)*rr,P.y+Math.sin(a)*rr,2.5+(i%2),0,7);g.fill()}g.globalCompositeOperation='source-over';g.globalAlpha=.9;g.textAlign='center';g.font='bold 11px system-ui';g.fillStyle='#e7ddb9';g.fillText('WHIRLWIND'+(WW.stacks?' · '+WW.stacks+'/5':''),P.x,P.y-38)}for(const v of WW.vortices)paint(v.x,v.y,v.radius,tm*10+v.angle,Math.min(1,(v.life-v.t)*3),v.blood?'#e4878a':'#9bcbd9');g.restore()}

const talentRank=(branch,node)=>window.dodProgression?.getTalents?.()?.[branch]?.[node]||0;
const facingTarget=(range,arc=1.45)=>E.filter(e=>!e.dead&&D(P,e)<range+e.r&&Math.abs(Math.atan2(Math.sin(Math.atan2(e.y-P.y,e.x-P.x)-P.face),Math.cos(Math.atan2(e.y-P.y,e.x-P.x)-P.face)))<arc).sort((a,b)=>D(P,a)-D(P,b))[0];

const FOCUS_PATHS={
 warrior:[
  {id:'bastion',name:'Bastion',detail:'Breaking a guard shaves 1.5 seconds off Ground Slam.'},
  {id:'bloodforged',name:'Bloodforged',detail:'Critical direct hits start a Bleed on unbleeding enemies.'}
 ],
 pyromancer:[
  {id:'wildfire',name:'Wildfire',detail:'Ignites gain 18% damage and last 1.25 seconds longer.'},
  {id:'stormweaver',name:'Stormweaver',detail:'Shocking an enemy restores 7 mana. Triggers at most once every 0.55 seconds.'}
 ],
 rogue:[
  {id:'ambusher',name:'Ambusher',detail:'Exposed enemies take 100% bonus damage from the next direct hit.'},
  {id:'venomblade',name:'Venomblade',detail:'Every third direct hit against a target applies Bleed and Slow.'}
 ]
};

const AWAKENING_UNLOCK=12,AWAKENING_MASTERY=15;
const AWAKENING_GEAR={storm:'stormglass_staff',fault:'ironheart_plate',cinder:'coalheart_ring',caltrops:'glassfang'};
const AWAKENINGS=[
 {id:'storm',name:'Storm Relay',glyph:'ϟ',color:'#a9d6ff',effect:'Land near a pack to chain lightning through up to three enemies. Each jump applies Shock.',evolution:'The last target erupts, striking nearby enemies a second time.'},
 {id:'fault',name:'Faultline',glyph:'✦',color:'#ffc785',effect:'Land inside a pack to split the ground and break guard for Ground Slam and briefly stun ordinary enemies.',evolution:'The cracks open again after a short delay. Keep enemies over the impact site for a second hit.'},
 {id:'cinder',name:'Cinder Wake',glyph:'♨',color:'#ff987f',effect:'Leave a burning path for two seconds. Draw pursuers across it to burn and Ignite them.',evolution:'The trail also slows enemies, keeping them in the fire for longer.'}
];
const ROGUE_AWAKENINGS=[
 {id:'razors',legacy:'storm',name:'Razor Fan',glyph:'✧',color:'#dbc1ff',effect:'End Evade by throwing blades at up to three foes ahead.',evolution:'Each blade inflicts Bleed for three seconds.'},
 {id:'ambushcut',legacy:'fault',name:'Ambush Cut',glyph:'†',color:'#d696ee',effect:'Strike the nearest foe at your landing point and expose it for your next direct hit.',evolution:'Landing this strike refunds one second of Evade cooldown.'},
 {id:'caltrops',legacy:'cinder',name:'Shadow Caltrops',glyph:'✧',color:'#a0dfb5',effect:'Drop caltrops where you begin Evade. For two seconds they wound and slow pursuers.',evolution:'Each pulse also inflicts Bleed.'}
];
const CLASS_AWAKENINGS={
 warrior:[
  {id:'breach',legacy:'storm',name:'Shieldbreaker',glyph:'✦',color:'#e7b978',effect:'Strike the nearest foe on landing and break its guard for Ground Slam.',evolution:'A successful strike also grants Guard for one second.'},
  AWAKENINGS[1],
  {id:'gash',legacy:'cinder',name:'Rending Sweep',glyph:'⚔',color:'#df9090',effect:'Slash foes around your landing point and apply Bleed for Blood Furnace.',evolution:'Enemies already bleeding take double sweep damage.'}
 ],
 pyromancer:[
  AWAKENINGS[0],
  {id:'frost',legacy:'fault',name:'Frost Ring',glyph:'❄',color:'#9cd9f3',effect:'Chill nearby enemies on landing, slowing them for two seconds.',evolution:'The ring also Shocks its targets.'},
  AWAKENINGS[2]
 ],
 rogue:ROGUE_AWAKENINGS
};
function awakeningPaths(){return CLASS_AWAKENINGS[window.dodHeroClass]||CLASS_AWAKENINGS.warrior}
let awakeningFields=[];
function awakeningRank(id){return Math.min(AWAKENING_MASTERY,Math.max(0,Number(quest.evadeMastery?.[id]??quest.evadeMastery?.[awakeningPaths().find(path=>path.id===id)?.legacy])||0))}
function activeAwakening(){return quest.kills>=AWAKENING_UNLOCK&&awakeningPaths().find(path=>path.id===quest.evadeAwakening||(path.legacy&&path.legacy===quest.evadeAwakening))||null}
function creditAwakening(use){
 if(use.credited)return;
 use.credited=true;
 const rank=awakeningRank(use.id);
 if(rank>=AWAKENING_MASTERY)return;
 quest.evadeMastery={...quest.evadeMastery,[use.id]:rank+1};
 save();
 if(rank+1===AWAKENING_MASTERY){
  const path=awakeningPaths().find(entry=>entry.id===use.id);
  banner(path.name+' evolved');spellBurst(P.x,P.y,82,path.color);
 }
}
function awakeningPage(){
 const unlocked=quest.kills>=AWAKENING_UNLOCK,selected=activeAwakening();
 return `<section class="skillPage awaken-page"><h3>Evade Awakening</h3><p>${unlocked?'Equip one power. Land 15 damaging evades with it to evolve it.':'Defeat '+Math.max(0,AWAKENING_UNLOCK-(quest.kills||0))+' more enemies to awaken Evade.'}</p><div class="awaken-cards">${awakeningPaths().map(path=>{
  const rank=awakeningRank(path.id),equipped=selected?.id===path.id;
  const gear=witchRewardPool().find(item=>item.id===AWAKENING_GEAR[path.id]);
  const source=gear?'<small>'+esc(gear.n)+' · Blood Witch at Depth 6 after reaching Depth 12 · '+esc(FORGE_ORDER_SLOTS[gear.s])+' Legendary Forge Order</small><p>'+esc(gear.power)+'</p>':'';
  return `<article style="--rune:${path.color}"><span class="awaken-glyph" aria-hidden="true">${path.glyph}</span><h4>${path.name}</h4><p>${path.effect}</p><div><b>${rank===AWAKENING_MASTERY?'Evolved':'Evolution'}</b><p>${path.evolution}</p>${source}</div><label>Mastery · ${rank}/${AWAKENING_MASTERY}<progress value="${rank}" max="${AWAKENING_MASTERY}"></progress></label><button data-awakening="${path.id}" aria-pressed="${equipped}" ${!unlocked||equipped?'disabled':''}>${equipped?'Equipped':unlocked?'Equip '+path.name:'Locked'}</button></article>`;
 }).join('')}</div></section>`;
}
function faultImpact(field,mult){
 const targets=nearbySpellTargets(field,91);
 for(const enemy of targets){
  enemy.guardBreak=Math.max(enemy.guardBreak||0,tm+2);
  if(enemy.t!=='bs'&&!enemy.boss){enemy.stun=Math.max(enemy.stun||0,.5);if(enemy.attack&&!enemy.attack.recovering)enemy.attack=null}
  hit(enemy,field.damage*mult,null,false,true);
 }
 if(targets.length){
  creditAwakening(field.use);
  if(field.age>=.6&&hasGearPower('ironheart_plate')){
   P.ironheartT=Math.max(P.ironheartT||0,1);
   ring(P.x,P.y,67,'#7ecbff');
  }
 }
 spellBurst(field.x,field.y,91,'#ffc785');snd(104,.18,'triangle',.05,-40);
}
function releaseAwakening(dash){
 const use=dash.awakening;
 if(!use||P.dead)return;
 const S=stats(),damage=Math.max(S.AP,S.SP,1);
 if(['breach','gash','frost'].includes(use.id)){
  let targets=nearbySpellTargets(P,use.id==='frost'?110:90);
  if(use.id==='breach')targets=targets.sort((a,b)=>D(a,P)-D(b,P)).slice(0,1);
  for(const enemy of targets){
   const rend=use.id==='gash';
   hit(enemy,damage*(rend&&use.evolved&&enemy.bleedT>0?2:1),null,false,true);
   if(rend)startSkillBleed(enemy,damage*.20,3);
   if(use.id==='breach')enemy.guardBreak=Math.max(enemy.guardBreak||0,tm+2.5);
   if(use.id==='frost'){
    enemy.sl=Math.max(enemy.sl||0,2);
    if(use.evolved)applyShock(enemy,2);
   }
  }
  if(targets.length){
   creditAwakening(use);
   if(use.id==='breach'&&use.evolved)P.guard=Math.max(P.guard||0,1);
  }
  spellBurst(P.x,P.y,use.id==='frost'?110:90,awakeningPaths().find(path=>path.id===use.id).color);
  return;
 }
 if(use.id==='caltrops'){
  awakeningFields.push({...use.trail[0],use,damage,age:0,nextPulse:0});
  return;
 }
 if(use.id==='razors'||use.id==='ambushcut'){
  const fan=use.id==='razors';
  const targets=nearbySpellTargets(P,fan?155:89)
   .filter(e=>!fan||Math.abs(angleOffset(Math.atan2(e.y-P.y,e.x-P.x),Math.atan2(dash.vy,dash.vx)))<1.2)
   .sort((a,b)=>D(P,a)-D(P,b)).slice(0,fan?3:1);
  for(const e of targets){
   spellArc(P,e,fan?'#dbc1ff':'#d696ee','cut');
   hit(e,damage*(fan?.85:1.35),null,false,true);
   if(fan&&use.evolved)startSkillBleed(e,damage*.23,3);
   if(!fan)e.shadowMark=tm+3;
  }
  if(targets.length){
   creditAwakening(use);
   if(!fan&&use.evolved)P.evadeCd=Math.max(0,P.evadeCd-1);
  }
  return;
 }
 if(use.id==='storm'){
  const struck=new Set();let origin=P;
  for(let i=0;i<3;i++){
   const enemy=nearbySpellTargets(origin,i?104:125).filter(e=>!struck.has(e)).sort((a,b)=>D(a,origin)-D(b,origin))[0];
   if(!enemy)break;
   struck.add(enemy);spellArc(origin,enemy,'#a9d6ff');hit(enemy,damage*(1.05-i*.13),{shock:2},false,true);origin=enemy;
  }
  if(struck.size){
   creditAwakening(use);snd(540,.13,'triangle',.045,210);
   if(use.evolved){
    const center={x:origin.x,y:origin.y};
    const pull=hasGearPower('stormglass_staff');
    const radius=pull?104:68;
    spellBurst(center.x,center.y,radius,'#b5aeff');
    for(const enemy of nearbySpellTargets(center,radius)){
     const distance=D(enemy,center);
     if(pull&&!enemy.boss&&enemy.t!=='bs'&&distance>18){
      const step=Math.min(42,distance-18);
      for(let moved=0;moved<step;moved+=6){
       const fraction=Math.min(6,step-moved)/distance;
       mv(enemy,(center.x-enemy.x)*fraction,(center.y-enemy.y)*fraction);
      }
      spellArc(center,enemy,'#a9d6ff');
     }
     hit(enemy,damage*.72,{shock:1},false,true);
    }
   }
  }
  return;
 }
 const field={x:P.x,y:P.y,use,damage,age:0,nextPulse:0};
 if(use.id==='fault')faultImpact(field,1.3);
 else use.trail.push({x:P.x,y:P.y});
 awakeningFields.push(field);
}
function updateAwakeningFields(dt){
 if(!awakeningFields.length)return;
 if(P.dead){awakeningFields=[];return}
 awakeningFields=awakeningFields.filter(field=>{
  field.age+=dt;
  if(field.use.id==='caltrops'){
   if(field.age>=2)return false;
   if(field.age>=field.nextPulse){
    field.nextPulse+=.5;
    const targets=nearbySpellTargets(field,55);
    for(const e of targets){
     e.sl=Math.max(e.sl||0,1.2);
     hit(e,field.damage*.35,null,false,true);
     if(field.use.evolved)startSkillBleed(e,field.damage*.18,2);
    }
    if(targets.length)creditAwakening(field.use);
   }
   return true;
  }
  if(field.use.id==='fault'){
   if(field.age<.6)return true;
   if(field.use.evolved)faultImpact(field,.94);
   return false;
  }
  if(field.age>=2.1)return false;
  if(field.age>=field.nextPulse){
   field.nextPulse+=.48;
   const enemies=new Set();
   for(const point of field.use.trail)for(const enemy of nearbySpellTargets(point,27))enemies.add(enemy);
   for(const enemy of enemies){
    if(field.use.evolved)enemy.sl=Math.max(enemy.sl||0,1.1);
    hit(enemy,field.damage*.28,{ignite:field.damage*.16},false,true);
   }
   if(enemies.size)creditAwakening(field.use);
  }
  return true;
 });
}
function drawAwakeningFields(){
 if(!awakeningFields.length)return;
 g.save();g.lineCap='round';g.lineJoin='round';
 for(const field of awakeningFields){
  if(field.use.id==='caltrops'){
   g.globalAlpha=Math.min(.9,(2-field.age)*3);g.strokeStyle='#a0dfb5';g.lineWidth=2;
   for(let i=0;i<9;i++){
    const a=i*2.4,r=12+3*i,x=field.x+Math.cos(a)*r,y=field.y+Math.sin(a)*r;
    g.beginPath();g.moveTo(x-4,y+3);g.lineTo(x,y);g.lineTo(x+4,y+3);g.moveTo(x,y);g.lineTo(x,y-6);g.stroke();
   }
   continue;
  }
  if(field.use.id==='fault'){
   const reach=55+Math.min(1,field.age*7)*30;
   g.strokeStyle=field.use.evolved?'#ffe4a8':'#ffaf71';g.lineWidth=2.3;
   g.globalAlpha=field.use.evolved?.8:Math.max(0,1-field.age/.6);
   for(let i=0;i<7;i++){
    const a=i*Math.PI*2/7+.2;
    g.beginPath();g.moveTo(field.x,field.y);
    for(let j=1;j<=4;j++){const angle=a+Math.sin(j*7+i)*.16;g.lineTo(field.x+Math.cos(angle)*reach*j/4,field.y+Math.sin(angle)*reach*j/4)}
    g.stroke();
   }
  }else{
   const trail=field.use.trail;
   g.globalAlpha=Math.min(.75,(2.1-field.age)*1.7);
   for(const [width,color] of [[27,'#7b2829'],[12,'#dd5139'],[3,'#ffcc7d']]){
    g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(trail[0].x,trail[0].y);
    for(const point of trail)g.lineTo(point.x,point.y);
    g.stroke();
   }
   g.fillStyle='#ffe59a';
   for(let i=0;i<trail.length;i++){const point=trail[i],lift=(field.age*28+i*5)%15;g.fillRect(point.x+Math.sin(i+field.age*5)*5,point.y-lift,2,3)}
  }
 }
 g.restore();
}

function combatFocus(cls=window.dodHeroClass||'warrior'){
 if(P.lv<3)return null;
 const paths=FOCUS_PATHS[cls]||FOCUS_PATHS.warrior;
 return paths.find(path=>path.id===quest.combatFocus)?.id||paths[0].id;
}

function focusControls(cls){
 const unlocked=P.lv>=3,selected=combatFocus(cls);
 if(!unlocked)return '<section class="focus-picker"><h3>🔒 Specialization · Unlocks at Level 3</h3><p style="margin:4px 0 0;color:#9e8f7a;font-size:12px">Gain Level 3 to unlock your class Combat Focus specialization.</p></section>';
 return '<section class="focus-picker"><header><h3>Specialization</h3><button type="button" data-camera-mode>Camera · '+(angledView?'Angled':'Top-down')+'</button></header><div>'+FOCUS_PATHS[cls].map(path=>
  '<button type="button" data-combat-focus="'+path.id+'" aria-pressed="'+(path.id===selected)+'"><b>'+path.name+'</b><small>'+path.detail+'</small></button>'
 ).join('')+'</div></section>';
}

function startSkillBleed(enemy,damage,duration=2.8){
 enemy.bleedD=Math.max(enemy.bleedD||0,damage);
 enemy.bleedT=Math.max(enemy.bleedT||0,duration);
 enemy.bleedTick=Math.min(enemy.bleedTick||.32,.32);
}

function breakWindup(enemy){
 if(!enemy.attack||enemy.attack.recovering)return false;
 enemy.attack=null;
 enemy.guardBreak=tm+3.5;
 if(combatFocus()==='bastion')CD[3]=Math.max(0,CD[3]-1.5);
 ft(enemy.x,enemy.y-enemy.r-14,'GUARD BROKEN','#ffc381',1);
 ring(enemy.x,enemy.y,47,'#ffc381');
 return true;
}

const hasGearPower=id=>P.eq.some(item=>item&&(item.id===id||item.aspectId===id));
function directCombatFocus(enemy,S,critical){
 P.mp=Math.min(S.M,P.mp+((P.nextStrikeMana||0)<=tm?1.8:0));
 if((P.nextStrikeMana||0)<=tm)P.nextStrikeMana=tm+.16;
 if(stormHalo&&enemy.shockT>0&&hasGearPower('stormglass_staff')&&stormHalo.extended<1.5){
  const extension=Math.min(.25,1.5-stormHalo.extended);
  stormHalo.extended+=extension;stormHalo.remaining+=extension;
 }
 const focus=combatFocus();
 if(focus==='bloodforged'&&critical&&!(enemy.bleedT>0)){
  startSkillBleed(enemy,Math.max(2,Math.round(S.AP*.22)),2.8);
 }
 if(focus==='venomblade'){
  enemy.venomStacks=((enemy.venomStacks||0)+1)%3;
  if(!enemy.venomStacks){
   startSkillBleed(enemy,Math.max(2,Math.round(S.AP*.29)),2.4);
   enemy.sl=Math.max(enemy.sl||0,1.3);
   burst(enemy.x,enemy.y,'#a1e29a',9,115,.26,2);
  }
 }
}

let spellFields=[],stormHalo=null;

function hasSight(a,b){
 const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
 return combatLineDistance(a.x,a.y,Math.atan2(dy,dx),d)>=d;
}

function nearbySpellTargets(center,radius){
 return E.filter(enemy=>!enemy.dead&&enemy.tk+(PD[enemy.id]||0)<enemy.mh&&D(center,enemy)<=radius+enemy.r&&hasSight(center,enemy));
}

function spellArrowPoint(distance){
 const angle=P.face,reach=combatLineDistance(P.x,P.y,angle,distance);
 return {x:P.x+Math.cos(angle)*reach,y:P.y+Math.sin(angle)*reach};
}

const ADVANCED_SPELL_IDS=new Set(['ironhook','bloodfurnace','stormhalo','cindersigil','nightsnare','reaperscut']);
function castAdvancedSpell(id,S){
 if(!ADVANCED_SPELL_IDS.has(id))return false;
 const base=weaponRoll(S);
 switch(id){
  case 'ironhook':{
   const targets=nearbySpellTargets(P,235).filter(enemy=>Math.abs(angleOffset(Math.atan2(enemy.y-P.y,enemy.x-P.x),P.face))<.7)
    .sort((a,b)=>Math.abs(angleOffset(Math.atan2(a.y-P.y,a.x-P.x),P.face))-Math.abs(angleOffset(Math.atan2(b.y-P.y,b.x-P.x),P.face))||D(P,a)-D(P,b)).slice(0,quest.hookTraining?((quest.hookTechnique==='fork_hook'||hasGearPower('fork_hook'))?2:1):3);
   const end=spellArrowPoint(210);
   if(!targets.length)spellArc(P,end,'#e9b78b','hook');
   for(const enemy of targets){
    spellArc(P,enemy,'#f0c6a0','hook');
    hit(enemy,base*.9);
    breakWindup(enemy);
    enemy.guardBreak=Math.max(enemy.guardBreak||0,tm+2);
    if(quest.hookTechnique==='barbed_hook'||hasGearPower('barbed_hook'))startSkillBleed(enemy,Math.max(2,Math.round(base*.32)),3);
    if(enemy.t!=='bs'&&!enemy.boss){
     const d=Math.max(1,D(P,enemy)),pull=Math.max(0,Math.min(119,d-36)),dx=(P.x-enemy.x)/d,dy=(P.y-enemy.y)/d;
     for(let step=0;step<8;step++)mv(enemy,dx*pull/8,dy*pull/8);
     enemy.stun=Math.max(enemy.stun||0,.38);
    }
    spellBurst(enemy.x,enemy.y,35,'#f8ae72');
   }
   snd(295,.15,'sawtooth',.05,-105);
   return true;
  }
  case 'bloodfurnace':{
   const sm=spellMod('bloodfurnace','warrior'),clRank=talentRank('weapon','cleave');
   let consumed=0;
   for(const enemy of nearbySpellTargets(P,125)){
    const bleed=enemy.bleedT>0;
    if(bleed){enemy.bleedT=0;consumed++;spellBurst(enemy.x,enemy.y,52,'#f36880')}
    hit(enemy,base*(bleed?2.25:1.18)*(1+clRank*.08)*sm.dmgMult*(sm.rune==='a'?1.35:1),sm.rune==='a'?{ignite:S.AP*.24}:null);
   }
   if(consumed)P.hp=Math.min(S.H,P.hp+S.H*(sm.rune==='b'?.07:.035)*Math.min(5,consumed));
   spellBurst(P.x,P.y,125,'#ed506d');
   snd(92,.25,'triangle',.07,55);
   return true;
  }
  case 'stormhalo':{
   const sm=spellMod('stormhalo','pyromancer'),stRank=window.dodProgression?.getClassTalents?.('pyromancer')?.cataclysm?.stormcall||0;
   stormHalo={remaining:4.2+(sm.rune==='b'?2.0:0),age:0,pulse:.02,extended:0,damage:(S.SP*.48+base*.36)*(1+stRank*.08)*sm.dmgMult*(sm.rune==='a'?1.25:1)};
   spellBurst(P.x,P.y,99,'#9bcaff');
   snd(530,.23,'triangle',.06,290);
   return true;
  }
  case 'cindersigil':{
   const point=spellArrowPoint(137);
   spellFields.push({...point,kind:id,age:0,arm:.44,life:3.35,pulse:.44,radius:104,color:'#ff9b64',damage:S.SP*.9+base*.65,ignite:S.SP*.24,ticks:0});
   snd(350,.15,'triangle',.035,-105);
   return true;
  }
  case 'nightsnare':{
   const point=spellArrowPoint(90);
   spellFields.push({...point,kind:id,age:0,arm:.28,life:6,radius:89,color:'#d5a7ff',damage:base*1.42});
   snd(520,.13,'sine',.045,-170);
   return true;
  }
  case 'reaperscut':{
   const targets=nearbySpellTargets(P,150).filter(enemy=>Math.abs(angleOffset(Math.atan2(enemy.y-P.y,enemy.x-P.x),P.face))<1.3);
   let killed=0;
   for(const enemy of targets){
    hit(enemy,base*(enemy.bleedT>0?2.25:1.35));
    if(enemy.tk+(PD[enemy.id]||0)>=enemy.mh)killed++;
    spellBurst(enemy.x,enemy.y,34,'#dcb1ff');
   }
   if(killed)P.evadeCd=Math.max(0,(P.evadeCd||0)-Math.min(1.35,killed*.45));
   const tip=spellArrowPoint(131);
   spellArc(P,tip,'#dfb7ff','cut');
   snd(235,.19,'sawtooth',.045,95);
   return true;
  }
  default:return false;
 }
}

function stormOrb(halo,i,time=halo.age){
 const angle=time*3.9+i*Math.PI*2/3;
 return {x:P.x+Math.cos(angle)*83,y:P.y+Math.sin(angle)*83};
}

function updateStormHalo(dt){
 const halo=stormHalo;
 if(!halo)return;
 halo.remaining-=dt;halo.age+=dt;halo.pulse-=dt;
 if(halo.remaining<=0){stormHalo=null;return}
 if(halo.pulse>0)return;
 const pyRunes=spellMod('stormhalo','pyromancer');
 halo.pulse=pyRunes.rune==='b'?.26:.36;
 const struck=new Set();
 for(let i=0;i<3;i++){
  const orb=stormOrb(halo,i);
  if(wl(orb.x,orb.y))continue;
  const targets=nearbySpellTargets(orb,46).filter(enemy=>!struck.has(enemy)).slice(0,2);
  for(const enemy of targets){
   struck.add(enemy);
   spellArc(orb,enemy,'#a8d9ff');
   hit(enemy,halo.damage,{shock:2.3},false,true);
   const next=nearbySpellTargets(enemy,88).find(other=>!struck.has(other));
   if(next){
    struck.add(next);spellArc(enemy,next,'#ae95ff');
    hit(next,halo.damage*.56,{shock:1.7},false,true);
   }
  }
 }
 if(struck.size)snd(470,.10,'triangle',.038,230);
}

function updateSpellFields(dt){
 updateAwakeningFields(dt);
 updateStormHalo(dt);
 spellFields=spellFields.filter(field=>{
  field.age+=dt;
  if(field.age>=field.life)return false;
  if(field.age<field.arm)return true;
  const targets=nearbySpellTargets(field,field.radius);
  if(field.kind==='nightsnare'){
   if(!targets.length)return true;
   for(const enemy of targets){
    hit(enemy,field.damage);
    enemy.shadowMark=tm+3.2;
    enemy.sl=Math.max(enemy.sl||0,2.4);
   }
   spellBurst(field.x,field.y,field.radius,field.color);
   snd(260,.17,'triangle',.055,-105);
   return false;
  }
  if(field.age<field.pulse)return true;
  field.pulse+=.79;
  const first=field.ticks++===0;
  for(const enemy of targets)hit(enemy,field.damage*(first?1.35:.36),{ignite:field.ignite},false,!first);
  if(first){spellBurst(field.x,field.y,field.radius,field.color);snd(120,.24,'triangle',.07,-55)}
  else burst(field.x,field.y,field.color,10,95,.42,2);
  return true;
 });
}

function cast(i){if(i===wwIndex())return;if(WW.active)stopWhirl();const S=stats(),a=AB[i],slotIdx=abilityLoadout.indexOf(i);if(!a||P.dead||P.lv<a.unlock||slotIdx<0||slotIdx>=activeSkillSlotCap()||CD[i]>0||P.mp<a.mp)return;const sm=spellMod(a.id,'warrior');let cdBase=a.cd*sm.cdMult;if(a.id==='charge'&&sm.rune==='b')cdBase=Math.max(1.5,cdBase-1.5);if(a.id==='shieldwall'&&sm.rune==='b')cdBase=Math.max(3,cdBase-2);P.mp-=a.mp;CD[i]=cdBase*.88*(1-S.cdr/100);if(hasGearPower('frostfang_boots'))P.phaseStrideT=3.0;P.ac++;P.an=1;if(castAdvancedSpell(a.id,S))return;if(['shieldbash','whirlwind','rend','execution'].includes(a.id))combatEffect(a.id==='shieldbash'||a.id==='whirlwind'?a.id:'slash',P.x,P.y,P.face);
 const c=Math.cos(P.face),s=Math.sin(P.face),hitArc=(range,damage)=>E.forEach(e=>{if(!e.dead&&D(P,e)<range+e.r&&Math.abs(Math.atan2(Math.sin(Math.atan2(e.y-P.y,e.x-P.x)-P.face),Math.cos(Math.atan2(e.y-P.y,e.x-P.x)-P.face)))<1.55)hit(e,damage)});
 if(a.id==='shieldbash'){const e=facingTarget(118);if(e){breakWindup(e);hit(e,weaponRoll(S)*(1.8+talentRank('weapon','shieldbash')*.08)*sm.dmgMult*(sm.rune==='a'?1.25:1));e.stun=1+talentRank('weapon','shieldbash')*.15+(sm.rune==='a'?.8:0);if(sm.rune==='b'){P.guard=Math.max(P.guard||0,1.5);P.mp=Math.min(S.M,P.mp+8)}if(P.eq[0]?.id==='wardens_oath'&&P.eq[8]?.id==='wardens_aegis'){P.guard=Math.max(P.guard||0,2.2);P.lastBastion=2.2;ring(P.x,P.y,84,'#82d7ef')}}ring(P.x+c*35,P.y+s*35,58,'#e6c275');burst(P.x+c*35,P.y+s*35,'#e6c275',18,180,.35);snd(130,.18,'square',.08,-50)}
 else if(a.id==='charge'){const rank=talentRank('weapon','charge'),speed=1050+rank*55;P.dash={vx:c*speed,vy:s*speed,t:.28+rank*.025,h:new Set(),skillMult:(1.8+rank*.12)*sm.dmgMult*(sm.rune==='a'?1.35:1),stunDur:sm.rune==='a'?.6:0};P.inv_t=.32;if(sm.rune==='b')P.slipstreamUntil=Math.max(P.slipstreamUntil||0,tm+2.5);ring(P.x,P.y,45,'#c7a75f');snd(500,.15,'triangle',.06,300)}
 else if(a.id==='groundslam'){const rank=talentRank('guardian','groundslam'),radius=145+rank*9+(sm.rune==='a'?34:0);let hadBreak=false;combatEffect('groundslam',P.x,P.y,P.face,{radius});nearbySpellTargets(P,radius).forEach(e=>{if(sm.rune==='b')breakWindup(e);const broken=e.guardBreak>tm;e.guardBreak=0;if(broken)hadBreak=true;hit(e,weaponRoll(S)*(1.7+rank*.07)*sm.dmgMult*(sm.rune==='a'?1.2:1)*(broken?1.75:1));if(broken){ring(e.x,e.y,76,'#ffd18a');burst(e.x,e.y,'#ffc277',22,220,.46,4);P.mp=Math.min(S.M,P.mp+10)}e.sl=Math.max(e.sl||0,sm.rune==='b'?4.0:2.5);if(rank>=5)hit(e,weaponRoll(S)*.65)});if(hadBreak&&hasButcherTrait('faultline'))groundSlamFaultline(weaponRoll(S)*1.1);ring(P.x,P.y,radius,'#d98c56');burst(P.x,P.y,'#e6a46a',32,250,.55);sh+=5;snd(90,.28,'sawtooth',.08,-55)}
 else if(a.id==='rend'){const ranks=window.dodProgression?.getTalents?.().reaver||{},clRank=talentRank('weapon','cleave'),reach=sm.rune==='b'?175:138,chain={seen:new Set(),count:0};let hitAny=false;hitArc(reach,weaponRoll(S)*(1.1+(ranks.rend||0)*.08+clRank*.08)*sm.dmgMult);if(clRank>=5)hitArc(reach,weaponRoll(S)*.65);E.forEach(e=>{if(!e.dead&&D(P,e)<reach+e.r&&Math.abs(Math.atan2(Math.sin(Math.atan2(e.y-P.y,e.x-P.x)-P.face),Math.cos(Math.atan2(e.y-P.y,e.x-P.x)-P.face)))<1.55){hitAny=true;e.bleedT=4+(ranks.rend||0)*.35+(sm.rune==='a'?1.5:0)+(P.eq[0]?.id==='bloodletter'?1:0);e.bleedTick=(window.dodWhirlTrialLevel?.4:.5)*(P.eq[0]?.id==='bloodletter' ? 0.75 : 1);e.bleedD=weaponRoll(S)*(.22+(ranks.rend||0)*.045)*(1+(ranks.bloodtempo||0)*.1)*sm.dmgMult*(sm.rune==='a'?1.35:1)*(P.eq[0]?.id==='bloodletter'?1.25:1);e.bleedChain=chain;chain.seen.add(e);chain.count++}});if(hitAny&&sm.rune==='b')P.hp=Math.min(S.H,P.hp+12);ring(P.x+c*48,P.y+s*48,88,'#a83136');burst(P.x+c*48,P.y+s*48,'#d23d46',22,190,.4);snd(115,.2,'sawtooth',.07,-35)}
 else if(a.id==='shieldwall'){P.guard=3+talentRank('guardian','shieldwall')*.45+(sm.rune==='b'?1.5:0);P.inv_t=Math.max(P.inv_t,.25);if(sm.rune==='a'){for(const q of nearbySpellTargets(P,115))hit(q,S.AP*1.35*sm.dmgMult)}ring(P.x,P.y,82,'#86a9a5');burst(P.x,P.y,'#a7c6be',22,140,.45);snd(100,.25,'triangle',.07,120)}
 else if(a.id==='execution'){const e=facingTarget(175);if(e){const low=e.hp/e.mh<(sm.rune==='a'?.5:.35);hit(e,weaponRoll(S)*(2.4+talentRank('reaver','execution')*.12)*sm.dmgMult*(low?1.6:1),null,low);if(sm.rune==='b'&&(e.dead||e.tk+(PD[e.id]||0)>=e.mh)){CD[i]*=.5;P.mp=Math.min(S.M,P.mp+15)}}ring(P.x+c*38,P.y+s*38,62,'#a74640');burst(P.x+c*38,P.y+s*38,'#d56548',18,190,.35);snd(85,.24,'sawtooth',.08,-40)}
}
function usePotion(){if(P.dead)return;const S=stats();if(P.hp>=S.H){banner('Health is already full');return}const usingReserve=CD[POTION_CD]>0;if(usingReserve&&elixirs<=0){banner('Health potion is recharging');return}if(usingReserve)elixirs--;else CD[POTION_CD]=POTION.cd*(window.dodParagonPotionMult||1);const swRank=(window.dodHeroClass||'warrior')==='warrior'?(window.dodProgression?.getClassTalents?.('warrior')?.guardian?.secondwind||0):0;const healPct=.38+swRank*.05,before=P.hp;P.hp=Math.min(S.H,P.hp+S.H*healPct);ft(P.x,P.y-30,'+'+Math.round(P.hp-before)+(usingReserve?' Elixir':' Health'),usingReserve?'#ffd46b':'#6f6',1.2);burst(P.x,P.y,usingReserve?'#ffd46b':'#6f6',24,100,.8);renderSkillSlots?.();save();snd(400,.3,'sine',.07,300)}
function canEquipItem(it){return !(it.s===8&&(P.eq[0]?.handed==='two'||it.handed==='two'))}
function canPickupItem(it){return P.inv.length<24||(!P.eq[it.s]&&canEquipItem(it)&&!(it.s===0&&it.handed==='two'&&P.eq[8]&&P.inv.length>=24))}
function shouldAutoSalvage(it){if(!it||it.locked||it.unique||it.mythic||it.set)return false;const rarityMatch=(dodLootFilter==='common'&&it.r===0)||(dodLootFilter==='magic'&&it.r<=1);if(!rarityMatch)return false;if(canEquipItem(it)&&(!P.eq[it.s]||sc(it)>sc(P.eq[it.s])))return false;return true}
function autoSalvageItem(it,silent=false){if(!it)return {scrap:0,essence:0,frags:0,gVal:0};const r=Math.max(0,Math.min(4,+it.r||0));const scrap=[2,4,8,14,24][r]||2,essence=[0,0,1,3,6][r]||0,frags=r===4?1:0,gVal=[4,8,16,36,75][r]||4;try{const m=JSON.parse(localStorage.getItem('dod3meta')||'{}');m.scrap=(+m.scrap||0)+scrap;m.essence=(+m.essence||0)+essence;localStorage.setItem('dod3meta',JSON.stringify(m));if(window.dodSanctuary?.meta){window.dodSanctuary.meta.scrap=m.scrap;window.dodSanctuary.meta.essence=m.essence}}catch(e){}if(frags)dodAbyssFragments+=frags;if(r>=3&&it.power)window.dodExtractAspect?.(it);window.dodGold?.add?.(gVal);if(!silent){ft(P.x,P.y-30,`+${scrap} Salvage${essence?` · +${essence} Ess`:''} · +${gVal}g`,'#c9a24a',.85);snd(540,.09,'triangle',.035,180)}return {scrap,essence,frags,gVal}}
function take(it){if(it.r>=3)it.unique=true;if(it.r===4)it.mythic=true;if(!it.keepRaw&&shouldAutoSalvage(it)){autoSalvageItem(it);save();return}const q=RAR[it.r]||RAR[0];if(!P.eq[it.s]&&canEquipItem(it)){if(it.s===0&&it.handed==='two'&&P.eq[8]){if(P.inv.length<24){P.inv.push(P.eq[8]);P.eq[8]=null;P.eq[0]=it}else{LT.push({x:P.x+R(-16,16),y:P.y+R(-16,16),it,t:0});banner('Backpack is full · item dropped nearby');return}}else P.eq[it.s]=it}else{if(P.inv.length>=24){LT.push({x:P.x+R(-16,16),y:P.y+R(-16,16),it,t:0});banner('Backpack is full · item dropped nearby');return}P.inv.push(it)}ft(P.x,P.y-36,it.n,q[1],1.2);snd(it.r>1?660:440,.15,'triangle',.06,200);
 if(it.r>=2){burst(P.x,P.y,q[1],it.r*14,260,.8,4);if(it.r>=3){banner((it.r===4?'✦ MYTHIC: ':'')+it.n);sh+=(it.r===4?9:5)}}renderInv();save()}
const others=()=>room?room.peers().filter(p=>!p.isMe&&p.presence&&p.presence.f===fl&&typeof p.presence.x=='number'):[];
function onPeers(ch){PD={};for(const p of ch.peers){const s=p.presence;if(p.isMe||!s)continue;
 if(s.f===fl&&s.dm)for(const k in s.dm)PD[k]=(PD[k]||0)+(+s.dm[k]||0);
 if(s.a!==undefined&&PA[p.peer]!==undefined&&PA[p.peer]!==s.a&&s.f===fl){const r=RP[p.peer]||s;RG.push({x:r.x,y:r.y,r:70,m:.25,t:0,c:col(s.c),a:+s.fa||0})}PA[p.peer]=s.a}}
function nearestAttackTarget(facing=null){
 let nearest=null,distance=window.dodHeroClass==='warrior'?(P.primaryBeat===2?161:104):350;
 for(const e of E){if(e.dead)continue;const d=D(P,e);if(d>=distance||facing!==null&&Math.abs(angleOffset(Math.atan2(e.y-P.y,e.x-P.x),facing))>1.2)continue;if(hasSight(P,e)){nearest=e;distance=d}}
 return nearest;
}
const EVADE_COOLDOWN = 2.8;


function markRogueCrossings(dash){
 if(window.dodHeroClass!=='rogue'||!dash.shadowStart)return;
 const ax=dash.shadowStart.x,ay=dash.shadowStart.y;
 const dx=P.x-ax,dy=P.y-ay,length=Math.hypot(dx,dy);
 if(length<30)return;
 for(const enemy of E){
  if(enemy.dead)continue;
  const ex=enemy.x-ax,ey=enemy.y-ay,along=(ex*dx+ey*dy)/length;
  const perpendicular=Math.abs(ex*dy-ey*dx)/length;
  if(along>7&&along<length-7&&perpendicular<enemy.r+16){
   enemy.shadowMark=tm+3.2;
   ring(enemy.x,enemy.y,enemy.r+18,'#bd91ff');
   ft(enemy.x,enemy.y-enemy.r-12,'EXPOSED','#dcbaff',.95);
  }
 }
}

const BUTCHER_TRAITS={
 warrior:{id:"bloodletter",trait:"faultline",power:"Guard Break: Ground Slam sends a second shockwave forward."},
 pyromancer:{id:"cinderstaff",trait:"firechain",power:"Wildfire: Flame Nova jumps to one additional burning enemy beyond the blast."},
 rogue:{id:"nightstalker_dirk",trait:"pursuit",power:"Ambush: Killing an exposed enemy refunds up to 1.4 seconds of Evade cooldown."}
};

function hasButcherTrait(trait){return P.eq[0]?.butcherTrait===trait}

function groundSlamFaultline(damage){
 const reach=267,width=48,dx=Math.cos(P.face),dy=Math.sin(P.face);
 for(const enemy of E){
  if(enemy.dead)continue;
  const ex=enemy.x-P.x,ey=enemy.y-P.y,along=ex*dx+ey*dy,distance=Math.hypot(ex,ey);
  if(along<36||along>reach||Math.abs(ex*dy-ey*dx)>width+enemy.r)continue;
  if(combatLineDistance(P.x,P.y,Math.atan2(ey,ex),distance)>=distance)hit(enemy,damage,null,false,true);
 }
 for(let travel=62;travel<=reach;travel+=32){
  const x=P.x+dx*travel,y=P.y+dy*travel;
  if(wl(x,y))break;
  ring(x,y,34,"#ffd795");burst(x,y,"#f4ae69",8,120,.4,3);
 }
 snd(83,.26,"triangle",.07,55);
}

function spreadNovaFire(sources,damage,ignite,novaTargets){
 if(!sources.length)return;
 if(hasButcherTrait('firechain')){
  let jump=null,nearest=180;
  for(const source of sources){
   for(const enemy of E){
    if(enemy.dead||!(enemy.igniteT>0)||novaTargets.includes(enemy))continue;
    const d=D(source,enemy);
    if(d<nearest&&combatLineDistance(source.x,source.y,Math.atan2(enemy.y-source.y,enemy.x-source.x),d)>=d){jump=enemy;nearest=d}
   }
  }
  if(jump){jump.igniteT=0;hit(jump,damage*1.45,null,false,true);sources=[...sources,jump]}
 }
 const radius=118,scorched=new Set(sources);
 for(const source of sources){
  for(const enemy of E){
   const d=D(source,enemy),angle=Math.atan2(enemy.y-source.y,enemy.x-source.x);
   if(enemy.dead||scorched.has(enemy)||d>=radius+enemy.r||combatLineDistance(source.x,source.y,angle,d)<d)continue;
   scorched.add(enemy);
   hit(enemy,damage*.58,{ignite},false,true);
  }
  ring(source.x,source.y,radius,'#ffc273');
  burst(source.x,source.y,'#ffc273',14,195,.35,3);
 }
 snd(170,.2,'triangle',.05,70);
}

const CLASS_COUNTERS={
 warrior:{name:'Guard Break',idle:'Hook a foe or strike ◇, then Ground Slam.',ready:'Guard broken · use Ground Slam',color:'#f0b571'},
 pyromancer:{name:'Wildfire',idle:'Fireball or strike ◇ to Ignite, then Nova.',ready:'Enemies burning · use Flame Nova',color:'#ff9763'},
 rogue:{name:'Ambush',idle:'Cross a foe with Evade or strike ◇ to expose.',ready:'Enemy exposed · land a direct hit',color:'#ceabff'}
};

function paintClassCounter(){
 const panel=$('classCounter'),cls=window.dodHeroClass||'warrior',counter=CLASS_COUNTERS[cls]||CLASS_COUNTERS.warrior;
 panel.hidden=$('evadeButton').hidden;
 if(panel.hidden)return;
 const ready=E.some(enemy=>!enemy.dead&&D(P,enemy)<(cls==='pyromancer'?155+enemy.r:270)&&(cls==='warrior'?enemy.guardBreak>tm:cls==='rogue'?enemy.shadowMark>tm:enemy.igniteT>0));
 panel.dataset.ready=String(ready);
 panel.style.setProperty('--class-accent',counter.color);
 panel.querySelector('strong').textContent=counter.name;
 panel.querySelector('span').textContent=ready?counter.ready:counter.idle;
}

function evade(){
 if(P.dash||P.evadeCd>0||whirlBlocked()||['codexPanel','enchanterPanel','ossuaryReward','campaignSpoils'].some(id=>{
  const panel=$(id);
  return panel&&getComputedStyle(panel).display!=='none';
 }))return;
 const x=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
 const y=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
 const target=$('mobileStick')?.classList.contains('is-active')?P.mv:null;
 const angle=x||y?Math.atan2(y,x):target?Math.atan2(target.y-P.y,target.x-P.x):P.face;
 const dx=Math.cos(angle),dy=Math.sin(angle);
 if(!(Math.abs(dx)>.01&&fits(P.x+dx*14,P.y,P.r))&&!(Math.abs(dy)>.01&&fits(P.x,P.y+dy*14,P.r)))return;
 stopWhirl();
 P.tgt=P.mv=null;
 P.face=angle;
 P.at=Math.min(P.at,.13);
 P.inv_t=Math.max(P.inv_t,.27);
 P.evadeCd=EVADE_COOLDOWN;
 if(hasGearPower('slipstream_boots'))P.slipstreamUntil=tm+1.8;
 if(hasCampaignRelic('emberglass'))P.emberglassUntil=tm+2.5;
 P.dash={evade:true,vx:dx*650,vy:dy*650,t:.23,shadowStart:{x:P.x,y:P.y}};
 const path=activeAwakening();
 if(path)P.dash.awakening={id:path.id,evolved:awakeningRank(path.id)>=AWAKENING_MASTERY,trail:[{x:P.x,y:P.y}]};
 combatEffect('charge',P.x,P.y,angle,{length:34});
 snd(480,.09,'triangle',.04,-220);
}

function finishEvade(){
 if(P.eq[3]?.id!=='ossuary_stormstep')return;
 const reach=105, S=stats();
 for(const e of E){
  const d=D(P,e),angle=Math.atan2(e.y-P.y,e.x-P.x);
  if(!e.dead&&d<reach+e.r&&combatLineDistance(P.x,P.y,angle,d)>=d){
   hit(e,Math.max(S.AP,S.SP)*1.65,{shock:2},false,true);
  }
 }
 ring(P.x,P.y,reach,'#83e3ff');
 burst(P.x,P.y,'#a7eaff',24,220,.34,3);
 snd(560,.17,'triangle',.06,90);
}

function ossuaryRewardReady(){
 return fl===1&&!quest.ossuaryReward&&!window.dodWhirlTrialLevel&&
  E.some(e=>e.openingPack===1)&&!E.some(e=>e.openingPack===1&&!e.dead);
}

function update(dt){const paused=!!($('inv').style.display==='block'||$('adv').style.display==='block'||$('admin').style.display==='block'||$('worldPanel')?.style.display==='block'||$('progPanel')?.style.display==='block'||$('d3service')?.style.display==='block'||$('classStart')?.style.display==='grid'||$('bossRewards')?.style.display==='grid'||$('ossuaryReward')?.open);if(paused){stopWhirl();P.hp=Math.min(stats().H,P.hp);P.mp=Math.min(stats().M,P.mp);return}const S=stats();P.evadeCd=Math.max(0,(P.evadeCd||0)-dt);P.bossExitCooldown=Math.max(0,(P.bossExitCooldown||0)-dt);P.bloodEcho=Math.max(0,(P.bloodEcho||0)-dt);P.lastBastion=Math.max(0,(P.lastBastion||0)-dt);P.hp=Math.min(S.H,P.hp+dt*(.35+S.H*.0012));P.mp=Math.min(S.M,P.mp+dt*(5+S.M*.06+S.mregen));
 updateWhirl(dt);updateSpellFields(dt);for(let i=0;i<CD.length;i++)CD[i]=Math.max(0,CD[i]-dt);P.guard=Math.max(0,(P.guard||0)-dt);if(P.blade>0){P.blade=Math.max(0,P.blade-dt);P.bladeTick-=dt;if(P.bladeTick<=0){P.bladeTick=.22;E.forEach(e=>{if(!e.dead&&D(P,e)<125+e.r)hit(e,weaponRoll(S)*1.15,true,true,true)});ring(P.x,P.y,112,'#ff6a1b');burst(P.x+R(-55,55),P.y+R(-55,55),'#ff9a28',5,160,.25,3)}}P.inv_t-=dt;P.slowT=Math.max(0,(P.slowT||0)-dt);P.guardCd=Math.max(0,P.guardCd-dt);P.at-=dt;P.an=Math.max(0,P.an-dt*4);hurtT=Math.max(0,hurtT-dt);sh*=Math.pow(.9,dt*60);
 const kx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),ky=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0),sp=190*(1+S.s/100)*(streak.boost>tm?1.15:1)*(P.slipstreamUntil>tm?1.22:1)*(WW.active?1+WW.stacks*.025:1)*(window.dodWhirlTrialLevel?1.1:1)*(P.slowT>0?.68:1);let vx=0,vy=0;
 if(P.dash){const d=P.dash;d.t-=dt;const oldX=P.x,oldY=P.y;mv(P,d.vx*dt,d.vy*dt);const travel=Math.hypot(P.x-oldX,P.y-oldY);if(d.awakening?.id==="cinder"&&D(P,d.awakening.trail[d.awakening.trail.length-1])>=26)d.awakening.trail.push({x:P.x,y:P.y});d.vfxDistance=(d.vfxDistance||0)+travel;if(travel>0&&d.vfxDistance>=18){combatEffect('charge',P.x,P.y,Math.atan2(P.y-oldY,P.x-oldX),{length:Math.min(48,d.vfxDistance)});d.vfxDistance=0;}if(!d.evade)E.forEach(e=>{if(!e.dead&&!d.h.has(e)&&D(P,e)<e.r+P.r+14){d.h.add(e);hit(e,weaponRoll(S)*(d.skillMult||1.4),{dash:true});if(d.stunDur&&e.t!=='bs'&&!e.boss)e.stun=Math.max(e.stun||0,d.stunDur)}});
  if(d.t<=0){P.dash=null;markRogueCrossings(d);if(d.evade){releaseAwakening(d);finishEvade()}}}
 else{const advancing=held&&walkAttackStart!==null&&tm-walkAttackStart>=.16&&!WW.active&&!autoAttackHeld;
  if(advancing){P.tgt=null;P.mv=wp()}
  if(kx||ky){vx=kx;vy=ky;P.tgt=P.mv=null}
  else if(!autoAttackHeld&&P.tgt&&!P.tgt.dead){const t=P.tgt;if(D(P,t)>t.r+P.r+(window.dodHeroClass==='pyromancer'?215:39)){vx=t.x-P.x;vy=t.y-P.y}else{P.face=Math.atan2(t.y-P.y,t.x-P.x);if(P.at<=0)swing(S)}}
  else if(P.mv){const dx=P.mv.x-P.x,dy=P.mv.y-P.y;if(Math.hypot(dx,dy)>8){vx=dx;vy=dy}else P.mv=null}
  if(vx||vy){const l=Math.hypot(vx,vy);P.face=Math.atan2(vy,vx);mv(P,vx/l*sp*dt,vy/l*sp*dt)}if(autoAttackHeld&&!WW.active){const aim=mouseAimHeld?wp():nearestAttackTarget();if(aim){P.face=Math.atan2(aim.y-P.y,aim.x-P.x);if(P.at<=0)swing(S)}}else if(advancing&&P.at<=0){const cursor=wp(),angle=Math.atan2(cursor.y-P.y,cursor.x-P.x);const foe=nearestAttackTarget(angle);if(foe){P.face=Math.atan2(foe.y-P.y,foe.x-P.x);swing(S)}}}
 prepareCrowd();updateRuptures(dt);
 combatVFX=combatVFX.filter(v=>(v.t+=dt)<v.m);E.forEach(e=>{if(e.dead)e.deathVisual=Math.max(0,(e.deathVisual||0)-dt);else if(e.aw||e.tk||PD[e.id]||Math.abs(e.x-P.x)<530&&Math.abs(e.y-P.y)<530)updE(e,dt)});
 PR=PR.filter(p=>{const lastX=p.x,lastY=p.y;p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
   p.trail=(p.trail||0)-dt;if(p.trail<=0&&PT.length<(prefState.highPerformance?215:650)){p.trail=prefState.highPerformance?.052:.019;PT.push({x:p.x,y:p.y,vx:R(-26,26),vy:R(-26,26),l:.24,m:.24,c:p.c,s:p.f?3:5})}
  const hitWall=wl(p.x,p.y);
   if(p.life<=0||hitWall){if(!p.f&&p.aoe){if(hitWall){p.x=lastX;p.y=lastY}boom(p)}return false}
  if(p.f){if(!P.dead&&D(p,P)<P.r+p.r){hurt(p.d);if(p.slow&&!P.dead){P.slowT=2;ring(P.x,P.y,44,'#bd83ff')}return false}}else{for(const e of E)if(!e.dead&&D(p,e)<e.r+p.r){if(p.pierce){p.hitIds=p.hitIds||new Set();if(p.hitIds.has(e))continue;p.hitIds.add(e)}if(p.shotgunGroup){p.shotgunGroup.hits=p.shotgunGroup.hits||new Map();const cHit=p.shotgunGroup.hits.get(e)||0;if(cHit>=2){if(p.pierce)continue;return false}p.shotgunGroup.hits.set(e,cHit+1)}if(p.aoe&&!p.pierce){boom(p);return false}hit(e,p.d,{ignite:p.ignite,shock:p.shock});if(p.slow)e.sl=Math.max(e.sl||0,2.5);if(!p.pierce)return false}}return true});
 TG=TG.filter(q=>{if(q.owner?.dead)return false;q.t+=dt;if(q.t>=q.m){if(Math.hypot(P.x-q.x,P.y-q.y)<q.r){hurt(q.d);if(q.hazard==='frost'&&!P.dead)P.slowT=Math.max(P.slowT||0,1.4)}if(q.soulFlame){spellBurst(q.x,q.y,q.r,'#ff985a');return false}if(q.witchRune||q.color){spellBurst(q.x,q.y,q.r,q.color);return false}burst(q.x,q.y,'#a22',30,260,.6,5);ring(q.x,q.y,q.r,'#ff3020');sh+=10;snd(60,.3,'sawtooth',.1,-20);return false}return true});
 LT=LT.filter(l=>{l.t+=dt;if(!P.dead&&D(l,P)<34){if(l.o){P.hp=Math.min(S.H,P.hp+S.H*.15);burst(l.x,l.y,'#f44',14,120);snd(500,.12,'sine',.06,200);return false}
  if(l.it&&(shouldAutoSalvage(l.it)||(P.inv.length>=18&&l.it.r===0&&!l.it.unique&&!l.it.set&&P.eq[l.it.s]&&sc(l.it)<=sc(P.eq[l.it.s])))){autoSalvageItem(l.it);save();return false}if(canPickupItem(l.it)){take(l.it);return false}if(!l.w||tm-l.w>3){l.w=tm;ft(P.x,P.y-30,'Inventory is full or off-hand is blocked','#fa6')}}return true});
 PT=PT.filter(p=>{p.l-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;return p.l>0});RG=RG.filter(r=>(r.t+=dt)<r.m);FT=FT.filter(f=>{f.t+=dt;f.x+=f.vx*dt*Math.max(0,1-f.t*1.6);f.y-=(isHitNumber(f.kind)?58+75*Math.max(0,1-f.t*6):34)*dt;return f.t<f.life}).slice(-160);
 others().forEach(p=>{const r=RP[p.peer]||(RP[p.peer]={x:p.presence.x,y:p.presence.y}),k=Math.min(1,dt*12);r.x+=(p.presence.x-r.x)*k;r.y+=(p.presence.y-r.y)*k});
 updateCampaignObjective(dt);
 if(!P.dead&&D(P,stairs)<28&&exitOpen()&&(P.bossExitCooldown||0)<=0&&$('bossRewards')?.style.display!=='grid')build(fl+1);
 const px=P.x/TS|0,py=P.y/TS|0;for(let y=py-8;y<=py+8;y++)for(let x=px-8;x<=px+8;x++)if(x>=0&&y>=0&&x<N&&y<N&&(x-px)*(x-px)+(y-py)*(y-py)<64)seen[y*N+x]=1}
function body(x,y,r,c,f,fl2,ctx=g){ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(x,y+r*.85,r*1.05,r*.4,0,0,7);ctx.fill();const cc=fl2>0?'#fff':c;ctx.fillStyle=cc;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();
 ctx.fillStyle='#0005';ctx.beginPath();ctx.arc(x,y+r*.2,r*.85,.2,2.9);ctx.fill();ctx.fillStyle=cc;ctx.beginPath();ctx.arc(x+Math.cos(f)*r*.25,y-r*.35+Math.sin(f)*r*.2,r*.6,0,7);ctx.fill()}
function eyes(x,y,r,f,c,ctx=g){ctx.fillStyle=c;for(const s of[-1,1]){ctx.beginPath();ctx.arc(x+s*r*.22+Math.cos(f)*r*.3,y-r*.38+Math.sin(f)*r*.25,r*.09+1,0,7);ctx.fill()}}

const HERO_STYLES={
 warrior:{metal:'#aabcc5',shadow:'#46535f',trim:'#d6a56a',light:'#fbdfa5'},
 pyromancer:{metal:'#493549',shadow:'#281f36',trim:'#d68e5e',light:'#ffb077'},
 rogue:{metal:'#4b4a67',shadow:'#25253a',trim:'#a39ac1',light:'#e1c7ff'}
};

const WEAPON_RUNES={
 stormglass_staff:'#8eafff',cinderstaff:'#ff844d',pyre_wand:'#ffc374',magma_axe:'#ff733e',
 stormcleaver:'#a9dfff',bloodletter:'#ff617b',glassfang:'#90ebce',nightstalker_dirk:'#c49bff',
 blackfang_main:'#b98afb',blackfang_off:'#b98afb',wardens_oath:'#88eafa',wardens_aegis:'#88eafa'
};

function heroPolygon(ctx,points,fill,stroke=null,width=1){
 ctx.beginPath();
 ctx.moveTo(points[0][0],points[0][1]);
 for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
 ctx.closePath();
 if(fill){ctx.fillStyle=fill;ctx.fill()}
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}
}

function heroLine(ctx,x1,y1,x2,y2,width,color){
 ctx.strokeStyle=color;ctx.lineWidth=width;
 ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
}

function heroOval(ctx,x,y,rx,ry,color){
 ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
}

function gearTint(item,fallback='#cbb69d'){
 const socket=item?.sockets?.[0];
 const gem=socket&&Object.hasOwn(GEMS,socket)?GEMS[socket]:null;
 return gem?.color||(Object.hasOwn(WEAPON_RUNES,item?.id)?WEAPON_RUNES[item.id]:null)||(item?.r>=2?(RAR[item.r]?.[1]||fallback):fallback);
}

function drawHeroWeapon(ctx,type,item,reach,tone){
 const l=reach,accent=gearTint(item,tone.light);
 const high=item?.r>=2||item?.unique;
 const end=l;
 ctx.lineJoin='round';ctx.lineCap='round';
 if(high&&!prefState.highPerformance){ctx.shadowColor=accent;ctx.shadowBlur=item?.unique?10:5}
 if(type==='Orb'){
  heroOval(ctx,11,0,8,8,accent);heroOval(ctx,9,-2,4,4,'#fff1e0');
  ctx.shadowBlur=0;ctx.strokeStyle=tone.trim;ctx.lineWidth=1.7;ctx.beginPath();ctx.ellipse(11,0,11,5,.63,0,Math.PI*2);ctx.stroke();
  return;
 }
 const magic=type==='Staff'||type==='Wand';
 heroLine(ctx,magic?-12:-7,0,magic?end-5:12,0,magic?5.5:6,'#1a1520');
 heroLine(ctx,magic?-11:-7,0,magic?end-6:11,0,magic?3:3.7,magic?'#765848':'#806454');
 for(let q=-6;q<=5;q+=3)heroLine(ctx,q,-2,q+1,2,1,'#c4a17a');
 heroOval(ctx,magic?-12:-7,0,2.6,2.6,tone.trim);
 if(magic){
  heroLine(ctx,l*.64,0,l-2,0,2,tone.trim);
  const span=type==='Staff'?8:5;
  heroPolygon(ctx,[[l-11,0],[l-6,-span],[l+2,-span],[l+7,0],[l+2,span],[l-6,span]],'#43364f',tone.trim,1.6);
  heroPolygon(ctx,[[l-7,0],[l,-span*.87],[l+6,0],[l,span*.87]],accent,'#ffefd9',1);
  heroLine(ctx,l-5,0,l+4,0,.9,'#fff5e5');
  if(!prefState.highPerformance){
   const orbit=tm*5+l;
   heroOval(ctx,l+Math.cos(orbit)*(span+7),Math.sin(orbit)*(span+4),1.45,1.45,accent);
   heroOval(ctx,l-Math.cos(orbit)*(span+7),-Math.sin(orbit)*(span+4),1,1,'#fff5e5');
  }
  ctx.shadowBlur=0;
  return;
 }
 const steel=ctx.createLinearGradient(0,-8,0,9);
 steel.addColorStop(0,'#edf4f5');steel.addColorStop(.48,'#a5b0c0');steel.addColorStop(.53,'#596578');steel.addColorStop(1,'#c8d2d6');
 if(type==='Axe'){
  const head=l*.79;
  heroLine(ctx,7,0,l,0,4,'#a47d5d');
  const blade=[ [head-10,-4],[head+1,-10],[l+7,-13],[l+10,-5],[l+5,2],[head-8,4] ];
  heroPolygon(ctx,blade,steel,'#22202e',1.6);
  if(item?.handed==='two')heroPolygon(ctx,blade.map(([x,y])=>[x,-y]),steel,'#22202e',1.5);
  heroLine(ctx,l+6,-11,l+7,-4,1.4,'#f8f6eb');
  heroOval(ctx,head+2,0,2.1,2.1,accent);
 }else if(type==='Mace'){
  heroLine(ctx,8,0,l-5,0,4,'#a47d5d');
  heroPolygon(ctx,[[l-15,-4],[l-12,-10],[l-6,-8],[l,-12],[l+7,-6],[l+7,6],[l,11],[l-7,8],[l-13,10],[l-15,4]],steel,'#282432',1.6);
  heroPolygon(ctx,[[l-11,0],[l-3,-5],[l+4,0],[l-3,5]],accent,'#3a3848',1);
  heroLine(ctx,l-12,-5,l+4,-5,1,'#f8f6eb');
 }else if(type==='Dagger'){
  heroPolygon(ctx,[[7,-3],[l*.67,-5],[l+4,-2],[l*.75,4],[8,3]],steel,'#322c41',1.4);
  heroLine(ctx,8,-.5,l+1,-2,1.25,'#f5eaf7');
  heroLine(ctx,6,-5,8,5,2.5,tone.trim);
  heroLine(ctx,12,1,l*.71,1,1.4,accent);
 }else{
  heroPolygon(ctx,[[10,-5],[l*.7,-5.5],[l+4,0],[l*.7,5.5],[10,5]],steel,'#302938',1.5);
  heroLine(ctx,10,-.6,l-.7,0,1.45,'#faf4df');
  heroLine(ctx,5,-8,9,-5,2.8,tone.trim);heroLine(ctx,9,-5,9,5,3,tone.trim);heroLine(ctx,9,5,5,8,2.8,tone.trim);
  heroLine(ctx,14,1.6,l*.67,1.6,1.5,accent);
 }
 if(high)heroOval(ctx,10,0,2.4,2.4,accent);
 ctx.shadowBlur=0;
}

function drawHeroShield(ctx,item,tone){
 const accent=gearTint(item,tone.trim);
 const kite=[[9,0],[6,-11],[-6,-10],[-11,-5],[-8,7],[0,12],[7,6]];
 heroPolygon(ctx,kite,'#2c2734','#17131d',2.4);
 heroPolygon(ctx,[[7,0],[4,-8],[-5,-7],[-8,-4],[-6,6],[0,9],[5,5]],tone.shadow,accent,1.6);
 heroPolygon(ctx,[[5,0],[0,-6],[-5,-1],[0,6]],tone.metal,'#282330',.8);
 heroOval(ctx,1,0,2.2,2.2,accent);
}

function drawHeroArmor(ctx,heroClass,cloth,equipment,stride,moving){
 const tone=HERO_STYLES[heroClass]||HERO_STYLES.warrior;
 const chest=equipment?.[2],head=equipment?.[1],boots=equipment?.[7];
 const trim=gearTint(chest,tone.trim),helmTrim=gearTint(head,tone.trim);
 const step=moving?Math.sin(stride)*5:0;
 for(const side of [-1,1]){
  const bootX=-10+side*step,bootY=side*6;
  heroLine(ctx,-5,side*4,bootX,bootY,6,'#1b1522');
  heroLine(ctx,bootX-2,bootY,bootX+3,bootY,4,gearTint(boots,tone.shadow));
 }
 const swing=step*.56;
 if(heroClass==='pyromancer'){
  heroPolygon(ctx,[[-24,-10+swing],[-17,-13],[-3,-9],[7,-8],[10,0],[6,8],[-8,9],[-24,13+swing],[-20,3]],cloth,'#211321',2);
  heroLine(ctx,-20,8+swing,-4,5,1.7,trim);
  heroLine(ctx,-20,-8+swing,-4,-5,1.7,trim);
 }else if(heroClass==='rogue'){
  heroPolygon(ctx,[[-21,-9+swing],[-14,-11],[-4,-7],[6,-7],[8,0],[5,7],[-7,8],[-16,5],[-21,8+swing],[-18,0]],cloth,'#1d1625',2);
  heroLine(ctx,-20,-7+swing,-8,-5,1.4,trim);
 }else{
  heroPolygon(ctx,[[-17,-9+swing],[-8,-11],[6,-9],[9,0],[6,9],[-8,10],[-17,8+swing],[-13,1]],cloth,'#211621',2);
  heroLine(ctx,-15,6+swing,-4,6,1.5,trim);
 }
 heroPolygon(ctx,[[-11,-7],[-6,-11],[6,-9],[11,-3],[11,3],[6,9],[-6,11],[-11,6]],tone.shadow,'#1d1725',1.5);
 heroPolygon(ctx,[[-8,-4],[-4,-7],[5,-6],[8,0],[5,6],[-4,7],[-8,4]],tone.metal,'#342c38',1);
 heroLine(ctx,-6,-6,-6,6,1.7,trim);
 for(const side of [-1,1]){
  const y=side*(heroClass==='warrior'?11:9);
  heroPolygon(ctx,[[-6,y],[-2,y+side*3],[5,y+side*2],[9,y],[6,y-side*4],[-3,y-side*4]],tone.metal,'#2b2232',1.2);
  heroLine(ctx,-2,y+side*1.7,6,y,1.1,trim);
 }
 if(heroClass==='warrior'){
  heroPolygon(ctx,[[0,-5],[5,-8],[11,-6],[15,-2],[15,3],[11,7],[4,7],[0,4]],tone.metal,'#221c27',1.9);
  heroLine(ctx,7,-6,13,0,1.5,helmTrim);heroLine(ctx,13,0,7,5,1.5,helmTrim);
  heroLine(ctx,13,-3,13,3,2.2,'#221c27');heroLine(ctx,13,-1.5,13,1.5,1,tone.light);
 }else{
  heroPolygon(ctx,[[0,0],[3,-5],[9,-7],[14,-3],[15,0],[14,4],[10,7],[3,5]],cloth,'#1c1423',1.8);
  heroPolygon(ctx,[[9,-4],[14,-3],[15,0],[14,3],[9,4]],'#21192b',helmTrim,.8);
  heroLine(ctx,12,-2,12,2,1.1,tone.light);
  if(heroClass==='pyromancer')heroPolygon(ctx,[[5,0],[8,-2],[10,0],[8,2]],helmTrim);
 }
 return tone;
}

function drawH(x,y,facing,color,attackAnimation,equipment=null,heroClass=window.dodHeroClass||'warrior',ctx=g,motion=null){
 const a=Math.max(0,Math.min(1,attackAnimation||0));
 const progress=1-a,impact=Math.sin(progress*Math.PI);
 const sweep=heroClass==='warrior'?1.38:heroClass==='rogue'?1.07:.49;
 const stroke=a>0?impact*sweep-(1-progress)*.45:0;
 const thrust=a>0&&heroClass==='pyromancer'?impact*7:0;
 const dashLean=motion?.dashing?2.3:0;
 const main=equipment?.[0],off=equipment?.[8];
 const type=main?.weaponType||(heroClass==='pyromancer'?'Staff':heroClass==='rogue'?'Dagger':'Sword');
 const reach=type==='Dagger'?25:type==='Wand'?25:type==='Staff'?38:main?.handed==='two'?45:36;
 ctx.save();ctx.translate(x,y);
 heroOval(ctx,-2,7,19,9,'#0806108d');
 ctx.rotate(facing);ctx.translate(dashLean,0);
 const tone=drawHeroArmor(ctx,heroClass,color,equipment,motion?.stride||0,motion?.moving);
 if(a>.04&&a<.88){
  ctx.save();
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=Math.min(.36,a*.52);
  ctx.strokeStyle=gearTint(main,tone.light);ctx.lineWidth=heroClass==='warrior'?3:2;
  ctx.beginPath();ctx.arc(3,0,reach*.82,-.60+stroke,stroke+.38);ctx.stroke();
  ctx.restore();
 }
 ctx.save();
 ctx.translate((main?.handed==='two'?10:8)+thrust,main?.handed==='two'?2:10);
 ctx.rotate((heroClass==='pyromancer'?-.3:.18)+stroke);
 drawHeroWeapon(ctx,type,main,reach,tone);
 heroOval(ctx,1,0,2.6,2.8,tone.shadow);
 if(main?.handed==='two')heroOval(ctx,6,0,2.2,2.5,tone.metal);
 ctx.restore();
 if(off){
  ctx.save();ctx.translate(6,-12);ctx.rotate(-.27-stroke*.28);
  if(off.offhandType==='weapon'||off.offhandType==='orb')drawHeroWeapon(ctx,off.weaponType||(off.offhandType==='orb'?'Orb':'Dagger'),off,24,tone);
  else drawHeroShield(ctx,off,tone);
  ctx.restore();
 }else if(heroClass==='rogue'&&a>.42){
  ctx.save();ctx.translate(5,-9);ctx.rotate(-.33-stroke*.7);ctx.globalAlpha=a*.84;
  drawHeroWeapon(ctx,'Dagger',null,19,tone);ctx.restore();
 }
 ctx.restore();
}

const portraitWeapons=new Map();
function weaponPortrait(item,heroClass=window.dodHeroClass||'warrior'){
 const type=item.weaponType||(item.offhandType==='orb'?'Orb':item.s===8?'Shield':'Sword');
 const key=[type,item.r,item.id,item.handed,item.unique,heroClass,item.sockets?.[0]].join('|');
 if(portraitWeapons.has(key))return portraitWeapons.get(key);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
 const ctx=canvas.getContext('2d'),tone=HERO_STYLES[heroClass]||HERO_STYLES.warrior;
 ctx.translate(type==='Shield'||type==='Orb'?48:25,type==='Shield'||type==='Orb'?49:66);
 ctx.rotate(type==='Shield'?.2:-.75);ctx.scale(1.5,1.5);
 if(type==='Shield')drawHeroShield(ctx,item,tone);
 else drawHeroWeapon(ctx,type,item,type==='Dagger'||type==='Wand'?29:43,tone);
 const uri=canvas.toDataURL();
 if(portraitWeapons.size>=64)portraitWeapons.delete(portraitWeapons.keys().next().value);
 portraitWeapons.set(key,uri);
 return uri;
}
function drawEnemyFigure(e){
 const {x,y,r}=e,f=e.fa||0,attack=Math.max(0,e.visualAttack||0),swing=Math.sin((1-attack/.32)*Math.PI),walk=e.aw&&!(e.stun>0)?Math.sin(tm*(e.t==='zb'?7:11)+e.id)*.09:0;
 if(e.featuredWitch){drawWitchFigure(e);return}
 if(e.t==='bs'){body(x,y,r,e.sl>0?'#8bc':e.c,f,e.fl);eyes(x,y,r,f,'#f22');return}
 g.save();g.translate(x,y);g.rotate(f);g.lineCap='round';g.lineJoin='round';
 const line=(points,color,width)=>{g.strokeStyle=color;g.lineWidth=width;g.beginPath();points.forEach((p,i)=>i?g.lineTo(p[0]*r,p[1]*r):g.moveTo(p[0]*r,p[1]*r));g.stroke()};
 const oval=(a,b,w,h,color)=>{g.fillStyle=color;g.beginPath();g.ellipse(a*r,b*r,w*r,h*r,0,0,Math.PI*2);g.fill()};
 const bone=e.fl>0?'#fff5dd':e.sl>0?'#91c7dc':'#d6c9a6';
 if(e.t==='sk'){
  line([[-.65,-.4],[-.95,-.6-walk],[-1.1,-.32]],bone,3);line([[-.65,.4],[-.95,.6+walk],[-1.1,.32]],bone,3);
  oval(-.24,0,.57,.46,'#292b29');line([[-.73,0],[.35,0]],bone,2.5);
  for(let i=0;i<3;i++){const a=-.4+i*.23;line([[a-.1,-.4],[a,.0],[a-.1,.4]],bone,2)}
  oval(.48,0,.36,.31,bone);oval(.61,-.14,.105,.075,'#282326');oval(.61,.14,.105,.075,'#282326');
  line([[.73,-.11],[.8,0],[.73,.11]],'#796951',1.5);
  line([[0,-.4],[.25,-.72],[.65,-.62]],bone,2.5);
  g.save();g.translate(.35*r,.6*r);g.rotate(attack>0?-.9+swing*2: .35);line([[-.3,0],[.35,0]],'#795238',3);line([[.2,-.2],[.2,.2]],'#b48a56',2);line([[.3,0],[1.3,0]],'#9fa6a0',4);line([[.35,-.05],[1.25,-.05]],'#e0d7bf',1);g.restore();
 }else if(e.t==='ar'){
  oval(-.4,0,.8,.48,'#514335');line([[-.8,-.3],[-1.12,-.5-walk]],'#8f7e62',3);line([[-.8,.3],[-1.12,.5+walk]],'#8f7e62',3);
  line([[-.8,-.35],[-.3,-.65]],'#382a21',5);for(let i=0;i<3;i++)line([[-.7+i*.13,-.4],[-.6+i*.13,-.8]],'#b6aa82',1.5);
  oval(.18,0,.42,.4,'#302c29');oval(.4,0,.24,.25,bone);oval(.53,-.12,.07,.06,'#efb86c');oval(.53,.12,.07,.06,'#efb86c');
  const draw=e.aw&&e.cd<.55?Math.max(0,1-e.cd/.55):0;
  line([[.05,-.3],[.45,-.65],[.8,-.65]],bone,2.5);line([[.05,.3],[.2,.55],[.7-draw*.45,0]],bone,2.5);
  g.strokeStyle='#b28a50';g.lineWidth=3;g.beginPath();g.moveTo(.7*r,-.92*r);g.quadraticCurveTo(1.48*r,0,.7*r,.92*r);g.stroke();
  line([[.7,-.92],[.7-draw*.45,0],[.7,.92]],'#d3bea0',1);line([[.65-draw*.45,0],[1.45-draw*.45,0]],'#e7d4ac',1.5);
 }else if(e.t==='nc'){
  oval(-.2,0,.78,.68,e.fl>0?'#fff':'#412b5c');oval(.28,0,.4,.36,'#5b3b7d');oval(.44,-.13,.08,.07,'#d4a8ff');oval(.44,.13,.08,.07,'#d4a8ff');
  line([[.1,-.5],[.55,-.75],[.95,-.55]],'#5b3b7d',3);line([[.5,-.6],[1.2,-.2]],'#8a5e36',3);
  g.fillStyle='#cf9eff';g.beginPath();g.arc(1.25*r,-.2*r,4+Math.sin(tm*7)*1.2,0,7);g.fill();
 }else if(e.t==='pb'){
  oval(-.1,0,.72,.66,e.fl>0?'#fff':'#396935');oval(.35,0,.38,.36,'#62b84a');
  const pulse=1+Math.sin(tm*12+e.id)*.16;g.fillStyle='#a8ff6e';g.beginPath();g.arc(-.2*r,0,.34*r*pulse,0,7);g.fill();
  oval(.48,-.14,.08,.06,'#ffe869');oval(.48,.14,.08,.06,'#ffe869');
 }else if(e.t==='dk'){
  oval(-.15,0,.88,.76,e.fl>0?'#fff':'#404856');oval(.35,0,.44,.4,'#5a6475');
  line([[.15,-.38],[.42,-.82]],'#d4dbe6',3);line([[.15,.38],[.42,.82]],'#d4dbe6',3);
  oval(.48,-.14,.09,.06,'#ff604a');oval(.48,.14,.09,.06,'#ff604a');
  g.save();g.translate(.32*r,.65*r);g.rotate(attack>0?-.9+swing*2:.3);line([[-.2,0],[1.45,0]],'#aeb9c8',5);g.restore();
 }else{
  oval(-.3,0,.95,.82,e.fl>0?'#f0f0cf':e.sl>0?'#91c7dc':'#4d6550');
  for(const side of[-1,1]){oval(.05,side*.67,.48,.4,'#748368');const reach=attack>0?swing*.5:walk;line([[.1,side*.7],[.6+reach,side*.95],[.9+reach,side*.65]],'#718369',6);for(let i=0;i<3;i++)line([[.8+reach,side*(.55+i*.13)],[1.1+reach,side*(.48+i*.13)]],bone,1.7)}
  oval(.48,0,.53,.43,'#89917a');oval(.85,0,.3,.27,'#333d35');oval(.61,-.25,.1,.065,'#f3b567');oval(.61,.25,.1,.065,'#f3b567');
  line([[.86,-.24],[1.05,-.28],[.99,-.1]],bone,2);line([[.86,.24],[1.05,.28],[.99,.1]],bone,2);
  for(let i=0;i<3;i++)line([[-.75+i*.28,-.2],[-.9+i*.28,0],[-.75+i*.28,.2]],'#9d9b7b',2);
 }
 if(attack>0&&e.t!=='ar'){g.globalAlpha=attack/.32*.65;g.strokeStyle=e.t==='zb'?'#d8ba87':'#e7d7b4';g.lineWidth=2;g.beginPath();g.arc(0,0,r*1.65,-.75+swing*.4,.6+swing*.4);g.stroke()}
 g.restore();
}
function drawE(e){const{x,y,r}=e,f=e.fa;if(e.chargeT>0){g.save();g.globalAlpha=.78;g.strokeStyle='#ff765c';g.lineWidth=5;g.beginPath();g.moveTo(x,y);g.lineTo(x+e.chargeUx*155,y+e.chargeUy*155);g.stroke();g.restore()}if(e.guardT>0){g.save();g.globalAlpha=.7;g.strokeStyle='#b7eaff';g.lineWidth=4;g.beginPath();g.arc(x,y,r+9,0,7);g.stroke();g.restore()}if(e.igniteT>0){g.save();g.globalAlpha=.55+.25*Math.sin(tm*15+x);g.strokeStyle='#ff7a28';g.lineWidth=2.2;g.beginPath();g.arc(x,y,r+7,0,7);g.stroke();g.restore()}if(e.shockT>0){g.save();g.globalAlpha=.6+.2*Math.cos(tm*18+y);g.strokeStyle='#63d8ff';g.lineWidth=2;g.beginPath();g.arc(x,y,r+10,0,7);g.stroke();g.restore()}if(e.bleedT>0){g.save();g.globalAlpha=.5+.25*Math.sin(tm*13+x);g.strokeStyle='#ff5264';g.lineWidth=2.5;g.beginPath();g.arc(x,y,r+5,0,7);g.stroke();for(let i=0;i<3;i++){const a=tm*4+i*2.094;g.fillStyle='#ff8993';g.beginPath();g.arc(x+Math.cos(a)*(r+8),y+Math.sin(a)*(r+8),2,0,7);g.fill()}g.restore()}if(e.el){g.strokeStyle=({bulwark:'#a9d5e6',ravager:'#ff735c',hexer:'#ca9dff',crusher:'#ffbd65'}[e.eliteType]||'#ffd44a');g.lineWidth=2.5;g.beginPath();g.ellipse(x,y+r*.8,r*1.5,r*.6,0,0,7);g.stroke()}
 if(e.openingGuard&&!e.attack?.recovering&&!(e.stun>0)){
  g.save();g.translate(x,y);g.rotate(f);g.strokeStyle='#b6d0de';g.lineWidth=4;
  g.beginPath();g.arc(0,0,r+7,-.9,.9);g.stroke();g.restore();
 }
 drawEnemyFigure(e);
 const mark=e.guardBreak>tm?'#ffc381':e.shadowMark>tm?'#d8b4ff':null;
 if(mark){g.save();g.strokeStyle=mark;g.lineWidth=2;g.beginPath();g.arc(x,y+r*.3,r+7,0,Math.PI*2);g.stroke();g.restore()}
 if(e.el){g.save();g.translate(x,y);g.rotate(f);g.lineWidth=3;g.strokeStyle=e.c;g.fillStyle=e.c;if(e.eliteType==='bulwark'){g.beginPath();g.moveTo(r*.7,-r*.9);g.lineTo(r*1.45,-r*.65);g.lineTo(r*1.5,r*.4);g.lineTo(r*.95,r*1.05);g.lineTo(r*.55,r*.35);g.closePath();g.fill();g.strokeStyle='#e4e9e7';g.lineWidth=1.5;g.stroke()}else if(e.eliteType==='ravager'){for(const s of[-1,1]){g.beginPath();g.moveTo(s*r*.5,0);g.lineTo(s*r*1.25,-r*.75);g.lineTo(s*r*1.6,-r*.65);g.stroke()}}else if(e.eliteType==='hexer'){g.beginPath();g.moveTo(r*.65,-r);g.lineTo(r*.9,r*1.1);g.stroke();g.fillStyle='#e4c9ff';g.beginPath();g.arc(r*.9,-r*1.2,4+Math.sin(tm*6)*1.2,0,7);g.fill()}else if(e.eliteType==='crusher'){g.beginPath();g.moveTo(r*.55,r*.1);g.lineTo(r*1.35,r*.6);g.lineTo(r*1.55,r*.9);g.stroke();g.fillRect(r*1.15,r*.55,r*.75,r*.65)}g.restore();g.save();g.fillStyle=({bulwark:'#a9d5e6',ravager:'#ff8a73',hexer:'#d1aaff',crusher:'#ffc978'}[e.eliteType]||'#ead08b');g.font='bold 9px system-ui';g.textAlign='center';g.fillText((e.eliteType||'elite').toUpperCase(),x,y-r*1.6-10);g.restore()}
 if(e.t=='bs'&&!e.featuredWitch){g.strokeStyle=e.uber?'#d18cff':'#ddd';g.lineWidth=5;for(const s of[-1,1]){g.beginPath();g.moveTo(x+s*r*.5,y-r*.9);g.lineTo(x+s*r*.95,y-r*1.7);g.stroke()}}
// boss horns drawn above
 if(e.hp<e.mh){g.fillStyle='#000a';g.fillRect(x-r,y-r*1.6-6,r*2,4);g.fillStyle=e.el?'#ffd44a':'#c22';g.fillRect(x-r,y-r*1.6-6,r*2*Math.max(0,e.hp/e.mh),4)}}
const FC=[...Array(8)].map((_,h)=>`rgb(${38+h*2},${30+h*2},${34+h*2})`);

let angledView=true;
try{angledView=localStorage.getItem('dodCameraViewV1')!=='top'}catch{}
function worldY(){return angledView?.79:1}
function switchCamera(){
 angledView=!angledView;
 try{localStorage.setItem('dodCameraViewV1',angledView?'angled':'top')}catch{}
 banner(angledView?'Angled view · V to switch':'Top-down view · V to switch');
}


const DEPTH_MATERIALS=[
 {stone:['#352b31','#413331','#2d252c'],mortar:'#211821',vein:'#b08f7150',light:'#ff9752',wall:'#473642'},
 {stone:['#252f3b','#34434f','#283141'],mortar:'#171c2c',vein:'#83b5d15d',light:'#83c9f5',wall:'#354250'},
 {stone:['#28332e','#3a4032','#292e2b'],mortar:'#1a2422',vein:'#a5bb7750',light:'#9bd7a5',wall:'#323c38'},
 {stone:['#302936','#3f3040','#2c2435'],mortar:'#23192a',vein:'#ad86c557',light:'#c697f9',wall:'#45364d'}
];
const materialAtDepth=()=>DEPTH_MATERIALS[Math.floor((fl-1)/3)%DEPTH_MATERIALS.length];
const tileSwatches=new Map();

function stoneSwatches(material){
 if(tileSwatches.has(material))return tileSwatches.get(material);
 const variants=Array.from({length:12},(_,index)=>{
  const color=material.stone[index%material.stone.length];
  const tile=document.createElement('canvas');tile.width=tile.height=TS;
  const t=tile.getContext('2d');
  t.fillStyle=material.mortar;t.fillRect(0,0,TS,TS);
  t.fillStyle=color;t.fillRect(1,1,TS-2,TS-2);
  t.fillStyle='#ffffff11';t.fillRect(2,2,TS-4,1);t.fillRect(2,2,1,TS-4);
  t.fillStyle='#00000037';t.fillRect(2,TS-4,TS-3,3);
  const random=mk(753+index*91);
  const surface=t.getImageData(0,0,TS,TS),pixels=surface.data;
  for(let y=2;y<TS-3;y++)for(let x=2;x<TS-2;x++){
   const i=(y*TS+x)*4;
   const strata=Math.sin(x*.19+y*.08+index*2+Math.sin(y*.23)*1.4);
   const vein=Math.pow(Math.max(0,strata),12);
   const tone=(random()-.5)*12+vein*8+Math.sin(x*.11-y*.18+index)*3;
   for(let k=0;k<3;k++)pixels[i+k]+=tone;
  }
  t.putImageData(surface,0,0);
  if(index%3!==1){
   const y=10+Math.floor(random()*17),x=8+Math.floor(random()*21);
   t.beginPath();t.moveTo(1,y);t.lineTo(x-3,y+2);t.lineTo(x+2,y-1);t.lineTo(TS-1,y+1);
   t.strokeStyle='#100f1680';t.lineWidth=1.4;t.stroke();
   t.beginPath();t.moveTo(x+2,y);t.lineTo(x+3,TS-2);t.stroke();
   t.fillStyle='#b9aa891e';t.fillRect(4,y+2,x-6,1);
  }
  for(let i=0;i<36;i++){
   t.fillStyle=i%4===0?'#ffffff10':'#07050a24';
   t.fillRect(3+random()*(TS-7),3+random()*(TS-7),1+random()*2,1);
  }
  return tile;
 });
 tileSwatches.set(material,variants);
 return variants;
}

function drawDepthFloor(tile,x,y,material,variant){
 const px=x*TS,py=y*TS,hash=(x*73+y*151);
 g.drawImage(variant[hash%variant.length],px,py);
 if(hash%11===0){
  g.strokeStyle=material.vein;g.lineWidth=1;
  g.beginPath();g.moveTo(px+3,py+9);g.lineTo(px+14,py+15);
  g.lineTo(px+11,py+22);g.lineTo(px+32,py+33);g.stroke();
 }
 if(!T[tile-N]){g.fillStyle='#05040b51';g.fillRect(px,py,TS,8)}
 if(!T[tile-1]){g.fillStyle='#05040b36';g.fillRect(px,py,5,TS)}
}

function inView(x,y,padding=100){
 return Math.abs(x-P.x)<W/2+padding&&Math.abs(y-P.y)<H/(2*worldY())+padding;
}

function lightPool(x,y,radius,color,alpha){
 if(!inView(x,y,radius)||radius<=0)return;
 const light=g.createRadialGradient(x,y,0,x,y,radius);
 light.addColorStop(0,color);light.addColorStop(.36,color+'55');light.addColorStop(1,color+'00');
 g.globalAlpha=alpha;g.fillStyle=light;g.fillRect(x-radius,y-radius,radius*2,radius*2);
}

function drawDepthLights(material){
 g.save();g.globalCompositeOperation='lighter';
 lightPool(P.x,P.y-6,154,material.light,prefState.highPerformance?.054:.086);
 if(!prefState.highPerformance){
  for(const prop of DECO){
   if(prop.kind!=='torch')continue;
   const x=(prop.x+.5)*TS,y=(prop.y+.5)*TS-17;
   const shimmer=.075+Math.sin(tm*7+x)*.02+Math.sin(tm*13+y)*.009;
   lightPool(x,y,140,material.light,shimmer);
  }
  let flashes=0;
  for(let i=combatVFX.length-1;i>=0&&flashes<8;i--){
   const v=combatVFX[i];
   if(v.kind!=='spell'||v.style!=='burst'||!v.color?.match(/^#[0-9a-f]{6}$/i)||v.t>=.23)continue;
   const strength=(1-v.t/.23)*.14;
   lightPool(v.x,v.y,Math.min(146,30+(v.radius||42)),v.color,strength);
   flashes++;
  }
 }
 g.restore();
}

function drawFallingAsh(material){
 if(prefState.highPerformance)return;
 g.save();g.globalCompositeOperation='lighter';g.fillStyle=material.light;
 const phase=tm*.22;
 for(let i=0;i<23;i++){
  const a=i*2.399,drift=(phase+i*.137)%1;
  const x=P.x+Math.cos(a)*(44+i*13)+Math.sin(phase+i)*19;
  const y=P.y+Math.sin(a)*(47+i*10)+(drift-.5)*75;
  if(wl(x,y))continue;
  g.globalAlpha=Math.sin(drift*Math.PI)*.28;
  g.fillRect(x,y,1.15+(i%5===0?.8:0),1.15);
 }
 g.restore();
}

function paintLootLabels(){
 const nearby=LT.filter(drop=>{
  if(!drop.it)return false;
  const range=drop.it.r>=2||drop.it.unique?325:155;
  return D(P,drop)<range;
 }).sort((a,b)=>b.it.r-a.it.r||D(P,a)-D(P,b)).slice(0,10);
 const labels=[];
 g.save();g.globalAlpha=1;g.textAlign='center';g.textBaseline='middle';g.font='700 12px system-ui';
 for(const drop of nearby){
  const it=drop.it;
  const accent=it.unique?'#ffb165':(RAR[it.r]||RAR[0])[1];
  const name=String(it.n||'Item').split(' · ')[0].slice(0,32);
  const width=Math.max(64,g.measureText(name).width+21),height=21;
  const x=drop.x-width/2,base=drop.y-35/worldY();
  let y=base;
  while(labels.some(other=>x<other.x+other.width&&x+width>other.x&&Math.abs(y-other.y)<(height+2)/worldY()))y-=25/worldY();
  labels.push({x,y,width});
  g.save();g.translate(x,y);g.scale(1,1/worldY());
  if(y!==base){
   g.strokeStyle=accent+'5b';g.lineWidth=1;g.beginPath();g.moveTo(width/2,height);
   g.lineTo(width/2,(drop.y-y)*worldY()-5);g.stroke();
  }
  g.fillStyle='#120f18f5';g.fillRect(0,0,width,height);
  g.fillStyle=accent;g.fillRect(0,0,2,height);
  g.strokeStyle=accent+'70';g.lineWidth=1;g.strokeRect(1,.5,width-1,height-1);
  g.fillStyle=accent;g.fillText(name,width/2+1,height/2);
  g.restore();
 }
 g.restore();
}

const streak={count:0,expires:0,boost:0};
function recordFightKill(enemy){
 if(P.dead||enemy.id<0||enemy.tk<=0)return;
 streak.count=(streak.expires>tm?streak.count:0)+1;
 streak.expires=tm+3.3;
 if(streak.count%5!==0)return;
 streak.boost=tm+4;
 const S=stats();P.mp=Math.min(S.M,P.mp+S.M*.13);
 ring(P.x,P.y,80,'#ffcd83');
 burst(P.x,P.y,'#ffcd83',16,155,.36,2);
 snd(420,.18,'triangle',.047,220);
}


const FORGE_ORDER_SLOTS={0:'Weapon',2:'Chest armor',3:'Ring',7:'Boots'};

function forgeOrderBook(){
 if(!quest.forgeOrders||typeof quest.forgeOrders!=='object')quest.forgeOrders={completed:0,current:null};
 const book=quest.forgeOrders;
 book.completed=Math.max(0,Math.floor(Number(book.completed)||0));
 return book;
}

function startForgeOrder(slot){
 const book=forgeOrderBook();
 if(!Object.hasOwn(FORGE_ORDER_SLOTS,slot)||book.current)return;
 const depth=Math.max(1,best-3);
 book.current={slot,depth,rewardDepth:best,progress:0,goal:24,legendary:best>=LEGENDARY_DEPTH&&(book.completed+1)%3===0,rewards:null};
 save();
}

function recordForgeOrderKill(enemy){
 const order=quest.forgeOrders?.current;
 if(!order||fl<order.depth||enemy.id<0||enemy.tk<=0||order.progress>=order.goal)return;
 const points=enemy.t==='bs'||enemy.boss?7:enemy.el?3:1;
 const featured=enemy.huntRunner||enemy.featuredWitch||enemy.riftGuardian||
  (campaignObjective?.wave===3&&enemy.el&&campaignObjective.targets.includes(enemy));
 const bonus=featured?3:0;
 if(bonus)ft(enemy.x,enemy.y-38,'+'+(points+bonus)+' Forge progress','#ffd180',1.05);
 advanceForgeOrder(points+bonus);
}

function advanceForgeOrder(points){
 const order=quest.forgeOrders?.current;
 if(!order||fl<order.depth||order.progress>=order.goal)return;
 order.progress=Math.min(order.goal,order.progress+points);
 order.clearDepth=Math.max(order.clearDepth||order.depth,fl);
 if(order.progress===order.goal){
  banner('Forge order ready · Return to the Chronicler');
  ring(P.x,P.y,110,'#ffd180');
  burst(P.x,P.y,'#ffd180',23,155,.46,3);
  snd(650,.27,'triangle',.07,265);
 }
 save();
}

function orderLegendaryPool(slot){
 const cls=window.dodHeroClass||'warrior';
 return LEGENDARIES.filter(it=>{
  if(it.s!==slot)return false;
  if(it.weaponClass)return it.weaponClass===cls;
  if(slot===0)return cls==='warrior';
  if(it.set==='Emberweaver Regalia')return cls==='pyromancer';
  if(it.set==='Nightstalker Shroud')return cls==='rogue';
  return true;
 });
}

function forgeOrderRewards(order){
 if(order.rewards?.length)return order.rewards;
 if(order.legendary){
  const pool=orderLegendaryPool(order.slot);
  const signatureId=AWAKENING_GEAR[activeAwakening()?.id];
  const signature=pool.find(item=>item.id===signatureId);
  const rotatingPool=pool.filter(item=>item!==signature);
  const choices=signature?[signature]:[];
  for(let i=0;i<Math.min(3-choices.length,rotatingPool.length);i++){
   choices.push(rotatingPool[(i+forgeOrderBook().completed)%rotatingPool.length]);
  }
  order.rewards=choices.map(item=>makeLegendary(item,Math.max(lootItemLevel(),order.clearDepth||order.depth)));
 }else{
  order.rewards=Array.from({length:3},()=>mkItem(order.rewardDepth??order.clearDepth??order.depth,.8,{lootSlot:order.slot,minRarity:2,lootLevel:order.clearDepth||order.depth}));
 }
 save();
 return order.rewards;
}

function claimForgeOrder(index){
 const book=forgeOrderBook(),order=book.current;
 if(!order||order.progress<order.goal)return;
 const item=forgeOrderRewards(order)[index];
 if(!item)return;
 if(!canPickupItem(item)){
  banner('Free a backpack slot to claim the order');
  return;
 }
 book.completed++;
 book.current=null;
 take({...item,keepRaw:true});
 const gold=18+order.depth*2;
 window.dodGold?.add?.(gold);
 banner(item.n+' · Forge order complete');
 snd(720,.22,'triangle',.06,185);
}

function forgeOrdersMarkup(){
 const book=forgeOrderBook(),order=book.current,next=best>=LEGENDARY_DEPTH&&(book.completed+1)%3===0;
 const header='<section class="forge-orders"><h3>Forge orders</h3><p>'+book.completed+
  ' completed · '+(next?'Legendary order':best<3?'Magic order':'Epic order')+'</p>';
 if(!order){
  const targets=Object.entries(FORGE_ORDER_SLOTS).map(([slot,name])=>
   '<button type="button" data-order-target="'+slot+'">'+name+'</button>').join('');
  return header+'<small>Choose a gear slot. Regular kills earn 1 point, elites earn 3, and bosses earn 7. Opening a vault earns 3 points and clearing a Hunt, Seal wave sequence, or Purge earns 4. The Ash Runner, overcharged Seal elites, Blood Witch, and Rift Guardians earn 3 extra. From Depth 12, every third order is Legendary. It can offer your equipped Awakening’s signature item if it fits your class and chosen slot.</small><div class="order-targets">'+targets+'</div></section>';
 }
 const label=FORGE_ORDER_SLOTS[order.slot],complete=order.progress>=order.goal;
 const fields='<strong>'+label+' · '+order.progress+'/'+order.goal+'</strong><small>Depth '+order.depth+' or deeper · '+(order.legendary?'Legendary':(order.rewardDepth??order.clearDepth??order.depth)<3?'Magic':'Epic')+' reward</small>';
 if(!complete)return header+'<div class="forge-order-status">'+fields+
  '<progress aria-label="Forge order progress" value="'+order.progress+'" max="'+order.goal+'"></progress></div></section>';
 const items=forgeOrderRewards(order).map((item,i)=>{
  const accent=(RAR[item.r]||RAR[0])[1];
  const statLine=Object.entries(item.st).filter(([key])=>key!=='dMin'&&key!=='dMax').slice(0,4)
   .map(([key,value])=>'+'+value+(PC[key]?'%':'')+' '+(SN[key]||key)).join(' · ');
  const damage=item.st.dMin?item.st.dMin+'–'+item.st.dMax+' damage · ':'';
  return '<button type="button" class="forge-order-item" style="--order-rarity:'+accent+'" data-order-claim="'+i+'"><b>'+esc(item.n)+
   '</b>'+itemPowerDelta(item)+'<small>'+esc(damage+statLine)+'</small>'+(item.power?'<small>'+esc(item.power)+'</small>':'')+'</button>';
 }).join('');
 return header+'<div class="forge-order-status">'+fields+'<small>Choose one item to claim.</small></div><div class="forge-order-items">'+items+'</div></section>';
}

function paintForgeOrder(){
 const tag=$('forgeOrderHud'),order=quest.forgeOrders?.current;
 tag.hidden=!order||$('evadeButton').hidden;
 if(!tag.hidden)tag.textContent=order.progress>=order.goal?'Forge order ready at Sanctuary':
  FORGE_ORDER_SLOTS[order.slot]+' order · '+order.progress+'/'+order.goal+(fl<order.depth?' · Depth '+order.depth+'+':'');
}

function paintKillStreak(){
 const box=$('killStreak');
 const chain=streak.expires>tm,boosted=streak.boost>tm;
 const show=!P.dead&&!$('evadeButton').hidden&&(boosted||chain&&streak.count>=3);
 box.hidden=!show;
 if(!show)return;
 box.querySelector('strong').textContent=chain?streak.count+'-kill streak':'Kill streak bonus';
 box.querySelector('span').textContent=boosted?'+15% movement speed':'';
 box.style.setProperty('--streak-time',chain?(streak.expires-tm)/3.3:(streak.boost-tm)/4);
}

function drawDefeatImpact(enemy){
 const major=enemy.el||enemy.t==='bs'||enemy.boss;
 if(major){
  const color=enemy.t==='bs'||enemy.boss?'#ffaf69':'#ffd497';
  const size=(enemy.t==='bs'||enemy.boss)?145:72;
  spellBurst(enemy.x,enemy.y,size,color);
  combatEffect('spell',enemy.x,enemy.y,Math.PI*.13,{radius:size*.78,color:'#fbdfae',style:'burst',duration:.27});
 }else{
  const color=enemy.shockT>0?'#99c8ff':enemy.igniteT>0?'#ff996b':'#c6a393';
  burst(enemy.x,enemy.y,color,8,155,.37,2);
  combatEffect('spell',enemy.x,enemy.y,0,{radius:24,color,style:'burst',duration:.23});
 }
}

function wallStone(x,y,tile,index,material){
 const variants=stoneSwatches(material);
 g.save();g.globalAlpha=.48;g.drawImage(variants[index%variants.length],x,y,tile,tile);g.restore();
}
function drawWallVolume(x,y,tile,index,material){
 g.fillStyle='#34282e';g.fillRect(x,y,tile,tile);
 if(!angledView){
  if(T[index-N])g.fillStyle='#746067';
  g.fillRect(x,y,tile,tile);wallStone(x,y,tile,index,material);g.fillStyle='#a78d8a55';g.fillRect(x,y,tile,3);
  return;
 }
 const rise=16;
 g.fillStyle=material.wall;g.fillRect(x,y-rise,tile,tile);wallStone(x,y-rise,tile,index,material);
 g.fillStyle='#98807666';g.fillRect(x+2,y-rise+2,tile-4,2);
 g.strokeStyle='#0b08104e';g.strokeRect(x+.5,y-rise+.5,tile-1,tile-1);
 g.fillStyle='#e6bac016';g.fillRect(x+4,y-rise+tile*.52,tile-8,1);
 if(T[index+N]){
  const face=g.createLinearGradient(0,y+tile-rise,0,y+tile);
  face.addColorStop(0,'#503541');face.addColorStop(1,'#20171f');
  g.fillStyle=face;g.fillRect(x,y+tile-rise,tile,rise);
  g.fillStyle='#a5827355';g.fillRect(x+1,y+tile-rise,1,rise);
  g.fillStyle='#17121990';g.fillRect(x,y+tile-2,tile,2);
 }
}

function draw(){const ox=Math.round(W/2-P.x+R(-1,1)*sh),oy=Math.round(H/2-P.y*worldY()+R(-1,1)*sh);
 g.globalCompositeOperation='source-over';g.globalAlpha=1;g.fillStyle='#050305';g.fillRect(0,0,W,H);g.save();g.translate(ox,oy);g.scale(1,worldY());
 const material=materialAtDepth(),swatches=stoneSwatches(material);
 const x0=Math.max(0,(P.x-W/2)/TS|0),x1=Math.min(N-1,(P.x+W/2)/TS|0),y0=Math.max(0,(P.y-H/(2*worldY()))/TS|0),y1=Math.min(N-1,(P.y+H/(2*worldY())+TS)/TS|0);
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*N+x,tx=x*TS,ty=y*TS;
  if(T[i])drawDepthFloor(i,x,y,material,swatches);
  else if(T[i-1]||T[i+1]||T[i-N]||T[i+N]||T[i-N-1]||T[i-N+1]||T[i+N-1]||T[i+N+1]){drawWallVolume(tx,ty,TS,i,material)}}
 drawDepthLights(material);
 DECO.forEach(p=>{const x=(p.x+.5)*TS,y=(p.y+.5)*TS;if(!inView(x,y))return;if(p.kind==='torch'){g.fillStyle='#593c39';g.fillRect(x-5,y-14,10,12);g.fillStyle=material.light;g.beginPath();g.moveTo(x,y-25-Math.sin(tm*9+x)*2);g.quadraticCurveTo(x+9,y-13,x,y-9);g.quadraticCurveTo(x-8,y-14,x,y-25);g.fill();g.fillStyle='#ffefd0';g.fillRect(x-1,y-20,2,7)}else if(p.kind==='pillar'){g.fillStyle='#09070a';g.beginPath();g.ellipse(x,y+8,18,10,0,0,7);g.fill();g.fillStyle='#55464b';g.beginPath();g.ellipse(x,y,14,18,0,0,7);g.fill();g.strokeStyle='#9a7e70';g.lineWidth=2;g.beginPath();g.ellipse(x,y-2,11,14,0,Math.PI*1.05,Math.PI*1.85);g.stroke()}else if(p.kind==='rubble'){g.fillStyle='#8b6650';g.beginPath();g.moveTo(x-13,y+8);g.lineTo(x-5,y-9);g.lineTo(x+2,y+3);g.lineTo(x+10,y-5);g.lineTo(x+14,y+9);g.closePath();g.fill();g.fillStyle='#b99a78';g.fillRect(x-4,y,3,2)}else if(p.kind==='bones'){g.strokeStyle='#c3b69c';g.lineWidth=3;g.beginPath();g.moveTo(x-13,y-5);g.lineTo(x+11,y+6);g.moveTo(x-10,y+8);g.lineTo(x+8,y-8);g.stroke();g.fillStyle='#e1d5bc';for(const q of[-1,1]){g.beginPath();g.arc(x+q*12,y+q*5,3,0,7);g.fill()}}else if(p.kind==='urn'){g.fillStyle='#09070a66';g.beginPath();g.ellipse(x,y+10,13,5,0,0,7);g.fill();g.fillStyle='#66504a';g.beginPath();g.moveTo(x-9,y-8);g.lineTo(x-12,y+5);g.quadraticCurveTo(x,y+13,x+12,y+5);g.lineTo(x+9,y-8);g.closePath();g.fill();g.strokeStyle='#b08a66';g.lineWidth=2;g.beginPath();g.ellipse(x,y-8,9,3,0,0,7);g.stroke();g.fillStyle='#302226';g.beginPath();g.ellipse(x,y-8,6,2,0,0,7);g.fill()}else if(p.kind==='web'){g.strokeStyle='#bdb5ad55';g.lineWidth=1.2;for(let a=0;a<4;a++){g.beginPath();g.moveTo(x-14,y-13);g.lineTo(x-14+Math.cos(a*Math.PI/6)*27,y-13+Math.sin(a*Math.PI/6)*25);g.stroke()}for(let r=8;r<25;r+=7){g.beginPath();g.arc(x-14,y-13,r,-.1,1.45);g.stroke()}}else if(p.kind==='banner'){g.strokeStyle='#90785f';g.lineWidth=3;g.beginPath();g.moveTo(x-9,y-15);g.lineTo(x+10,y-15);g.lineTo(x+10,y+15);g.stroke();g.fillStyle='#7d2927';g.beginPath();g.moveTo(x-7,y-12);g.lineTo(x+8,y-12);g.lineTo(x+8,y+10);g.lineTo(x,y+6);g.lineTo(x-7,y+10);g.closePath();g.fill();g.fillStyle='#c6a168';g.fillRect(x-5,y-7,2,10)}});
 drawExitPortal();
 drawCampaignSeal();drawEncounterSetpieces();
 LT.forEach(l=>{if(l.o){g.fillStyle='#d22';g.beginPath();g.arc(l.x,l.y-4-Math.sin(tm*4+l.x)*2,6,0,7);g.fill()}else{
  const color=RAR[l.it.r][1];
  if(l.it.r>=2){
   const beam=g.createLinearGradient(l.x,l.y-66,l.x,l.y);
   beam.addColorStop(0,color+'00');beam.addColorStop(1,color+'ab');
   g.fillStyle=beam;g.fillRect(l.x-3,l.y-66,6,66);
  }
  drawGroundItem(l,color)
 }});
 drawRuptures();
 const en=[];E.forEach(e=>{if((!e.dead||e.deathVisual>0)&&Math.abs(e.x-P.x)<W/2+80&&Math.abs(e.y-P.y)<H/(2*worldY())+80)en.push({y:e.y,e})});en.push({y:P.y,h:1});others().forEach(p=>{if(RP[p.peer])en.push({y:RP[p.peer].y,p})});en.sort((a,b)=>a.y-b.y);
 en.forEach(o=>{if(o.e){drawEnemyCombat(o.e);if(o.e.soulBearer&&!o.e.dead)drawBearerMark(o.e)}else if(o.h){if(!P.dead&&P.lastBastion>0&&P.eq[0]?.id==='wardens_oath'&&P.eq[8]?.id==='wardens_aegis'){g.save();g.translate(P.x,P.y);const pulse=.72+Math.sin(tm*8)*.08;g.globalAlpha=pulse;const shieldGlow=g.createRadialGradient(0,0,13,0,0,34);shieldGlow.addColorStop(0,'rgba(110,224,255,.08)');shieldGlow.addColorStop(.78,'rgba(90,205,245,.16)');shieldGlow.addColorStop(1,'rgba(90,205,245,0)');g.fillStyle=shieldGlow;g.beginPath();g.arc(0,0,34,0,7);g.fill();g.strokeStyle='#8fe9ff';g.lineWidth=2.5;g.shadowColor='#5bdcff';g.shadowBlur=prefState.highPerformance?0:18;g.beginPath();g.arc(0,0,27+Math.sin(tm*7)*1.5,0,7);g.stroke();g.shadowBlur=0;g.strokeStyle='#d4f8ff';g.lineWidth=1;g.globalAlpha=pulse*.75;g.beginPath();g.arc(0,0,31,tm*1.6,tm*1.6+1.25);g.stroke();g.restore()}if(P.blade>0){g.save();g.translate(P.x,P.y);g.rotate(tm*22);g.strokeStyle='#ff6a1b';g.lineWidth=5;g.shadowColor='#ff3b00';g.shadowBlur=prefState.highPerformance?0:22;for(let z=0;z<4;z++){g.beginPath();g.arc(0,0,28+z*5,z*Math.PI/2,z*Math.PI/2+1.15);g.stroke()}g.restore()}if(!P.dead)drawH(P.x,P.y,WW.active?tm*14:P.face,me.c,P.an,P.eq,window.dodHeroClass||'warrior',g,{stride:P.stride,moving:P.walking,dashing:Boolean(P.dash)})}else{const r=RP[o.p.peer];drawH(r.x,r.y,+o.p.presence.fa||0,col(o.p.presence.c),0)}});
 g.restore();
 const lr=420+Math.sin(tm*9)*6+Math.sin(tm*23)*3,gr=g.createRadialGradient(W/2,H/2,40,W/2,H/2,lr);gr.addColorStop(0,'rgba(8,4,6,0)');gr.addColorStop(.58,'rgba(8,4,6,.34)');gr.addColorStop(1,'rgba(3,1,3,.88)');g.fillStyle=gr;g.fillRect(0,0,W,H);
 g.save();g.translate(ox,oy);g.scale(1,worldY());g.globalCompositeOperation='lighter';
 drawFallingAsh(material);
 LT.forEach(l=>{if(l.o)return;const c=l.it.unique?'#ff8a24':RAR[l.it.r][1],h=30+l.it.r*42;g.globalAlpha=.5+.35*Math.sin(tm*4+l.x);g.fillStyle=c;g.fillRect(l.x-(l.it.r>=2?2.5:1.5),l.y-h,l.it.r>=2?5:3,h);g.globalAlpha=.2;g.beginPath();g.arc(l.x,l.y,12+l.it.r*5,0,7);g.fill();if(l.it.r===3||l.it.unique){g.globalAlpha=.13;g.beginPath();g.arc(l.x,l.y-h,16,0,7);g.fill()}});
 drawExitLabel();
 TG.forEach(q=>{g.globalAlpha=.18;g.fillStyle=q.color||'#f22';g.beginPath();g.arc(q.x,q.y,q.r,0,7);g.fill();g.globalAlpha=.4;g.beginPath();g.arc(q.x,q.y,q.r*q.t/q.m,0,7);g.fill()});
 PR.forEach(p=>{g.fillStyle=p.c;g.globalAlpha=.3;g.beginPath();g.arc(p.x,p.y,p.r+8,0,7);g.fill();g.globalAlpha=.95;g.beginPath();g.arc(p.x,p.y,p.r,0,7);g.fill()});
 PT.forEach(p=>{const k=p.l/p.m;g.globalAlpha=k;g.fillStyle=p.c;g.beginPath();g.arc(p.x,p.y,p.s*(.4+.6*k),0,7);g.fill()});
 RG.forEach(r=>{const p=r.t/r.m;g.globalAlpha=1-p;g.strokeStyle=r.c;g.lineWidth=7*(1-p)+1;g.beginPath();if(r.a!==undefined)g.arc(r.x,r.y,r.r*(.55+.45*p),r.a-1.1,r.a+1.1);else g.arc(r.x,r.y,r.r*p,0,7);g.stroke()});
 drawWhirl();drawBossWarnings();drawEnemyWarnings();drawWitchRunes();drawAdvancedSpells();drawCombatVFX();g.globalCompositeOperation='source-over';g.textAlign='center';g.lineJoin='round';
 paintLootLabels();
 others().forEach(p=>{const r=RP[p.peer];if(!r)return;const s=p.presence,c=col(s.c);g.globalAlpha=1;g.fillStyle=c;g.font='12px system-ui';const t=String(s.n||'Players').slice(0,16)+' · '+(+s.lv||1);g.strokeText(t,r.x,r.y-26);g.fillText(t,r.x,r.y-26);
  g.globalCompositeOperation='lighter';g.globalAlpha=.15;g.beginPath();g.arc(r.x,r.y,60,0,7);g.fill();g.globalCompositeOperation='source-over'});
 FT.forEach(drawFloatingHit);
 g.restore();g.globalAlpha=1;
 if(hurtT>0||P.hp<stats().H*.3){const a=Math.max(hurtT*1.2,P.hp<stats().H*.3?.15+.1*Math.sin(tm*6):0),v=g.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.8);v.addColorStop(0,'rgba(160,0,20,0)');v.addColorStop(1,`rgba(160,0,20,${a})`);g.fillStyle=v;g.fillRect(0,0,W,H)}}
function drawExitPortal(){
 g.save();g.translate(stairs.x,stairs.y);g.globalAlpha=1;g.globalCompositeOperation='source-over';
 const open=exitOpen(),accent=open?'#f4bd68':'#a75d58',pulse=open?.7+Math.sin(tm*3)*.15:.3;
 g.fillStyle='#09080b';g.beginPath();g.ellipse(0,0,32,18,0,0,Math.PI*2);g.fill();
 // Broad stone jambs and an arch remain readable on a small screen.
 g.strokeStyle='#242126';g.lineWidth=12;g.beginPath();g.moveTo(-27,5);g.lineTo(-27,-28);g.arc(0,-28,27,Math.PI,Math.PI*2);g.lineTo(27,5);g.stroke();
 g.strokeStyle='#827568';g.lineWidth=3;g.stroke();
 g.strokeStyle='#b5a18a';g.lineWidth=1.5;for(const side of[-1,1])for(let i=0;i<3;i++){g.beginPath();g.moveTo(side*22,-i*12);g.lineTo(side*32,-i*12);g.stroke()}
 g.fillStyle='#171217';g.fillRect(-20,-29,40,29);g.beginPath();g.arc(0,-29,20,Math.PI,Math.PI*2);g.fill();
 g.globalAlpha=pulse;g.strokeStyle=accent;g.lineWidth=2;g.beginPath();g.moveTo(-19,-1);g.lineTo(-19,-28);g.arc(0,-28,19,Math.PI,Math.PI*2);g.lineTo(19,-1);g.stroke();
 if(open){for(let i=0;i<3;i++){const yy=-5-((tm*16+i*12)%37);g.globalAlpha=.25+(i*.15);g.fillStyle=accent;g.fillRect(-10+i*9,yy,2,4)}g.globalAlpha=.8;g.strokeStyle=accent;g.lineWidth=2;for(let i=0;i<2;i++){const yy=8+i*8+Math.sin(tm*3)*2;g.beginPath();g.moveTo(-7,yy);g.lineTo(0,yy-5);g.lineTo(7,yy);g.stroke()}}
 else{g.globalAlpha=.8;g.strokeStyle=accent;g.lineWidth=3;g.beginPath();g.moveTo(-16,-30);g.lineTo(16,-5);g.moveTo(16,-30);g.lineTo(-16,-5);g.stroke()}
 g.restore();
}
function drawExitLabel(){g.save();g.globalCompositeOperation='source-over';g.globalAlpha=1;g.textAlign='center';g.textBaseline='middle';g.font='bold 12px system-ui';const open=exitOpen(),label=open?'NEXT DEPTH · '+(fl+1):window.dodRift?.isActive?.()?'CLEAR THE WAYSTONE':bossDone?(campaignObjective?'FINISH THE DEPTH OBJECTIVE':'CLEAR THE MARKED PACKS'):(boss?.openingBoss?'DEFEAT THE BUTCHER':'DEFEAT THE BOSS'),w=g.measureText(label).width+20;g.fillStyle='#100c10ed';g.fillRect(stairs.x-w/2,stairs.y-80,w,22);g.strokeStyle=open?'#cb9955':'#834845';g.lineWidth=1;g.strokeRect(stairs.x-w/2,stairs.y-80,w,22);g.fillStyle=open?'#ffe0a1':'#d5a29c';g.fillText(label,stairs.x,stairs.y-69);g.restore()}
function drawMM(){if(window.dodCity?.active()){window.dodCity.drawMap(mm);return}mm.clearRect(0,0,112,112);mm.fillStyle='#7a666c';for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=y*N+x;if(seen[i]&&T[i])mm.fillRect(x*2,y*2,2,2)}
 if(seen[(stairs.y/TS|0)*N+(stairs.x/TS|0)]){const sx=stairs.x/TS*2,sy=stairs.y/TS*2;mm.fillStyle='#100b0e';mm.fillRect(sx-5,sy-5,10,10);mm.strokeStyle=exitOpen()?'#ffd48a':'#ce7770';mm.lineWidth=1.5;mm.strokeRect(sx-3.5,sy-3.5,7,7);mm.fillStyle=bossDone?'#ffd48a':'#ce7770';mm.beginPath();mm.moveTo(sx-2,sy-1);mm.lineTo(sx+2,sy-1);mm.lineTo(sx,sy+2);mm.closePath();mm.fill()}
 if(campaignObjective&&!campaignObjective.done){
  const contract=campaignObjective;
  if(contract.id==='seal'){
   mm.fillStyle='#fc8caf';
   mm.fillRect(contract.seal.x/TS*2-2,contract.seal.y/TS*2-2,5,5);
  }else for(const e of contract.targets){
   if(e.dead)continue;
   mm.fillStyle=contract.id==='hunt'?'#ffe197':'#d68b66';
   const size=contract.id==='hunt'?5:2;
   mm.fillRect(e.x/TS*2-size/2,e.y/TS*2-size/2,size,size);
  }
 }
 for(const e of E){if(e.dead||(!e.required&&!e.openingChampion))continue;mm.fillStyle=e.openingChampion?'#d99aff':'#ffa763';mm.fillRect(e.x/TS*2-1,e.y/TS*2-1,2,2)}
 others().forEach(p=>{mm.fillStyle=col(p.presence.c);mm.fillRect(p.presence.x/TS*2-2,p.presence.y/TS*2-2,4,4)});mm.fillStyle='#fff';mm.fillRect(P.x/TS*2-2,P.y/TS*2-2,4,4)}
function normalizeLoadout(){const cap=activeSkillSlotCap(),unlocked=AB.map((a,i)=>i).filter(i=>AB[i]&&P.lv>=AB[i].unlock);abilityLoadout=[...new Set(abilityLoadout.filter(i=>Number.isInteger(i)&&unlocked.includes(i)))].slice(0,4);for(const i of unlocked)if(abilityLoadout.length<Math.min(4,cap,unlocked.length)&&!abilityLoadout.includes(i))abilityLoadout.push(i);try{localStorage.setItem('dodWarriorLoadoutV1',JSON.stringify(abilityLoadout))}catch(e){}}
const SK=Array.from({length:5},(_,slot)=>{const d=document.createElement('div');d.className='s';d.dataset.slot=slot;$('sk').append(d);return d});
function renderSkillSlots(){normalizeLoadout();const slotCap=activeSkillSlotCap();SK.forEach((d,slot)=>{const idx=slot<4?abilityLoadout[slot]:POTION_CD,a=slot<4?(idx!=null?AB[idx]:null):POTION,key=slot<4?String(slot+1):'Q',locked=slot<4&&slot>=slotCap,reqLv=slotUnlockLevel(slot);d.dataset.ability=locked?'locked':slot<4&&a?a.id:'potion';d.dataset.locked=locked?'1':'0';d.title=locked?`Skill Slot ${slot+1} unlocks at Level ${reqLv}`:slot<4&&a?`Press ${key} · ${a.n} · ${a.desc}`:`Press Q · Health Potion · unlimited · 14s cooldown (Reserve Elixirs: ${elixirs} bypass cooldown)`;if(!locked&&slot<4&&a?.id==='whirlwind'){d.setAttribute('aria-label','Hold to channel Whirlwind · 20 mana per second before talents');d.setAttribute('aria-pressed',String(WW.active))}else if(slot<4){d.setAttribute('aria-label',d.title);d.removeAttribute('aria-pressed')}d.innerHTML=`<small class="skillKey">${key}</small>${locked?'🔒':a?skillEmblem(a):'·'}<i></i>${locked?`<b class="potionCount" style="position:absolute;right:-3px;bottom:-3px;padding:1px 4px;border-radius:2px;background:#261f29;color:#e3c48d;border:1px solid #8a6d45;font:700 9px system-ui">Lv${reqLv}</b>`:slot===4?`<b class="potionCount" style="position:absolute;right:-4px;bottom:-4px;min-width:17px;padding:1px 4px;border-radius:2px;background:#c9a24a;color:#0f0c0e;border:1px solid #0f0c0e;font:700 10px system-ui">${elixirs>0?`∞+${elixirs}`:'∞'}</b>`:''}`;d.onclick=()=>locked?banner(`Skill Slot ${slot+1} unlocks at Level ${reqLv}`):slot<4?(idx!=null&&cast(idx)):usePotion()})}
renderSkillSlots();
const mobileAutoAttack=document.createElement('button');mobileAutoAttack.id='mobileAutoAttack';mobileAutoAttack.type='button';mobileAutoAttack.setAttribute('aria-label','Hold to autoattack');mobileAutoAttack.title='Hold for normal weapon attacks';mobileAutoAttack.innerHTML='<b>⚔</b><small>HOLD</small>';$('sk').append(mobileAutoAttack);
mobileAutoAttack.addEventListener('pointerdown',e=>{if(document.body.classList.contains('hud-layout-editing'))return;e.preventDefault();autoAttackHeld=true;mouseAimHeld=false;mobileAutoAttack.classList.add("pressed");mobileAutoAttack.setPointerCapture(e.pointerId)});
const stopAutoAttack=()=>{autoAttackHeld=false;mobileAutoAttack.classList.remove("pressed");if(P.tgt)P.tgt=null};mobileAutoAttack.addEventListener('pointerup',stopAutoAttack);mobileAutoAttack.addEventListener('pointercancel',stopAutoAttack);mobileAutoAttack.addEventListener('lostpointercapture',stopAutoAttack);
function hud(){const S=stats(),h=$('hp'),m=$('mp');h.style.setProperty('--v',Math.max(0,P.hp/S.H));m.style.setProperty('--v',P.mp/S.M);h.querySelector('b').textContent=Math.ceil(P.hp);m.querySelector('b').textContent=Math.floor(P.mp);
 $('xp').firstChild.style.width=P.xp/need(P.lv)*100+'%';const slotCap=activeSkillSlotCap();SK.forEach((d,i)=>{const locked=i<4&&i>=slotCap,abilityIndex=i<4?abilityLoadout[i]:POTION_CD,a=i<4?(abilityIndex!=null?AB[abilityIndex]:null):POTION;d.querySelector('i').style.setProperty('--c',locked||!a?0:(CD[abilityIndex]||0)/a.cd);d.style.opacity=locked?.36:i<4&&a&&P.mp<a.mp?.5:1});
 $('fl').textContent=window.dodCity?.active()?'Sanctuary':'Depth '+fl;$('lv').textContent='Lv '+P.lv;const peerN=room&&room.connected()?room.peers().length:0;$('pl').textContent=peerN>1?peerN+' players':'';$('pl').style.display=peerN>1?'inline':'none';
 const b=boss&&!boss.dead&&boss.aw;document.body.classList.toggle('boss-engaged',Boolean(b));$('boss').style.display=b?'block':'none';if(b){$('boss').querySelector('span').textContent=boss.n||'Boss';$('bi').style.width=Math.max(0,boss.hp/boss.mh*100)+'%'}}
const inv=$('inv');
const statColor=k=>({crit:'#ffd54a',c:'#ffd54a',critDmg:'#ffab57',bleed:'#ff7180',cdr:'#85cfff',mregen:'#9dc9ff',leech:'#62ed88',l:'#62ed88',sta:'#65bdff',str:'#ff6868',sp:'#b494ff',dodge:'#8be3cc',haste:'#f2cb6b'}[k]||'#e4d8c2');
const uniqueSetTooltip=it=>{const sets=window.dodSets?.get?.()||[];const match=sets.find(s=>s.ids?.includes(it.id));if(match)return `<div style="margin-top:5px;color:${match.color};font-size:11px">Set: ${esc(match.name)} (${match.count}/3)</div>`;return ''};

const gemStatName = key => ({c:'Critical Chance',crit:'Critical Chance',critDmg:'Critical Damage',cdr:'Cooldown Reduction',leech:'Life Leech',l:'Life Leech',mregen:'Mana per Second',s:'Movement Speed'}[key]||SN[key]||key);
const statAmount = (key,value) => (value>=0?'+':'')+Number(value.toFixed(2))+(PC[key]?'%':'');
const socketCapacity = it => Math.min(12,Math.max(Math.floor(Number(it.maxSockets))||0,Array.isArray(it.sockets)?it.sockets.length:0));
const readSocketGem = id => Object.hasOwn(GEMS,id) ? GEMS[id] : null;
const gemBonusText = gem => Object.entries(gem.st).map(([key,value])=>statAmount(key,value)+' '+gemStatName(key)).join(' · ');

function gemIcon(gem){
 if(!gem)return '<span class="gem-icon is-empty" aria-hidden="true"></span>';
 return `<span class="gem-icon" data-gem="${gem.family||gem.id}" data-tier="${gem.tier||1}" style="--gem:${gem.color}" aria-hidden="true"></span>`;
}

function socketList(it, compact=false){
 const capacity=socketCapacity(it);
 if(!capacity)return '';
 const sockets=Array.from({length:capacity},(_,index)=>{
  const id=it.sockets?.[index],gem=readSocketGem(id),filled=Boolean(id);
  const name=gem?.n||(filled?'Unknown gem':'Empty socket');
  const text=gem?gemBonusText(gem):filled?'Gem data unavailable':'Ready for a gem at the Atelier';
  const style=gem?`style="--gem:${gem.color}"`:'';
  return compact
   ? `<span class="socket-mini ${filled?'is-full':''}" ${style} title="${esc(name+' · '+text)}">${gemIcon(gem)}</span>`
   : `<div class="socket-detail ${filled?'is-full':''}" ${style}>${gemIcon(gem)}<div><strong>${esc(name)}</strong><small>${esc(text)}</small></div></div>`;
 }).join('');
 return compact
  ? `<span class="socket-rail" aria-label="${it.sockets?.length||0} of ${capacity} sockets filled">${sockets}</span>`
  : `<div class="socket-list">${sockets}</div>`;
}

function gemPouch(){
 return '<div class="gem-pouch">'+Object.values(GEMS).filter(gem=>gem.tier===1||(dodGems[gem.id]||0)>0).map(gem=>{
  const amount=Math.max(0,Math.floor(Number(dodGems[gem.id]))||0);
  return `<span class="gem-pouch-chip" title="${esc(gemBonusText(gem))}">${gemIcon(gem)}${gem.n} <b>${amount}</b></span>`;
 }).join('')+'</div>';
}

function itemStatTotals(it){
 const totals={};
 const add=(key,value)=>{
  const normalized=key==='c'?'crit':key==='l'?'leech':key;
  totals[normalized]=(totals[normalized]||0)+(Number(value)||0);
 };
 for(const [key,value] of Object.entries(it.st||{}))add(key,value);
 for(const id of Array.isArray(it.sockets)?it.sockets:[]){
  for(const [key,value] of Object.entries(readSocketGem(id)?.st||{}))add(key,value);
 }
 return totals;
}

function itemComparison(it){
 const equipped=P.eq[it.s];
 if(!equipped||equipped===it)return '';
 const next=itemStatTotals(it),current=itemStatTotals(equipped);
 const changes=[...new Set([...Object.keys(next),...Object.keys(current)])].filter(key=>key!=='dMin'&&key!=='dMax')
  .map(key=>[key,(next[key]||0)-(current[key]||0)]);
 if(it.s===0||it.offhandType==='weapon'){
  const average=stats=>((stats.dMin??4)+(stats.dMax??7))/2;
  changes.unshift(['d',average(next)-(equipped.s===0||equipped.offhandType==='weapon'?average(current):0)]);
 }
 const rows=changes.filter(([,amount])=>Math.abs(amount)>=.005).map(([key,amount])=>{
  const color=amount>0?'#91dfa3':'#f79287';
  return `<li>${esc(gemStatName(key))}<b style="color:${color}">${statAmount(key,amount)}</b></li>`;
 });
 return `<section class="item-sheet-comparison"><h3>Compared with ${esc(equipped.n)}</h3>${
  rows.length?'<ul class="item-sheet-stats">'+rows.join('')+'</ul>':'<p>No stat change in this slot.</p>'
 }</section>`;
}

function showItemDetails(it){
 const dialog=$('itemDetails'),quality=RAR[it.r]||RAR[0];
 const weapon=it.s===0||it.offhandType==='weapon';
 const equipped=P.eq[it.s]===it,capacity=socketCapacity(it);
 const hand=it.handed==='two'?' · Two-handed':'';
 const rank=it.enchantRank?' +'+it.enchantRank:'';
 const attrs=Object.entries(it.st||{}).filter(([key,value])=>key!=='dMin'&&key!=='dMax'&&Number(value))
  .map(([key,value])=>`<li>${esc(gemStatName(key))}<b style="color:${statColor(key)}">${statAmount(key,Number(value))}</b></li>`).join('');
 const status=[it.locked?'🔒 Locked':null,it.corrupted?'Corrupted':null,it.imprintedAspect?'Imprinted: '+it.imprintedAspect:null,it.mythicImplicit?'Implicit: '+it.mythicImplicit:null].filter(Boolean).join(' · ');
 const movedSlots=(P.eq[it.s]?1:0)+(it.s===0&&it.handed==='two'&&P.eq[8]?1:0);
 const blocked=equipped?P.inv.length>=24:!canEquipItem(it)||P.inv.length-1+movedSlots>24;
 const note=!canEquipItem(it)?'Your two-handed weapon occupies this slot.':blocked?'Free space in your backpack.':!equipped&&it.s===0&&it.handed==='two'&&P.eq[8]?'Equipping this weapon moves your off-hand gear to the backpack.':'';
 dialog.innerHTML=`<article class="item-sheet" style="--item-rarity:${quality[1]}">
  <header class="item-sheet-header"><span class="item-sheet-icon" aria-hidden="true">${lootIcon(it)}</span>
   <div><div class="item-sheet-meta">${quality[0]} ${SL[it.s]||'Gear'}${hand} · Item level ${Number(it.itemLevel)||1}</div>
   <h2 id="itemDetailsTitle">${esc(it.n+rank)}</h2>
   ${status?`<div class="item-sheet-meta">${esc(status)}</div>`:''}</div><button type="button" data-item-close aria-label="Close item details">×</button></header>
  ${weapon?`<div class="item-sheet-main-stat"><strong>${Number(it.st.dMin)||4}–${Number(it.st.dMax)||7}</strong> Weapon damage</div>`:''}
  ${it.power?`<section class="item-power"><h3>${it.r===4?'Mythic power':'Legendary power'}</h3><p>${esc(it.power)}</p></section>`:''}${it.butcherPower?`<section class="item-power"><h3>Butcher’s blessing</h3><p>${esc(it.butcherPower)}</p></section>`:''}
  ${attrs?`<section><h3>Item stats</h3><ul class="item-sheet-stats">${attrs}</ul></section>`:''}
  ${capacity?`<section><h3>Gem sockets · ${it.sockets?.length||0}/${capacity}</h3>${socketList(it)}</section>`:''}
  ${uniqueSetTooltip(it)}${itemComparison(it)}
  ${note?`<p class="item-action-note">${esc(note)}</p>`:''}
 </article>
 <div class="item-sheet-actions"><button type="button" data-item-lock>${it.locked?'🔓 Unlock':'🔒 Lock'}</button><button type="button" data-item-enchanter>Crafting Atelier</button>
 <button type="button" data-item-action ${blocked?'disabled':''}>${equipped?'Unequip':'Equip'}</button></div>`;
 dialog.querySelector('[data-item-close]').onclick=()=>dialog.close();
 dialog.querySelector('[data-item-lock]').onclick=()=>{it.locked=!it.locked;save();renderInv();showItemDetails(it);banner(it.locked?'🔒 Item locked (protected from salvage)':'🔓 Item unlocked')};
 dialog.querySelector('[data-item-action]').onclick=()=>{
  dialog.close();
  if(!equipped){equip(P.inv.indexOf(it));return}
  if(P.eq[it.s]!==it||P.inv.length>=24)return;
  P.inv.push(it);
  P.eq[it.s]=null;
  renderInv();save();
 };
 const workbench=dialog.querySelector('[data-item-enchanter]');
 if(workbench)workbench.onclick=()=>{
  dialog.close();
  inv.style.display='none';
  window.dodEnchanter?.open(it);
 };
 if(!dialog.open)dialog.showModal();
}

const lootIcon=it=>{
 if(it&&(it.s===0||it.s===8))return '<img class="loot-weapon" src="'+weaponPortrait(it)+'" alt="">';
 const shape=['','helm','cuirass','ring','pendant','greaves','glove','boot'][it?.s];
 return shape?reliefIcon(shape,(RAR[it.r]||RAR[0])[1],true):'＋';
};

const groundSprites=new WeakMap();
function drawGroundItem(drop,color){
 if(!inView(drop.x,drop.y,40))return;
 let sprite=groundSprites.get(drop.it);
 if(!sprite){
  const markup=lootIcon(drop.it),source=markup.match(/src="([^"]+)"/);
  if(!source)return;
  sprite=new Image();sprite.src=source[1];groundSprites.set(drop.it,sprite);
 }
 const size=drop.it.r>=2?27:23;
 g.save();g.translate(drop.x,drop.y);g.scale(1,1/worldY());
 g.fillStyle='#09070b9c';g.beginPath();g.ellipse(0,3,10,3,0,0,Math.PI*2);g.fill();
 const hover=Math.sin(tm*2.4+drop.x)*1.5;
 if(sprite.complete&&sprite.naturalWidth)g.drawImage(sprite,-size/2,-size+4+hover,size,size);
 else{g.fillStyle=color;g.fillRect(-2,-6,4,4)}
 g.restore();
}
const cell=(it,a,i,ph)=>`<div class="c" ${a}="${i}" style="${it?`border-color:${RAR[it.r][1]};box-shadow:inset 0 0 10px ${RAR[it.r][1]}55`:''}">${it?lootIcon(it)+(a=='data-b'&&sc(it)>sc(P.eq[it.s])?'<em>▲</em>':''):ph?`<span>${ph}</span>`:''}</div>`;
let invFilter='all';
let invSort='rarity';
let invSearch='';
function renderInv(){
 const S=stats(),bag=P.inv.slice(0,24);
 const labels=['Main Hand','Head','Chest','Ring','Amulet','Leggings','Gloves','Feet','Off-hand'];if(P.eq[0]?.handed==='two')labels[8]='Blocked by two-handed weapon';
 const itemCard=(it,a,i,empty)=>{
  if(!it)return '<div class="loot-slot"><span class="loot-icon" aria-hidden="true">＋</span><span class="loot-copy"><b>'+esc(empty)+'</b><small>Empty</small></span></div>';
  const quality=RAR[it.r]||RAR[0],equipped=P.eq[it.s],weapon=it.s===0||it.offhandType==='weapon';
  const upgrade=a==='data-b'&&(!equipped||sc(it)>sc(equipped));
  const rank=it.enchantRank?' +'+it.enchantRank:'';
  const lockMark=it.locked?'<span class="loot-lock" title="Locked item">🔒</span>':'';
  return '<button type="button" class="loot-slot has-item" '+a+'="'+i+'" style="--rarity:'+quality[1]+'">'+
   '<span class="loot-icon" aria-hidden="true">'+lootIcon(it)+'</span><span class="loot-copy"><b>'+esc(it.n+rank)+lockMark+'</b>'+
   '<small>'+quality[0]+' · Lv '+(Number(it.itemLevel)||1)+(weapon?' · '+(Number(it.st.dMin)||4)+'–'+(Number(it.st.dMax)||7)+' Damage':'')+'</small>'+
   socketList(it,true)+'</span>'+(upgrade?'<span class="upgrade-arrow" title="Higher item power">↑</span>':'')+'</button>';
 };
 const getSlayerTitle=()=>{try{return (localStorage.getItem('dodSlayerTitleV1')||'').trim().slice(0,40)}catch(e){return ''}};const activeTitle=getSlayerTitle();const searchQ=invSearch.trim().toLowerCase();const sorted=bag.map((it,i)=>({it,i})).sort((a,b)=>invSort==='level'?((b.it.itemLevel||1)-(a.it.itemLevel||1))||(b.it.r-a.it.r):invSort==='value'?(sc(b.it)-(P.eq[b.it.s]?sc(P.eq[b.it.s]):0))-(sc(a.it)-(P.eq[a.it.s]?sc(P.eq[a.it.s]):0))||(b.it.r-a.it.r):((b.it.r-a.it.r)||(b.it.itemLevel||1)-(a.it.itemLevel||1))),shown=sorted.filter(({it})=>{if(searchQ){const hay=`${it.n||''} ${it.power||''} ${SL[it.s]||''}`.toLowerCase();if(!hay.includes(searchQ))return false}return invFilter==='weapon'?(it.s===0||it.offhandType==='weapon'):invFilter==='armor'?([1,2,5,6,7].includes(it.s)||(it.s===8&&it.offhandType!=='weapon')):invFilter==='upgrades'?(!P.eq[it.s]||(canEquipItem(it)&&sc(it)>sc(P.eq[it.s]))):true});
 const matMeta=(()=>{try{return JSON.parse(localStorage.getItem('dod3meta')||'{}')}catch(e){return {}}})();
 const curScrap=Number(window.dodSanctuary?.meta?.scrap??matMeta.scrap)||0;
 const curEssence=Number(window.dodSanctuary?.meta?.essence??matMeta.essence)||0;
 inv.innerHTML=`<div class="loot-head"><div><h3 class="f">${esc(me.n)}${activeTitle?` <small style="font:600 11px system-ui;color:#c9a24a">· ${esc(activeTitle)}</small>`:''}</h3><small>Lv ${P.lv} · ${P.inv.length}/24 bag</small></div><button class="loot-close" data-inv-close aria-label="Close inventory">✕</button></div>
 <section class="loot-section"><h4>Equipped</h4><div class="loot-equip">${SL.map((_,i)=>itemCard(P.eq[i],'data-e',i,labels[i])).join('')}</div></section>
 <div class="loot-stats"><span>Dmg: <b>${S.MDMin|0}–${S.MDMax|0}</b></span><span>Armor: <b>${S.a|0}</b></span><span>HP: <b>${S.H|0}</b></span><span>Crit: <b>${S.C|0}%</b></span>${window.dodHeroClass==='pyromancer'?`<span>Spell: <b>+${S.SP|0}</b></span><span>CDR: <b>${S.cdr|0}%</b></span>`:window.dodHeroClass==='rogue'?`<span>Dodge: <b>${S.dodge|0}%</b></span><span>Haste: <b>${S.haste|0}%</b></span>`:`<span>Leech: <b>${S.leech.toFixed(1)}%</b></span><span>CDR: <b>${S.cdr|0}%</b></span>`}</div>
 <section class="loot-section"><div class="loot-section-head"><h4>Backpack (${P.inv.length}/24)</h4><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><select class="loot-sort" data-loot-filter aria-label="Auto-salvage filter"><option value="off" ${dodLootFilter==='off'?'selected':''}>Loot Filter: Off</option><option value="common" ${dodLootFilter==='common'?'selected':''}>Auto-Salvage Common</option><option value="magic" ${dodLootFilter==='magic'?'selected':''}>Auto-Salvage Common+Magic</option></select><button type="button" data-salvage-filtered style="background:#161113;border:1px solid #4a3a2d;color:#d6c7ab;padding:4px 8px;border-radius:3px;font-size:11px;cursor:pointer">${dodLootFilter==='magic'?'Salvage Common+Magic':'Salvage Common'}</button><button type="button" data-salvage-nonupgrades style="background:#161113;border:1px solid #6b4b38;color:#ead08b;padding:4px 8px;border-radius:3px;font-size:11px;cursor:pointer" title="Salvages unlocked non-unique, non-set backpack gear weaker than what you already wear">Salvage Non-Upgrades</button><select class="loot-sort" data-inv-sort aria-label="Sort backpack"><option value="rarity" ${invSort==='rarity'?'selected':''}>Rarity</option><option value="level" ${invSort==='level'?'selected':''}>Level</option><option value="value" ${invSort==='value'?'selected':''}>Upgrade</option></select></div></div><div class="loot-filters">${[['all','All'],['weapon','Weapons'],['armor','Armor'],['upgrades','Upgrades']].map(([id,label])=>`<button data-inv-filter="${id}" class="${invFilter===id?'active':''}" aria-pressed="${invFilter===id}">${label}</button>`).join('')}<input class="loot-sort" data-inv-search type="search" placeholder="Search bag..." aria-label="Search backpack" value="${esc(invSearch)}" style="margin-left:auto;min-width:96px;max-width:130px"></div><div style="margin:6px 0;padding:5px 8px;background:#0b090a;border:1px solid #4a3a2d;border-radius:3px;font-size:11px;color:#b8aa93;font-variant-numeric:tabular-nums">Salvage: <b>${curScrap}</b> · Essence: <b style="color:#86c5ff">${curEssence}</b> · Abyssal Fragments: <b style="color:#d67bff">${dodAbyssFragments}</b>${gemPouch()}</div>
 <div class="loot-bag">${shown.map(({it,i})=>itemCard(it,'data-b',i,'')).join('')}${P.inv.length===0?'<p class="loot-empty">No gear found yet.</p>':shown.length===0?'<p class="loot-empty">No matching items.</p>':''}</div></section>
 <small class="loot-help">Select an item to inspect, lock 🔒, or craft · Right-click unlocked backpack gear to drop</small>`;
}
function equip(i){const it=P.inv[i];if(!it)return;if(!canEquipItem(it)){banner(it.s===8?'A two-handed weapon uses both hands':'This item cannot be equipped in that slot');return}const twoHand=it.s===0&&it.handed==='two',returned=[];if(P.eq[it.s])returned.push(P.eq[it.s]);if(twoHand&&P.eq[8])returned.push(P.eq[8]);if(P.inv.length-1+returned.length>24){banner('Make room in your backpack for the replaced gear first');return}P.inv.splice(i,1);P.eq[it.s]=it;if(twoHand)P.eq[8]=null;P.inv.push(...returned);renderInv();save();if(twoHand&&returned.some(x=>x.s===8))banner('Two-handed weapon equipped · shield moved to backpack')}
// The modern inventory uses .loot-slot cards; keep the legacy grid selectable too.
inv.onclick=e=>{if(e.target.closest('[data-inv-close]')){inv.style.display='none';return}if(e.target.closest('[data-salvage-filtered]')){const maxR=dodLootFilter==='magic'?1:0;const keep=[];let cnt=0,totS=0,totG=0;for(const it of P.inv){if(it&&!it.locked&&!it.unique&&!it.mythic&&!it.set&&(it.r||0)<=maxR){const res=autoSalvageItem(it,true);cnt++;totS+=res.scrap;totG+=res.gVal}else keep.push(it)}P.inv=keep;if(cnt){save();renderInv();banner(`Salvaged ${cnt} item${cnt===1?'':'s'} · +${totS} Salvage · +${totG}g`)}else banner(maxR===1?'No unlocked Common or Magic gear to salvage':'No unlocked Common gear to salvage');return}if(e.target.closest('[data-salvage-nonupgrades]')){const keep=[];let cnt=0,totS=0,totE=0,totG=0;for(const it of P.inv){if(it&&!it.locked&&!it.unique&&!it.mythic&&!it.set&&!it.corrupted&&!it.imprintedAspect&&canEquipItem(it)&&P.eq[it.s]&&sc(it)<=sc(P.eq[it.s])){const res=autoSalvageItem(it,true);cnt++;totS+=res.scrap;totE+=res.essence;totG+=res.gVal}else keep.push(it)}P.inv=keep;if(cnt){save();renderInv();banner(`Salvaged ${cnt} non-upgrade${cnt===1?'':'s'} · +${totS} Salvage${totE?` · +${totE} Ess`:''} · +${totG}g`)}else banner('No unlocked non-upgrade gear to salvage');return}const filter=e.target.closest('[data-inv-filter]');if(filter){invFilter=filter.dataset.invFilter;renderInv();return}const c=e.target.closest('[data-b],[data-e]');if(!c)return;const item=c.dataset.b!==undefined?P.inv[+c.dataset.b]:P.eq[+c.dataset.e];if(item)showItemDetails(item)};
inv.onchange=e=>{if(e.target.matches('[data-inv-sort]')){invSort=e.target.value;renderInv()}else if(e.target.matches('[data-loot-filter]')){dodLootFilter=e.target.value;prefState.autoSalvage=dodLootFilter;persistAllPrefs();save();renderInv();try{if(window.parent&&window.parent!==window)window.parent.postMessage({type:'dod:loot-filter-changed',autoSalvage:dodLootFilter},window.location.origin)}catch(err){}banner(dodLootFilter==='off'?'Auto-Salvage disabled':dodLootFilter==='common'?'Auto-Salvaging Common drops':'Auto-Salvaging Common & Magic drops')}};
inv.oninput=e=>{if(e.target.matches('[data-inv-search]')){invSearch=e.target.value;const pos=e.target.selectionStart;renderInv();const input=inv.querySelector('[data-inv-search]');input.focus();input.setSelectionRange(pos,pos)}};
inv.oncontextmenu=e=>{const c=e.target.closest('[data-b]');if(c){e.preventDefault();const it=P.inv[+c.dataset.b];if(it?.locked){banner('🔒 Unlock item before dropping');return}P.inv.splice(+c.dataset.b,1);renderInv();save()}};
for(const keyEvent of ['keydown','keyup'])$('itemDetails').addEventListener(keyEvent,event=>event.stopPropagation());
const tg=()=>{inv.style.display=inv.style.display=='block'?'none':'block';renderInv()};$('ib').onclick=tg;
addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=1;const i='1234'.indexOf(k);if(i>=0){if(i>=activeSkillSlotCap())banner(`Skill Slot ${i+1} unlocks at Level ${slotUnlockLevel(i)}`);else if(abilityLoadout[i]!=null)cast(abilityLoadout[i])}if(k==='q')usePotion();if(k=='i')tg()});addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=0});

$('openAwakening').onclick=()=>window.dodProgression.open('awakening');
const ossuaryDialog=$('ossuaryReward');
function paintOpeningHud(){
 const objective=$('openingHud'), evadeButton=$('evadeButton');
 const overlay=['titleScreen','sanctuary','classStart','dead','bossRewards'].some(id=>{
  const panel=$(id);
  return panel&&getComputedStyle(panel).display!=='none';
 });
 evadeButton.hidden=overlay;
 if(!overlay){
  const cooldown=(P.evadeCd||0)>0;
  evadeButton.setAttribute('aria-disabled',String(cooldown));
  evadeButton.querySelector('span').textContent=cooldown?P.evadeCd.toFixed(1)+'s':activeAwakening()?.name||'Evade';
 }
 const layout=openingLayout(fl), contract=campaignObjective;
 const witch=boss?.featuredWitch;
 const needsAwakening=quest.kills>=AWAKENING_UNLOCK&&!activeAwakening();
 $('openAwakening').hidden=!needsAwakening;
 objective.hidden=overlay||!layout&&!contract&&!witch&&!needsAwakening;
 if(objective.hidden)return;
 objective.querySelector('strong').textContent=layout?.name||contract?.name||(witch?'Blood Witch':'Evade Awakening');
 const status=objective.querySelector('span'), hint=objective.querySelector('small');
 if(contract){
  const progress=campaignProgress(contract);
  status.textContent=contract.done?'Depth cleared · Reach the descent':contract.id==='seal'?
   (contract.wave===3?'Survive the Overcharged Seal':contract.wave?'Survive wave '+contract.wave+' of 2':'Find the seal on the minimap'):
   progress.label+' · '+progress.value+'/'+progress.max;
  hint.textContent=contract.id==='hunt'&&!contract.done?'Champions are marked in gold':canRaiseBloodSeal()?'Claim spoils or risk a third wave for gear two levels higher':fl===7&&!contract.done?'Fight through the Foundry ambush':'';
 }else if(witch){
  status.textContent=boss.dead?'Slain · Reach the descent':'Defeat the Blood Witch';
  hint.textContent=boss.dead&&!canReplayWitch()?'Collect her trophy to replay':best>=LEGENDARY_DEPTH?'15% class Legendary chance':'Epic trophy · Legendary hunt unlocks at Depth 12';
 }else{
  const remaining=E.filter(e=>e.required&&!e.dead).length;
  status.textContent=remaining?'Clear the marked packs · '+remaining+' left':fl===3&&!bossDone?'Defeat the Butcher':'Reach the descent';
  hint.textContent=fl===2&&E.some(e=>e.openingChampion&&!e.dead)?'Optional · Hunt the Bastion Warden':'';
 }
 $('openOssuaryReward').hidden=!ossuaryRewardReady();
 $('openCampaignSpoils').hidden=!campaignSpoilsReady();
 $('activateBloodSeal').hidden=!canOpenBloodSeal();
 $('raiseBloodSeal').hidden=!canRaiseBloodSeal();
 $('openWitchLedger').hidden=!witch;
 $('replayBloodWitch').hidden=!canReplayWitch();
}
const hookRings=[
 {id:'fork_hook',n:'Forked Chain',st:{str:2},power:'Iron Hook pulls a second enemy within your aim cone.'},
 {id:'barbed_hook',n:'Barbed Chain',st:{str:2},power:'Iron Hook makes its target bleed for 3 seconds.'}
];
const starterBands=[
 {n:'Quicksteel Band',st:{haste:3},power:'+3% Haste'},
 {n:'Iron Band',st:{sta:2},power:'+2 Stamina'},
 {n:'Keen Band',st:{crit:2},power:'+2% Critical Chance'}
];
for(const choice of [...starterBands,...hookRings]){
 const button=document.createElement('button'),title=document.createElement('strong'),description=document.createElement('small');
 button.type='button';
 button.dataset.hookRing=String(hookRings.includes(choice));
 title.textContent=choice.n;
 description.textContent=choice.power;
 button.append(title,description);
 button.onclick=()=>{
  if(!ossuaryRewardReady())return;
  if(!quest.hookTraining&&P.eq[3]&&P.inv.length>=24){
   $('ossuaryRewardStatus').textContent='Free one backpack slot to move your current ring.';
   return;
  }
  if(quest.hookTraining)quest.hookTechnique=choice.id;
  else{
   if(P.eq[3])P.inv.push(P.eq[3]);
   P.eq[3]={n:choice.n,st:{...choice.st},s:3,r:1,icon:'💍',itemLevel:1,sockets:[]};
  }
  quest.ossuaryReward=true;
  save();
  renderInv();
  ossuaryDialog.close();
  banner(choice.n+(quest.hookTraining?' learned':' equipped'));
  ring(P.x,P.y,90,'#f8c581');
  snd(660,.26,'triangle',.06,180);
 };
 ossuaryDialog.querySelector('.ringChoices').append(button);
}
$('openOssuaryReward').onclick=()=>{
 if(!ossuaryRewardReady())return;
 stopWhirl();
 P.tgt=P.mv=null;
 ossuaryDialog.querySelector('h2 + p').textContent=quest.hookTraining?'Learn one permanent Iron Hook technique.':'Choose a Magic ring to equip.';
 $('ossuaryRewardStatus').textContent='';
 Object.keys(keys).forEach(key=>{keys[key]=0});
 autoAttackHeld=false;
 for(const button of ossuaryDialog.querySelectorAll('[data-hook-ring]'))button.style.display=(button.dataset.hookRing==='true')===Boolean(quest.hookTraining)?'':'none';
 ossuaryDialog.showModal();
};
$('ossuaryRewardClose').onclick=()=>ossuaryDialog.close();
ossuaryDialog.addEventListener('keydown',event=>event.stopPropagation());
ossuaryDialog.addEventListener('keyup',event=>event.stopPropagation());
$('raiseBloodSeal').onclick=raiseBloodSeal;
$('openWitchLedger').onclick=showWitchLedger;
$('witchLedgerClose').onclick=()=>$('witchLedger').close();
$('replayBloodWitch').onclick=()=>{if(canReplayWitch()&&!whirlBlocked())build(fl)};
for(const type of ['keydown','keyup'])$('witchLedger').addEventListener(type,event=>event.stopPropagation());
$('openCampaignSpoils').onclick=showCampaignSpoils;
$('campaignSpoilsClose').onclick=()=>$('campaignSpoils').close();
$('activateBloodSeal').onclick=()=>{openBloodSeal();$('activateBloodSeal').blur()};
for(const keyEvent of ['keydown','keyup'])$('campaignSpoils').addEventListener(keyEvent,event=>event.stopPropagation());
addEventListener('keydown',event=>{
 if(event.code!=='KeyF'||event.repeat||event.target?.closest?.('input,select,textarea,[contenteditable],dialog'))return;
 if(canOpenBloodSeal()){event.preventDefault();openBloodSeal()}
});
$('evadeButton').onclick=()=>{evade();$('evadeButton').blur()};
addEventListener('keydown',e=>{
 if(e.code!=='Space'||e.repeat||e.target?.closest?.('button,input,select,textarea,[contenteditable],dialog'))return;
 e.preventDefault();
 evade();
});

addEventListener('keydown',event=>{if(event.code==='KeyV'&&!event.repeat&&!event.target?.closest?.('input,textarea,select,[contenteditable],dialog'))switchCamera()});
const wp=()=>({x:P.x+M.x-W/2,y:P.y+(M.y-H/2)/worldY()});
cv.onpointerdown=e=>{M.x=e.clientX;M.y=e.clientY;held=1;if(P.dead)return;walkAttackStart=e.button===0&&e.pointerType==='mouse'?tm:null;const w=wp(),t=E.find(q=>!q.dead&&D(q,w)<q.r+12);if(e.button===2){P.tgt=P.mv=null;autoAttackHeld=mouseAimHeld=true;return}P.tgt=t||null;P.mv=t?null:w};cv.oncontextmenu=e=>e.preventDefault();
cv.onpointermove=e=>{M.x=e.clientX;M.y=e.clientY;if(held&&!mouseAimHeld&&!P.tgt&&!P.dead)P.mv=wp()};addEventListener('pointerup',e=>{if(e.button===0&&walkAttackStart!==null&&tm-walkAttackStart>=.16){P.mv=P.tgt=null}walkAttackStart=null;held=0;if(e.button===2){autoAttackHeld=mouseAimHeld=false;if(P.tgt)P.tgt=null}});
$('rv').onclick=()=>{P.dead=0;P.ironheartT=0;P.ironheartCd=0;P.phaseStrideT=0;const S=stats();P.hp=S.H;P.mp=S.M;$('dead').style.display='none';build(fl);save()};
setInterval(()=>{if(!room)return;try{room.presence({n:me.n,c:me.c,x:Math.round(P.x),y:Math.round(P.y),f:fl,hp:Math.round(P.hp),lv:P.lv,a:P.ac,fa:+P.face.toFixed(2),dm:DM}).catch(()=>{})}catch(e){}},120);
(async()=>{try{if(window.claude&&claude.use){const r=await claude.use('room');if(r){room=r;r.onPeers(onPeers,()=>{})}}}catch(e){}})();
const adv=$('adv');
function openAdv(){adv.style.display=adv.style.display=='block'?'none':'block';renderAdv()}
$('ab').onclick=openAdv;
function renderAdv(){adv.innerHTML=`<h2>The Abyssal Inn</h2><p>Depth ${fl} · Level ${P.lv} · Health Potions ${elixirs}</p><div class="arow"><button data-act="rest">Rest</button><button data-act="potion">Health Potion</button><button data-act="close">Close</button></div><hr style="border-color:#49372b"><h2>Blacksmith</h2><p>Manage equipment and improve your weapon.</p><div class="arow"><button data-act="salvage">Salvage weakest item</button><button data-act="forge">Upgrade weapon</button></div><hr style="border-color:#49372b"><h2>Quest</h2><p>Defeat 12 enemies and one boss. Progress: ${Math.min(12,quest.kills)}/12 enemies · ${Math.min(1,quest.bosses)}/1 boss</p><button data-act="quest" ${quest.claimed||quest.kills<12||quest.bosses<1?'disabled':''}>Claim reward · loot</button>`}
adv.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.skill){const k=b.dataset.skill;if(skillPts>0&&skills[k]<5){skills[k]++;skillPts--;const S=stats();P.hp=Math.min(S.H,P.hp+18);P.mp=Math.min(S.M,P.mp+12);banner('Skill upgraded');save();renderInv();renderAdv()}return}switch(b.dataset.act){case'close':adv.style.display='none';return;case'rest':{P.hp=stats().H;P.mp=stats().M;banner('You are fully rested');snd(440,.2,'sine',.06,220)}break;case'potion':{elixirs++;banner('Health potion purchased')}break;case'salvage':if(P.inv.length){P.inv.sort((a,b)=>sc(a)-sc(b));const it=P.inv.shift();banner('Salvaged: '+it.n);renderInv()}else banner('Nothing in your inventory to salvage');break;case'forge':if(P.eq[0]){P.eq[0].st.dMin=(P.eq[0].st.dMin||4)+3;P.eq[0].st.dMax=(P.eq[0].st.dMax||7)+3;banner('Weapon upgraded!');renderInv()}else banner(P.eq[0]?'You need 12':'You need a weapon');break;case'quest':if(!quest.claimed&&quest.kills>=12&&quest.bosses>=1){quest.claimed=true;const it=mkItem(fl,.2);take(it);banner('Quest completed!')}break;}save();renderAdv()});
// Admin tools for local testing and creative building.
const admin=$('admin');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function adminOpen(){if(!window.dodIsAdmin)return;admin.style.display=admin.style.display==='block'?'none':'block';if(admin.style.display==='block'){if(window.parent&&window.parent!==window)window.parent.postMessage({type:'dod:request-admin-stats'},window.location.origin);renderAdmin()}}
function adminGive(it){if(P.inv.length>=24){banner('Backpack full · free a slot before adding test gear');return}let copy=JSON.parse(JSON.stringify(it));if(copy.r===3&&!copy.itemLevel){const base=LEGENDARIES.find(x=>x.id===copy.id);if(base)copy=makeLegendary(base,P.lv)}copy.r=Math.max(0,Math.min(3,+copy.r||0));if(!copy.s&&copy.s!==0)copy.s=0;copy.st=copy.st||{};if(copy.s===0){const dMin=Math.max(1,+copy.st.dMin||4),dMax=Math.max(dMin+1,+copy.st.dMax||7);copy.st.dMin=dMin;copy.st.dMax=dMax}if(copy.r===3)copy.unique=true;P.inv.push(copy);renderInv();save();banner('Admin: '+copy.n+' added')}
const ADMIN_BACKUP_KEY='dodAdminHeroBackupV1';
const adminGameKey=k=>k==='mdjup'||k.startsWith('dod');
function adminBackupCurrentHero(){
 try{
  if(localStorage.getItem(ADMIN_BACKUP_KEY))return true;
  save();
  const backup=Object.fromEntries(Object.keys(localStorage).filter(k=>adminGameKey(k)&&k!==ADMIN_BACKUP_KEY).map(k=>[k,localStorage.getItem(k)]));
  localStorage.setItem(ADMIN_BACKUP_KEY,JSON.stringify(backup));
  return true;
 }catch(err){return false}
}
function adminRestoreOriginalHero(){
 if(!window.dodIsAdmin)return false;
 try{
  const raw=localStorage.getItem(ADMIN_BACKUP_KEY);
  if(!raw)return false;
  const backup=JSON.parse(raw);
  resetWhirl();
  Object.keys(localStorage).filter(k=>adminGameKey(k)&&k!==ADMIN_BACKUP_KEY).forEach(k=>localStorage.removeItem(k));
  for(const [k,v] of Object.entries(backup))if(typeof v==='string')localStorage.setItem(k,v);
  localStorage.removeItem(ADMIN_BACKUP_KEY);
  location.reload();
  return true;
 }catch(err){return false}
}
window.dodAdminEndgame=function(chosenClass){
 if(!window.dodIsAdmin)return false;
 const c=(chosenClass==='pyromancer'||chosenClass==='rogue'||chosenClass==='warrior')?chosenClass:(window.dodHeroClass||localStorage.getItem('dodClass')||'warrior');
 if(!adminBackupCurrentHero()){banner('Could not back up the hero');return false}
 resetWhirl();
 P.dash=null;P.blade=0;P.guard=0;P.dead=0;
 window.dodWhirlTrialLevel=null;localStorage.removeItem('dodWhirlTrialLevel');
 window.dodHeroClass=c;localStorage.setItem('dodClass',c);
 if(!me.n)me.n='Simon';
 P.lv=50;P.xp=0;elixirs=9;best=Math.max(best||1,31);
 window.dodUnlockEndgame?.();
 window.dodParagon?.grantLevels?.(10);
 window.dodProgression?.applyEndgamePreset?.(c);
 const gemPair=c==='pyromancer'?['sapphire','ruby']:c==='rogue'?['emerald','topaz']:['ruby','emerald'];
 const mkEndLeg=(id)=>{
  const base=LEGENDARIES.find(x=>x.id===id);
  if(!base)return null;
  const it=makeLegendary(base,50);
  it.enchantRank=5;
  if(it.s===0||it.offhandType==='weapon'){it.st.dMin=(it.st.dMin||30)+15;it.st.dMax=(it.st.dMax||42)+18}
  else{if(it.st.a)it.st.a+=10;if(it.st.sp)it.st.sp+=12;it.st.sta=(it.st.sta||10)+10}
  if(it.s===0||it.s===1||it.s===2||it.s===5){it.maxSockets=2;it.sockets=[...gemPair]}
  return it;
 };
 const mkEndLeggings=(clsId)=>({
  id:'abyssal_legguards',
  s:5,r:3,unique:true,itemLevel:50,enchantRank:5,
  n:clsId==='pyromancer'?'Emberweave Chausses · Leggings':clsId==='rogue'?'Nightstalker Greaves · Leggings':'Abyssal Vanguard Cuisses · Leggings',
  icon:'👖',
  maxSockets:2,sockets:[...gemPair],
  st:clsId==='pyromancer'?{a:28,sta:22,sp:24,cdr:6,crit:3}:{a:clsId==='rogue'?30:38,sta:24,str:clsId==='rogue'?8:14,crit:3,haste:6,dodge:clsId==='rogue'?6:2},
  desc:'Endgame abyss-forged legplates.',
  power:'Admin Endgame Gear (+5 Empowered & Double Socketed).'
 });
 const loadoutsByClass={
  warrior:{
   eq:[mkEndLeg('doomhammer'),mkEndLeg('dawn_crown'),mkEndLeg('worldplate'),mkEndLeg('ember_signet'),mkEndLeg('soulbinder_pendant'),mkEndLeggings('warrior'),mkEndLeg('ashen_gauntlets'),mkEndLeg('frostfang_boots'),null],
   bag:['stormcleaver','blackfang_main','blackfang_off','ironheart_plate'].map(mkEndLeg).filter(Boolean)
  },
  pyromancer:{
   eq:[mkEndLeg('pyre_wand'),mkEndLeg('ember_circlet'),mkEndLeg('ember_vestments'),mkEndLeg('ember_signet'),mkEndLeg('soulbinder_pendant'),mkEndLeggings('pyromancer'),mkEndLeg('ashen_gauntlets'),mkEndLeg('frostfang_boots'),mkEndLeg('astral_orb')],
   bag:['cinderstaff','dawn_crown','tempest_loop'].map(mkEndLeg).filter(Boolean)
  },
  rogue:{
   eq:[mkEndLeg('nightstalker_dirk'),mkEndLeg('nightstalker_cowl'),mkEndLeg('nightstalker_garb'),mkEndLeg('ember_signet'),mkEndLeg('soulbinder_pendant'),mkEndLeggings('rogue'),mkEndLeg('ashen_gauntlets'),mkEndLeg('frostfang_boots'),mkEndLeg('venomtooth_off')],
   bag:['blackfang_main','blackfang_off','frostvein_greaves'].map(mkEndLeg).filter(Boolean)
  }
 };
 const chosenGear=loadoutsByClass[c]||loadoutsByClass.warrior;
 P.eq=chosenGear.eq;
 P.inv=chosenGear.bag;
 if(c==='warrior'){abilityLoadout=[0,3,4,7];normalizeLoadout()}
 else if(c==='pyromancer'){[0,3,6,7].forEach((sk,idx)=>window.dodSetClassLoadout?.('pyromancer',idx,sk))}
 else if(c==='rogue'){[0,2,6,7].forEach((sk,idx)=>window.dodSetClassLoadout?.('rogue',idx,sk))}
 window.dodSpellBook?.maxForAdmin?.(c);
 window.dodGold?.set?.(Math.max(5000,window.dodGold?.get?.()||0));
 dodAbyssFragments=Math.max(dodAbyssFragments||0,25);
 for(const gk of Object.keys(GEMS))dodGems[gk]=(dodGems[gk]||0)+3;
 try{const m=JSON.parse(localStorage.getItem('dod3meta')||'{}');m.scrap=Math.max(+m.scrap||0,150);m.essence=Math.max(+m.essence||0,30);localStorage.setItem('dod3meta',JSON.stringify(m));if(window.dodSanctuary?.meta){window.dodSanctuary.meta.scrap=m.scrap;window.dodSanctuary.meta.essence=m.essence}}catch(err){}
 window.dodRift?.setTier?.(5);
 for(const id of ['dead','inv','progPanel','admin','titleScreen','sanctuary','classStart','d3service','bossRewards']){const el=$(id);if(el)el.style.display='none'}
 CD.fill(0);renderSkillSlots();
 build(Math.max(31,fl));
 const S=stats();P.hp=S.H;P.mp=S.M;P.inv_t=2;
 save();renderInv();
 const clsLabel=({pyromancer:'Pyromancer',rogue:'Shadow Rogue',warrior:'Warrior'})[c]||'Warrior';
 banner('⚡ ADMIN ENDGAME READY · Lv 50 '+clsLabel+' · Depth '+fl);
 return true;
};
function applyWorkshopScenario(){
 const cls=$('labClass').value,kit=$('labKit').value;
 const level=$('labLevel').valueAsNumber,depth=$('labDepth').valueAsNumber;
 for(const input of [$('labLevel'),$('labDepth')]){if(!input.reportValidity())return}
 if(!Object.hasOwn(CLASS_AWAKENINGS,cls)||!['magic','epic','signature'].includes(kit))return;
 const path=CLASS_AWAKENINGS[cls].find(entry=>entry.id===$('labPath').value);
 closeCombatInput();resetWhirl();
 window.dodWhirlTrialLevel=null;localStorage.removeItem('dodWhirlTrialLevel');
 window.dodRift?.endTestRift();
 window.dodHeroClass=cls;localStorage.setItem('dodClass',cls);
 P.lv=level;P.xp=0;P.dead=0;P.blade=0;P.guard=0;P.dash=null;
 window.dodProgression.resetTestTalents(cls);
 window.dodResetTestBar(cls);
 const rarity=kit==='magic'?1:2;
 P.eq=SL.map((_,slot)=>mkItem(depth,0,{lootSlot:slot,testLevel:level,testRarity:rarity}));
 if(kit==='signature'){
  const pool=(WITCH_LOOT[cls]||[]).map(id=>LEGENDARIES.find(it=>it.id===id)).filter(Boolean);
  for(const base of pool)P.eq[base.s]=makeLegendary(base,level);
 }
 if(P.eq[0]?.handed==='two')P.eq[8]=null;
 quest.evadeAwakening=path?.id||null;
 if(path){quest.kills=Math.max(quest.kills||0,AWAKENING_UNLOCK);quest.evadeMastery={...quest.evadeMastery,[path.id]:$('labEvolved').checked?AWAKENING_MASTERY:0}}
 CD.fill(0);
 if(depth>30)window.dodUnlockEndgame?.();
 for(const id of ['dead','inv','progPanel','admin','titleScreen','sanctuary','classStart','d3service','bossRewards']){if($(id))$(id).style.display='none'}
 build(depth);
 const S=stats();P.hp=S.H;P.mp=S.M;P.inv_t=1.5;
 renderSkillSlots();renderInv();save();
 banner('Test run · Level '+level+' · Depth '+fl);
}
function workshopPaths(cls){
 return '<option value="">Standard Evade</option>'+CLASS_AWAKENINGS[cls].map(path=>'<option value="'+path.id+'">'+esc(path.name)+'</option>').join('');
}
function renderAdmin(){
 const all=[...LEGENDARIES.map(x=>({...x,r:3,unique:true})),...(P.eq.filter(Boolean)),...P.inv];const uniqueCount=LEGENDARIES.length,equippedCount=P.eq.filter(Boolean).length;
 const names=SL,hasBackup=Boolean(localStorage.getItem(ADMIN_BACKUP_KEY)),goldNow=window.dodGold?.get?.()||0,fragsNow=typeof dodAbyssFragments!=='undefined'?dodAbyssFragments:0,pState=window.dodParagon?.getState?.()||{level:0};
 const srv=window.dodAdminStats;
 const srvHtml=srv&&!srv.error?`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:8px 0">
  <div style="padding:8px;border:1px solid #3c2f27;border-radius:3px;background:#100d0f"><div class="muted" style="font-size:11px">Active Users (30d)</div><div style="font-size:18px;font-weight:700;color:#f5e3b8">${Number(srv.activeUsers30d||0)}</div><div class="muted" style="font-size:11px">${Number(srv.totalUsers||0)} registered</div></div>
  <div style="padding:8px;border:1px solid #3c2f27;border-radius:3px;background:#100d0f"><div class="muted" style="font-size:11px">Avg Depth Reached</div><div style="font-size:18px;font-weight:700;color:#e6c47a">${Number(srv.avgBestDepthAcrossPlayers||0).toFixed(1)}</div><div class="muted" style="font-size:11px">Avg run ${Number(srv.avgRunDepth||0).toFixed(1)}</div></div>
  <div style="padding:8px;border:1px solid #3c2f27;border-radius:3px;background:#100d0f"><div class="muted" style="font-size:11px">Peak Depth &amp; Runs</div><div style="font-size:18px;font-weight:700;color:#79e394">Depth ${Number(srv.maxDepthReached||0)}</div><div class="muted" style="font-size:11px">${Number(srv.totalDungeonRuns||0)} total runs</div></div>
 </div>
 <div style="margin-top:8px"><div class="muted" style="font-size:11px;margin-bottom:5px">Most Played Character Classes (${Number(srv.totalSavedHeroes||0)} saves)</div>${Array.isArray(srv.classDistribution)&&srv.classDistribution.length?srv.classDistribution.map(cls=>`<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span style="color:#f5e3b8;font-weight:600">${esc(cls.label||cls.id)}</span><span class="muted">${Number(cls.count||0)} (${Number(cls.percentage||0)}%)</span></div><div style="height:6px;background:#0e0b0d;border-radius:2px;overflow:hidden"><div style="height:100%;width:${Math.max(0,Math.min(100,Number(cls.percentage||0)))}%;background:linear-gradient(90deg,#9b6830,#e5ba68)"></div></div></div>`).join(''):'<p class="muted">No saved heroes recorded yet.</p>'}</div>`:`<p class="muted">${srv&&srv.error?esc(srv.error):'Loading global server statistics...'}</p>`;
 admin.innerHTML=`<div class="arow" style="justify-content:space-between;align-items:center"><h2>⚙ Admin Workshop</h2><button data-admin="close">Close ✕</button></div><p class="muted">Authorized Admin tools · Lv ${P.lv} · Depth ${fl} · Gold ${goldNow}g · Fragments ${fragsNow} · Paragon Lv ${pState.level||0}</p>
 <section class="lab-scenario"><h3>Test a build</h3><p>Pick a class, gear kit, and encounter. Talents start unspent. Restore your original hero when you finish.</p>
 <div class="agrid"><label>Hero class<select id="labClass">${[['warrior','Warrior'],['pyromancer','Pyromancer'],['rogue','Shadow Rogue']].map(([id,name])=>'<option value="'+id+'" '+(id===(window.dodHeroClass||'warrior')?'selected':'')+'>'+name+'</option>').join('')}</select></label>
 <label>Hero level<input id="labLevel" required type="number" min="1" max="50" value="${P.lv}"></label><label>Dungeon depth<input id="labDepth" required type="number" min="1" max="999" value="${fl}"></label>
 <label>Equipment<select id="labKit"><option value="magic">Magic gear</option><option value="epic">Epic gear</option><option value="signature">Class legendaries + Epic gear</option></select></label><label>Evade power<select id="labPath">${workshopPaths(window.dodHeroClass||'warrior')}</select></label></div>
 <label><input type="checkbox" id="labEvolved"> Evolved Evade</label><div class="arow"><button data-admin="scenario">Play test build</button><button data-admin="restore-backup" ${hasBackup?'':'disabled'}>Restore original save</button></div></section>
 <div style="padding:11px;border:1px solid #8a6d45;border-radius:3px;background:#161113;margin-bottom:12px"><h3 style="margin-top:0">🚀 Endgame Quick-Start (Lv 50 + Gear)</h3><p class="muted">Backs up your current hero automatically, unlocks Depth 31 Endgame, equips empowered Lv 50 Unique/Set gear + gems, maxes skills, and grants Waystone T5 + 5,000g + 25 Fragments.</p><div class="arow"><button data-admin="endgame-current" style="border-color:#c9a24a;background:#2c1f19;color:#f5e3b8">⚡ Start Endgame (Current)</button><button data-admin="endgame-warrior">⚔️ Endgame Warrior</button><button data-admin="endgame-pyromancer">🔥 Endgame Pyromancer</button><button data-admin="endgame-rogue">🗡️ Endgame Rogue</button><button data-admin="restore-backup" ${hasBackup?'':'disabled'}>↶ Restore Original Hero</button></div></div>
 <div ${localWorkshop?'hidden':''} style="padding:11px;border:1px solid #6b5336;border-radius:3px;background:#141013;margin-bottom:12px"><div class="arow" style="justify-content:space-between;align-items:center"><h3 style="margin:0">📊 Global Server Statistics</h3><button data-admin="refresh-stats">↻ Refresh Server Stats</button></div>${srvHtml}${srv&&srv.generatedAt?`<div class="muted" style="font-size:10px;margin-top:6px">Updated ${esc(new Date(srv.generatedAt).toLocaleTimeString())}</div>`:''}</div>
 <h3>⚡ Admin Actions</h3>
 <div class="arow"><button data-admin="godmode" style="${window.dodAdminGodMode?'border-color:#79e394;background:#1a3122;color:#b8f7c8':''}">God Mode: ${window.dodAdminGodMode?'ON':'OFF'}</button><button data-admin="heal">Restore HP &amp; Mana</button><button data-admin="level">+1 level</button><button data-admin="level10">+10 levels</button><button data-admin="add-paragon">+5 Paragon Lvs</button><button data-admin="gold">+10 Potions</button></div>
 <div class="arow"><button data-admin="add-gold">+1,000 Gold</button><button data-admin="add-frags">+25 Fragments</button><button data-admin="add-gems">+5 All Gems</button><button data-admin="add-mats">+150 Salvage / +30 Essence</button><button data-admin="unlock-endgame">Unlock Depth 31 Endgame</button></div>
 <div class="arow"><button data-admin="kill">Kill all enemies</button><button data-admin="boss">Spawn Boss</button><button data-admin="open-rift">Open Waystone Rift</button><button data-admin="spawn-butcher">Spawn Uber Butcher</button><button data-admin="spawn-sovereign">Spawn Uber Sovereign</button></div>
 <div class="arow"><label style="flex:1;min-width:130px">Go to depth<input id="adminFloor" type="number" min="1" max="999" value="${fl}"></label><button data-admin="floor">Set depth</button><button data-admin="save">Save now</button><button data-admin="reset">Delete save</button></div>
 <h3>Test Enemy Loot Themes</h3><p class="muted">Creates a level-scaled sample in your backpack and opens Inventory for inspection. Works on mobile.</p><div class="arow"><button data-theme-test="swift">🏹 Swift · Dodge</button><button data-theme-test="bulwark">🛡 Bulwark · Armor/Stamina</button><button data-theme-test="arcane">🔮 Arcane · Mana</button><button data-theme-test="brutal">💥 Brutal · Strength</button></div>
 <h3>Unique Weapons &amp; Sets</h3><div class="agrid">${LEGENDARIES.map(it=>`<div class="aitem"><b style="color:#ff9a38">${it.icon||IC[it.s]} ${esc(it.n)}</b><div class="muted">${names[it.s]} · ${esc(it.desc||'')}</div><div class="muted">${esc(it.power||'')}</div><button data-leg="${esc(it.id)}">Add at Level ${P.lv}</button></div>`).join('')}</div>
 <h3>Create Custom Item</h3><div class="agrid">
 <label>Name<input id="ciName" maxlength="40" value="Admin Item"></label>
 <label>Slot<select id="ciSlot">${names.map((n,i)=>`<option value="${i}">${n}</option>`).join('')}</select></label>
 <label>Rarity<select id="ciRare"><option value="0">Common</option><option value="1">Magic</option><option value="2">Rare</option><option value="3">Legendary</option></select></label>
 <label>Icon<input id="ciIcon" maxlength="4" value="✨"></label>
 <label>Weapon Damage Min<input id="ciDMin" type="number" value="46"></label><label>Weapon Damage Max<input id="ciDMax" type="number" value="82"></label><label>Armor<input id="ciA" type="number" value="0"></label><label>Health<input id="ciH" type="number" value="0"></label><label>Crit Chance %<input id="ciC" type="number" value="0"></label><label>Life Steal %<input id="ciL" type="number" value="0"></label><label>Mana<input id="ciM" type="number" value="0"></label><label>Strength<input id="ciSTR" type="number" value="0"></label><label>Spell Power<input id="ciSP" type="number" value="0"></label><label>Haste %<input id="ciHaste" type="number" value="0"></label>
 </div><div class="arow"><button data-admin="create">Create item</button><button data-admin="random">Generate random legendary</button></div>
 <h3>Item Library & Your Equipment</h3><p class="muted">Shows the current unique weapons and set pieces, plus items in your inventory and equipped gear.</p><div class="agrid">${all.map((it,i)=>`<div class="aitem"><b style="color:${RAR[it.r||0][1]}">${it.icon||IC[it.s]} ${esc(it.n)}</b><div class="muted">${names[it.s]||'Item'} · ${RAR[it.r||0][0]}</div><div class="muted">${(it.s===0?[`Weapon Damage ${it.st.dMin??4}–${it.st.dMax??7}`]:Object.entries(it.st||{}).map(([k,v])=>`+${v}${PC[k]?'%':''} ${SN[k]||k}`)).join(' · ')}</div><button data-admin="clone" data-index="${i}" data-kind="${i<uniqueCount?'legend':i<uniqueCount+equippedCount?'equip':'bag'}">Copy to inventory</button></div>`).join('')}</div>`;
}
admin.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(!window.dodIsAdmin)return;if(b.hasAttribute('data-ww-level')||b.hasAttribute('data-ww-restore'))return;const act=b.dataset.admin;
 if(!['close','restore-backup','refresh-stats','reset'].includes(act)&&!adminBackupCurrentHero()){banner('Could not back up the hero');return}
 if(act==='scenario'){applyWorkshopScenario();return}
 if(b.dataset.leg){const it=LEGENDARIES.find(x=>x.id===b.dataset.leg);if(it)adminGive(makeLegendary(it,P.lv));renderAdmin();return} if(b.dataset.themeTest){if(P.inv.length>=24){banner('Backpack is full');return}const source=({swift:{t:'ar',eliteType:'ravager'},bulwark:{t:'zb',eliteType:'bulwark'},arcane:{t:'sk',eliteType:'hexer'},brutal:{t:'zb',eliteType:'crusher'}})[b.dataset.themeTest];if(source){adminGive(mkItem(fl,0,source));admin.style.display='none';inv.style.display='block';renderInv()}return}
 if(act==='close'){admin.style.display='none';return}
 if(act==='refresh-stats'){if(window.parent&&window.parent!==window)window.parent.postMessage({type:'dod:request-admin-stats'},window.location.origin);banner('Refreshing global server statistics...');return}
 if(act==='endgame-current'){window.dodAdminEndgame();return}
 if(act==='endgame-warrior'){window.dodAdminEndgame('warrior');return}
 if(act==='endgame-pyromancer'){window.dodAdminEndgame('pyromancer');return}
 if(act==='endgame-rogue'){window.dodAdminEndgame('rogue');return}
 if(act==='restore-backup'){adminRestoreOriginalHero();return}
 if(act==='godmode'){window.dodAdminGodMode=!window.dodAdminGodMode;banner('Admin God Mode: '+(window.dodAdminGodMode?'ON':'OFF'));renderAdmin();return}
 if(act==='add-gold'){window.dodGold?.add?.(1000);banner('+1,000 Gold')}
 if(act==='add-frags'){dodAbyssFragments=(dodAbyssFragments||0)+25;banner('+25 Abyssal Fragments')}
 if(act==='add-gems'){for(const gk of Object.keys(GEMS))dodGems[gk]=(dodGems[gk]||0)+5;banner('+5 of all Socket Gems')}
 if(act==='add-mats'){try{const m=JSON.parse(localStorage.getItem('dod3meta')||'{}');m.scrap=(+m.scrap||0)+150;m.essence=(+m.essence||0)+30;localStorage.setItem('dod3meta',JSON.stringify(m));if(window.dodSanctuary?.meta){window.dodSanctuary.meta.scrap=m.scrap;window.dodSanctuary.meta.essence=m.essence}}catch(err){}banner('+150 Salvage & +30 Essence')}
 if(act==='add-paragon'){const nl=window.dodParagon?.grantLevels?.((window.dodParagon?.getState?.().level||0)+5);banner('Paragon Level: '+nl)}
 if(act==='unlock-endgame'){window.dodUnlockEndgame?.();best=Math.max(best||1,31);build(Math.max(31,fl));banner('Depth 31 Endgame unlocked!')}
 if(act==='open-rift'){admin.style.display='none';window.dodRift?.openWaystone?.();return}
 if(act==='spawn-butcher'){admin.style.display='none';window.dodRift?.spawnUber?.('butcher',true);return}
 if(act==='spawn-sovereign'){admin.style.display='none';window.dodRift?.spawnUber?.('sovereign',true);return}
 if(act==='heal'){P.hp=stats().H;P.mp=stats().M;banner('Health and mana restored')}
 if(act==='level'||act==='level10'){const n=act==='level'?1:10;P.lv=Math.min(50,P.lv+n);normalizeLoadout();renderSkillSlots();P.hp=stats().H;P.mp=stats().M;banner('Level increased: '+P.lv)}
 if(act==='gold'){elixirs+=10;banner('+10 health potions')}
 if(act==='kill'){for(const enemy of E.slice()){if(!enemy.dead){enemy.tk=enemy.mh;die(enemy)}}banner('Encounter cleared')}
 if(act==='boss'){if(boss&&!boss.dead){banner('Boss already present')}else{const id=E.reduce((max,e)=>Math.max(max,e.id||0),0)+1;boss=mkE('bs',stairs.x,stairs.y,fl,id,false);boss.boss=1;bossDone=0;E.push(boss);banner('Boss summoned at the descent')}}
 if(act==='floor'){const n=Math.max(1,Math.min(999,parseInt($('adminFloor').value)||1));if(n>30)window.dodUnlockEndgame?.();build(n);banner('Moved to depth '+n)}
 if(act==='save'){save();banner('Saved!')}
 if(act==='reset'){if(confirm('Delete your entire local save file?')){localStorage.removeItem('mdjup');location.reload()}return}
 if(act==='create'){const st={};if(+$('ciSlot').value===0){const lo=+($('ciDMin').value||4),hi=+($('ciDMax').value||7);st.dMin=Math.min(lo,hi);st.dMax=Math.max(lo,hi)}else{for(const [id,k] of [['ciA','a'],['ciH','h'],['ciC','c'],['ciL','l'],['ciM','m'],['ciSTR','str'],['ciSP','sp'],['ciHaste','haste']]){const v=+(($(id).value)||0);if(v)st[k]=v}}adminGive({id:'admin_'+Date.now(),s:+$('ciSlot').value,r:+$('ciRare').value,n:$('ciName').value||'Admin Item',icon:$('ciIcon').value||'✨',st,desc:'Created in the Admin Workshop.',power:'A custom-crafted item.',unique:+$('ciRare').value===3});renderAdmin();save();return}
 if(act==='random'){adminGive(makeLegendary(LEGENDARIES[RI(0,LEGENDARIES.length-1)],P.lv));renderAdmin();return}
 if(act==='clone'){const i=+b.dataset.index,kind=b.dataset.kind;let it;const uniqueCount=LEGENDARIES.length;if(kind==='legend')it=makeLegendary(LEGENDARIES[i],P.lv);else if(kind==='equip')it=P.eq.filter(Boolean)[i-uniqueCount];else it=P.inv[i-uniqueCount-P.eq.filter(Boolean).length];if(it)adminGive(it);renderAdmin();return}
 save();renderInv();renderAdmin();
});
admin.addEventListener('change',event=>{if(event.target.id==='labClass')$('labPath').innerHTML=workshopPaths(event.target.value)});
for(const type of ['keydown','keyup'])admin.addEventListener(type,event=>{if(event.target.matches('input,select,textarea')&&event.key!=='F2')event.stopPropagation()});
$('adminBtn').onclick=adminOpen;
addEventListener('keydown',e=>{if(e.key==='F2'){e.preventDefault();if(window.dodIsAdmin)adminOpen()}});

// Health potions purchased from the merchant are used with Q.
const _cast=cast;cast=function(i){if(i===POTION_CD){usePotion();return}_cast(i)};
// The separate Sanctuary/Adventure hub has been retired; no T shortcut opens its services.
load();if(!localStorage.getItem('dodStarterPotionsV1')){elixirs=Math.max(elixirs,2);localStorage.setItem('dodStarterPotionsV1','1')}normalizeLoadout();renderSkillSlots();build(fl);renderInv();setTimeout(()=>$('help').style.opacity=0,15000);
let last=performance.now();
function dungeonMenuOpen(){
 if(document.querySelector('dialog[open]'))return true;
 return ['inv','adv','admin','worldPanel','progPanel','d3service','bossRewards','classStart','titleScreen','codexPanel','enchanterPanel','sanctuary'].some(id=>{
  const display=$(id)?.style.display;
  return display==='block'||display==='grid'||display==='flex';
 });
}
function loop(n){const dt=Math.max(0,Math.min(.05,(n-last)/1000));last=n;fr++;try{
 const inTown=window.dodCity?.active(),paused=!inTown&&dungeonMenuOpen();
 if(!paused)tm+=dt;
 else if(WW.active)stopWhirl();
 window.dodPaintHeroPreview?.(n);if(!P.dead&&!inTown&&!paused){
 const oldX=P.x,oldY=P.y,depth=fl;
 update(dt);
 const moved=depth===fl?Math.hypot(P.x-oldX,P.y-oldY):0;
 P.walking=moved>.1&&moved<36;
 if(P.walking)P.stride=((P.stride||0)+moved*.18)%(Math.PI*2);
 }if(!window.dodCity?.render(n,dt))draw();if(fr%4==0){hud();drawMM();paintOpeningHud();paintClassCounter();paintKillStreak();paintForgeOrder()}}catch(error){console.error('Depths of Darkness stopped after a runtime error:',error);let panel=document.getElementById('runtimeError');if(!panel){panel=document.createElement('section');panel.id='runtimeError';panel.style.cssText='position:fixed;z-index:9999;inset:0;display:grid;place-items:center;background:rgba(8,6,7,0.95);color:#f2e7cf;padding:20px;font:14px system-ui';document.body.appendChild(panel)}panel.innerHTML='<div style="max-width:560px;padding:24px;background:#0f0c0e;border:1px solid #8a6d45;border-radius:3px"><h2 style="color:#ead08b">Game Stopped by an Error</h2><p>Your save data is safe. Reload the page to continue.</p><pre style="white-space:pre-wrap;color:#bfb097">'+String(error?.stack||error).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</pre><button onclick="location.reload()">Reload Game</button></div>';return}requestAnimationFrame(loop)}
requestAnimationFrame(loop);
