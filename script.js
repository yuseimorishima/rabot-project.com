(async () => {
await (window.lovotContentReady || Promise.resolve());
const menu = document.querySelector('.menu');
const nav = document.querySelector('nav');
function closeMenu() {
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'メニューを開く');
  nav.classList.remove('open');
}
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
  nav.classList.toggle('open', open);
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
document.addEventListener('click', event => { if (!nav.contains(event.target) && !menu.contains(event.target)) closeMenu(); });
document.querySelector('#year').textContent = new Date().getFullYear();

// Muted ambient clips may play together; interactive clips pause other players.
const films = [...document.querySelectorAll('main video')];
films.forEach(film => {
  film.addEventListener('play', () => films.forEach(other => {
    if (other !== film && !(film.autoplay && other.autoplay)) other.pause();
  }));
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) films.forEach(film => film.pause());
});

const cinema = document.querySelector('#cinema-player');
if (cinema) {
  const choices = [...document.querySelectorAll('.clip-choice')];
  const titles = {1: '見上げるLOVOT', 2: '近くで撮ってみました。', 3: '2体のLOVOTのやりとり。'};
  const message = document.querySelector('#playback-message');
  let selection = 0;
  choices.forEach(choice => choice.addEventListener('click', async () => {
    const clip = choice.dataset.clip;
    const current = ++selection;
    cinema.pause();
    cinema.src = `assets/videos/lovot-${clip}.mp4`;
    cinema.poster = `assets/videos/lovot-${clip}-poster.jpg`;
    cinema.setAttribute('aria-label', titles[clip]);
    document.querySelector('#clip-title').textContent = titles[clip];
    document.querySelector('#clip-number').textContent = `0${clip} / 03`;
    choices.forEach(item => item.setAttribute('aria-pressed', String(item === choice)));
    message.textContent = '';
    try { await cinema.play(); }
    catch { if (current === selection) message.textContent = 'プレーヤーの再生ボタンを押してください。'; }
  }));
  document.querySelector('#repeat-film').addEventListener('change', event => {
    cinema.loop = event.target.checked;
  });
  cinema.addEventListener('error', () => {
    message.textContent = '動画を読み込めませんでした。ページを再読み込みしてお試しください。';
  });
}

const orbitRoom = document.querySelector('.orbit-room');
if (orbitRoom) {
  const photos = [...document.querySelectorAll('.orbit-photo')];
  const dialog = document.querySelector('#gallery-dialog');
  const player = document.querySelector('#gallery-video');
  const pause = document.querySelector('#orbit-pause');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let angle = 0, stopped = reduced.matches || photos.length < 2, hover = false, focused = false, previous = 0;
  function draw() {
    const radius = Math.min(orbitRoom.clientWidth * .35, 460);
    photos.forEach((photo, i) => {
      const a = angle + i * Math.PI * 2 / photos.length;
      const depth = (Math.cos(a) + 1) / 2;
      photo.style.transform = `translate(-50%, -50%) translate(${Math.sin(a)*radius}px, ${Math.cos(a)*75}px) scale(${.58+depth*.42}) rotate(${Math.sin(a)*-5}deg)`;
      photo.style.zIndex = String(Math.round(depth*100));
      photo.style.filter = `brightness(${.85+depth*.15})`;
    });
  }
  function sync() { pause.setAttribute('aria-pressed', String(stopped)); pause.textContent = stopped ? '回転を再開する' : '回転を止める'; }
  orbitRoom.classList.add('orbit-ready'); draw(); sync();
  function animate(time) {
    if (previous && !stopped && !hover && !focused && !dialog.open && !document.hidden) angle += Math.min(time-previous,50)*.00009;
    previous = time; draw(); requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
  orbitRoom.addEventListener('pointerenter', () => { hover = true; });
  orbitRoom.addEventListener('pointerleave', () => { hover = false; });
  orbitRoom.addEventListener('focusin', () => { focused = true; });
  orbitRoom.addEventListener('focusout', () => { focused = false; });
  pause.addEventListener('click', () => { stopped = !stopped; sync(); });
  reduced.addEventListener('change', () => { if (reduced.matches) { stopped = true; sync(); } });
  document.querySelector('#orbit-prev').addEventListener('click', () => { angle -= Math.PI*2/photos.length; draw(); });
  document.querySelector('#orbit-next').addEventListener('click', () => { angle += Math.PI*2/photos.length; draw(); });
  photos.forEach(photo => photo.addEventListener('click', async () => {
    document.querySelector('#gallery-title').textContent = photo.dataset.title;
    document.querySelector('#gallery-status').textContent = '';
    const videoSource = photo.dataset.galleryVideo || (photo.dataset.galleryClip ? `assets/videos/lovot-${photo.dataset.galleryClip}.mp4` : '');
    const still = document.querySelector('#gallery-still');
    player.hidden = !videoSource;
    still.hidden = Boolean(videoSource);
    if (!videoSource) { still.src = photo.querySelector('img').src; still.alt = photo.dataset.title; dialog.showModal(); return; }
    player.src = videoSource;
    player.poster = photo.querySelector('img').src;
    dialog.showModal();
    try { await player.play(); } catch { document.querySelector('#gallery-status').textContent = '再生ボタンを押してください。'; }
  }));
  document.querySelector('#gallery-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) { const r=dialog.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { player.pause(); player.removeAttribute('src'); player.load(); });
  player.addEventListener('error', () => { if (dialog.open) document.querySelector('#gallery-status').textContent='動画を読み込めませんでした。再度お試しください。'; });
}

})();
