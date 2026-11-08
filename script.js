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

// Play only one clip at a time; video playback stays under the visitor's control.
const films = [...document.querySelectorAll('video')];
films.forEach(film => {
  film.addEventListener('play', () => films.forEach(other => { if (other !== film) other.pause(); }));
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) films.forEach(film => film.pause());
});
