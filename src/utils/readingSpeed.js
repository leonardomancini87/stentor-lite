export function computeCPS(text = '', durationSeconds = null) {
  if (!durationSeconds || durationSeconds <= 0) {
    return null;
  }

  return Math.round(text.length / durationSeconds);
}

export function getCPSSeverity(cps) {
  if (cps == null) return 'ok';
  if (cps > 20) return 'error';
  if (cps > 17) return 'warning';
  return 'ok';
}