import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { translate } from '../src/i18n/index.js';
import { buildMenuLabels, MENU_ITEM_KEYS, MENU_TITLE_KEYS } from '../src/utils/nativeMenu.js';

const mainRs = readFileSync(new URL('../src-tauri/src/main.rs', import.meta.url), 'utf8');

test('native menu: every menu and item id exists in main.rs', () => {
  MENU_TITLE_KEYS.forEach((key) => assert.ok(mainRs.includes(`"${key}"`), key));
  MENU_ITEM_KEYS.forEach((key) => assert.ok(mainRs.includes(`"${key.replace(/^menu\./, '')}"`), key));
});

test('native menu: labels follow the interface language', () => {
  const en = buildMenuLabels((key) => translate('en', key));
  assert.equal(en['menu.edit'], 'Edit');
  assert.equal(en['edit.undo'], 'Undo');
  assert.equal(en['app.quit'], 'Quit Sténtor Lite');
  const de = buildMenuLabels((key) => translate('de', key));
  assert.equal(de['menu.file'], 'Ablage');
  Object.values(de).forEach((text) => assert.ok(text && !text.startsWith('menu.'), text));
});
