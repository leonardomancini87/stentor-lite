// Cartelli: testi pronti da mandare sullo schermo fuori dal copione («Intervallo», il titolo…).
// Stanno nelle impostazioni del progetto (settings.cards) e si salvano con esso.
// Un cartello vale per tutti gli schermi, con lo stesso testo: non ha traduzioni.

export const MAX_CARDS = 12;

export function getCards(settings = {}) {
  if (!Array.isArray(settings?.cards)) return [];
  const seen = new Set();
  return settings.cards
    .filter((card) => card && typeof card === 'object' && typeof card.text === 'string' && card.text.trim())
    .map((card, index) => ({ id: String(card.id || `cartello-${index + 1}`), text: card.text }))
    .filter((card) => (seen.has(card.id) ? false : seen.add(card.id)))
    .slice(0, MAX_CARDS);
}

function cleanText(text) {
  return String(text || '').replace(/\r\n?/g, '\n').split('\n').map((line) => line.trim()).join('\n').trim();
}

function makeCardId(cards) {
  let number = cards.length + 1;
  while (cards.some((card) => card.id === `cartello-${number}`)) number += 1;
  return `cartello-${number}`;
}

// Tutte restituiscono le impostazioni aggiornate; un testo vuoto non crea né lascia cartelli.
export function addCard(settings = {}, text) {
  const cards = getCards(settings);
  const clean = cleanText(text);
  if (!clean || cards.length >= MAX_CARDS) return { ...settings, cards };
  return { ...settings, cards: [...cards, { id: makeCardId(cards), text: clean }] };
}

export function updateCard(settings = {}, cardId, text) {
  const clean = cleanText(text);
  if (!clean) return removeCard(settings, cardId);
  return { ...settings, cards: getCards(settings).map((card) => (card.id === cardId ? { ...card, text: clean } : card)) };
}

export function removeCard(settings = {}, cardId) {
  return { ...settings, cards: getCards(settings).filter((card) => card.id !== cardId) };
}
