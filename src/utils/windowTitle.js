// Titolo della finestra con il nome del progetto aperto, come fanno i programmi che lavorano su
// documenti (Excel, Pages…). Su Mac solo il nome: quello dell'app è già nella barra dei menu.
// Su Windows e Linux anche «Sténtor Lite», perché il titolo compare nella barra delle applicazioni.
export const APP_NAME = 'Sténtor Lite';

export function isMacPlatform(platform = typeof navigator !== 'undefined' ? navigator.userAgent : '') {
  return /Mac|iPhone|iPad/.test(String(platform));
}

export function getWindowTitle(projectTitle, { mac = isMacPlatform(), untitled = '' } = {}) {
  const name = String(projectTitle || '').trim() || untitled;
  if (!name) return APP_NAME;
  return mac ? name : `${name} — ${APP_NAME}`;
}
