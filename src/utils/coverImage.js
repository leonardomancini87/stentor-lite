// Immagine di copertina dei progetti: viene rimpicciolita prima di essere salvata.
// I progetti stanno nella memoria locale dell'app (pochi MB in tutto): una foto salvata così
// com'è la riempie subito («The quota has been exceeded»). Per la scheda del progetto bastano
// poche centinaia di pixel.

export const COVER_MAX_SIZE = 640;
export const COVER_JPEG_QUALITY = 0.85;
// Sotto questa lunghezza (circa 150 KB) un'immagine già piccola si tiene com'è.
const KEEP_AS_IS_LENGTH = 200000;

// Dimensioni finali: il lato lungo non supera maxSize, le proporzioni restano.
export function fitCoverSize(width, height, maxSize = COVER_MAX_SIZE) {
  const w = Math.max(1, Math.round(Number(width) || 1));
  const h = Math.max(1, Math.round(Number(height) || 1));
  const longest = Math.max(w, h);
  if (longest <= maxSize) return { width: w, height: h };
  const scale = maxSize / longest;
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

// Vero se l'errore è "memoria piena" (i nomi cambiano da un motore all'altro).
export function isStorageQuotaError(error) {
  if (!error) return false;
  return error.name === 'QuotaExceededError'
    || error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || error.code === 22
    || error.code === 1014
    || /quota/i.test(String(error.message || ''));
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image'));
    image.src = dataUrl;
  });
}

// Restituisce l'immagine come JPEG con il lato lungo di al massimo maxSize pixel, su fondo
// bianco (le parti trasparenti dei PNG non diventano nere). Se l'immagine è già piccola, o se
// il ridimensionamento non riesce, restituisce quella originale.
export async function shrinkCoverImage(dataUrl, { maxSize = COVER_MAX_SIZE, quality = COVER_JPEG_QUALITY } = {}) {
  const source = String(dataUrl || '');
  if (typeof document === 'undefined') return source;
  let image;
  try {
    image = await loadImage(source);
  } catch {
    return source;
  }
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  const size = fitCoverSize(naturalWidth, naturalHeight, maxSize);
  const alreadySmall = size.width === naturalWidth && size.height === naturalHeight;
  if (alreadySmall && source.length <= KEEP_AS_IS_LENGTH) return source;

  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) return source;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size.width, size.height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, size.width, size.height);
  const result = canvas.toDataURL('image/jpeg', quality);
  return result.startsWith('data:image/') && result.length < source.length ? result : source;
}
