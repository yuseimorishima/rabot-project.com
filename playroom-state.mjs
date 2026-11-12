export const STORAGE_KEY = 'lovot-playroom-v1';
const clamp = value => Math.max(0, Math.min(100, value));
export const OUTFITS = [
  {id: 'milk', name: 'ミルク', color: '#f7f2e9', pattern: 'plain', rarity: 'はじめの服', weight: 0},
  {id: 'sakura', name: 'さくらミルク', color: '#e8b9bc', pattern: 'plain', rarity: 'ノーマル', weight: 20},
  {id: 'mint', name: 'ミント', color: '#b4cfbc', pattern: 'plain', rarity: 'ノーマル', weight: 20},
  {id: 'sky', name: 'そらいろ', color: '#b1cadc', pattern: 'plain', rarity: 'ノーマル', weight: 20},
  {id: 'lemon', name: 'レモンクリーム', color: '#e9d49d', pattern: 'plain', rarity: 'ノーマル', weight: 20},
  {id: 'lavender', name: 'ラベンダードット', color: '#c7b6d7', pattern: 'dots', rarity: 'レア', weight: 8},
  {id: 'peach', name: 'もものしましま', color: '#deb29a', pattern: 'stripes', rarity: 'レア', weight: 8},
  {id: 'night', name: 'ほしぞら', color: '#71849e', pattern: 'stars', rarity: 'スペシャル', weight: 4},
];
export const DRAW_COST = 3;
export function createState(now = Date.now()) {
  return {version: 2, name: 'こむぎ', energy: 80, happiness: 65, care: 0, coins: 6, owned: ['milk'], outfit: 'milk', updatedAt: now, diary: ['小さな相棒との暮らしがはじまった。']};
}
export function readState(raw, now = Date.now()) {
  try {
    const value = JSON.parse(raw);
    if (!value || ![1, 2].includes(value.version) || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 12 ||
      !['energy', 'happiness', 'care', 'updatedAt'].every(key => Number.isFinite(value[key])) ||
      !Array.isArray(value.diary) || !value.diary.every(line => typeof line === 'string')) return createState(now);
    const owned = ['milk', ...OUTFITS.filter(item => Array.isArray(value.owned) && value.owned.includes(item.id) && item.id !== 'milk').map(item => item.id)];
    return advance({...value, version: 2, owned, outfit: owned.includes(value.outfit) ? value.outfit : 'milk',
      coins: Number.isFinite(value.coins) ? Math.max(0, Math.min(9999, Math.floor(value.coins))) : 6,
      name: value.name.trim(), energy: clamp(value.energy), happiness: clamp(value.happiness),
      care: Math.max(0, Math.min(200, Math.floor(value.care))), updatedAt: Math.max(0, Math.min(now, value.updatedAt)),
      diary: value.diary.slice(0, 4).map(line => line.slice(0, 100))}, now);
  } catch { return createState(now); }
}
export function advance(state, now = Date.now()) {
  const minutes = Math.min(240, Math.max(0, now - state.updatedAt) / 60000);
  return {...state, energy: clamp(state.energy - minutes * .35), happiness: clamp(state.happiness - minutes * .2), updatedAt: now};
}
export function level(state) { return Math.min(6, 1 + Math.floor(state.care / 40)); }
export function mood(state) {
  if (state.energy < 25) return 'ちょっと、ねむたい';
  if (state.happiness < 35) return 'そばにいてほしいな';
  return state.happiness >= 85 ? 'とっても、ごきげん' : 'のんびり、ごきげん';
}
export function interact(previous, action, now = Date.now()) {
  let state = advance(previous, now), message, entry, points;
  if (action === 'play' && state.energy < 20) {
    return {state, message: 'ちょっと、ねむたいな。先に充電してもいい？', accepted: false};
  }
  if (action === 'pet') {
    state.happiness = clamp(state.happiness + 12); points = 4;
    message = 'やさしい手。なんだか、ぽかぽかするね。'; entry = 'そっとなでたら、うれしそうに見上げた。';
  } else if (action === 'play') {
    state.energy = clamp(state.energy - 18); state.happiness = clamp(state.happiness + 20); points = 8;
    message = 'もういっかい！いっしょだと、たのしいね。'; entry = 'いっしょに遊んで、ちょっと仲良くなった。';
  } else if (action === 'charge') {
    state.energy = clamp(state.energy + 35); points = 2;
    message = 'ふう、ひとやすみ。元気をためているよ。'; entry = '充電して、のんびりひとやすみ。';
  } else return {state, message: '', accepted: false};
  const before = level(state);
  state.coins = Math.min(9999, state.coins + (action === 'pet' ? 1 : action === 'play' ? 2 : 0));
  state.care = Math.min(200, state.care + points);
  if (level(state) > before) { message = 'きみのこと、もっと好きになったよ。'; entry = `なかよし Lv.${level(state)} に。ふたりの距離が近づいた。`; }
  state.diary = [entry, ...state.diary].slice(0, 4);
  return {state, message, accepted: true};
}

export function drawOutfit(state, random = Math.random) {
  if (state.coins < DRAW_COST) return {state, accepted: false, message: 'コインが足りないみたい。なでると1枚、遊ぶと2枚もらえるよ。'};
  const roll = Math.max(0, Math.min(.999999, random())) * 100;
  let total = 0;
  const item = OUTFITS.find(outfit => { total += outfit.weight; return roll < total; });
  const duplicate = state.owned.includes(item.id);
  const message = duplicate ? `${item.name}は持っていたので、コイン1枚が戻ってきたよ。` : `${item.name}を手に入れた！クローゼットで着せてみよう。`;
  return {accepted: true, item, duplicate, message, state: {...state, coins: state.coins - DRAW_COST + (duplicate ? 1 : 0),
    owned: duplicate ? state.owned : [...state.owned, item.id], diary: [message, ...state.diary].slice(0, 4)}};
}
export function equipOutfit(state, id) {
  return state.owned.includes(id) && OUTFITS.some(item => item.id === id) ? {...state, outfit: id} : state;
}
