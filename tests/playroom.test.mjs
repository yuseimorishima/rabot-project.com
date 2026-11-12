import test from 'node:test';
import assert from 'node:assert/strict';
import {createState, readState, advance, interact, level, OUTFITS, drawOutfit, equipOutfit} from '../playroom-state.mjs';

test('care changes needs and unlocks friendship levels', () => {
  let state = createState(1000);
  for (let i = 0; i < 10; i++) state = interact(state, 'pet', 1000).state;
  assert.equal(state.happiness, 100); assert.equal(level(state), 2);
  assert.equal(state.diary.length, 4);
  const played = interact(state, 'play', 1000).state;
  assert.equal(played.energy, 62); assert.equal(played.care, 48);
  assert.equal(interact(played, 'charge', 1000).state.energy, 97);
});

test('legacy saves keep friendship and receive the starter wardrobe', () => {
  const {coins, owned, outfit, ...legacy} = {...createState(1000), name: 'もち', care: 88};
  legacy.version = 1;
  const restored = readState(JSON.stringify(legacy), 1000);
  assert.equal(restored.name, 'もち'); assert.equal(restored.care, 88);
  assert.equal(restored.coins, 6); assert.deepEqual(restored.owned, ['milk']); assert.equal(restored.outfit, 'milk');
});

test('gacha deducts coins, gives outfits, and refunds duplicate draws', () => {
  const first = drawOutfit(createState(1000), () => 0);
  assert.equal(first.item.id, 'sakura'); assert.equal(first.state.coins, 3);
  assert.deepEqual(first.state.owned, ['milk', 'sakura']);
  const second = drawOutfit(first.state, () => 0);
  assert.equal(second.duplicate, true); assert.equal(second.state.coins, 1);
  assert.equal(second.state.owned.length, 2);
  const blocked = drawOutfit(second.state, () => { throw Error('must not roll'); });
  assert.equal(blocked.accepted, false); assert.deepEqual(blocked.state, second.state);
  assert.equal(equipOutfit(first.state, 'sakura').outfit, 'sakura');
  assert.equal(equipOutfit(first.state, 'night').outfit, 'milk');
});

test('published gacha weights cover every outcome and sum to 100', () => {
  assert.equal(OUTFITS.reduce((sum, item) => sum + item.weight, 0), 100);
  for (const [roll, expected] of [[0, 'sakura'], [.15999, 'sakura'], [.16, 'mint'], [.32, 'sky'], [.48, 'lemon'], [.64, 'lavender'], [.72, 'peach'], [.8, 'night'], [.84, 'bunny'], [.90, 'cat'], [.96, 'bear'], [.99999, 'bear']]) {
    assert.equal(drawOutfit(createState(), () => roll).item.id, expected);
  }
});

test('clothes and coins survive reload, invalid wardrobe fields are repaired', () => {
  let state = drawOutfit(createState(1000), () => .99).state;
  state = equipOutfit(state, 'bear');
  assert.equal(state.outfit, 'bear');
  assert.deepEqual(readState(JSON.stringify(state), 1000), state);
  const repaired = readState(JSON.stringify({...state, coins: -5, owned: ['unknown'], outfit: 'night'}), 1000);
  assert.equal(repaired.coins, 0); assert.equal(repaired.outfit, 'milk'); assert.deepEqual(repaired.owned, ['milk']);
  assert.equal(interact(createState(1000), 'pet', 1000).state.coins, 7);
  assert.equal(interact(createState(1000), 'play', 1000).state.coins, 8);
  assert.equal(interact({...createState(1000), energy: 0}, 'play', 1000).state.coins, 6);
});
test('low battery stops play and charging makes it possible again', () => {
  const state = {...createState(1000), energy: 10};
  const blocked = interact(state, 'play', 1000);
  assert.equal(blocked.accepted, false); assert.equal(blocked.state.care, 0);
  const charged = interact(state, 'charge', 1000).state;
  assert.equal(interact(charged, 'play', 1000).accepted, true);
});
test('offline decay is capped, friendship persists, clocks cannot add energy', () => {
  const original = {...createState(1000), care: 80};
  const returned = advance(original, 1000 + 86400000);
  assert.equal(returned.energy, 0); assert.equal(returned.happiness, 17); assert.equal(returned.care, 80);
  assert.equal(advance(original, 0).energy, 80);
});
test('restore validates damaged saves, sanitizes ranges, and preserves progress', () => {
  const state = {...createState(1000), name: 'もち', care: 100};
  assert.deepEqual(readState(JSON.stringify(state), 1000), state);
  for (const raw of ['broken', 'null', '{}', JSON.stringify({...state, energy: null}), JSON.stringify({...state, diary: [null]})]) {
    assert.deepEqual(readState(raw, 1000), createState(1000));
  }
  const bounded = readState(JSON.stringify({...state, energy: 500, happiness: -5, care: 5000, updatedAt: 9999}), 1000);
  assert.equal(bounded.energy, 100); assert.equal(bounded.happiness, 0); assert.equal(level(bounded), 6);
});
