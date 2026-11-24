(()=>{
 const KEY='dodBuildMasteryV1',empty=()=>({whirlwind:{level:0,xp:0,kills:0},bleed:{level:0,xp:0,kills:0}});
 let state=empty();try{state=Object.assign(state,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}
 for(const k of ['whirlwind','bleed'])state[k]=Object.assign(empty()[k],state[k]||{});
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}};
 const ranks=()=>window.dodProgression?.getTalents?.()||{};
 const req=t=>30+t.level*20;
 function award(type,e){const t=state[type];if(t.level>=10)return;const gain=e.t==='bs'?30:e.el?15:5;t.xp+=gain;t.kills++;while(t.level<10&&t.xp>=req(t)){t.xp-=req(t);t.level++;ft(P.x,P.y-34,(type==='bleed'?'HEMORRHAGE':'SPIN CONTROL')+' · MASTERY '+t.level,type==='bleed'?'#ff7180':'#9fe5f3',1.3,'mastery');snd(type==='bleed'?520:690,.16,'sine',.045,180)}save();paint()}
 const oldHit=hit;
 hit=function(e,d,...args){const r=ranks(),pending=e.masteryPending;e.masteryPending=null;let source=pending||'';if(!source&&e.dotNoCrit&&(r.reaver?.rend||0)>0)source='bleed';if(!source&&WW.active&&(r.weapon?.whirlwind||0)>0)source='whirlwind';if(!source&&e.bleedT>0&&(r.reaver?.rend||0)>0)source='bleed';if(!source&&(r.reaver?.rend||0)>0&&!(r.weapon?.whirlwind||0))source='bleed';e.masteryLast=source;if(source==='bleed'&&e.dotNoCrit)d*=1+state.bleed.level*.02;return oldHit(e,d,...args)};
 const oldWhirlHit=whirlHit;whirlHit=function(e,d){e.masteryPending='whirlwind';return oldWhirlHit(e,d)};
 const oldDie=die;die=function(e){if(e&&!e.dead&&e.mh-e.tk-(PD[e.id]||0)<=0&&e.masteryLast){const type=e.masteryLast;if((type==='whirlwind'&&(ranks().weapon?.whirlwind||0)>0)||(type==='bleed'&&(ranks().reaver?.rend||0)>0))award(type,e)}return oldDie(e)};
 const oldWhirlConfig=whirlConfig;whirlConfig=function(){const c=oldWhirlConfig();c.damage*=1+state.whirlwind.level*.015;return c};
 const hud=document.createElement('div');hud.id='buildMasteryHud';hud.style.cssText='display:none!important';document.body.appendChild(hud);
 function line(type,icon,name,color){const t=state[type],need=req(t),pct=t.level>=10?100:Math.min(100,t.xp/need*100);return `<div style="margin-top:4px"><div style="display:flex;justify-content:space-between"><span style="color:${color}">${icon} ${name} · M${t.level}</span><span>${t.level>=10?'MAX':`${t.xp}/${need}`}</span></div><div style="height:3px;margin-top:3px;background:#ffffff20;border-radius:3px"><i style="display:block;width:${pct}%;height:100%;background:${color};border-radius:3px"></i></div></div>`}
 function paint(){if(getComputedStyle(hud).display==='none')return;const r=ranks(),showW=(r.weapon?.whirlwind||0)>0,showB=(r.reaver?.rend||0)>0;hud.style.display=showW||showB?'block':'none';hud.innerHTML=(showW?line('whirlwind','🌀','Spin Control','#9fe5f3'):'')+(showB?line('bleed','🩸','Hemorrhage','#ff7180'):'')}
 paint();setInterval(paint,600);window.dodBuildMastery={get:()=>JSON.parse(JSON.stringify(state))};
})();
