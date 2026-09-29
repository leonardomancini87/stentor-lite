// Lettura dei file Office (.docx, .xlsx, .pptx), che sono archivi ZIP di file XML.
// Nessuna libreria esterna: si usa la decompressione nativa del browser (DecompressionStream).

function readUInt16(view, offset) {
  return view.getUint16(offset, true);
}

function readUInt32(view, offset) {
  return view.getUint32(offset, true);
}

function decodeUtf8(bytes) {
  return new TextDecoder('utf-8').decode(bytes);
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Questo browser non supporta la decompressione dei file Office. Prova con un browser aggiornato.');
  }
  let lastError = null;
  for (const format of ['deflate-raw', 'deflate']) {
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Decompressione non riuscita');
}

function findEndOfCentralDirectory(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const start = Math.max(0, bytes.length - 0xffff - 22);
  for (let offset = bytes.length - 22; offset >= start; offset -= 1) {
    if (readUInt32(view, offset) === 0x06054b50) return offset;
  }
  return -1;
}

// Apre un archivio ZIP: restituisce l'elenco dei nomi e una funzione per leggere un file come testo.
export function openZip(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdOffset = findEndOfCentralDirectory(bytes);
  if (eocdOffset < 0) throw new Error('Archivio non valido');

  const entries = new Map();
  const entryCount = readUInt16(view, eocdOffset + 10);
  let centralOffset = readUInt32(view, eocdOffset + 16);

  for (let index = 0; index < entryCount; index += 1) {
    if (readUInt32(view, centralOffset) !== 0x02014b50) throw new Error('Archivio non valido');
    const method = readUInt16(view, centralOffset + 10);
    const compressedSize = readUInt32(view, centralOffset + 20);
    const fileNameLength = readUInt16(view, centralOffset + 28);
    const extraLength = readUInt16(view, centralOffset + 30);
    const commentLength = readUInt16(view, centralOffset + 32);
    const localHeaderOffset = readUInt32(view, centralOffset + 42);
    const name = decodeUtf8(bytes.slice(centralOffset + 46, centralOffset + 46 + fileNameLength));
    entries.set(name, { method, compressedSize, localHeaderOffset });
    centralOffset += 46 + fileNameLength + extraLength + commentLength;
  }

  async function readText(name) {
    const entry = entries.get(name);
    if (!entry) return null;
    const { method, compressedSize, localHeaderOffset } = entry;
    if (readUInt32(view, localHeaderOffset) !== 0x04034b50) throw new Error('Archivio non valido');
    const localNameLength = readUInt16(view, localHeaderOffset + 26);
    const localExtraLength = readUInt16(view, localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const data = bytes.slice(dataOffset, dataOffset + compressedSize);
    if (method === 0) return decodeUtf8(data);
    if (method === 8) return decodeUtf8(await inflateRaw(data));
    throw new Error(`Metodo di compressione non supportato: ${method}`);
  }

  return { names: [...entries.keys()], has: (name) => entries.has(name), readText };
}

export async function extractZipEntry(arrayBuffer, name) {
  const text = await openZip(arrayBuffer).readText(name);
  if (text === null) throw new Error(`Voce non trovata nell'archivio: ${name}`);
  return text;
}

export function decodeXmlEntities(value) {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (match, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}
