/* EXPANSION 5.0 — MULTI-CLASS COMBAT, ARMOR SETS, GOLD & ENCHANTER, CODEX & BESTIARY */
(()=>{
 const savedCls=localStorage.getItem('dodClass');
 window.dodHeroClass=(savedCls==='pyromancer'||savedCls==='rogue'||savedCls==='warrior')?savedCls:'warrior';

 const CLASS_SKILLS={
  pyromancer:[
   {id:'fireball',n:'Fireball',i:'🔥',cd:2.2,mp:12,unlock:1,desc:'Hurl an explosive fireball dealing Spell Power AoE damage & Ignite.'},
   {id:'flamenova',n:'Flame Nova',i:'💥',cd:5.5,mp:18,unlock:2,desc:'Ignite nearby foes. Already-burning foes detonate, spreading fire.'},
   {id:'blink',n:'Arcane Blink',i:'✨',cd:4.5,mp:14,unlock:4,desc:'Teleport forward along your aim direction and gain brief invulnerability.'},
   {id:'chainlightning',n:'Chain Lightning',i:'⚡',cd:4.2,mp:16,unlock:7,desc:'Arc storm bolts across up to 4 foes, applying Shock (+18% damage taken).'},
   {id:'icearmor',n:'Ice Armor',i:'🧊',cd:11.0,mp:22,unlock:10,desc:'Conjure crystalline ward (+28 Armor, +16% Dodge for 4.5s) and chill attackers.'},
   {id:'stormhalo',n:'Storm Halo',i:'⚡',cd:8.1,mp:20,unlock:13,desc:'Orbiting lightning follows you for 4.2s, shocking enemies and arcing to nearby foes.'},
   {id:'pyroblast',n:'Pyroblast',i:'🌋',cd:7.0,mp:28,unlock:16,desc:'Launch a massive molten orb dealing heavy Spell AoE & deep Ignite burn.'},
   {id:'meteor',n:'Meteor Rain',i:'☄️',cd:8.5,mp:26,unlock:20,desc:'Call down scorching meteors ahead of you for heavy AoE damage, Ignite & stun.'}
  ],
  rogue:[
   {id:'twinfang',n:'Twin Fang',i:'🗡️',cd:2.0,mp:10,unlock:1,desc:'Strike twice in a swift arc and inflict deep bleeding.'},
   {id:'fanknives',n:'Fan of Knives',i:'🔪',cd:5.0,mp:16,unlock:2,desc:'Hurl piercing razor daggers in a cone that slow enemies.'},
   {id:'shadowstep',n:'Shadowstep',i:'🌑',cd:4.0,mp:12,unlock:4,desc:'Dash through foes to expose them for +75% damage on your next hit and +35% Crit Chance.'},
   {id:'venomstrike',n:'Venom Strike',i:'🐍',cd:3.8,mp:14,unlock:7,desc:'Lunge strike inflicting deep Bleed and 3s Slow.'},
   {id:'caltrops',n:'Caltrops',i:'⚙️',cd:7.5,mp:18,unlock:10,desc:'Scatter steel traps around you, bleeding and slowing nearby foes.'},
   {id:'smokebomb',n:'Smoke Bomb',i:'💨',cd:9.0,mp:22,unlock:13,desc:'Vanish in shadow mist: +45% Dodge & +25% Crit Chance for 4s.'},
   {id:'bladeflurry',n:'Blade Flurry',i:'🌀',cd:6.0,mp:22,unlock:16,desc:'Spin-slash all nearby enemies twice in a blinding whirlwind.'},
   {id:'assassinate',n:'Assassinate',i:'☠️',cd:9.5,mp:26,unlock:20,desc:'Lethal shadow strike dealing +75% damage to foes below 40% Health.'}
  ]
 };

 let classLoadouts={warrior:[...abilityLoadout],pyromancer:[0,1,2,3],rogue:[0,1,2,3]};
 try{
  const rawL=JSON.parse(localStorage.getItem('dodClassLoadoutsV1')||'null');
  if(rawL&&typeof rawL==='object'){
   for(const k of ['pyromancer','rogue']){
    if(Array.isArray(rawL[k])&&rawL[k].length===4){
     classLoadouts[k]=rawL[k].map((v,idx)=>{if(v==null)return null;const n=Number(v);return Number.isInteger(n)&&n>=0&&n<(CLASS_SKILLS[k]?.length||8)?n:idx});
    }
   }
  }
 }catch(e){}
 if(window.dodHeroClass!=='warrior')abilityLoadout=[...(classLoadouts[window.dodHeroClass]||[0,1,2,3])];

 window.dodResetTestBar=c=>{
  if(!window.dodIsAdmin)return;
  abilityLoadout=[0,1,2,3];
  if(c==='warrior')normalizeLoadout();
  else{classLoadouts[c]=[...abilityLoadout];localStorage.setItem('dodClassLoadoutsV1',JSON.stringify(classLoadouts))}
 };
 window.dodGetClassSkills=c=>c==='warrior'?AB:(CLASS_SKILLS[c]||CLASS_SKILLS.pyromancer);
 window.dodGetClassLoadout=c=>c==='warrior'?abilityLoadout:(classLoadouts[c]||[0,1,2,3]);
 window.dodSetClassLoadout=(c,slot,next)=>{
  const list=window.dodGetClassSkills(c);
  if(!Number.isInteger(slot)||slot<0||slot>3||!Number.isInteger(next)||!list[next]||P.lv<list[next].unlock)return;
  const equipped=window.dodGetClassLoadout(c);
  if(equipped.some((value,index)=>index!==slot&&value===next))return;
  if(c==='warrior'){
   abilityLoadout[slot]=next;normalizeLoadout();
  }else{
   classLoadouts[c][slot]=next;
   abilityLoadout=[...classLoadouts[c]];
   try{localStorage.setItem('dodClassLoadoutsV1',JSON.stringify(classLoadouts))}catch(e){}
  }
  renderSkillSlots();
 };

 const ITEM_SETS=[
  {
   id:'bloodforged',
   name:'Bloodforged Pact',
   color:'#ff6875',
   ids:['blackfang_main','blackfang_off','bloodletter','soulbinder_pendant'],
   twoDesc:'+8% Critical Chance & +15% Bleed Damage',
   threeDesc:'+4% Life Leech & +20% damage against bleeding enemies'
  },
  {
   id:'frostwarden',
   name:'Frostwarden Bastion',
   color:'#7be3ff',
   ids:['wardens_oath','wardens_aegis','frostvein_greaves'],
   twoDesc:'+14 Armor & +8% Dodge',
   threeDesc:'Taking damage chills nearby enemies (3s) & restores 4% Max Health (6s CD)'
  },
  {
   id:'ashen_vanguard',
   name:'Ashen Vanguard',
   color:'#ff9f4a',
   ids:['dawn_crown','worldplate','ashen_gauntlets','doomhammer'],
   twoDesc:'+25% Critical Damage & +12% Haste',
   threeDesc:'Critical hits unleash an ember shockwave for 35% AoE damage'
  },
  {
   id:'emberweaver',
   name:'Emberweaver Regalia',
   color:'#ff7f45',
   ids:['ember_circlet','ember_vestments','cinderstaff','astral_orb'],
   twoDesc:'+18% Spell Power & +10% Cooldown Reduction',
   threeDesc:'Ignite burns deal +45% damage & spell crits restore 4 Mana'
  },
  {
   id:'nightstalker',
   name:'Nightstalker Shroud',
   color:'#c28cff',
   ids:['nightstalker_cowl','nightstalker_garb','nightstalker_dirk','venomtooth_off'],
   twoDesc:'+10% Dodge & +25% Critical Damage',
   threeDesc:'Fan of Knives fires +2 extra piercing blades & dodging restores 3% Health'
  }
 ];

 const getSetCounts=()=>{
  const eqIds=new Set((P?.eq||[]).filter(Boolean).map(x=>x.id).filter(Boolean));
  return ITEM_SETS.map(set=>{
   const count=set.ids.filter(id=>eqIds.has(id)).length;
   return {...set,count};
  });
 };

 const GOLD_KEY='dodGoldV1';
 let gold=0;
 try{
  const rawG=localStorage.getItem(GOLD_KEY);
  gold=rawG!==null?Math.max(0,Math.floor(Number(rawG)||0)):100;
 }catch(e){gold=100}
 const saveGold=()=>{try{localStorage.setItem(GOLD_KEY,String(gold))}catch(e){}};
 const addGold=(amt)=>{
  const v=Math.round(amt||0);
  if(!v)return;
  gold=Math.max(0,gold+v);saveGold();paintGoldHud();
 };

 const extractAspect=(it)=>{
  if(!it)return false;
  const aid=it.aspectId||it.id;
  if(!aid||!it.power)return false;
  if(!Array.isArray(dodAspects))return false;
  if(dodAspects.some(a=>a.id===aid))return false;
  dodAspects.push({id:aid,name:String(it.n||'Relic Aspect').split(' · ')[0]+' Aspect',power:it.power});
  save();
  return true;
 };
 window.dodExtractAspect=extractAspect;

 const BESTIARY_KEY='dodBestiaryV1';
 let bestiary={};
 try{const rawB=JSON.parse(localStorage.getItem(BESTIARY_KEY)||'{}');if(rawB&&typeof rawB==='object')bestiary=rawB}catch(e){}
 const saveBestiary=()=>{try{localStorage.setItem(BESTIARY_KEY,JSON.stringify(bestiary))}catch(e){}};

 const BESTIARY_ENTRIES=[
  {key:'Skeleton',icon:'💀',tier:'Common',depths:'Depth 1+',difficulty:'Easy',lore:'Animated bones bound by ash-wardens to patrol the upper crypts.',milestones:[{threshold:50,title:'Bonebreaker',loreSnippet:'Fifty skulls cracked beneath your boot reveal hairline runes etched inside their marrow.'},{threshold:100,title:'Cryptwarden',loreSnippet:'At a hundred fallen sentries, you recognize their ancient patrol cadence.'},{threshold:500,title:'Sovereign of Ash & Bone',loreSnippet:'Five hundred shattered frames prove even deathless bone learns fear.'},{threshold:1000,title:'Undying Reaper',loreSnippet:'A thousand bone-wardens turned to dust; upper keep bindings unravel at your approach.'}]},
  {key:'Undead Beast',icon:'🧟',tier:'Bruiser',depths:'Depth 1+',difficulty:'Easy',lore:'Hulking flesh stitched with iron staples; slow but crushing.',milestones:[{threshold:50,title:'Fleshrender',loreSnippet:'Every iron staple bears the Butcher’s foundry mark salvaged from siege rams.'},{threshold:100,title:'Abomination Hunter',loreSnippet:'Alchemical brine seeps from their seams; deeper vaults stitch two beasts together.'},{threshold:500,title:'Scourge of the Vat',loreSnippet:'Five hundred hulks torn apart leave the slaughter pits quiet below Depth 15.'},{threshold:1000,title:'Titan-Bane',loreSnippet:'A thousand abominations dismantled; no champion in the Butcher’s vats bars your path.'}]},
  {key:'Bone Archer',icon:'🏹',tier:'Ranged',depths:'Depth 1+',difficulty:'Easy',lore:'Deadeye marksmen firing ember-tipped bone arrows from afar.',milestones:[{threshold:50,title:'Arrow-Cutter',loreSnippet:'Carved finger-bone arrowheads dipped in pitch whistle before igniting.'},{threshold:100,title:'Deadeye Stalker',loreSnippet:'A hundred quivers reveal fletching dyed with ash-crow feathers from fallen rangers.'},{threshold:500,title:'Bane of the Volley',loreSnippet:'Five hundred marksmen silenced across the crypts; no rampart volley remains unbroken.'},{threshold:1000,title:'Gale-Breaker',loreSnippet:'A thousand ember-tipped shafts deflected or shattered across the dark vaults.'}]},
  {key:'Cultist Summoner',icon:'🕯️',tier:'Caster',depths:'Depth 4+',difficulty:'Moderate',lore:'Hooded acolytes raising skeletal thralls in battle.',milestones:[{threshold:50,title:'Chant-Breaker',loreSnippet:'Charred robes hide wax-sealed parchments meant to keep the Sovereign’s bell silent.'},{threshold:100,title:'Hex-Hunter',loreSnippet:'Crimson tallow marks initiates; bone-ash wax marks choir leaders.'},{threshold:500,title:'Heretic’s Doom',loreSnippet:'Five hundred summoners cut mid-chant leave summoning circles cold across the keep.'},{threshold:1000,title:'Silencer of Bells',loreSnippet:'A thousand grimoires reduced to ash; deeper choirs dare not whisper your name.'}]},
  {key:'Plague Bomber',icon:'🧪',tier:'Volatile',depths:'Depth 7+',difficulty:'Moderate',lore:'Blighted sprinters rushing close to detonate in toxic fire.',milestones:[{threshold:50,title:'Blight-Walker',loreSnippet:'Glass flasks hold fermented swamp-fire and marrow oil, unstable on impact.'},{threshold:100,title:'Cinder-Sapper',loreSnippet:'A hundred blasts dodged train your ear to catch uncorked pitch half a stride early.'},{threshold:500,title:'Alchemist’s Ruin',loreSnippet:'Five hundred runners neutralized before the fuse catches.'},{threshold:1000,title:'Ashen Purifier',loreSnippet:'A thousand plague-flasks snuffed cold; swamp-fire alchemy holds no terror for you.'}]},
  {key:'Dread Knight',icon:'🛡️',tier:'Champion',depths:'Depth 10+',difficulty:'Deadly',lore:'Armored revenants clad in obsidian plate.',milestones:[{threshold:50,title:'Plate-Cracker',loreSnippet:'Beneath black pauldrons, royal silver filigree gleams—honor guards who never retreated.'},{threshold:100,title:'Oathbreaker',loreSnippet:'No knight may lay down blade while an unsealed ember burns in Depth 30.'},{threshold:500,title:'Vanguard Conqueror',loreSnippet:'Five hundred obsidian helms cloven; even the Grave Lord’s inner legion gives ground.'},{threshold:1000,title:'Obsidian Breaker',loreSnippet:'A thousand honor-bound plates shattered; a living legend walks the vaults.'}]},
  {key:'Elite Champion',icon:'⚡',tier:'Elite',depths:'Depth 1+',difficulty:'Moderate',lore:'Bulwarks, Ravagers, Hexers, and Crushers mutated by dungeon miasma.',milestones:[{threshold:50,title:'Champion-Slayer',loreSnippet:'Abyssal miasma warps elites into shield-wall Bulwarks, Ravagers, Hexers, and Crushers.'},{threshold:100,title:'Miasma-Bane',loreSnippet:'Their glowing auras stem from fractured Abyssal Fragments lodged near the heart.'},{threshold:500,title:'Apex Harvester',loreSnippet:'Five hundred elite packs purged; trophy caches spill like rain.'},{threshold:1000,title:'Miasma Sovereign',loreSnippet:'A thousand mutated packs conquered across campaign and Waystone Rifts alike.'}]},
  {key:'The Butcher',icon:'🪓',tier:'Boss',depths:'Depth 3, 15+',difficulty:'Moderate',lore:'First warden of the slaughter vaults; charges recklessly into prey.',drops:['2–3 Boss Trophies (+0.65 rarity, Unique Axe pool)','85% Socket Gem · 95–135 Gold'],loreSecret:'No prisoner left Depth 3 alive once the iron hooks began to swing; his ledger still records every name.'},
  {key:'Blood Witch',icon:'🩸',tier:'Boss',depths:'Depth 6+',difficulty:'Moderate',lore:'Sanguine matriarch whose coven feeds upon spilled crimson.',drops:['2–3 Boss Trophies (Crit Dmg, Leech & Spell bias)','85% Socket Gem · 110–150 Gold'],loreSecret:'The Blood Witch bound her coven with living veins; every bleed feeds the roots beneath Depth 6.'},
  {key:'Grave Lord',icon:'👑',tier:'Boss',depths:'Depth 9+',difficulty:'Moderate',lore:'Fallen sovereign clad in rusted regalia, commanding endless legions.',drops:['2–3 Boss Trophies (Armor, STR & Worldplate pool)','85% Socket Gem · 125–165 Gold'],loreSecret:'Royal bones marched once more the night his iron crown shattered against the obsidian throne.'},
  {key:'Abyssal Dragon',icon:'🐉',tier:'Boss',depths:'Depth 12+',difficulty:'Deadly',lore:'Ancient wyrm whose cinder breath scorched the lower obsidian halls.',drops:['2–3 Boss Trophies (Fire, Crit Dmg & Cinderheart pool)','85% Socket Gem · 140–180 Gold'],loreSecret:'Dragonfire never cooled in Depth 12—it sank into the granite walls beneath delvers’ boots.'},
  {key:'Iron Colossus',icon:'🗿',tier:'Boss',depths:'Depth 15+',difficulty:'Deadly',lore:'Living siege-golem forged from basalt and chained furnace cores.',drops:['2–3 Boss Trophies (Mace & Warden’s Aegis pool)','85% Socket Gem · 155–195 Gold'],loreSecret:'Dwarven smiths sealed their own heart-embers inside the basalt core so the vault gates would hold.'},
  {key:'Ash Seraph',icon:'🪽',tier:'Boss',depths:'Depth 18+',difficulty:'Deadly',lore:'Fallen sentinel wreathed in white-hot cinders and blinding wings.',drops:['2–3 Boss Trophies (Haste, CDR & Dawn Crown pool)','85% Socket Gem · 170–210 Gold'],loreSecret:'Once guardian of the outer sanctuary, blinded by looking directly into the unsealed Abyss.'},
  {key:'Dread Necromancer',icon:'☠️',tier:'Boss',depths:'Depth 21+',difficulty:'Deadly',lore:'Arch-lich weaving nova bolts from shattered soul-phylacteries.',drops:['2–3 Boss Trophies (Spell Power, Mana/s & Soulbinder)','85% Socket Gem · 185–225 Gold'],loreSecret:'Every skeletal minion destroyed below Depth 21 feeds half its marrow back to his staff.'},
  {key:'Void Sovereign',icon:'🌑',tier:'Boss',depths:'Depth 24+',difficulty:'Deadly',lore:'Ruler of the deep rift; heralds the Endless Abyss beyond Depth 30.',drops:['2–3 Boss Trophies (Endgame Rarity & Dodge/Crit bias)','85% Socket Gem · 200–240 Gold'],loreSecret:'Heralds the Endless Abyss where shattered Waystones bend time itself.'},
  {key:'The Abyssal Sovereign',icon:'👁️',tier:'Campaign Finale',depths:'Depth 30',difficulty:'Deadly',lore:'Final seal-keeper guarding the threshold into the Endless Abyss.',drops:['3 Guaranteed Depth 30+ Campaign Finale Trophies','100% Abyssal Fragments (+3 First Clear) + Endless Unlock'],loreSecret:'Thirty depths below daylight sits the final lock; breaking his blade tears open the Endless Abyss.'},
  {key:'Rift Guardian',icon:'🌀',tier:'Endgame Boss',depths:'Waystone Rifts',difficulty:'Deadly',lore:'Planar warden summoned by Waystone carnage.',drops:['3 Endgame Rift Trophies · +2 Abyssal Fragments','100% Socket Gem + Scaled Rift Gold & Waystone Rank'],loreSecret:'Every Waystone shard carries echoes of prior delvers until the Rift’s warden materializes.'},
  {key:'Uber Butcher',icon:'🔥',tier:'Pinnacle',depths:'Abyssal Altar',difficulty:'Deadly',lore:'Ascended Lord of Slaughter empowered by Abyssal Fragments.',drops:['3 Depth 32+ Pinnacle Trophies · +1 Abyssal Fragment','85% Socket Gem · 2.5× Pinnacle XP'],loreSecret:'Five Abyssal Fragments rekindle the Butcher’s furnace chains into living magma.'},
  {key:'Uber Abyssal Sovereign',icon:'👑',tier:'Pinnacle',depths:'Abyssal Altar',difficulty:'Deadly',lore:'Apex pinnacle entity of the deepest rift.',drops:['3 Depth 38+ Apex Trophies · +1 Abyssal Fragment','85% Socket Gem · 2.5× Pinnacle XP'],loreSecret:'Only delvers bearing ten Abyssal Fragments witness the Sovereign’s true unsealed form.'}
 ];

 let smokeBuffT=0,rogueCritBuffT=0,nightCloakT=0,iceArmorT=0,viperDodgeT=0,frostSetCd=0,pyroCastCount=0;
 let activeTabCodex='bestiary',codexOpen=false,enchanterOpen=false,meteorQueue=[],gambleSlot='any',selectedAspectIdx=0;
 let activeEnchantTab='forge';
 const selectedRerollTargets={},selectedGemTargets={};

 const style5=document.createElement('style');
 style5.textContent=`
 #goldHud{color:#ffd86b!important;font-weight:700;font-variant-numeric:tabular-nums;padding:0 4px}
 .dod5-modal{position:fixed;z-index:190;inset:50% auto auto 50%;transform:translate(-50%,-50%);display:none;width:min(920px,95vw);max-height:88vh;overflow:auto;padding:20px;border:1px solid #8a6d45;border-radius:3px;background:#0f0c0e;box-shadow:0 12px 32px #000d;color:#f2e7cf;font:13px system-ui}
 .dod5-head{display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #3c2f27;padding-bottom:11px;margin-bottom:13px;flex-wrap:wrap}
 .dod5-head h2{margin:0;font:25px Georgia,serif;color:#ead08b}
 .dod5-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:13px}
 .dod5-tabs button{padding:8px 14px;border:1px solid #4a3a2d;border-radius:3px;background:#161113;color:#bfb097;cursor:pointer;font-weight:600}
 .dod5-tabs button.active{border-color:#c9a24a;background:#2c1f19;color:#f5e3b8}
 .dod5-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:9px}
 .dod5-card{padding:11px;border:1px solid #4a3a2d;border-radius:3px;background:#161113}
 .dod5-card b{color:#ead08b;font-size:13px;display:block}
 .dod5-card small{color:#bfb097;display:block;margin-top:4px;line-height:1.4}
 .dod5-badge{display:inline-block;padding:1px 6px;border-radius:2px;font-size:10px;font-weight:700;letter-spacing:.03em;margin-left:5px;border:1px solid currentColor;vertical-align:middle}
 .dod5-bar{height:5px;background:#0b090a;border:1px solid #3c2f27;border-radius:2px;overflow:hidden;margin-top:5px}
 .dod5-bar i{display:block;height:100%;background:linear-gradient(90deg,#9c7532,#ffd86b)}
 .dod5-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px;border:1px solid #4a3a2d;border-radius:3px;background:#161113;margin-bottom:8px;flex-wrap:wrap}
 .dod5-btn{padding:6px 10px;border:1px solid #594635;border-radius:3px;background:#1e1614;color:#f2e7cf;cursor:pointer;font-weight:600;white-space:nowrap;font-size:12px}
 .dod5-btn:hover:not(:disabled){border-color:#c9a24a;background:#2c1f19;color:#f5e3b8}
 .dod5-btn:disabled{opacity:.42;cursor:not-allowed}
 .dod5-sel{padding:6px 8px;background:#0b090a;color:#f2e7cf;border:1px solid #594635;border-radius:3px;font-size:12px;max-width:220px}
 .dod5-mats{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:12px;font-variant-numeric:tabular-nums}
 .dod5-mats span{padding:3px 8px;border:1px solid #3c2f27;border-radius:3px;background:#161113}
 body:not(.hud-layout-editing) :is(#codexPanel,#enchanterPanel){zoom:var(--dod-ui-scale,1)}
 `;
 document.head.appendChild(style5);

 const topBar=document.getElementById('top');
 const goldHud=document.createElement('span');
 goldHud.id='goldHud';
 const paintGoldHud=()=>{goldHud.textContent='🪙 '+gold.toLocaleString()+'g'};
 paintGoldHud();

 const codexBtn=document.createElement('button');
 codexBtn.id='codexBtn';
 codexBtn.textContent='Codex';
 codexBtn.title='Open Bestiary, Lore Tomes, Sets & Aspects (B)';

 const enchantBtn=document.createElement('button');
 enchantBtn.id='enchantBtn';
 enchantBtn.textContent='Atelier';
 enchantBtn.title='Crafting Atelier: Reforge, Masterwork, Gems & Gambling (O)';

 if(topBar){
  topBar.append(goldHud,enchantBtn,codexBtn);
 }

 const codexModal=document.createElement('section');
 codexModal.id='codexPanel';
 codexModal.className='dod5-modal';
 document.body.appendChild(codexModal);

 const enchantModal=document.createElement('section');
 enchantModal.id='enchanterPanel';
 enchantModal.className='dod5-modal';
 document.body.appendChild(enchantModal);

 const closeCodex=()=>{codexOpen=false;codexModal.style.display='none'};
 const closeEnchant=()=>{enchanterOpen=false;enchantModal.style.display='none'};

 const renderCodex=()=>{
  const loreAll=window.dodLore?.all||[];
  const loreFound=new Set((window.dodLore?.getDiscovered?.()||[]).map(x=>x.id));
  const eqAndBag=[...(P?.eq||[]).filter(Boolean),...(P?.inv||[])];
  const ownedIds=new Set(eqAndBag.map(x=>x.id).filter(Boolean));
  const eqIds=new Set((P?.eq||[]).filter(Boolean).map(x=>x.id).filter(Boolean));
  const sets=getSetCounts();
  let body='';
  if(activeTabCodex==='bestiary'){
   const totalKills=Object.values(bestiary).reduce((a,b)=>a+(+b||0),0);
   let title='';try{title=(localStorage.getItem('dodSlayerTitleV1')||'').trim().slice(0,40)}catch(e){}
   const diffColor={Easy:'#79e394',Moderate:'#f0b85b',Deadly:'#f07570'};
   body=`<p style="color:#c9b99e;margin:0 0 10px">Total recorded kills in this Bestiary: <b style="color:#ffd86b">${totalKills}</b>${title?` · Active Title: <b style="color:#ead08b">${esc(title)}</b>`:''}</p><div class="dod5-grid">${BESTIARY_ENTRIES.map(m=>{
    const kills=Number(bestiary[m.key])||0;
    const seen=kills>0;
    const dc=diffColor[m.difficulty]||'#bfb097';
    let msHtml='';
    if(m.milestones?.length){
     const unlocked=m.milestones.filter(x=>kills>=x.threshold);
     const next=m.milestones.find(x=>kills<x.threshold)||null;
     const topUnlocked=unlocked[unlocked.length-1]||null;
     const pct=next?Math.min(100,Math.round((kills/next.threshold)*100)):100;
     msHtml=`<div style="margin-top:6px;padding-top:5px;border-top:1px solid #2e241f"><div style="display:flex;justify-content:space-between;font-size:10px;color:#c9b99e"><span>${next?`Next: ${esc(next.title)}`:'All 4 Milestones Complete'}</span><span style="font-variant-numeric:tabular-nums">${next?`${kills}/${next.threshold}`:`${kills}/1000+`}</span></div><div class="dod5-bar"><i style="width:${pct}%"></i></div>${topUnlocked?`<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-top:5px"><span style="font-size:10px;color:#ffd86b">Title: ${esc(topUnlocked.title)}</span><button class="dod5-btn" style="padding:2px 6px;font-size:10px" data-codex-equip-title="${esc(topUnlocked.title)}">${title===topUnlocked.title?'Equipped ✓':'Equip Title'}</button></div><small style="color:#d6c6aa">${esc(topUnlocked.loreSnippet)}</small>`:''}</div>`;
    }else if(seen&&m.drops?.length){
     msHtml=`<div style="margin-top:6px;padding-top:5px;border-top:1px solid #2e241f"><small style="color:#ffd86b">Drops: ${m.drops.map(esc).join(' · ')}</small>${m.loreSecret?`<small style="color:#d6c6aa;font-style:italic">${esc(m.loreSecret)}</small>`:''}</div>`;
    }
    return `<article class="dod5-card" style="border-color:${seen?'#8a6d45':'#3c2f27'}"><b>${m.icon} ${esc(m.key)} <span class="dod5-badge" style="color:${dc}">${m.difficulty}</span><span style="float:right;color:${seen?'#8ce09b':'#9e8f7a'}">${seen?kills+' slain':'Undiscovered'}</span></b><small>${m.tier} · ${m.depths}</small><small>${seen?esc(m.lore):'Defeat this foe in the depths to record its entry.'}</small>${msHtml}</article>`;
   }).join('')}</div>`;
  }else if(activeTabCodex==='lore'){
   body=`<p style="color:#bfb097;margin:0 0 10px">Discovered Lore Tomes: <b style="color:#ead08b">${loreFound.size}/${loreAll.length}</b></p><div class="dod5-grid">${loreAll.map(l=>{
    const got=loreFound.has(l.id);
    return `<article class="dod5-card" style="border-color:${got?'#8a6d45':'#3c2f27'}"><b>${got?'📜 '+esc(l.title):'🔒 Sealed Tome'}</b><small>${got?esc(l.text):'Explore dungeon chambers to recover this chronicle.'}</small></article>`;
   }).join('')}</div>`;
  }else if(activeTabCodex==='aspects'){
   const list=Array.isArray(dodAspects)?dodAspects:[];
   body=`<p style="color:#bfb097;margin:0 0 10px">Salvaging Legendary or Mythic items extracts their power into your Codex for Imprinting onto Epic gear at the Crafting Atelier.</p><div class="dod5-grid">${list.length?list.map(a=>`<article class="dod5-card" style="border-color:#8a6d45"><b>✦ ${esc(a.name)}</b><small>${esc(a.power)}</small></article>`).join(''):'<p style="color:#9e8f7a">No Aspects extracted yet. Salvage any Legendary item at the Atelier or Forge.</p>'}</div>`;
  }else{
   body=`<h3 style="color:#ead08b;font:18px Georgia,serif;margin:0 0 8px">Armor & Relic Sets</h3><div class="dod5-grid" style="margin-bottom:14px">${sets.map(s=>`<article class="dod5-card" style="border-color:${s.color}"><b>${esc(s.name)} (${s.count}/3)</b><small>${s.ids.map(id=>{const it=LEGENDARIES.find(x=>x.id===id);return `<span style="color:${eqIds.has(id)?'#84e89a':ownedIds.has(id)?'#e8c97e':'#9e8f7a'}">${eqIds.has(id)?'✓':ownedIds.has(id)?'●':'○'} ${esc(it?.n||id)}</span>`}).join('<br>')}</small><small style="color:${s.count>=2?'#8ce09b':'#bfb097'}"><b>2-Piece:</b> ${esc(s.twoDesc)}</small><small style="color:${s.count>=3?'#ffd86b':'#bfb097'}"><b>3-Piece:</b> ${esc(s.threeDesc)}</small></article>`).join('')}</div><h3 style="color:#ead08b;font:18px Georgia,serif;margin:0 0 8px">Known Relics & Legendaries</h3><div class="dod5-grid">${LEGENDARIES.map(l=>{
    const eq=eqIds.has(l.id),own=ownedIds.has(l.id);
    return `<article class="dod5-card" style="border-color:${eq?'#5d9968':own?'#a67238':'#3c2f27'}"><b>${l.icon||'✨'} ${esc(l.n)}</b><small style="color:${eq?'#8ce09b':own?'#f2c572':'#9e8f7a'}">${eq?'Equipped':own?'In Backpack':'Not yet found'}</small><small>${esc(l.power||l.desc||'')}</small></article>`;
   }).join('')}</div>`;
  }
  codexModal.innerHTML=`<div class="dod5-head"><h2>Codex</h2><button class="dod5-btn" data-codex-close>✕</button></div><div class="dod5-tabs"><button data-codex-tab="bestiary" class="${activeTabCodex==='bestiary'?'active':''}">Bestiary</button><button data-codex-tab="lore" class="${activeTabCodex==='lore'?'active':''}">Lore (${loreFound.size}/${loreAll.length})</button><button data-codex-tab="sets" class="${activeTabCodex==='sets'?'active':''}">Sets & Relics</button><button data-codex-tab="aspects" class="${activeTabCodex==='aspects'?'active':''}">Aspects (${(dodAspects||[]).length})</button></div>${body}`;
 };

 const openCodex=()=>{closeEnchant();codexOpen=true;renderCodex();codexModal.style.display='block'};
 codexBtn.onclick=()=>codexOpen?closeCodex():openCodex();
 codexModal.addEventListener('click',e=>{
  const equipTitleBtn=e.target.closest('[data-codex-equip-title]');
  if(equipTitleBtn){
   const next=equipTitleBtn.dataset.codexEquipTitle||'';
   let cur='';try{cur=(localStorage.getItem('dodSlayerTitleV1')||'').trim()}catch(err){}
   const applied=cur===next?'':next;
   try{if(applied)localStorage.setItem('dodSlayerTitleV1',applied);else localStorage.removeItem('dodSlayerTitleV1')}catch(err){}
   if(window.parent&&window.parent!==window){try{window.parent.postMessage({type:'dod:slayer-title-changed',title:applied},window.location.origin)}catch(err){}}
   if($('inv')?.style.display==='block')renderInv();
   renderCodex();
   banner(applied?`Title Equipped: ${applied}`:'Slayer Title Unequipped');
   return;
  }
  const t=e.target.closest('[data-codex-tab]');if(t){activeTabCodex=t.dataset.codexTab;renderCodex();return}
  if(e.target.closest('[data-codex-close]'))closeCodex();
 });

 const readForgeMeta=()=>{try{return JSON.parse(localStorage.getItem('dod3meta')||'{}')}catch(e){return {}}};
 const getForgeMats=()=>{const m=readForgeMeta();return {scrap:Number(window.dodSanctuary?.meta?.scrap??m.scrap)||0,essence:Number(window.dodSanctuary?.meta?.essence??m.essence)||0}};
 const spendForgeMats=(scrapCost=0,essenceCost=0)=>{
  const m=readForgeMeta();
  const curS=Number(window.dodSanctuary?.meta?.scrap??m.scrap)||0;
  const curE=Number(window.dodSanctuary?.meta?.essence??m.essence)||0;
  if(curS<scrapCost||curE<essenceCost)return false;
  m.scrap=curS-scrapCost;m.essence=curE-essenceCost;
  m.crafted=(+m.crafted||0)+1;
  try{localStorage.setItem('dod3meta',JSON.stringify(m))}catch(e){}
  if(window.dodSanctuary?.meta){window.dodSanctuary.meta.scrap=m.scrap;window.dodSanctuary.meta.essence=m.essence;window.dodSanctuary.meta.crafted=m.crafted}
  return true;
 };

 const BONUS_POOL=['crit','critDmg','haste','cdr','leech','dodge','sp','mregen','bleed'];
 const rollEnchanterStat=(it,replaceKey=null)=>{
  const r=Math.max(1,+it.r||1),lv=Math.max(1,+it.itemLevel||P.lv||1);
  if(!it.st)it.st={};
  if(replaceKey&&replaceKey!=='__add__'&&it.st[replaceKey]!==undefined){delete it.st[replaceKey]}
  const pool=BONUS_POOL.filter(k=>it.st[k]===undefined&&k!==replaceKey);
  const fallback=BONUS_POOL.filter(k=>k!==replaceKey);
  const stat=pool.length?pool[RI(0,pool.length-1)]:(fallback.length?fallback[RI(0,fallback.length-1)]:BONUS_POOL[0]);
  if(stat==='crit')it.st.crit=+(R(.7,1.4)+r*.45).toFixed(1);
  else if(stat==='critDmg')it.st.critDmg=Math.round(R(6,13)+r*4);
  else if(stat==='haste')it.st.haste=+(R(1.5,3.5)+r*1.1).toFixed(1);
  else if(stat==='cdr')it.st.cdr=+(R(1.5,3.5)+r*1.0).toFixed(1);
  else if(stat==='leech')it.st.leech=+(R(.5,1.4)+r*.45).toFixed(2);
  else if(stat==='dodge')it.st.dodge=+(R(.6,1.6)+r*.5).toFixed(1);
  else if(stat==='sp')it.st.sp=Math.round(4+lv*.5+r*3);
  else if(stat==='mregen')it.st.mregen=+(R(1.2,2.8)+r*.8).toFixed(1);
  else if(stat==='bleed')it.st.bleed=Math.round(6+r*4);
  return stat;
 };

 const socketCapFor=(it)=>[0,1,2,5].includes(it.s)?2:1;

 const renderEnchanter=()=>{
  const items=[...(P?.eq||[]).map((it,idx)=>it?{it,loc:'Equipped',idx}:null).filter(Boolean),...(P?.inv||[]).map((it,idx)=>it?{it,loc:'Backpack',idx}:null).filter(Boolean)];
  const ownedGems=Object.keys(GEMS).filter(k=>(dodGems[k]||0)>0);
  const mats=getForgeMats();
  const actsCleared=window.dodProgressionV2?.state?.actsCleared||{},campaignDone=Boolean(window.dodProgressionV2?.state?.campaignComplete);
  const canGems=best>=7||Boolean(actsCleared.act1)||campaignDone;
  const canAspects=best>=LEGENDARY_DEPTH||Boolean(actsCleared.act2)||campaignDone;
  const canCorrupt=best>=22||Boolean(actsCleared.act3)||campaignDone;
  const canAscendMythic=canCorrupt;
  const aspectOpts=(dodAspects||[]).map((a,i)=>`<option value="${i}" ${selectedAspectIdx===i?'selected':''}>${esc(a.name)}</option>`).join('');

  const itemSummary=(it,loc)=>{
   const rarityColor=(RAR[it.r]||RAR[0])[1];
   const rank=+it.enchantRank||0;
   const lock=!!it.corrupted;
   const statLine=Object.entries(it.st||{}).filter(([k])=>k!=='dMin'&&k!=='dMax').map(([k,v])=>`+${v}${PC[k]?'%':''} ${SN[k]||k}`).join(' · ')||(it.st?.dMin?`${it.st.dMin}–${it.st.dMax} Dmg`:'Base gear');
   return `<div style="min-width:min(240px,100%);flex:1"><b style="color:${rarityColor}"><span class="small-portrait">${lootIcon(it)}</span> ${esc(it.n)}${rank?` (+${rank})`:''}${it.locked?' 🔒':''}${lock?' · CORRUPTED':''}</b><div style="font-size:11px;color:#b2a18a">${loc} · ${SL[it.s]||'Gear'} · iLvl ${it.itemLevel||1}${loc==='Backpack'?` · ${itemPowerDelta(it)}`:''}</div><div style="font-size:11px;color:#d6c6aa;margin-top:2px">${statLine}</div>${it.mythicImplicit?`<div style="font-size:11px;color:#e2a8ff;margin-top:2px">✦ ${esc(it.mythicImplicit)}</div>`:''}${socketList(it)}</div>`;
  };

  let tabBody='';
  if(activeEnchantTab==='forge'){
   const rows=items.map(({it,loc,idx})=>{
    const key=`${loc}:${idx}`;
    const lock=!!it.corrupted;
    const rerollCost=45+(+it.r||0)*15;
    const rank=+it.enchantRank||0;
    const isMasterwork=rank>=10&&rank<12;
    const empGold=isMasterwork?(220+(rank-10)*80):(55+rank*35);
    const empEss=isMasterwork?3:0;
    const empScrap=isMasterwork?6:0;
    const canEmp=!lock&&rank<12&&gold>=empGold&&mats.essence>=empEss&&mats.scrap>=empScrap;
    const rerollKeys=Object.keys(it.st||{}).filter(k=>k!=='dMin'&&k!=='dMax');
    const chosenTarget=selectedRerollTargets[key]&&(selectedRerollTargets[key]==='__add__'||rerollKeys.includes(selectedRerollTargets[key]))?selectedRerollTargets[key]:(rerollKeys[0]||'__add__');
    const targetOpts=[...rerollKeys.map(k=>`<option value="${k}" ${chosenTarget===k?'selected':''}>Replace +${it.st[k]}${PC[k]?'%':''} ${esc(SN[k]||k)}</option>`),...(rerollKeys.length<6?[`<option value="__add__" ${chosenTarget==='__add__'?'selected':''}>Add Random Bonus Stat</option>`]:[])].join('');
    const ascendBtn=(!lock&&it.r===3)?`<button class="dod5-btn" style="border-color:#d67bff88;color:#e9beff" data-ascend="${key}" ${!canAscendMythic||gold<150||dodAbyssFragments<3||mats.essence<5?'disabled':''}>${canAscendMythic?'Ascend Mythic (150g · 3 Frag · 5 Ess)':'🔒 Ascend (Act IV)'}</button>`:'';
    return `<div class="dod5-row" data-enchanter-item="${key}" tabindex="-1">${itemSummary(it,loc)}<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;align-items:center"><select class="dod5-sel" data-reroll-key="${key}" aria-label="Target stat to reforge" ${lock?'disabled':''}>${targetOpts}</select><button class="dod5-btn" data-reforge="${key}" ${lock||gold<rerollCost?'disabled':''}>Reforge (${rerollCost}g)</button><button class="dod5-btn" data-empower="${key}" ${!canEmp?'disabled':''}>${rank>=12?'Masterwork +12':isMasterwork?`Masterwork +${rank+1} (${empGold}g · 3E · 6S)`:`Empower +${rank+1} (${empGold}g)`}</button>${ascendBtn}</div></div>`;
   }).join('')||'<p style="color:#aa9a84">No gear equipped or in backpack.</p>';
   tabBody=`<p style="color:#bfb097;margin:0 0 10px">Select any existing affix to Reforge it, Empower gear up to +10 (Masterwork +11/+12 with Essence &amp; Salvage), or Ascend Legendaries into Mythic tier in Act IV.</p>${rows}`;
  }else if(activeEnchantTab==='gems'){
   const gemGateBanner=!canGems?'<div class="dod5-row" style="border-color:#8a6d45;background:#1a1316"><div><b style="color:#ead08b">🔒 Atelier Socketing Unlocks in Act II</b><div style="font-size:11px;color:#bfb097">Defeat the Blood Witch at Depth 6 or reach Depth 7 to unlock Gem Transmutation &amp; Socketing.</div></div></div>':'';
   const transCards=GEM_FAMILIES.map(fam=>{
    const [t1,t2,t3]=fam.tiers;
    const c1=dodGems[t1.id]||0,c2=dodGems[t2.id]||0,c3=dodGems[t3.id]||0;
    return `<article class="dod5-card" style="border-color:${fam.color}66"><b>${gemIcon(GEMS[t1.id])} ${fam.baseName} Family</b><small>Tier I Flawed: <b>${c1}</b> · Tier II Radiant: <b style="color:#ffd86b">${c2}</b> · Tier III Abyssal: <b style="color:#e29dff">${c3}</b></small><div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:8px"><button class="dod5-btn" data-gem-craft="${fam.family}:2" ${!canGems||c1<3||gold<40?'disabled':''}>3 Flawed → Radiant (40g)</button><button class="dod5-btn" data-gem-craft="${fam.family}:3" ${!canGems||c2<3||gold<120||mats.essence<2?'disabled':''}>3 Radiant → Abyssal (120g · 2E)</button></div></article>`;
   }).join('');
   const rows=items.map(({it,loc,idx})=>{
    const key=`${loc}:${idx}`;
    const lock=!!it.corrupted;
    const cap=socketCapFor(it),maxS=it.maxSockets||0,usedS=(it.sockets||[]).length;
    const addGold=maxS===0?80:150,addScrap=maxS===0?6:0,addEss=maxS===0?0:3;
    const canAdd=canGems&&!lock&&maxS<cap&&gold>=addGold&&mats.scrap>=addScrap&&mats.essence>=addEss;
    const addBtn=(!lock&&maxS<cap)?`<button class="dod5-btn" data-addsocket="${key}" ${!canAdd?'disabled':''}>${canGems?`+Socket ${maxS+1}/${cap} (${addGold}g${addScrap?` · ${addScrap}S`:''}${addEss?` · ${addEss}E`:''})`:'🔒 Socket (Act II)'}</button>`:'';
    const pickedGem=(selectedGemTargets[key]&&ownedGems.includes(selectedGemTargets[key]))?selectedGemTargets[key]:(ownedGems[0]||'');
    const sockCtrl=(!lock&&usedS<maxS&&ownedGems.length)?`<select class="dod5-sel" data-gem-pick="${key}" aria-label="Select gem to socket" ${!canGems?'disabled':''}>${ownedGems.map(gk=>`<option value="${gk}" ${pickedGem===gk?'selected':''}>${esc(GEMS[gk].n)} (×${dodGems[gk]}) · ${esc(gemBonusText(GEMS[gk]))}</option>`).join('')}</select><button class="dod5-btn" data-socket-pick="${key}" ${!canGems||gold<35?'disabled':''}>Socket (35g)</button>`:'';
    const unsockBtns=(!lock&&usedS>0)?(it.sockets||[]).map((gid,si)=>`<button class="dod5-btn" data-unsocket="${key}:${si}" ${gold<25?'disabled':''}>Unsocket ${esc(GEMS[gid]?.n||'Gem')} (25g)</button>`).join(''):'';
    return `<div class="dod5-row" data-enchanter-item="${key}" tabindex="-1">${itemSummary(it,loc)}<div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;align-items:center">${addBtn}${sockCtrl}${unsockBtns}${usedS>=maxS&&maxS>=cap&&!unsockBtns?'<span style="font-size:11px;color:#9e8f7a">Sockets max</span>':''}</div></div>`;
   }).join('')||'<p style="color:#aa9a84">No gear equipped or in backpack.</p>';
   tabBody=`${gemGateBanner}<h3 style="color:#ead08b;font:16px Georgia,serif;margin:0 0 8px">Gem Transmutation (3 → 1)</h3><div class="dod5-grid" style="margin-bottom:14px">${transCards}</div><h3 style="color:#ead08b;font:16px Georgia,serif;margin:0 0 8px">Gear Sockets (Weapons/Armor up to 2 · Jewelry/Gloves/Boots 1)</h3>${rows}`;
  }else if(activeEnchantTab==='aspects'){
   const aspectBar=`<div class="dod5-row" style="background:#0b090a"><div><b style="color:#9fc9e8">${canAspects?'':'🔒 '}Codex Aspect Imprinting (${(dodAspects||[]).length} extracted)</b><div style="font-size:11px;color:#bfb097">${canAspects?`Imprint any extracted Aspect onto an Epic item to elevate it to Legendary (110g).`:`Unlocks at Depth ${LEGENDARY_DEPTH} or after clearing Act II (Abyssal Dragon).`}</div></div>${(dodAspects||[]).length?`<select class="dod5-sel" data-aspect-pick aria-label="Aspect to imprint" ${!canAspects?'disabled':''}>${aspectOpts}</select>`:'<span style="font-size:11px;color:#9e8f7a">Salvage Legendaries to extract Aspects</span>'}</div>`;
   const corruptOdds=`<div class="dod5-row" style="border-color:#7852a5;background:#161019"><div><b style="color:#d67bff">${canCorrupt?'🩸 ':'🔒 '}Abyssal Corrupt (${canCorrupt?'150g · Permanent Lock':'Unlocks in Act IV · Depth 22+ or Act III Clear'})</b><div style="font-size:11px;color:#bfb097">Explicit Odds: <b>35%</b> +1 Socket (up to 3 on Weapons/Armor) · <b>37%</b> +2% Crit &amp; +14% Crit Dmg · <b>28%</b> +18 HP &amp; Volatile Stat</div></div></div>`;
   const rows=items.filter(({it})=>it.r>=2).map(({it,loc,idx})=>{
    const key=`${loc}:${idx}`;
    const lock=!!it.corrupted;
    const imprintBtn=(!lock&&it.r===2&&!it.imprintedAspect&&(dodAspects||[]).length)?`<button class="dod5-btn" data-imprint="${key}" ${!canAspects||gold<110?'disabled':''}>${canAspects?'Imprint Aspect (110g)':'🔒 Imprint (Depth 12)'}</button>`:'';
    const corruptBtn=(!lock&&it.r>=2)?`<button class="dod5-btn" style="border-color:#9b5bd6" data-corrupt="${key}" ${!canCorrupt||gold<150?'disabled':''}>${canCorrupt?'Corrupt (150g)':'🔒 Corrupt (Act IV)'}</button>`:'';
    return `<div class="dod5-row" data-enchanter-item="${key}" tabindex="-1">${itemSummary(it,loc)}<div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end">${imprintBtn}${corruptBtn}${lock?'<span style="font-size:11px;color:#d67bff">Corrupted Lock</span>':''}</div></div>`;
   }).join('')||'<p style="color:#aa9a84">Equip or hold Epic, Legendary, or Mythic gear to Imprint or Corrupt.</p>';
   tabBody=`${aspectBar}${corruptOdds}${rows}`;
  }else{
   const bagRows=(P?.inv||[]).map((it,idx)=>it?`<div class="dod5-row">${itemSummary(it,'Backpack')}<button class="dod5-btn" data-enchant-salvage="${idx}" ${it.locked?'disabled':''}>${it.locked?'🔒 Locked':it.r>=3?'Salvage + Aspect':'Salvage'}</button></div>`:'').join('')||'<p style="color:#aa9a84">Backpack is empty.</p>';
   tabBody=`<div class="dod5-row" style="border-color:#8a6d45;background:#161113">
    <div><b style="color:#ead08b">Targeted Gambling (Depth ${fl})</b><div style="font-size:11px;color:#bfb097">Choose a slot to conjure Magic, Epic, or Legendary gear (140g; random 120g).</div></div>
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
     <select class="dod5-sel" data-gamble-slot aria-label="Target gamble slot"><option value="any" ${gambleSlot==='any'?'selected':''}>Any Slot (120g)</option>${SL.map((n,si)=>`<option value="${si}" ${gambleSlot===String(si)?'selected':''}>${n} (140g)</option>`).join('')}</select>
     <button class="dod5-btn" data-gamble ${gold<(gambleSlot==='any'?120:140)||(P?.inv?.length||0)>=24?'disabled':''}>Gamble</button>
    </div>
   </div>
   <div class="dod5-row" style="border-color:#68523d;background:#161113">
    <div><b style="color:#ead08b">Forge Craft</b><div style="font-size:11px;color:#bfb097">Spend 12 Salvage + 1 Essence to forge a boosted Depth ${fl} item.</div></div>
    <button class="dod5-btn" data-forge-craft ${mats.scrap<12||mats.essence<1||(P?.inv?.length||0)>=24?'disabled':''}>Craft (12S · 1E)</button>
   </div>
   <div class="dod5-row" style="background:#0b090a">
    <div><b style="color:#ead08b">Batch Salvage Unlocked Backpack Gear</b><div style="font-size:11px;color:#bfb097">Locked 🔒, Set, Unique, and Mythic items are protected during batch salvage.</div></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
     <button class="dod5-btn" data-atelier-batch="low">Salvage Common &amp; Magic</button>
     <button class="dod5-btn" data-atelier-batch="nonup">Salvage Non-Upgrades</button>
    </div>
   </div>
   <h3 style="color:#ead08b;font:16px Georgia,serif;margin:10px 0 8px">Backpack Salvage</h3>${bagRows}`;
  }

  enchantModal.innerHTML=`<div class="dod5-head"><h2>⚒ Crafting Atelier</h2><div class="dod5-mats"><span style="color:#ffd86b">🪙 ${gold.toLocaleString()}g</span><span>Salvage: <b>${mats.scrap}</b></span><span style="color:#86c5ff">Essence: <b>${mats.essence}</b></span><span style="color:#d67bff">Fragments: <b>${dodAbyssFragments}</b></span><button class="dod5-btn" data-enchant-close>✕</button></div></div>
  <nav class="dod5-tabs" aria-label="Atelier stations">
   <button data-enchant-tab="forge" class="${activeEnchantTab==='forge'?'active':''}">Forge &amp; Reforge</button>
   <button data-enchant-tab="gems" class="${activeEnchantTab==='gems'?'active':''}">${canGems?'':'🔒 '}Gems &amp; Sockets</button>
   <button data-enchant-tab="aspects" class="${activeEnchantTab==='aspects'?'active':''}">${canAspects?'':'🔒 '}Aspects &amp; Corrupt</button>
   <button data-enchant-tab="gamble" class="${activeEnchantTab==='gamble'?'active':''}">Gamble &amp; Salvage</button>
  </nav>
  <div style="margin-bottom:10px;padding:7px 9px;background:#0b090a;border:1px solid #3c2f27;border-radius:3px;font-size:11px;color:#b8aa93"><b>Gem pouch</b>${gemPouch()}</div>
  ${tabBody}`;
 };

 const openEnchant=(item)=>{
  closeCodex();
  if(item&&activeEnchantTab==='gamble')activeEnchantTab='forge';
  enchanterOpen=true;renderEnchanter();enchantModal.style.display='block';
  if(!item)return;
  const index=P.eq.indexOf(item),location=index>=0?'Equipped:'+index:'Backpack:'+P.inv.indexOf(item);
  const row=enchantModal.querySelector('[data-enchanter-item="'+location+'"]');
  if(row){row.scrollIntoView({block:'center'});row.focus({preventScroll:true})}
 };
 enchantBtn.onclick=()=>enchanterOpen?closeEnchant():openEnchant();
 enchantModal.addEventListener('change',e=>{
  if(e.target.matches('[data-gamble-slot]')){gambleSlot=e.target.value;renderEnchanter()}
  if(e.target.matches('[data-aspect-pick]')){selectedAspectIdx=+e.target.value||0}
  if(e.target.matches('[data-reroll-key]')){selectedRerollTargets[e.target.dataset.rerollKey]=e.target.value}
  if(e.target.matches('[data-gem-pick]')){selectedGemTargets[e.target.dataset.gemPick]=e.target.value}
 });
 enchantModal.addEventListener('click',e=>{
  if(e.target.closest('[data-enchant-close]')){closeEnchant();return}
  const tabBtn=e.target.closest('[data-enchant-tab]');
  if(tabBtn){activeEnchantTab=tabBtn.dataset.enchantTab;renderEnchanter();return}
  if(e.target.closest('[data-gamble]')){
   const cost=gambleSlot==='any'?120:140;
   if(gold<cost||(P?.inv?.length||0)>=24)return;
   gold-=cost;saveGold();paintGoldHud();
   const item=gambleSlot==='any'?mkItem(fl,.68):mkItem(fl,.72,{lootSlot:Number(gambleSlot),gamble:true});
   take({...item,keepRaw:true});
   snd(740,.22,'triangle',.07,220);
   banner('🎲 Conjured: '+item.n);
   renderEnchanter();return;
  }
  if(e.target.closest('[data-forge-craft]')){
   if((P?.inv?.length||0)>=24||!spendForgeMats(12,1))return;
   const item=mkItem(fl,.45);
   take({...item,keepRaw:true});
   snd(680,.2,'triangle',.07,200);
   banner('⚒ Forged: '+item.n);
   save();renderEnchanter();return;
  }
  const batchBtn=e.target.closest('[data-atelier-batch]');
  if(batchBtn){
   const mode=batchBtn.dataset.atelierBatch;
   const keep=[];let cnt=0,totS=0,totE=0,totG=0;
   for(const it of P.inv){
    const canMatch=mode==='low'?(it&&!it.locked&&!it.unique&&!it.mythic&&!it.set&&(it.r||0)<=1):(it&&!it.locked&&!it.unique&&!it.mythic&&!it.set&&!it.corrupted&&!it.imprintedAspect&&canEquipItem(it)&&P.eq[it.s]&&sc(it)<=sc(P.eq[it.s]));
    if(canMatch){const res=autoSalvageItem(it,true);cnt++;totS+=res.scrap;totE+=res.essence;totG+=res.gVal}
    else keep.push(it);
   }
   P.inv=keep;
   if(cnt){save();renderInv();renderEnchanter();banner(`Salvaged ${cnt} item${cnt===1?'':'s'} · +${totS}S${totE?` · +${totE}E`:''} · +${totG}g`)}
   else banner('No matching unlocked gear to salvage');
   return;
  }
  const ref=e.target.closest('[data-reforge]');
  if(ref){
   const key=ref.dataset.reforge,[loc,idxStr]=key.split(':'),idx=+idxStr;
   const it=loc==='Equipped'?P.eq[idx]:P.inv[idx];
   if(!it||it.corrupted)return;
   const cost=45+(+it.r||0)*15;
   if(gold<cost)return;
   const sel=enchantModal.querySelector(`[data-reroll-key="${key}"]`);
   const target=sel?sel.value:(selectedRerollTargets[key]||'__add__');
   gold-=cost;saveGold();paintGoldHud();
   const added=rollEnchanterStat(it,target);
   selectedRerollTargets[key]=added;
   save();renderInv();renderEnchanter();
   snd(640,.18,'sine',.06,180);
   banner('✨ Reforged '+(SN[added]||added)+' onto '+it.n);
   return;
  }
  const emp=e.target.closest('[data-empower]');
  if(emp){
   const [loc,idxStr]=emp.dataset.empower.split(':'),idx=+idxStr;
   const it=loc==='Equipped'?P.eq[idx]:P.inv[idx];
   if(!it||it.corrupted)return;
   const rank=+it.enchantRank||0;
   if(rank>=12)return;
   const isMW=rank>=10,cost=isMW?(220+(rank-10)*80):(55+rank*35),reqEss=isMW?3:0,reqScrap=isMW?6:0;
   if(gold<cost)return;
   if((reqEss||reqScrap)&&!spendForgeMats(reqScrap,reqEss))return;
   gold-=cost;saveGold();paintGoldHud();
   it.enchantRank=rank+1;
   if(!it.st)it.st={};
   const mult=isMW?1.5:1;
   if(it.s===0||it.offhandType==='weapon'){
    it.st.dMin=(it.st.dMin||4)+Math.round(2*mult);it.st.dMax=(it.st.dMax||7)+Math.round(3*mult);
    if(it.weaponClass==='pyromancer'||it.weaponType==='Staff'||it.st.sp)it.st.sp=(it.st.sp||0)+Math.round(4*mult);
   }else if(it.s===3||it.s===4){
    it.st.crit=+(Number(it.st.crit||0)+1.2*mult).toFixed(1);
    it.st.critDmg=Number(it.st.critDmg||0)+Math.round(8*mult);
   }else{
    it.st.a=(it.st.a||0)+Math.round(4*mult);
    it.st.sta=(it.st.sta||0)+Math.round(2*mult);
   }
   save();renderInv();renderEnchanter();
   snd(isMW?880:780,.24,'triangle',.07,260);
   banner((isMW?'🔨 Masterworked ':'✨ Empowered ')+it.n+' (+'+it.enchantRank+')');
   return;
  }
  const asc=e.target.closest('[data-ascend]');
  if(asc){
   const [loc,idxStr]=asc.dataset.ascend.split(':'),idx=+idxStr;
   const it=loc==='Equipped'?P.eq[idx]:P.inv[idx];
   const canAscend=best>=22||Boolean(window.dodProgressionV2?.state?.actsCleared?.act3)||Boolean(window.dodProgressionV2?.state?.campaignComplete);
   if(!it||it.corrupted||it.r!==3||!canAscend||gold<150||dodAbyssFragments<3||!spendForgeMats(0,5))return;
   gold-=150;dodAbyssFragments-=3;saveGold();paintGoldHud();
   const myth=makeMythic(it,Math.max(Number(it.itemLevel)||1,lootItemLevel()));
   if(it.enchantRank)myth.enchantRank=it.enchantRank;
   if(it.forgeRank)myth.forgeRank=it.forgeRank;
   if(it.locked)myth.locked=true;
   if(it.imprintedAspect)myth.imprintedAspect=it.imprintedAspect;
   if(it.butcherTrait)myth.butcherTrait=it.butcherTrait;
   if(it.butcherPower)myth.butcherPower=it.butcherPower;
   if(loc==='Equipped')P.eq[idx]=myth;else P.inv[idx]=myth;
   save();renderInv();renderEnchanter();
   snd(940,.35,'triangle',.08,340);
   banner('✦ ASCENDED TO MYTHIC: '+myth.n);
   return;
  }
  const canGemsClick=best>=7||Boolean(window.dodProgressionV2?.state?.actsCleared?.act1)||Boolean(window.dodProgressionV2?.state?.campaignComplete);
  const canAspectsClick=best>=LEGENDARY_DEPTH||Boolean(window.dodProgressionV2?.state?.actsCleared?.act2)||Boolean(window.dodProgressionV2?.state?.campaignComplete);
  const canCorruptClick=best>=22||Boolean(window.dodProgressionV2?.state?.actsCleared?.act3)||Boolean(window.dodProgressionV2?.state?.campaignComplete);
  const gemCraft=e.target.closest('[data-gem-craft]');
  if(gemCraft){
   if(!canGemsClick){banner('Gem Transmutation unlocks in Act II (Depth 7 or Blood Witch)');return}
   const [famId,tierStr]=gemCraft.dataset.gemCraft.split(':'),targetTier=+tierStr;
   const fam=GEM_FAMILIES.find(f=>f.family===famId);
   if(!fam)return;
   if(targetTier===2){
    const src=fam.tiers[0].id,dst=fam.tiers[1].id;
    if((dodGems[src]||0)<3||gold<40)return;
    gold-=40;dodGems[src]-=3;dodGems[dst]=(dodGems[dst]||0)+1;
    saveGold();paintGoldHud();save();renderInv();renderEnchanter();
    snd(780,.2,'sine',.06,240);banner('💎 Transmuted Radiant '+fam.baseName);
   }else if(targetTier===3){
    const src=fam.tiers[1].id,dst=fam.tiers[2].id;
    if((dodGems[src]||0)<3||gold<120||!spendForgeMats(0,2))return;
    gold-=120;dodGems[src]-=3;dodGems[dst]=(dodGems[dst]||0)+1;
    saveGold();paintGoldHud();save();renderInv();renderEnchanter();
    snd(900,.25,'triangle',.07,300);banner('✦ Transmuted Abyssal '+fam.baseName);
   }
   return;
  }
  const addSoc=e.target.closest('[data-addsocket]');
  if(addSoc){
   if(!canGemsClick){banner('Adding sockets unlocks in Act II (Depth 7 or Blood Witch)');return}
   const [loc,idxStr]=addSoc.dataset.addsocket.split(':'),idx=+idxStr;
   const it=loc==='Equipped'?P.eq[idx]:P.inv[idx];
   if(!it||it.corrupted)return;
   const cap=socketCapFor(it),maxS=it.maxSockets||0;
   if(maxS>=cap)return;
   const addGold=maxS===0?80:150,addScrap=maxS===0?6:0,addEss=maxS===0?0:3;
   if(gold<addGold||!spendForgeMats(addScrap,addEss))return;
   gold-=addGold;saveGold();paintGoldHud();
   it.maxSockets=maxS+1;if(!Array.isArray(it.sockets))it.sockets=[];
   save();renderInv();renderEnchanter();
   snd(620,.18,'triangle',.06,160);banner('◆ Added Socket ('+it.maxSockets+'/'+cap+') to '+it.n);return;
  }
  const socPick=e.target.closest('[data-socket-pick]');
  if(socPick){
   if(!canGemsClick){banner('Socketing gems unlocks in Act II (Depth 7 or Blood Witch)');return}
   const key=socPick.dataset.socketPick,[loc,idxStr]=key.split(':'),idx=+idxStr;
   const it=loc==='Equipped'?P.eq[idx]:P.inv[idx];
   const sel=enchantModal.querySelector(`[data-gem-pick="${key}"]`);
   const gk=sel?sel.value:selectedGemTargets[key];
   if(!it||it.corrupted||gold<35||!gk||(dodGems[gk]||0)<1)return;
   if(!Array.isArray(it.sockets))it.sockets=[];
   if(it.sockets.length>=(it.maxSockets||0))return;
   gold-=35;saveGold();paintGoldHud();dodGems[gk]--;it.sockets.push(gk);
   save();renderInv();renderEnchanter();
   snd(720,.18,'sine',.06,200);banner('♦ Socketed '+GEMS[gk].n+' into '+it.n);return;
  }
  const unsoc=e.target.closest('[data-unsocket]');
  if(unsoc){
   const [loc,idxStr,siStr]=unsoc.dataset.unsocket.split(':'),idx=+idxStr,si=+siStr;
   const it=loc==='Equipped'?P.eq[idx]:P.inv[idx];
   if(!it||it.corrupted||gold<25||!Array.isArray(it.sockets)||si<0||si>=it.sockets.length)return;
   const gid=it.sockets.splice(si,1)[0];
   gold-=25;saveGold();paintGoldHud();
   if(gid)dodGems[gid]=(dodGems[gid]||0)+1;
   save();renderInv();renderEnchanter();
   snd(560,.16,'sine',.05,-140);banner('◇ Removed '+(GEMS[gid]?.n||'Gem')+' from '+it.n);return;
  }
  const imp=e.target.closest('[data-imprint]');
  if(imp){
   const [loc,idxStr]=imp.dataset.imprint.split(':'),idx=+idxStr;
   const it=loc==='Equipped'?P.eq[idx]:P.inv[idx];
   const asp=(dodAspects||[])[selectedAspectIdx]||(dodAspects||[])[0];
   if(!it||it.r!==2||it.imprintedAspect||it.corrupted||!asp||gold<110||!canAspectsClick)return;
   gold-=110;saveGold();paintGoldHud();it.imprintedAspect=asp.name;it.power=asp.power;it.aspectId=asp.id;it.r=3;it.unique=true;
   save();renderInv();renderEnchanter();
   snd(760,.22,'triangle',.07,220);banner('✦ Imprinted '+asp.name);return;
  }
  const cor=e.target.closest('[data-corrupt]');
  if(cor){
   if(!canCorruptClick){banner('Abyssal Corrupt unlocks in Act IV (Depth 22+ or Act III Clear)');return}
   const [loc,idxStr]=cor.dataset.corrupt.split(':'),idx=+idxStr;
   const it=loc==='Equipped'?P.eq[idx]:P.inv[idx];
   if(!it||it.corrupted||gold<150)return;
   gold-=150;saveGold();paintGoldHud();it.corrupted=true;if(!it.st)it.st={};
   const roll=Math.random();
   let outcome='';
   if(roll<0.35&&[0,1,2,5].includes(it.s)){it.maxSockets=Math.min(3,(it.maxSockets||0)+1);outcome='+1 Socket'}
   else if(roll<0.72){it.st.critDmg=(it.st.critDmg||0)+14;it.st.crit=+(Number(it.st.crit||0)+2).toFixed(1);outcome='+2% Crit & +14% Crit Dmg'}
   else{rollEnchanterStat(it,'__add__');it.st.h=(it.st.h||0)+18;outcome='Corrupted Implicit +18 HP & Volatile Mod'}
   save();renderInv();renderEnchanter();
   snd(140,.28,'sawtooth',.07,-40);banner('🩸 Corrupted '+it.n+': '+outcome);return;
  }
  const sal=e.target.closest('[data-enchant-salvage]');
  if(sal){
   const idx=+sal.dataset.enchantSalvage,it=P.inv[idx];
   if(!it||it.locked)return;
   P.inv.splice(idx,1);
   const hadAsp=it.r>=3&&it.power;
   const res=autoSalvageItem(it,true);
   save();renderInv();renderEnchanter();
   banner(`Salvaged ${it.n} (+${res.scrap}S${res.essence?` · +${res.essence}E`:''}${res.frags?' · +1 Frag':''} · +${res.gVal}g${hadAsp?' · Aspect checked':''})`);
  }
 });

 const sanctGrid=document.querySelector('#sanctuary .hubgrid');
 if(sanctGrid&&!sanctGrid.querySelector('[data-hub-extra]')){
  const card=document.createElement('article');
  card.className='hubcard';
  card.setAttribute('data-hub-extra','1');
  card.innerHTML='<h3>✨ Enchanter & Codex</h3><p>Upgrade gear, socket gems, or check sets and bestiary.</p><button type="button" data-sanct-enchant>Enchanter</button><button type="button" data-sanct-codex>Codex</button>';
  sanctGrid.appendChild(card);
  card.querySelector('[data-sanct-enchant]').onclick=()=>{window.dodSanctuary?.close?.();openEnchant()};
  card.querySelector('[data-sanct-codex]').onclick=()=>{window.dodSanctuary?.close?.();openCodex()};
 }

 const prevNormalize=normalizeLoadout;
 normalizeLoadout=function(){
  const cls=window.dodHeroClass||'warrior';
  if(cls==='warrior'){prevNormalize();return}
  const list=CLASS_SKILLS[cls]||CLASS_SKILLS.pyromancer;
  const cur=classLoadouts[cls]||[0,1,2,3];
  const seen=new Set(),unlocked=list.flatMap((skill,index)=>skill&&P.lv>=skill.unlock?[index]:[]);
  for(let i=0;i<4;i++){
   const saved=cur[i];
   const index=unlocked.includes(saved)&&!seen.has(saved)?saved:unlocked.find(idx=>!seen.has(idx));
   cur[i]=index??null;
   if(index!=null)seen.add(index);
  }
  classLoadouts[cls]=cur;
  abilityLoadout=[...cur];
 };

 const prevRenderSkills=renderSkillSlots;
 renderSkillSlots=function(){
  const cls=window.dodHeroClass||'warrior';
  if(cls==='warrior'){prevRenderSkills();return}
  normalizeLoadout();
  const list=CLASS_SKILLS[cls]||CLASS_SKILLS.pyromancer,slotCap=typeof activeSkillSlotCap==='function'?activeSkillSlotCap():4;
  SK.forEach((d,slot)=>{
   const idx=slot<4?abilityLoadout[slot]:POTION_CD;
   const a=slot<4?(idx!=null?list[idx]:null):POTION,key=slot<4?String(slot+1):'Q',locked=slot<4&&slot>=slotCap,reqLv=typeof slotUnlockLevel==='function'?slotUnlockLevel(slot):(slot<=0?1:slot===1?2:slot===2?4:7);
   d.dataset.ability=locked?'locked':slot<4?(a?a.id:'empty'):'potion';
   d.dataset.locked=locked?'1':'0';
   d.title=locked?`Skill Slot ${slot+1} unlocks at Level ${reqLv}`:slot<4?(a?`Press ${key} · ${a.n} · ${a.desc}`:`Slot ${slot+1} · Open Spell Book [K] to equip`):`Press Q · Health Potion · unlimited · 14s cooldown (Reserve Elixirs: ${elixirs} bypass cooldown)`;
   d.setAttribute('aria-label',d.title);
   d.removeAttribute('aria-pressed');
   d.innerHTML=`<small class="skillKey">${key}</small>${locked?'🔒':a?skillEmblem(a):'·'}<i></i>${locked?`<b class="potionCount" style="position:absolute;right:-3px;bottom:-3px;padding:1px 4px;border-radius:2px;background:#261f29;color:#e3c48d;border:1px solid #8a6d45;font:700 9px system-ui">Lv${reqLv}</b>`:slot===4?`<b class="potionCount" style="position:absolute;right:-4px;bottom:-4px;min-width:17px;padding:1px 4px;border-radius:2px;background:#c9a24a;color:#0f0c0e;border:1px solid #0f0c0e;font:700 10px system-ui">${elixirs>0?`∞+${elixirs}`:'∞'}</b>`:''}`;
   d.onclick=()=>locked?banner(`Skill Slot ${slot+1} unlocks at Level ${reqLv}`):slot<4?(abilityLoadout[slot]!=null?cast(abilityLoadout[slot]):banner('Open Spell Book (K) to assign a skill')):usePotion();
  });
 };

 const prevHud=hud;
 hud=function(){
  prevHud();
  const cls=window.dodHeroClass||'warrior',slotCap=typeof activeSkillSlotCap==='function'?activeSkillSlotCap():4;
  if(cls!=='warrior'){
   const list=CLASS_SKILLS[cls]||CLASS_SKILLS.pyromancer;
   for(let i=0;i<4;i++){
    const idx=abilityLoadout[i],d=SK[i],a=idx!=null?list[idx]:null,locked=i>=slotCap;
    if(!d)continue;
    const barEl=d.querySelector('i');
    if(!a||locked){if(barEl)barEl.style.setProperty('--c',0);d.style.opacity=locked?.36:.5;continue}
    const sm=spellMod(a.id,cls);
    const mpCost=Math.max(0,a.mp-(cls==='pyromancer'&&a.id==='pyroblast'&&sm.rune==='b'?6:0));
    const cdDenom=Math.max(.3,a.cd*sm.cdMult);
    if(barEl)barEl.style.setProperty('--c',Math.max(0,(CD[idx]||0)/cdDenom));
    d.style.opacity=P.mp<mpCost?.5:1;
   }
  }
 };

 const prevStats5=stats;
 stats=function(){
  const s=prevStats5();
  const cls=window.dodHeroClass||'warrior';
  if(cls==='pyromancer'){
   s.M+=15;s.mregen=Math.min(30,(s.mregen||0)+1.5);
   if((P.eq[2]?.id==='ember_vestments')&&P.mp>=s.M*.6)s.SP*=1.15;
  }else if(cls==='rogue'){
   s.C=Math.min(55,(s.C||0)+8);
   s.s=(s.s||0)+18;
   s.Haste=Math.min(180,(s.Haste||0)+12);
   s.dodge=Math.min(45,(s.dodge||0)+5);
  }
  if(rogueCritBuffT>0)s.C=Math.min(75,(s.C||0)+35);
  if(nightCloakT>0){s.dodge=Math.min(70,(s.dodge||0)+12);s.Haste=Math.min(200,(s.Haste||0)+15)}
  if(viperDodgeT>0){s.dodge=Math.min(70,(s.dodge||0)+10)}
  if(iceArmorT>0){s.a=(s.a||0)+28;s.dodge=Math.min(60,(s.dodge||0)+16)}
  if(smokeBuffT>0){
   s.dodge=Math.min(72,(s.dodge||0)+45);
   s.C=Math.min(70,(s.C||0)+25);
  }
  const sets=getSetCounts();
  for(const st of sets){
   if(st.id==='bloodforged'){
    if(st.count>=2){s.C=Math.min(70,(s.C||0)+8);s.bleed=Math.min(160,(s.bleed||0)+15)}
    if(st.count>=3){s.leech=Math.min(14,(s.leech||0)+4)}
   }else if(st.id==='frostwarden'){
    if(st.count>=2){s.a=(s.a||0)+14;s.dodge=Math.min(60,(s.dodge||0)+8)}
   }else if(st.id==='ashen_vanguard'){
    if(st.count>=2){s.critDmg=(s.critDmg||0)+25;s.Haste=Math.min(180,(s.Haste||0)+12)}
   }else if(st.id==='emberweaver'){
    if(st.count>=2){s.SP*=1.18;s.cdr=Math.min(60,(s.cdr||0)+10)}
   }else if(st.id==='nightstalker'){
    if(st.count>=2){s.dodge=Math.min(70,(s.dodge||0)+10);s.critDmg=(s.critDmg||0)+25}
   }
  }
  return s;
 };

 const prevSwing=swing;
 swing=function(S){
  const cls=window.dodHeroClass||'warrior';
  if(WW.active)return;
  P.primaryBeat=((P.primaryBeat||0)+1)%3;
  if(cls==='warrior'){prevSwing(S);return}
  P.an=1;P.ac++;
  const c=Math.cos(P.face),sn=Math.sin(P.face);
  if(cls==='pyromancer'){
   const py=window.dodProgression?.getClassTalents?.('pyromancer')?.pyromancy||{};
   P.at=.36/(1+S.Haste/100);
   const dmg=(weaponRoll(S)*.40+S.SP*.34+3)*(1+(py.emberbolt||0)*.06)*R(.92,1.08);
   const ignD=S.SP*.12*(1+(py.wildfire||0)*.12)*(P.eq[0]?.id==='pyre_wand'?1.35:1);
   PR.push({x:P.x+c*16,y:P.y+sn*16,vx:c*520,vy:sn*520,d:dmg,f:0,life:.95,r:6,aoe:P.primaryBeat===0?90:48,c:'#ff7e38',ignite:P.eq[0]?.id==='cinderstaff'||Math.random()<.45?ignD:0});
   snd(460,.11,'triangle',.045,-140);
  }else{
   P.at=.31/(1+S.Haste/100);
   const dmg=weaponRoll(S)*R(.84,1.04);
   const meleeHits=new Set();
   E.forEach(e=>{
    if(!e.dead&&D(P,e)<P.r+72+e.r&&hasSight(P,e)&&Math.abs(Math.atan2(Math.sin(Math.atan2(e.y-P.y,e.x-P.x)-P.face),Math.cos(Math.atan2(e.y-P.y,e.x-P.x)-P.face)))<1.15){
     hit(e,dmg);meleeHits.add(e);
    }
   });
   if(P.primaryBeat===0){
    const group={};for(const offset of [-.23,0,.23]){const a=P.face+offset;PR.push({x:P.x+c*14,y:P.y+sn*14,vx:Math.cos(a)*600,vy:Math.sin(a)*600,d:dmg*.62,f:0,life:.48,r:5,pierce:true,shotgunGroup:group,c:'#e3adff'})}
   }else if(meleeHits.size===0){
    PR.push({x:P.x+c*14,y:P.y+sn*14,vx:c*620,vy:sn*620,d:dmg*.9,f:0,life:.65,r:5,aoe:20,c:'#c28cff'});
   }
   combatEffect('slash',P.x,P.y,P.face);
   snd(320,.07,'sawtooth',.04,120);
  }
 };

 const tickApocalypse=(ca,S)=>{
  if(!ca?.apocalypse)return;
  pyroCastCount++;
  if(pyroCastCount>=4){
   pyroCastCount=0;
   for(const e of nearbySpellTargets(P,155))hit(e,S.SP*.85,{shock:4});
   ring(P.x,P.y,155,'#63d8ff');
  }
 };
 const prevCast5=cast;
 cast=function(i){
  const cls=window.dodHeroClass||'warrior';
  if(cls==='warrior'){prevCast5(i);return}
  const list=CLASS_SKILLS[cls]||CLASS_SKILLS.pyromancer;
  const a=list[i],slotIdx=abilityLoadout.indexOf(i),slotCap=typeof activeSkillSlotCap==='function'?activeSkillSlotCap():4;
  if(!a||P.dead||slotIdx<0||slotIdx>=slotCap||P.lv<(a.unlock||1)||CD[i]>0)return;
  const sm=spellMod(a.id,cls);
  const mpCost=Math.max(0,a.mp-(cls==='pyromancer'&&a.id==='pyroblast'&&sm.rune==='b'?6:0));
  if(P.mp<mpCost)return;
  const S=stats();
  let cdScale=.88*(1-S.cdr/100)*sm.cdMult,cdBase=a.cd;
  const ca=cls==='pyromancer'?(window.dodProgression?.getClassTalents?.('pyromancer')?.cataclysm||{}):null;
  if(cls==='pyromancer'){
   if(a.id==='icearmor')cdScale*=1-(ca.frost_shield||0)*.06;
   if(P.eq[8]?.id==='astral_orb'&&(a.id==='flamenova'||a.id==='meteor'))cdScale*=.8;
   if(a.id==='flamenova'&&sm.rune==='b')cdBase=Math.max(2,cdBase-1.2);
   if(a.id==='pyroblast'&&sm.rune==='b')cdBase=Math.max(2.2,cdBase-1.8);
  }else if(cls==='rogue'){
   if(a.id==='twinfang'&&sm.rune==='b')cdBase=Math.max(.8,cdBase-.5);
   if(a.id==='shadowstep'&&sm.rune==='a')cdBase=Math.max(1.5,cdBase-1.0);
   if(a.id==='caltrops'&&sm.rune==='b')cdBase=Math.max(2.5,cdBase-1.5);
   if(a.id==='bladeflurry'&&sm.rune==='b')cdBase=Math.max(2.2,cdBase-1.4);
  }
  P.mp-=mpCost;CD[i]=Math.max(.3,cdBase*cdScale);if(hasGearPower('frostfang_boots'))P.phaseStrideT=3.0;P.ac++;P.an=1;
  if(castAdvancedSpell(a.id,S)){if(cls==='pyromancer')tickApocalypse(ca,S);return}
  const c=Math.cos(P.face),sn=Math.sin(P.face);
  if(cls==='pyromancer'){
   const pt=window.dodProgression?.getClassTalents?.('pyromancer')||{};
   const py=pt.pyromancy||{};
   const ember3=getSetCounts().find(s=>s.id==='emberweaver')?.count>=3;
   const ignMult=(1+(py.wildfire||0)*.12)*(P.eq[0]?.id==='pyre_wand'?1.35:1)*(ember3?1.45:1);
   const ignDur=3.5+(py.wildfire||0)*.5;
   if(a.id==='fireball'){
    const dmg=(weaponRoll(S)*.95+S.SP*1.05)*(1+(py.emberbolt||0)*.06)*sm.dmgMult;
    const rad=78+(sm.rune==='b'?30:0),ign=S.SP*.24*ignMult*(sm.rune==='b'?1.3:1);
    PR.push({x:P.x+c*18,y:P.y+sn*18,vx:c*500,vy:sn*500,d:dmg,f:0,life:1.15,r:9,aoe:rad,c:'#ff5c24',ignite:ign});
    if(sm.rune==='a'){for(const off of [-.22,.22]){const a2=P.face+off;PR.push({x:P.x+Math.cos(a2)*16,y:P.y+Math.sin(a2)*16,vx:Math.cos(a2)*500,vy:Math.sin(a2)*500,d:dmg*.52,f:0,life:.95,r:6,aoe:44,c:'#ff8a42',ignite:ign*.55})}}
    snd(280,.18,'sawtooth',.06,-110);
   }else if(a.id==='flamenova'){
    const rad=155+(py.nova_reach||0)*14+(sm.rune==='b'?36:0);
    const dmg=(weaponRoll(S)*.8+S.SP*.95)*(1+(py.nova_reach||0)*.08)*sm.dmgMult;
    const targets=nearbySpellTargets(P,rad);
    const burning=targets.filter(e=>e.igniteT>0),ignition=S.SP*.26*ignMult;
    const spent=new Set(burning);
    targets.forEach(e=>{
      if(spent.has(e))e.igniteT=0;
      hit(e,dmg*(spent.has(e)?1.45:1),{ignite:spent.has(e)?0:ignition,shock:(!!py.solar_flare||sm.rune==='a')?3.5:0});
      if(py.wildfire&&!spent.has(e))e.igniteT=Math.max(e.igniteT||0,ignDur);
      const ang=Math.atan2(e.y-P.y,e.x-P.x),kb=sm.rune==='a'?38:22;mv(e,Math.cos(ang)*kb,Math.sin(ang)*kb);
    });
    spreadNovaFire(burning,dmg,ignition,targets);
    ring(P.x,P.y,rad,'#ff7730');burst(P.x,P.y,'#ff9442',34,260,.6,4);sh=Math.max(sh,6);
    snd(120,.26,'sawtooth',.08,-40);
   }else if(a.id==='blink'){
    const steps=14,dist=175;
    ring(P.x,P.y,44,'#a98cff');burst(P.x,P.y,'#c8b3ff',18,160,.4,3);
    for(let k=0;k<steps;k++)mv(P,c*(dist/steps),sn*(dist/steps));
    P.inv_t=Math.max(P.inv_t,.45);
    if(sm.rune==='a'){P.mp=Math.min(S.M,P.mp+8);for(let si=0;si<POTION_CD;si++)if(si!==i&&CD[si]>0)CD[si]=Math.max(0,CD[si]-1.0)}
    if(sm.rune==='b'){for(const q of nearbySpellTargets(P,115)){q.sl=Math.max(q.sl||0,2.8);hit(q,S.SP*.45*sm.dmgMult)}}
    ring(P.x,P.y,55,'#a98cff');burst(P.x,P.y,'#c8b3ff',20,180,.4,3);
    snd(660,.16,'sine',.06,240);
   }else if(a.id==='meteor'){
    const tx=P.x+c*150,ty=P.y+sn*150;
    const count=3+((ca.meteor_shower||0)>=5?1:0)+(sm.rune==='a'?2:0);
    for(let k=0;k<count;k++){
     meteorQueue.push({x:tx+R(-52,52),y:ty+R(-52,52),t:k*.18,d:(weaponRoll(S)*.85+S.SP*1.05)*(1+(ca.meteor_shower||0)*.08)*sm.dmgMult*(sm.rune==='b'?1.3:1),ignite:S.SP*.24*ignMult,stunExtra:sm.rune==='b'?.7:0});
    }
    snd(180,.22,'triangle',.06,-60);
   }else if(a.id==='chainlightning'){
    const dmg=(weaponRoll(S)*.7+S.SP*.95)*(1+(ca.stormcall||0)*.08)*sm.dmgMult*(sm.rune==='a'?1.2:1);
    const pool=nearbySpellTargets(P,270).sort((x,y)=>D(P,x)-D(P,y)).slice(0,4+(sm.rune==='a'?2:0));
    let prev=P;
    for(const t of pool){
     spellArc(prev,t,'#63d8ff');
     hit(t,dmg,{shock:4.5});ring(t.x,t.y,42,'#63d8ff');burst((prev.x+t.x)/2,(prev.y+t.y)/2,'#9ce8ff',10,130,.28,2);
     if(sm.rune==='b')P.mp=Math.min(S.M,P.mp+4);
     prev=t;
    }
    if(!pool.length)ring(P.x+c*80,P.y+sn*80,70,'#63d8ff');
    snd(560,.16,'square',.05,220);
   }else if(a.id==='icearmor'){
    iceArmorT=4.5+(sm.rune==='b'?2.5:0);
    nearbySpellTargets(P,150).forEach(e=>{e.sl=Math.max(e.sl||0,sm.rune==='b'?4.8:3.2);if(sm.rune==='a'){hit(e,S.SP*.65*sm.dmgMult);if(e.t!=='bs'&&!e.boss)e.stun=Math.max(e.stun||0,.9)}ft(e.x,e.y-e.r,'CHILL','#9be7ff',.85)});
    ring(P.x,P.y,130,'#7ce8ff');burst(P.x,P.y,'#a4eeff',28,200,.55,3);
    snd(490,.2,'sine',.06,180);
   }else if(a.id==='pyroblast'){
    const dmg=(weaponRoll(S)*1.3+S.SP*1.65)*sm.dmgMult*(sm.rune==='a'?1.3:1);
    PR.push({x:P.x+c*18,y:P.y+sn*18,vx:c*440,vy:sn*440,d:dmg,f:0,life:1.3,r:12,aoe:sm.rune==='a'?120:92,c:'#ff3e1a',ignite:S.SP*.4*ignMult,shock:!!py.solar_flare});
    snd(190,.24,'sawtooth',.07,-90);
   }
   tickApocalypse(ca,S);
  }else if(cls==='rogue'){
   const rt=window.dodProgression?.getClassTalents?.('rogue')||{};
   const as=rt.assassination||{},shT=rt.shadowcraft||{},bd=rt.bladedance||{};
   if(a.id==='twinfang'){
    const e=facingTarget(125);
    const dmg=weaponRoll(S)*1.25*(1+(as.twin_mastery||0)*.07)*sm.dmgMult;
    if(e){
     hit(e,dmg);hit(e,dmg*.9);
     e.bleedT=Math.max(e.bleedT||0,4+(sm.rune==='a'?1.5:0));e.bleedTick=Math.min(e.bleedTick||.4,.35);
     e.bleedD=Math.max(e.bleedD||0,weaponRoll(S)*.32*sm.dmgMult*(sm.rune==='a'?1.4:1));
     if(sm.rune==='b')P.mp=Math.min(S.M,P.mp+4);
    }
    combatEffect('slash',P.x,P.y,P.face);
    ring(P.x+c*38,P.y+sn*38,56,'#c28cff');
    snd(240,.14,'sawtooth',.06,120);
   }else if(a.id==='shadowstep'){
    P.dash={vx:c*1120,vy:sn*1120,t:.25,h:new Set(),skillMult:1.75*sm.dmgMult,shadowStart:{x:P.x,y:P.y},ambushCut:sm.rune==='b'?sm.dmgMult:0};
    P.inv_t=Math.max(P.inv_t,.45);
    rogueCritBuffT=2.5+(sm.rune==='a'?1.5:0);
    if(shT.night_cloak)nightCloakT=3.0;
    ring(P.x,P.y,50,'#9d75e6');snd(520,.15,'triangle',.06,260);
   }else if(a.id==='fanknives'){
    const set3=getSetCounts().find(s=>s.id==='nightstalker')?.count>=3;
    const bonusKnives=((bd.fan_volley||0)>=2?1:0)+((bd.fan_volley||0)>=5?1:0)+(P.eq[2]?.id==='nightstalker_garb'||set3?2:0)+(sm.rune==='a'?3:0);
    const ringMode=!!bd.thousand_cuts;
    const total=ringMode?(12+bonusKnives):(9+bonusKnives);
    const dmg=weaponRoll(S)*.72*(1+(bd.fan_volley||0)*.06)*(ringMode?1.2:1)*sm.dmgMult;
    const shotgunGroup={hits:new Map()},slowDur=2.2+(bd.piercing_steel||0)*.4+(sm.rune==='b'?1.4:0);
    for(let k=0;k<total;k++){
     const ang=ringMode?(k*(Math.PI*2/total)):(P.face+(k-(total-1)/2)*(sm.rune==='a'?.13:.15));
     PR.push({x:P.x+Math.cos(ang)*14,y:P.y+Math.sin(ang)*14,vx:Math.cos(ang)*560,vy:Math.sin(ang)*560,d:dmg,f:0,life:.65,r:4,aoe:0,pierce:true,hitIds:new Set(),shotgunGroup,slow:slowDur,bleedD:sm.rune==='b'?weaponRoll(S)*.24:0,c:'#d5b3ff'});
    }
    snd(410,.13,'square',.04,190);
   }else if(a.id==='smokebomb'){
    smokeBuffT=4.0+(shT.shadow_veil||0)*.5+(sm.rune==='a'?2.0:0);
    if(sm.rune==='a')P.hp=Math.min(S.H,P.hp+S.H*.15);
    if(sm.rune==='b')nearbySpellTargets(P,135).forEach(e=>{hit(e,weaponRoll(S)*.85*sm.dmgMult);e.sl=Math.max(e.sl||0,3.0)});
    ring(P.x,P.y,110,'#9fa9c7');burst(P.x,P.y,'#7f89a8',32,200,.75,4);
    snd(220,.25,'sine',.06,-100);
   }else if(a.id==='venomstrike'){
    const e=facingTarget(135);
    const afflicted=e&&(e.bleedT>0||e.sl>0);
    const dmg=weaponRoll(S)*1.45*(1+(as.twin_mastery||0)*.07)*sm.dmgMult*(sm.rune==='a'&&afflicted?1.35:1);
    if(e){
     hit(e,dmg);e.sl=Math.max(e.sl||0,sm.rune==='b'?4.5:3.0);
     if(sm.rune==='b'&&e.t!=='bs'&&!e.boss)e.stun=Math.max(e.stun||0,.7);
     e.bleedT=Math.max(e.bleedT||0,4.5);e.bleedTick=Math.min(e.bleedTick||.4,.35);
     e.bleedD=Math.max(e.bleedD||0,weaponRoll(S)*.38*sm.dmgMult);
    }
    ring(P.x+c*44,P.y+sn*44,64,'#7be884');burst(P.x+c*44,P.y+sn*44,'#7be884',18,160,.35,3);
    snd(320,.14,'triangle',.06,140);
   }else if(a.id==='caltrops'){
    const dmg=weaponRoll(S)*.9*(1+(bd.blade_flurry_m||0)*.08)*sm.dmgMult*(sm.rune==='a'?1.4:1);
    const rad=sm.rune==='a'?185:145,slowDur=3.5+(shT.shadow_veil||0)*.5;
    nearbySpellTargets(P,rad).forEach(e=>{
     hit(e,dmg);e.sl=Math.max(e.sl||0,slowDur);
     e.bleedT=Math.max(e.bleedT||0,3.5);e.bleedTick=Math.min(e.bleedTick||.45,.35);
     e.bleedD=Math.max(e.bleedD||0,weaponRoll(S)*.28*sm.dmgMult);
    });
    if(sm.rune==='b')P.mp=Math.min(S.M,P.mp+8);
    ring(P.x,P.y,rad,'#c2b59b');burst(P.x,P.y,'#d8ccba',26,180,.45,3);
    snd(280,.18,'square',.05,-60);
   }else if(a.id==='bladeflurry'){
    const dmg=weaponRoll(S)*1.05*(1+(bd.blade_flurry_m||0)*.08)*sm.dmgMult;
    const bonusCrit=sm.rune==='b'&&(Math.random()*100<S.C+25);
    nearbySpellTargets(P,140).forEach(e=>{hit(e,dmg,null,bonusCrit);hit(e,dmg*.9,null,bonusCrit);if(sm.rune==='a')hit(e,dmg*.8,null,bonusCrit)});
    ring(P.x,P.y,140,'#d5b3ff');burst(P.x,P.y,'#d5b3ff',34,220,.5,3);
    snd(360,.2,'sawtooth',.06,180);
   }else if(a.id==='assassinate'){
    const e=facingTarget(165);
    if(e){
     const low=e.mh>0&&(e.hp/e.mh<(sm.rune==='a'?.55:.4));
     const rollCrit=Math.random()*100<(S.C+30);
     hit(e,weaponRoll(S)*2.55*(low?1.75:1)*sm.dmgMult,null,rollCrit);
     if(sm.rune==='b'&&(e.dead||e.tk+(PD[e.id]||0)>=e.mh)){P.evadeCd=0;P.mp=Math.min(S.M,P.mp+15)}
    }
    ring(P.x+c*48,P.y+sn*48,72,'#b86bff');burst(P.x+c*48,P.y+sn*48,'#d49eff',22,190,.4,3);
    snd(150,.22,'sawtooth',.07,-80);
   }
  }
 };

 let emberCoilCount=0;
 const prevHit5=hit;
 hit=function(e,d,fx,forceCrit=false,fromBlade=false){
  const sets=getSetCounts();
  const blood3=sets.find(x=>x.id==='bloodforged')?.count>=3;
  const ashen3=sets.find(x=>x.id==='ashen_vanguard')?.count>=3;
  const ember3=sets.find(x=>x.id==='emberweaver')?.count>=3;
  if(blood3&&e&&e.bleedT>0)d*=1.2;
  if(!fromBlade&&(P.eq[8]?.id==='venomtooth_off')&&e&&(e.sl>0||e.bleedT>0))viperDodgeT=2.0;
  const beforeTk=e?e.tk:0,beforeFt=FT.length;
  prevHit5(e,d,fx,forceCrit,fromBlade);
  const dmgDone=e?(e.tk-beforeTk):0;
  const didCrit=FT.slice(beforeFt).some(x=>x.kind==='crit');
  if(!fromBlade&&didCrit){
   if(P.eq[3]?.id==='ember_signet'&&e){
    emberCoilCount++;
    if(emberCoilCount>=4){
     emberCoilCount=0;
     const pulse=Math.max(6,Math.round((stats().SP+stats().AP)*.28));
     for(const q of E){if(!q.dead&&D(q,e)<110){dealProcDamage(q,pulse,'shock');applyIgnite(q,Math.max(4,pulse*.4));applyShock(q,3)}}
     ring(e.x,e.y,110,'#ff9442');ft(e.x,e.y-e.r-14,'⚡EMBERCOIL','#ffba6b',.95);
    }
   }
   const cls=window.dodHeroClass||'warrior';
   if(cls==='rogue'){
    const bd=window.dodProgression?.getClassTalents?.('rogue')?.bladedance||{};
    if((bd.vital_strike||0)>0)P.mp=Math.min(stats().M,P.mp+2+(bd.vital_strike||0)*.5);
    if(P.eq[0]?.id==='nightstalker_dirk'&&e&&e.bleedT>0&&dmgDone>0){
     const b2=Math.max(4,Math.round(dmgDone*.25));e.tk+=b2;if(e.id>=0)DM[e.id]=Math.round(e.tk);ft(e.x,e.y-e.r-12,'🗡'+b2,'#c28cff',.9);
    }
   }else if(cls==='pyromancer'){
    if(ember3)P.mp=Math.min(stats().M,P.mp+4);
    if(P.eq[1]?.id==='ember_circlet'&&e)applyShock(e,4);
    if(P.eq[0]?.id==='cinderstaff'&&e){
     const spark=Math.max(5,Math.round(stats().SP*.45));
     for(const q of E){if(q!==e&&!q.dead&&D(q,e)<105){dealProcDamage(q,spark,'burn');applyIgnite(q,stats().SP*.2)}}
     ring(e.x,e.y,90,'#ff7f45');
    }
   }
  }
  if(ashen3&&!fromBlade&&dmgDone>0&&didCrit&&Math.random()<.55){
   const bonus=Math.max(5,Math.round(dmgDone*.35));
   for(const q of E){
    if(q!==e&&!q.dead&&D(q,e)<95){
     dealProcDamage(q,bonus,'burn');
    }
   }
   ring(e.x,e.y,95,'#ff9442');
  }
 };

 const prevHurt5=hurt;
 hurt=function(d){
  const beforeHp=P.hp,beforeInv=P.inv_t;
  prevHurt5(d);
  const dodged=P.hp===beforeHp&&P.inv_t===beforeInv&&!P.dead&&d>0;
  if(dodged){
   if(P.eq[1]?.id==='nightstalker_cowl'){for(let i=0;i<POTION_CD;i++)if(CD[i]>0)CD[i]=Math.max(0,CD[i]-1)}
   const ns3=getSetCounts().find(x=>x.id==='nightstalker')?.count>=3;
   if(ns3){const S=stats();P.hp=Math.min(S.H,P.hp+S.H*.03)}
  }
  if(P.hp<beforeHp&&!P.dead&&frostSetCd<=0){
   const frost3=getSetCounts().find(x=>x.id==='frostwarden')?.count>=3;
   if(frost3){
    frostSetCd=6.0;
    const S=stats();P.hp=Math.min(S.H,P.hp+S.H*.04);
    for(const q of E){if(!q.dead&&D(q,P)<150){q.sl=Math.max(q.sl||0,3.0);ft(q.x,q.y-q.r,'FROZEN','#8eeeff',.9)}}
    ring(P.x,P.y,150,'#7be3ff');burst(P.x,P.y,'#a4eeff',24,200,.5,3);
   }
  }
 };

 const prevDie5=die;
 die=function(e){
  const wasDead=e&&e.dead;
  if(e&&!wasDead&&e.igniteT>0&&(window.dodHeroClass==='pyromancer')){
   const py=window.dodProgression?.getClassTalents?.('pyromancer')?.pyromancy||{};
   if((py.cinder_burst||0)>0){
    const dmg=Math.round(stats().SP*(.05+(py.cinder_burst||0)*.25));
    for(const q of E){if(q!==e&&!q.dead&&D(q,e)<115){dealProcDamage(q,dmg,'burn')}}
    ring(e.x,e.y,115,'#ff7f45');
   }
  }
  prevDie5(e);
  if(e&&!wasDead&&e.id>=0){
   const gm=(window.dodParagonGoldMult||1)*(window.dodActBlessing?.().gold||1);
   const gDrop=Math.round((e.t==='bs'||e.boss?R(80,120)+fl*5:e.el?R(16,28)+fl*2:R(4,8)+fl*.75)*gm);
   addGold(gDrop);
   if(e.t==='bs'||e.boss||Math.random()<.35){
    ft(e.x+R(-10,10),e.y-e.r-14,'+'+gDrop+'g','#ffd86b',.95);
   }
   const key=e.t==='bs'||e.boss?(e.n||'The Butcher'):e.el?'Elite Champion':e.t==='nc'?'Cultist Summoner':e.t==='pb'?'Plague Bomber':e.t==='dk'?'Dread Knight':e.t==='zb'?'Undead Beast':e.t==='ar'?'Bone Archer':'Skeleton';
   bestiary[key]=(Number(bestiary[key])||0)+1;
   saveBestiary();
   const entryMeta=BESTIARY_ENTRIES.find(x=>x.key===key);
   const hitMs=entryMeta?.milestones?.find(m=>m.threshold===bestiary[key]);
   if(hitMs)banner(`🏆 Bestiary Milestone: ${hitMs.title} (${bestiary[key]} ${key})`);
   if(window.parent&&window.parent!==window){try{window.parent.postMessage({type:'dod:bestiary-updated',bestiary:{...bestiary}},window.location.origin)}catch(err){}}
  }
 };

 const prevUpdate5=update;
 update=function(dt){
  if(codexOpen||enchanterOpen||ossuaryDialog.open||$('campaignSpoils').open||$('itemDetails').open||$('witchLedger').open){stopWhirl();return}
  prevUpdate5(dt);
  if(smokeBuffT>0)smokeBuffT=Math.max(0,smokeBuffT-dt);
  if(rogueCritBuffT>0)rogueCritBuffT=Math.max(0,rogueCritBuffT-dt);
  if(nightCloakT>0)nightCloakT=Math.max(0,nightCloakT-dt);
  if(iceArmorT>0)iceArmorT=Math.max(0,iceArmorT-dt);
  if(viperDodgeT>0)viperDodgeT=Math.max(0,viperDodgeT-dt);
  if(frostSetCd>0)frostSetCd=Math.max(0,frostSetCd-dt);
  if(P.phaseStrideT>0)P.phaseStrideT=Math.max(0,P.phaseStrideT-dt);
  if(P.ironheartT>0)P.ironheartT=Math.max(0,P.ironheartT-dt);
  if(P.ironheartCd>0)P.ironheartCd=Math.max(0,P.ironheartCd-dt);

  if(meteorQueue.length){
   const next=[];
   for(const m of meteorQueue){
    m.t-=dt;
    if(m.t<=0){
     E.forEach(e=>{if(!e.dead&&D(m,e)<105+e.r){hit(e,m.d,{ignite:m.ignite});e.stun=Math.max(e.stun||0,.9)}});
     ring(m.x,m.y,105,'#ff6928');burst(m.x,m.y,'#ff9642',30,240,.55,4);sh=Math.max(sh,7);
     snd(95,.25,'sawtooth',.07,-45);
    }else next.push(m);
   }
   meteorQueue=next;
  }

  const procBox=document.getElementById('uniqueProcStatus');
  if(procBox){
   const extraSlot=procBox.querySelector('[data-proc-group="extra"]')||procBox;
   const badges=[];
   for(const s of getSetCounts()){
    if(s.count>=2)badges.push(`<div class="unique-proc" data-set-badge="1" style="--proc:${s.color}"><b>✦</b>${s.name}<span>${s.count>=3?'3/3':'2/3'}</span></div>`);
   }
   if(smokeBuffT>0)badges.push(`<div class="unique-proc" data-set-badge="1" style="--proc:#b6c3e6"><b>💨</b>Smoke Mist<span>${smokeBuffT.toFixed(1)}s</span></div>`);
   if(P.ironheartT>0)badges.push(`<div class="unique-proc" data-set-badge="1" style="--proc:#7ecbff"><b>🛡️</b>Ironheart<span>${P.ironheartT.toFixed(1)}s</span></div>`);
   if(P.phaseStrideT>0)badges.push(`<div class="unique-proc" data-set-badge="1" style="--proc:#8ef2d4"><b>🥾</b>Phase Stride<span>${P.phaseStrideT.toFixed(1)}s</span></div>`);
   const nextExtraHtml=badges.join('');
   if(extraSlot._lastHtml!==nextExtraHtml){extraSlot._lastHtml=nextExtraHtml;extraSlot.innerHTML=nextExtraHtml}
   const weaponSlot=procBox.querySelector('[data-proc-group="weapon"]');
   if(weaponSlot)procBox.hidden=!(weaponSlot.innerHTML||nextExtraHtml);
  }
 };

 const prevSave5=save;
 save=function(){prevSave5();saveGold();saveBestiary();paintGoldHud()};

 addEventListener('keydown',e=>{
  const tag=document.activeElement?.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;
  const k=e.key.toLowerCase();
  if(k==='b'&&!e.repeat){e.preventDefault();codexOpen?closeCodex():openCodex()}
  else if(k==='o'&&!e.repeat){e.preventDefault();enchanterOpen?closeEnchant():openEnchant()}
  else if(e.key==='Escape'){closeCodex();closeEnchant()}
 });

 const helpEl=document.getElementById('help');
 if(helpEl)helpEl.textContent='WASD or joystick to move · Space to Evade · V switches camera · Hold left to advance and attack · Hold right to aim · 1–4 class skills · Q potion · I inventory';

 renderSkillSlots();
 window.dodGold={get:()=>gold,add:addGold,set:(v)=>{gold=Math.max(0,Math.floor(Number(v)||0));saveGold();paintGoldHud()}};
 window.dodBestiary={get:()=>({...bestiary}),entries:()=>BESTIARY_ENTRIES.map(e=>({...e,kills:Number(bestiary[e.key])||0}))};
 window.dodSets={get:getSetCounts};
 window.dodCodex={open:openCodex,close:closeCodex};
 window.dodRefreshCodex=()=>{if(codexOpen)renderCodex()};
 window.dodEnchanter={open:openEnchant,close:closeEnchant};
})();
