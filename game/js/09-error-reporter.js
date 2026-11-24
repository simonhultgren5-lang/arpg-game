// Surface otherwise-silent startup/event errors so they can be diagnosed from the game screen.
(()=>{
 const escapeText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const show=(title,detail)=>{let box=document.getElementById('runtimeError');if(!box){box=document.createElement('section');box.id='runtimeError';box.style.cssText='position:fixed;z-index:10000;inset:0;display:grid;place-items:center;background:rgba(8,6,7,0.95);color:#f2e7cf;padding:20px;font:14px system-ui';document.body.appendChild(box)}box.innerHTML='<div style="max-width:680px;max-height:85vh;overflow:auto;padding:24px;background:#0f0c0e;border:1px solid #8a6d45;border-radius:3px"><h2 style="color:#ead08b">'+escapeText(title)+'</h2><p>The game encountered an unexpected error. Reload the page to resume from your saved checkpoint.</p><pre style="white-space:pre-wrap;color:#bfb097">'+escapeText(detail)+'</pre><button onclick="location.reload()">Reload Game</button></div>'};
 window.addEventListener('error',e=>show('A runtime error stopped the game',e.error?.stack||`${e.message} (${e.filename}:${e.lineno}:${e.colno})`));
 window.addEventListener('unhandledrejection',e=>show('An async error stopped the game',e.reason?.stack||e.reason));
})();
