(()=>{
 const screen=$('classStart'),preview=screen?.querySelector('.heroPreview');
 if(!preview)return;
 const button=document.createElement('button'),canvas=document.createElement('canvas');
 canvas.width=160;canvas.height=160;
 button.type='button';button.className='hero-preview-action';
 button.setAttribute('aria-label','Preview weapon attack');
 button.title='Preview weapon attack';
 const caption=document.createElement('span');caption.textContent='Preview attack';caption.className='hero-preview-caption';
 button.append(canvas,caption);preview.append(button);
 const ctx=canvas.getContext('2d'),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 const equipment={
  warrior:[{weaponType:'Sword',handed:'one',r:0},null,null,null,null,null,null,null,{offhandType:'shield',r:1}],
  pyromancer:[{weaponType:'Staff',handed:'two',r:1}],
  rogue:[{weaponType:'Dagger',handed:'one',r:1}]
 };
 let attackUntil=0;
 function drawPreview(now){
  if(screen.style.display!=='grid')return;
  const cls=screen.querySelector('.classPickCard.selected')?.dataset.heroClass||'warrior';
  const color=screen.querySelector('.armorColor.selected')?.dataset.color||'#8d3430';
  const facing=-.52+(reducedMotion.matches?0:Math.sin(now*.00115)*.14);
  const anim=Math.max(0,Math.min(1,(attackUntil-now)/260));
  ctx.clearRect(0,0,160,160);
  ctx.save();ctx.translate(65,86);ctx.scale(1.72,1.56);
  drawH(0,0,facing,color,anim,equipment[cls],cls,ctx);
  ctx.restore();
 }
 button.onclick=()=>{attackUntil=performance.now()+260};
 window.dodPaintHeroPreview=drawPreview;
})();
