import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cssSource = readFileSync(new URL('../src/styles/app.css', import.meta.url), 'utf8');

test('lite cue list: overrides inherited Regia grid gap so compact cues are truly contiguous', () => {
  assert.match(cssSource, /\.workspace\.liteRegiaWorkspace \.liteEditableCueList\s*\{[\s\S]*?gap:\s*0\s*!important;[\s\S]*?row-gap:\s*0\s*!important;/);
});

test('lite cue list: compact rows have no vertical margins and keep a small radius', () => {
  assert.match(cssSource, /\.workspace\.liteRegiaWorkspace \.liteEditableCueList \.regiaLiveCueListRow\s*\{[\s\S]*?margin-top:\s*0\s*!important;[\s\S]*?margin-bottom:\s*0\s*!important;[\s\S]*?border-radius:\s*5px\s*!important;/);
});
