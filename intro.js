(() => {
  const key = 'kinako-welcome-seen';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let seen = false, closeActive = null;
  try { seen = sessionStorage.getItem(key) === '1'; } catch {}
  function openWelcome() {
    if (closeActive || reduced.matches) return;
    const previousFocus = document.activeElement;
    const overlay = document.createElement('section');
    overlay.className = 'kinako-intro';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'きなこがお出迎え');
    overlay.innerHTML = '<div class="kinako-intro-label">LOVOTと暮らす。</div><div class="kinako-intro-frame"><video muted playsinline preload="auto" poster="assets/videos/kinako-welcome-poster.jpg" aria-label="きなこが2回瞬きをして、両手を上げる映像"><source src="assets/videos/kinako-welcome.mp4" type="video/mp4"></video></div><p class="kinako-intro-name">きなこ</p><p class="kinako-intro-status" role="status">きなこがお出迎え。</p><button class="kinako-start" hidden>再生して入る</button><button class="kinako-skip">スキップして入る ↗</button>';
    const protectedNodes = [...document.body.children].filter(el => !['SCRIPT','STYLE','LINK'].includes(el.tagName));
    const inertState = protectedNodes.map(el=>el.inert);
    protectedNodes.forEach(el=>{el.inert=true;});
    const overflow = document.body.style.overflow;
    document.body.style.overflow='hidden';
    document.body.append(overlay);
    const video=overlay.querySelector('video'), skip=overlay.querySelector('.kinako-skip'), start=overlay.querySelector('.kinako-start');
    let leaving=false, timer, fallback;
    function close() {
      if(leaving)return; leaving=true;
      clearTimeout(timer); clearTimeout(fallback); video.pause();
      try { sessionStorage.setItem(key,'1'); } catch {}
      overlay.classList.add('is-leaving');
      document.removeEventListener('keydown', onKey);
      reduced.removeEventListener('change', onPreference);
      setTimeout(()=>{
        overlay.remove(); document.body.style.overflow=overflow;
        protectedNodes.forEach((el,i)=>{el.inert=inertState[i];});
        closeActive=null;
        if(previousFocus && previousFocus !== document.body && previousFocus.isConnected) previousFocus.focus({preventScroll:true});
        else {const main=document.querySelector('main');main.setAttribute('tabindex','-1');main.focus({preventScroll:true});}
      },350);
    }
    closeActive=close;
    function onKey(e){
      if(e.key==='Escape')close();
      if(e.key==='Tab'){
        const controls=[start,skip].filter(el=>!el.hidden);
        if(e.shiftKey&&document.activeElement===controls[0]){e.preventDefault();controls.at(-1).focus();}
        else if(!e.shiftKey&&document.activeElement===controls.at(-1)){e.preventDefault();controls[0].focus();}
      }
    }
    function onPreference(){if(reduced.matches)close();}
    document.addEventListener('keydown',onKey);reduced.addEventListener('change',onPreference);
    skip.addEventListener('click',close);skip.focus({preventScroll:true});
    video.addEventListener('timeupdate',()=>{
      if(video.currentTime>=.95)overlay.classList.add('is-wide');
      if(video.currentTime>=1.8)overlay.classList.add('is-greeting');
    });
    video.addEventListener('ended',()=>{overlay.querySelector('.kinako-intro-status').textContent='ようこそ。';timer=setTimeout(close,400);});
    video.addEventListener('error',close);
    video.addEventListener('playing',()=>{start.hidden=true;});
    async function play(){try{await video.play();}catch{start.hidden=false;overlay.querySelector('.kinako-intro-status').textContent='再生するか、スキップして入れます。';}}
    start.addEventListener('click',play);
    fallback=setTimeout(close,12000);
    play();
  }
  document.querySelectorAll('[data-replay-welcome]').forEach(button=>button.addEventListener('click',openWelcome));
  if(!seen || new URLSearchParams(location.search).get('intro')==='1')openWelcome();
})();
