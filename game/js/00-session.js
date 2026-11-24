/* DEPTHS OF DARKNESS — SESSION BOOT (desktop app)
   Runs before every other game script. Reads which account/server this session uses and, when
   playing online, puts the hero downloaded from the server in place before the game loads its save.
   Each online account has its own storage (see electron/main.cjs), so this never touches other heroes. */
(()=>{
 const desktop=window.dodDesktop;
 let boot=null;
 try{boot=desktop?.boot?.()||null}catch(e){}
 window.dodSession=boot?.session||{mode:desktop?'offline':'web'};

 const cloud=boot?.cloudSave;
 if(!cloud||!cloud.data)return;
 const MARK='dodCloudSyncedAtV1'; // server time of the last save this PC uploaded or downloaded
 const local=Number(localStorage.getItem(MARK)||0);
 if(Number(cloud.updatedAt)<=local)return; // this PC already has this hero, or newer progress still uploading

 const isGameKey=k=>k==='mdjup'||k.startsWith('dod');
 try{
  Object.keys(localStorage).filter(isGameKey).forEach(k=>localStorage.removeItem(k));
  for(const [k,v] of Object.entries(cloud.data))if(isGameKey(k)&&typeof v==='string')localStorage.setItem(k,v);
  localStorage.setItem(MARK,String(cloud.updatedAt));
 }catch(e){console.error('Could not load the cloud save',e)}
})();
