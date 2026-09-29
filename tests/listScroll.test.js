import test from 'node:test';
import assert from 'node:assert/strict';

import { getRevealScrollTop } from '../src/utils/listScroll.js';

// Viewport 300px, contenuto 1000px, righe da 50px con gap 10px, padding 14px.
const base = { viewportHeight: 300, scrollHeight: 1000, margin: 8 };
const row = (index, height = 50) => ({ itemTop: 14 + index * 60, itemHeight: height });

test('una riga completamente visibile nel mezzo non fa scrollare', () => {
  assert.equal(getRevealScrollTop({ ...base, scrollTop: 0, ...row(2) }), 0);
  assert.equal(getRevealScrollTop({ ...base, scrollTop: 200, ...row(5) }), 200);
});

test('scendendo oltre l\'ultima riga visibile la lista avanza il minimo con un margine', () => {
  // riga 5: top 314, bottom 364; viewport 0..300 → scrollTop = 364 + 8 - 300
  assert.equal(getRevealScrollTop({ ...base, scrollTop: 0, ...row(5) }), 72);
});

test('salendo sopra la prima riga visibile la lista risale il minimo con un margine', () => {
  // riga 4: top 254; viewport parte da 300 → scrollTop = 254 - 8
  assert.equal(getRevealScrollTop({ ...base, scrollTop: 300, ...row(4) }), 246);
});

test('con tasto premuto la riga resta sempre visibile a ogni passo', () => {
  let scrollTop = 0;
  for (let index = 0; index < 16; index += 1) {
    const { itemTop, itemHeight } = row(index);
    scrollTop = getRevealScrollTop({ ...base, scrollTop, itemTop, itemHeight, isLast: index === 15 });
    assert.ok(itemTop >= scrollTop, `riga ${index} non sotto il bordo superiore`);
    assert.ok(itemTop + itemHeight <= scrollTop + base.viewportHeight, `riga ${index} non oltre il bordo inferiore`);
  }
  for (let index = 15; index >= 0; index -= 1) {
    const { itemTop, itemHeight } = row(index);
    scrollTop = getRevealScrollTop({ ...base, scrollTop, itemTop, itemHeight, isFirst: index === 0 });
    assert.ok(itemTop >= scrollTop && itemTop + itemHeight <= scrollTop + base.viewportHeight);
  }
  assert.equal(scrollTop, 0);
});

test('prima e ultima riga si agganciano ai bordi senza overscroll', () => {
  assert.equal(getRevealScrollTop({ ...base, scrollTop: 300, itemTop: 14, itemHeight: 50, isFirst: true }), 0);
  assert.equal(getRevealScrollTop({ ...base, scrollTop: 600, itemTop: 936, itemHeight: 50, isLast: true }), 700);
  // valore mai fuori dall'intervallo scrollabile
  assert.equal(getRevealScrollTop({ ...base, scrollTop: 0, itemTop: 960, itemHeight: 50 }), 700);
});

test('le battute multilinea usano la loro altezza reale', () => {
  // riga alta 120px che parte a 214: bottom 334 → serve scrollTop 334 + 8 - 300
  assert.equal(getRevealScrollTop({ ...base, scrollTop: 0, itemTop: 214, itemHeight: 120 }), 42);
  // riga più alta del viewport: si allinea l'inizio
  assert.equal(getRevealScrollTop({ ...base, scrollTop: 0, itemTop: 400, itemHeight: 400 }), 392);
});

test('contenuto più corto del viewport non scrolla mai', () => {
  assert.equal(getRevealScrollTop({ viewportHeight: 300, scrollHeight: 200, scrollTop: 0, itemTop: 150, itemHeight: 50, isLast: true }), 0);
});
