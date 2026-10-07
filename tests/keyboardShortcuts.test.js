import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignBinding, bindingFromEvent, formatBinding, getDefaultShortcuts, isCustomized,
  loadShortcuts, matchShortcut, normalizeShortcuts, removeBinding, saveShortcuts,
} from '../src/utils/keyboardShortcuts.js';

const key = (code, extra = {}) => ({ code, shiftKey: false, metaKey: false, ctrlKey: false, altKey: false, ...extra });

test('i tasti predefiniti corrispondono ai comandi di sempre', () => {
  const s = getDefaultShortcuts();
  assert.equal(matchShortcut(key('Space'), s), 'next');
  assert.equal(matchShortcut(key('ArrowRight'), s), 'next');
  assert.equal(matchShortcut(key('Space', { shiftKey: true }), s), 'previous');
  assert.equal(matchShortcut(key('ArrowLeft'), s), 'previous');
  assert.equal(matchShortcut(key('KeyB'), s), 'blackout');
  assert.equal(matchShortcut(key('KeyF'), s), 'fullscreen');
  assert.equal(matchShortcut(key('ArrowDown'), s), 'browseNext');
  assert.equal(matchShortcut(key('ArrowDown'), s, { inEditor: false }), null);
  assert.equal(matchShortcut(key('KeyZ', { metaKey: true }), s), null);
});

test('assegnare un tasto già usato lo toglie dall’altra azione', () => {
  const { shortcuts, movedFrom } = assignBinding(getDefaultShortcuts(), 'blackout', 0, { code: 'Space' });
  assert.equal(movedFrom.id, 'next');
  assert.deepEqual(shortcuts.next, [{ code: 'ArrowRight' }, { code: 'PageDown' }]);
  assert.deepEqual(shortcuts.blackout, [{ code: 'Space' }]);
  assert.equal(matchShortcut(key('Space'), shortcuts), 'blackout');
});

test('secondo tasto, rimozione e ripristino', () => {
  let s = assignBinding(getDefaultShortcuts(), 'blackout', 1, { code: 'KeyN' }).shortcuts;
  assert.deepEqual(s.blackout, [{ code: 'KeyB' }, { code: 'KeyN' }]);
  assert.equal(isCustomized(s), true);
  s = removeBinding(s, 'blackout', 1);
  assert.equal(isCustomized(s), false);
});

test('tasti riservati e combinazioni di sistema non si assegnano', () => {
  assert.equal(bindingFromEvent(key('Escape')), null);
  assert.equal(bindingFromEvent(key('Tab')), null);
  assert.equal(bindingFromEvent(key('KeyS', { metaKey: true })), null);
  assert.deepEqual(bindingFromEvent(key('KeyN', { shiftKey: true })), { code: 'KeyN', shift: true });
});

test('dati salvati rovinati tornano ai predefiniti; niente duplicati', () => {
  assert.deepEqual(normalizeShortcuts(null), getDefaultShortcuts());
  const s = normalizeShortcuts({ next: [{ code: 'KeyB' }], blackout: [{ code: 'KeyB' }], fullscreen: 'x' });
  assert.deepEqual(s.next, [{ code: 'KeyB' }]);
  assert.deepEqual(s.blackout, []);
  assert.deepEqual(s.fullscreen, [{ code: 'KeyF' }]);
});

test('salvataggio e lettura', () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const s = assignBinding(getDefaultShortcuts(), 'next', 0, { code: 'PageDown' }).shortcuts;
  saveShortcuts(s, storage);
  assert.deepEqual(loadShortcuts(storage).next[0], { code: 'PageDown' });
});

test('etichette leggibili', () => {
  assert.equal(formatBinding({ code: 'Space', shift: true }), '⇧ Spazio');
  assert.equal(formatBinding({ code: 'KeyB' }), 'B');
  assert.equal(formatBinding({ code: 'ArrowRight' }), '→');
});

test('i telecomandi da presentazione funzionano senza configurare nulla', () => {
  const shortcuts = getDefaultShortcuts();
  assert.equal(matchShortcut(key('PageDown'), shortcuts), 'next');
  assert.equal(matchShortcut(key('PageUp'), shortcuts), 'previous');
});
