const STORAGE_KEY = 'opensurtitles.project.v1';

export function loadProject(fallbackProject) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallbackProject;
    return JSON.parse(raw);
  } catch {
    return fallbackProject;
  }
}

export function saveProject(project) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project, null, 2));
}

function safeDownloadBlob(filename, blob) {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.position = 'fixed';
    a.style.left = '-9999px';
    a.style.top = '-9999px';
    document.body.appendChild(a);
    a.click();
    a.remove();

    // Safari/iOS può annullare download o anteprima se l'URL viene revocato
    // nello stesso tick del click. Lo rilasciamo poco dopo per mantenere
    // affidabili i pulsanti di esportazione.
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch (error) {
    console.error('Download non riuscito', error);
    return false;
  }
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  return safeDownloadBlob(filename, blob);
}

export function downloadText(filename, text, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type });
  return safeDownloadBlob(filename, blob);
}
