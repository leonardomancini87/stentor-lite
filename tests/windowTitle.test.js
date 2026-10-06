import test from 'node:test';
import assert from 'node:assert/strict';

import { getWindowTitle, isMacPlatform } from '../src/utils/windowTitle.js';

test('titolo della finestra: su Mac solo il nome del progetto', () => {
  assert.equal(getWindowTitle('Macbett', { mac: true }), 'Macbett');
});

test('titolo della finestra: su Windows e Linux anche il nome dell\'app', () => {
  assert.equal(getWindowTitle('Macbett', { mac: false }), 'Macbett — Sténtor Lite');
});

test('titolo della finestra: progetto senza titolo', () => {
  assert.equal(getWindowTitle('  ', { mac: true, untitled: 'Senza titolo' }), 'Senza titolo');
  assert.equal(getWindowTitle('', { mac: false }), 'Sténtor Lite');
});

test('titolo della finestra: riconosce il Mac', () => {
  assert.equal(isMacPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), true);
  assert.equal(isMacPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), false);
});
