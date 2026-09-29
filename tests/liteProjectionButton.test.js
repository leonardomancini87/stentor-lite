import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const projectionSource = readFileSync(new URL('../src/hooks/useProjection.js', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../src/styles/app.css', import.meta.url), 'utf8');

test('lite projection button: Sottotitoli conductor bar exposes Apri proiezione at the far right', () => {
  const navStart = appSource.indexOf('<nav className="liteRegiaConductorBar"');
  const navEnd = appSource.indexOf('</nav>', navStart);
  const nav = appSource.slice(navStart, navEnd);
  assert.ok(navStart >= 0 && navEnd > navStart);
  // I testi passano dalle chiavi di traduzione (src/i18n).
  assert.match(nav, /conductor\.blackout/);
  assert.match(nav, /className="liteConductorButton projection"/);
  assert.match(nav, /<Monitor \/> <span>\{ui\('conductor\.projection'\)\}<\/span>/);
  assert.match(nav, /aria-label=\{ui\('conductor\.projection\.aria'\)\}/);
  assert.ok(nav.indexOf('conductor.blackout') < nav.indexOf('conductor.projection.aria'));
});

test('lite projection button: opens the projection window through the shared projection hook', () => {
  assert.match(appSource, /onClick=\{\(\) => projection\.openScreen\(\)\}/);
  assert.match(appSource, /useProjection\(\{/);
  assert.equal(appSource.includes('window.open('), false);
});

test('lite projection button: public stage uses a stable named window so repeated opens reuse the same output', () => {
  assert.match(projectionSource, /`stentore-public-stage-\$\{screenId\}`/);
  assert.match(projectionSource, /stageWindow\.focus\(\)/);
  assert.match(projectionSource, /public-stage\.html\?/);
});

test('lite projection button: conductor layout has five columns and projection gets a distinct non-primary style', () => {
  assert.match(cssSource, /liteConductorButton\.projection/);
  assert.match(cssSource, /minmax\(165px, 1\.35fr\)/);
});
