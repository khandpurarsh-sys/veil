(()=>{
 let inFlight=false,needsGesture=true;
 async function enter(){if(inFlight||document.hidden||document.fullscreenElement||!document.documentElement.requestFullscreen)return;inFlight=true;try{await document.documentElement.requestFullscreen({navigationUI:'hide'});needsGesture=false;}catch{needsGesture=true;}finally{inFlight=false;}}
 for(const event of ['pointerup','touchend','keydown'])document.addEventListener(event,e=>{if(e.target?.closest?.('#installVeil'))return;if(needsGesture)void enter();},{passive:true});
 document.addEventListener('fullscreenchange',()=>{needsGesture=!document.fullscreenElement;});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){needsGesture=true;void enter();}});
 window.addEventListener('pageshow',()=>{needsGesture=true;void enter();});
})();
(()=>{
 let deferred;
 const installed=()=>matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;
 const button=document.createElement('button');button.id='installVeil';button.type='button';button.textContent='Install Veil';
 button.style.cssText='font-size:11px;padding:8px 12px;border:1px solid #777;border-radius:6px;background:#111;color:#eee;cursor:pointer';
 const guide=document.createElement('p');guide.id='installGuide';guide.hidden=true;guide.style.cssText='font-size:12px;color:#aaa;line-height:1.6;margin:12px 0';guide.setAttribute('role','status');
 const header=document.querySelector('header');(header||document.body).append(button);(document.querySelector('main')||document.body).prepend(guide);
 const sync=()=>{button.hidden=installed();};sync();
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;button.hidden=false;});
 window.addEventListener('appinstalled',()=>{deferred=null;button.hidden=true;guide.hidden=false;guide.textContent='Veil installed. Open the silver Veil icon from your home screen.';});
 button.onclick=async()=>{
  if(deferred){const event=deferred;deferred=null;try{await event.prompt();const choice=await event.userChoice;if(choice.outcome==='accepted'){guide.hidden=false;guide.textContent='Installation requested. Open the silver Veil icon from your home screen.';}}catch{guide.hidden=false;guide.textContent='Open this page in Chrome, then tap ⋮ > Add to Home screen > Install.';}return;}
  guide.hidden=false;guide.textContent=/iPad|iPhone|iPod/.test(navigator.userAgent)?'In Safari, tap Share > Add to Home Screen > Add.':'Open this page in Chrome. Tap ⋮ > Add to Home screen > Install, then open the silver Veil icon. If Chrome says Already installed, open that icon. Create shortcut opens a browser tab instead.';
 };
})();
