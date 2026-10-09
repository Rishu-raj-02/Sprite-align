import React, { useRef } from 'react';
import { 
  Upload, 
  Grid3X3, 
  Undo2, 
  Redo2, 
  Download, 
  Save, 
  FolderOpen, 
  Sparkles,
  Layers,
  HelpCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface HeaderProps {
  hasImage: boolean;
  filename: string;
  sourceWidth: number;
  sourceHeight: number;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  totalFrames: number;
  canUndo: boolean;
  canRedo: boolean;
  isCanvasMaximized?: boolean;
  onToggleCanvasMaximize?: () => void;
  onUploadClick: () => void;
  onLoadDemo: () => void;
  onOpenSlicing: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSaveProject: () => void;
  onLoadProject: (file: File) => void;
  onOpenExport: () => void;
  onToggleHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  hasImage,
  filename,
  sourceWidth,
  sourceHeight,
  columns,
  rows,
  frameWidth,
  frameHeight,
  totalFrames,
  canUndo,
  canRedo,
  isCanvasMaximized = false,
  onToggleCanvasMaximize,
  onUploadClick,
  onLoadDemo,
  onOpenSlicing,
  onUndo,
  onRedo,
  onSaveProject,
  onLoadProject,
  onOpenExport,
  onToggleHelp,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProjectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadProject(file);
      e.target.value = '';
    }
  };

  return (
    <header className="h-14 bg-neutral-900 border-b border-neutral-800 px-4 flex items-center justify-between select-none z-20 shrink-0">
      {/* Brand Title & Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-sm">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-neutral-100 leading-none tracking-tight">
              Sprite Frame Slicer & Alignment Studio
            </h1>
            <p className="text-[11px] text-neutral-400 leading-none mt-1">
              Manual Frame Registration & Onion Skin Studio
            </p>
          </div>
        </div>

        {hasImage && (
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-neutral-800 text-xs">
            <span className="text-neutral-400 truncate max-w-[140px]" title={filename}>
              {filename}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-[11px]">
              {sourceWidth} × {sourceHeight}px
            </span>
            <span className="text-neutral-500">→</span>
            <span className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono text-[11px] border border-indigo-800/50">
              {columns}×{rows} ({totalFrames} frames @ {frameWidth}×{frameHeight}px)
            </span>
          </div>
        )}
      </div>

      {/* Main Action Toolbar */}
      <div className="flex items-center gap-2">
        <button
          id="btn-upload-sprite-sheet"
          onClick={onUploadClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-indigo-400" />
          <span>Upload Sheet</span>
        </button>

        {!hasImage && (
          <button
            id="btn-load-demo"
            onClick={onLoadDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Sample (4×2)</span>
          </button>
        )}

        {hasImage && (
          <>
            <button
              id="btn-configure-slicing"
              onClick={onOpenSlicing}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition cursor-pointer"
              title="Change Rows / Columns Grid"
            >
              <Grid3X3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Slicing ({columns}×{rows})</span>
            </button>

            <div className="h-4 w-px bg-neutral-800 mx-1" />

            {/* Undo / Redo */}
            <div className="flex items-center bg-neutral-800/80 rounded-md border border-neutral-700 p-0.5">
              <button
                id="btn-header-undo"
                onClick={onUndo}
                disabled={!canUndo}
                className="p-1 rounded text-neutral-300 hover:text-white hover:bg-neutral-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Undo position change (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                id="btn-header-redo"
                onClick={onRedo}
                disabled={!canRedo}
                className="p-1 rounded text-neutral-300 hover:text-white hover:bg-neutral-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Redo position change (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Maximize / Focus Placement Canvas */}
            {onToggleCanvasMaximize && (
              <button
                id="btn-header-maximize-canvas"
                onClick={onToggleCanvasMaximize}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition cursor-pointer ${
                  isCanvasMaximized
                    ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
                }`}
                title={isCanvasMaximized ? "Exit Maximize Canvas (Esc or F)" : "Maximize Placement Canvas (F)"}
              >
                {isCanvasMaximized ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Exit Full Canvas</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden sm:inline">Maximize Canvas</span>
                  </>
                )}
              </button>
            )}

            <div className="h-4 w-px bg-neutral-800 mx-1" />

            {/* Project Save / Load */}
            <button
              id="btn-save-project"
              onClick={onSaveProject}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              title="Save project file (.json) with all offsets and settings"
            >
              <Save className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Save</span>
            </button>

            <button
              id="btn-load-project"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              title="Open a previously saved project (.json)"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Open</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleProjectFileChange}
              className="hidden"
            />

            {/* Export */}
            <button
              id="btn-header-export"
              onClick={onOpenExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm cursor-pointer ml-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </>
        )}

        <button
          id="btn-help"
          onClick={onToggleHelp}
          className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition ml-1"
          title="Manual & Shortcuts"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
