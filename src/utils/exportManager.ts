import JSZip from 'jszip';
import { FrameData } from '../types';
import { loadImage } from './imageLoader';

/**
 * Renders a single frame cleanly to an offscreen canvas at exact frame dimensions,
 * applying only the alignment transform (offsetX, offsetY).
 * Absolutely NO editor overlays (no onion skin, checkerboard, grid, guides).
 */
export function renderCleanFrameCanvas(
  sourceImage: HTMLImageElement,
  frame: FrameData
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const targetW = frame.canvasWidth || frame.width;
  const targetH = frame.canvasHeight || frame.height;
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D canvas context');

  // Ensure true transparent background
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.imageSmoothingEnabled = false;

  // Draw the source slice at its offset inside the fixed frame canvas
  // Any parts moved outside the canvas are naturally clipped by the canvas boundary
  ctx.drawImage(
    sourceImage,
    frame.sourceX,
    frame.sourceY,
    frame.width,
    frame.height,
    frame.offsetX,
    frame.offsetY,
    frame.width,
    frame.height
  );

  return canvas;
}

/**
 * Converts a canvas to a PNG Blob
 */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create image blob from canvas'));
      }
    }, 'image/png');
  });
}

/**
 * Triggers a direct browser file download from a Blob
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Export a single frame as a standalone PNG file
 */
export async function exportSingleFrame(
  sourceImage: HTMLImageElement,
  frame: FrameData,
  filename: string
): Promise<void> {
  const canvas = renderCleanFrameCanvas(sourceImage, frame);
  const blob = await canvasToBlob(canvas);
  downloadBlob(blob, filename);
}

/**
 * Export all aligned frames as a ZIP archive of individual PNG files
 */
export async function exportAllFramesZip(
  sourceImageDataUrl: string,
  frames: FrameData[],
  prefix: string = 'Frame',
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const img = await loadImage(sourceImageDataUrl);
  const zip = new JSZip();
  const padLength = Math.max(2, String(frames.length).length);

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const canvas = renderCleanFrameCanvas(img, frame);
    const blob = await canvasToBlob(canvas);
    const frameNum = String(frame.id).padStart(padLength, '0');
    const filename = `${prefix}_${frameNum}.png`;
    zip.file(filename, blob);

    if (onProgress) {
      onProgress(i + 1, frames.length);
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, `${prefix}_aligned_frames.zip`);
}

/**
 * Renders the full rebuilt sprite sheet using original row-major arrangement
 * and user alignment offsets, strictly preserving transparency and dimensions.
 */
export function renderRebuiltSpriteSheet(
  sourceImage: HTMLImageElement,
  frames: FrameData[],
  columns: number,
  rows: number,
  frameWidth: number,
  frameHeight: number
): HTMLCanvasElement {
  const sheetWidth = columns * frameWidth;
  const sheetHeight = rows * frameHeight;

  const canvas = document.createElement('canvas');
  canvas.width = sheetWidth;
  canvas.height = sheetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D canvas context');

  // Clear to pure transparency
  ctx.clearRect(0, 0, sheetWidth, sheetHeight);
  ctx.imageSmoothingEnabled = false;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const index = r * columns + c;
      if (index >= frames.length) continue;
      const frame = frames[index];

      const cellX = c * frameWidth;
      const cellY = r * frameHeight;

      // Clip strictly to cell bounds so offset artwork cannot bleed into neighbor cells
      ctx.save();
      ctx.beginPath();
      ctx.rect(cellX, cellY, frameWidth, frameHeight);
      ctx.clip();

      ctx.drawImage(
        sourceImage,
        frame.sourceX,
        frame.sourceY,
        frame.width,
        frame.height,
        cellX + frame.offsetX,
        cellY + frame.offsetY,
        frame.width,
        frame.height
      );

      ctx.restore();
    }
  }

  return canvas;
}

/**
 * Exports the rebuilt sprite sheet as a PNG file
 */
export async function exportSpriteSheet(
  sourceImageDataUrl: string,
  frames: FrameData[],
  columns: number,
  rows: number,
  frameWidth: number,
  frameHeight: number,
  filename: string = 'aligned_sprite_sheet.png'
): Promise<void> {
  const img = await loadImage(sourceImageDataUrl);
  const canvas = renderRebuiltSpriteSheet(img, frames, columns, rows, frameWidth, frameHeight);
  const blob = await canvasToBlob(canvas);
  downloadBlob(blob, filename.endsWith('.png') ? filename : `${filename}.png`);
}
