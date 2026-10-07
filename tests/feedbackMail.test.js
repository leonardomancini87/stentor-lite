import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFeedbackEmail, createEmptyFeedback, describePlatform, hasFeedbackAnswers, FEEDBACK_EMAIL } from '../src/utils/feedbackMail.js';

test('feedback: vuoto finché non si risponde', () => {
  assert.equal(hasFeedbackAnswers(createEmptyFeedback()), false);
  assert.equal(hasFeedbackAnswers({ ...createEmptyFeedback(), improve: '  ' }), false);
  assert.equal(hasFeedbackAnswers({ ...createEmptyFeedback(), overall: 4 }), true);
  assert.equal(hasFeedbackAnswers({ ...createEmptyFeedback(), contexts: ['shows'] }), true);
});

test('feedback: email in italiano con risposte chiuse e aperte', () => {
  const answers = { ...createEmptyFeedback(), overall: 4, ease: 5, recommend: 'yes', contexts: ['shows', 'festivals'], feature: 'live', improve: 'Più scorciatoie & colori' };
  const { subject, body, mailto } = buildFeedbackEmail(answers, { version: '0.7.0', language: 'en', platform: 'macOS · Safari' });
  assert.equal(subject, 'Feedback Sténtor Lite 0.7.0');
  assert.match(body, /Gradimento complessivo: ★★★★☆ \(4\/5\)/);
  assert.match(body, /Lo consiglierebbe: Sì/);
  assert.match(body, /Dove lo usa: Spettacoli, Festival/);
  assert.match(body, /Parte più usata: Conduzione dal vivo/);
  assert.match(body, /Più scorciatoie & colori/);
  assert.match(body, /Come lo usa:\n—/);
  assert.match(body, /Lingua dell'interfaccia: en/);
  assert.ok(mailto.startsWith(`mailto:${FEEDBACK_EMAIL}?subject=`));
  assert.ok(decodeURIComponent(mailto.split('&body=')[1]).includes('Più scorciatoie & colori'));
});

test('feedback: sistema descritto senza dati personali', () => {
  assert.equal(describePlatform({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15' }), 'macOS · Safari');
});
