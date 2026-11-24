/* DEPTHS OF DARKNESS — LAUNCHER CHARACTERS (desktop app)
   Heroes are created in the launcher (up to 5 per account). When the launcher starts the game with a
   character, this skips the in-game hero creation: a new character is built from the launcher's
   name, class and color, and an existing one continues straight away. The title screen then only
   offers Continue and Change Character, never New Hero or Erase. Without a launcher character
   (the website, or `bun run game:offline`) the game keeps its own hero creation. */
(()=>{
 const ch=window.dodCharacter;
 if(!ch)return;
 const $=id=>document.getElementById(id);
 const title=$('titleScreen'),start=$('classStart');
 if(!title||!start)return;
 const CLASSES=['warrior','pyromancer','rogue'];
 const cls=CLASSES.includes(ch.heroClass)?ch.heroClass:'warrior';
 const color=/^#[0-9a-f]{6}$/i.test(ch.color)?ch.color:'#8d3430';
 const STARTED_KEY='dodHeroStartedV1';

 // A hero exists once it was created for this character (or made progress, for older saves).
 const hasHero=()=>{try{const s=JSON.parse(localStorage.getItem('mdjup')||'null');if(!s)return false;return localStorage.getItem(STARTED_KEY)===String(s.heroName)||Number(s.lv)>1||Number(s.xp)>0||Number(s.depth)>1||Number(s.best)>1}catch(e){return false}};

 // Build the hero with the in-game creator's own code path, filled in from the launcher.
 function createHero(){
  start.querySelector(`.classPickCard[data-hero-class="${cls}"]`)?.click();
  const swatch=[...start.querySelectorAll('.armorColor')].find(b=>(b.dataset.color||'').toLowerCase()===color.toLowerCase());
  swatch?.click();
  const input=start.querySelector('#heroNameInput');if(input)input.value=ch.name;
  title.style.display='none';
  start.querySelector('#createHeroBtn')?.click();
  try{me.c=color;localStorage.setItem(STARTED_KEY,String(me.n));save()}catch(e){}
 }
 const enter=()=>{if(hasHero())$('d3Continue')?.click();else createHero()};

 // ---- title screen: no hero creation or erasing here, the launcher owns that ----
 const begin=$('d3Begin'),cont=$('d3Continue');
 for(const b of [$('d3New'),...title.querySelectorAll('.tm-foot button')])if(b&&b!==cont)b.remove();
 if(cont&&hasHero()){begin?.remove()}
 else if(begin){begin.textContent='Enter the World';begin.onclick=createHero}
 const back=$('d3Launcher');if(back)back.textContent='Change Character';
 const line=document.createElement('div');line.className='ch-title-hero';
 line.textContent=`${ch.name} · ${({warrior:'Warrior',pyromancer:'Pyromancer',rogue:'Shadow Rogue'})[cls]}`;
 title.querySelector('.sub')?.after(line);
 const css=document.createElement('style');css.textContent='#titleScreen .ch-title-hero{margin:-4px 0 14px;font:600 13px var(--book-type,Georgia,serif);letter-spacing:.16em;text-transform:uppercase;color:#e3b67e}';
 document.head.appendChild(css);

 // ---- straight into the game the first time this window opens (not after Quit to Title) ----
 const AUTO='dodCharacterEnteredV1';
 let entered=false;try{entered=sessionStorage.getItem(AUTO)===String(ch.id)}catch(e){}
 if(!entered){
  try{sessionStorage.setItem(AUTO,String(ch.id))}catch(e){}
  setTimeout(enter,0);
 }
})();
