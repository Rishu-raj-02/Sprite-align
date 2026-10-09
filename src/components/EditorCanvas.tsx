import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FrameData, EditorSettings } from '../types';
import { 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  GripVertical, 
  Eye, 
  EyeOff, 
  Crosshair, 
  Grid, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Undo2, 
  Redo2 
} from 'lucide-react';

interface EditorCanvasProps {
  currentFrame: FrameData;
  previousFrame: FrameData | null;
  sourceImage: HTMLImageElement | null;
  settings: EditorSettings;
  onUpdateOffset: (offsetX: number, offsetY: number, isFinal: boolean) => void;
  onUpdateSettings: (updater: (prev: EditorSettings) => EditorSettings) => void;
  onFitToCanvas: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  totalFrames?: number;
  currentFrameIndex?: number;
  onSelectFrame?: (index: number) => void;
  onResetOffset?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  currentFrame,
  previousFrame,
  sourceImage,
  settings,
  onUpdateOffset,
  onUpdateSettings,
  onFitToCanvas,
  isMaximized = false,
  onToggleMaximize,
  totalFrames = 1,
  currentFrameIndex = 0,
  onSelectFrame,
  onResetOffset,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomBarRef = useRef<HTMLDivElement>(null);

  // Interaction modes: 'none' | 'dragging-artwork' | 'panning'
  const [interactionMode, setInteractionMode] = useState<'none' | 'dragging-artwork' | 'panning'>('none');
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

  // Draggable Zoom Bar State
  const [zoomBarPos, setZoomBarPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingZoomBar, setIsDraggingZoomBar] = useState<boolean>(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Drag tracking refs for artwork & viewport pan
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialOffsetX: number;
    initialOffsetY: number;
    initialPanX: number;
    initialPanY: number;
  }>({
    startX: 0,
    startY: 0,
    initialOffsetX: 0,
    initialOffsetY: 0,
    initialPanX: 0,
    initialPanY: 0,
  });

  // Main canvas render routine
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImage || !currentFrame) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fw = currentFrame.canvasWidth || currentFrame.width;
    const fh = currentFrame.canvasHeight || currentFrame.height;

    // The canvas always matches the exact sliced frame dimensions
    if (canvas.width !== fw || canvas.height !== fh) {
      canvas.width = fw;
      canvas.height = fh;
    }

    // 1. Clear & draw background checkerboard for transparency
    ctx.clearRect(0, 0, fw, fh);
    const checkSize = Math.max(8, Math.min(24, Math.round(fw / 24)));
    for (let y = 0; y < fh; y += checkSize) {
      for (let x = 0; x < fw; x += checkSize) {
        ctx.fillStyle = ((x / checkSize + y / checkSize) % 2 === 0) ? '#1e2430' : '#141822';
        ctx.fillRect(x, y, checkSize, checkSize);
      }
    }

    ctx.imageSmoothingEnabled = false;

    // 2. Optional Grid overlay (subtle behind/between artwork)
    if (settings.showGrid) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      const gs = settings.gridSize || 16;
      for (let x = gs; x < fw; x += gs) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, fh);
        ctx.stroke();
      }
      for (let y = gs; y < fh; y += gs) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(fw, y + 0.5);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. LAYER 1: Previous Frame Onion Skin (only for Frame N > 1 when enabled)
    if (previousFrame && settings.showPreviousFrame && settings.previousFrameOpacity > 0) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, settings.previousFrameOpacity));

      // Draw the previous frame at its own aligned offset
      ctx.drawImage(
        sourceImage,
        previousFrame.sourceX,
        previousFrame.sourceY,
        previousFrame.width,
        previousFrame.height,
        previousFrame.offsetX,
        previousFrame.offsetY,
        previousFrame.width,
        previousFrame.height
      );
      ctx.restore();
    }

    // 4. LAYER 2: Current Frame Artwork
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, settings.currentFrameOpacity));

    // Draw current frame artwork at current frame's offset
    ctx.drawImage(
      sourceImage,
      currentFrame.sourceX,
      currentFrame.sourceY,
      currentFrame.width,
      currentFrame.height,
      currentFrame.offsetX,
      currentFrame.offsetY,
      currentFrame.width,
      currentFrame.height
    );
    ctx.restore();

    // 5. LAYER 3: Center Guides (if enabled)
    if (settings.showGuides) {
      ctx.save();
      ctx.lineWidth = 1;

      // Vertical center guide (cyan)
      const midX = Math.round(fw / 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.beginPath();
      ctx.moveTo(midX + 0.5, 0);
      ctx.lineTo(midX + 0.5, fh);
      ctx.stroke();

      // Horizontal center guide (cyan)
      const midY = Math.round(fh / 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.beginPath();
      ctx.moveTo(0, midY + 0.5);
      ctx.lineTo(fw, midY + 0.5);
      ctx.stroke();

      // Small center crosshair dot
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(midX - 2, midY - 2, 5, 5);

      ctx.restore();
    }
  }, [
    currentFrame,
    previousFrame,
    sourceImage,
    settings.showPreviousFrame,
    settings.previousFrameOpacity,
    settings.currentFrameOpacity,
    settings.showGrid,
    settings.gridSize,
    settings.showGuides,
  ]);

  // Request animation frame for smooth redraws
  useEffect(() => {
    let animId = requestAnimationFrame(renderCanvas);
    return () => cancelAnimationFrame(animId);
  }, [renderCanvas]);

  // Keyboard navigation & space bar panning tracking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Exit maximize mode with Escape
      if (e.key === 'Escape' && isMaximized && onToggleMaximize) {
        e.preventDefault();
        onToggleMaximize();
        return;
      }

      // Toggle maximize with 'f' or 'F' (if not editing)
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && onToggleMaximize) {
        e.preventDefault();
        onToggleMaximize();
        return;
      }

      // Frame switching with [ and ] in maximized mode
      if (e.key === '[' && onSelectFrame && currentFrameIndex > 0) {
        e.preventDefault();
        onSelectFrame(currentFrameIndex - 1);
        return;
      }
      if (e.key === ']' && onSelectFrame && currentFrameIndex < totalFrames - 1) {
        e.preventDefault();
        onSelectFrame(currentFrameIndex + 1);
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }

      // Precise Arrow Key movement for the current frame artwork
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        if (e.ctrlKey || e.metaKey) return;

        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let deltaX = 0;
        let deltaY = 0;

        if (e.key === 'ArrowLeft') deltaX = -step;
        if (e.key === 'ArrowRight') deltaX = step;
        if (e.key === 'ArrowUp') deltaY = -step;
        if (e.key === 'ArrowDown') deltaY = step;

        onUpdateOffset(
          currentFrame.offsetX + deltaX,
          currentFrame.offsetY + deltaY,
          true
        );
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentFrame.offsetX, currentFrame.offsetY, onUpdateOffset, isMaximized, onToggleMaximize, onSelectFrame, currentFrameIndex, totalFrames]);

  // Mouse Down handler: initiates artwork drag or panning
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // 1. Middle mouse click (button === 1) or Space + Left click = PAN viewport
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      e.preventDefault();
      setInteractionMode('panning');
      dragStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialOffsetX: currentFrame.offsetX,
        initialOffsetY: currentFrame.offsetY,
        initialPanX: settings.panX,
        initialPanY: settings.panY,
      };
      return;
    }

    // 2. Normal Left click = MOVE ARTWORK inside the frame canvas
    if (e.button === 0) {
      e.preventDefault();
      setInteractionMode('dragging-artwork');
      dragStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialOffsetX: currentFrame.offsetX,
        initialOffsetY: currentFrame.offsetY,
        initialPanX: settings.panX,
        initialPanY: settings.panY,
      };
    }
  };

  // Mouse Move handler: updates either pan or artwork offset
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (interactionMode === 'none') return;

    const deltaClientX = e.clientX - dragStartRef.current.startX;
    const deltaClientY = e.clientY - dragStartRef.current.startY;

    if (interactionMode === 'panning') {
      onUpdateSettings((prev) => ({
        ...prev,
        panX: dragStartRef.current.initialPanX + deltaClientX,
        panY: dragStartRef.current.initialPanY + deltaClientY,
      }));
    } else if (interactionMode === 'dragging-artwork') {
      const zoom = settings.zoom || 1;
      const deltaArtworkX = Math.round(deltaClientX / zoom);
      const deltaArtworkY = Math.round(deltaClientY / zoom);

      const nextOffsetX = dragStartRef.current.initialOffsetX + deltaArtworkX;
      const nextOffsetY = dragStartRef.current.initialOffsetY + deltaArtworkY;

      onUpdateOffset(nextOffsetX, nextOffsetY, false);
    }
  };

  // Mouse Up handler
  const handleMouseUp = () => {
    if (interactionMode === 'dragging-artwork') {
      onUpdateOffset(currentFrame.offsetX, currentFrame.offsetY, true);
    }
    setInteractionMode('none');
  };

  // Wheel Zoom handler
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactors = [0.25, 0.5, 0.75, 1, 1.5, 2, 4, 8];
    const currentZoom = settings.zoom || 1;

    let nextZoom: number;
    if (e.deltaY < 0) {
      nextZoom = zoomFactors.find((z) => z > currentZoom) || Math.min(8, currentZoom * 1.25);
    } else {
      nextZoom = [...zoomFactors].reverse().find((z) => z < currentZoom) || Math.max(0.25, currentZoom / 1.25);
    }

    onUpdateSettings((prev) => ({
      ...prev,
      zoom: Number(nextZoom.toFixed(2)),
    }));
  };

  // --- Draggable Zoom Bar Handlers ---
  const handleZoomBarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const bar = zoomBarRef.current;
    const container = containerRef.current;
    if (!bar || !container) return;

    const barRect = bar.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - barRect.left,
      y: e.clientY - barRect.top,
    };
    setIsDraggingZoomBar(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleZoomBarPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingZoomBar) return;
    const bar = zoomBarRef.current;
    const container = containerRef.current;
    if (!bar || !container) return;

    const containerRect = container.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();

    const rawX = e.clientX - containerRect.left - dragOffsetRef.current.x;
    const rawY = e.clientY - containerRect.top - dragOffsetRef.current.y;

    const maxX = containerRect.width - barRect.width - 10;
    const maxY = containerRect.height - barRect.height - 10;

    const clampedX = Math.max(10, Math.min(maxX, rawX));
    const clampedY = Math.max(10, Math.min(maxY, rawY));

    setZoomBarPos({ x: clampedX, y: clampedY });
  };

  const handleZoomBarPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingZoomBar) {
      setIsDraggingZoomBar(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Cursor style calculation
  let cursorClass = 'cursor-crosshair';
  if (interactionMode === 'panning' || (isSpacePressed && interactionMode === 'none')) {
    cursorClass = interactionMode === 'panning' ? 'cursor-grabbing' : 'cursor-grab';
  } else if (interactionMode === 'dragging-artwork') {
    cursorClass = 'cursor-move';
  }

  const zoomPercent = Math.round((settings.zoom || 1) * 100);

  // Position style for draggable zoom bar
  const zoomBarStyle: React.CSSProperties = zoomBarPos
    ? {
        position: 'absolute',
        left: `${zoomBarPos.x}px`,
        top: `${zoomBarPos.y}px`,
        zIndex: 35,
      }
    : {
        position: 'absolute',
        bottom: '14px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 35,
      };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className={`${
        isMaximized
          ? 'fixed inset-0 z-40 bg-neutral-950 overflow-hidden flex items-center justify-center select-none shadow-2xl'
          : 'relative flex-1 h-full bg-neutral-950 overflow-hidden flex items-center justify-center select-none'
      } ${cursorClass}`}
    >
      {/* Viewport Canvas Stage */}
      <div
        className="transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${settings.panX}px, ${settings.panY}px) scale(${settings.zoom})`,
          transformOrigin: 'center center',
          imageRendering: 'pixelated',
        }}
      >
        {/* Fixed Frame Canvas with Outer Glow & Border */}
        <div className="relative shadow-2xl ring-1 ring-neutral-700/80 rounded-xs">
          <canvas
            ref={canvasRef}
            className="block"
            style={{
              width: currentFrame.canvasWidth || currentFrame.width,
              height: currentFrame.canvasHeight || currentFrame.height,
              imageRendering: 'pixelated',
            }}
          />

          {/* Frame Canvas Boundary Border indicator */}
          <div className="absolute inset-0 pointer-events-none border border-indigo-500/40" />

          {/* Coordinate watermark / badge in bottom-right of frame canvas */}
          <div className="absolute bottom-1 right-1 pointer-events-none px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-mono text-neutral-400">
            {currentFrame.canvasWidth || currentFrame.width}×{currentFrame.canvasHeight || currentFrame.height}
          </div>
        </div>
      </div>

      {/* TOP FLOATING HUD & CONTROLS */}
      {isMaximized ? (
        /* MAXIMIZED TOP BAR: Rich quick controls in full-screen placement mode */
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-neutral-900/95 border border-neutral-700/90 rounded-xl px-4 py-2 shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs z-30 pointer-events-auto">
          {/* Frame Navigation */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSelectFrame && onSelectFrame(Math.max(0, currentFrameIndex - 1))}
              disabled={!onSelectFrame || currentFrameIndex <= 0}
              className="p-1 rounded bg-neutral-800 text-neutral-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              title="Previous Frame ([)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-800 font-mono font-bold text-indigo-300">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span>Frame {currentFrame.id} / {totalFrames}</span>
            </div>
            <button
              onClick={() => onSelectFrame && onSelectFrame(Math.min(totalFrames - 1, currentFrameIndex + 1))}
              disabled={!onSelectFrame || currentFrameIndex >= totalFrames - 1}
              className="p-1 rounded bg-neutral-800 text-neutral-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              title="Next Frame (])"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="h-4 w-px bg-neutral-700" />

          {/* Live Offsets & Quick Reset */}
          <div className="flex items-center gap-2 font-mono">
            <span className="text-neutral-400">Offset:</span>
            <span className="bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800 text-amber-400 font-bold">
              X: {currentFrame.offsetX >= 0 ? `+${currentFrame.offsetX}` : currentFrame.offsetX}px
            </span>
            <span className="bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800 text-amber-400 font-bold">
              Y: {currentFrame.offsetY >= 0 ? `+${currentFrame.offsetY}` : currentFrame.offsetY}px
            </span>
            {onResetOffset && (currentFrame.offsetX !== 0 || currentFrame.offsetY !== 0) && (
              <button
                onClick={onResetOffset}
                className="p-1 rounded text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition cursor-pointer"
                title="Reset Frame Offset (0,0)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="h-4 w-px bg-neutral-700" />

          {/* Quick Toggles: Onion Skin & Guides */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onUpdateSettings((prev) => ({ ...prev, showPreviousFrame: !prev.showPreviousFrame }))}
              className={`p-1.5 rounded transition cursor-pointer ${
                settings.showPreviousFrame
                  ? 'bg-indigo-600 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              title={settings.showPreviousFrame ? 'Hide Onion Skin' : 'Show Onion Skin'}
            >
              {settings.showPreviousFrame ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => onUpdateSettings((prev) => ({ ...prev, showGuides: !prev.showGuides }))}
              className={`p-1.5 rounded transition cursor-pointer ${
                settings.showGuides
                  ? 'bg-sky-600 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              title="Toggle Center Crosshair Guides"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onUpdateSettings((prev) => ({ ...prev, showGrid: !prev.showGrid }))}
              className={`p-1.5 rounded transition cursor-pointer ${
                settings.showGrid
                  ? 'bg-emerald-600 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              title="Toggle Grid Overlay"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Undo / Redo in maximized mode */}
          {onUndo && onRedo && (
            <>
              <div className="h-4 w-px bg-neutral-700" />
              <div className="flex items-center gap-0.5">
                <button
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="p-1.5 rounded text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="p-1.5 rounded text-neutral-300 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          <div className="h-4 w-px bg-neutral-700" />

          {/* Exit Fullscreen Button */}
          <button
            id="btn-exit-maximized-canvas"
            onClick={onToggleMaximize}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition cursor-pointer shadow-md"
            title="Exit Fullscreen / Minimize Canvas (Esc or F)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Minimize (Esc)</span>
          </button>
        </div>
      ) : (
        /* NORMAL TOP FLOATING STATUS PILL */
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-neutral-900/90 border border-neutral-700/80 rounded-full px-4 py-1.5 shadow-lg backdrop-blur-md flex items-center gap-3 text-xs z-30">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="font-semibold text-neutral-200">
              Frame {currentFrame.id}
            </span>
          </div>

          <div className="h-3.5 w-px bg-neutral-700" />

          <div className="font-mono flex items-center gap-2">
            <span>
              X: <span className="text-amber-400 font-bold">{currentFrame.offsetX >= 0 ? `+${currentFrame.offsetX}` : currentFrame.offsetX}px</span>
            </span>
            <span>
              Y: <span className="text-amber-400 font-bold">{currentFrame.offsetY >= 0 ? `+${currentFrame.offsetY}` : currentFrame.offsetY}px</span>
            </span>
          </div>

          {previousFrame && settings.showPreviousFrame && (
            <>
              <div className="h-3.5 w-px bg-neutral-700" />
              <div className="flex items-center gap-1 text-indigo-300 text-[11px]">
                <Eye className="w-3 h-3" />
                <span>Onion: Frame {previousFrame.id}</span>
              </div>
            </>
          )}

          {/* Maximize Canvas button in top pill */}
          {onToggleMaximize && (
            <>
              <div className="h-3.5 w-px bg-neutral-700" />
              <button
                id="btn-pill-maximize-canvas"
                onClick={onToggleMaximize}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-indigo-300 hover:text-white transition cursor-pointer"
                title="Maximize placement canvas to full screen (F)"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Maximize</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* DRAGGABLE FLOATING VIEWPORT ZOOM & QUICK CONTROLS BAR */}
      <div
        ref={zoomBarRef}
        style={zoomBarStyle}
        className={`bg-neutral-900/95 border border-neutral-700/80 rounded-xl p-1.5 shadow-2xl backdrop-blur-md flex items-center gap-1 text-xs select-none transition-shadow ${
          isDraggingZoomBar ? 'ring-2 ring-indigo-500 shadow-indigo-500/20' : ''
        }`}
      >
        {/* Drag Handle with Grip icon */}
        <div
          onPointerDown={handleZoomBarPointerDown}
          onPointerMove={handleZoomBarPointerMove}
          onPointerUp={handleZoomBarPointerUp}
          onDoubleClick={() => setZoomBarPos(null)}
          className={`flex items-center gap-0.5 px-1 py-1 rounded bg-neutral-800/80 hover:bg-neutral-700/90 text-neutral-400 hover:text-neutral-100 transition cursor-grab active:cursor-grabbing touch-none ${
            isDraggingZoomBar ? 'cursor-grabbing bg-indigo-900 text-indigo-200' : ''
          }`}
          title="Drag to reposition zoom bar anywhere (Double-click to reset position)"
        >
          <GripVertical className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono font-medium hidden sm:inline text-neutral-400">Drag</span>
        </div>

        <div className="h-4 w-px bg-neutral-700 mx-0.5" />

        {/* Zoom Out */}
        <button
          onClick={() =>
            onUpdateSettings((prev) => ({
              ...prev,
              zoom: Math.max(0.25, Number(((prev.zoom || 1) / 1.25).toFixed(2))),
            }))
          }
          className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded transition cursor-pointer"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Zoom Percentage */}
        <span className="font-mono text-neutral-200 px-2 min-w-[50px] text-center font-bold">
          {zoomPercent}%
        </span>

        {/* Zoom In */}
        <button
          onClick={() =>
            onUpdateSettings((prev) => ({
              ...prev,
              zoom: Math.min(8, Number(((prev.zoom || 1) * 1.25).toFixed(2))),
            }))
          }
          className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded transition cursor-pointer"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-neutral-700 mx-0.5" />

        {/* Fit to Viewport */}
        <button
          onClick={onFitToCanvas}
          className="flex items-center gap-1 px-2 py-1 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded transition cursor-pointer"
          title="Fit Canvas to Viewport"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium">Fit</span>
        </button>

        {/* Reset 100% */}
        <button
          onClick={() =>
            onUpdateSettings((prev) => ({
              ...prev,
              zoom: 1,
              panX: 0,
              panY: 0,
            }))
          }
          className="px-2 py-1 text-[11px] font-mono text-neutral-300 hover:text-white hover:bg-neutral-800 rounded transition cursor-pointer"
          title="Reset to 100% Zoom and Center"
        >
          100%
        </button>

        {/* Maximize / Minimize Canvas Toggle Button */}
        {onToggleMaximize && (
          <>
            <div className="h-4 w-px bg-neutral-700 mx-0.5" />
            <button
              onClick={onToggleMaximize}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                isMaximized
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
              title={isMaximized ? "Exit Maximize (Esc or F)" : "Maximize Main Placement Canvas (Full Screen)"}
            >
              {isMaximized ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Minimize</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Maximize</span>
                </>
              )}
            </button>
          </>
        )}

        {/* Reset zoom bar position button when moved */}
        {zoomBarPos && (
          <button
            onClick={() => setZoomBarPos(null)}
            className="p-1 rounded text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition cursor-pointer ml-0.5"
            title="Reset zoom bar back to default bottom-center position"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Floating Quick Hint (Bottom Left) */}
      <div className="absolute bottom-3 left-3 pointer-events-none text-[10px] text-neutral-500 bg-neutral-900/60 backdrop-blur-xs px-2.5 py-1 rounded border border-neutral-800/80 z-20">
        <span>Drag artwork to align • Arrows: 1px • Shift+Arrows: 10px • Space+Drag: Pan • Drag bar to move</span>
      </div>
    </div>
  );
};
