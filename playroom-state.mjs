export const STORAGE_KEY = 'lovot-playroom-v1';
const clamp = value => Math.max(0, Math.min(100, value));
export function createState(now = Date.now()) {
  return {version: 1, name: 'こむぎ', energy: 80, happiness: 65, care: 0, updatedAt: now, diary: ['小さな相棒との暮らしがはじまった。']};
}
export function readState(raw, now = Date.now()) {
  try {
    const value = JSON.parse(raw);
    if (!value || value.version !== 1 || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 12 ||
      !['energy', 'happiness', 'care', 'updatedAt'].every(key => Number.isFinite(value[key])) ||
      !Array.isArray(value.diary) || !value.diary.every(line => typeof line === 'string')) return createState(now);
    return advance({...value, name: value.name.trim(), energy: clamp(value.energy), happiness: clamp(value.happiness),
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
  state.care = Math.min(200, state.care + points);
  if (level(state) > before) { message = 'きみのこと、もっと好きになったよ。'; entry = `なかよし Lv.${level(state)} に。ふたりの距離が近づいた。`; }
  state.diary = [entry, ...state.diary].slice(0, 4);
  return {state, message, accepted: true};
}
