/**
 * Image loading, validation, and sample generation utilities
 */

const imageCache = new Map<string, HTMLImageElement>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached && cached.complete) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = (err) => {
      reject(new Error('Failed to load image file. Please ensure it is a valid PNG, JPG, or WebP.'));
    };
    img.src = src;
  });
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/i) && !file.name.match(/\.(png|jpe?g|webp)$/i)) {
      reject(new Error('Unsupported file format. Please upload a PNG, JPG, or WebP image.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as data URL.'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading image file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a clean 2048x1024 demo sprite sheet (4 columns x 2 rows, 8 frames of 512x512)
 * with a retro pixel-art style character walking animation.
 * The character in frames 2-8 is intentionally slightly misaligned so the user can
 * experience the manual onion-skin alignment immediately.
 */
export function generateDemoSpriteSheet(): {
  dataUrl: string;
  width: number;
  height: number;
  cols: number;
  rows: number;
  name: string;
} {
  const width = 2048;
  const height = 1024;
  const cols = 4;
  const rows = 2;
  const frameW = 512;
  const frameH = 512;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context');

  // Transparent background
  ctx.clearRect(0, 0, width, height);

  // Intentional slight misalignments for testing the alignment tool
  // The artist placed them slightly off-center by random small pixel amounts
  const offsets = [
    { x: 0, y: 0 },
    { x: 18, y: -8 },
    { x: -14, y: 12 },
    { x: 22, y: 4 },
    { x: -10, y: -16 },
    { x: 15, y: 10 },
    { x: -20, y: -6 },
    { x: 12, y: 14 }
  ];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const frameIdx = r * cols + c;
      const cellX = c * frameW;
      const cellY = r * frameH;
      const jitter = offsets[frameIdx] || { x: 0, y: 0 };

      // Character center inside cell
      const cx = cellX + frameW / 2 + jitter.x;
      const cy = cellY + frameH * 0.6 + jitter.y;

      // Draw character body & animation pose based on frame index
      drawDemoCharacter(ctx, cx, cy, frameIdx);
    }
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width,
    height,
    cols,
    rows,
    name: 'demo_character_walk_2048x1024.png'
  };
}

function drawDemoCharacter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  frame: number
) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Shadow at feet
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 80, 50, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  const cycle = (frame / 8) * Math.PI * 2;
  const bobY = Math.sin(cycle * 2) * 8;
  const legSwing = Math.sin(cycle) * 28;
  const armSwing = Math.cos(cycle) * 24;

  // Legs
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2563eb'; // Blue pants

  // Left leg
  ctx.beginPath();
  ctx.moveTo(cx - 18, cy + 20 + bobY);
  ctx.lineTo(cx - 18 - legSwing * 0.7, cy + 50);
  ctx.lineTo(cx - 18 - legSwing, cy + 80);
  ctx.stroke();

  // Left boot
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(cx - 26 - legSwing, cy + 72, 24, 12);

  // Right leg
  ctx.beginPath();
  ctx.moveTo(cx + 18, cy + 20 + bobY);
  ctx.lineTo(cx + 18 + legSwing * 0.7, cy + 50);
  ctx.lineTo(cx + 18 + legSwing, cy + 80);
  ctx.stroke();

  // Right boot
  ctx.fillRect(cx + 10 + legSwing, cy + 72, 24, 12);

  // Torso / Tunic
  ctx.fillStyle = '#ea580c'; // Orange tunic
  ctx.beginPath();
  ctx.roundRect(cx - 36, cy - 45 + bobY, 72, 70, 12);
  ctx.fill();

  // Belt
  ctx.fillStyle = '#78350f';
  ctx.fillRect(cx - 36, cy + 10 + bobY, 72, 10);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(cx - 8, cy + 8 + bobY, 16, 14);

  // Head
  ctx.fillStyle = '#fed7aa'; // Skin
  ctx.beginPath();
  ctx.arc(cx, cy - 75 + bobY, 32, 0, Math.PI * 2);
  ctx.fill();

  // Helmet / Hair
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(cx, cy - 82 + bobY, 34, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 34, cy - 82 + bobY, 14, 26);
  ctx.fillRect(cx + 20, cy - 82 + bobY, 14, 26);

  // Eyes & Visor
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(cx + 8, cy - 76 + bobY, 8, 8); // Facing right-ish
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(cx - 2, cy - 80 + bobY, 22, 5);

  // Left Arm (behind)
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#c2410c';
  ctx.beginPath();
  ctx.moveTo(cx - 28, cy - 35 + bobY);
  ctx.lineTo(cx - 28 - armSwing, cy + 5 + bobY);
  ctx.stroke();

  // Right Arm (front)
  ctx.strokeStyle = '#ea580c';
  ctx.beginPath();
  ctx.moveTo(cx + 28, cy - 35 + bobY);
  ctx.lineTo(cx + 28 + armSwing, cy + 5 + bobY);
  ctx.stroke();

  // Hand / glove
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.arc(cx + 28 + armSwing, cy + 10 + bobY, 9, 0, Math.PI * 2);
  ctx.fill();

  // Badge / Frame number marker for easy visual confirmation
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`F${frame + 1}`, cx, cy - 15 + bobY);

  ctx.restore();
}
