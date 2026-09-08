/* Shared theme preference and video-coordinate branding. */
(() => {
  let saved;
  try { saved=localStorage.getItem('dflow:theme'); } catch {}
  const system=matchMedia('(prefers-color-scheme: dark)');
  const apply=theme=>{
    document.documentElement.dataset.theme=theme;
    document.querySelectorAll('.theme-toggle').forEach(button=>{
      button.textContent=theme==='dark'?'☀ Light mode':'☾ Dark mode';
      button.setAttribute('aria-label',theme==='dark'?'Switch to light mode':'Switch to dark mode');
      button.setAttribute('aria-pressed',String(theme==='dark'));
    });
  };
  apply(saved==='dark'||saved==='light'?saved:system.matches?'dark':'light');
  system.addEventListener('change',event=>{if(!saved)apply(event.matches?'dark':'light');});
  addEventListener('storage',event=>{if(event.key==='dflow:theme'){saved=event.newValue;apply(saved|| (system.matches?'dark':'light'));}});
  document.addEventListener('DOMContentLoaded',()=>{
    let header=document.querySelector('body > header');
    if(!header){header=document.createElement('div');header.className='hero-theme-bar';document.body.append(header);}
    const button=document.createElement('button');button.type='button';button.className='theme-toggle';
    button.onclick=()=>{saved=document.documentElement.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('dflow:theme',saved);}catch{}apply(saved);};
    header.append(button);apply(document.documentElement.dataset.theme);
    const video=document.querySelector('#backdrop-video'),badge=document.querySelector('.video-brand');
    if(video&&badge){
      const position=()=>{
        if(!video.videoWidth)return;
        const rect=video.getBoundingClientRect();
        const scale=Math.max(rect.width/video.videoWidth,rect.height/video.videoHeight);
        // Watermark center measured in the source frame: (1740,900) of 1920x1080.
        const x=rect.left+(rect.width-video.videoWidth*scale)/2+video.videoWidth*(1740/1920)*scale;
        const y=rect.top+(rect.height-video.videoHeight*scale)/2+video.videoHeight*(900/1080)*scale;
        badge.style.left=x+'px';badge.style.top=y+'px';badge.style.right='auto';badge.style.bottom='auto';
        badge.style.width=Math.max(150,170*scale)+'px';badge.style.height=Math.max(64,100*scale)+'px';
        badge.style.transform='translate(-50%,-50%)';badge.style.visibility='visible';
      };
      video.addEventListener('loadedmetadata',position);new ResizeObserver(position).observe(video);position();
    }
  });
})();
