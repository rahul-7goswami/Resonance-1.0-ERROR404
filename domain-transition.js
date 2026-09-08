/* Shared upward entry: individual exponentially decaying rebounds, ending at 1200ms. */
(() => {
  const KEY='dflow:domain-entry';
  let navigating=false;
  function navigate(href) {
    if(navigating) return;
    navigating=true;
    const url=new URL(href,location.href);
    try {sessionStorage.setItem(KEY,JSON.stringify({path:url.pathname,time:Date.now()}));} catch {}
    location.assign(url.href);
  }
  function enter(root=document) {
    if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const selector=root.body?.dataset.transitionElements || '[data-transition-item]';
    const elements=[...root.querySelectorAll(selector)].filter(el=>{const r=el.getBoundingClientRect();return r.width && r.height && r.bottom>0 && r.top<innerHeight;});
    elements.forEach((el,index)=>{
      const delay=elements.length>1 ? index/(elements.length-1)*160 : 0;
      const frames=Array.from({length:61},(_,i)=>{
        const t=i/60;
        const y=i===60 ? 0 : Math.exp(-9*t)*Math.cos(10*t)*innerHeight;
        return {transform:`translateY(${y}px)`,opacity:Math.min(1,t*7),offset:t};
      });
      const motion=el.animate(frames,{duration:1200-delay,delay,fill:'both',easing:'linear'});
      motion.finished.then(()=>motion.cancel()).catch(()=>{});
    });
  }
  window.DFlowTransition={navigate,enter,duration:1200};
  addEventListener('pageshow',()=>{navigating=false;});
  document.addEventListener('DOMContentLoaded',()=>{
    let entry;
    try {entry=JSON.parse(sessionStorage.getItem(KEY));sessionStorage.removeItem(KEY);} catch {}
    if(entry?.path===location.pathname && Date.now()-entry.time<15000) enter();
  });
})();
