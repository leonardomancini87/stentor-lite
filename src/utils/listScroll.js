// Calcola lo scrollTop minimo che rende visibile una riga in un contenitore scrollabile.
// Le coordinate della riga (itemTop/itemHeight) sono relative al contenuto scrollabile,
// così le altezze reali delle righe (anche multilinea) sono già incluse.
// Restituisce lo scrollTop attuale se la riga è già visibile con il margine richiesto.
export function getRevealScrollTop({
  scrollTop,
  viewportHeight,
  scrollHeight,
  itemTop,
  itemHeight,
  margin = 8,
  isFirst = false,
  isLast = false,
}) {
  const maxScrollTop = Math.max(0, scrollHeight - viewportHeight);
  const clamp = (value) => Math.min(Math.max(value, 0), maxScrollTop);
  const itemBottom = itemTop + itemHeight;

  const isAbove = itemTop - margin < scrollTop;
  const isBelow = itemBottom + margin > scrollTop + viewportHeight;

  // Riga più alta dell'area visibile: si allinea l'inizio, così resta leggibile.
  if (itemHeight + margin * 2 > viewportHeight) {
    return isAbove || isBelow ? clamp(itemTop - margin) : scrollTop;
  }

  if (isAbove) return isFirst ? 0 : clamp(itemTop - margin);
  if (isBelow) return isLast ? maxScrollTop : clamp(itemBottom + margin - viewportHeight);
  return scrollTop;
}
