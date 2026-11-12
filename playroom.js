import {STORAGE_KEY, createState, readState, advance, level, mood, interact, OUTFITS, DRAW_COST, drawOutfit, equipOutfit} from './playroom-state.mjs';

const $ = selector => document.querySelector(selector);
const scene = $('.room-scene'), buttons = [...document.querySelectorAll('[data-action]'), $('#pet')];
let state, busy = false, reactionTimer;
let lastDrawn = null;
try { state = readState(localStorage.getItem(STORAGE_KEY)); }
catch { state = createState(); }
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $('#save-status').textContent = '育成のきろくは、このブラウザに自動保存されます。';
  } catch { $('#save-status').textContent = 'このブラウザでは保存できません。今は、このページを開いている間だけ遊べます。'; }
}
function render() {
  const currentLevel = level(state);
  $('#pet-name').textContent = state.name;
  $('#pet').setAttribute('aria-label', `${state.name}をなでる`);
  $('#bond-label').textContent = `なかよし Lv.${currentLevel} · ${['はじめまして', '気になるきみ', 'なかよし', 'いつもいっしょ', 'だいすき', 'かけがえのない相棒'][currentLevel - 1]}`;
  const progress = currentLevel === 6 ? 40 : state.care % 40;
  $('#bond').value = progress;
  $('#bond-value').textContent = currentLevel === 6 ? 'ずっと、なかよし' : `${progress} / 40`;
  for (const key of ['energy', 'happiness']) {
    $(`#${key}`).value = state[key];
    $(`#${key}-value`).textContent = `${Math.round(state[key])} / 100`;
  }
  $('#mood').textContent = mood(state);
  $('#diary').replaceChildren(...state.diary.map(line => { const li = document.createElement('li'); li.textContent = line; return li; }));
  const outfit = OUTFITS.find(item => item.id === state.outfit);
  $('.room-character').style.setProperty('--outfit', outfit.color);
  $('.room-character').dataset.pattern = outfit.pattern;
  $('#coin-count').textContent = state.coins;
  $('#wearing-label').textContent = `いまの服：${outfit.name}`;
  $('#collection-count').textContent = `${state.owned.length} / ${OUTFITS.length}`;
  $('#draw-outfit').disabled = state.coins < DRAW_COST;
  // Keep the same buttons so keyboard focus survives a wardrobe change.
  document.querySelectorAll('[data-outfit]').forEach(button => {
    const owned = state.owned.includes(button.dataset.outfit), active = state.outfit === button.dataset.outfit;
    button.disabled = !owned; button.setAttribute('aria-pressed', String(active));
    button.querySelector('.outfit-state').textContent = active ? '着用中' : owned ? '着せる' : 'まだ出会っていない';
  });
}
for (const item of OUTFITS) {
  const button = document.createElement('button'); button.type = 'button'; button.dataset.outfit = item.id;
  const swatch = document.createElement('span'); swatch.className = 'outfit-swatch'; swatch.style.setProperty('--outfit', item.color); swatch.dataset.pattern = item.pattern; swatch.setAttribute('aria-hidden', 'true');
  const name = document.createElement('span'); name.textContent = item.name;
  const rarity = document.createElement('small'); rarity.textContent = item.rarity;
  const status = document.createElement('small'); status.className = 'outfit-state';
  button.append(swatch, name, rarity, status);
  button.addEventListener('click', () => { state = equipOutfit(state, item.id); render(); save(); $('#room-message').textContent = `${item.name}、似合ってるかな？`; });
  $('#outfit-grid').append(button);
  if (item.weight) { const li = document.createElement('li'); li.textContent = `${item.name}（${item.rarity}） ${item.weight}%`; $('#gacha-odds').append(li); }
}
$('#draw-outfit').addEventListener('click', () => {
  const result = drawOutfit(state); state = result.state; render(); save();
  $('#gacha-result').textContent = result.message;
  if (result.accepted) {
    lastDrawn = result.item.id;
    $('#wear-new').hidden = false;
    $('#wear-new').textContent = `${result.item.name}を着せる`;
    $('.gacha-box').dataset.rarity = result.item.rarity;
  }
});
$('#wear-new').addEventListener('click', () => {
  if (!lastDrawn || !state.owned.includes(lastDrawn)) return;
  state = equipOutfit(state, lastDrawn); render(); save();
  $('#room-message').textContent = 'お着替えしたよ。どうかな？';
});
function act(action) {
  if (busy) return;
  const result = interact(state, action); state = result.state;
  $('#room-message').textContent = result.message;
  render(); save();
  if (!result.accepted) return;
  busy = true; buttons.forEach(button => { button.disabled = true; });
  delete scene.dataset.reaction;
  void scene.offsetWidth;
  scene.dataset.reaction = action;
  $('#reaction').textContent = {pet: '♡', play: '✧', charge: 'zz…'}[action];
  clearTimeout(reactionTimer);
  reactionTimer = setTimeout(() => { delete scene.dataset.reaction; busy = false; buttons.forEach(button => { button.disabled = false; }); }, 800);
}
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => act(button.dataset.action)));
$('#pet').addEventListener('click', () => act('pet'));
$('#rename').addEventListener('click', () => { $('#new-name').value = state.name; $('#name-dialog').showModal(); });
$('#name-form').addEventListener('submit', event => {
  event.preventDefault();
  const input = $('#new-name'), name = input.value.trim();
  if (!name) { input.setCustomValidity('名前を入力してね。'); input.reportValidity(); return; }
  state.name = name.slice(0, 12); render(); save(); $('#name-dialog').close();
  $('#room-message').textContent = `${state.name}。すてきな名前をありがとう。`;
});
$('#new-name').addEventListener('input', event => event.target.setCustomValidity(''));
$('#reset').addEventListener('click', () => $('#reset-dialog').showModal());
$('#reset-form').addEventListener('submit', event => {
  event.preventDefault(); state = createState(); render(); save(); $('#reset-dialog').close();
  lastDrawn = null; $('#wear-new').hidden = true;
  $('#gacha-result').textContent = 'はじめのコイン6枚をプレゼント。';
  $('#room-message').textContent = 'はじめまして。そばにいてもいい？';
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
// Reconcile elapsed time on return, without timers punishing an inactive tab.
document.addEventListener('visibilitychange', () => { if (!document.hidden) { state = advance(state); render(); save(); } });
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY) return;
  state = readState(event.newValue); render();
  $('#room-message').textContent = '別のタブのきろくに合わせたよ。';
});
setInterval(() => { if (!document.hidden) { state = advance(state); render(); save(); } }, 60000);
render(); save();
