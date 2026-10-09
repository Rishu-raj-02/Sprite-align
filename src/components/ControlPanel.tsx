import React from 'react';
import { 
  FrameData, 
  EditorSettings 
} from '../types';
import { 
  Sliders, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Grid3X3, 
  Crosshair, 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  ArrowDown,
  Info,
  Maximize2
} from 'lucide-react';

interface ControlPanelProps {
  currentFrame: FrameData;
  previousFrame: FrameData | null;
  totalFrames: number;
  selectedFrameIndex: number;
  columns: number;
  rows: number;
  sourceWidth: number;
  sourceHeight: number;
  settings: EditorSettings;
  onSelectFrame: (index: number) => void;
  onUpdateOffset: (offsetX: number, offsetY: number, isFinal: boolean) => void;
  onResetPosition: () => void;
  onUpdateSettings: (updater: (prev: EditorSettings) => EditorSettings) => void;
  onFitToCanvas: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  currentFrame,
  previousFrame,
  totalFrames,
  selectedFrameIndex,
  columns,
  rows,
  sourceWidth,
  sourceHeight,
  settings,
  onSelectFrame,
  onUpdateOffset,
  onResetPosition,
  onUpdateSettings,
  onFitToCanvas,
}) => {
  const isFrame1 = currentFrame.id === 1;

  const handleNudge = (dx: number, dy: number, shift: boolean) => {
    const step = shift ? 10 : 1;
    onUpdateOffset(currentFrame.offsetX + dx * step, currentFrame.offsetY + dy * step, true);
  };

  const handleNumericXChange = (valStr: string) => {
    const num = parseInt(valStr, 10);
    if (!isNaN(num)) {
      onUpdateOffset(num, currentFrame.offsetY, true);
    }
  };

  const handleNumericYChange = (valStr: string) => {
    const num = parseInt(valStr, 10);
    if (!isNaN(num)) {
      onUpdateOffset(currentFrame.offsetX, num, true);
    }
  };

  const zoomLevels = [0.25, 0.5, 0.75, 1, 1.5, 2, 4, 8];

  return (
    <aside className="w-80 bg-neutral-900 border-l border-neutral-800 flex flex-col h-full shrink-0 overflow-y-auto select-none">
      {/* Frame Stepper Header */}
      <div className="p-4 border-b border-neutral-800 bg-neutral-950/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Registration Target
          </span>
          <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900">
            Frame {currentFrame.id} / {totalFrames}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            id="btn-prev-frame"
            onClick={() => onSelectFrame(Math.max(0, selectedFrameIndex - 1))}
            disabled={selectedFrameIndex === 0}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer border border-neutral-700"
            title="Previous Frame (Ctrl+Left or [)"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev Frame</span>
          </button>
          <button
            id="btn-next-frame"
            onClick={() => onSelectFrame(Math.min(totalFrames - 1, selectedFrameIndex + 1))}
            disabled={selectedFrameIndex === totalFrames - 1}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer shadow-sm"
            title="Next Frame (Ctrl+Right or ])"
          >
            <span>Next Frame</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* SECTION 1: Manual Artwork Positioning */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Artwork Alignment Offset</span>
            </h3>
            <button
              id="btn-reset-position"
              onClick={onResetPosition}
              className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-amber-400 transition cursor-pointer"
              title="Reset offset to X:0, Y:0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Numeric Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-2.5">
              <label htmlFor="input-offset-x" className="block text-[11px] font-medium text-neutral-400 mb-1">
                X Offset (px)
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="input-offset-x"
                  type="number"
                  value={currentFrame.offsetX}
                  onChange={(e) => handleNumericXChange(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm font-mono font-semibold text-amber-400 focus:outline-none focus:border-indigo-500 text-center"
                />
              </div>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-2.5">
              <label htmlFor="input-offset-y" className="block text-[11px] font-medium text-neutral-400 mb-1">
                Y Offset (px)
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="input-offset-y"
                  type="number"
                  value={currentFrame.offsetY}
                  onChange={(e) => handleNumericYChange(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm font-mono font-semibold text-amber-400 focus:outline-none focus:border-indigo-500 text-center"
                />
              </div>
            </div>
          </div>

          {/* Nudge Buttons */}
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-lg p-3 flex flex-col items-center gap-2">
            <div className="text-[10px] text-neutral-400 flex items-center justify-between w-full">
              <span>Pixel Nudge</span>
              <span className="text-neutral-500">Hold Shift for 10px</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <button
                onClick={(e) => handleNudge(0, -1, e.shiftKey)}
                className="w-8 h-8 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center transition cursor-pointer border border-neutral-700"
                title="Move Up 1px (Shift+Click: 10px)"
              >
                <ArrowUp className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleNudge(-1, 0, e.shiftKey)}
                  className="w-8 h-8 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center transition cursor-pointer border border-neutral-700"
                  title="Move Left 1px (Shift+Click: 10px)"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="w-8 h-8 rounded bg-neutral-900 flex items-center justify-center text-[10px] font-mono text-neutral-400">
                  {currentFrame.offsetX},{currentFrame.offsetY}
                </div>

                <button
                  onClick={(e) => handleNudge(1, 0, e.shiftKey)}
                  className="w-8 h-8 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center transition cursor-pointer border border-neutral-700"
                  title="Move Right 1px (Shift+Click: 10px)"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={(e) => handleNudge(0, 1, e.shiftKey)}
                className="w-8 h-8 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 flex items-center justify-center transition cursor-pointer border border-neutral-700"
                title="Move Down 1px (Shift+Click: 10px)"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: Onion Skin Registration (Previous Frame) */}
        <div className="space-y-3 pt-3 border-t border-neutral-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span>Previous Frame Onion Skin</span>
            </h3>

            {!isFrame1 && (
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showPreviousFrame}
                  onChange={(e) =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      showPreviousFrame: e.target.checked,
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            )}
          </div>

          {isFrame1 ? (
            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-neutral-200 block mb-0.5">Anchor Frame</strong>
                Frame 1 has no previous frame. Onion skin is unavailable for Frame 1. Position it as the reference base.
              </div>
            </div>
          ) : (
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300">
                  Showing: <strong className="text-indigo-400">Frame {previousFrame?.id}</strong>
                </span>
                <span className="font-mono text-neutral-400">
                  {Math.round(settings.previousFrameOpacity * 100)}%
                </span>
              </div>

              <div className="space-y-1">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.previousFrameOpacity}
                  disabled={!settings.showPreviousFrame}
                  onChange={(e) =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      previousFrameOpacity: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-indigo-500 cursor-pointer disabled:opacity-40"
                />
                <div className="flex justify-between text-[10px] text-neutral-500">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: Current Frame Temporary Opacity */}
        <div className="space-y-3 pt-3 border-t border-neutral-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
              Current Frame Opacity
            </h3>
            <span className="font-mono text-xs text-neutral-400">
              {Math.round(settings.currentFrameOpacity * 100)}%
            </span>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 space-y-2">
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.01"
              value={settings.currentFrameOpacity}
              onChange={(e) =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  currentFrameOpacity: parseFloat(e.target.value),
                }))
              }
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="text-[10px] text-neutral-500 leading-tight">
              Visualization only. Exported PNG preserves original alpha transparency.
            </div>
          </div>
        </div>

        {/* SECTION 4: Viewport Overlays & Guides */}
        <div className="space-y-3 pt-3 border-t border-neutral-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
            Editor Guides & Overlays
          </h3>

          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 space-y-2.5">
            {/* Center Guides */}
            <label className="flex items-center justify-between text-xs text-neutral-300 cursor-pointer">
              <div className="flex items-center gap-2">
                <Crosshair className="w-3.5 h-3.5 text-sky-400" />
                <span>Show Center Guides</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showGuides}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    showGuides: e.target.checked,
                  }))
                }
                className="rounded accent-indigo-500 cursor-pointer"
              />
            </label>

            {/* Grid */}
            <label className="flex items-center justify-between text-xs text-neutral-300 cursor-pointer">
              <div className="flex items-center gap-2">
                <Grid3X3 className="w-3.5 h-3.5 text-neutral-400" />
                <span>Show Pixel Grid</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showGrid}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    showGrid: e.target.checked,
                  }))
                }
                className="rounded accent-indigo-500 cursor-pointer"
              />
            </label>

            {/* Grid Size selector if grid active */}
            {settings.showGrid && (
              <div className="flex items-center justify-between pl-5 pt-1 text-[11px] text-neutral-400">
                <span>Cell Size:</span>
                <div className="flex gap-1">
                  {[16, 32, 64].map((size) => (
                    <button
                      key={size}
                      onClick={() =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          gridSize: size,
                        }))
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                        settings.gridSize === size
                          ? 'bg-indigo-600 text-white'
                          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      }`}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 5: Zoom Presets */}
        <div className="space-y-2 pt-3 border-t border-neutral-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
              Zoom Presets
            </h3>
            <button
              onClick={onFitToCanvas}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Fit to Canvas</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {zoomLevels.map((lvl) => {
              const isActive = Math.abs((settings.zoom || 1) - lvl) < 0.05;
              return (
                <button
                  key={lvl}
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      zoom: lvl,
                    }))
                  }
                  className={`py-1 rounded text-xs font-mono transition cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 font-bold text-white shadow-sm'
                      : 'bg-neutral-950 border border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  {Math.round(lvl * 100)}%
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 6: Slicing Coordinates Info Card */}
        <div className="pt-3 border-t border-neutral-800">
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800/80 text-[11px] space-y-1.5 text-neutral-400 font-mono">
            <div className="text-neutral-300 font-semibold mb-1 flex items-center gap-1">
              <Info className="w-3 h-3 text-indigo-400" />
              <span>Frame Metadata</span>
            </div>
            <div className="flex justify-between">
              <span>Source Slice:</span>
              <span className="text-neutral-200">{currentFrame.sourceX}, {currentFrame.sourceY} px</span>
            </div>
            <div className="flex justify-between">
              <span>Canvas Size:</span>
              <span className="text-neutral-200">
                {currentFrame.canvasWidth || currentFrame.width} × {currentFrame.canvasHeight || currentFrame.height} px
              </span>
            </div>
            {((currentFrame.canvasWidth && currentFrame.canvasWidth !== currentFrame.width) ||
              (currentFrame.canvasHeight && currentFrame.canvasHeight !== currentFrame.height)) && (
              <div className="flex justify-between">
                <span>Slice Cut Size:</span>
                <span className="text-neutral-300 font-medium">
                  {currentFrame.width} × {currentFrame.height} px
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Grid Config:</span>
              <span className="text-neutral-200">{columns} cols × {rows} rows</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
