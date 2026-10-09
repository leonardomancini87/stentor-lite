import test from 'node:test';
import assert from 'node:assert/strict';

import { fitCoverSize, isStorageQuotaError, shrinkCoverImage } from '../src/utils/coverImage.js';

test('cover image: the long side is reduced to the maximum, proportions kept', () => {
  assert.deepEqual(fitCoverSize(4000, 3000), { width: 640, height: 480 });
  assert.deepEqual(fitCoverSize(1080, 1920), { width: 360, height: 640 });
  assert.deepEqual(fitCoverSize(300, 200), { width: 300, height: 200 });
});

test('cover image: storage-full errors are recognised in every engine', () => {
  assert.equal(isStorageQuotaError({ name: 'QuotaExceededError' }), true);
  assert.equal(isStorageQuotaError({ code: 22 }), true);
  assert.equal(isStorageQuotaError(new Error('The quota has been exceeded.')), true);
  assert.equal(isStorageQuotaError(new Error('image')), false);
  assert.equal(isStorageQuotaError(null), false);
});

test('cover image: without a page the image is returned unchanged', async () => {
  assert.equal(await shrinkCoverImage('data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA');
});
