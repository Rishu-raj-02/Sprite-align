import React, { useRef, useEffect } from 'react';
import { FrameData } from '../types';

interface FrameThumbnailProps {
  frame: FrameData;
  sourceImage: HTMLImageElement | null;
  isSelected: boolean;
  onSelect: () => void;
}

export const FrameThumbnail: React.FC<FrameThumbnailProps> = ({
  frame,
  sourceImage,
  isSelected,
  onSelect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetW = frame.canvasWidth || frame.width;
  const targetH = frame.canvasHeight || frame.height;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fixed thumbnail resolution (e.g. 96x96 or aspect ratio matched)
    const aspect = targetW / targetH;
    const thumbW = 96;
    const thumbH = Math.round(thumbW / aspect);

    canvas.width = thumbW;
    canvas.height = thumbH;

    // Draw checkerboard
    ctx.clearRect(0, 0, thumbW, thumbH);
    const checkSize = 6;
    for (let y = 0; y < thumbH; y += checkSize) {
      for (let x = 0; x < thumbW; x += checkSize) {
        ctx.fillStyle = ((x / checkSize + y / checkSize) % 2 === 0) ? '#1f2430' : '#141820';
        ctx.fillRect(x, y, checkSize, checkSize);
      }
    }

    // Scale factors
    const scaleX = thumbW / targetW;
    const scaleY = thumbH / targetH;

    // Clip to fixed thumbnail bounds
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, thumbW, thumbH);
    ctx.clip();

    ctx.imageSmoothingEnabled = false;

    // Draw the sliced artwork with its current offset inside the fixed frame
    ctx.drawImage(
      sourceImage,
      frame.sourceX,
      frame.sourceY,
      frame.width,
      frame.height,
      frame.offsetX * scaleX,
      frame.offsetY * scaleY,
      frame.width * scaleX,
      frame.height * scaleY
    );

    ctx.restore();
  }, [frame.offsetX, frame.offsetY, frame.sourceX, frame.sourceY, frame.width, frame.height, frame.canvasWidth, frame.canvasHeight, sourceImage]);

  const hasOffset = frame.offsetX !== 0 || frame.offsetY !== 0;

  return (
    <div
      id={`frame-item-${frame.id}`}
      onClick={onSelect}
      className={`group flex items-center gap-3 p-2 rounded-lg border transition cursor-pointer select-none ${
        isSelected
          ? 'bg-indigo-950/70 border-indigo-500 shadow-sm shadow-indigo-950/50'
          : 'bg-neutral-900/60 border-neutral-800/80 hover:bg-neutral-800 hover:border-neutral-700'
      }`}
    >
      {/* Thumbnail Canvas */}
      <div className="relative w-16 h-16 shrink-0 rounded bg-neutral-950 overflow-hidden border border-neutral-800 flex items-center justify-center shadow-inner">
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
        />
        {/* Frame ID badge */}
        <span
          className={`absolute top-1 left-1 px-1 py-0.2 rounded text-[10px] font-bold font-mono leading-none ${
            isSelected
              ? 'bg-indigo-600 text-white'
              : 'bg-neutral-900/90 text-neutral-300'
          }`}
        >
          #{frame.id}
        </span>
      </div>

      {/* Frame Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-semibold ${isSelected ? 'text-indigo-300' : 'text-neutral-200'}`}>
            Frame {frame.id}
          </span>
          {frame.id === 1 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
              Anchor
            </span>
          )}
        </div>

        <div className="text-[11px] font-mono text-neutral-400 mt-1 flex items-center gap-1.5">
          <span>Offset:</span>
          <span className={hasOffset ? 'text-amber-400 font-semibold' : 'text-neutral-500'}>
            {frame.offsetX >= 0 ? `+${frame.offsetX}` : frame.offsetX}, {frame.offsetY >= 0 ? `+${frame.offsetY}` : frame.offsetY}
          </span>
        </div>

        <div className="text-[10px] text-neutral-500 mt-0.5">
          {targetW} × {targetH} px
          {targetW !== frame.width || targetH !== frame.height ? ` (cut: ${frame.width}×${frame.height})` : ''}
        </div>
      </div>
    </div>
  );
};
