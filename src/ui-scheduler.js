// Native scrolling owns the frame. Data work waits for a quiet input window.
let activeUntil=0;
const mark=()=>{activeUntil=performance.now()+140;};
if(typeof document!=='undefined'){
 document.addEventListener('scroll',mark,{passive:true,capture:true});
 document.addEventListener('touchmove',mark,{passive:true});
 document.addEventListener('wheel',mark,{passive:true});
}
export async function uiReady(){
 while(performance.now()<activeUntil)await new Promise(r=>setTimeout(r,50));
 if(globalThis.scheduler?.yield)await scheduler.yield();
 else await new Promise(r=>setTimeout(r,0));
}
