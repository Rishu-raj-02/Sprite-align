import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  Archive, 
  Grid3X3, 
  Check, 
  X, 
  FileImage, 
  Layers,
  AlertCircle
} from 'lucide-react';
import { FrameData } from '../types';
import { 
  exportAllFramesZip, 
  exportSpriteSheet, 
  exportSingleFrame,
  renderCleanFrameCanvas,
  renderRebuiltSpriteSheet
} from '../utils/exportManager';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceImage: HTMLImageElement | null;
  sourceImageDataUrl: string;
  frames: FrameData[];
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  defaultFilename: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  sourceImage,
  sourceImageDataUrl,
  frames,
  columns,
  rows,
  frameWidth,
  frameHeight,
  defaultFilename,
}) => {
  const [activeTab, setActiveTab] = useState<'individual' | 'spritesheet'>('individual');
  const [framePrefix, setFramePrefix] = useState<string>('Frame');
  const [sheetFilename, setSheetFilename] = useState<string>('aligned_sprite_sheet.png');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Render preview for rebuilt sprite sheet
  useEffect(() => {
    if (!isOpen || !sourceImage || !previewCanvasRef.current || activeTab !== 'spritesheet') return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sheetCanvas = renderRebuiltSpriteSheet(
      sourceImage,
      frames,
      columns,
      rows,
      frameWidth,
      frameHeight
    );

    // Fit onto preview container
    const maxW = 540;
    const maxH = 240;
    const scale = Math.min(maxW / sheetCanvas.width, maxH / sheetCanvas.height, 1);
    const dispW = Math.round(sheetCanvas.width * scale);
    const dispH = Math.round(sheetCanvas.height * scale);

    canvas.width = dispW;
    canvas.height = dispH;

    // Draw checkerboard background
    ctx.clearRect(0, 0, dispW, dispH);
    const checkSize = 10;
    for (let y = 0; y < dispH; y += checkSize) {
      for (let x = 0; x < dispW; x += checkSize) {
        ctx.fillStyle = ((x / checkSize + y / checkSize) % 2 === 0) ? '#1f2430' : '#141822';
        ctx.fillRect(x, y, checkSize, checkSize);
      }
    }

    ctx.drawImage(sheetCanvas, 0, 0, dispW, dispH);
  }, [isOpen, sourceImage, frames, columns, rows, frameWidth, frameHeight, activeTab]);

  if (!isOpen) return null;

  // Handle ZIP export of all frames
  const handleExportZip = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(null);
    setExportProgress({ current: 0, total: frames.length });

    try {
      await exportAllFramesZip(sourceImageDataUrl, frames, framePrefix.trim() || 'Frame', (cur, tot) => {
        setExportProgress({ current: cur, total: tot });
      });
      setExportSuccess(`Successfully packaged and exported all ${frames.length} aligned frames.`);
    } catch (err: any) {
      setExportError(err?.message || 'Failed to export frames.');
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  // Handle rebuilt sprite sheet export
  const handleExportSpriteSheet = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      await exportSpriteSheet(
        sourceImageDataUrl,
        frames,
        columns,
        rows,
        frameWidth,
        frameHeight,
        sheetFilename.trim() || 'aligned_sprite_sheet.png'
      );
      setExportSuccess('Successfully generated and downloaded rebuilt sprite sheet.');
    } catch (err: any) {
      setExportError(err?.message || 'Failed to export sprite sheet.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle single frame download
  const handleDownloadSingleFrame = async (frame: FrameData) => {
    if (!sourceImage) return;
    try {
      const padLen = Math.max(2, String(frames.length).length);
      const numStr = String(frame.id).padStart(padLen, '0');
      const filename = `${framePrefix.trim() || 'Frame'}_${numStr}.png`;
      await exportSingleFrame(sourceImage, frame, filename);
    } catch (err: any) {
      setExportError(err?.message || 'Failed to download frame.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">
                Export Aligned Sprite Assets
              </h2>
              <p className="text-xs text-neutral-400">
                PNG format with 100% genuine alpha transparency preserved
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 p-1 rounded-md hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 bg-neutral-950 px-5 gap-4">
          <button
            id="tab-export-individual"
            onClick={() => setActiveTab('individual')}
            className={`flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'individual'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>Individual Frames ({frames.length} PNGs)</span>
          </button>

          <button
            id="tab-export-sheet"
            onClick={() => setActiveTab('spritesheet')}
            className={`flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'spritesheet'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            <span>Rebuilt Sprite Sheet ({columns}×{rows})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Status Messages */}
          {exportSuccess && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{exportSuccess}</span>
            </div>
          )}

          {exportError && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{exportError}</span>
            </div>
          )}

          {/* TAB 1: Individual Frames */}
          {activeTab === 'individual' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="input-frame-prefix" className="block text-xs font-medium text-neutral-300">
                  Filename Prefix
                </label>
                <input
                  id="input-frame-prefix"
                  type="text"
                  value={framePrefix}
                  onChange={(e) => setFramePrefix(e.target.value)}
                  placeholder="Frame"
                  className="w-full bg-neutral-950 border border-neutral-700 focus:border-emerald-500 focus:outline-none rounded-md px-3 py-2 text-sm text-neutral-100 font-mono"
                />
                <div className="text-[11px] text-neutral-400 font-mono">
                  Sample: {framePrefix || 'Frame'}_01.png, {framePrefix || 'Frame'}_02.png ...
                </div>
              </div>

              {/* Guarantees Box */}
              <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs space-y-1.5 text-neutral-300">
                <div className="font-semibold text-neutral-100 flex items-center gap-1.5 mb-1">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Strict Export Specifications</span>
                </div>
                <div className="text-neutral-400 text-[11px] list-disc list-inside space-y-0.5">
                  <div>• Each frame exported with exact fixed size: <strong className="text-neutral-200">{frameWidth} × {frameHeight} px</strong></div>
                  <div>• True alpha channel transparency preserved without background baking</div>
                  <div>• Includes exact user manual registration offsets</div>
                  <div>• Excludes onion skin, checkerboard, grid, guides, and UI overlays</div>
                </div>
              </div>

              {/* Action Button for All Frames */}
              <div className="pt-2">
                <button
                  id="btn-export-all-zip"
                  onClick={handleExportZip}
                  disabled={isExporting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition shadow-sm cursor-pointer"
                >
                  <Archive className="w-4 h-4" />
                  <span>
                    {isExporting && exportProgress
                      ? `Exporting ${exportProgress.current} / ${exportProgress.total}...`
                      : `Download All ${frames.length} Frames (ZIP)`}
                  </span>
                </button>
              </div>

              {/* Individual Frame Quick Download List */}
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <div className="text-xs font-semibold text-neutral-300">
                  Or Download Individual Frames
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {frames.map((frame) => {
                    const padLen = Math.max(2, String(frames.length).length);
                    const name = `${framePrefix || 'Frame'}_${String(frame.id).padStart(padLen, '0')}.png`;
                    return (
                      <div
                        key={frame.id}
                        className="flex items-center justify-between p-2 rounded bg-neutral-950 border border-neutral-800/80 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <FileImage className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="font-mono text-neutral-200">{name}</span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            ({frame.offsetX >= 0 ? `+${frame.offsetX}` : frame.offsetX}, {frame.offsetY >= 0 ? `+${frame.offsetY}` : frame.offsetY})
                          </span>
                        </div>
                        <button
                          onClick={() => handleDownloadSingleFrame(frame)}
                          className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-medium transition cursor-pointer"
                        >
                          Download
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Rebuilt Sprite Sheet */}
          {activeTab === 'spritesheet' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="input-sheet-filename" className="block text-xs font-medium text-neutral-300">
                  Sprite Sheet Filename
                </label>
                <input
                  id="input-sheet-filename"
                  type="text"
                  value={sheetFilename}
                  onChange={(e) => setSheetFilename(e.target.value)}
                  placeholder="aligned_sprite_sheet.png"
                  className="w-full bg-neutral-950 border border-neutral-700 focus:border-emerald-500 focus:outline-none rounded-md px-3 py-2 text-sm text-neutral-100 font-mono"
                />
              </div>

              {/* Dimensions Summary */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="text-neutral-400 text-[10px]">Grid Layout</div>
                  <div className="font-bold text-neutral-200 font-mono mt-0.5">
                    {columns} cols × {rows} rows
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="text-neutral-400 text-[10px]">Cell Size</div>
                  <div className="font-bold text-neutral-200 font-mono mt-0.5">
                    {frameWidth} × {frameHeight} px
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                  <div className="text-neutral-400 text-[10px]">Rebuilt Dimensions</div>
                  <div className="font-bold text-emerald-400 font-mono mt-0.5">
                    {columns * frameWidth} × {rows * frameHeight} px
                  </div>
                </div>
              </div>

              {/* Live Preview Canvas */}
              <div className="space-y-1.5">
                <div className="text-xs text-neutral-400">
                  Rebuilt Sheet Preview (Clean, row-major, transparent background)
                </div>
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 flex items-center justify-center min-h-[160px] overflow-hidden">
                  <canvas
                    ref={previewCanvasRef}
                    className="max-h-[220px] max-w-full rounded border border-neutral-800 shadow-inner"
                  />
                </div>
              </div>

              {/* Action Button */}
              <button
                id="btn-export-sheet-png"
                onClick={handleExportSpriteSheet}
                disabled={isExporting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Aligned Sprite Sheet (PNG)</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-neutral-800 bg-neutral-900/80">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
