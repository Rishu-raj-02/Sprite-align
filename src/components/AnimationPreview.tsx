import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Repeat, 
  SkipBack, 
  SkipForward, 
  Film, 
  Gauge, 
  Maximize2, 
  Minimize2, 
  X, 
  Crosshair, 
  ZoomIn, 
  Palette,
  MoveVertical
} from 'lucide-react';
import { FrameData, PreviewSettings } from '../types';

interface AnimationPreviewProps {
  frames: FrameData[];
  sourceImage: HTMLImageElement | null;
  settings: PreviewSettings;
  selectedFrameIndex: number;
  onSelectFrame: (index: number) => void;
  onUpdateSettings: (updater: (prev: PreviewSettings) => PreviewSettings) => void;
}

type BgTheme = 'dark-check' | 'light-check' | 'black' | 'white' | 'gray';

export const AnimationPreview: React.FC<AnimationPreviewProps> = ({
  frames,
  sourceImage,
  settings,
  selectedFrameIndex,
  onSelectFrame,
  onUpdateSettings,
}) => {
  const [playbackIndex, setPlaybackIndex] = useState<number>(selectedFrameIndex);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<number | 'fit'>('fit');
  const [showStabilityGuides, setShowStabilityGuides] = useState<boolean>(true);
  const [groundLineY, setGroundLineY] = useState<number>(0.85); // 85% from top of frame
  const [bgTheme, setBgTheme] = useState<BgTheme>('dark-check');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maxCanvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<number | null>(null);

  // Sync playback index with selection when stopped
  useEffect(() => {
    if (!settings.playing) {
      setPlaybackIndex(selectedFrameIndex);
    }
  }, [selectedFrameIndex, settings.playing]);

  // Animation Loop based on exact FPS
  useEffect(() => {
    if (!settings.playing || frames.length === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const intervalMs = 1000 / Math.max(1, Math.min(60, settings.fps));

    timerRef.current = window.setInterval(() => {
      setPlaybackIndex((prev) => {
        const next = prev + 1;
        if (next >= frames.length) {
          if (settings.loop) {
            return 0;
          } else {
            onUpdateSettings((s) => ({ ...s, playing: false }));
            return prev;
          }
        }
        return next;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [settings.playing, settings.fps, settings.loop, frames.length, onUpdateSettings]);

  // Render helper to paint a frame onto any target canvas
  const renderFrameToCanvas = useCallback((
    canvas: HTMLCanvasElement | null, 
    theme: BgTheme, 
    drawGuides: boolean = false
  ) => {
    if (!canvas || !sourceImage || frames.length === 0) return;

    const frame = frames[playbackIndex] || frames[0];
    if (!frame) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fw = frame.canvasWidth || frame.width;
    const fh = frame.canvasHeight || frame.height;

    if (canvas.width !== fw || canvas.height !== fh) {
      canvas.width = fw;
      canvas.height = fh;
    }

    ctx.clearRect(0, 0, fw, fh);

    // Render background based on theme
    if (theme === 'dark-check') {
      const checkSize = Math.max(8, Math.min(20, Math.round(fw / 20)));
      for (let y = 0; y < fh; y += checkSize) {
        for (let x = 0; x < fw; x += checkSize) {
          ctx.fillStyle = ((x / checkSize + y / checkSize) % 2 === 0) ? '#1f2430' : '#141822';
          ctx.fillRect(x, y, checkSize, checkSize);
        }
      }
    } else if (theme === 'light-check') {
      const checkSize = Math.max(8, Math.min(20, Math.round(fw / 20)));
      for (let y = 0; y < fh; y += checkSize) {
        for (let x = 0; x < fw; x += checkSize) {
          ctx.fillStyle = ((x / checkSize + y / checkSize) % 2 === 0) ? '#e2e8f0' : '#cbd5e1';
          ctx.fillRect(x, y, checkSize, checkSize);
        }
      }
    } else if (theme === 'black') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, fw, fh);
    } else if (theme === 'white') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, fw, fh);
    } else if (theme === 'gray') {
      ctx.fillStyle = '#262626';
      ctx.fillRect(0, 0, fw, fh);
    }

    ctx.imageSmoothingEnabled = false;

    // Draw the ALIGNED artwork inside the fixed frame
    // Clip strictly to frame boundaries
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, fw, fh);
    ctx.clip();

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
    ctx.restore();

    // Stability verification guides on maximized canvas if enabled
    if (drawGuides) {
      ctx.save();
      // Center crosshair (subtle cyan dashed)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical center
      ctx.beginPath();
      ctx.moveTo(fw / 2, 0);
      ctx.lineTo(fw / 2, fh);
      ctx.stroke();

      // Horizontal center
      ctx.beginPath();
      ctx.moveTo(0, fh / 2);
      ctx.lineTo(fw, fh / 2);
      ctx.stroke();

      // Ground baseline (vibrant amber dashed)
      const gy = Math.round(fh * groundLineY);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(fw, gy);
      ctx.stroke();

      ctx.restore();
    }
  }, [frames, playbackIndex, sourceImage, groundLineY]);

  // Render bottom bar canvas
  useEffect(() => {
    renderFrameToCanvas(canvasRef.current, 'dark-check', false);
  }, [renderFrameToCanvas, playbackIndex]);

  // Render maximized modal canvas
  useEffect(() => {
    if (isMaximized) {
      renderFrameToCanvas(maxCanvasRef.current, bgTheme, showStabilityGuides);
    }
  }, [renderFrameToCanvas, isMaximized, playbackIndex, bgTheme, showStabilityGuides, groundLineY]);

  // Keyboard navigation when in maximized theater mode
  useEffect(() => {
    if (!isMaximized) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayToggle();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsMaximized(false);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleStepBack();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleStepForward();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMaximized, settings.playing, frames.length]);

  const handlePlayToggle = () => {
    onUpdateSettings((prev) => ({
      ...prev,
      playing: !prev.playing,
    }));
  };

  const handleStop = () => {
    onUpdateSettings((prev) => ({ ...prev, playing: false }));
    setPlaybackIndex(0);
    onSelectFrame(0);
  };

  const handleStepBack = () => {
    onUpdateSettings((prev) => ({ ...prev, playing: false }));
    const nextIdx = (playbackIndex - 1 + frames.length) % frames.length;
    setPlaybackIndex(nextIdx);
    onSelectFrame(nextIdx);
  };

  const handleStepForward = () => {
    onUpdateSettings((prev) => ({ ...prev, playing: false }));
    const nextIdx = (playbackIndex + 1) % frames.length;
    setPlaybackIndex(nextIdx);
    onSelectFrame(nextIdx);
  };

  const activeFrame = frames[playbackIndex] || frames[0];
  const fw = activeFrame?.canvasWidth || activeFrame?.width || 1;
  const fh = activeFrame?.canvasHeight || activeFrame?.height || 1;

  return (
    <>
      {/* BOTTOM BAR: Normal Compact Animation Bar */}
      <div className="h-44 bg-neutral-900 border-t border-neutral-800 flex flex-col shrink-0 select-none">
        {/* Panel Header Bar */}
        <div className="h-8 bg-neutral-950 px-4 border-b border-neutral-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Film className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-bold uppercase tracking-wider text-neutral-300 text-[11px]">
              Animation Playback & Stability Verification
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-2 font-mono text-neutral-400">
              <span>
                Playing: Frame <strong className="text-white">#{activeFrame?.id || 1}</strong> of {frames.length}
              </span>
              <span className="text-neutral-600">•</span>
              <span>
                {fw}×{fh}px
              </span>
            </div>

            {/* Maximize Button in Header */}
            <button
              id="btn-maximize-animation"
              onClick={() => setIsMaximized(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition cursor-pointer shadow-xs"
              title="Maximize animation preview to big canvas for stability verification"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Maximize Player</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex items-center px-4 gap-6 min-h-0">
          {/* Left: Preview Canvas Box (Clickable to Maximize) */}
          <div 
            onClick={() => setIsMaximized(true)}
            className="group relative h-28 w-28 shrink-0 rounded bg-neutral-950 border border-neutral-700 shadow-inner flex items-center justify-center overflow-hidden cursor-pointer hover:border-indigo-500 transition"
            title="Click to open big canvas playback view"
          >
            <canvas
              ref={canvasRef}
              className="max-h-full max-w-full object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/70 text-[9px] font-mono text-neutral-300">
              F{activeFrame?.id}
            </div>

            {/* Hover overlay hint */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white text-[10px] font-semibold gap-1 backdrop-blur-xs">
              <Maximize2 className="w-4 h-4 text-indigo-300" />
              <span>Maximize</span>
            </div>
          </div>

          {/* Center: Playback Controls & Timeline */}
          <div className="flex-1 flex flex-col justify-center space-y-2.5 min-w-0">
            {/* Controls Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-anim-stop"
                  onClick={handleStop}
                  className="p-1.5 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                  title="Stop and return to Frame 1"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>

                <button
                  id="btn-anim-step-back"
                  onClick={handleStepBack}
                  className="p-1.5 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                  title="Step 1 Frame Back"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  id="btn-anim-play"
                  onClick={handlePlayToggle}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white transition cursor-pointer shadow-sm ${
                    settings.playing
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-indigo-600 hover:bg-indigo-500'
                  }`}
                  title={settings.playing ? 'Pause Playback' : 'Play Aligned Animation'}
                >
                  {settings.playing ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Play</span>
                    </>
                  )}
                </button>

                <button
                  id="btn-anim-step-forward"
                  onClick={handleStepForward}
                  className="p-1.5 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                  title="Step 1 Frame Forward"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                <div className="h-4 w-px bg-neutral-800 mx-1" />

                {/* Loop Toggle */}
                <button
                  id="btn-anim-loop"
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      loop: !prev.loop,
                    }))
                  }
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition cursor-pointer ${
                    settings.loop
                      ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                  title="Loop Animation"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Loop</span>
                </button>
              </div>

              {/* Right: FPS Speed Control & Maximize button */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1 rounded-lg border border-neutral-800">
                  <Gauge className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="text-[11px] text-neutral-400">FPS:</span>
                  <input
                    id="input-fps-slider"
                    type="range"
                    min="1"
                    max="60"
                    value={settings.fps}
                    onChange={(e) =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        fps: parseInt(e.target.value, 10) || 8,
                      }))
                    }
                    className="w-24 accent-indigo-500 cursor-pointer"
                  />
                  <span className="font-mono text-xs font-bold text-neutral-200 w-8 text-right">
                    {settings.fps}
                  </span>
                </div>

                <button
                  onClick={() => setIsMaximized(true)}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition cursor-pointer"
                  title="Open Big Canvas View"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Big Canvas</span>
                </button>
              </div>
            </div>

            {/* Frame Scrubber / Filmstrip Timeline */}
            <div className="space-y-1">
              <div className="relative flex items-center gap-1 bg-neutral-950 p-1.5 rounded-lg border border-neutral-800 overflow-x-auto">
                {frames.map((frame, index) => {
                  const isActive = index === playbackIndex;
                  const isSelectedInEditor = index === selectedFrameIndex;
                  return (
                    <button
                      key={frame.id}
                      onClick={() => {
                        onUpdateSettings((s) => ({ ...s, playing: false }));
                        setPlaybackIndex(index);
                        onSelectFrame(index);
                      }}
                      className={`h-7 px-2.5 rounded text-[11px] font-mono font-bold transition flex items-center justify-center shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-white/50'
                          : isSelectedInEditor
                          ? 'bg-neutral-800 text-indigo-300 border border-indigo-500/50'
                          : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                      }`}
                      title={`Frame ${frame.id} (Offset: ${frame.offsetX}, ${frame.offsetY})`}
                    >
                      #{frame.id}
                    </button>
                  );
                })}
              </div>
              <div className="text-[10px] text-neutral-500 flex justify-between px-1">
                <span>Click any frame block above to inspect/edit in the main canvas</span>
                <span>Plays strictly registered frames (no overlays)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAXIMIZED / THEATER VIEW MODAL: Large High-Resolution Playback Area */}
      {isMaximized && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col select-none backdrop-blur-md animate-in fade-in duration-150">
          {/* Top Bar of Maximized Theater View */}
          <div className="h-12 bg-neutral-950/95 border-b border-neutral-800 px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
                <Film className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Large Animation Canvas & Stability Verification</span>
                  <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-800 text-indigo-300">
                    Frame #{activeFrame?.id} / {frames.length}
                  </span>
                </h2>
              </div>
            </div>

            {/* Quick settings in top bar: Scale, Background, Guides, Close */}
            <div className="flex items-center gap-3 text-xs">
              {/* Scale Zoom Selector */}
              <div className="flex items-center gap-1.5 bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800">
                <ZoomIn className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-neutral-400 text-[11px]">Zoom:</span>
                {(['fit', 1, 2, 3, 4] as const).map((z) => (
                  <button
                    key={String(z)}
                    onClick={() => setZoomScale(z)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                      zoomScale === z
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                    }`}
                  >
                    {z === 'fit' ? 'Fit' : `${z}x`}
                  </button>
                ))}
              </div>

              {/* Stability Crosshair & Ground Line Toggle */}
              <button
                onClick={() => setShowStabilityGuides((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                  showStabilityGuides
                    ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
                title="Toggle ground baseline and center crosshair to check for jitter and drift"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Stability Guides</span>
              </button>

              {/* Background Backdrop Selector */}
              <div className="flex items-center gap-1 bg-neutral-900 px-2 py-1 rounded-lg border border-neutral-800">
                <Palette className="w-3.5 h-3.5 text-neutral-400 mr-1" />
                <button
                  onClick={() => setBgTheme('dark-check')}
                  className={`w-4 h-4 rounded border transition cursor-pointer ${
                    bgTheme === 'dark-check' ? 'ring-2 ring-indigo-500' : 'border-neutral-700'
                  }`}
                  style={{ background: 'linear-gradient(45deg, #1f2430 25%, #141822 25%, #141822 50%, #1f2430 50%, #1f2430 75%, #141822 75%)', backgroundSize: '8px 8px' }}
                  title="Dark Checkerboard"
                />
                <button
                  onClick={() => setBgTheme('light-check')}
                  className={`w-4 h-4 rounded border transition cursor-pointer ${
                    bgTheme === 'light-check' ? 'ring-2 ring-indigo-500' : 'border-neutral-700'
                  }`}
                  style={{ background: 'linear-gradient(45deg, #e2e8f0 25%, #cbd5e1 25%, #cbd5e1 50%, #e2e8f0 50%, #e2e8f0 75%, #cbd5e1 75%)', backgroundSize: '8px 8px' }}
                  title="Light Checkerboard"
                />
                <button
                  onClick={() => setBgTheme('black')}
                  className={`w-4 h-4 rounded bg-black border transition cursor-pointer ${
                    bgTheme === 'black' ? 'ring-2 ring-indigo-500' : 'border-neutral-700'
                  }`}
                  title="Pitch Black"
                />
                <button
                  onClick={() => setBgTheme('white')}
                  className={`w-4 h-4 rounded bg-white border transition cursor-pointer ${
                    bgTheme === 'white' ? 'ring-2 ring-indigo-500' : 'border-neutral-700'
                  }`}
                  title="Pure White"
                />
                <button
                  onClick={() => setBgTheme('gray')}
                  className={`w-4 h-4 rounded bg-neutral-800 border transition cursor-pointer ${
                    bgTheme === 'gray' ? 'ring-2 ring-indigo-500' : 'border-neutral-700'
                  }`}
                  title="Neutral Gray"
                />
              </div>

              {/* Close / Minimize Button */}
              <button
                id="btn-close-maximized-animation"
                onClick={() => setIsMaximized(false)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition cursor-pointer ml-2"
                title="Exit Big Canvas View (Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Minimize</span>
              </button>
            </div>
          </div>

          {/* Center Stage: Huge Animation Canvas */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-6 min-h-0 relative">
            <div className="relative flex items-center justify-center rounded-xl overflow-hidden border border-neutral-700 shadow-2xl bg-neutral-950 max-h-full max-w-full">
              <canvas
                ref={maxCanvasRef}
                className="block max-h-[70vh] max-w-[85vw]"
                style={{
                  imageRendering: 'pixelated',
                  width: zoomScale === 'fit' ? 'auto' : `${fw * zoomScale}px`,
                  height: zoomScale === 'fit' ? 'auto' : `${fh * zoomScale}px`,
                }}
              />

              {/* Stability Info Overlay inside Canvas */}
              {showStabilityGuides && (
                <div className="absolute top-2 left-2 pointer-events-none px-2 py-1 rounded bg-black/75 backdrop-blur-xs text-[10px] font-mono text-amber-300 border border-amber-500/40">
                  Yellow line = Ground baseline ({Math.round(groundLineY * 100)}%) • Cyan = Center
                </div>
              )}
            </div>

            {/* Floating Ground Line Slider when guides enabled */}
            {showStabilityGuides && (
              <div className="absolute right-8 top-1/2 -translate-y-1/2 bg-neutral-900/90 border border-neutral-800 p-2.5 rounded-xl shadow-xl backdrop-blur-xs flex flex-col items-center gap-2">
                <MoveVertical className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] text-neutral-400 font-medium">Ground</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(groundLineY * 100)}
                  onChange={(e) => setGroundLineY(Number(e.target.value) / 100)}
                  className="h-28 w-1 accent-amber-500 cursor-pointer"
                  style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                  title="Drag to position the ground baseline under the character's feet"
                />
                <span className="text-[10px] font-mono text-amber-400 font-bold">
                  {Math.round(groundLineY * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Bottom Bar in Maximized View: Full Playback Controls, FPS, and Scrub Timeline */}
          <div className="bg-neutral-950/95 border-t border-neutral-800 px-8 py-3 shrink-0 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              {/* Playback action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleStop}
                  className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                  title="Stop (Reset to Frame 1)"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>

                <button
                  onClick={handleStepBack}
                  className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                  title="Step 1 Frame Back (Left Arrow)"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={handlePlayToggle}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition cursor-pointer shadow-md ${
                    settings.playing
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-indigo-600 hover:bg-indigo-500'
                  }`}
                  title="Play / Pause (Spacebar)"
                >
                  {settings.playing ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>PAUSE</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>PLAY</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleStepForward}
                  className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                  title="Step 1 Frame Forward (Right Arrow)"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                <div className="h-5 w-px bg-neutral-800 mx-2" />

                <button
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      loop: !prev.loop,
                    }))
                  }
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    settings.loop
                      ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                  title="Toggle Continuous Loop"
                >
                  <Repeat className="w-4 h-4" />
                  <span>Loop</span>
                </button>
              </div>

              {/* Status information */}
              <div className="flex items-center gap-4 text-xs font-mono text-neutral-300">
                <div className="bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800">
                  Offset: <span className="text-indigo-400 font-bold">X={activeFrame?.offsetX}, Y={activeFrame?.offsetY}</span>
                </div>
                <div className="bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800">
                  Size: <span className="text-neutral-100 font-bold">{fw} × {fh} px</span>
                </div>
              </div>

              {/* FPS Speed Control */}
              <div className="flex items-center gap-2.5 bg-neutral-900 px-3.5 py-1.5 rounded-lg border border-neutral-800">
                <Gauge className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-xs text-neutral-400">Speed:</span>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={settings.fps}
                  onChange={(e) =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      fps: parseInt(e.target.value, 10) || 8,
                    }))
                  }
                  className="w-28 accent-indigo-500 cursor-pointer"
                />
                <span className="font-mono text-xs font-bold text-white w-10 text-right">
                  {settings.fps} FPS
                </span>
              </div>
            </div>

            {/* Timeline Scrub Filmstrip */}
            <div className="flex items-center gap-1.5 bg-neutral-900 p-2 rounded-lg border border-neutral-800 overflow-x-auto">
              {frames.map((frame, index) => {
                const isActive = index === playbackIndex;
                return (
                  <button
                    key={`max-${frame.id}`}
                    onClick={() => {
                      onUpdateSettings((s) => ({ ...s, playing: false }));
                      setPlaybackIndex(index);
                      onSelectFrame(index);
                    }}
                    className={`h-8 px-3 rounded-md text-xs font-mono font-bold transition flex items-center justify-center shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md ring-2 ring-white/60 scale-105'
                        : 'bg-neutral-950 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                    }`}
                    title={`Jump to Frame #${frame.id}`}
                  >
                    F{frame.id}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
