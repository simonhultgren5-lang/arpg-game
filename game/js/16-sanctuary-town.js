(() => {
 const hub=document.getElementById('sanctuary'), service=document.getElementById('d3service');
 const townWidth=1000,townHeight=560;
 const stations=[
  {id:'forge',name:'Ironward Forge',person:'Mara · Smith',short:'Forge',color:'#efad74',x:220,y:218,icon:'⚒'},
  {id:'enchant',name:'Veilstone Workshop',person:'Ilyra · Enchanter',short:'Enchanter',color:'#bf9aef',x:780,y:218,icon:'✦'},
  {id:'supplies',name:'Wayfarer’s Rest',person:'Oren · Merchant',short:'Supplies',color:'#8cccac',x:220,y:452,icon:'✚'},
  {id:'quests',name:'Chronicler’s Hall',person:'Sable · Bounties',short:'Bounties',color:'#d9bc79',x:780,y:452,icon:'▤'},
  {id:'gate',name:'Descent Gate',person:'Return to your current depth',short:'Dungeon',color:'#ed927a',x:500,y:126,icon:'▼'}
 ];
 const city=document.createElement('section');
 city.className='city-module';
 city.setAttribute('aria-label','Sanctuary city');
 city.innerHTML='<div class="city-scene"><div class="city-interact" hidden><span></span><button type="button">Interact <kbd>E</kbd></button></div></div>'+
  '<header class="city-header"><h2>Sanctuary</h2><p>Walk or select a destination</p></header>'+
  '<nav class="city-navigation" aria-label="City destinations"><button class="city-atlas" type="button">World Atlas</button></nav>';
 hub.append(city);
 hub.classList.add('has-city');
 const scene=city.querySelector('.city-scene'),ctx=g,camera={x:0,y:0},stick={x:0,y:0},prompt=city.querySelector('.city-interact');
 const position={x:500,y:408,facing:-Math.PI/2,step:0,moving:false};
 const input=new Set(),directions={KeyA:[-1,0],ArrowLeft:[-1,0],KeyD:[1,0],ArrowRight:[1,0],KeyW:[0,-1],ArrowUp:[0,-1],KeyS:[0,1],ArrowDown:[0,1]};
 const active=()=>hub.style.display==='grid';
 const inService=()=>service.style.display==='block'||['enchanterPanel','inv','progPanel','codexPanel','worldPanel'].some(id=>document.getElementById(id)?.style.display==='block')||document.getElementById('itemDetails')?.open;
 let route=[],destination=null;
 let nearest=null;
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

 function walkable(x,y){
  if(x<64||x>townWidth-64||y<126||y>townHeight-42)return false;
  if(((x-500)/68)**2+((y-296)/36)**2<1)return false;
  return !stations.some(s=>Math.abs(x-s.x)<92&&y>s.y-105&&y<s.y-18);
 }
 function cityPath(point){
  const step=16,cols=Math.ceil(townWidth/step),rows=Math.ceil(townHeight/step);
  const index=(x,y)=>Math.round(y/step)*cols+Math.round(x/step);
  const coords=i=>({x:(i%cols)*step,y:Math.floor(i/cols)*step});
  const start=index(position.x,position.y),goal=index(point.x,point.y),queue=[start],parents=new Int32Array(cols*rows).fill(-1);
  const end=coords(goal);
  if(!walkable(end.x,end.y))return [];
  parents[start]=start;
  for(let i=0;i<queue.length&&parents[goal]<0;i++){
   const cell=queue[i];
   for(const next of [cell-1,cell+1,cell-cols,cell+cols]){
    if(next<0||next>=parents.length||parents[next]>=0)continue;
    const p=coords(next);
    if(!walkable(p.x,p.y))continue;
    parents[next]=cell;
    queue.push(next);
   }
  }
  if(parents[goal]<0)return [];
  const steps=[];
  for(let cell=goal;cell!==start;cell=parents[cell])steps.push(coords(cell));
  return [...steps.reverse(),point];
 }
 function goTo(point,station=null){
  if(!walkable(point.x,point.y))return;
  route=cityPath(point);
  destination=route.length?station:null;
 }
 function openStation(station){
  if(!active()||inService())return;
  input.clear();route=[];destination=null;
  if(station.id==='gate'){window.dodSanctuary.close();save();banner('Depth '+fl);return}
  if(station.id==='enchant'){window.dodEnchanter?.open();return}
  window.dodSanctuary.openService(station.id);
 }
 for(const station of stations){
  const button=document.createElement('button');
  button.type='button';button.style.setProperty('--station',station.color);
  button.innerHTML='<b aria-hidden="true">'+station.icon+'</b> '+station.short;
  button.setAttribute('aria-label','Walk to '+station.name);
  button.onclick=()=>goTo({x:station.x,y:station.y},station);
  city.querySelector('nav').insertBefore(button,city.querySelector('.city-atlas'));
 }
 city.querySelector('.city-atlas').onclick=()=>{
  window.dodSanctuary.close();
  window.dodWorld?.open();
 };
 prompt.querySelector('button').onclick=()=>{if(nearest)openStation(nearest)};
 scene.addEventListener('pointerdown',event=>{
  if(inService()||event.target.closest('.city-interact'))return;
  const rect=scene.getBoundingClientRect();
  const point={x:event.clientX-rect.left-camera.x,y:(event.clientY-rect.top-camera.y)/worldY()};
  const station=stations.find(s=>distance(s,point)<75);
  if(station){if(distance(position,station)<55)openStation(station);else goTo({x:station.x,y:station.y},station)}
  else goTo({x:Math.max(65,Math.min(townWidth-65,point.x)),y:Math.max(128,Math.min(townHeight-48,point.y))});
 });
 window.addEventListener('keydown',event=>{
  if(!active()||event.target?.closest?.('input,select,textarea,[contenteditable]'))return;
  const combatKey=['Digit1','Digit2','Digit3','Digit4','KeyQ'].includes(event.code)||(event.code==='Space'&&!event.target?.closest?.('button'));
  if(combatKey){event.preventDefault();event.stopImmediatePropagation();return}
  if(inService())return;
  if(directions[event.code]){
   event.preventDefault();event.stopImmediatePropagation();
   route=[];destination=null;input.add(event.code);
  }else if(event.code==='KeyE'&&!event.repeat&&nearest){
   event.preventDefault();event.stopImmediatePropagation();openStation(nearest);
  }
 },true);
 window.addEventListener('keyup',event=>input.delete(event.code),true);
 window.addEventListener('blur',()=>input.clear());


 function drawPaving(){
  const cobbles=stoneSwatches(DEPTH_MATERIALS[2]);
  ctx.fillStyle='#050305';ctx.fillRect(-camera.x,-camera.y/worldY(),W,H/worldY());
  const cols=Math.floor(townWidth/TS),rows=Math.floor(townHeight/TS);
  for(let y=0;y<rows;y++){
   for(let x=0;x<cols;x++){
    const tx=x*TS,ty=y*TS;
    const wall=x===0||x===cols-1||y===0||y===rows-1;
    ctx.fillStyle=wall?(y===0?'#746067':'#34282e'):FC[(x*73+y*151)%8];
    ctx.fillRect(tx,ty,TS,TS);
    if(!wall)ctx.drawImage(cobbles[(x*7+y*3)%cobbles.length],tx,ty);
    ctx.fillStyle=wall?'#a78d8a55':'#ffffff0b';
    ctx.fillRect(tx+2,ty+2,TS-4,2);ctx.fillRect(tx+2,ty+2,2,TS-4);
    ctx.fillStyle='#0004';ctx.fillRect(tx,ty+TS-2,TS,2);ctx.fillRect(tx+TS-2,ty,2,TS);
    if(!wall&&(x*13+y*7)%17===0){
     ctx.strokeStyle='#0b0809aa';ctx.beginPath();
     ctx.moveTo(tx+10,ty+13);ctx.lineTo(tx+17,ty+19);ctx.lineTo(tx+14,ty+26);ctx.stroke();
    }
   }
  }
  ctx.fillStyle='#33244226';ctx.fillRect(40,40,townWidth-80,townHeight-80);
  for(const x of [67,townWidth-67]){
   for(const y of [130,270,410,505]){
    ctx.fillStyle='#45373c';ctx.fillRect(x-7,y-2,14,25);
    ctx.fillStyle='#ffbc76';ctx.fillRect(x-4,y-8,8,10);
    drawLantern(x,y,'#fba764',.83);
   }
  }
 }
 function drawLantern(x,y,color,scale=1){
  const glow=ctx.createRadialGradient(x,y,2,x,y,100*scale);
  glow.addColorStop(0,color+'68');glow.addColorStop(.35,color+'25');glow.addColorStop(1,color+'00');
  ctx.fillStyle=glow;ctx.fillRect(x-100*scale,y-100*scale,200*scale,200*scale);
 }
 function drawBuilding(station){
  const x=station.x,y=station.y,isGate=station.id==='gate';
  const roof=ctx.createLinearGradient(x,y-118,x,y-35);
  roof.addColorStop(0,'#372a43');roof.addColorStop(1,'#1b1725');
  ctx.fillStyle='#0c0a12a0';ctx.fillRect(x-104,y-64,216,72);
  ctx.fillStyle='#272333';ctx.fillRect(x-104,y-105,208,83);
  ctx.fillStyle=roof;ctx.strokeStyle='#6b526e';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(x-111,y-58);ctx.lineTo(x-79,y-119);ctx.lineTo(x+79,y-119);ctx.lineTo(x+111,y-58);ctx.closePath();ctx.fill();ctx.stroke();
  if(isGate){
   ctx.fillStyle='#100d16';ctx.beginPath();ctx.arc(x,y-47,36,Math.PI,0);ctx.lineTo(x+36,y-12);ctx.lineTo(x-36,y-12);ctx.closePath();ctx.fill();ctx.stroke();
  }else{
   for(const dx of [-66,66]){
    ctx.fillStyle='#18151e';ctx.fillRect(x+dx-13,y-51,26,22);
    ctx.fillStyle=station.color+'88';ctx.fillRect(x+dx-8,y-47,16,13);
   }
  }
  drawLantern(x,y-33,station.color,.88);
  ctx.textAlign='center';ctx.fillStyle=station.color;ctx.font='bold 22px Georgia';ctx.fillText(station.icon,x,y-31);
  ctx.fillStyle='#15121fe9';ctx.fillRect(x-103,y+24,206,43);
  ctx.strokeStyle=station.color+'78';ctx.lineWidth=1;ctx.strokeRect(x-103,y+24,206,43);
  ctx.fillStyle='#fff0db';ctx.font='bold 16px Georgia';ctx.fillText(station.name,x,y+42);
  ctx.fillStyle='#d7c7da';ctx.font='11px system-ui';ctx.fillText(station.person,x,y+58);
  if(nearest===station){
   ctx.strokeStyle=station.color;ctx.beginPath();ctx.arc(x,y,18,0,Math.PI*2);ctx.stroke();
  }
 }
 function drawFountain(time){
  const x=500,y=296;
  ctx.fillStyle='#0e0e1b';ctx.beginPath();ctx.ellipse(x,y+4,70,41,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#514450';ctx.beginPath();ctx.ellipse(x,y,66,37,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#222849';ctx.beginPath();ctx.ellipse(x,y-2,56,29,0,0,Math.PI*2);ctx.fill();
  for(let i=0;i<4;i++){
   const p=(time*.001+i*.26)%1;
   ctx.strokeStyle='rgba(169,168,246,'+(1-p)*.55+')';
   ctx.beginPath();ctx.ellipse(x,y-2,10+p*45,4+p*20,0,0,Math.PI*2);ctx.stroke();
  }
  drawLantern(x,y,'#9898e8',.66);
  ctx.fillStyle='#d1c7ee';ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillText('Sanctuary Square',x,y+65);
 }

 const visitors=new Map();
 const heroClasses=new Set(['warrior','pyromancer','rogue']);
 const weaponTypes=new Set(['Sword','Axe','Mace','Wand','Staff','Dagger','Orb']);
 function armorColor(color){return /^#[0-9a-f]{6}$/i.test(color)?color:'#b66f72'}
 function visualItem(item){
  if(!item||typeof item!=='object')return null;
  return {
   id:typeof item.id==='string'?item.id.slice(0,40):undefined,
   weaponType:weaponTypes.has(item.weaponType)?item.weaponType:undefined,
   handed:item.handed==='two'?'two':'one',
   offhandType:['weapon','orb'].includes(item.offhandType)?item.offhandType:undefined,
   r:Number.isInteger(item.r)&&item.r>=0&&item.r<=4?item.r:0,
   sockets:Array.isArray(item.sockets)?item.sockets.filter(id=>Object.hasOwn(GEMS,id)).slice(0,1):[],
   unique:item.unique===true
  };
 }
 function getPresence(){
  if(!active())return null;
  return {
   area:'sanctuary',x:Math.round(position.x),y:Math.round(position.y),
   facing:position.facing,name:String(me.n||'Hero').slice(0,24),
   color:armorColor(me.c),heroClass:window.dodHeroClass||'warrior',
   mainHand:visualItem(P.eq[0]),offHand:visualItem(P.eq[8]),head:visualItem(P.eq[1]),chest:visualItem(P.eq[2]),feet:visualItem(P.eq[7])
  };
 }
 function setVisitors(snapshots){
  if(!Array.isArray(snapshots))return;
  const online=new Set();
  for(const snapshot of snapshots.slice(0,48)){
   if(!snapshot||snapshot.area!=='sanctuary'||typeof snapshot.id!=='string'||!Number.isFinite(snapshot.x)||!Number.isFinite(snapshot.y))continue;
   const id=snapshot.id.slice(0,96);
   if(!id||!walkable(snapshot.x,snapshot.y))continue;
   online.add(id);
   const hero=visitors.get(id)||{x:snapshot.x,y:snapshot.y,step:0,moving:false};
   Object.assign(hero,{
    toX:snapshot.x,toY:snapshot.y,facing:Number.isFinite(snapshot.facing)?snapshot.facing:0,
    name:typeof snapshot.name==='string'?snapshot.name.slice(0,24):'Adventurer',
    color:armorColor(snapshot.color),heroClass:heroClasses.has(snapshot.heroClass)?snapshot.heroClass:'warrior',
    equipment:[visualItem(snapshot.mainHand),visualItem(snapshot.head),visualItem(snapshot.chest),null,null,null,null,visualItem(snapshot.feet),visualItem(snapshot.offHand)]
   });
   visitors.set(id,hero);
  }
  for(const id of visitors.keys())if(!online.has(id))visitors.delete(id);
 }
 function drawCityHero(actor,isLocal){
  const scale=1,bob=actor.moving?Math.sin(actor.step)*1.6:0;
  ctx.save();ctx.translate(actor.x,actor.y+bob);ctx.scale(scale,scale);
  drawH(0,0,actor.facing,actor.color,0,actor.equipment,actor.heroClass,ctx,{stride:actor.step,moving:actor.moving});
  ctx.restore();
  ctx.font='600 13px system-ui';ctx.textAlign='center';
  ctx.strokeStyle='#100d17';ctx.lineWidth=4;
  const y=actor.y-23;
  ctx.strokeText(actor.name,actor.x,y);
  ctx.fillStyle=isLocal?'#f9dfbd':'#e5cdf2';ctx.fillText(actor.name,actor.x,y);
 }

 function drawTownHeroes(dt){
  const heroes=[];
  for(const actor of visitors.values()){
   const progress=Math.min(1,dt*12);
   const dx=(actor.toX-actor.x)*progress,dy=(actor.toY-actor.y)*progress;
   actor.x+=dx;actor.y+=dy;
   const moved=Math.hypot(dx,dy);
   actor.moving=moved>.18;actor.step+=moved*.18;
   heroes.push([actor,false]);
  }
  heroes.push([{...position,name:me.n||'Hero',color:armorColor(me.c),heroClass:window.dodHeroClass||'warrior',equipment:P.eq},true]);
  heroes.sort((a,b)=>a[0].y-b[0].y);
  for(const [actor,isLocal] of heroes)drawCityHero(actor,isLocal);
 }
 function renderTown(time,dt){
  document.body.classList.toggle('in-sanctuary',active());
  if(!active())return false;
  position.moving=false;
  if(!inService()){
   let dx=stick.x,dy=stick.y;
   for(const key of input){dx+=directions[key][0];dy+=directions[key][1]}
   const point=route[0];
   if(point){
    if(distance(point,position)<1.5)route.shift();
    else {dx=point.x-position.x;dy=point.y-position.y}
   }
   const length=Math.hypot(dx,dy);
   if(length){
    const speed=190*(1+stats().s/100);
    const travel=point?Math.min(speed*dt,length):speed*dt*Math.min(1,length);
    const oldX=position.x,oldY=position.y;
    const x=oldX+dx/length*travel,y=oldY+dy/length*travel;
    if(walkable(x,oldY))position.x=x;
    if(walkable(position.x,y))position.y=y;
    const moved=Math.hypot(position.x-oldX,position.y-oldY);
    position.moving=moved>.05;
    position.step+=moved*.18;
    if(position.moving)position.facing=Math.atan2(position.y-oldY,position.x-oldX);
   }
   nearest=stations.find(station=>distance(position,station)<51)||null;
   if(destination&&nearest===destination&&route.length===0)openStation(destination);
  }
  const vendorOpen=inService();
  city.inert=vendorOpen;
  prompt.hidden=!nearest||vendorOpen;
  if(nearest)prompt.querySelector('span').textContent=nearest.name;
  if(!active()){document.body.classList.remove('in-sanctuary');return false}
  camera.x=Math.round(W/2-position.x);camera.y=Math.round(H/2-position.y*worldY());
  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.translate(camera.x,camera.y);ctx.scale(1,worldY());
  drawPaving();drawFountain(time);stations.forEach(drawBuilding);drawTownHeroes(dt);
  ctx.restore();
  const radius=Math.max(360,Math.min(W,H)*.64);
  const falloff=ctx.createRadialGradient(W/2,H/2,90,W/2,H/2,radius);
  falloff.addColorStop(0,'#0c090e00');falloff.addColorStop(.67,'#0c090e28');falloff.addColorStop(1,'#060408b3');
  ctx.fillStyle=falloff;ctx.fillRect(0,0,W,H);
  return true;
 }
 function drawTownMap(map){
  map.clearRect(0,0,112,112);
  map.globalAlpha=1;map.fillStyle='#51465a';map.fillRect(6,29,100,54);
  map.fillStyle='#232034';map.fillRect(10,33,92,46);
  for(const station of stations){map.fillStyle=station.color;map.fillRect(6+station.x/townWidth*100-2,29+station.y/townHeight*54-2,4,4)}
  map.fillStyle='#fff';map.fillRect(6+position.x/townWidth*100-2,29+position.y/townHeight*54-2,4,4);
 }
 window.dodCity={active,render:renderTown,drawMap:drawTownMap,getPresence,setVisitors,setStick(x,y){
  stick.x=x;stick.y=y;
  if(active()&&(Math.abs(x)+Math.abs(y)>.03)){route=[];destination=null;}
 },show(){
  input.clear();stick.x=stick.y=0;route=[];destination=null;nearest=null;
 }};
 const button=document.createElement('button');
 button.type='button';button.id='cityOpen';button.textContent='Sanctuary';
 button.onclick=()=>{
  if(P.dead)return;
  if(hurtT>0||E.some(enemy=>!enemy.dead&&enemy.aw&&D(P,enemy)<310)){
   banner('Get clear of nearby enemies to return to Sanctuary');
   return;
  }
  window.dodSanctuary.open();
 };
 document.getElementById('top').append(button);
})();
