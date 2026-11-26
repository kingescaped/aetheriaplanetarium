export type AvatarMimeType = 'image/webp' | 'image/jpeg';

export interface ResizedAvatarResult {
  contentType: AvatarMimeType;
  dataBase64: string;
  previewDataUrl: string;
  byteSize: number;
}

export interface AvatarValidationResult {
  valid: boolean;
  reason?: 'type' | 'size';
}

const ACCEPTED_INPUT_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

const MAX_RAW_UPLOAD_BYTES = 12 * 1024 * 1024; // 12 MB pre-resize guard
const DEFAULT_AVATAR_SIZE = 256;
const DEFAULT_MAX_BYTES = 250 * 1024; // 250 KB post-resize cap

/**
 * Validates an avatar image file before decoding onto a canvas.
 */
export function validateAvatarFile(file: Pick<File, 'type' | 'size'>): AvatarValidationResult {
  const mime = (file.type || '').toLowerCase();
  if (!ACCEPTED_INPUT_MIME_TYPES.has(mime)) {
    return { valid: false, reason: 'type' };
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_RAW_UPLOAD_BYTES) {
    return { valid: false, reason: 'size' };
  }
  return { valid: true };
}

/**
 * Computes a centered square crop rectangle for any source dimensions.
 */
export function computeCenterCropRect(width: number, height: number): {
  sx: number;
  sy: number;
  size: number;
} {
  const safeW = Math.max(1, Math.floor(width));
  const safeH = Math.max(1, Math.floor(height));
  const size = Math.min(safeW, safeH);
  const sx = Math.floor((safeW - size) / 2);
  const sy = Math.floor((safeH - size) / 2);
  return { sx, sy, size };
}

/**
 * Estimates the exact decoded binary byte length of a base64 string.
 */
export function base64ByteLength(base64: string): number {
  const clean = base64.trim();
  if (!clean) return 0;
  let padding = 0;
  if (clean.endsWith('==')) padding = 2;
  else if (clean.endsWith('=')) padding = 1;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

function splitDataUrl(dataUrl: string): { mime: string; base64: string } {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    return { mime: '', base64: '' };
  }
  const header = dataUrl.slice(0, commaIdx);
  const mimeMatch = /^data:([^;]+);base64$/i.exec(header);
  return {
    mime: mimeMatch ? mimeMatch[1].toLowerCase() : '',
    base64: dataUrl.slice(commaIdx + 1),
  };
}

async function decodeImageSource(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fall through to HTMLImageElement decoding
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to decode avatar image.'));
      el.src = objectUrl;
    });
    return {
      source: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

/**
 * Center-crops and resizes an uploaded image File (PNG/JPEG/WebP) to 256x256
 * WebP (with automatic JPEG fallback), keeping payload <= 250 KB.
 */
export async function resizeAvatarFile(
  file: File,
  targetSize: number = DEFAULT_AVATAR_SIZE,
  maxBytes: number = DEFAULT_MAX_BYTES
): Promise<ResizedAvatarResult> {
  const validation = validateAvatarFile(file);
  if (!validation.valid) {
    throw new Error(
      validation.reason === 'type'
        ? 'Unsupported image format. Please choose PNG, JPEG, or WebP.'
        : 'Selected image file is empty or exceeds 12 MB.'
    );
  }

  if (typeof document === 'undefined') {
    throw new Error('Canvas avatar resizing is only available in a browser environment.');
  }

  const decoded = await decodeImageSource(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to acquire 2D canvas context for avatar resize.');
    }

    const { sx, sy, size } = computeCenterCropRect(decoded.width, decoded.height);
    ctx.clearRect(0, 0, targetSize, targetSize);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(decoded.source, sx, sy, size, size, 0, 0, targetSize, targetSize);

    const qualities = [0.9, 0.82, 0.72, 0.62, 0.5, 0.38];
    const mimeCandidates: AvatarMimeType[] = ['image/webp', 'image/jpeg'];

    let bestCandidate: ResizedAvatarResult | null = null;

    for (const mime of mimeCandidates) {
      for (const quality of qualities) {
        const dataUrl = canvas.toDataURL(mime, quality);
        const parsed = splitDataUrl(dataUrl);
        if (parsed.mime !== mime || !parsed.base64) {
          // Browser does not support encoding this MIME (e.g., WebP on older canvas)
          break;
        }
        const byteSize = base64ByteLength(parsed.base64);
        const candidate: ResizedAvatarResult = {
          contentType: mime,
          dataBase64: parsed.base64,
          previewDataUrl: dataUrl,
          byteSize,
        };
        if (!bestCandidate || byteSize < bestCandidate.byteSize) {
          bestCandidate = candidate;
        }
        if (byteSize <= maxBytes) {
          return candidate;
        }
      }
    }

    if (bestCandidate && bestCandidate.byteSize <= maxBytes * 1.4) {
      return bestCandidate;
    }

    throw new Error('Unable to compress avatar below 250 KB.');
  } finally {
    decoded.cleanup();
  }
}
