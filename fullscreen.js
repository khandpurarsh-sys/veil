(()=>{
 const button=document.createElement('button');button.id='fullscreenToggle';button.type='button';button.textContent='Full screen';button.setAttribute('aria-label','Enter full screen');
 button.style.cssText='font-size:11px;padding:8px 12px;border:1px solid #444;border-radius:6px;background:#000;color:#ccc;cursor:pointer';
 const header=document.querySelector('header');if(header)header.append(button);else document.body.prepend(button);
 const update=()=>{button.textContent=document.fullscreenElement?'Exit full screen':'Full screen';button.setAttribute('aria-label',button.textContent);};
 const request=async()=>{if(!document.documentElement.requestFullscreen){button.textContent='Install for full screen';return;}try{await document.documentElement.requestFullscreen({navigationUI:'hide'});update();}catch{button.textContent='Tap for full screen';}};
 button.addEventListener('click',async e=>{e.stopPropagation();if(document.fullscreenElement){await document.exitFullscreen();update();}else await request();});
 document.addEventListener('fullscreenchange',update);
 document.addEventListener('click',()=>{if(!document.fullscreenElement&&!matchMedia('(display-mode: fullscreen)').matches)void request();},{once:true});
})();
