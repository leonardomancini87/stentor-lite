import test from 'node:test';
import assert from 'node:assert/strict';

import { MAX_CARDS, addCard, getCards, removeCard, updateCard } from '../src/utils/showCards.js';
import { buildProjectionPayload } from '../src/utils/projectionTargets.js';

test('cartelli: aggiunta, modifica ed eliminazione restano nelle impostazioni del progetto', () => {
  let settings = { publicFontSize: '72px' };
  assert.deepEqual(getCards(settings), []);
  settings = addCard(settings, '  Intervallo \r\n 20 minuti  ');
  settings = addCard(settings, 'Antigone');
  assert.deepEqual(getCards(settings).map((card) => card.text), ['Intervallo\n20 minuti', 'Antigone']);
  assert.equal(settings.publicFontSize, '72px');
  const [first, second] = getCards(settings);
  assert.notEqual(first.id, second.id);
  settings = updateCard(settings, first.id, 'Intervallo');
  assert.equal(getCards(settings)[0].text, 'Intervallo');
  // Un testo vuoto non lascia un cartello vuoto.
  assert.equal(getCards(addCard(settings, '   ')).length, 2);
  assert.equal(getCards(updateCard(settings, second.id, '')).length, 1);
  settings = removeCard(settings, first.id);
  assert.deepEqual(getCards(settings).map((card) => card.text), ['Antigone']);
  // Un cartello nuovo non riusa l'identificativo di uno esistente.
  const ids = getCards(addCard(settings, 'Fine')).map((card) => card.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('cartelli: dati rovinati o in eccesso non rompono nulla', () => {
  assert.deepEqual(getCards({ cards: 'x' }), []);
  assert.deepEqual(getCards({ cards: [null, { text: '' }, { id: 'a', text: 'Uno' }, { id: 'a', text: 'Doppione' }] }).map((card) => card.text), ['Uno']);
  let settings = {};
  for (let i = 0; i < MAX_CARDS + 3; i += 1) settings = addCard(settings, `Cartello ${i}`);
  assert.equal(getCards(settings).length, MAX_CARDS);
});

test('cartelli: in onda il cartello sostituisce battuta e buio su ogni schermo', () => {
  const payload = buildProjectionPayload({
    cue: { id: 'c1', translations: { it: 'Una battuta', en: 'A line' } },
    screen: { id: 'sala', name: 'Sala', publicLanguage: 'en' },
    activeLanguage: 'it',
    languages: ['it', 'en'],
    blackout: true,
    cardText: 'Intervallo',
  });
  assert.equal(payload.text, 'Intervallo');
  assert.equal(payload.card, true);
  assert.equal(payload.blackout, false);
  assert.equal(payload.secondText, '');
});
